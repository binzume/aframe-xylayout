"use strict";

if (typeof AFRAME === 'undefined') {
    throw 'AFRAME is not loaded.';
}

AFRAME.registerGeometry('xy-rounded-rect', {
    schema: {
        height: { default: 1, min: 0 },
        width: { default: 1, min: 0 },
        radius: { default: 0.05, min: 0 }
    },
    init: function (data) {
        var shape = new THREE.Shape();
        var radius = data.radius;
        var w = data.width || 0.01, h = data.height || 0.01;
        var x = -w / 2, y = -h / 2;
        shape.moveTo(x, y + radius);
        shape.lineTo(x, y + h - radius);
        shape.quadraticCurveTo(x, y + h, x + radius, y + h);
        shape.lineTo(x + w - radius, y + h);
        shape.quadraticCurveTo(x + w, y + h, x + w, y + h - radius);
        shape.lineTo(x + w, y + radius);
        shape.quadraticCurveTo(x + w, y, x + w - radius, y);
        shape.lineTo(x + radius, y);
        shape.quadraticCurveTo(x, y, x, y + radius);
        this.geometry = new THREE.ShapeGeometry(shape);
    }
});

AFRAME.registerComponent('xylabel', {
    schema: {
        width: { type: 'number', default: 1 },
        height: { type: 'number', default: 0 },
        resolution: { type: 'number', default: 32 },
        wrapCount: { type: 'number', default: 16 },
        value: { default: "" },
        color: { default: "white" }
    },
    init: function () {
        this.canvas = document.createElement("canvas");
        this.canvas.id = "_CANVAS" + Math.random();
        var src = new THREE.CanvasTexture(this.canvas);
        src.anisotropy = 4;
        this.updateTexture = function () {
            src.needsUpdate = true;
        };
        this.el.setAttribute('material', { shader: "flat", npot: true, src: src, transparent: true });
    },
    update: function () {
        let widthFactor = 0.65;
        let w = this.data.width || 1;
        let h = this.data.height || w / (this.data.wrapCount * widthFactor);
        this.el.setAttribute("geometry", { primitive: "plane", width: w, height: h });

        this.canvas.height = this.data.resolution;
        this.canvas.width = this.data.resolution * (this.data.wrapCount * widthFactor);
        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.font = "" + (this.data.resolution) + "px bold sans-serif";
        ctx.fillStyle = this.data.color;
        ctx.fillText(this.data.value, 0, this.data.resolution);
        this.updateTexture();
    },
    remove: function() {
        this.el.removeAttribute('material');
        this.el.removeAttribute('geometry');
    }
});

AFRAME.registerSystem('xywindow', {
    theme: {
        buttonColor: "#222",
        buttonHoverColor: "#888",
        buttonLabelColor: "#fff",
        buttonGeometry: 'xy-rounded-rect',
        windowCloseButtonColor: "#f00",
        windowTitleBarColor: "#111",
        windowTitleColor: "#fff",
    },
    createSimpleButton: function (params, parent, el) {
        params.color = params.color || this.theme.buttonColor;
        params.color2 = params.color2 || this.theme.buttonHoverColor;
        params.labelColor = params.labelColor || this.theme.buttonLabelColor;
        var geometry = params.geometry || this.theme.buttonGeometry;
        var button = el || document.createElement('a-entity');
        button.classList.add("clickable");
        button.addEventListener('mouseenter', (e) => {
            button.setAttribute("material", { color: params.color2 });
        });
        button.addEventListener('mouseleave', (e) => {
            button.setAttribute("material", { color: params.color });
        });

        button.setAttribute("geometry", { primitive: geometry, width: params.width, height: params.height });
        button.setAttribute("material", { color: params.color });
        if (params.text) {
            var h = (params.height > 0 ? (params.width / params.height * 1.5) : 2) + 2;
            button.setAttribute("text", {
                value: params.text, wrapCount: Math.max(h, params.text.length),
                zOffset: 0.01, align: "center", color: params.labelColor
            });
        }
        parent && parent.appendChild(button);
        return button;
    }
});

AFRAME.registerComponent('xy-draggable', {
    schema: {
        dragThreshold: { default: 0.02 },
        preventClick: { default: true },
        base: { type: 'selector', default: null }
    },
    init: function () {
        this.el.classList.add("clickable");
        this._onmousedown = this._onmousedown.bind(this);
        this.el.addEventListener('mousedown', this._onmousedown);
    },
    remove: function () {
        this.el.removeEventListener('mousedown', this._onmousedown);
    },
    _onmousedown: function (ev) {
        if (!ev.detail.cursorEl || !ev.detail.cursorEl.components.raycaster) {
            return;
        }
        let baseEl = this.data.base || this.el;
        let draggingRaycaster = ev.detail.cursorEl.components.raycaster.raycaster;
        let dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0).applyMatrix4(baseEl.object3D.matrixWorld);
        let startDirection = draggingRaycaster.ray.direction.clone();
        let dragging = false;
        let point = new THREE.Vector3();
        if (draggingRaycaster.ray.intersectPlane(dragPlane, point) === null) {
            baseEl.object3D.worldToLocal(point);
        }
        let prevRay = draggingRaycaster.ray.clone();

        let dragFun = (event) => {
            if (!dragging) {
                let d = startDirection.manhattanDistanceTo(draggingRaycaster.ray.direction);
                if (d < this.data.dragThreshold) return;
                event = "xy-dragstart"
                dragging = true;
            }
            let prevPoint = point.clone();
            if (draggingRaycaster.ray.intersectPlane(dragPlane, point) !== null) {
                baseEl.object3D.worldToLocal(point);
            }
            this.el.emit(event, { raycaster: draggingRaycaster, point: point, prevPoint: prevPoint, prevRay: prevRay });
            prevRay.copy(draggingRaycaster.ray);
        };
        let dragTimer = setInterval(dragFun, 20, "xy-drag");
        let self = this;
        window.addEventListener('mouseup', function mouseup() {
            window.removeEventListener('mouseup', mouseup);
            clearInterval(dragTimer);
            if (!dragging) return;
            if (self.data.preventClick) {
                let cancelClick = ev => ev.stopPropagation();
                window.addEventListener('click', cancelClick, true);
                setTimeout(() => window.removeEventListener('click', cancelClick, true), 0);
            }
            dragFun("xy-dragend");
        });
    }
});

AFRAME.registerComponent('xy-drag-rotation', {
    schema: {
        target: { type: 'selector', default: null },
        draggable: { type: 'string', default: "" },
        mode: { type: 'string', default: "pan" }
    },
    init: function () {
        this._ondrag = this._ondrag.bind(this);
        this.draggable = [];
    },
    update: function () {
        this.target = this.data.target || this.el;
        this.remove();
        this.draggable = Array.isArray(this.data.draggable) ? this.data.draggable :
            this.data.draggable != "" ? this.el.querySelectorAll(this.data.draggable) : [this.el];
        this.draggable.forEach(el => {
            el.setAttribute("xy-draggable", {});
            el.addEventListener("xy-dragstart", this._ondrag);
            el.addEventListener("xy-drag", this._ondrag);
        });
    },
    remove: function () {
        this.draggable.forEach(el => {
            el.removeAttribute("xy-draggable");
            el.removeEventListener("xy-dragstart", this._ondrag);
            el.removeEventListener("xy-drag", this._ondrag);
        });
    },
    _ondrag: function (ev) {
        var direction = ev.detail.raycaster.ray.direction;
        var prevDirection = ev.detail.prevRay.direction;
        if (this.data.mode == "move") {
            var d = direction.clone().sub(prevDirection).applyQuaternion(this.el.sceneEl.camera.getWorldQuaternion().inverse());
            this.target.object3D.position.add(d.multiplyScalar(16).applyQuaternion(this.el.object3D.getWorldQuaternion()));
        } else {
            var rot = new THREE.Quaternion().setFromUnitVectors(prevDirection, direction);
            var matrix = new THREE.Matrix4().makeRotationFromQuaternion(rot);
            var o1= ev.detail.prevRay.origin;
            var o2 = ev.detail.raycaster.ray.origin;
            var tr = new THREE.Matrix4();
            matrix.multiply(tr.makeTranslation(-o1.x, -o1.y, -o1.z));
            matrix.premultiply(tr.makeTranslation(o2.x, o2.y, o2.z));
            this.target.object3D.applyMatrix(matrix);

            this.target.object3D.lookAt(this.el.sceneEl.camera.getWorldPosition(new THREE.Vector3()));
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
        this.theme = this.system.theme;
        this.controls = document.createElement('a-entity');
        this.controls.setAttribute("position", { x: 0, y: 0, z: 0.05 });
        this.el.appendChild(this.controls);

        var dragButton = this.system.createSimpleButton({
            width: 1, height: 0.5, color: this.theme.windowTitleBarColor
        }, this.controls);
        dragButton.setAttribute("xy-drag-rotation", { target: this.el });
        this.dragButton = dragButton;

        if (this.data.closable) {
            var closeButton = this.system.createSimpleButton({
                width: 0.5, height: 0.5,
                color: this.theme.windowTitleBarColor, color2: this.theme.windowCloseButtonColor, text: " X"
            }, this.controls);
            closeButton.addEventListener('click', (ev) => {
                if (this.data.closable) {
                    this.el.parentNode.removeChild(this.el);
                }
            });
            this.closeButton = closeButton;
        }

        this.titleText = document.createElement('a-entity');
        this.controls.appendChild(this.titleText);
        this.el.addEventListener('xyresize', (ev) => {
            this.update({});
        });
    },
    update: function (oldData) {
        if (this.data.title != oldData.title) {
            var w = this.el.components.xyrect.width - 0.5;
            if (/[\u0100-\uDFFF]/.test(this.data.title)) {
                this.titleText.removeAttribute("text");
                this.titleText.setAttribute("xylabel", { value: this.data.title, wrapCount: Math.max(10, w / 0.2), width: w, color: this.theme.windowTitleColor });
            } else {
                this.titleText.removeAttribute("xylabel");
                this.titleText.setAttribute("text", { value: this.data.title, wrapCount: Math.max(10, w / 0.2), width: w, color: this.theme.windowTitleColor, align: "left" });
            }
        }
        var a = 0;
        if (this.closeButton) {
            this.closeButton.setAttribute("position", { x: this.el.components.xyrect.width / 2 - 0.25, y: 0.3, z: 0 });
            a += 0.52;
        }
        this.controls.setAttribute("position", "y", this.el.components.xyrect.height * 0.5);
        this.dragButton.setAttribute("geometry", "width", this.el.components.xyrect.width - a);
        this.dragButton.setAttribute("position", { x: -a / 2, y: 0.3, z: 0 });
        this.titleText.setAttribute("position", { x: -0.2, y: 0.3, z: 0.02 });
    },
    setTitle: function (title) {
        this.titleText.setAttribute("value", title);
    }
});

AFRAME.registerComponent('xybutton', {
    dependencies: ['xyrect'],
    schema: {
        label: { type: 'string', default: "" },
        color2: { type: 'string', default: "" }
    },
    init: function () {
        this.el.sceneEl.systems.xywindow.createSimpleButton({
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

        this.dragging = false;

        this.thumb = this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: this.data.thumbSize, height: this.data.thumbSize
        }, this.el);

        this.thumb.setAttribute("xy-draggable", { base: this.el });
        this.thumb.addEventListener("xy-drag", ev => {
            this.dragging = true;
            var r = this.el.components.xyrect.width - this.data.thumbSize;
            var p = (ev.detail.point.x + r * 0.5) / r * (this.data.max - this.data.min);
            if (this.data.step > 0) {
                p = Math.round(p / this.data.step) * this.data.step;
            }
            this.setValue(p + this.data.min, true);
            this.el.dispatchEvent(new CustomEvent('change', { detail: this.value }));
        });
        this.thumb.addEventListener("xy-dragend", ev => {
            this.dragging = false;
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


AFRAME.registerComponent('xyscroll', {
    schema: {
        width: { type: 'number', default: -1 },
        height: { type: 'number', default: -1 },
        scrollbar: { type: 'boolean', default: true }
    },
    init: function () {
        this.scrollX = 0;
        this.scrollY = 0;
        this.speedY = 0;
        this.contentHeight = 0;
        this.scrollDelta = Math.max(this.data.height / 2, 0.5);
        this.control = document.createElement('a-entity');
        this.thumbLen = 0.2;
        this.el.appendChild(this.control);
        this._initScrollBar(this.control, 0.3);

        this.el.setAttribute("xy-draggable", {});
        this.el.addEventListener("xy-drag", ev => {
            this.speedY = 0;
            this.setScroll(this.scrollX, this.scrollY + ev.detail.point.y - ev.detail.prevPoint.y);
        });
        this.el.addEventListener("xy-dragend", ev => {
            this.speedY = ev.detail.point.y - ev.detail.prevPoint.y;
        });
    },
    _initScrollBar: function (el, w) {
        this.upButton = this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: w, height: 0.3
        }, el);
        this.upButton.addEventListener('click', (ev) => {
            this.speedY = -this.scrollDelta * 0.3;
        });

        this.downButton = this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: w, height: 0.3
        }, el);
        this.downButton.addEventListener('click', (ev) => {
            this.speedY = this.scrollDelta * 0.3;
        });
        this.scrollThumb = this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: w * 0.7, height: this.thumbLen
        }, el);
        this.scrollThumb.setAttribute("xy-draggable", { base: this.el });
        this.scrollThumb.addEventListener("xy-drag", ev => {
            var thumbH = this.thumbLen;
            var scrollY = (this.scrollStart - thumbH / 2 - ev.detail.point.y) * Math.max(0.01, this.contentHeight - this.data.height) / (this.scrollLength - thumbH);
            this.setScroll(this.scrollX, scrollY);
        });
    },
    update: function () {
        this.el.setAttribute("xyrect", { width: this.data.width, height: this.data.height });
        this.el.setAttribute("xyclipping", { exclude: this.control });

        this.upButton.setAttribute('visible', this.data.scrollbar);
        this.upButton.setAttribute("position", { x: this.data.width + 0.1, y: this.data.height - 0.15, z: 0.05 });
        this.downButton.setAttribute('visible', this.data.scrollbar);
        this.downButton.setAttribute("position", { x: this.data.width + 0.1, y: 0.15, z: 0.05 });
        this.scrollThumb.setAttribute('visible', this.data.scrollbar);

        this.scrollStart = this.data.height - 0.3;
        this.scrollLength = this.data.height - 0.6;
        this.setScroll(0, 0);
    },
    tick: function () {
        if (Math.abs(this.speedY) > 0.001) {
            this.setScroll(this.scrollX, this.scrollY + this.speedY);
            this.speedY *= 0.8;
        }
    },
    contentChanged: function () {
        this.update();
        this.setScroll(this.scrollX, this.scrollY);
    },
    setScroll: function (x, y) {
        var children = this.el.children;
        var maxH = 0.001;
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (child === this.control) continue;
            if (!child.components.xyrect) {
                child.setAttribute("xyrect", {});
            }
            maxH = Math.max(maxH, child.components.xyrect.height);
        }
        this.contentHeight = maxH;

        this.scrollX = Math.max(0, x);
        this.scrollY = Math.max(0, Math.min(y, this.contentHeight - this.data.height));

        var thumbH = Math.max(0.2, Math.min(this.scrollLength * this.data.height / this.contentHeight, this.scrollLength));
        var thumbY = this.scrollStart - thumbH / 2 - (this.scrollLength - thumbH) * this.scrollY / Math.max(0.01, this.contentHeight - this.data.height);
        this.thumbLen = thumbH;
        this.scrollThumb.hasAttribute("geometry") && this.scrollThumb.setAttribute("geometry", "height", thumbH);
        this.scrollThumb.setAttribute("position", { x: this.data.width + 0.1, y: thumbY, z: 0.05 });

        for (var i = 0; i < children.length; i++) {
            var item = children[i];
            if (item === this.control) continue;
            if (item.components.xyitem && item.components.xyitem.data.fixed) {
                continue;
            }
            var pos = item.getAttribute("position");
            pos.x = -this.scrollX + item.components.xyrect.data.pivotX * item.components.xyrect.width;
            pos.y = this.scrollY - (1.0 - item.components.xyrect.data.pivotY) * item.components.xyrect.height + this.data.height;
            item.setAttribute("position", pos);
            if (item.components.xylist) {
                var t = item.components.xyrect.height - this.scrollY;
                item.components.xylist.setRect(t, t - this.data.height, this.scrollX, this.scrollX + this.data.width);
            }
        }
        if (this.el.components.xyclipping) {
            this.el.components.xyclipping.applyClippings();
        }
    }
});

AFRAME.registerComponent('xylist', {
    schema: {
        width: { type: 'number', default: -1 },
        itemHeight: { type: 'number', default: -1 },
        vertical: { type: 'boolean', default: true }
    },
    init: function () {
        this.elementFactory = null;
        this.elementUpdator = null;
        this.elements = [];
        this.userData = null;
        this.itemCount = 0;
        this.itemClicked = null;
        this.el.setAttribute("xyrect", { width: this.data.width, height: this.data.itemHeight, pivotX: 0, pivotY: 0 });
        this.setRect(0, 0, 0, 0);
        this.el.classList.add("clickable");
        this.el.addEventListener('click', (ev) => {
            for (var i = 0; i < ev.path.length; i++) {
                if (ev.path[i].parentNode == this.el && ev.path[i].dataset.listPosition != null) {
                    this.itemClicked && this.itemClicked(ev.path[i].dataset.listPosition, ev);
                    break;
                }
            }
        });
    },
    setCallback(f, u) {
        this.elementFactory = f || this.elementFactory;
        this.elementUpdator = u || this.elementUpdator;
        if (this.data.itemHeight < 0) {
            var el = this.elementFactory(this.el, this.userData);
            this.data.itemHeight = el.getAttribute("height") * 1.0;
        }
    },
    setContents: function (data, size) {
        this.userData = data;
        this.itemCount = size != null ? size : data.length;
        var hh = this.data.itemHeight * this.itemCount;
        this.el.setAttribute("xyrect", { width: this.data.width, height: hh });
        for (var t = 0; t < this.elements.length; t++) {
            this.elements[t].setAttribute('visible', false);
            this.elements[t].dataset.listPosition = -1;
        }
        var scroll = this.el.parentNode.components.xyscroll;
        if (scroll) {
            scroll.contentChanged();
        }
        this.refresh();
    },
    setRect: function (t, b, l, r) {
        this.top = t;
        this.bottom = b;
        this.refresh();
    },
    refresh: function () {
        if (!this.elementFactory) return;
        var hh = this.data.itemHeight * this.itemCount;
        var st = Math.max(Math.floor((hh - this.top) / this.data.itemHeight), 0);
        var en = Math.min(Math.ceil((hh - this.bottom) / this.data.itemHeight), this.itemCount);
        var n = en - st + 1;
        if (n > this.elements.length) {
            // TODO: compaction
            while (n > this.elements.length) {
                var el = this.elementFactory(this.el, this.userData);
                el.dataset.listPosition = -1;
                el.classList.add("clickable");
                this.el.appendChild(el);
                this.elements.push(el);
            }
        }
        var retry = false;
        for (var position = st; position < en; position++) {
            retry |= !this.updateElement(position);
        }
        if (retry) setTimeout(this.refresh.bind(this), 100);

        for (var t = 0; t < this.elements.length; t++) {
            var p = this.elements[t].dataset.listPosition;
            this.elements[t].setAttribute('visible', p >= st && p < en);
        }
    },
    updateElement: function (position) {
        var el = this.elements[position % this.elements.length];
        if (!el.hasLoaded) return false;
        if (el.dataset.listPosition == position) return true;
        el.dataset.listPosition = position;
        var x = 0.0, y = (this.itemCount - position - 1) * this.data.itemHeight;
        if (el.components.xyrect) {
            x += el.components.xyrect.data.pivotX * el.components.xyrect.width;
            y += el.components.xyrect.data.pivotY * el.components.xyrect.height;
        }
        el.setAttribute("position", { x: x, y: y, z: 0 });
        this.elementUpdator && this.elementUpdator(position, el, this.userData);
        return true;
    },
});

AFRAME.registerComponent('xycanvas', {
    schema: {
        width: { type: 'number', default: 100 },
        height: { type: 'number', default: 100 }
    },
    init: function () {
        this.canvas = document.createElement("canvas");

        // to Avoid a-frame bugs.
        this.canvas.id = "_CANVAS" + Math.random();
        var src = new THREE.CanvasTexture(this.canvas);
        this.updateTexture = function () {
            src.needsUpdate = true;
        };

        this.el.setAttribute('material', { shader: "flat", npot: true, src: src, transparent: true });
    },
    update: function () {
        this.canvas.width = this.data.width;
        this.canvas.height = this.data.height;
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

AFRAME.registerPrimitive('a-xyscroll', {
    defaultComponents: {
        xyrect: { pivotX: 0, pivotY: 0 },
        xyscroll: {}
    },
    mappings: {
        width: 'xyscroll.width',
        height: 'xyscroll.height',
        scrollbar: 'xyscroll.scrollbar'
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
