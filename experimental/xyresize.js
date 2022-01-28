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
		let resizerEl = this._resizerEl = el.appendChild(document.createElement('a-entity'));

		resizerEl.setAttribute('xyitem', { fixed: true });
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
		/**
		 * @type {THREE.LineLoop}
		 */
		let rectObj = null;
		resizerEl.addEventListener('xy-drag', ev => {
			if (!rectObj) {
				const material = new THREE.LineBasicMaterial({ color: 0x8888ff });
				const points = [
					new THREE.Vector3(-0.5, -0.5, 0),
					new THREE.Vector3(-0.5, 0.5, 0),
					new THREE.Vector3(0.5, 0.5, 0),
					new THREE.Vector3(0.5, -0.5, 0),
				];
				rectObj = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
				el.setObject3D('resizing', rectObj);
			}
			let w = Math.max(ev.detail.point.x * 2, data.minWidth);
			let h = Math.max(-ev.detail.point.y * 2, data.minHeight);
			rectObj.scale.set(w, h, 1);
			resizerEl.setAttribute('position', { x: ev.detail.point.x, y: ev.detail.point.y, z: 0.01 });
		});
		resizerEl.addEventListener('xy-dragend', ev => {
			if (rectObj) {
				el.removeObject3D('resizing');
				rectObj.geometry.dispose();
				if (rectObj.material instanceof THREE.Material) {
					rectObj.material.dispose();
				}
			}
			rectObj = null;
			let w = Math.max(ev.detail.point.x * 2, data.minWidth);
			let h = Math.max(-ev.detail.point.y * 2, data.minHeight);
			el.setAttribute('xyrect', { width: w, height: h });
		});

		this._onResized = this._onResized.bind(this);
		el.addEventListener('xyresize', this._onResized);
	},
	update() {
		this._onResized();
	},
	_onResized() {
		let d = 0.2;
		let rect = this.el.components.xyrect;
		this._resizerEl.setAttribute('position', { x: rect.width / 2 + d, y: -rect.height / 2 - d, z: 0.01 });
	},
	remove() {
		this.el.removeEventListener('xyresize', this._onResized);
		this.el.removeChild(this._resizerEl);
	}
});
