"use strict";

// simple 2d layout components.

if (typeof AFRAME === 'undefined') {
    throw 'AFRAME is not loaded.';
}

AFRAME.registerComponent('xyrect', {
    dependencies: ['position'],
    schema: {
        width: { type: 'number', default: -1 },
        height: { type: 'number', default: -1 },
        pivotX: { type: 'number', default: 0.5 },
        pivotY: { type: 'number', default: 0.5 }
    },
    init: function () {
        this.height = 0;
        this.width = 0;
    },
    update: function () {
        if (this.el.components.rounded) {
            // hack for a-frame-material
            this.data.pivotX = 0;
            this.data.pivotY = 0;
        }
        if (this.data.width < 0 && this.el.getAttribute("width")) {
            this.width = this.el.getAttribute("width") * 1;
        }
        if (this.data.height < 0 && this.el.getAttribute("height")) {
            this.height = this.el.getAttribute("height") * 1;
        }
        if (this.data.height > 0) {
            this.height = this.data.height;
        }
        if (this.data.width > 0) {
            this.width = this.data.width;
        }
    },
    doLayout: function (w, h) {
        if (this.data.width < 0) {
            this.width = w;
            this.el.setAttribute("width", w);
        }
        if (this.data.height < 0) {
            this.height = h;
            this.el.setAttribute("height", h);
        }
    }
});

AFRAME.registerComponent('xyclipping', {
    dependencies: ['xyrect'],
    schema: {
        exclude: { type: 'selector', default: null },
        clipTop: { type: 'boolean', default: true },
        clipBottom: { type: 'boolean', default: true },
        clipLeft: { type: 'boolean', default: false },
        clipRight: { type: 'boolean', default: false }
    },
    init: function () {
        this.el.sceneEl.renderer.localClippingEnabled = true;
        this.clippingPlanesLocal = [];
        this.clippingPlanes = [];
        this.exclude = this.data.exclude;
        this.currentMatrix = null;
        this.el.addEventListener('click', (ev) => {
            if (!ev.path.includes(this.data.exclude)) {
                if (ev.detail.intersection && this.isClipped(ev.detail.intersection.point)) {
                    ev.stopPropagation();
                }
            }
        }, true);
    },
    update: function () {
        this.clippingPlanes = [];
        this.clippingPlanesLocal = [];
        var rect = this.el.components.xyrect;
        if (this.data.clipBottom) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
        if (this.data.clipTop) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), rect.height));
        if (this.data.clipLeft) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
        if (this.data.clipRight) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), rect.width));
        this.updateMatrix();
    },
    tick: function () {
        if (!this.el.object3D.matrixWorld.equals(this.currentMatrix)) {
            this.updateMatrix();
        }
    },
    updateMatrix: function () {
        this.currentMatrix = this.el.object3D.matrixWorld.clone();
        for (var i=0; i < this.clippingPlanesLocal.length; i++) {
            this.clippingPlanes[i] = this.clippingPlanesLocal[i].clone().applyMatrix4(this.currentMatrix);
        }
        this.applyClippings();
    },
    applyClippings: function () {
        var setCliping = (el) => {
            if (el === this.exclude) return;
            if (el.components.material && el.components.material.material) {
                el.components.material.material.clippingPlanes = this.clippingPlanes;
            }
            if (el.components.rounded && el.components.rounded.rounded) {
                // hack for a-frame-material
                el.components.rounded.rounded.material.clippingPlanes = this.clippingPlanes;
            }
            if (el.components.text) {
                el.components.text.mesh.material.clippingPlanes = this.clippingPlanes;
            }
            for (var i = 0; i < el.children.length; i++) {
                setCliping(el.children[i]);
            }
        };
        for (var i = 0; i < this.el.children.length; i++) {
            setCliping(this.el.children[i]);
        }
    },
    isClipped: function (p) {
        return this.clippingPlanes.some(plane => plane.distanceToPoint(p) < 0);
    }
});

AFRAME.registerComponent('xycontainer', {
    schema: {
        width: { type: 'number', default: 1.0 },
        height: { type: 'number', default: 1.0 },
        spacing: { type: 'number', default: 0.05 },
        mode: { type: 'string', default: "vertical", oneOf: ['none', 'fill', 'vertical', 'horizontal'] }
    },
    update: function () {
        this.doLayout(this.data.width, this.data.height);
        this.el.setAttribute("xyrect", { width: this.data.width, height: this.data.height, pivotY: 0, pivotX: 0 });
    },
    doLayout: function (w, h) {
        if (this.data.mode === "none") {
            return;
        }
        var el = this.el;
        var p = 0;
        var vertical = this.data.mode === "vertical";
        var attrName = vertical ? "height" : "width";
        for (var i = 0; i < el.children.length; i++) {
            var item = el.children[i];
            if (!item.components || !item.components.position) continue;
            var sz = 0, offset = 0;
            if (item.components.xyrect) {
                if (this.data.mode === "fill") {
                    item.components.xyrect.doLayout(w, h);
                    continue;
                }
                sz = item.components.xyrect[attrName];
                if (vertical) {
                    offset = item.components.xyrect.data.pivotY;
                    item.components.xyrect.doLayout(w, sz);
                } else {
                    offset = item.components.xyrect.data.pivotX;
                    item.components.xyrect.doLayout(sz, h);
                }
            } else if (el.children[i].getAttribute(attrName)) {
                sz = el.children[i].getAttribute(attrName) * 1;
            }
            var pos = item.getAttribute("position");
            if (vertical) {
                pos.y = this.data[attrName] - sz - (p + offset * sz);
            } else {
                pos.x = p + offset * sz;
            }
            item.setAttribute("position", pos);
            p += sz + this.data.spacing;
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
        this.scrollDelta = Math.max(this.data.height / 2, 0.5);
        this.control = document.createElement('a-entity');
        this.el.appendChild(this.control);

        var upButton = document.createElement('a-plane');
        this.control.appendChild(upButton);
        this.speed = 0;
        upButton.setAttribute("width", 0.4);
        upButton.setAttribute("height", 0.4);
        upButton.setAttribute("position", { x: this.data.width, y: this.data.height + 0.3, z: 0.05 });
        upButton.setAttribute("material", { color: "#ccf" });
        upButton.addEventListener('click', (ev) => {
            this.speed = -this.scrollDelta * 0.4;
        });

        var downButton = document.createElement('a-plane');
        this.control.appendChild(downButton);
        downButton.setAttribute("width", 0.4);
        downButton.setAttribute("height", 0.4);
        downButton.setAttribute("position", { x: this.data.width, y: -0.3, z: 0.05 });
        downButton.setAttribute("material", { color: "#ccf" });
        downButton.addEventListener('click', (ev) => {
            this.speed = this.scrollDelta * 0.4;
        });

        var scrollThumb = document.createElement('a-plane');
        this.control.appendChild(scrollThumb);
        scrollThumb.setAttribute("width", 0.1);
        scrollThumb.setAttribute("height", 0.2);
        scrollThumb.setAttribute("position", { x: this.data.width + 0.05, y: 0, z: 0.05 });
        scrollThumb.setAttribute('visible', this.data.scrollbar);
        this.scrollThumb = scrollThumb;

        var touchPlane = document.createElement('a-plane');
        touchPlane.setAttribute("width", this.data.width);
        touchPlane.setAttribute("height", this.data.height);
        touchPlane.setAttribute("position", { x: this.data.width / 2, y: this.data.height / 2, z: -0.05 });
        touchPlane.setAttribute("material", { visible: false });
        this.control.appendChild(touchPlane);

        this.draggingRaycaster = null;
        this.draggingPoint = null;
        this.dragLen = 0.0;
        this.el.addEventListener('mousedown', (ev) => {
            this.update();
            this.draggingPoint = null;
            this.dragLen = 0.0;
            if (ev.detail.cursorEl && ev.detail.cursorEl.components.raycaster) {
                this.draggingRaycaster = ev.detail.cursorEl.components.raycaster;
            }
        });
        this.el.addEventListener('mouseup', (ev) => {
            this.draggingRaycaster = null;
        });
        this.el.addEventListener('click', (ev) => {
            if (this.dragLen > 1) {
                ev.stopPropagation();
            }
        }, true);
        this.touchPlane = touchPlane;

        this.setScroll(0, 0);
    },
    update: function () {
        this.el.setAttribute("xyrect", { width: this.data.width, height: this.data.height });
        this.el.setAttribute("xyclipping", { exclude: this.control });
    },
    tick: function () {
        if (this.draggingRaycaster) {
            var t = this.draggingRaycaster.intersections.find(i => i.object.el === this.touchPlane);
            if (t) {
                var point = this.el.object3D.worldToLocal(t.point);
                if (this.draggingPoint) {
                    var dy = point.y - this.draggingPoint.y;
                    this.speed = dy;
                    this.dragLen += Math.abs(dy);
                }
                this.draggingPoint = point;
            }
        }
        if (Math.abs(this.speed) > 0.001) {
            this.setScroll(this.scrollX, this.scrollY + this.speed);
            this.speed *= 0.75;
        }
    },
    contentChanged: function () {
        this.update();
        this.setScroll(this.scrollX, this.scrollY);
    },
    setScroll: function (x, y) {
        var el = this.el;
        var maxH = 0.001;
        for (var i = 0; i < el.children.length; i++) {
            var child = el.children[i];
            if (child === this.control) continue;
            if (!child.components.xyrect) {
                child.setAttribute("xyrect", {});
            }
            maxH = Math.max(maxH, child.components.xyrect.height);
        }
        this.scrollX = Math.max(0, x);
        this.scrollY = Math.max(0, Math.min(y, maxH - this.data.height));

        var thumbH = Math.max(0.01, Math.min(this.data.height * this.data.height / maxH, 1.0));
        this.scrollThumb.setAttribute("height", thumbH);
        this.scrollThumb.setAttribute("position", {
            x: this.data.width + 0.05,
            y: this.data.height - thumbH / 2 - (this.data.height - thumbH) * this.scrollY / Math.max(0.01, maxH - this.data.height),
            z: 0.05
        });

        for (var i = 0; i < el.children.length; i++) {
            var item = el.children[i];
            if (item === this.control) continue;
            if (item.classList.contains("xyscroll-fixed")) {
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
                this.el.appendChild(el);
                this.elements.push(el);
            }
        }
        var retry = false;
        for (var position = st; position < en; position++) {
            retry |= !this.updateElement(position);
        }
        this.tick = retry ? this.refresh : function () { };

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

AFRAME.registerPrimitive('a-xylayout', {
    defaultComponents: {
        xycontainer: {}
    },
    mappings: {
        width: 'xycontainer.width',
        height: 'xycontainer.height',
        mode: 'xycontainer.mode'
    }
});

AFRAME.registerPrimitive('a-xyscroll', {
    defaultComponents: {
        xyscroll: {}
    },
    mappings: {
        width: 'xyscroll.width',
        height: 'xyscroll.height'
    }
});
