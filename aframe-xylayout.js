"use strict";

if (typeof AFRAME === 'undefined') {
    throw 'AFRAME is not loaded.';
}

AFRAME.registerComponent('xycontainer', {
    dependencies: ['xyrect'],
    schema: {
        spacing: { type: 'number', default: 0.05 },
        padding: { type: 'number', default: 0 },
        reverse: { type: 'boolean', default: false },
        wrap: { default: "nowrap", oneOf: ['wrap', 'nowrap'] },
        direction: { default: "vertical", oneOf: ['none', 'row', 'column', 'vertical', 'horizontal'] },
        alignItems: { default: "none", oneOf: ['none', 'center', 'start', 'end', 'baseline', 'stretch'] },
        justifyItems: { default: "start", oneOf: ['center', 'start', 'end', 'space-between', 'space-around', 'stretch'] },
    },
    init() {
        this.el.addEventListener('xyresize', ev => {
            this._doLayout(ev.detail.xyrect.width, ev.detail.xyrect.height);
        });
        this.requestLayoutUpdate();
    },
    _doLayout(w, h) {
        if (this.data.direction === "none") {
            return;
        }
        let children = this.el.children;
        let isVertical = this.data.direction === "vertical" || this.data.direction === "column";
        let mainDir = (this.data.reverse ^ isVertical) ? -1 : 1;
        let xymat = isVertical ? [0, 1, mainDir, 0] : [mainDir, 0, 0, -1]; // [main,corss] to [x,y]
        let containerRect = this.el.components.xyrect;
        let containerSize = [
            (isVertical ? h : w) - this.data.padding * 2,
            (isVertical ? w : h) - this.data.padding * 2
        ];

        // lines
        let targets = [];
        let sizeSum = 0;
        let growSum = 0;
        let shrinkSum = 0;
        let crossSize = 0;
        let crossSizeSum = 0;
        let lines = [];
        for (var i = 0; i < children.length; i++) {
            let el = children[i];
            let layoutItem = el.components.xyitem;
            if (layoutItem && layoutItem.data.fixed) {
                continue;
            }
            let rect = el.components.xyrect || {
                width: el.getAttribute("width") * 1,
                height: el.getAttribute("height") * 1
            };
            let childScale = el.getAttribute("scale") || { x: 1, y: 1 };
            let itemData = isVertical ? ({
                el: el,
                sizeMain: rect.height,
                sizeCross: rect.width,
                pivotMain: rect.data ? rect.data.pivotY : 0.5,
                pivotCross: rect.data ? rect.data.pivotX : 0.5,
                scaleMain: childScale.y,
                scaleCross: childScale.x
            }) : ({
                el: el,
                sizeMain: rect.width,
                sizeCross: rect.height,
                pivotMain: rect.data ? rect.data.pivotX : 0.5,
                pivotCross: rect.data ? rect.data.pivotY : 0.5,
                scaleMain: childScale.x,
                scaleCross: childScale.y
            });
            if (itemData.sizeMain === undefined || isNaN(itemData.sizeMain)) {
                continue;
            }
            let sz = sizeSum + itemData.sizeMain * itemData.scaleMain + this.data.spacing * (targets.length - 1);
            if (this.data.wrap == "wrap" && sizeSum > 0 && sz > containerSize[0]) {
                lines.push({ targets: targets, sizeSum: sizeSum, growSum: growSum, shrinkSum: shrinkSum, crossSize: crossSize });
                crossSizeSum += crossSize;
                targets = [];
                sizeSum = 0;
                growSum = 0;
                shrinkSum = 0;
                crossSize = 0;
            }
            targets.push(itemData);
            sizeSum += itemData.sizeMain * itemData.scaleMain;
            growSum += layoutItem ? layoutItem.data.grow : 1;
            shrinkSum += layoutItem ? layoutItem.data.shrink : 1;
            crossSize = itemData.sizeCross > crossSize ? itemData.sizeCross : crossSize;
        }
        if (targets.length > 0) {
            lines.push({ targets: targets, sizeSum: sizeSum, growSum: growSum, shrinkSum: shrinkSum, crossSize: crossSize });
            crossSizeSum += crossSize;
        }

        if (lines.length == 0) {
            return;
        }
        crossSizeSum += this.data.spacing * (lines.length - 1);
        let containerPivotCross = isVertical ? containerRect.data.pivotX : containerRect.data.pivotY;
        let crossOffset = -containerPivotCross * containerSize[1];
        let crossStretch = 0;
        let p = (isVertical ? ((containerRect.data.pivotY - 1) * h) : (-containerRect.data.pivotX * w)) + this.data.padding;
        if (this.data.alignItems == "end") {
            crossOffset += containerSize[1] - crossSizeSum;
        } else if (this.data.alignItems == "center") {
            crossOffset += (containerSize[1] - crossSizeSum) / 2;
        } else if (this.data.alignItems == "stretch" || this.data.alignItems == "none") {
            crossStretch = (containerSize[1] - crossSizeSum) / lines.length;
        }
        lines.forEach(l => {
            containerSize[1] = l.crossSize + crossStretch;
            this._layoutLine(l.targets, l.sizeSum, l.growSum, l.shrinkSum, isVertical, containerSize, p, crossOffset, xymat);
            crossOffset += containerSize[1] + this.data.spacing;
        });
    },
    _layoutLine(targets, sizeSum, growSum, shrinkSum, isVertical, containerSize, p, crossOffset, xymat) {
        let mainAttr = isVertical ? "height" : "width";
        let crossAttr = isVertical ? "width" : "height";

        let spacing = this.data.spacing;
        let stretchFactor = 0;
        if (this.data.justifyItems === "center") {
            p += (containerSize[0] - sizeSum - spacing * targets.length) / 2;
        } else if (this.data.justifyItems === "end") {
            p += (containerSize[0] - sizeSum - spacing * targets.length);
        } else if (this.data.justifyItems === "stretch") {
            stretchFactor = containerSize[0] - sizeSum - spacing * (targets.length - 1);
            if (stretchFactor > 0) {
                stretchFactor = growSum > 0 ? stretchFactor / growSum : 0;
            } else {
                stretchFactor = shrinkSum > 0 ? stretchFactor / shrinkSum : 0;
            }
        } else if (this.data.justifyItems === "space-between") {
            spacing = (containerSize[0] - sizeSum) / (targets.length - 1);
        } else if (this.data.justifyItems === "space-around") {
            spacing = (containerSize[0] - sizeSum) / targets.length;
            p += spacing * 0.5;
        }

        for (var i = 0; i < targets.length; i++) {
            let itemData = targets[i];
            let item = itemData.el;
            let layoutItem = item.components.xyitem;
            let align = (layoutItem && layoutItem.data.align) || this.data.alignItems;
            let stretch = (layoutItem ? (stretchFactor > 0 ? layoutItem.data.grow : layoutItem.data.shrink) : 1) * stretchFactor;
            let szMain = itemData.sizeMain * itemData.scaleMain + stretch;
            let szCross = itemData.sizeCross;
            if (itemData.scaleMain > 0 && stretch != 0) {
                item.setAttribute(mainAttr, itemData.sizeMain + stretch / itemData.scaleMain);
            }
            if (itemData.scaleCross > 0 && align === "stretch") {
                szCross = containerSize[1];
                item.setAttribute(crossAttr, szCross / itemData.scaleCross);
            }
            let pos = item.getAttribute("position") || { x: 0, y: 0, z: 0 };
            let posMain = (p + itemData.pivotMain * szMain);
            let posCross = crossOffset + containerSize[1] * 0.5; // center
            if (align === "start" || align === "stretch") {
                posCross = crossOffset + itemData.pivotCross * szCross;
            } else if (align === "end") {
                posCross = crossOffset + containerSize[1] - (1 - itemData.pivotCross) * szCross;
            } else if (align === "center") {
                posCross += (itemData.pivotCross - 0.5) * szCross;
            } else if (align === "none") {
                posCross += xymat[1] * pos.x + xymat[3] * pos.y;
            }
            pos.x = xymat[0] * posMain + xymat[1] * posCross;
            pos.y = xymat[2] * posMain + xymat[3] * posCross;
            item.setAttribute("position", pos);
            p += szMain + spacing;
        }
    },
    requestLayoutUpdate() {
        let xyrect = this.el.components.xyrect;
        this.data && this._doLayout(xyrect.width, xyrect.height);
    }
});

AFRAME.registerComponent('xyitem', {
    schema: {
        align: { type: 'string', default: "none", oneOf: ['none', 'center', 'start', 'end', 'baseline', 'stretch'] },
        grow: { type: 'number', default: 1 },
        shrink: { type: 'number', default: 1 },
        fixed: { type: 'boolean', default: false }
    },
    update(oldData) {
        if (oldData.align !== undefined && this.el.parent.components.xycontainer) {
            this.el.parent.components.xycontainer.requestLayoutUpdate();
        }
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
    init() {
        this.height = 0;
        this.width = 0;
    },
    update(oldData) {
        if (this.el.components.rounded || this.el.tagName == "A-INPUT") {
            // hack for a-frame-material
            this.data.pivotX = 0;
            this.data.pivotY = 1;
        }
        if (this.data.width >= 0) {
            this.width = this.data.width;
        } else if (this.el.hasAttribute("width")) {
            this.width = this.el.getAttribute("width") * 1;
        }
        if (this.data.height >= 0) {
            this.height = this.data.height;
        } else if (this.el.hasAttribute("height")) {
            this.height = this.el.getAttribute("height") * 1;
        }
        if (oldData.width !== undefined) {
            this.el.dispatchEvent(new CustomEvent('xyresize', { detail: { xyrect: this } }));
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
    init() {
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
    update() {
        this.clippingPlanes = [];
        this.clippingPlanesLocal = [];
        let rect = this.el.components.xyrect;
        if (this.data.clipBottom) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
        if (this.data.clipTop) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), rect.height));
        if (this.data.clipLeft) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
        if (this.data.clipRight) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), rect.width));
        this.updateMatrix();
    },
    remove() {
        this.filterTargets.forEach(t => this.el.removeEventListener(t, this._filterEvent, true));
        this.clippingPlanes = [];
        this.applyClippings();
    },
    tick() {
        if (!this.el.object3D.matrixWorld.equals(this.currentMatrix)) {
            this.updateMatrix();
        }
    },
    _filterEvent(ev) {
        if (!(ev.path || ev.composedPath()).includes(this.data.exclude)) {
            if (ev.detail.intersection && this.isClipped(ev.detail.intersection.point)) {
                ev.stopPropagation();
                if (ev.detail.cursorEl && ev.detail.cursorEl.components.raycaster) {
                    let targets = ev.detail.cursorEl.components.raycaster.intersectedEls;
                    let c = targets.lastIndexOf(ev.target);
                    if (c >= 0 && c + 1 < targets.length) {
                        targets[c + 1].dispatchEvent(new CustomEvent(ev.type, ev));
                    }
                }
            }
        }
    },
    updateMatrix() {
        this.currentMatrix = this.el.object3D.matrixWorld.clone();
        for (var i = 0; i < this.clippingPlanesLocal.length; i++) {
            this.clippingPlanes[i] = this.clippingPlanesLocal[i].clone().applyMatrix4(this.currentMatrix);
        }
        this.applyClippings();
    },
    applyClippings() {
        let excludeObj = this.exclude.object3D;
        let setCliping = (obj) => {
            if (obj === excludeObj) return;
            if (obj.material && obj.material.clippingPlanes !== undefined) {
                obj.material.clippingPlanes = this.clippingPlanes;
            }
            for (var i = 0; i < obj.children.length; i++) {
                setCliping(obj.children[i]);
            }
        };
        setCliping(this.el.object3D);
    },
    isClipped(p) {
        return this.clippingPlanes.some(plane => plane.distanceToPoint(p) < 0);
    }
});

AFRAME.registerPrimitive('a-xylayout', {
    defaultComponents: {
        xyrect: {},
        xycontainer: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        direction: 'xycontainer.direction',
        spacing: 'xycontainer.spacing',
        padding: 'xycontainer.padding',
        reverse: 'xycontainer.reverse',
        wrap: 'xycontainer.wrap',
        "align-items": 'xycontainer.alignItems',
        "justify-items": 'xycontainer.justifyItems'
    }
});
