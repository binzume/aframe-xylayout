"use strict";

// utils.

if (typeof AFRAME === 'undefined') {
    throw 'AFRAME is not loaded.';
}

AFRAME.registerComponent('drag-rotation', {
    schema: {
        target: { type: 'selector', default: null }
    },
    init: function () {
        this.target = this.data.target || this.el;
        this.draggingRaycaster = null;
        this.dragLen = 0;
        this.dragThreshold = 0.2;
        this.el.addEventListener('mousedown', (e) => {
            this.dragLen = 0;
            if (e.detail.cursorEl && e.detail.cursorEl.components.raycaster) {
                this.draggingRaycaster = e.detail.cursorEl.components.raycaster.raycaster;
                this.draggingDirection = this.draggingRaycaster.ray.direction.clone();
            }
            var onmouseup = (e) => {
                this.draggingRaycaster = null;
                window.removeEventListener('mouseup', onmouseup);
            };
            window.addEventListener('mouseup', onmouseup);
        });
        this.el.parentNode.addEventListener('click', (ev) => {
            if (this.dragLen > this.dragThreshold && ev.path.includes(this.el)) {
                ev.stopImmediatePropagation();
            }
            this.dragLen = 0;
        }, true);
    },
    tick: function () {
        if (this.draggingRaycaster != null) {
            //TODO: ray.origin as center
            var direction = this.draggingRaycaster.ray.direction.clone();
            this.dragLen += direction.manhattanDistanceTo(this.draggingDirection);
            if (this.dragLen < this.dragThreshold) return;
            var rot = new THREE.Quaternion().setFromUnitVectors(this.draggingDirection, direction);
            var matrix = new THREE.Matrix4().makeRotationFromQuaternion(rot);
            var o = this.draggingRaycaster.ray.origin;
            var tr = new THREE.Matrix4();
            matrix.multiply(tr.makeTranslation(-o.x, -o.y, -o.z));
            matrix.premultiply(tr.makeTranslation(o.x, o.y, o.z));
            this.target.object3D.applyMatrix(matrix);
            this.draggingDirection = direction;
        }
    }
});

AFRAME.registerComponent('xywindow', {
    schema: {
        title: { type: 'string', default: "" },
        dialog: { type: 'bool', default: false }
    },
    init: function () {
        this.el.setAttribute("xycontainer", {});
        this.controls = document.createElement('a-entity');
        this.el.appendChild(this.controls);

        var dragButton = document.createElement('a-plane');
        this.controls.appendChild(dragButton);
        dragButton.setAttribute("width", 1);
        dragButton.setAttribute("height", 0.5);
        dragButton.setAttribute("position", { x: 0.5, y: 0.3, z: 0 });
        dragButton.setAttribute("material", { color: "#0f0" });
        dragButton.setAttribute("drag-rotation", { target: this.el });

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

AFRAME.registerPrimitive('a-xywindow', {
    defaultComponents: {
        xycontainer: { mode: "none" },
        xywindow: { dialog: false },
    },
    mappings: {
        width: 'xycontainer.width',
        height: 'xycontainer.height',
        title: 'xywindow.title',
        dialog: 'xywindow.dialog'
    }
});

class XYWindow {
    static currentWindow(el) {
        if (!el || !el.components) return null;
        if (el.components.xywindow) return el.components.xywindow;
        return XYWindow.currentWindow(el.parentNode);
    }
}
