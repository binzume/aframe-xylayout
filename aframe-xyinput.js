"use strict";

AFRAME.registerComponent('xyinput', {
    dependencies: ['xylabel'],
    schema: {
        value: { default: "" },
        type: { default: "" },
        placeholder: { default: "" },
        caretColor: { default: "#0088ff" },
        bgColor: { default: "white" },
        virtualKeyboard: { default: "[xykeyboard]", type: 'selector' },
    },
    init() {
        let data = this.data, el = this.el, xyrect = el.components.xyrect;
        let insertString = (v) => {
            let pos = this.cursor, s = el.value;
            this.cursor += v.length;
            el.value = s.slice(0, pos) + v + s.slice(pos);
        };

        Object.defineProperty(el, 'value', {
            get: () => data.value,
            set: (v) => el.setAttribute('xyinput', 'value', "" + v)
        });

        this._caretObj = new THREE.Mesh(new THREE.PlaneGeometry(0.04, xyrect.height * 0.9));
        el.setObject3D('caret', this._caretObj);

        el.classList.add('collidable');
        let updateGeometory = () => {
            el.setAttribute('geometry', {
                primitive: 'xy-rounded-rect', width: xyrect.width, height: xyrect.height
            });
        };
        updateGeometory();
        el.setAttribute('tabindex', 0);
        el.addEventListener('xyresize', updateGeometory);
        el.addEventListener('click', ev => {
            el.focus();
            let kbd = data.virtualKeyboard;
            if (kbd) {
                kbd.components.xykeyboard.show(data.type);
            }
            let intersection = ev.detail.intersection;
            if (intersection) {
                let v = intersection.uv.x;
                let min = 0, max = this.el.value.length, p = 0;
                while (max > min) {
                    p = min + ((max - min + 1) / 2 | 0);
                    if (this._caretpos(p) < v) {
                        min = p;
                    } else {
                        max = p - 1;
                    }
                }
                this._updateCursor(min);
            }
        });
        let oncopy = (ev) => {
            ev.clipboardData.setData('text/plain', el.value);
            ev.preventDefault();
        };
        let onpaste = (ev) => {
            insertString(ev.clipboardData.getData('text/plain'));
            ev.preventDefault();
        };
        el.addEventListener('focus', (ev) => {
            this._updateCursor(this.cursor);
            window.addEventListener('copy', oncopy);
            window.addEventListener('paste', onpaste);
        });
        el.addEventListener('blur', (ev) => {
            this._updateCursor(this.cursor);
            window.removeEventListener('copy', oncopy);
            window.removeEventListener('paste', onpaste);
        });
        el.addEventListener('keypress', (ev) => {
            if (ev.code != 'Enter') {
                insertString(ev.key);
            }
        });
        el.addEventListener('keydown', (ev) => {
            let pos = this.cursor, s = el.value;
            if (ev.code == 'ArrowLeft') {
                if (pos > 0) {
                    this._updateCursor(pos - 1);
                }
            } else if (ev.code == 'ArrowRight') {
                if (pos < s.length) {
                    this._updateCursor(pos + 1);
                }
            } else if (ev.code == 'Backspace') {
                if (pos > 0) {
                    this.cursor--;
                    el.value = s.slice(0, pos - 1) + s.slice(pos);
                }
            }
        });
    },
    update(oldData) {
        let el = this.el, data = this.data;
        let s = el.value, cursor = this.cursor, len = s.length;
        if (cursor > len || oldData.value == null) {
            cursor = len;
        }
        el.setAttribute('xylabel', {
            color: s ? "black" : "#aaa",
            value: (data.type == 'password' ? '*'.repeat(len) : s) || data.placeholder
        });
        el.setAttribute('material', { color: data.bgColor });
        this._caretObj.material.color = new THREE.Color(data.caretColor);
        this._updateCursor(cursor);
    },
    _updateCursor(p) {
        let caretObj = this._caretObj;
        this.cursor = p;
        caretObj.visible = false;
        if (document.activeElement == this.el) {
            setTimeout(() => {
                caretObj.position.set(this._caretpos(p), 0, 0.02);
                caretObj.visible = true;
            }, 0);
        }
    },
    _caretpos(cursorPos) {
        return this.el.components.xylabel.getPos(cursorPos) + 0.04;
    }
});

AFRAME.registerComponent('xyime', {
    schema: {
        label: { default: null, type: 'selector' }
    },
    table: {
        'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
        'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
        'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
        'sa': 'さ', 'si': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
        'za': 'ざ', 'zi': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
        'ta': 'た', 'ti': 'ち', 'tu': 'つ', 'te': 'て', 'to': 'と',
        'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
        'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
        'ha': 'は', 'hi': 'ひ', 'hu': 'ふ', 'he': 'へ', 'ho': 'ほ',
        'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
        'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
        'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
        'ya': 'や', 'yi': 'い', 'yu': 'ゆ', 'ye': 'いぇ', 'yo': 'よ',
        'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
        'wa': 'わ', 'wi': 'うぃ', 'wu': 'う', 'we': 'うぇ', 'wo': 'を',
        'xa': 'ぁ', 'xi': 'ぃ', 'xu': 'ぅ', 'xe': 'ぇ', 'xo': 'ぉ',
        'xya': 'ゃ', 'xyi': 'ぃ', 'xyu': 'ゅ', 'xye': 'ぇ', 'xyo': 'ょ',
        'xtu': 'っ', 'xka': 'ヵ', 'xke': 'ヶ',
        'nn': 'ん', 'wyi': 'ゐ', 'wye': 'ゑ',
        'fu': 'ふ', 'vu': 'ヴ', 'tsu': 'つ',
        'chi': 'ち', 'ji': 'じ', 'shi': 'し',
        '-': 'ー'
    },
    init() {
        this.enable = false;
        this._kana = "";
        this._suggestions = [];
        this._suggestionIdx = 0;
        this._onkeydown = this._onkeydown.bind(this);
        document.body.addEventListener('keydown', this._onkeydown, true);
        document.body.addEventListener('keypress', this._onkeydown, true);
    },
    remove() {
        document.body.removeEventListener('keydown', this._onkeydown, true);
        document.body.removeEventListener('keypress', this._onkeydown, true);
    },
    async convert(text, suggest) {
        // https://www.google.co.jp/ime/cgiapi.html
        let response = await fetch(`https://www.google.com/transliterate?langpair=ja-Hira|ja&text=${text},`);
        let result = await response.json();
        suggest(result[0][1]);
    },
    _onkeydown(ev) {
        if (ev.code == 'CapsLock' && ev.shiftKey || ev.key == 'HiraganaKatakana') {
            this.enable = !this.enable;
            this._confirm(ev.target);
            return;
        }
        if (!this.enable || !ev.code) {
            return;
        }
        if (ev.type == 'keypress') {
            if (this._suggestions.length > 0) {
                if (ev.code == 'Space') {
                    this._suggestionIdx = (this._suggestionIdx + 1) % this._suggestions.length;
                    this._updateStr(this._suggestions[this._suggestionIdx]);
                    ev.stopPropagation();
                    return;
                }
                this._confirm(ev.target);
            }
            if (ev.key.match(/^[^\s]$/)) {
                let temp = [
                    [/n([^aiueoyn])/g, "nn$1"],
                    [/([ksthmyrwgzbpdjfv])\1/g, "xtu$1"],
                    [/([kstnhmrgzbpdj])(y[aiueo])/g, "$1ix$2"],
                    [/(j|ch|sh)([aueo])/g, "$1ixy$2"],
                    [/(f|v|ts)(y?[aieo])/g, "$1ux$2"],
                    [/(t|d)h([aiueo])/g, "$1exy$2"],
                ].reduce((acc, [ptn, r]) => acc.replace(ptn, r), this._kana + ev.key);
                for (let p = 0; p < temp.length; p++) {
                    for (let l = 3; l >= 0; l--) {
                        let t = this.table[temp.slice(p, p + l)];
                        if (t) {
                            temp = temp.slice(0, p) + t + temp.slice(p + l);
                            break;
                        }
                    }
                }
                this._updateStr(temp);
            } else if (ev.code == 'Space' && this._kana) {
                this.convert(this._kana, (ret) => {
                    this._suggestions = ret;
                    this._suggestionIdx = 0;
                    this._updateStr(ret[0]);
                });
                this._updateStr("");
            } else if (this._kana) {
                this._updateStr(this._kana + ev.key);
            } else {
                return;
            }
        } else if (this._kana) {
            if (ev.code == 'Enter') {
                this._confirm(ev.target);
            } else if (ev.code == 'Backspace') {
                this._updateStr(this._kana.slice(0, -1));
            }
        } else {
            return;
        }
        ev.stopPropagation();
    },
    _updateStr(s) {
        this._kana = s;
        (this.data.label || this.el).setAttribute('value', s);
    },
    _confirm(target) {
        if (this._kana) {
            target.dispatchEvent(new KeyboardEvent('keypress', { key: this._kana }));
            this._updateStr("");
        }
        this._suggestions = [];
    }
});

AFRAME.registerComponent('xykeyboard', {
    schema: {
        distance: { default: 0.7 },
        ime: { default: false },
    },
    blocks: {
        main: {
            size: [11, 4],
            rows: [
                { pos: [0, 3], keys: ["qQ!", "wW@", "eE#", "rR$", "tT%", "yY^", "uU&", "iI*", "oO(", "pP)", "-_="] },
                { pos: [0, 2], keys: ["aA1", "sS2", "dD3", "fF4", "gG5", "hH`", "jJ~", "kK+", "lL[", ":;]"] },
                { pos: [0, 1], keys: [{ code: "Shift", symbols: "⇧⬆" }, "zZ6", "xX7", "cC8", "vV9", "bB0", "nN{", "mM}", ",'<", ".\">", "/?\\"] },
                { pos: [0, 0], keys: [{ code: "Space", key: " ", label: "_", size: 4 }] },
                { pos: [-4.5, 0], keys: [{ code: "_Fn", label: "#!" }, { code: "HiraganaKatakana", label: "🌐" }] },
            ]
        },
        num: {
            size: [4, 4],
            rows: [
                { pos: [0, 3], keys: ["7", "8", "9", "/"] },
                { pos: [0, 2], keys: ["4", "5", "6", "*"] },
                { pos: [0, 1], keys: ["1", "2", "3", "-"] },
                { pos: [0, 0], keys: ["0", ":", ".", "+"] },
            ]
        },
        ctrl: {
            size: [2, 4],
            rows: [
                { pos: [0, 3], keys: [{ code: 'Backspace', label: "⌫", size: 2 }] },
                { pos: [0, 2], keys: [{ code: 'Space', key: " ", label: "SP", size: 2 }] },
                { pos: [0, 1], keys: [{ code: 'Enter', label: "⏎", size: 2 }] },
                { pos: [1.3, 3.5], keys: [{ code: '_Close', label: "x", size: 0.8 }] },
                { pos: [0, 0], keys: [{ code: 'ArrowLeft', label: "⇦" }, { code: 'ArrowRight', label: "⇨" }] },
            ]
        }
    },
    show(type) {
        this.hide();
        let el = this.el;
        let data = this.data;
        let keySize = 0.2;
        let excludes = data.ime ? [] : ['HiraganaKatakana'];
        let blocks = this.blocks;
        let createKeys = (block, excludes = []) => {
            let pane = document.createElement('a-entity');
            let padding = keySize * 0.3;
            let size = block.size;
            pane.setAttribute('geometry', {
                primitive: "xy-rounded-rect", width: size[0] * keySize + padding, height: size[1] * keySize + padding
            });
            pane.setAttribute("material", {
                color: "#222233"
            });
            for (let row of block.rows) {
                let keyrow = pane.appendChild(document.createElement('a-xycontainer'));
                keyrow.setAttribute('xycontainer', { direction: 'row' });
                keyrow.setAttribute('position', { x: row.pos[0] * keySize, y: row.pos[1] * keySize - (size[1] - 1) * keySize / 2, z: 0.02 });
                for (let key of row.keys) {
                    if (excludes.includes(key.code)) {
                        continue;
                    }
                    let keyEl = keyrow.appendChild(document.createElement('a-xybutton'));
                    keyEl.setAttribute('material', 'visible', false);
                    keyEl.setAttribute('xylabel', { value: key.label || "", align: 'center' });
                    keyEl.setAttribute('xyrect', { width: (key.size || 1) * keySize, height: keySize });
                    keyEl.addEventListener('mouseenter', (ev) => keyEl.setAttribute('material', 'visible', true));
                    keyEl.addEventListener('mouseleave', (ev) => keyEl.setAttribute('material', 'visible', false));

                    if (key.symbols || typeof key === 'string') {
                        keyEl.classList.add('xyinput-key');
                        keyEl.dataset.keySymbols = key.symbols || key;
                    }
                    if (key.code == '_Close') {
                        keyEl.classList.add('xyinput-close');
                        keyEl.addEventListener('click', (ev) => this.hide());
                    }
                    keyEl.addEventListener('mousedown', ev => {
                        if (document.activeElement == document.body && this._target) {
                            this._target.focus();
                        }
                        this._target = document.activeElement;
                        setTimeout(() => this._target.focus(), 0);
                        ev.preventDefault();

                        if (key.code == '_Fn') {
                            this._updateSymbols(this._keyidx == 2 ? 0 : 2);
                            return;
                        }
                        if (key.code == 'Shift') {
                            this._updateSymbols((this._keyidx + 1) % 2);
                        }

                        let ks = key.code ? key.key : key;
                        let eventdata = {
                            key: ks ? ks[this._keyidx] || ks[0] : key.code,
                            code: key.code || key[0].toUpperCase()
                        };
                        this._target.dispatchEvent(new KeyboardEvent('keydown', eventdata));
                        if (ks) {
                            this._target.dispatchEvent(new KeyboardEvent('keypress', eventdata));
                        }
                    });
                }
            }
            return el.appendChild(pane);
        };
        if (type == 'number') {
            let w = blocks.num.size[0] + blocks.ctrl.size[0];
            createKeys(blocks.num);
            createKeys(blocks.ctrl).setAttribute('position', 'x', (w / 2 + 0.4) * keySize);
        } else if (type == 'full') {
            let w = blocks.main.size[0] + blocks.ctrl.size[0];
            createKeys(blocks.main, excludes);
            createKeys(blocks.ctrl, ["Space"]).setAttribute('position', 'x', (w / 2 + 0.4) * keySize);
            w += blocks.ctrl.size[0] + blocks.num.size[0];
            createKeys(blocks.num).setAttribute('position', 'x', (w / 2 + 0.8) * keySize);
        } else {
            let w = blocks.main.size[0] + blocks.ctrl.size[0];
            createKeys(blocks.main, excludes);
            createKeys(blocks.ctrl, ["Space"]).setAttribute('position', 'x', (w / 2 + 0.4) * keySize);
        }
        if (data.ime) {
            let convText = el.appendChild(document.createElement("a-xylabel"));
            convText.setAttribute('xylabel', { color: "yellow", renderingMode: 'canvas' });
            convText.setAttribute('position', { x: 0, y: 2 * keySize * 0.95, z: 0.03 });
            convText.setAttribute('xyrect', { width: 8 * keySize, height: keySize * 0.6 });
            convText.setAttribute('xyime', "");
        }
        el.setAttribute('xy-drag-control', 'draggable', '.xyinput-close');
        this._updateSymbols(0);

        // Update position and rotation.
        let obj = el.object3D, position = obj.position;
        let tr = new THREE.Matrix4().getInverse(obj.parent.matrixWorld).multiply(el.sceneEl.camera.matrixWorld);
        let orgY = position.y;
        position.set(0, 0, -data.distance).applyMatrix4(tr);
        position.y = orgY;
        obj.rotation.y = new THREE.Euler().setFromRotationMatrix(tr.extractRotation(tr), 'YXZ').y;
    },
    hide() {
        let el = this.el;
        this._target = null;
        el.removeAttribute('xy-drag-control');
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    },
    _updateSymbols(keyidx) {
        this._keyidx = keyidx;
        for (let keyEl of this.el.querySelectorAll('.xyinput-key')) {
            let s = keyEl.dataset.keySymbols;
            keyEl.setAttribute('xylabel', 'value', s[keyidx] || s[0]);
        }
    }
});

AFRAME.registerPrimitive('a-xykeyboard', {
    defaultComponents: {
        xykeyboard: {}
    },
    mappings: {
        ime: 'xykeyboard.ime',
        distance: 'xykeyboard.distance',
    }
});

AFRAME.registerPrimitive('a-xyinput', {
    defaultComponents: {
        xyrect: { width: 2, height: 0.5 },
        xyinput: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        value: 'xyinput.value',
        type: 'xyinput.type',
        placeholder: 'xyinput.placeholder',
        'caret-color': 'xyinput.caretColor',
        'background-color': 'xyinput.bgColor'
    }
});
