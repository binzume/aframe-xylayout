"use strict";

// simple 2d layout components.

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

AFRAME.registerSystem('xylayout', {
    defaultButtonGeometry: 'xy-rounded-rect',
    createSimpleButton: function (params, parent, el) {
        params.color = params.color || "#222";
        params.color2 = params.color2 || "#888";
        var geometry = params.geometry || this.defaultButtonGeometry;
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
            button.setAttribute("text", { value: params.text, wrapCount: Math.max(4, params.text.length), zOffset: 0.01, align: "center" });
        }
        parent && parent.appendChild(button);
        return button;
    },
    addDragHandler: function (target, el, handler) {
        target.classList.add("clickable");
        target.addEventListener('mousedown', (ev) => {
            if (!ev.detail.cursorEl || !ev.detail.cursorEl.components.raycaster) {
                return;
            }
            var draggingRaycaster = ev.detail.cursorEl.components.raycaster.raycaster;
            var dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0).applyMatrix4(el.object3D.matrixWorld);
            var check = (first, last) => {
                var pointw = new THREE.Vector3();
                if (draggingRaycaster.ray.intersectPlane(dragPlane, pointw) !== null) {
                    handler(el.object3D.worldToLocal(pointw), { raycaster: draggingRaycaster, last: last, first: first });
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
        width: { type: 'number', default: -1 }, // -1 : auto
        height: { type: 'number', default: -1 },
        pivotX: { type: 'number', default: 0.5 },
        pivotY: { type: 'number', default: 0.5 }
    },
    init: function () {
        this.height = 0;
        this.width = 0;
    },
    update: function () {
        if (this.el.components.rounded || this.el.tagName == "A-INPUT") {
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
        if (this.data.width >= 0) {
            this.width = this.data.width;
        }
        if (this.data.height >= 0) {
            this.height = this.data.height;
        }
        this.el.dispatchEvent(new CustomEvent('xyresize', { detail: { xyrect: this } }));
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
        this.el.classList.add("clickable");
        this._filterEvent = this._filterEvent.bind(this);
        this.filterTargets = ['click', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove'];
        this.filterTargets.forEach(t => this.el.addEventListener(t, this._filterEvent, true));
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
    remove: function () {
        this.filterTargets.forEach(t => this.el.removeEventListener(t, this._filterEvent, true));
    },
    tick: function () {
        if (!this.el.object3D.matrixWorld.equals(this.currentMatrix)) {
            this.updateMatrix();
        }
    },
    _filterEvent: function (ev) {
        if (!ev.path.includes(this.data.exclude)) {
            if (ev.detail.intersection && this.isClipped(ev.detail.intersection.point)) {
                ev.stopPropagation();
                if (ev.detail.cursorEl && ev.detail.cursorEl.components.raycaster) {
                    let targets = ev.detail.cursorEl.components.raycaster.intersectedEls;
                    let c = targets.indexOf(ev.target);
                    if (c >= 0 && c + 1 < targets.length) {
                        targets[c + 1].dispatchEvent(new CustomEvent(ev.type, ev));
                    }
                }
            }
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

AFRAME.registerComponent('xyitem', {
    schema: {
        fixed: { type: 'boolean', default: false },
        align: { type: 'string', default: "", oneOf: ['', 'center', 'start', 'end', 'stretch'] }
    }
});

AFRAME.registerComponent('xycontainer', {
    dependencies: ['xyrect'],
    schema: {
        width: { type: 'number', default: 1.0 },
        height: { type: 'number', default: 1.0 },
        spacing: { type: 'number', default: 0.05 },
        padding: { type: 'number', default: 0 },
        direction: { type: 'string', default: "vertical", oneOf: ['', 'row', 'column', 'fill', 'vertical', 'horizontal'] },
        alignItems: { type: 'string', default: "", oneOf: ['', 'center', 'start', 'end', 'stretch'] },
        justifyItems: { type: 'string', default: "", oneOf: ['', 'center', 'start', 'end', 'space-between', 'stretch'] },
    },
    update: function () {
        this.doLayout(this.data.width, this.data.height);
        this.el.setAttribute("xyrect", { width: this.data.width, height: this.data.height });
    },
    doLayout: function (w, h) {
        if (this.data.direction === "") {
            return;
        }
        var children = this.el.children;
        var vertical = this.data.direction === "vertical" || this.data.direction === "column";
        var containerRect = this.el.components.xyrect;
        var p = vertical ? ((containerRect.data.pivotY - 1) * h) : (- containerRect.data.pivotX * w);
        var spacing = this.data.spacing;
        var sizeSum = 0;
        w -= this.data.padding * 2;
        h -= this.data.padding * 2;
        var containerSize = (vertical ? h : w);
        var stretchScale = null;
        if (this.data.justifyItems != "") {
            var itemCount = 0;
            for (var i = 0; i < children.length; i++) {
                var item = children[i];
                var layoutItem = item.components.xyitem;
                if (layoutItem && layoutItem.data.fixed || item.classList.contains("xy-ignorelayout")) {
                    continue; // xy-ignorelayout: DEPRECATED
                }
                itemCount++;
                var childRect = item.components.xyrect || {
                    width: item.getAttribute("width") * 1,
                    height: item.getAttribute("height") * 1
                };
                sizeSum += vertical ? childRect.height : childRect.width;
            }
            if (itemCount == 0) {
                return;
            }
            if (this.data.justifyItems == "center") {
                p += (containerSize - sizeSum - spacing * itemCount) / 2;
            } else if (this.data.justifyItems == "end") {
                p += (containerSize - sizeSum - spacing * itemCount);
            } else if (this.data.justifyItems == "stretch") {
                stretchScale = (containerSize - spacing * (itemCount - 1)) / sizeSum;
            } else if (this.data.justifyItems == "space-between") {
                spacing = (containerSize - sizeSum) / (itemCount - 1);
            }
        }

        let alignFn = (align, size, pivot, containerSize, containerPivot) => {
            if (align == "start") {
                return - (containerPivot * containerSize - pivot * size);
            } else if (align == "end") {
                return (containerPivot * containerSize - pivot * size);
            } else if (align == "stretch") {
                return - (containerPivot * containerSize - pivot * containerSize);
            }
            return 0;
        }
        p += this.data.padding;
        for (var i = 0; i < children.length; i++) {
            var item = children[i];
            var layoutItem = item.components.xyitem;
            if (layoutItem && layoutItem.data.fixed || item.classList.contains("xy-ignorelayout")) {
                continue; // xy-ignorelayout: DEPRECATED
            }
            var childRect = item.components.xyrect;
            var align = (layoutItem && layoutItem.data.align) || this.data.alignItems;
            var childScale = item.getAttribute("scale") || { x: 1, y: 1 };
            if (childRect == null) {
                childRect = {
                    width: item.getAttribute("width") * 1,
                    height: item.getAttribute("height") * 1,
                    pivotX: 0.5, pivotY: 0.5
                };
            }
            var pos = item.getAttribute("position") || { x: 0, y: 0, z: 0 };
            var sz;
            if (vertical) {
                let pivot = childRect.pivotY || childRect.data.pivotY;
                sz = childRect.height * childScale.y;
                if (stretchScale !== null) {
                    item.setAttribute("height", childRect.height * stretchScale);
                    sz *= stretchScale;
                }
                pos.y = - (p + (1 - pivot) * sz);
                if (align != "") {
                    let pivot2 = childRect.pivotX || childRect.data.pivotX
                    pos.x = alignFn(align, childRect.width, pivot2, w, containerRect.data.pivotX);
                    if (align == "stretch") {
                        var scaledw = (childScale.x != 0) ? w / childScale.x : w;
                        item.setAttribute("width", scaledw);
                    }
                }
            } else {
                let pivot = childRect.pivotX || childRect.data.pivotX;
                sz = childRect.width * childScale.x;
                if (stretchScale !== null) {
                    item.setAttribute("width", childRect.width * stretchScale);
                    sz *= stretchScale;
                }
                pos.x = p + pivot * sz;
                if (align != "") {
                    let pivot2 = childRect.pivotY || childRect.data.pivotY;
                    pos.y = - alignFn(align, childRect.height, pivot2, h, containerRect.data.pivotY);
                    if (align == "stretch") {
                        var scaledh = (childScale.y != 0) ? h / childScale.y : h;
                        item.setAttribute("height", scaledh);
                    }
                }
            }
            item.setAttribute("position", pos);
            p += sz + spacing;
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
        this._initScrollBar(this.control, 0.3);

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
        this.el.classList.add("clickable");
        this.el.addEventListener('click', (ev) => {
            if (dragLen > 1) {
                ev.stopPropagation();
            }
        }, true);

        this.setScroll(0, 0);
    },
    _initScrollBar: function (el, w) {
        this.upButton = this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: w, height: 0.3
        }, el);
        this.upButton.addEventListener('click', (ev) => {
            this.speedY = -this.scrollDelta * 0.4;
        });

        this.downButton = this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: w, height: 0.3
        }, el);
        this.downButton.addEventListener('click', (ev) => {
            this.speedY = this.scrollDelta * 0.4;
        });
        this.scrollThumb = this.el.sceneEl.systems.xylayout.createSimpleButton({
            width: w * 0.7, height: 0.2
        }, el);
        this.el.sceneEl.systems.xylayout.addDragHandler(this.scrollThumb, this.el, (point) => {
            var thumbH = this.scrollThumb.getAttribute("height") * 0;
            var scrollY = (this.scrollStart - thumbH / 2 - point.y) * Math.max(0.01, this.contentHeight - this.data.height) / (this.scrollLength - thumbH);
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
        this.scrollThumb.setAttribute("position", { x: this.data.width + 0.1, y: 0.4, z: 0.05 });

        this.scrollStart = this.data.height - 0.3;
        this.scrollLength = this.data.height - 0.6;
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
        this.scrollThumb.hasAttribute("geometry") && this.scrollThumb.setAttribute("geometry", "height", thumbH);
        var thumbY = this.scrollStart - thumbH / 2 - (this.scrollLength - thumbH) * this.scrollY / Math.max(0.01, this.contentHeight - this.data.height);
        this.scrollThumb.setAttribute("position", { x: this.data.width + 0.1, y: thumbY, z: 0.05 });

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

AFRAME.registerPrimitive('a-xylayout', {
    defaultComponents: {
        xycontainer: {},
        xyrect: {}
    },
    mappings: {
        width: 'xycontainer.width',
        height: 'xycontainer.height',
        direction: 'xycontainer.direction',
        layoutmode: 'xycontainer.direction', // deprecated
        spacing: 'xycontainer.spacing',
        padding: 'xycontainer.padding',
        "align-items": 'xycontainer.alignItems',
        "justify-items": 'xycontainer.justifyItems'
    }
});

AFRAME.registerPrimitive('a-xyscroll', {
    defaultComponents: {
        xyrect: { pivotX: 0, pivotY: 0 },
        xyscroll: {}
    },
    mappings: {
        width: 'xyscroll.width',
        height: 'xyscroll.height'
    }
});
