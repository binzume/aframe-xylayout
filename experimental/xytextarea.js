// @ts-check
'use strict';

class TextPoint {
	/**
	 * @param {number} line 
	 * @param {number} column 
	 */
	constructor(line, column) {
		this.line = line;
		this.column = column;
	}
	clone() { return new TextPoint(this.line, this.column); }
	copy(p) { this.line = p.line; this.column = p.column; }
	withOffset(l, c) { return new TextPoint(this.line + l, this.column + c); }
	before(other) {
		return this.line < other.line || (this.line == other.line && this.column < other.column);
	}
}

class TextRange {
	/**
	 * @param {TextPoint} start 
	 * @param {TextPoint} [end]
	 */
	constructor(start, end) {
		this.start = start;
		this.end = end || start.clone();
	}
	min() { return this.start.before(this.end) ? this.start : this.end; }
	max() { return this.start.before(this.end) ? this.end : this.start; }
	clone() { return new TextRange(this.start.clone(), this.end.clone()); }
}

class TextLine {
	/**
	 * @param {string} text 
	 */
	constructor(text) {
		this.text = text;
		this.visible = false;
		this.textureLine = null;
		this.width = 0;
	}
}

class MultilineText {
	/**
	 * @param {number} width 
	 * @param {number} height 
	 * @param {number} lineHeight 
	 * @param {any} options 
	 */
	constructor(width, height, lineHeight, options = {}) {
		this._lines = [new TextLine('')];
		this.scrollY = 0;
		this.scrollX = 0;
		this.caret = null;
		this.selection = null;
		this._maxWidth = 0;
		this._textureLines = [];
		this._textureFreeLines = [];
		this._canvas = document.createElement("canvas");
		this._canvasCtx = this._canvas.getContext('2d');

		this._texture = new THREE.CanvasTexture(this._canvas);
		this.object3D = new THREE.Group();
		this.textMaterial = new THREE.MeshBasicMaterial({ map: this._texture, transparent: true });
		this._lineMeshes = [];
		this._fontResolution = options.fontResolution || 32;
		this._font = options.font || 'sans-serif';

		this._undoLmit = options.undoLimit || 2000;
		this._undoBuffer = [];
		this._redoBuffer = [];

		this.setSize(width, height, lineHeight);
	}

	/**
	 * @param {number} width 
	 * @param {number} height 
	 * @param {number} lineHeight 
	 */
	setSize(width, height, lineHeight) {
		this.width = width;
		this.height = height;
		this.lineHeight = lineHeight;
		this.visibleLineCount = Math.ceil(height / lineHeight);

		this._clearMesh();
		let textureLines = this.visibleLineCount + 4;
		this._textureLines = new Array(textureLines);
		this._textureFreeLines = new Array(textureLines);
		this._canvas.width = width * this._fontResolution / lineHeight;
		this._canvas.height = this._fontResolution * textureLines;

		this._canvasCtx.font = `${this._fontResolution * 0.9}px ${this._font}`;
		this._canvasCtx.textBaseline = 'top';

		for (let i = 0; i < textureLines; i++) {
			let geom = new THREE.PlaneBufferGeometry(width, lineHeight);
			let uv = geom.attributes.uv;
			for (let j = 0; j < uv.count; j++) {
				uv.setY(j, (uv.getY(j) + textureLines - i - 1) / textureLines);
			}
			this._lineMeshes.push(new THREE.Mesh(geom, this.textMaterial));
			this._textureFreeLines[i] = i;
		}

		this.refresh();
	}

	/**
	 * @param {string} text 
	 */
	setText(text) {
		this._lines = text.split("\n").map(text => new TextLine(text));
		this._undoBuffer = [];
		this._redoBuffer = [];
		this.scrollY = 0;
		this.scrollX = 0;
		this.selection = null;
		this.refresh();
	}

	getText() {
		return this._lines.map(l => l.text).join("\n");
	}

	/**
	 * @param {TextRange} range
	 */
	getTextRange(range) {
		let begin = this.validatePosition(range.min());
		let end = this.validatePosition(range.max());
		if (begin.line == end.line) {
			return this._lines[begin.line].text.substring(begin.column, end.column);
		}
		let lines = this._lines.slice(begin.line, end.line + 1).map(l => l.text);
		lines[0] = lines[0].substring(begin.column);
		lines[lines.length - 1] = lines[lines.length - 1].substring(0, end.column);
		return lines.join("\n");
	}

	/**
	 * @param {TextPoint} pos
	 * @param {string} str
	 * @param {boolean|null} undo
	 */
	insert(pos, str, undo = null) {
		this.validatePosition(pos);
		this.setSelection(null);
		let l = pos.line, lineText = this._lines[l].text;
		let h = lineText.substring(0, pos.column);
		let t = lineText.substring(pos.column);
		let ll = (h + str).split("\n");
		let lastStr = ll.pop();
		let end = new TextPoint(l + ll.length, lastStr.length);
		this._setLine(l, lastStr + t);

		if (ll.length > 0) {
			this._lines.splice(l, 0, ...ll.map(text => new TextLine(text)));
			this.refresh();
		}
		this._addHistory(['remove', new TextRange(pos.clone(), end)], undo);
		return end;
	}

	/**
	 * @param {TextRange} range
	 * @param {boolean|null} undo
	 */
	remove(range, undo = null) {
		this.setSelection(null);
		let begin = this.validatePosition(range.min());
		let end = this.validatePosition(range.max());
		this._addHistory(['insert', range.min(), this.getTextRange(range)], undo);
		let h = this._lines[begin.line].text.substring(0, begin.column);
		let t = this._lines[end.line].text.substring(end.column);
		this._lines.splice(begin.line, end.line - begin.line).forEach(l => this._hideLine(l));
		this._setLine(begin.line, h + t);
		if (end.line - begin.line) {
			this.refresh();
		}
		return begin;
	}

	/**
	 * @param {boolean} redo
	 */
	undo(redo = false) {
		let op = (redo ? this._redoBuffer : this._undoBuffer).pop();
		if (op && op[0] == 'remove') {
			return this.remove(op[1], !redo);
		} else if (op && op[0] == 'insert') {
			return this.insert(op[1], op[2], !redo);
		}
		return null;
	}

	_addHistory(op, undo) {
		// TODO: merge one character operations.
		let buffer = undo ? this._redoBuffer : this._undoBuffer;
		if (undo == null) {
			this._redoBuffer = [];
		}
		buffer.push(op);
		if (buffer.length > this._undoLmit * 1.5) {
			buffer.splice(0, buffer.length - this._undoLmit);
		}
	}

	/**
	 * @param {TextRange} sel
	 */
	setSelection(sel) {
		let old = this.selection;
		this.selection = sel;
		if (sel) {
			this.validatePosition(sel.min());
			this.validatePosition(sel.max());
			// TODO: mege if sel.overwrap(old)
			this._redrawRange(sel);
		}
		if (old) {
			this._redrawRange(old);
		}
	}

	_redrawRange(range) {
		let last = range.max().line;
		for (let l = range.min().line; l <= last; l++) {
			let line = this._lines[l];
			if (line.visible) {
				this._drawLine(line, l);
			}
		}
	}

	getPositionFromLocal(localPos) {
		let l = Math.max(Math.min(Math.floor(-localPos.y / this.lineHeight), this._lines.length - 1), 0);
		let c = this._getCol(l, (localPos.x / this.width + 0.5) * this._canvas.width);
		return new TextPoint(l, c);
	}

	getLocalPos(pos, destVec3) {
		let s = this._lines[pos.line].text.slice(0, pos.column);
		let x = (this._canvasCtx.measureText(s).width - this.scrollX)
			* this.width / this._canvas.width - this.width / 2;
		destVec3.set(x, this.lineHeight * (-pos.line - 0.5), 0);
	}

	refresh() {
		this._textureLines.forEach(line => this._hideLine(line));

		let end = Math.min(this.scrollY + this.visibleLineCount, this._lines.length);
		for (let ln = this.scrollY; ln < end; ln++) {
			let line = this._lines[ln];
			this._showLine(line, ln);
			let mesh = this._lineMeshes[line.textureLine];
			mesh.position.set(0, this.lineHeight * (-ln - 0.5), 0);
		}
		this.object3D.position.set(0, this.lineHeight * this.scrollY + this.height / 2, 0.01);

		// TODO callback
		if (this.caret) {
			this.caret._refresh();
		}
	}

	/**
	 * @param {TextPoint} p
	 * @param {boolean} moveLine 
	 */
	validatePosition(p, moveLine = true) {
		if (moveLine && p.line > 0 && p.column < 0) {
			p.line--;
			p.column += this._lines[p.line].text.length + 1;
		}
		if (moveLine && p.line < this._lines.length - 1 && p.column > this._lines[p.line]?.text.length) {
			p.column -= this._lines[p.line].text.length + 1;
			p.line++;
		}
		p.line = Math.max(Math.min(p.line, this._lines.length - 1), 0);
		p.column = Math.max(Math.min(p.column, this._lines[p.line].text.length), 0);
		return p;
	}

	scrollOffset(dx, dy) {
		this.scrollX += dx;
		this.scrollY += dy;
		if (dx) {
			this._redraw();
		} else if (dy) {
			this.refresh();
		}
	}

	scrollTo(pos) {
		this.validatePosition(pos);
		if (this.scrollY > pos.line) {
			this.scrollOffset(0, pos.line - this.scrollY);
		}
		if (this.scrollY <= pos.line - this.visibleLineCount) {
			this.scrollOffset(0, pos.line - this.visibleLineCount + 1 - this.scrollY);
		}

		let s = this._lines[pos.line].text.slice(0, pos.column);
		let x = this._canvasCtx.measureText(s).width - this.scrollX;
		if (x < 0) {
			this.scrollOffset(x, 0);
		} else if (x > this._canvas.width) {
			this.scrollOffset(x - this._canvas.width, 0);
		}
	}

	_redraw() {
		let end = Math.min(this.scrollY + this.visibleLineCount, this._lines.length);
		for (let ln = this.scrollY; ln < end; ln++) {
			let line = this._lines[ln];
			if (line.visible) {
				this._drawLine(line, ln);
			}
		}
	}

	_showLine(line, l) {
		if (line == null || line.visible) {
			return;
		}
		if (line.textureLine === null) {
			this._bindTextureLine(line);
			this._drawLine(line, l);
		} else {
			this._textureFreeLines = this._textureFreeLines.filter(l => l != line.textureLine);
		}

		this.object3D.add(this._lineMeshes[line.textureLine]);
		line.visible = true;
	}

	_hideLine(line) {
		if (line == null || !line.visible) {
			return;
		}
		this.object3D.remove(this._lineMeshes[line.textureLine]);
		this._textureFreeLines.push(line.textureLine);
		line.visible = false;
	}

	_drawLine(line, l) {
		let ctx = this._canvasCtx;
		let y = line.textureLine * this._fontResolution + 1;
		ctx.clearRect(0, y, this._canvas.width, this._fontResolution);

		let fragments = [];
		let selection = this.selection;
		if (selection && l >= selection.min().line && l <= selection.max().line) {
			let min = selection.min(), max = selection.max();
			let text = line.text;
			let s = min.line == l && min.column > 0 ? min.column : 0;
			let e = max.line == l ? max.column : text.length;
			if (s > 0) {
				fragments.push([text.slice(0, s), 'white', null]);
			}
			fragments.push([text.slice(s, e), 'yellow', 'blue']);
			if (e < text.length) {
				fragments.push([text.slice(e), 'white', null]);
			}
		} else {
			fragments.push([line.text, 'white', null]);
		}

		line.width = 0;
		for (let f of fragments) {
			let w = ctx.measureText(f[0]).width;
			if (f[2]) {
				ctx.fillStyle = f[2];
				ctx.fillRect(line.width - this.scrollX, y, w, this._fontResolution - 1);
			}
			ctx.fillStyle = f[1];
			ctx.fillText(f[0], line.width - this.scrollX, y);
			line.width += w;
		}
		this._maxWidth = Math.max(this._maxWidth, line.width)
		this._texture.needsUpdate = true;
	}

	_bindTextureLine(line) {
		let l = this._textureFreeLines.shift();
		if (this._textureLines[l]) {
			this._textureLines[l].textureLine = null;
		}
		this._textureLines[l] = line;
		line.textureLine = l;
	}

	_setLine(l, text) {
		let line = this._lines[l];
		if (line == null || line.text == text) {
			return;
		}
		line.text = text;
		if (line.visible) {
			this._drawLine(line, l);
		}
	}

	_getCol(l, x) {
		let str = this._lines[l].text;
		let _caretpos = (p) => {
			let s = str.slice(0, p);
			return this._canvasCtx.measureText(s).width;
		};
		// binary search...
		let min = 0, max = str.length, p = 0;
		while (max > min) {
			p = min + ((max - min + 1) / 2 | 0);
			if (_caretpos(p) < x) {
				min = p;
			} else {
				max = p - 1;
			}
		}
		return min;
	}

	_clearMesh() {
		this._lineMeshes.forEach(m => m.geometry.dispose());
		this._lineMeshes = [];
	}

	dispose() {
		this._lines = [];
		this._clearMesh();
		this._texture.dispose();
		this.textMaterial.dispose();
	}
}

class MultilineTextCaret {
	/**
	 * @param {number} width 
	 * @param {number} height 
	 * @param {*} color 
	 * @param {MultilineText} textView 
	 */
	constructor(width, height, color, textView) {
		this._textView = textView;
		this.position = new TextPoint(0, 0);
		let material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
		this.obj = new THREE.Mesh(new THREE.PlaneBufferGeometry(width, height), material);
	}
	show() {
		let caretObj = this.obj;
		if (!caretObj.parent) {
			this._textView.object3D.add(caretObj);
		}
		this._textView.scrollTo(this.position);
		this._refresh();
	}
	_refresh() {
		let textView = this._textView;
		let line = textView._lines[this.position.line];
		if (line == null || !line.visible) {
			this.hide();
			return;
		}
		textView.getLocalPos(this.position, this.obj.position);
	}
	hide() {
		let caretObj = this.obj;
		if (caretObj.parent) {
			caretObj.parent.remove(caretObj);
		}
	}
	move(lineOffset, colOffset) {
		let p = this.position.withOffset(lineOffset, colOffset);
		this.setPosition(this._textView.validatePosition(p, lineOffset == 0));
	}
	setPosition(p) {
		this.position.copy(this._textView.validatePosition(p));
		this.show();
	}
	dispose() {
		this.obj.geometry.dispose();
	}
}


AFRAME.registerComponent('xytextarea', {
	schema: {
		caretColor: { default: '#0088ff' },
		bgColor: { default: '#222' },
		font: { default: '' },
		editable: { default: true },
		lineHeight: { default: 0.2 },
	},
	init() {
		let data = this.data, el = this.el, xyrect = el.components.xyrect;
		let lineHeight = this.data.lineHeight;
		this.textView = new MultilineText(xyrect.width, xyrect.height, lineHeight, { font: data.font });
		if (data.editable) {
			this.caret = this.textView.caret = new MultilineTextCaret(lineHeight * 0.1, lineHeight * 0.9, this.data.caretColor, this.textView);
		}

		el.setObject3D('xytextarea-text', this.textView.object3D);

		Object.defineProperty(el, 'value', {
			get: () => this.textView.getText(),
			set: (v) => this.textView.setText(v)
		});


		// Same as aframe-xyinput.js TODO: consolidate.
		el.setAttribute('geometry', {
			primitive: 'xy-rounded-rect', width: xyrect.width, height: xyrect.height
		});
		el.classList.add('collidable');
		el.setAttribute('tabindex', 0);

		el.addEventListener('click', ev => {
			el.focus();
			let intersection = ev.detail.intersection;
			if (intersection) {
				if (!this.caret) {
					return;
				}
				let lp = this.textView.object3D.worldToLocal(intersection.point);
				let pos = this.textView.getPositionFromLocal(lp);
				this.caret.setPosition(pos);
				if (this.textView.selection) {
					// TODO: drag and shift key
					let range = new TextRange(this.textView.selection.start, pos);
					this.textView.setSelection(range);
				}
			}
			el.emit('xykeyboard-request', data.type);
		});
		let oncopy = (ev) => {
			ev.clipboardData.setData('text/plain', this.textView.selection ? this.textView.getTextRange(this.textView.selection) : this.textView.getText());
			ev.preventDefault();
		};
		let oncut = (ev) => {
			if (this.textView.selection) {
				ev.clipboardData.setData('text/plain', this.textView.getTextRange(this.textView.selection));
				this.caret.setPosition(this.textView.selection.min());
				this.textView.remove(this.textView.selection);
				ev.preventDefault();
			}
		};
		let onpaste = (ev) => {
			this.caret.setPosition(this.textView.insert(this.caret.position, ev.clipboardData.getData('text/plain')));
			ev.preventDefault();
		};
		el.addEventListener('focus', (ev) => {
			window.addEventListener('copy', oncopy);
			window.addEventListener('cut', oncut);
			window.addEventListener('paste', onpaste);
			this.caret.show();
		});
		el.addEventListener('blur', (ev) => {
			window.removeEventListener('copy', oncopy);
			window.removeEventListener('cut', oncut);
			window.removeEventListener('paste', onpaste);
			this.caret.hide();
		});
		el.addEventListener('keypress', (ev) => {
			if (ev.ctrlKey && ev.code == 'KeyZ') {
				let r = this.textView.undo(ev.shiftKey);
				if (r) {
					this.caret.setPosition(r);
				}
			} else if (ev.code != 'Enter') {
				let pos = this.textView.insert(this.caret.position, ev.key);
				this.caret.setPosition(pos); // TODO: changed event
			}
		});

		let caretMoves = {
			ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowDown: [1, 0], ArrowUp: [-1, 0],
			PageDown: [8, 0], PageUp: [-8, 0],
		};
		el.addEventListener('keydown', (ev) => {
			if (caretMoves[ev.code]) {
				let range = ev.shiftKey ? this.textView.selection?.clone() ?? new TextRange(this.caret.position.clone()) : null;
				this.caret.move(caretMoves[ev.code][0], caretMoves[ev.code][1]);
				if (range) {
					range.end = this.caret.position.clone();
				}
				this.textView.setSelection(range);
			} else if (ev.code == 'Backspace') {
				let range = this.textView.selection || new TextRange(this.caret.position.withOffset(0, -1), this.caret.position);
				this.caret.setPosition(this.textView.remove(range));
			} else if (ev.code == 'Enter') {
				this.caret.setPosition(this.textView.insert(this.caret.position, "\n"));
			}
		});

	},
	update() {
		let el = this.el, data = this.data;
		el.setAttribute('material', { color: data.bgColor });
		this.caret.obj.material.color = new THREE.Color(data.caretColor);
	},
	remove() {
		this.el.removeObject3D('xytextarea-text');
		this.textView.dispose();
	}
});

AFRAME.registerPrimitive('a-xytextarea', {
	defaultComponents: {
		xyrect: { width: 6, height: 3 },
		xytextarea: {},
	},
	mappings: {
		width: 'xyrect.width',
		height: 'xyrect.height',
		'caret-color': 'xytextarea.caretColor',
		'background-color': 'xytextarea.bgColor'
	}
});
