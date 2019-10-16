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
        if (!data || data.direction === "none") {
            return;
        }
        let isVertical = data.direction === "vertical" || data.direction === "column";
        let padding = data.padding;
        let spacing = data.spacing;
        let mainDir = (data.reverse ^ isVertical) ? -1 : 1;
        let xymat = isVertical ? [0, 1, mainDir, 0] : [mainDir, 0, 0, -1]; // [main,corss] to [x,y]
        let xyToMainCross = isVertical ? (x, y) => [y, x] : (x, y) => [x, y];
        let containerSize = xyToMainCross(containerRect.width - padding * 2, containerRect.height - padding * 2);
        let attrNames = xyToMainCross("width", "height");

        // lines
        let mainSize = 0;
        let crossSizeSum = 0;
        let lines = [];
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
                width: (el.getAttribute("width") || undefined) * 1,
                height: (el.getAttribute("height") || undefined) * 1
            };
            let childScale = el.getAttribute("scale") || { x: 1, y: 1 };
            let itemData = {
                el: el,
                xyitem: xyitem,
                size: xyToMainCross(rect.width, rect.height),
                pivot: xyToMainCross(rect.data ? rect.data.pivotX : 0.5, rect.data ? rect.data.pivotY : 0.5),
                scale: xyToMainCross(childScale.x, childScale.y)
            };
            if (itemData.size[0] == null || isNaN(itemData.size[0])) {
                continue;
            }
            let sz = itemData.size[0] * itemData.scale[0];
            let contentSize = sizeSum + sz + spacing * targets.length;
            if (data.wrap == "wrap" && sizeSum > 0 && contentSize > containerSize[0]) {
                newLine();
            }
            targets.push(itemData);
            sizeSum += sz;
            growSum += xyitem ? xyitem.grow : 1;
            shrinkSum += xyitem ? xyitem.shrink : 1;
            crossSize = itemData.size[1] > crossSize ? itemData.size[1] : crossSize;
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
        for (let [targets, sizeSum, growSum, shrinkSum, crossSize] of lines) {
            this._layoutLine(targets, sizeSum, growSum, shrinkSum, mainOffset, crossOffset,
                containerSize[0], crossSize + crossStretch, xymat, attrNames);
            crossOffset += crossSize + crossStretch + spacing;
        }
    },
    _layoutLine(targets, sizeSum, growSum, shrinkSum, p, crossOffset, containerSize0, containerSize1, xymat, attrNames) {
        let { justifyItems, alignItems, spacing } = this.data;
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
            p += spacing * 0.5;
        }

        for (let itemData of targets) {
            let el = itemData.el;
            let xyitem = itemData.xyitem;
            let [pivot0, pivot1] = itemData.pivot;
            let [scale0, scale1] = itemData.scale;
            let [size0, size1] = itemData.size;
            let align = (xyitem && xyitem.align) || alignItems;
            let stretch = (xyitem ? (stretchFactor > 0 ? xyitem.grow : xyitem.shrink) : 1) * stretchFactor;
            let szMain = size0 * scale0 + stretch;
            let posMain = (p + pivot0 * szMain);
            let posCross = crossOffset + containerSize1 * 0.5; // center
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
            } else if (align === "none") {
                posCross += xymat[1] * pos.x + xymat[3] * pos.y;
            }
            pos.x = xymat[0] * posMain + xymat[1] * posCross;
            pos.y = xymat[2] * posMain + xymat[3] * posCross;
            el.setAttribute("position", pos);
            p += szMain + spacing;
        }
    },
    requestLayout() {
        this._layout(this.el.components.xyrect, this.el.children);
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
        if (oldData.align !== undefined) {
            let xycontainer = this.el.parent.components.xycontainer;
            if (xycontainer) {
                xycontainer.requestLayout();
            }
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
        let el = this.el;
        let { width, height } = this.data;
        let geometry = el.getAttribute("geometry") || {};
        this.width = width < 0 ? (el.getAttribute("width") || geometry.width || 0) * 1 : width;
        this.height = height < 0 ? (el.getAttribute("height") || geometry.height || 0) * 1 : height;

        if (oldData.width !== undefined) {
            el.emit('xyresize', { xyrect: this }, false);
        }
    }
});

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
        "justify-items": 'xycontainer.justifyItems'
    }
});
