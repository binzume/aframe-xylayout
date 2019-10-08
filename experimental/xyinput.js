"use strict";
// [WIP] Software keyboard
// TODO: Japanese Input https://www.google.co.jp/ime/cgiapi.html

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
            if (ev.code == "Enter" || ev.key == "Shift" || ev.code == "Escape") {
            } else if (ev.code == "ArrowLeft") {
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
            } else if (ev.key) {
                this.cursor += ev.key.length;
                el.value = s.slice(0, pos) + ev.key + s.slice(pos);
            }
        });
    },
    update(oldData) {
        let s = this.data.value;
        if (oldData && oldData.value != null && this.cursor == oldData.value.length) {
            this.cursor = s.length;
        }
        if (this.cursor > s.length) {
            this.cursor = s.length;
        }
        if (document.activeElement == this.el) {
            s = s.slice(0, this.cursor) + "|" + s.slice(this.cursor);
        }
        this.el.setAttribute("xylabel", "value", s);
    }
});

AFRAME.registerComponent('xykeyboard', {
    schema: {
        type: { default: "" },
        keyPitch: { default: 0.2 },
        targets: { default: ["a-xyinput"] },
    },
    blocks: {
        main: {
            size: [11, 4],
            layout: [
                { position: [0, 3], keys: ["qQ!", "wW@", "eE#", "rR$", "tT%", "yY^", "uU&", "iI*", "oO(", "pP)"] },
                { position: [.5, 2], keys: ["aA1", "sS2", "dD3", "fF4", "gG5", "hH`", "jJ'", "kK\"", "lL[", ":;]"] },
                { position: [0, 1], keys: [{ code: "Shift", symbols: "⇧⬆" }, "zZ6", "xX7", "cC8", "vV9", "bB0", "nN~", "mM{", "..}", "/?\\"] },
                { position: [0, 0], keys: [{ code: "Space", label: "_", size: 4 }] },
                { position: [-4, 0], keys: [{ code: "Fn", label: "#?" }] },
            ]
        },
        num: {
            size: [4, 4],
            layout: [
                { position: [0, 3], keys: ["7", "8", "9", "/"] },
                { position: [0, 2], keys: ["4", "5", "6", "*"] },
                { position: [0, 1], keys: ["1", "2", "3", "-"] },
                { position: [0, 0], keys: ["0", ":", ".", "+"] },
            ]
        },
        ctrl: {
            size: [2, 4],
            layout: [
                { position: [0, 3], keys: [{ code: "Backspace", label: "⌫", size: 2 }] },
                { position: [0, 2], keys: [{ code: "Space", label: "SP", size: 2 }] },
                { position: [0, 1], keys: [{ code: "Enter", label: "Ok", size: 2 }] },
                { position: [0, 0], keys: [{ code: "ArrowLeft", label: "⇦" }, { code: "ArrowRight", label: "⇨" }] },
            ]
        }
    },
    init() {

    },
    show(type) {
        this.target = null;
        this.keyidx = 0;
        this.hide();
        if (type == "number") {
            let w = this.blocks.num.size[0] + this.blocks.ctrl.size[0];
            this._createKeys(this.blocks.num, this.data.keyPitch);
            this._createKeys(this.blocks.ctrl, this.data.keyPitch).setAttribute("position", "x", (w / 2 + 0.6) * this.data.keyPitch);
        } else {
            let w = this.blocks.main.size[0] + this.blocks.ctrl.size[0];
            this._createKeys(this.blocks.main, this.data.keyPitch);
            this._createKeys(this.blocks.ctrl, this.data.keyPitch, ["Space"]).setAttribute("position", "x", (w / 2 + 0.6) * this.data.keyPitch);
        }
    },
    hide() {
        while (this.el.firstChild) {
            this.el.removeChild(this.el.firstChild);
        }
    },
    _createKeys(block, sz, excludes = []) {
        let pane = document.createElement("a-entity");
        let padding = sz * 0.5;
        pane.setAttribute("geometry", {
            primitive: "xy-rounded-rect", width: block.size[0] * sz + padding, height: block.size[1] * sz
        });
        pane.setAttribute("material", {
            color: "#222233"
        });
        for (let row of block.layout) {
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
                    if (key.code == "Fn") {
                        this.keyidx = this.keyidx == 2 ? 0 : 2;
                        this._updateSymbols();
                        return;
                    }
                    if (key.code == "Shift") {
                        this.keyidx = (this.keyidx + 1) % 2;
                        this._updateSymbols();
                    }
                    if (document.activeElement == document.body && this.target) {
                        this.target.focus();
                    }
                    this.target = document.activeElement;
                    if (this.data.targets.includes(document.activeElement.tagName.toLowerCase())) {
                        let data = key.code ? { code: key.code, key: key.code == "Space" ? " " : key.code } : { key: key[this.keyidx] || key[0] };
                        document.activeElement.dispatchEvent(new KeyboardEvent("keydown", data));
                    }
                    if (key.code == "Enter") {
                        this.hide();
                    }
                    setTimeout(() => this.target.focus(), 0);
                    ev.preventDefault();
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
