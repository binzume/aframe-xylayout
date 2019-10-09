"use strict";

AFRAME.registerComponent('xyinput', {
    dependencies: ['xylabel'],
    schema: {
        value: { default: "" },
        valueType: { default: "" },
        softwareKeyboard: { default: true },
    },
    init() {
        let data = this.data, el = this.el, xyrect = el.components.xyrect;
        Object.defineProperty(el, 'value', {
            get: () => data.value,
            set: (v) => el.setAttribute("xyinput", "value", "" + v)
        });
        this.cursor = data.value.length;
        el.classList.add("collidable");
        el.setAttribute("tabindex", 0);
        el.setAttribute("geometry", {
            primitive: "xy-rounded-rect", width: xyrect.width, height: xyrect.height
        });
        el.addEventListener('xyresize', (ev) => {
            el.setAttribute("geometry", { width: ev.detail.xyrect.width, height: ev.detail.xyrect.height });
        });
        el.setAttribute("material", { color: "white" });
        el.addEventListener("click", ev => {
            el.focus();
            if (data.softwareKeyboard) {
                let kbd = document.querySelector("[xykeyboard]");
                if (kbd) {
                    kbd.components.xykeyboard.show(data.valueType);
                }
            }
        });
        el.addEventListener('blur', (ev) => this.update());
        el.addEventListener('focus', (ev) => this.update());
        el.addEventListener("keydown", ev => {
            let pos = this.cursor, s = data.value;
            if (ev.code == "ArrowLeft") {
                if (pos > 0) {
                    this.cursor--;
                    this.update();
                }
            } else if (ev.code == "ArrowRight") {
                if (pos < s.length) {
                    this.cursor++;
                    this.update();
                }
            } else if (ev.code == "Backspace") {
                if (pos > 0) {
                    this.cursor--;
                    el.value = s.slice(0, pos - 1) + s.slice(pos);
                }
            } else if (["Enter", "Escape", "CapsLock"].includes(this.code) || ev.key == "Shift" || ev.key == "HiraganaKatakana") {
            } else if (ev.key) {
                this.cursor += ev.key.length;
                el.value = s.slice(0, pos) + ev.key + s.slice(pos);
            }
        });
    },
    update(oldData) {
        let s = this.data.value;
        if (this.cursor > s.length || oldData && oldData.value != null && this.cursor == oldData.value.length) {
            this.cursor = s.length;
        }
        if (document.activeElement == this.el) {
            s = s.slice(0, this.cursor) + "|" + s.slice(this.cursor);
        }
        this.el.setAttribute("xylabel", "value", s);
    }
});

AFRAME.registerComponent('xykana', {
    schema: {
        label: { default: null, type: "selector" }
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
        this._onkeydown = this._onkeydown.bind(this);
        document.body.addEventListener("keydown", this._onkeydown, true);
        this.temp = "";
        this.kana = "";
        this.enable = false;
    },
    _onkeydown(ev) {
        if (ev.code == "CapsLock" && ev.shiftKey || ev.key == "HiraganaKatakana") {
            this.enable = !this.enable;
        } else if (!ev.code || !this.enable) {
            return;
        }
        if (ev.key.match(/^[a-z-]$/)) {
            ev.stopPropagation();
            this.temp += ev.key;
            let temp = this.temp.replace(/l([aiueo])/g, "x$1")
                .replace(/n([ksthmyrwgzbpdjfv])/g, "nn$1")
                .replace(/([ksthmyrwgzbpdjfv])\1/g, "xtu$1")
                .replace(/([kstnhmrgzbpdjf])y([aiueo])/g, "$1ixy$2")
                .replace(/(j|ch|sh)([aueo])/g, "$1ixy$2")
                .replace(/(f|v|ts)([aieo])/g, "$1ux$2");
            let lastMatch = 0;
            for (let p = 0; p < temp.length; p++) {
                for (let l = 3; l >= 0; l--) {
                    let t = this.table[temp.slice(p, p + l)];
                    if (t) {
                        temp = temp.slice(0, p) + t + temp.slice(p + l);
                        lastMatch = p + t.length;
                        break;
                    }
                }
            }
            if (lastMatch == 0 && temp.length > 3) { lastMatch = temp.length - 3; }
            if (lastMatch > 0) {
                this.temp = temp.slice(lastMatch);
                this.kana += temp.slice(0, lastMatch);
                if (!this.data.label) {
                    // TODO
                    ev.target.dispatchEvent(new KeyboardEvent("keydown", { key: temp.slice(0, lastMatch) }));
                }
            }
        } else if (ev.code == "Backspace" && (this.kana || this.temp)) {
            if (this.temp) {
                this.temp = this.temp.slice(0, -1);
            } else {
                this.kana = this.kana.slice(0, -1);
            }
            ev.stopPropagation();
        } else if (ev.code == "Space" && this.kana) {
            //  https://www.google.co.jp/ime/cgiapi.html
            // TODO: select from candidates.
            (async (str) => {
                let response = await fetch(`http://www.google.com/transliterate?langpair=ja-Hira|ja&text=${str},`);
                let result = await response.json();
                console.log(result);
                ev.target.dispatchEvent(new KeyboardEvent("keydown", { key: result[0][1][0] || str }));
            })(this.kana);

            this.kana = "";
            ev.stopPropagation();
        } else if (this.kana || this.temp) {
            ev.target.dispatchEvent(new KeyboardEvent("keydown", { key: this.kana + this.temp }));
            this.temp = "";
            this.kana = "";
        }
        if (this.data.label) {
            this.data.label.setAttribute("value", this.kana + this.temp);
        }
    },
    remove() {
        document.body.removeEventListener("keydown", this._onkeydown, true);
    }
});

AFRAME.registerComponent('xykeyboard', {
    schema: {
        type: { default: "" },
        keyPitch: { default: 0.2 },
        targets: { default: ["a-xyinput"] },
        kana: { default: false },
    },
    blocks: {
        main: {
            size: [11, 4],
            rows: [
                { position: [0, 3], keys: ["qQ!", "wW@", "eE#", "rR$", "tT%", "yY^", "uU&", "iI*", "oO(", "pP)", "=+-"] },
                { position: [0, 2], keys: ["aA1", "sS2", "dD3", "fF4", "gG5", "hH`", "jJ'", "kK\"", "lL[", ":;]"] },
                { position: [0, 1], keys: [{ code: "Shift", symbols: "⇧⬆" }, "zZ6", "xX7", "cC8", "vV9", "bB0", "nN{", "mM}", ",~<", "._>", "/?\\"] },
                { position: [0, 0], keys: [{ code: "Space", label: "_", size: 4 }] },
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
                { position: [0, 3], keys: [{ code: "Backspace", label: "⌫", size: 2 }] },
                { position: [0, 2], keys: [{ code: "Space", label: "SP", size: 2 }] },
                { position: [0, 1], keys: [{ code: "Enter", label: "Ok", size: 2 }] },
                { position: [0, 0], keys: [{ code: "ArrowLeft", label: "⇦" }, { code: "ArrowRight", label: "⇨" }] },
            ]
        }
    },
    show(type) {
        this.target = null;
        this.keyidx = 0;
        this.hide();
        if (this.data.kana) {
            let convText = document.createElement("a-xylabel");
            convText.setAttribute("color", "yellow");
            convText.setAttribute("position", { x: 0, y: 2 * this.data.keyPitch * 0.95, z: 0 });
            convText.setAttribute("xyrect", { width: 8 * this.data.keyPitch, height: this.data.keyPitch * 0.6 });
            convText.setAttribute("xykana", { label: convText });
            this.el.appendChild(convText);
        }
        let excludes = this.data.kana ? [] : ["HiraganaKatakana"];
        if (type == "number") {
            let w = this.blocks.num.size[0] + this.blocks.ctrl.size[0];
            this._createKeys(this.blocks.num, this.data.keyPitch);
            this._createKeys(this.blocks.ctrl, this.data.keyPitch).setAttribute("position", "x", (w / 2 + 0.4) * this.data.keyPitch);
        } else if (type == "full") {
            let w = this.blocks.main.size[0] + this.blocks.ctrl.size[0];
            this._createKeys(this.blocks.main, this.data.keyPitch, excludes);
            this._createKeys(this.blocks.ctrl, this.data.keyPitch, ["Space"]).setAttribute("position", "x", (w / 2 + 0.4) * this.data.keyPitch);
            w += this.blocks.ctrl.size[0] + this.blocks.num.size[0];
            this._createKeys(this.blocks.num, this.data.keyPitch).setAttribute("position", "x", (w / 2 + 0.8) * this.data.keyPitch);
        } else {
            let w = this.blocks.main.size[0] + this.blocks.ctrl.size[0];
            this._createKeys(this.blocks.main, this.data.keyPitch, excludes);
            this._createKeys(this.blocks.ctrl, this.data.keyPitch, ["Space"]).setAttribute("position", "x", (w / 2 + 0.4) * this.data.keyPitch);
        }
    },
    hide() {
        while (this.el.firstChild) {
            this.el.removeChild(this.el.firstChild);
        }
    },
    _createKeys(block, sz, excludes = []) {
        let pane = document.createElement("a-entity");
        let padding = sz * 0.3;
        pane.setAttribute("geometry", {
            primitive: "xy-rounded-rect", width: block.size[0] * sz + padding, height: block.size[1] * sz + padding
        });
        pane.setAttribute("material", {
            color: "#222233"
        });
        for (let row of block.rows) {
            let keyrow = document.createElement("a-xycontainer");
            keyrow.setAttribute("direction", "row");
            keyrow.setAttribute("spacing", 0);
            keyrow.setAttribute("position", { x: row.position[0] * sz, y: row.position[1] * sz - (block.size[1] - 1) * sz / 2, z: 0.02 });
            for (let key of row.keys) {
                if (key.code && excludes.includes(key.code)) {
                    continue;
                }
                let keyEl = document.createElement("a-xybutton");
                keyEl.setAttribute("xyrect", { width: (key.size || 1) * sz, height: sz });
                keyEl.setAttribute("material", {
                    visible: false
                });
                keyrow.appendChild(keyEl);
                let label = key.label || key.code;
                if (key.symbols || typeof key === 'string') {
                    keyEl.classList.add('xyinput-key');
                    keyEl.dataset.keySymbols = key.symbols || key;
                    label = keyEl.dataset.keySymbols[0];
                }
                keyEl.setAttribute("xylabel", { value: label, align: "center" });
                keyEl.addEventListener('mouseenter', () => keyEl.setAttribute("material", "visible", true));
                keyEl.addEventListener('mouseleave', () => keyEl.setAttribute("material", "visible", false));
                keyEl.addEventListener("mousedown", ev => {
                    if (document.activeElement == document.body && this.target) {
                        this.target.focus();
                    }
                    this.target = document.activeElement;
                    setTimeout(() => this.target.focus(), 0);
                    ev.preventDefault();

                    if (key.code == "_Fn") {
                        this.keyidx = this.keyidx == 2 ? 0 : 2;
                        this._updateSymbols();
                        return;
                    }
                    if (key.code == "_Close") {
                        this.hide();
                        return;
                    }
                    if (key.code == "Shift") {
                        this.keyidx = (this.keyidx + 1) % 2;
                        this._updateSymbols();
                    }

                    if (this.data.targets.includes(document.activeElement.tagName.toLowerCase())) {
                        let data = key.code ? { code: key.code, key: key.code == "Space" ? " " : key.code }
                            : { key: key[this.keyidx] || key[0], code: "key" + key[0] };
                        document.activeElement.dispatchEvent(new KeyboardEvent("keydown", data));
                    }
                    if (key.code == "Enter") {
                        this.hide();
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
            keyEl.setAttribute('xylabel', 'value', s[this.keyidx] || s[0]);
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
        "physical-keys": 'xykeyboard.physicalKeys'
    }
});

AFRAME.registerPrimitive('a-xyinput', {
    defaultComponents: {
        xyrect: { width: 2, height: 0.5 },
        xylabel: { color: "black" },
        xyinput: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        value: 'xyinput.value',
        "value-type": 'xyinput.valueType'
    }
});
