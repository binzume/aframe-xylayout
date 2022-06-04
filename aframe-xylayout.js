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
        for (let e of ['child-attached', 'child-detached', 'xyresize']) {
            this.el.addEventListener(e, (ev) => ev.target == this.el && setTimeout(()=>this.update()));
        }
    },
    update() {
        let data = this.data;
        let direction = data.direction;
        if (direction == "none") {
            return;
        }
        let containerRect = this.el.components.xyrect;
        let children = /** @type {Iterable<AFRAME.AEntity>} */ (this.el.children);
        let isVertical = direction == "vertical" || direction == "column";
        let padding = data.padding;
        let spacing = data.spacing;
        let mainDir = (data.reverse != isVertical) ? -1 : 1;
        /** @type {(m: number, c: number) =>[number, number]} */
        let toXY = (m, c) => isVertical ? [c, m * mainDir] : [m * mainDir, -c];
        /** @type {<X,Y>(x: X, y: Y) =>[X|Y,X|Y]} */
        let xyToMainCross = (x, y) => isVertical ? [y, x] : [x, y];
        let [containerSizeM, containerSizeC] = xyToMainCross(containerRect.width - padding * 2, containerRect.height - padding * 2);
        let [attrNameM, attrNameC] = xyToMainCross("width", "height");

        // lines
        let mainSize = 0;
        let crossSizeSum = 0;
        /** @type {[el:AFRAME.AEntity, xyitem: any, size: number[], pivot: number[], scale:number[]][]} */
        let targets = [];
        /** @type {[typeof targets, number, number, number, number][]} */
        let lines = [];
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
            let size = xyToMainCross(rect.width * childScale.x, rect.height * childScale.y);
            let [sizeM, sizeC] = size;
            if (sizeM == null || isNaN(sizeM)) {
                continue;
            }
            let pivot = rect.data ? rect.data.pivot : { x: 0.5, y: 0.5 };
            let contentSize = sizeSum + sizeM + spacing * targets.length;
            if (data.wrap == "wrap" && sizeSum > 0 && contentSize > containerSizeM) {
                newLine();
            }
            targets.push([
                el,
                xyitem,
                size,
                xyToMainCross(pivot.x, pivot.y),
                xyToMainCross(childScale.x, childScale.y),
            ]);
            sizeSum += sizeM;
            growSum += xyitem ? xyitem.grow : 1;
            shrinkSum += xyitem ? xyitem.shrink : 1;
            crossSize = sizeC > crossSize ? sizeC : crossSize;
        }
        if (targets.length > 0) {
            newLine();
        }

        crossSizeSum += spacing * (lines.length - 1);
        if (containerRect.data[attrNameM] == -1) {
            containerSizeM = mainSize;
            containerRect[attrNameM] = mainSize + padding * 2;
        }
        if (containerRect.data[attrNameC] == -1) {
            containerSizeC = crossSizeSum;
            containerRect[attrNameC] = crossSizeSum + padding * 2;
        }
        let crossOffset = - containerSizeC / 2;
        let crossStretch = 0;
        let alignContent = data.alignContent || data.alignItems;
        if (alignContent == "end") {
            crossOffset += containerSizeC - crossSizeSum;
        } else if (alignContent == "center") {
            crossOffset += (containerSizeC - crossSizeSum) / 2;
        } else if (alignContent == "stretch" || alignContent == "none") {
            crossStretch = (containerSizeC - crossSizeSum) / lines.length;
        }
        for (let [targets, sizeSum, growSum, shrinkSum, crossSize] of lines) {
            this._layoutLine(targets, sizeSum, growSum, shrinkSum, - containerSizeM / 2, crossOffset,
                containerSizeM, crossSize + crossStretch, attrNameM, attrNameC, toXY);
            crossOffset += crossSize + crossStretch + spacing;
        }
    },
    /**
     * 
    /**
     * @param {[el:import("aframe").Entity, xyitem: any, size: number[], pivot: number[], scale:number[]][]} targets
     * @param {number} sizeSum
     * @param {number} growSum
     * @param {number} shrinkSum
     * @param {number} offset0
     * @param {number} offset1
     * @param {number} containerSize0
     * @param {number} containerSize1
     * @param {string} attrName0
     * @param {string} attrName1
     * @param {(m: number, c: number) => [number, number]} toXY
     */
    _layoutLine(targets, sizeSum, growSum, shrinkSum, offset0, offset1, containerSize0, containerSize1, attrName0, attrName1, toXY) {
        let { justifyItems, alignItems, spacing, wrap } = this.data;
        let stretchFactor = 0;
        let numTarget = targets.length;
        if (justifyItems === "center") {
            offset0 += (containerSize0 - sizeSum - spacing * numTarget) / 2;
        } else if (justifyItems === "end") {
            offset0 += (containerSize0 - sizeSum - spacing * numTarget);
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
            offset0 += spacing / 2;
        }

        for (let [el, xyitem, [size0, size1], [pivot0, pivot1], [scale0, scale1]] of targets) {
            let align = (xyitem && xyitem.align) || alignItems;
            let stretch = (xyitem ? (stretchFactor > 0 ? xyitem.grow : xyitem.shrink) : 1) * stretchFactor;
            let posCross = offset1 + containerSize1 / 2; // center
            let pos = el.getAttribute("position") || { x: 0, y: 0 };
            if (scale0 > 0 && stretch != 0) {
                size0 += stretch;
                el.setAttribute(attrName0, size0 / scale0);
            }
            if (scale1 > 0 && align === "stretch") {
                size1 = containerSize1;
                el.setAttribute(attrName1, size1 / scale1);
            }
            if (align === "start" || align === "stretch") {
                posCross = offset1 + pivot1 * size1;
            } else if (align === "end") {
                posCross = offset1 + containerSize1 - (1 - pivot1) * size1;
            } else if (align === "center") {
                posCross += (pivot1 - 0.5) * size1;
            } else if (align === "none" && wrap != 'wrap') {
                // Keep original cross position if nowrap.
                posCross = attrName1 == 'width' ? pos.x : -pos.y;
            }
            [pos.x, pos.y] = toXY(offset0 + size0 * pivot0, posCross);
            el.setAttribute("position", pos);
            offset0 += size0 + spacing;
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
