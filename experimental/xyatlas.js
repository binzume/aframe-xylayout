// @ts-check
'use strict';

class XYSprite {
    constructor(atlas, x, y, w, h) {
        this.atlas = atlas;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    /**
     * @param {THREE.BufferGeometry} geom 
     */
    applyUV(geom) {
        let uv = geom.attributes.uv;
        for (let j = 0; j < uv.count; j++) {
            uv.setY(j, uv.getY(j) * this.h + this.y);
            uv.setX(j, uv.getX(j) * this.w + this.x);
        }
    }
    ctx2D(clip) {
        let ctx = this.atlas._canvasCtx;
        return ctx;
    }
    dispose() {
        this.atlas.release(this);
    }
}

class CanvasAtlas {
    constructor() {
        this._canvas = document.createElement('canvas');
        this._canvasCtx = this._canvas.getContext('2d');
        this.padding = 2;
    }

    alloc(w, h) {

    }

}
