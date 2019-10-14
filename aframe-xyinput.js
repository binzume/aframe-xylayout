"use strict";

AFRAME.registerComponent('xyinput', {
    dependencies: ['xylabel'],
    schema: {
        value: { default: "" },
        type: { default: "" },
        placeholder: { default: "" },
        caretColor: { default: "#0088ff" },
        bgColor: { default: "white" },
        virtualKeyboard: { default: true },
    },
    init() {
        let data = this.data, el = this.el, xyrect = el.components.xyrect;
        this._caretObj = new THREE.Mesh(
            new THREE.PlaneGeometry(0.04, xyrect.height * 0.9),
            new THREE.MeshBasicMaterial({ color: data.caretColor }));
        this.el.object3D.add(this._caretObj);
        this._caretObj.position.z = 0.02;

        let insertString = (v) => {
            let pos = this.cursor, s = el.value;
            this.cursor += v.length;
            el.value = s.slice(0, pos) + v + s.slice(pos);
        };

        Object.defineProperty(el, 'value', {
            get: () => data.value,
            set: (v) => el.setAttribute('xyinput', 'value', "" + v)
        });

        el.classList.add('collidable');
        let updateGeometory = () => {
            el.setAttribute('geometry', {
                primitive: 'xy-rounded-rect', width: xyrect.width, height: xyrect.height
            });
        };
        updateGeometory();
        el.setAttribute('material', { color: data.bgColor });
        el.setAttribute('tabindex', 0);
        el.addEventListener('xyresize', updateGeometory);
        el.addEventListener('click', ev => {
            el.focus();
            if (data.virtualKeyboard) {
                let kbd = document.querySelector("[xykeyboard]");
                if (kbd) {
                    kbd.components.xykeyboard.show(data.type);
                }
            }
            let intersection = ev.detail.intersection;
            if (intersection) {
                let v = intersection.uv.x;
                let min = 0, max = this.el.value.length + 1, p = 0;
                while (max - min >= 2) {
                    p = min + ((max - min) / 2 | 0);
                    if (this._caretpos(p) < v) {
                        min = p;
                    } else {
                        max = p;
                    }
                }
                this._updateCursor(p);
            }
        });
        this._oncopy = (ev) => {
            if (document.activeElement == el) {
                ev.clipboardData.setData('text/plain', el.value);
                ev.preventDefault();
            }
        };
        this._onpaste = (ev) => {
            if (document.activeElement == el) {
                insertString(ev.clipboardData.getData('text/plain'));
                ev.preventDefault();
            }
        };
        window.addEventListener('copy', this._oncopy);
        window.addEventListener('paste', this._onpaste);
        el.addEventListener('blur', (ev) => this._updateCursor(this.cursor));
        el.addEventListener('focus', (ev) => this._updateCursor(this.cursor));
        el.addEventListener('keypress', ev => {
            if (ev.code != 'Enter') {
                insertString(ev.key);
            }
        });
        el.addEventListener('keydown', ev => {
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
        let s = this.el.value, p = this.cursor;
        if (p > s.length || oldData.value == null) {
            p = s.length;
        }
        if (this.data.type == 'password') {
            s = s.replace(/./g, '*');
        }
        this.el.setAttribute('xylabel', 'color', s ? "black" : "#aaa");
        this.el.setAttribute('xylabel', 'value', s || this.data.placeholder);
        this._updateCursor(p);
    },
    _updateCursor(p) {
        let caretObj = this._caretObj;
        this.cursor = p;
        caretObj.visible = false;
        if (document.activeElement == this.el) {
            setTimeout(() => {
                caretObj.position.x = this._caretpos(p);
                caretObj.visible = true;
            }, 0);
        }
    },
    _caretpos(cursorPos) {
        let { xylabel, xyrect, text } = this.el.components;
        let s = this.el.value;
        let pos = 0; // [0,1]
        if (cursorPos == 0) {
        } else if (xylabel.canvas) {
            let ctx = xylabel.canvas.getContext('2d');
            pos = ctx.measureText(s.slice(0, cursorPos)).width / xylabel.textWidth;
        } else if (text) {
            let textLayout = text.geometry.layout;
            let glyphs = textLayout.glyphs;
            let p = Math.max(0, cursorPos - (s.length - glyphs.length)); // spaces...
            let g = glyphs[Math.min(p, glyphs.length - 1)];
            pos = g ? (g.position[0] + g.data.width * (p >= glyphs.length ? 1 : 0.1)) / textLayout.width : 0;
        }
        return (pos - 0.5) * xyrect.width + 0.04;
    },
    remove() {
        window.removeEventListener('copy', this._oncopy);
        window.removeEventListener('paste', this._onpaste);
    }
});

AFRAME.registerComponent('xykana', {
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
        'xtu': 'っ', 'nn': 'ん', 'wyi': 'ゐ', 'wye': 'ゑ',
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
            if (ev.key.match(/^[a-z-]$/)) {
                let temp = (this._kana + ev.key)
                    .replace(/l([aiueo])/g, "x$1")
                    .replace(/n([ksthmyrwgzbpdjfv])/g, "nn$1")
                    .replace(/([ksthmyrwgzbpdjfv])\1/g, "xtu$1")
                    .replace(/([kstnhmrgzbpdjf])y([aiueo])/g, "$1ixy$2")
                    .replace(/(j|ch|sh)([aueo])/g, "$1ixy$2")
                    .replace(/(f|v|ts)([aieo])/g, "$1ux$2");
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
        this.data.label.setAttribute('value', s);
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
        type: { default: "" },
        keySize: { default: 0.2 },
        kana: { default: false },
    },
    blocks: {
        main: {
            size: [11, 4],
            rows: [
                { position: [0, 3], keys: ["qQ!", "wW@", "eE#", "rR$", "tT%", "yY^", "uU&", "iI*", "oO(", "pP)", "-_="] },
                { position: [0, 2], keys: ["aA1", "sS2", "dD3", "fF4", "gG5", "hH`", "jJ~", "kK+", "lL[", ":;]"] },
                { position: [0, 1], keys: [{ code: "Shift", symbols: "⇧⬆" }, "zZ6", "xX7", "cC8", "vV9", "bB0", "nN{", "mM}", ",'<", ".\">", "/?\\"] },
                { position: [0, 0], keys: [{ code: "Space", key: " ", label: "_", size: 4 }] },
                { position: [-4.5, 0], keys: [{ code: "_Fn", label: "#!" }, { code: "HiraganaKatakana", label: "あ" }] },
            ]
        },
        num: {
            size: [4, 4],
            rows: [
                { position: [0, 3], keys: ["7", "8", "9", "/"] },
                { position: [0, 2], keys: ["4", "5", "6", "*"] },
                { position: [0, 1], keys: ["1", "2", "3", "-"] },
                { position: [0, 0], keys: ["0", ":", ".", "+"] },
            ]
        },
        ctrl: {
            size: [2, 4],
            rows: [
                { position: [0, 3], keys: [{ code: 'Backspace', label: "⌫", size: 2 }] },
                { position: [0, 2], keys: [{ code: 'Space', key: " ", label: "SP", size: 2 }] },
                { position: [0, 1], keys: [{ code: 'Enter', label: "⏎", size: 2 }] },
                { position: [1.3, 3.5], keys: [{ code: '_Close', label: "x", size: 0.8 }] },
                { position: [0, 0], keys: [{ code: 'ArrowLeft', label: "⇦" }, { code: 'ArrowRight', label: "⇨" }] },
            ]
        }
    },
    show(type) {
        this.hide();
        let keySize = this.data.keySize;
        let excludes = this.data.kana ? [] : ['HiraganaKatakana'];
        let blocks = this.blocks;
        if (type == 'number') {
            let w = blocks.num.size[0] + blocks.ctrl.size[0];
            this._createKeys(blocks.num, keySize);
            this._createKeys(blocks.ctrl, keySize).setAttribute('position', 'x', (w / 2 + 0.4) * keySize);
        } else if (type == 'full') {
            let w = blocks.main.size[0] + blocks.ctrl.size[0];
            this._createKeys(blocks.main, keySize, excludes);
            this._createKeys(blocks.ctrl, keySize, ["Space"]).setAttribute('position', 'x', (w / 2 + 0.4) * keySize);
            w += blocks.ctrl.size[0] + blocks.num.size[0];
            this._createKeys(blocks.num, keySize).setAttribute('position', 'x', (w / 2 + 0.8) * keySize);
        } else {
            let w = blocks.main.size[0] + blocks.ctrl.size[0];
            this._createKeys(blocks.main, keySize, excludes);
            this._createKeys(blocks.ctrl, keySize, ["Space"]).setAttribute('position', 'x', (w / 2 + 0.4) * keySize);
        }
        if (this.data.kana) {
            let convText = document.createElement("a-xylabel");
            convText.setAttribute('color', "yellow");
            convText.setAttribute('mode', "canvas");
            convText.setAttribute('position', { x: 0, y: 2 * keySize * 0.95, z: 0.03 });
            convText.setAttribute('xyrect', { width: 8 * keySize, height: keySize * 0.6 });
            convText.setAttribute('xykana', { label: convText });
            this.el.appendChild(convText);
        }
        this.el.setAttribute('xy-drag-control', 'draggable', '.xyinput-close');
        this._updateSymbols();
    },
    hide() {
        this._target = null;
        this._keyidx = 0;
        this.el.removeAttribute('xy-drag-control');
        while (this.el.firstChild) {
            this.el.removeChild(this.el.firstChild);
        }
    },
    _createKeys(block, sz, excludes = []) {
        let pane = document.createElement('a-entity');
        let padding = sz * 0.3;
        pane.setAttribute('geometry', {
            primitive: "xy-rounded-rect", width: block.size[0] * sz + padding, height: block.size[1] * sz + padding
        });
        pane.setAttribute("material", {
            color: "#222233"
        });
        for (let row of block.rows) {
            let keyrow = document.createElement('a-xycontainer');
            keyrow.setAttribute('direction', 'row');
            keyrow.setAttribute('spacing', 0);
            keyrow.setAttribute('position', { x: row.position[0] * sz, y: row.position[1] * sz - (block.size[1] - 1) * sz / 2, z: 0.02 });
            for (let key of row.keys) {
                if (key.code && excludes.includes(key.code)) {
                    continue;
                }
                let keyEl = document.createElement('a-xybutton');
                keyEl.setAttribute('material', 'visible', false);
                keyEl.setAttribute('xylabel', { value: key.label || "", align: 'center' });
                keyEl.setAttribute('xyrect', { width: (key.size || 1) * sz, height: sz });
                keyrow.appendChild(keyEl);
                if (key.symbols || typeof key === 'string') {
                    keyEl.classList.add('xyinput-key');
                    keyEl.dataset.keySymbols = key.symbols || key;
                }
                keyEl.addEventListener('mouseenter', (ev) => keyEl.setAttribute('material', 'visible', true));
                keyEl.addEventListener('mouseleave', (ev) => keyEl.setAttribute('material', 'visible', false));

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
                        this._keyidx = this._keyidx == 2 ? 0 : 2;
                        this._updateSymbols();
                        return;
                    }
                    if (key.code == 'Shift') {
                        this._keyidx = (this._keyidx + 1) % 2;
                        this._updateSymbols();
                    }

                    if (document.activeElement != document.body) {
                        let keydata = typeof key == 'string' ? { key: key } : key;
                        let k = keydata.key ? keydata.key[this._keyidx] || keydata.key[0] : keydata.code;
                        let eventdata = { key: k, code: keydata.code || "Key" + keydata.key[0].toUpperCase() };
                        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', eventdata));
                        if (keydata.key) {
                            document.activeElement.dispatchEvent(new KeyboardEvent('keypress', eventdata));
                        }
                    }
                });
            }
            pane.appendChild(keyrow);
        }
        this.el.appendChild(pane);
        return pane;
    },
    _updateSymbols() {
        for (let keyEl of this.el.querySelectorAll('.xyinput-key')) {
            let s = keyEl.dataset.keySymbols;
            keyEl.setAttribute('xylabel', 'value', s[this._keyidx] || s[0]);
        }
    },
    remove() {
    }
});

AFRAME.registerPrimitive('a-xykeyboard', {
    defaultComponents: {
        xykeyboard: {},
        rotation: { x: -20, y: 0, z: 0 }
    },
    mappings: {
        kana: 'xykeyboard.kana',
        type: 'xykeyboard.type',
        'physical-keys': 'xykeyboard.physicalKeys'
    }
});

AFRAME.registerPrimitive('a-xyinput', {
    defaultComponents: {
        xyrect: { width: 2, height: 0.5 },
        xylabel: {},
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
