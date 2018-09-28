"use strict";

// simple 2d layout components.

if (typeof AFRAME === 'undefined') {
    throw 'AFRAME is not loaded.';
}

AFRAME.registerSystem('xylayout', {
    createSimpleButton: function (params, parent, el) {
        params.color = params.color || "#444";
        params.color2 = params.color2 || "#888";
        var button = el || document.createElement('a-entity');
        button.addEventListener('mouseenter', (e) => {
            button.setAttribute("material", { color: params.color2 });
        });
        button.addEventListener('mouseleave', (e) => {
            button.setAttribute("material", { color: params.color });
        });

        button.setAttribute("geometry", { primitive: "plane", width: params.width, height: params.height });
        button.setAttribute("material", { color: params.color });
        if (params.text) {
            button.setAttribute("text", { value: params.text, wrapCount: 4, align: "center" });
        }
        parent && parent.appendChild(button);
        return button;
    },
    addDragHandler: function (target, el, handler) {
        target.addEventListener('mousedown', (ev) => {
            if (!ev.detail.cursorEl || !ev.detail.cursorEl.components.raycaster) {
                return;
            }
            var draggingRaycaster = ev.detail.cursorEl.components.raycaster.raycaster;
            var dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0).applyMatrix4(el.object3D.matrixWorld);
            var check = (first, last) => {
                var pointw = new THREE.Vector3();
                if (draggingRaycaster.ray.intersectPlane(dragPlane, pointw) !== null) {
                    handler(el.object3D.worldToLocal(pointw), {raycaster: draggingRaycaster, last: last, first: first});
                }
            };
            check(true, false);
            var dragTimer = setInterval(check, 20, false, false);
            window.addEventListener('mouseup', function mouseup() {
                window.removeEventListener('mouseup', mouseup);
                clearInterval(dragTimer);
                check(false, true);
            });
        });
    }
});

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
        for (var i = 0; i < this.clippingPlanesLocal.length; i++) {
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
        var children = this.el.children;
        var p = 0;
        var vertical = this.data.mode === "vertical";
        var attrName = vertical ? "height" : "width";
        for (var i = 0; i < children.length; i++) {
            var item = children[i];
            if (!item.components || !item.components.position) continue;
            var sz, offset = 0;
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
            } else if (item.getAttribute(attrName)) {
                sz = item.getAttribute(attrName) * 1;
            }
            var pos = item.object3D.position;
            if (vertical) {
                pos.y = this.data[attrName] - (p + (1 - offset) * sz);
            } else {
                pos.x = p + offset * sz;
            }
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
        this.speedY = 0;
        this.contentHeight = 0;
        this.scrollDelta = Math.max(this.data.height / 2, 0.5);
        this.control = document.createElement('a-entity');
        this.el.appendChild(this.control);

        var upButton = this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: 0.3, height: 0.5
        }, this.control);
        upButton.addEventListener('click', (ev) => {
            this.speedY = -this.scrollDelta * 0.4;
        });
        upButton.setAttribute("position", { x: this.data.width, y: this.data.height + 0.3, z: 0.05 });
        upButton.setAttribute('visible', this.data.scrollbar);

        var downButton = this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: 0.3, height: 0.5
        }, this.control);
        downButton.addEventListener('click', (ev) => {
            this.speedY = this.scrollDelta * 0.4;
        });
        downButton.setAttribute("position", { x: this.data.width, y: -0.3, z: 0.05 });
        downButton.setAttribute('visible', this.data.scrollbar);

        this.scrollThumb = this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: 0.2, height: 0.2
        }, this.control);
        this.scrollThumb.setAttribute("position", { x: this.data.width + 0.05, y: 0, z: 0.05 });
        this.scrollThumb.setAttribute('visible', this.data.scrollbar);
        this.el.sceneEl.systems.xylayout.addDragHandler(this.scrollThumb, this.el, (point) => {
            var thumbH = this.scrollThumb.getAttribute("height") * 0;
            var y = (this.data.height - thumbH / 2 - point.y) * Math.max(0.01, this.contentHeight - this.data.height) / (this.data.height - thumbH);
            this.setScroll(this.scrollX, y);
        });

        var draggingPoint = null;
        var dragLen = 0.0;
        this.el.sceneEl.systems.xylayout.addDragHandler(this.el, this.el, (point, detail) => {
            if (detail.first) {
                dragLen = 0.0;
            } else {
                var dy = point.y - draggingPoint.y;
                this.speedY = dy;
                dragLen += Math.abs(dy);
            }
            draggingPoint = point;
        });
        this.el.addEventListener('click', (ev) => {
            if (dragLen > 1) {
                ev.stopPropagation();
            }
        }, true);

        this.setScroll(0, 0);
    },
    update: function () {
        this.el.setAttribute("xyrect", { width: this.data.width, height: this.data.height });
        this.el.setAttribute("xyclipping", { exclude: this.control });
    },
    tick: function () {
        if (Math.abs(this.speedY) > 0.001) {
            this.setScroll(this.scrollX, this.scrollY + this.speedY);
            this.speedY *= 0.75;
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

        var thumbH = Math.max(0.1, Math.min(this.data.height * this.data.height / this.contentHeight, 1.0));
        this.scrollThumb.setAttribute("height", thumbH);
        this.scrollThumb.setAttribute("position", {
            x: this.data.width + 0.05,
            y: this.data.height - thumbH / 2 - (this.data.height - thumbH) * this.scrollY / Math.max(0.01, this.contentHeight - this.data.height),
            z: 0.05
        });

        for (var i = 0; i < children.length; i++) {
            var item = children[i];
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
        mode: 'xycontainer.mode',
        spacing: 'xycontainer.spacing'
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
