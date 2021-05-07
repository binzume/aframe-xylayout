// @ts-check
'use strict';


AFRAME.registerGeometry('xy-resize-corner', {
	schema: {
		size: { default: 0.4, min: 0 },
	},
	init(data) {
		const points = [
			new THREE.Vector3(-data.size, 0, 0),
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(0, data.size, 0),
		];
		this.geometry = new THREE.BufferGeometry().setFromPoints(points);
	}
});


AFRAME.registerComponent('xyresize', {
	dependencies: ['xyrect'],
	schema: {
		color: { default: 'white' },
		minWidth: { default: 1 },
		minHeight: { default: 1 },
		lineWidth: { default: 3 },
		visibleAlways: { default: false },
	},
	init() {
		let el = this.el, data = this.data;
		this._rect = el.components.xyrect;
		let resizerEl = this._resizerEl = el.appendChild(document.createElement('a-entity'));

		resizerEl.setAttribute('material', { shader: "flat", wireframe: true, wireframeLinewidth: data.lineWidth, color: data.color });
		resizerEl.setAttribute('geometry', { primitive: 'xy-resize-corner' });

		resizerEl.setAttribute('visible', data.visibleAlways);
		resizerEl.addEventListener('mouseenter', ev => {
			resizerEl.setAttribute('visible', true);
		});
		resizerEl.addEventListener('mouseleave', ev => {
			resizerEl.setAttribute('visible', data.visibleAlways);
		});

		resizerEl.setAttribute('xydraggable', { base: el });
		resizerEl.addEventListener('xy-drag', ev => {
			resizerEl.setAttribute('position', { x: ev.detail.point.x, y: ev.detail.point.y, z: 0.01 });
		});
		resizerEl.addEventListener('xy-dragend', ev => {
			let w = Math.max(ev.detail.point.x + this._rect.width / 2, data.minWidth);
			let h = Math.max(-ev.detail.point.y + this._rect.height / 2, data.minHeight);
			let dw = w - this._rect.width;
			let dh = h - this._rect.height;
			el.setAttribute('xyrect', { width: w, height: h });
			el.object3D.position.add(new THREE.Vector3(dw / 2, -dh / 2, 0).multiply(el.object3D.scale));
		});

		this._onResized = this._onResized.bind(this);
		el.addEventListener('xyresize', this._onResized);
	},
	update() {
		this._onResized();
	},
	_onResized() {
		let d = 0.1;
		let r = this._rect;
		this._resizerEl.setAttribute('position', { x: r.width / 2 + d, y: -r.height / 2 - d, z: 0.01 });
	},
	remove() {
		this.el.removeEventListener('xyresize', this._onResized);
		this.el.removeChild(this._resizerEl);
	}
});
