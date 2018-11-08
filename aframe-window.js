"use strict";

// utils.

if (typeof AFRAME === 'undefined') {
    throw 'AFRAME is not loaded.';
}

AFRAME.registerComponent('drag-rotation', {
    schema: {
        target: { type: 'selector', default: null },
        draggable: { type: 'string', default: "" },
        mode: { type: 'string', default: "pan" }
    },
    init: function () {
        this.target = this.data.target || this.el;
        var draggable = Array.isArray(this.data.draggable) ? this.data.draggable :
            this.data.draggable != "" ? this.el.querySelectorAll(this.data.draggable) : [this.el];

        this.dragLen = 0;
        this.dragThreshold = 0.2;
        this.draggingDirection = null;

        var dragFun = (point, detail) => {
            var direction = detail.raycaster.ray.direction.clone();
            if (detail.first) {
                this.dragLen = 0;
            } else {
                this.dragLen += this.draggingDirection.manhattanDistanceTo(direction);
                if (this.dragLen < this.dragThreshold) return;
                if (this.data.mode == "move") {
                    var d = direction.clone().sub(this.draggingDirection).applyQuaternion(this.el.sceneEl.camera.getWorldQuaternion().inverse());
                    this.target.object3D.position.add(d.multiplyScalar(16).applyQuaternion(this.el.object3D.getWorldQuaternion()));
                } else {
                    var rot = new THREE.Quaternion().setFromUnitVectors(this.draggingDirection, direction);
                    var matrix = new THREE.Matrix4().makeRotationFromQuaternion(rot);
                    var o = detail.raycaster.ray.origin;
                    var tr = new THREE.Matrix4();
                    matrix.multiply(tr.makeTranslation(-o.x, -o.y, -o.z));
                    matrix.premultiply(tr.makeTranslation(o.x, o.y, o.z));
                    this.target.object3D.applyMatrix(matrix);
                }
            }
            this.draggingDirection = direction;
        };
        var clickFun = (ev) => {
            if (this.dragLen > this.dragThreshold && ev.path.includes(this.el)) {
                ev.stopImmediatePropagation();
            }
            this.dragLen = 0;
        };
        for (var i = 0; i < draggable.length; i++) {
            this.el.sceneEl.systems.xylayout.addDragHandler(draggable[i], draggable[i], dragFun);
            draggable[i].parentNode.addEventListener('click', clickFun, true);
        }
    }
});

AFRAME.registerComponent('simplebutton', {
    schema: {
        color: { type: 'string', default: "#444" },
        color2: { type: 'string', default: "#888" },
        text: { type: 'string', default: "" }
    },
    init: function () {
        this.el.addEventListener('mouseenter', (e) => {
            this.el.setAttribute("material", { color: this.data.color2 });
        });
        this.el.addEventListener('mouseleave', (e) => {
            this.el.setAttribute("material", { color: this.data.color });
        });
        this.labelText = null;
    },
    update: function () {
        this.el.setAttribute("geometry", { primitive: "plane", width: this.data.width, height: this.data.height });
        this.el.setAttribute("material", { color: this.data.color });
        if (this.data.text != "") {
            this.el.setAttribute("text", { value: this.data.text, wrapCount: 4, align: "center" });
        } else {
            this.el.removeAttribute("text");
        }
    }
});

AFRAME.registerComponent('xywindow', {
    dependencies: ['xyrect'],
    schema: {
        title: { type: 'string', default: "" },
        dialog: { type: 'bool', default: false },
        closable: { type: 'bool', default: true }
    },
    init: function () {
        this.el.setAttribute("xycontainer", {});
        this.controls = document.createElement('a-entity');
        this.el.appendChild(this.controls);

        var dragButton = this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: 1, height: 0.5
        }, this.controls);
        dragButton.setAttribute("position", { x: 0.5, y: 0.3, z: 0 });
        dragButton.setAttribute("drag-rotation", { target: this.el });

        if (this.data.closable) {
            var closeButton = this.el.sceneEl.systems.xylayout.createSimpleButton({
                width: 0.5, height: 0.5,
                color: "#444", color2: "#f00", text: " X"
            }, this.controls);
            closeButton.setAttribute("position", { x: this.el.components.xyrect.width - 0.5, y: 0.3, z: 0 });
            closeButton.addEventListener('click', (ev) => {
                this.el.parentNode.removeChild(this.el);
            });
        }

        this.titleText = document.createElement('a-text');
        this.controls.appendChild(this.titleText);
        this.titleText.setAttribute("position", { x: 1.3, y: 0.3, z: 0 });
        this.setTitle(this.data.title);
    },
    update: function () {
    },
    tick: function () {
        this.controls.setAttribute("position", {
            x: -this.el.components.xyrect.width * 0.5,
            y: this.el.components.xyrect.height * 0.5,
            z: 0.01
        });
        if (this.data.width > 0 && this.data.height > 0) {
            return;
        }
    },
    setTitle: function (title) {
        this.titleText.setAttribute("value", title);
    }
});

AFRAME.registerComponent('xybutton', {
    dependencies: ['xyrect'],
    schema: {
        text: { type: 'string', default: null },
        color2: { type: 'string', default: null }
    },
    init: function () {
        this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: this.el.components.xyrect.width, height: this.el.components.xyrect.height,
            color2: this.data.color2, text: this.data.text
        }, null, this.el);
    },
    update: function () {
    }
});

AFRAME.registerComponent('xyrange', {
    dependencies: ['xyrect'],
    schema: {
        max: { type: 'number', default: 100 },
        thumbSize: { type: 'number', default: 0.4 }
    },
    init: function () {
        this.value = 50;

        this.bar = document.createElement('a-entity');
        this.bar.setAttribute("geometry", { primitive: "plane", width: this.el.components.xyrect.width - this.data.thumbSize, height: 0.05 });
        this.bar.setAttribute("material", { color: "#fff" });
        this.bar.setAttribute("position", {
            x: (this.el.components.xyrect.width - this.data.thumbSize * 0.5) * 0.5,
            y: this.el.components.xyrect.height * 0.5,
            z: 0
        });
        this.el.appendChild(this.bar);

        this.thumb = this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: this.data.thumbSize, height: this.data.thumbSize
        }, this.el);
        this.dragging = false;
        this.el.sceneEl.systems.xylayout.addDragHandler(this.thumb, this.el, (point, detail) => {
            this.dragging = true;
            var r = this.el.components.xyrect.width - this.data.thumbSize;
            this.setValue(((point.x - this.data.thumbSize * 0.5) / r * this.data.max), true);
            if (detail.last) {
                this.dragging = false;
                this.el.dispatchEvent(new CustomEvent('change', { detail: this.value }));
            }
        });
    },
    update: function () {
        var r = this.el.components.xyrect.width - this.data.thumbSize;
        this.thumb.setAttribute("position", {
            x: r * this.value / this.data.max + this.data.thumbSize * 0.5,
            y: this.el.components.xyrect.height * 0.5,
            z: 0.01
        });
    },
    setValue: function (value, force) {
        if (!this.dragging || force) {
            this.value = Math.max(Math.min(value, this.data.max), 0);
            this.update();
        }
    }
});

AFRAME.registerPrimitive('a-xywindow', {
    defaultComponents: {
        xycontainer: { mode: "none" },
        xywindow: { dialog: false }
    },
    mappings: {
        width: 'xycontainer.width',
        height: 'xycontainer.height',
        layoutmode: 'xycontainer.mode',
        title: 'xywindow.title',
        dialog: 'xywindow.dialog'
    }
});

AFRAME.registerPrimitive('a-xybutton', {
    defaultComponents: {
        xyrect: {},
        xybutton: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        label: 'xybutton.text'
    }
});


AFRAME.registerPrimitive('a-xyrange', {
    defaultComponents: {
        xyrect: {},
        xyrange: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        max: 'xyrange.max'
    }
});

class XYWindow {
    static currentWindow(el) {
        if (!el || !el.components) return null;
        if (el.components.xywindow) return el.components.xywindow;
        return XYWindow.currentWindow(el.parentNode);
    }
}
