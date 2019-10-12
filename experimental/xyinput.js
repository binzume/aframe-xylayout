"use strict";

AFRAME.registerComponent('xyinput', {
    dependencies: ['xylabel'],
    schema: {
        value: { default: "" },
        valueType: { default: "" },
        caretColor: { default: "#0088ff" },
        softwareKeyboard: { default: true },
    },
    init() {
        let data = this.data, el = this.el, xyrect = el.components.xyrect;
        this.caretObj = new THREE.Mesh(
            new THREE.PlaneGeometry(0.04, xyrect.height * 0.9),
            new THREE.MeshBasicMaterial({ color: this.data.caretColor }));
        this.el.object3D.add(this.caretObj);
        this.caretObj.position.z = 0.05;

        Object.defineProperty(el, 'value', {
            get: () => data.value,
            set: (v) => el.setAttribute('xyinput', 'value', "" + v)
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
        el.addEventListener("keypress", ev => {
            if (ev.code == "Enter") return;
            let pos = this.cursor, s = data.value;
            this.cursor += ev.key.length;
            el.value = s.slice(0, pos) + ev.key + s.slice(pos);
        });
        this.oncopy_ = this.oncopy_.bind(this);
        this.onpaste_ = this.onpaste_.bind(this);
        window.addEventListener("copy", this.oncopy_);
        window.addEventListener("paste", this.onpaste_);

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
            }
        });
    },
    update(oldData) {
        let s = this.data.value;
        if (this.data.valueType == "password") {
            s = s.replace(/./g, '*');
        }
        this.el.setAttribute("xylabel", "value", s);
        if (this.cursor > s.length || oldData && oldData.value != null && this.lastcursor == oldData.value.length) {
            this.cursor = s.length;
        }
        this.lastcursor = this.cursor;
        this.caretObj.visible = document.activeElement == this.el;
        if (document.activeElement == this.el) {
            setTimeout(() => {
                let xylabel = this.el.components.xylabel, xyrect = this.el.components.xyrect;
                if (this.cursor == 0) {
                    this.caretObj.position.x = (- 0.5) * xyrect.width;
                } else if (xylabel.canvas) {
                    let ctx = xylabel.canvas.getContext("2d");
                    let w = ctx.measureText(s.slice(0, this.cursor)).width / xylabel.textWidth;
                    this.caretObj.position.x = (w - 0.5) * xyrect.width;
                } else if (this.el.components.text) {
                    let textLayout = this.el.components.text.geometry.layout;
                    let glyphs = textLayout.glyphs;
                    let p = Math.max(0, this.cursor - (s.length - glyphs.length)); // spaces...
                    let g = glyphs[Math.min(p, glyphs.length - 1)];
                    let gpos = g ? g.position[0] + g.data.width * (p >= glyphs.length ? 1 : 0.1) : 0;
                    this.caretObj.position.x = (gpos / textLayout.width - 0.5) * xyrect.width;
                }
            }, 0);
        }
    },
    remove() {
        window.removeEventListener("copy", this.oncopy_);
        window.removeEventListener("paste", this.onpaste_);
    },
    oncopy_(ev) {
        if (document.activeElement == this.el) {
            ev.clipboardData.setData("text/plain", this.el.value);
            ev.preventDefault();
        }
    },
    onpaste_(ev) {
        if (document.activeElement == this.el) {
            let pos = this.cursor, s = this.data.value;
            let t = ev.clipboardData.getData("text/plain");
            this.cursor += t.length;
            this.el.value = s.slice(0, pos) + t + s.slice(pos);
            ev.preventDefault();
        }
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
        this.onkeydown_ = this.onkeydown_.bind(this);
        document.body.addEventListener("keydown", this.onkeydown_, true);
        document.body.addEventListener("keypress", this.onkeydown_, true);
        this.temp = "";
        this.kana = "";
        this.suggestions = [];
        this.suggestionIdx = 0;
        this.enable = false;
    },
    onkeydown_(ev) {
        if (ev.code == "CapsLock" && ev.shiftKey || ev.key == "HiraganaKatakana") {
            this.enable = !this.enable;
        } else if (!ev.code || !this.enable || ev.target == document.body) {
            return;
        }
        if (ev.type == "keypress") {
            if (this.suggestions.length > 0) {
                if (ev.code == "Space") {
                    this.suggestionIdx = (this.suggestionIdx + 1) % this.suggestions.length;
                    this.kana = this.suggestions[this.suggestionIdx];
                    this.data.label.setAttribute("value", this.kana);
                    ev.stopPropagation();
                    return;
                }
            }
            this.suggestions = [];
            if (ev.key.match(/^[a-z-]$/)) {
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
                }
                ev.stopPropagation();
            } else if (ev.code == "Space" && (this.kana || this.temp)) {
                //  https://www.google.co.jp/ime/cgiapi.html
                this.kana += this.temp;
                (async (str) => {
                    let response = await fetch(`https://www.google.com/transliterate?langpair=ja-Hira|ja&text=${str},`);
                    let result = await response.json();
                    this.suggestions = result[0][1];
                    this.suggestionIdx = 0;
                    this.kana = result[0][1][0];
                    this.data.label.setAttribute("value", this.kana);
                })(this.kana);
                this.kana = "";
                this.temp = "";
                ev.stopPropagation();
            } else if (this.kana || this.temp) {
                this.kana += this.temp + ev.key;
                this.temp = "";
                ev.stopPropagation();
            }
        } else if (this.kana || this.temp) {
            if (ev.code == "Enter" && (this.kana || this.temp)) {
                ev.target.dispatchEvent(new KeyboardEvent("keypress", { key: this.kana + this.temp }));
                this.temp = "";
                this.kana = "";
                this.suggestions = [];
            } else if (ev.code == "Backspace" && (this.kana || this.temp)) {
                if (this.temp) {
                    this.temp = this.temp.slice(0, -1);
                } else {
                    this.kana = this.kana.slice(0, -1);
                }
            }
            ev.stopPropagation();
        }
        if (this.data.label) {
            this.data.label.setAttribute("value", this.kana + this.temp);
        }
    },
    remove() {
        document.body.removeEventListener("keydown", this.onkeydown_, true);
        document.body.removeEventListener("keypress", this.onkeydown_, true);
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
                { position: [0, 3], keys: [{ code: "Backspace", label: "⌫", size: 2 }] },
                { position: [0, 2], keys: [{ code: "Space", label: "SP", size: 2 }] },
                { position: [0, 1], keys: [{ code: "Enter", label: "⏎", size: 2 }] },
                { position: [1.3, 3.5], keys: [{ code: "_Close", label: "x", size: 0.8 }] },
                { position: [0, 0], keys: [{ code: "ArrowLeft", label: "⇦" }, { code: "ArrowRight", label: "⇨" }] },
            ]
        }
    },
    show(type) {
        this.target = null;
        this.keyidx = 0;
        this.hide();
        let excludes = this.data.kana ? [] : ["HiraganaKatakana"];
        if (type == "number") {
            let w = this.blocks.num.size[0] + this.blocks.ctrl.size[0];
            this.createKeys_(this.blocks.num, this.data.keyPitch);
            this.createKeys_(this.blocks.ctrl, this.data.keyPitch).setAttribute("position", "x", (w / 2 + 0.4) * this.data.keyPitch);
        } else if (type == "full") {
            let w = this.blocks.main.size[0] + this.blocks.ctrl.size[0];
            this.createKeys_(this.blocks.main, this.data.keyPitch, excludes);
            this.createKeys_(this.blocks.ctrl, this.data.keyPitch, ["Space"]).setAttribute("position", "x", (w / 2 + 0.4) * this.data.keyPitch);
            w += this.blocks.ctrl.size[0] + this.blocks.num.size[0];
            this.createKeys_(this.blocks.num, this.data.keyPitch).setAttribute("position", "x", (w / 2 + 0.8) * this.data.keyPitch);
        } else {
            let w = this.blocks.main.size[0] + this.blocks.ctrl.size[0];
            this.createKeys_(this.blocks.main, this.data.keyPitch, excludes);
            this.createKeys_(this.blocks.ctrl, this.data.keyPitch, ["Space"]).setAttribute("position", "x", (w / 2 + 0.4) * this.data.keyPitch);
        }
        if (this.data.kana) {
            let convText = document.createElement("a-xylabel");
            convText.setAttribute("color", "yellow");
            convText.setAttribute("position", { x: 0, y: 2 * this.data.keyPitch * 0.95, z: 0.03 });
            convText.setAttribute("xyrect", { width: 8 * this.data.keyPitch, height: this.data.keyPitch * 0.6 });
            convText.setAttribute("xykana", { label: convText });
            this.el.appendChild(convText);
        }
    },
    hide() {
        while (this.el.firstChild) {
            this.el.removeChild(this.el.firstChild);
        }
    },
    createKeys_(block, sz, excludes = []) {
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
                        this.updateSymbols_();
                        return;
                    }
                    if (key.code == "_Close") {
                        this.hide();
                        return;
                    }
                    if (key.code == "Shift") {
                        this.keyidx = (this.keyidx + 1) % 2;
                        this.updateSymbols_();
                    }

                    if (this.data.targets.includes(document.activeElement.tagName.toLowerCase())) {
                        let data = key.code ? { code: key.code, key: key.key || key.code }
                            : { key: key[this.keyidx] || key[0], code: "Key" + key[0].toUpperCase() };
                        document.activeElement.dispatchEvent(new KeyboardEvent("keydown", data));
                        if (!key.code || key.key) {
                            document.activeElement.dispatchEvent(new KeyboardEvent("keypress", data));
                        }
                    }
                });
            }
            pane.appendChild(keyrow);
        }
        this.el.appendChild(pane);
        return pane;
    },
    updateSymbols_() {
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
        'physical-keys': 'xykeyboard.physicalKeys'
    }
});

AFRAME.registerPrimitive('a-xyinput', {
    defaultComponents: {
        xyrect: { width: 2, height: 0.5 },
        xylabel: { color: 'black' },
        xyinput: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        value: 'xyinput.value',
        type: 'xyinput.valueType',
        'caret-color': 'xyinput.caretColor'
    }
});
