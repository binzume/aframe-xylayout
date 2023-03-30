

AFRAME.registerGeometry('css-rounded-rect', {
	schema: {
		height: { default: 1, min: 0 },
		width: { default: 1, min: 0 },
		radiusBL: { default: 0.05, min: 0 },
		radiusBR: { default: 0.05, min: 0 },
		radiusTL: { default: 0.05, min: 0 },
		radiusTR: { default: 0.05, min: 0 },
	},
	init(data) {
		let shape = new THREE.Shape();
		let w = (data.width || 0.01) / 2, h = (data.height || 0.01) / 2;
		shape.moveTo(-w, -h + data.radiusBL);
		shape.lineTo(-w, h - data.radiusTL);
		shape.quadraticCurveTo(-w, h, -w + data.radiusTL, h);
		shape.lineTo(w - data.radiusTR, h);
		shape.quadraticCurveTo(w, h, w, h - data.radiusTR);
		shape.lineTo(w, -h + data.radiusBR);
		shape.quadraticCurveTo(w, -h, w - data.radiusBR, -h);
		shape.lineTo(-w + data.radiusBL, -h);
		shape.quadraticCurveTo(-w, -h, -w, -h + data.radiusBL);
		// @ts-ignore
		this.geometry = new THREE.ShapeGeometry(shape);
	}
});

AFRAME.registerComponent('css-borderline', {
	schema: {
		height: { default: 1, min: 0 },
		width: { default: 1, min: 0 },
		color: { default: '' },
		linewidth: { default: 1, min: 0 },
		radiusBL: { default: 0.05, min: 0 },
		radiusBR: { default: 0.05, min: 0 },
		radiusTL: { default: 0.05, min: 0 },
		radiusTR: { default: 0.05, min: 0 },
	},
	update() {
		let data = this.data;
		let path = new THREE.Path();
		let w = (data.width || 0.01) / 2, h = (data.height || 0.01) / 2;
		path.moveTo(-w, -h + data.radiusBL);
		path.lineTo(-w, h - data.radiusTL);
		path.quadraticCurveTo(-w, h, -w + data.radiusTL, h);
		path.lineTo(w - data.radiusBR, h);
		path.quadraticCurveTo(w, h, w, h - data.radiusBR);
		path.lineTo(w, -h + data.radiusBR);
		path.quadraticCurveTo(w, -h, w - data.radiusBR, -h);
		path.lineTo(-w + data.radiusBL, -h);
		path.quadraticCurveTo(-w, -h, -w, -h + data.radiusBL);
		let geometry = new THREE.BufferGeometry().setFromPoints(path.getPoints());
		let material = new THREE.LineBasicMaterial({ linewidth: data.linewidth, color: data.color });
		let line = new THREE.Line(geometry, material);
		line.position.set(0, 0, 0.001);
		line.raycast = () => { }; // disable raycast
		this.el.setObject3D('css-borderline', line);
		this._disposeObj();
		this._line = line;
	},
	remove() {
		this.el.removeObject3D('css-borderline');
		this._disposeObj();
	},
	_line: null,
	_disposeObj() {
		if (this._line) {
			this._line.material.dispose();
			this._line.geometry.dispose();
			this._line = null;
		}
	}
});


AFRAME.registerComponent('css-style', {
	schema: {
		enabled: { default: true },
	},
	/** @type {MutationObserver} */
	_observer: null,
	_transformed: false,
	init() {
		let el = this.el;
		// let internals = el.attachInternals();
		let style = getComputedStyle(el);
		if (style.pointerEvents != 'none') {
			let cname = this._parseString(style.getPropertyValue('--collider-class')) || 'collidable';
			let hover = this._parseString(style.getPropertyValue('--hover-alt-class')) || '_hover';
			el.classList.add(cname);
			el.addEventListener('mouseenter', ev => {
				el.classList.add(hover);
			});
			el.addEventListener('mouseleave', ev => {
				el.classList.remove(hover);
			});
		}

		this._observer = new MutationObserver((mutationsList, _observer) => {
			if (mutationsList.find(r => r.attributeName == 'class' || r.attributeName == 'style')) {
				this._updateStyle();
			}
		});
		this._observer.observe(this.el, { attributes: true });

		this._updateStyle();
	},
	remove() {
		this._observer.disconnect();
	},
	_updateStyle() {
		let style = getComputedStyle(this.el);
		this._updateMaterial(style);
		this._updateText(style);
		this._updateSize(style);
		this.el.setAttribute('visible', style.getPropertyValue('--visibility') != 'hidden');
		if (this.el.childElementCount > 0) {
			this._updateLayout(style);
		} else {
			this.el.removeAttribute('xycontainer');
		}
		this._updateTransform(style);
	},
	/** @param {CSSStyleDeclaration} style */
	_updateMaterial(style) {
		// TODO check css-rounded-rect
		let bgcol = this._parseColor(style.backgroundColor);
		if (bgcol[3] > 0) {
			// TODO alpha
			this.el.setAttribute('material', 'color', style.backgroundColor);
		}
		let imageUrl = this._parseUrl(style.backgroundImage);
		if (imageUrl) {
			this.el.setAttribute('material', 'src', imageUrl);
		}
		if (this.el.components.xyinput) {
			let ccol = this._parseColor(style.caretColor);
			ccol[3] > 0 && this.el.setAttribute('xyinput', 'caretColor', style.caretColor);
		}
	},
	_updateText(style) {
		if (this.el.components.xyinput) {
			return;
		}
		let text = null;
		let first = this.el.firstChild
		if (first && first.nodeType == Node.TEXT_NODE) {
			text = first.textContent.trim();
		}
		if (!text) {
			let m = /^["'](.*)["']$/.exec(style.content);
			text = m ? m[1] : '';
		}
		if (text != null) {
			this.el.setAttribute('xylabel', 'value', text);
		}
		let c = this._parseColor(style.color);
		if (c[3] > 0) {
			this.el.setAttribute('xylabel', 'color', style.color);
		}
		let align = style.textAlign;
		if (align == 'start') {
			align = 'left';
		}
		if (align == 'end') {
			align = 'right';
		}
		if (align) {
			this.el.setAttribute('xylabel', 'align', align);
		}
	},
	/** @param {CSSStyleDeclaration} style 	 */
	_updateSize(style) {
		let w = this._parseSize(style.width, this.el.parentElement), h = this._parseSize(style.height, this.el.parentElement, true);
		if (w > 0 || h > 0) {
			this.el.setAttribute('xyrect', { width: w, height: h });
		}
		let fixed = style.position == 'fixed';
		let grow = parseInt(style.flexGrow), shrink = parseInt(style.flexShrink);
		if (fixed || grow || shrink) {
			this.el.setAttribute('xyitem', { fixed: fixed, grow: grow, shrink: shrink });
		}

		let bgcol = this._parseColor(style.backgroundColor);
		let bw = this._parseSizePx(style.borderWidth);
		if (bgcol[3] > 0 || bw > 0) {
			this.el.setAttribute('geometry', {
				primitive: 'css-rounded-rect', width: w, height: h,
				radiusBL: this._parseSize(style.borderBottomLeftRadius),
				radiusBR: this._parseSize(style.borderBottomRightRadius),
				radiusTL: this._parseSize(style.borderTopLeftRadius),
				radiusTR: this._parseSize(style.borderTopRightRadius)
			});
		}
		if (bw > 0) {
			this.el.setAttribute('css-borderline', {
				width: w, height: h, linewidth: bw,
				color: style.borderColor,
				radiusBL: this._parseSize(style.borderBottomLeftRadius),
				radiusBR: this._parseSize(style.borderBottomRightRadius),
				radiusTL: this._parseSize(style.borderTopLeftRadius),
				radiusTR: this._parseSize(style.borderTopRightRadius)
			});
		} else {
			this.el.removeAttribute('css-borderline');
		}
	},
	_updateLayout(style) {
		if (style.position == 'fixed') {
			this.el.setAttribute('xyitem', { fixed: true });
		}
		this.el.setAttribute('xycontainer', {
			wrap: style.flexWrap,
			direction: style.flexDirection,
			spacing: this._parseSize(style.columnGap),
			alignContent: style.alignContent,
			justifyItems: ['space-between', 'space-around'].includes(style.justifyContent) ? style.justifyContent : style.justifyItems,
			alignItems: style.alignItems,
		});
	},
	/** @param {CSSStyleDeclaration} style 	 */
	_updateTransform(style) {
		this._transformed ||= style.transform != 'none';
		if (this._transformed) {
			let t = new DOMMatrix(style.transform);
			let tr = new THREE.Vector3();
			let rot = new THREE.Quaternion();
			let sc = new THREE.Vector3();
			new THREE.Matrix4().set(
				t.m11, t.m21, t.m31, t.m41,
				t.m12, t.m22, t.m32, t.m42,
				t.m13, t.m23, t.m33, t.m43,
				t.m14, t.m24, t.m34, t.m44,
			).decompose(tr, rot, sc);
			this.el.object3D.quaternion.copy(rot);
			this.el.object3D.scale.copy(sc);
			this.el.object3D.position.setZ(tr.z * 2.54 / 96 / 10);
		}
	},
	/**
 * 
 * @param {string} s 
 * @param {Element} parent 
 * @param {boolean} v 
 * @returns {number}
 */
	_parseSizePx(s, parent = null, v = false) {
		if (s.endsWith('%') && parent) {
			// if "display: none"
			let style = getComputedStyle(parent);
			return this._parseSizePx(v ? style.height : style.width, parent.parentElement, v) * parseFloat(s.substring(0, s.length - 1)) * 0.01;
		}
		let m = /^\s*([\d\.]+)px\s*$/.exec(s);
		return m ? parseFloat(m[1]) : 0;
	},
	_parseSize(s, parent = null, v = false) {
		return this._parseSizePx(s, parent, v) * 2.54 / 96 / 10;
	},
	_parseString(s) {
		let m = /^\s*"(.*)"\s*$/.exec(s);
		return m && m[1];
	},
	_parseUrl(s) {
		let m = /^\s*url\("(.*)"\)\s*$/.exec(s);
		return m && m[1];
	},
	_parseColor(s) {
		let m = /^((?:rgb|hsl)a?)\(([^\)]*)\)/.exec(s);
		if (m && (m[1] == 'rgb' || m[1] == 'rgba')) {
			let c = /^\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*(?:[,/]\s*(\d*\.?\d+)\s*)?$/.exec(m[2]);
			if (c) {
				return [parseInt(c[1]), parseInt(c[2]), parseInt(c[3]), parseFloat(c[4] || "1")];
			}
		}
		return [0, 0, 0, 0];
	}
});

AFRAME.registerPrimitive('a-css-entity', {
	defaultComponents: {
		xyrect: {},
		'css-style': {}
	}
});


(function () {
	if (!XYTheme) {
		return;
	}
	let orgget = XYTheme.get.bind(XYTheme);
	XYTheme.get = (el) => {
		if (!el.hasAttribute('css-style') || el.tagName == 'A-XYWINDOW') {
			return orgget(el);
		}
		// Overrrides xywidget style
		let t = Object.assign({}, XYTheme.defaultTheme);
		t.createButton = (width, height, parentEl, params, hasLabel, buttonEl) => {
			buttonEl = buttonEl || document.createElement('a-entity');
			return buttonEl;
		};
		return t;
	};
})();
