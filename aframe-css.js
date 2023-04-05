

AFRAME.registerGeometry('css-rounded-rect', {
	schema: {
		height: { default: 1, min: 0 },
		width: { default: 1, min: 0 },
		radiusBL: { default: 0, min: 0 },
		radiusBR: { default: 0, min: 0 },
		radiusTL: { default: 0, min: 0 },
		radiusTR: { default: 0, min: 0 },
	},
	init(data) {
		let shape = new THREE.Shape();
		let w = (data.width || 0.01) / 2, h = (data.height || 0.01) / 2;
		let tl = data.radiusTL, tr = data.radiusTR, bl = data.radiusBL, br = data.radiusBR;
		let hpi = Math.PI / 2;
		shape.moveTo(-w, -h + bl);
		shape.lineTo(-w, h - tl);
		tl && shape.arc(tl, 0, tl, hpi * 2, hpi * 1, true);
		shape.lineTo(w - tr, h);
		tr && shape.arc(0, -tr, tr, hpi * 1, hpi * 0, true);
		shape.lineTo(w, -h + br);
		br && shape.arc(-br, 0, br, hpi * 0, hpi * 3, true);
		shape.lineTo(-w + bl, -h);
		bl && shape.arc(0, bl, bl, hpi * 3, hpi * 2, true);
		// @ts-ignore
		this.geometry = new THREE.ShapeGeometry(shape);
	}
});

AFRAME.registerComponent('css-borderline', {
	schema: {
		height: { default: 1, min: 0 },
		width: { default: 1, min: 0 },
		color: { default: '' },
		style: { default: 'solid' },
		linewidth: { default: 1, min: 0 },
		radiusBL: { default: 0, min: 0 },
		radiusBR: { default: 0, min: 0 },
		radiusTL: { default: 0, min: 0 },
		radiusTR: { default: 0, min: 0 },
	},
	update() {
		let data = this.data;
		let path = new THREE.Path();
		let w = (data.width || 0.01) / 2, h = (data.height || 0.01) / 2;
		let tl = data.radiusTL, tr = data.radiusTR, bl = data.radiusBL, br = data.radiusBR;
		let hpi = Math.PI / 2;
		path.moveTo(-w, -h + bl);
		path.lineTo(-w, h - tl);
		tl && path.arc(tl, 0, tl, hpi * 2, hpi * 1, true);
		path.lineTo(w - tr, h);
		tr && path.arc(0, -tr, tr, hpi * 1, hpi * 0, true);
		path.lineTo(w, -h + br);
		br && path.arc(-br, 0, br, hpi * 0, hpi * 3, true);
		path.lineTo(-w + bl, -h);
		bl && path.arc(0, bl, bl, hpi * 3, hpi * 2, true);
		let geometry = new THREE.BufferGeometry().setFromPoints(path.getPoints());
		let lw = data.linewidth, c = data.color;
		let lstyle = data.style;
		let ls = lw * 2.54 / 96 / 100;
		let material = lstyle == 'solid' ?
			new THREE.LineBasicMaterial({ linewidth: lw, color: c }) :
			new THREE.LineDashedMaterial({ linewidth: lw, color: c, gapSize: ls, dashSize: lstyle == 'dashed' ? ls * 3 : ls });
		let line = new THREE.Line(geometry, material);
		if (lstyle != 'solid') {
			line.computeLineDistances();
		}
		line.position.set(0, 0, 0.001);
		line.raycast = () => { }; // disable raycast
		this.el.setObject3D('css-borderline', line);
		this._setLineObj(line);
	},
	remove() {
		this.el.removeObject3D('css-borderline');
		this._setLineObj(null);
	},
	_line: null,
	_setLineObj(obj) {
		if (this._line) {
			this._line.material.dispose();
			this._line.geometry.dispose();
		}
		this._line = obj;
	}
});


AFRAME.registerComponent('style', {
	dependencies: ['xyrect'],
	schema: { default: "" },
	/** @type {MutationObserver} */
	_observer: null,
	_transformed: false,
	_transition: false,
	init() {
		let el = this.el;
		let style = getComputedStyle(el);
		if (style.pointerEvents != 'none') {
			let cname = this._parseString(style.getPropertyValue('--collider-class')) || 'collidable';
			let hover = this._parseString(style.getPropertyValue('--hover-alt-class')) || '_hover';
			el.classList.add(cname);
			el.addEventListener('mouseenter', ev => el.classList.add(hover));
			el.addEventListener('mouseleave', ev => el.classList.remove(hover));
		}
		// Maybe dom-overlay feature is required in immersive session?
		let transitionstart = (ev) => { this._transition = true; this.play(); };
		let transitionend = (ev) => this._transition = false;
		el.addEventListener('transitionstart', transitionstart);
		el.addEventListener('transitionend', transitionend);
		el.addEventListener('animationstart', transitionstart);
		el.addEventListener('animationend', transitionend);

		this._observer = new MutationObserver((mutationsList, _observer) => {
			if (mutationsList.find(r => ['class', 'style'].includes(r.attributeName))) {
				this._updateStyle();
			}
		});
		this._observer.observe(el, { attributes: true });
		this._updateStyle();
	},
	tick() {
		if (this._transition) {
			this._updateStyle();
		} else {
			this.pause();
		}
	},
	remove() {
		this._observer.disconnect();
	},
	_updateStyle() {
		let el = this.el;
		let style = getComputedStyle(el);
		this._updateGeometry(el, style);
		el.setAttribute('visible', style.visibility != 'hidden');
		if (el.childElementCount > 0) {
			this._updateLayout(el, style);
		} else {
			el.removeAttribute('xycontainer');
			if (el.components.xyinput) {
				el.setAttribute('xyinput', { caretColor: style.caretColor, color: style.color });
			} else {
				this._updateText(el, style);
			}
		}
		this._updateTransform(el, style);
	},
	/**
	 * @param {import('aframe').Entity} el
	 * @param {CSSStyleDeclaration} style
	 */
	_updateText(el, style) {
		let text = this._parseString(style.content);
		if (!text) {
			text = el.textContent.trim();
		}
		if (text || el.hasAttribute('xylabel')) {
			let align = style.textAlign;
			if (align == 'start') {
				align = 'left';
			}
			if (align == 'end') {
				align = 'right';
			}
			let attrs = { value: text, align: align };
			let c = this._parseColor(style.color);
			if (c[3] > 0) {
				attrs.color = style.color;
			}
			el.setAttribute('xylabel', attrs);
		}
	},
	/**
	 * @param {import('aframe').Entity} el
	 * @param {CSSStyleDeclaration} style
	 */
	_updateGeometry(el, style) {
		let w = this._parseSize(style.width, el.parentElement), h = this._parseSize(style.height, el.parentElement, true);
		if (w > 0 || h > 0) {
			el.setAttribute('xyrect', { width: w, height: h });
		}
		let fixed = style.position == 'fixed';
		let grow = parseInt(style.flexGrow), shrink = parseInt(style.flexShrink);
		if (fixed || grow || shrink) {
			el.setAttribute('xyitem', { fixed: fixed, grow: grow, shrink: shrink });
		}
		let g = el.getAttribute('geometry');
		if (g && g.primitive != 'css-rounded-rect') {
			el.setAttribute('material', {
				color: style.color,
				opacity: this._parseColor(style.color)[3],
			});
			return;
		}
		let bgcol = this._parseColor(style.backgroundColor);
		let bw = this._parseSizePx(style.borderWidth);
		if (bgcol[3] > 0 || style.pointerEvents != 'none') {
			el.setAttribute('geometry', {
				primitive: 'css-rounded-rect', width: w, height: h,
				radiusBL: this._parseSize(style.borderBottomLeftRadius),
				radiusBR: this._parseSize(style.borderBottomRightRadius),
				radiusTL: this._parseSize(style.borderTopLeftRadius),
				radiusTR: this._parseSize(style.borderTopRightRadius)
			});
			el.setAttribute('material', {
				color: style.backgroundColor,
				opacity: bgcol[3],
				src: this._parseUrl(style.backgroundImage) || ''
			});
		}
		if (bw > 0) {
			el.setAttribute('css-borderline', {
				width: w, height: h, linewidth: bw,
				color: style.borderColor,
				style: style.borderStyle,
				radiusBL: this._parseSize(style.borderBottomLeftRadius),
				radiusBR: this._parseSize(style.borderBottomRightRadius),
				radiusTL: this._parseSize(style.borderTopLeftRadius),
				radiusTR: this._parseSize(style.borderTopRightRadius)
			});
		} else {
			el.removeAttribute('css-borderline');
		}
	},
	/**
	 * @param {import('aframe').Entity} el
	 * @param {CSSStyleDeclaration} style
	 */
	_updateLayout(el, style) {
		if (style.position == 'fixed') {
			el.setAttribute('xyitem', { fixed: true });
		}
		el.setAttribute('xycontainer', {
			wrap: style.flexWrap,
			direction: style.flexDirection,
			spacing: this._parseSize(style.columnGap),
			alignContent: style.alignContent,
			justifyItems: ['space-between', 'space-around'].includes(style.justifyContent) ? style.justifyContent : style.justifyItems,
			alignItems: style.alignItems,
		});
	},
	/**
	 * @param {import('aframe').Entity} el
	 * @param {CSSStyleDeclaration} style
	 */
	_updateTransform(el, style) {
		this._transformed = this._transformed || style.transform != 'none';
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
			el.object3D.quaternion.copy(rot);
			el.object3D.scale.copy(sc);
			el.object3D.position.setZ(tr.z * 2.54 / 96 / 100);
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
		return this._parseSizePx(s, parent, v) * 2.54 / 96 / 100;
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
