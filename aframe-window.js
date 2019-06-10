"use strict";

// utils.

if (typeof AFRAME === 'undefined') {
    throw 'AFRAME is not loaded.';
}

AFRAME.registerComponent('xy-drag-rotation', {
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

AFRAME.registerComponent('xywindow', {
    dependencies: ['xycontainer'],
    schema: {
        title: { type: 'string', default: "" },
        closable: { type: 'bool', default: true }
    },
    init: function () {
        this.controls = document.createElement('a-entity');
        this.controls.setAttribute("position", { x: 0, y: 0, z: 0.05 });
        this.el.appendChild(this.controls);

        var dragButton = this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: 1, height: 0.5, color2: "#333"
        }, this.controls);
        dragButton.setAttribute("xy-drag-rotation", { target: this.el });
        this.dragButton = dragButton;

        if (this.data.closable) {
            var closeButton = this.el.sceneEl.systems.xylayout.createSimpleButton({
                width: 0.5, height: 0.5,
                color: "#333", color2: "#f00", text: " X"
            }, this.controls);
            closeButton.addEventListener('click', (ev) => {
                if (this.data.closable) {
                    this.el.parentNode.removeChild(this.el);
                }
            });
            this.closeButton = closeButton;
        }

        this.titleText = document.createElement('a-text');
        this.controls.appendChild(this.titleText);
        this.setTitle(this.data.title);
    },
    update: function () {
    },
    tick: function () {
        var a = 0;
        if (this.closeButton) {
            this.closeButton.setAttribute("position", { x: this.el.components.xyrect.width / 2 - 0.25, y: 0.3, z: 0 });
            a += 0.52;
        }
        this.controls.setAttribute("position", "y", this.el.components.xyrect.height * 0.5);
        this.dragButton.setAttribute("geometry", "width", this.el.components.xyrect.width - a);
        this.dragButton.setAttribute("position", { x: -a / 2, y: 0.3, z: 0 });
        this.titleText.setAttribute("position", { x: -this.el.components.xyrect.width / 2 + 0.3, y: 0.3, z: 0.02 });
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
        label: { type: 'string', default: null },
        color2: { type: 'string', default: null }
    },
    init: function () {
        this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: this.el.components.xyrect.width, height: this.el.components.xyrect.height,
            color2: this.data.color2, text: this.data.label
        }, null, this.el);
        this.el.addEventListener('xyresize', (ev) => {
            this.el.setAttribute("geometry", { width: ev.detail.xyrect.width, height: ev.detail.xyrect.height });
        });
    },
    update: function () {
    }
});

AFRAME.registerComponent('xyrange', {
    dependencies: ['xyrect'],
    schema: {
        min: { type: 'number', default: 0 },
        max: { type: 'number', default: 100 },
        step: { type: 'number', default: 0 },
        value: { type: 'number', default: 0 },
        thumbSize: { type: 'number', default: 0.4 }
    },
    init: function () {
        this.value = this.data.value;

        this.bar = document.createElement('a-entity');
        this.bar.setAttribute("geometry", { primitive: "plane", width: this.el.components.xyrect.width - this.data.thumbSize, height: 0.05 });
        this.bar.setAttribute("material", { color: "#fff" });
        this.el.appendChild(this.bar);

        this.thumb = this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: this.data.thumbSize, height: this.data.thumbSize
        }, this.el);
        this.dragging = false;
        this.el.sceneEl.systems.xylayout.addDragHandler(this.thumb, this.el, (point, detail) => {
            this.dragging = true;
            var r = this.el.components.xyrect.width - this.data.thumbSize;
            var p = (point.x + r * 0.5) / r * (this.data.max - this.data.min);
            if (this.data.step > 0) {
                p = Math.round(p / this.data.step) * this.data.step;
            }
            this.setValue(p + this.data.min, true);
            if (detail.last) {
                this.dragging = false;
                this.el.dispatchEvent(new CustomEvent('change', { detail: this.value }));
            }
        });
    },
    update: function () {
        if (this.data.max <= this.data.min) return;
        var r = this.el.components.xyrect.width - this.data.thumbSize;
        this.thumb.setAttribute("position", {
            x: r * (this.data.value - this.data.min) / (this.data.max - this.data.min) - r * 0.5,
            y: 0,
            z: 0.01
        });
    },
    setValue: function (value, force) {
        if (!this.dragging || force) {
            this.value = Math.max(Math.min(value, this.data.max), this.data.min);
            this.el.setAttribute("xyrange", "value", this.value);
        }
    }
});

AFRAME.registerPrimitive('a-xywindow', {
    defaultComponents: {
        xycontainer: { alignItems: "stretch" },
        xywindow: {}
    },
    mappings: {
        width: 'xycontainer.width',
        height: 'xycontainer.height',
        direction: 'xycontainer.direction',
        title: 'xywindow.title'
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
        label: 'xybutton.label'
    }
});


AFRAME.registerPrimitive('a-xyrange', {
    defaultComponents: {
        xyrect: {},
        xyrange: {}
    },
    mappings: {
        min: 'xyrange.min',
        max: 'xyrange.max',
        step: 'xyrange.step',
        value: 'xyrange.value',
        width: 'xyrect.width',
        height: 'xyrect.height'
    }
});

class XYWindow {
    static currentWindow(el) {
        if (!el || !el.components) return null;
        if (el.components.xywindow) return el.components.xywindow;
        return XYWindow.currentWindow(el.parentNode);
    }
}
