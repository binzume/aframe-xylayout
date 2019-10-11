"use strict";

if (typeof AFRAME === 'undefined') {
    throw 'AFRAME is not loaded.';
}

AFRAME.registerComponent('xycontainer', {
    dependencies: ['xyrect'],
    schema: {
        spacing: { default: 0.05 },
        padding: { default: 0 },
        reverse: { default: false },
        wrap: { default: "nowrap", oneOf: ['wrap', 'nowrap'] },
        direction: { default: "column", oneOf: ['none', 'row', 'column', 'vertical', 'horizontal'] },
        alignItems: { default: "none", oneOf: ['none', 'center', 'start', 'end', 'baseline', 'stretch'] },
        justifyItems: { default: "start", oneOf: ['center', 'start', 'end', 'space-between', 'space-around', 'stretch'] },
        alignContent: { default: "", oneOf: ['', 'none', 'start', 'end', 'center', 'stretch'] }
    },
    init() {
        this.el.addEventListener('xyresize', ev => this.requestLayout());
        this.requestLayout();
    },
    _layout(containerRect, children) {
        let data = this.data;
        if (data.direction === "none") {
            return;
        }
        let isVertical = data.direction === "vertical" || data.direction === "column";
        let mainDir = (data.reverse ^ isVertical) ? -1 : 1;
        let xymat = isVertical ? [0, 1, mainDir, 0] : [mainDir, 0, 0, -1]; // [main,corss] to [x,y]
        let xyToMainCross = isVertical ? (x, y) => [y, x] : (x, y) => [x, y];
        let containerSize = xyToMainCross(containerRect.width - data.padding * 2, containerRect.height - data.padding * 2);
        let attrNames = xyToMainCross("width", "height");

        // lines
        let targets = [];
        let sizeSum = 0;
        let growSum = 0;
        let shrinkSum = 0;
        let crossSize = 0;
        let crossSizeSum = 0;
        let mainSize = 0;
        let lines = [];
        for (let i = 0; i < children.length; i++) {
            let el = children[i];
            let layoutItem = el.getAttribute('xyitem');
            if (layoutItem && layoutItem.fixed) {
                continue;
            }
            let rect = el.components.xyrect || el.getAttribute("geometry") || {
                width: el.getAttribute("width"),
                height: el.getAttribute("height")
            };
            let childScale = el.getAttribute("scale") || { x: 1, y: 1 };
            let itemData = {
                el: el,
                size: xyToMainCross(rect.width, rect.height),
                pivot: xyToMainCross(rect.data ? rect.data.pivotX : 0.5, rect.data ? rect.data.pivotY : 0.5),
                scale: xyToMainCross(childScale.x, childScale.y)
            };
            if (itemData.size[0] == null || isNaN(itemData.size[0])) {
                continue;
            }
            let sz = sizeSum + itemData.size[0] * itemData.scale[0] + data.spacing * targets.length;
            if (data.wrap == "wrap" && sizeSum > 0 && sz > containerSize[0]) {
                lines.push({ targets: targets, sizeSum: sizeSum, growSum: growSum, shrinkSum: shrinkSum, crossSize: crossSize });
                crossSizeSum += crossSize;
                mainSize = Math.max(mainSize, sizeSum + data.spacing * (lines.length - 1));
                targets = [];
                sizeSum = 0;
                growSum = 0;
                shrinkSum = 0;
                crossSize = 0;
            }
            targets.push(itemData);
            sizeSum += itemData.size[0] * itemData.scale[0];
            growSum += layoutItem ? layoutItem.grow : 1;
            shrinkSum += layoutItem ? layoutItem.shrink : 1;
            crossSize = itemData.size[1] > crossSize ? itemData.size[1] : crossSize;
        }
        if (targets.length > 0) {
            lines.push({ targets: targets, sizeSum: sizeSum, growSum: growSum, shrinkSum: shrinkSum, crossSize: crossSize });
            mainSize = Math.max(mainSize, sizeSum + data.spacing * (lines.length - 1));
            crossSizeSum += crossSize;
        }

        crossSizeSum += data.spacing * (lines.length - 1);
        if (containerRect.data[attrNames[0]] == -1) {
            containerSize[0] = mainSize;
            containerRect[attrNames[0]] = mainSize + data.padding * 2;
        }
        if (containerRect.data[attrNames[1]] == -1) {
            containerSize[1] = crossSizeSum;
            containerRect[attrNames[1]] = crossSizeSum + data.padding * 2;
        }
        let containerPivot = xyToMainCross(containerRect.data.pivotX, containerRect.data.pivotY);
        let crossOffset = -containerPivot[1] * containerSize[1];
        let mainOffset = -(isVertical ? 1 - containerPivot[0] : containerPivot[0]) * containerSize[0];
        let crossStretch = 0;
        let alignContent = data.alignContent || data.alignItems;
        if (alignContent == "end") {
            crossOffset += containerSize[1] - crossSizeSum;
        } else if (alignContent == "center") {
            crossOffset += (containerSize[1] - crossSizeSum) / 2;
        } else if (alignContent == "stretch" || alignContent == "none") {
            crossStretch = (containerSize[1] - crossSizeSum) / lines.length;
        }
        lines.forEach(l => {
            containerSize[1] = l.crossSize + crossStretch;
            this._layoutLine(l.targets, l.sizeSum, l.growSum, l.shrinkSum, containerSize, mainOffset, crossOffset, xymat, attrNames);
            crossOffset += containerSize[1] + data.spacing;
        });
    },
    _layoutLine(targets, sizeSum, growSum, shrinkSum, containerSize, p, crossOffset, xymat, attrNames) {
        let spacing = this.data.spacing;
        let stretchFactor = 0;
        let justify = this.data.justifyItems;
        if (justify === "center") {
            p += (containerSize[0] - sizeSum - spacing * targets.length) / 2;
        } else if (justify === "end") {
            p += (containerSize[0] - sizeSum - spacing * targets.length);
        } else if (justify === "stretch") {
            stretchFactor = containerSize[0] - sizeSum - spacing * (targets.length - 1);
            if (stretchFactor > 0) {
                stretchFactor = growSum > 0 ? stretchFactor / growSum : 0;
            } else {
                stretchFactor = shrinkSum > 0 ? stretchFactor / shrinkSum : 0;
            }
        } else if (justify === "space-between") {
            spacing = (containerSize[0] - sizeSum) / (targets.length - 1);
        } else if (justify === "space-around") {
            spacing = (containerSize[0] - sizeSum) / targets.length;
            p += spacing * 0.5;
        }

        for (let i = 0; i < targets.length; i++) {
            let itemData = targets[i];
            let item = itemData.el;
            let layoutItem = item.getAttribute('xyitem');
            let align = (layoutItem && layoutItem.align) || this.data.alignItems;
            let stretch = (layoutItem ? (stretchFactor > 0 ? layoutItem.grow : layoutItem.shrink) : 1) * stretchFactor;
            let szMain = itemData.size[0] * itemData.scale[0] + stretch;
            let szCross = itemData.size[1];
            let pos = item.getAttribute("position") || { x: 0, y: 0, z: 0 };
            let posMain = (p + itemData.pivot[0] * szMain);
            let posCross = crossOffset + containerSize[1] * 0.5; // center
            if (itemData.scale[0] > 0 && stretch != 0) {
                item.setAttribute(attrNames[0], itemData.size[0] + stretch / itemData.scale[0]);
            }
            if (itemData.scale[1] > 0 && align === "stretch") {
                szCross = containerSize[1];
                item.setAttribute(attrNames[1], szCross / itemData.scale[1]);
            }
            if (align === "start" || align === "stretch") {
                posCross = crossOffset + itemData.pivot[1] * szCross;
            } else if (align === "end") {
                posCross = crossOffset + containerSize[1] - (1 - itemData.pivot[1]) * szCross;
            } else if (align === "center") {
                posCross += (itemData.pivot[1] - 0.5) * szCross;
            } else if (align === "none") {
                posCross += xymat[1] * pos.x + xymat[3] * pos.y;
            }
            pos.x = xymat[0] * posMain + xymat[1] * posCross;
            pos.y = xymat[2] * posMain + xymat[3] * posCross;
            item.setAttribute("position", pos);
            p += szMain + spacing;
        }
    },
    requestLayout() {
        this.data && this._layout(this.el.components.xyrect, this.el.children);
    }
});

AFRAME.registerComponent('xyitem', {
    schema: {
        align: { default: "none", oneOf: ['none', 'center', 'start', 'end', 'baseline', 'stretch'] },
        grow: { default: 1 },
        shrink: { default: 1 },
        fixed: { default: false }
    },
    update(oldData) {
        if (oldData.align !== undefined && this.el.parent.components.xycontainer) {
            this.el.parent.components.xycontainer.requestLayout();
        }
    }
});

AFRAME.registerComponent('xyrect', {
    schema: {
        width: { default: -1 }, // -1 : auto
        height: { default: -1 },
        pivotX: { default: 0.5 },
        pivotY: { default: 0.5 }
    },
    update(oldData) {
        let data = this.data;
        let geometry = this.el.getAttribute("geometry") || {};
        let w = data.width, h = data.height;
        if (w < 0) {
            w = this.el.hasAttribute("width") ? this.el.getAttribute("width") * 1 : geometry.width || 0;
            // w = geometry ? geometry.width : this.el.getAttribute("width") * 1 || 0;
        }
        if (h < 0) {
            h = this.el.hasAttribute("height") ? this.el.getAttribute("height") * 1 : geometry.height || 0;
            // h = geometry ? geometry.height : this.el.getAttribute("height") * 1 || 0;
        }
        this.width = w;
        this.height = h;

        if (this.el.components.rounded || this.el.tagName == "A-INPUT") {
            // hack for a-frame-material
            data.pivotX = 0;
            data.pivotY = 1;
        }

        if (oldData.width !== undefined) {
            this.el.emit('xyresize', { xyrect: this }, false);
        }
    }
});

AFRAME.registerComponent('xyclipping', {
    dependencies: ['xyrect'],
    schema: {
        exclude: { type: 'selector', default: null },
        clipTop: { default: true },
        clipBottom: { default: true },
        clipLeft: { default: false },
        clipRight: { default: false }
    },
    init() {
        this.el.sceneEl.renderer.localClippingEnabled = true;
        this.clippingPlanesLocal = [];
        this.clippingPlanes = [];
        this.currentMatrix = null;
        this._filterEvent = this._filterEvent.bind(this);
        this.filterTargets = ['click', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove'];
        this.filterTargets.forEach(t => this.el.addEventListener(t, this._filterEvent, true));
    },
    update() {
        let rect = this.el.components.xyrect;
        let planes = [];
        if (this.data.clipBottom) planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
        if (this.data.clipTop) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), rect.height));
        if (this.data.clipLeft) planes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
        if (this.data.clipRight) planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), rect.width));
        this.clippingPlanesLocal = planes;
        this.clippingPlanes = [];
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
        for (let i = 0; i < this.clippingPlanesLocal.length; i++) {
            this.clippingPlanes[i] = this.clippingPlanesLocal[i].clone().applyMatrix4(this.currentMatrix);
        }
        this.applyClippings();
    },
    applyClippings() {
        let excludeObj = this.data.exclude && this.data.exclude.object3D;
        let setCliping = (obj) => {
            if (obj === excludeObj) return;
            if (obj.material && obj.material.clippingPlanes !== undefined) {
                obj.material.clippingPlanes = this.clippingPlanes;
            }
            for (let i = 0; i < obj.children.length; i++) {
                setCliping(obj.children[i]);
            }
        };
        setCliping(this.el.object3D);
    },
    isClipped(p) {
        return this.clippingPlanes.some(plane => plane.distanceToPoint(p) < 0);
    }
});

(function () {
    let schema = {
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
    };
    AFRAME.registerPrimitive('a-xycontainer', schema);
    AFRAME.registerPrimitive('a-xylayout', schema); // deprecated
})();
