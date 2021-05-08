"use strict";

AFRAME.registerComponent('xycontainer', {
    dependencies: ['xyrect'],
    schema: {
        spacing: { default: 0.0 },
        padding: { default: 0 },
        reverse: { default: false },
        wrap: { default: "nowrap", oneOf: ['wrap', 'nowrap'] },
        direction: { default: "column", oneOf: ['none', 'row', 'column', 'vertical', 'horizontal'] },
        alignItems: { default: "none", oneOf: ['none', 'center', 'start', 'end', 'baseline', 'stretch'] },
        justifyItems: { default: "start", oneOf: ['center', 'start', 'end', 'space-between', 'space-around', 'stretch'] },
        alignContent: { default: "", oneOf: ['', 'none', 'start', 'end', 'center', 'stretch'] }
    },
    init() {
        this.el.addEventListener('xyresize', (ev) => this.update());
    },
    update() {
        let data = this.data;
        let direction = data.direction;
        if (direction == "none") {
            return;
        }
        let containerRect = this.el.components.xyrect, children = /** @type {Iterable<AFRAME.AEntity>} */ (this.el.children);
        let isVertical = direction == "vertical" || direction == "column";
        let padding = data.padding;
        let spacing = data.spacing;
        let mainDir = (data.reverse != isVertical) ? -1 : 1;
        let xymat = isVertical ? [0, 1, mainDir, 0] : [mainDir, 0, 0, -1]; // [main,corss] to [x,y]
        let xyToMainCross = isVertical ? (x, y) => [y, x] : (x, y) => [x, y];
        let containerSize = xyToMainCross(containerRect.width - padding * 2, containerRect.height - padding * 2);
        let attrNames = xyToMainCross("width", "height");

        // lines
        let mainSize = 0;
        let crossSizeSum = 0;
        let lines = [];
        /** @type {[el:AFRAME.AEntity, xyitem: any, size: number[], pivot: number[], scale:number[]][]} */
        let targets = [];
        let sizeSum = 0;
        let growSum = 0;
        let shrinkSum = 0;
        let crossSize = 0;
        let newLine = () => {
            mainSize = Math.max(mainSize, sizeSum + spacing * (targets.length - 1));
            crossSizeSum += crossSize;
            lines.push([targets, sizeSum, growSum, shrinkSum, crossSize]);
            targets = [];
            sizeSum = 0;
            growSum = 0;
            shrinkSum = 0;
            crossSize = 0;
        };
        for (let el of children) {
            let xyitem = el.getAttribute('xyitem');
            if (xyitem && xyitem.fixed) {
                continue;
            }
            let rect = el.components.xyrect || el.getAttribute("geometry") || {
                width: +(el.getAttribute("width") || NaN),
                height: +(el.getAttribute("height") || NaN)
            };
            let childScale = /** @type {{x:number, y:number}} */ (el.getAttribute("scale") || { x: 1, y: 1 });
            let scale = xyToMainCross(childScale.x, childScale.y);
            let pivot = rect.data ? rect.data.pivot : { x: 0.5, y: 0.5 };
            let size = xyToMainCross(rect.width, rect.height);
            if (size[0] == null || isNaN(size[0])) {
                continue;
            }
            let sz = size[0] * scale[0];
            let contentSize = sizeSum + sz + spacing * targets.length;
            if (data.wrap == "wrap" && sizeSum > 0 && contentSize > containerSize[0]) {
                newLine();
            }
            targets.push([
                el,
                xyitem,
                size,
                xyToMainCross(pivot.x, pivot.y),
                scale,
            ]);
            sizeSum += sz;
            growSum += xyitem ? xyitem.grow : 1;
            shrinkSum += xyitem ? xyitem.shrink : 1;
            crossSize = size[1] > crossSize ? size[1] : crossSize;
        }
        if (targets.length > 0) {
            newLine();
        }

        crossSizeSum += spacing * (lines.length - 1);
        if (containerRect.data[attrNames[0]] == -1) {
            containerSize[0] = mainSize;
            containerRect[attrNames[0]] = mainSize + padding * 2;
        }
        if (containerRect.data[attrNames[1]] == -1) {
            containerSize[1] = crossSizeSum;
            containerRect[attrNames[1]] = crossSizeSum + padding * 2;
        }
        let crossOffset = - containerSize[1] / 2;
        let mainOffset = - containerSize[0] / 2;
        let crossStretch = 0;
        let alignContent = data.alignContent || data.alignItems;
        if (alignContent == "end") {
            crossOffset += containerSize[1] - crossSizeSum;
        } else if (alignContent == "center") {
            crossOffset += (containerSize[1] - crossSizeSum) / 2;
        } else if (alignContent == "stretch" || alignContent == "none") {
            crossStretch = (containerSize[1] - crossSizeSum) / lines.length;
        }
        for (let [targets, sizeSum, growSum, shrinkSum, crossSize] of lines) {
            this._layoutLine(targets, sizeSum, growSum, shrinkSum, mainOffset, crossOffset,
                containerSize[0], crossSize + crossStretch, xymat, attrNames);
            crossOffset += crossSize + crossStretch + spacing;
        }
    },
    /**
     * @param {[el:import("aframe").Entity, xyitem: any, size: number[], pivot: number[], scale:number[]][]} targets
     * @param {number} sizeSum
     * @param {number} growSum
     * @param {number} shrinkSum
     * @param {number} p
     * @param {number} crossOffset
     * @param {number} containerSize0
     * @param {number} containerSize1
     * @param {number[]} xymat
     * @param {string[]} attrNames
     */
    _layoutLine(targets, sizeSum, growSum, shrinkSum, p, crossOffset, containerSize0, containerSize1, xymat, attrNames) {
        let { justifyItems, alignItems, spacing, wrap } = this.data;
        let stretchFactor = 0;
        let numTarget = targets.length;
        if (justifyItems === "center") {
            p += (containerSize0 - sizeSum - spacing * numTarget) / 2;
        } else if (justifyItems === "end") {
            p += (containerSize0 - sizeSum - spacing * numTarget);
        } else if (justifyItems === "stretch") {
            stretchFactor = containerSize0 - sizeSum - spacing * (numTarget - 1);
            if (stretchFactor > 0) {
                stretchFactor = growSum > 0 ? stretchFactor / growSum : 0;
            } else {
                stretchFactor = shrinkSum > 0 ? stretchFactor / shrinkSum : 0;
            }
        } else if (justifyItems === "space-between") {
            spacing = (containerSize0 - sizeSum) / (numTarget - 1);
        } else if (justifyItems === "space-around") {
            spacing = (containerSize0 - sizeSum) / numTarget;
            p += spacing / 2;
        }

        for (let [el, xyitem, size, pivot, scale] of targets) {
            let [pivot0, pivot1] = pivot;
            let [scale0, scale1] = scale;
            let [size0, size1] = size;
            let align = (xyitem && xyitem.align) || alignItems;
            let stretch = (xyitem ? (stretchFactor > 0 ? xyitem.grow : xyitem.shrink) : 1) * stretchFactor;
            let szMain = size0 * scale0 + stretch;
            let posMain = (p + pivot0 * szMain);
            let posCross = crossOffset + containerSize1 / 2; // center
            let pos = el.getAttribute("position") || { x: 0, y: 0, z: 0 };
            if (scale0 > 0 && stretch != 0) {
                el.setAttribute(attrNames[0], size0 + stretch / scale0);
            }
            if (scale1 > 0 && align === "stretch") {
                size1 = containerSize1;
                el.setAttribute(attrNames[1], size1 / scale1);
            }
            if (align === "start" || align === "stretch") {
                posCross = crossOffset + pivot1 * size1;
            } else if (align === "end") {
                posCross = crossOffset + containerSize1 - (1 - pivot1) * size1;
            } else if (align === "center") {
                posCross += (pivot1 - 0.5) * size1;
            } else if (align === "none" && wrap != 'wrap') {
                // Keep original cross position if nowrap.
                posCross += xymat[1] * pos.x + xymat[3] * pos.y;
            }
            pos.x = xymat[0] * posMain + xymat[1] * posCross;
            pos.y = xymat[2] * posMain + xymat[3] * posCross;
            el.setAttribute("position", pos);
            p += szMain + spacing;
        }
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
        if (oldData.align) {
            let xycontainer = /** @type {AFRAME.AEntity} */ (this.el.parentNode).components.xycontainer;
            if (xycontainer) {
                xycontainer.update();
            }
        }
    }
});

AFRAME.registerComponent('xyrect', /** @type {import("aframe").ComponentDefinition<Partial<{width: number, height: number}>>} */({
    schema: {
        width: { default: -1 }, // -1 : auto
        height: { default: -1 },
        pivot: { type: 'vec2', default: { x: 0.5, y: 0.5 } },
    },
    update(oldData) {
        let el = this.el;
        let { width, height } = this.data;
        let geometry = el.getAttribute("geometry") || {};
        this.width = width < 0 ? +(el.getAttribute("width") || geometry.width || 0) : width;
        this.height = height < 0 ? +(el.getAttribute("height") || geometry.height || 0) : height;
        if (oldData.width !== undefined) {
            el.emit('xyresize', { xyrect: this }, false);
        }
    }
}));

AFRAME.registerPrimitive('a-xycontainer', {
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
        "justify-items": 'xycontainer.justifyItems',
        "align-content": 'xycontainer.alignContent',
    }
});
