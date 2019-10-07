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
        this.cursor = this.data.value.length;
        this.el.classList.add("collidable");
        this.el.setAttribute("tabindex", 0);
        let xyrect = this.el.components.xyrect;
        this.el.setAttribute("geometry", {
            primitive: "xy-rounded-rect", width: xyrect.width, height: xyrect.height
        });
        this.el.addEventListener('xyresize', (ev) => {
            this.el.setAttribute("geometry", { width: ev.detail.xyrect.width, height: ev.detail.xyrect.height });
        });
        this.el.setAttribute("material", { color: "white" });
        this.el.addEventListener("click", ev => {
            this.el.focus();
            if (this.data.softwareKeyboard) {
                let kbd = document.querySelector("[xykeyboard]");
                if (kbd) {
                    kbd.components.xykeyboard.show(this.data.valueType);
                }
            }
        });
        this.el.addEventListener('blur', (ev) => {
            this.update();
        });
        this.el.addEventListener('focus', (ev) => {
            this.update();
        });
        this.el.addEventListener("keydown", ev => {
            if (ev.code == "Enter" || ev.key == "Shift" || ev.code == "Escape") {
            } else if (ev.code == "ArrowLeft") {
                if (this.cursor > 0) {
                    this.cursor--;
                    this.update();
                }
            } else if (ev.code == "ArrowRight") {
                if (this.cursor < this.el.value.length) {
                    this.cursor++;
                    this.update();
                }
            } else if (ev.code == "Backspace") {
                if (this.cursor > 0) {
                    let s = this.el.value;
                    this.el.value = s.slice(0, this.cursor - 1) + s.slice(this.cursor);
                    this.cursor--;
                    this.el.setAttribute("xyinput", "value", this.el.value);
                }
            } else if (ev.key) {
                let s = this.el.value;
                this.el.value = s.slice(0, this.cursor) + ev.key + s.slice(this.cursor);
                this.cursor += ev.key.length;
                this.el.setAttribute("xyinput", "value", this.el.value);
            }
        });
    },
    update() {
        let s = this.data.value;
        this.el.value = s;
        if (this.cursor > this.el.value.length) {
            this.cursor = this.el.value.length;
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
        keyPitch: { default: 0.3 },
        targets: { default: ["a-xyinput"] },
    },
    blocks: {
        main: {
            size: [11, 4],
            layout: [
                { position: [0, 3], keys: ["qQ!", "wW@", "eE#", "rR$", "tT%", "yY^", "uU&", "iI*", "oO(", "pP)"] },
                { position: [.5, 2], keys: ["aA", "sS", "dD", "fF", "gG~", "hH`", "jJ'", "kK\"", "lL(", ":;)"] },
                { position: [0, 1], keys: [{ code: "Shift", label: "^" }, "zZ", "xX", "cC", "vV", "bB", "nN", "mM{", "..}", "/?\\"] },
                { position: [0, 0], keys: [{ code: "Space" }] },
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
            size: [3, 4],
            layout: [
                { position: [0, 3], keys: [{ code: "Backspace", label: "BS" }] },
                { position: [0, 2], keys: [{ code: "Space", label: "SP" }] },
                { position: [0, 1], keys: [{ code: "Enter", label: "Ok" }] },
                { position: [0, 0], keys: [{ code: "ArrowLeft", label: "⇦" }, { code: "ArrowRight", label: "⇨" }] },
            ]
        }
    },
    init() {

    },
    show(type) {
        this.target = null;
        this.hide();
        if (type == "number") {
            this._createKeys(this.blocks.num, this.data.keyPitch);
            this._createKeys(this.blocks.ctrl, this.data.keyPitch).setAttribute("position", "x", 3 * this.data.keyPitch);
        } else {
            this._createKeys(this.blocks.main, this.data.keyPitch);
            this._createKeys(this.blocks.ctrl, this.data.keyPitch).setAttribute("position", "x", 6 * this.data.keyPitch);
        }
    },
    hide() {
        while (this.el.firstChild) {
            this.el.removeChild(this.el.firstChild);
        }
    },
    _createKeys(block, sz) {
        let pane = document.createElement("a-entity");
        let padding = sz * 0.5;
        let keySize = sz * 0.9;
        pane.setAttribute("geometry", {
            primitive: "xy-rounded-rect", width: block.size[0] * sz + padding, height: block.size[1] * sz
        });
        pane.setAttribute("material", {
            color: "#335599"
        });
        let keyidx = 0;
        for (let row of block.layout) {
            let keyrow = document.createElement("a-xycontainer");
            keyrow.setAttribute("direction", "row");
            keyrow.setAttribute("spacing", 0);
            keyrow.setAttribute("position", { x: row.position[0] * sz, y: row.position[1] * sz - (block.size[1] - 1) * sz / 2, z: 0.02 });
            for (let key of row.keys) {
                let keyEl = document.createElement("a-xybutton");
                keyEl.setAttribute("xyrect", { width: sz, height: sz });
                keyEl.setAttribute("material", {
                    visible: false
                });
                keyrow.appendChild(keyEl);
                keyEl.dataset.keyData = key;
                if (key.code) {
                    let label = key.label || key.code;
                    keyEl.setAttribute("xylabel", { value: label, align: "center" });
                } else {
                    keyEl.setAttribute("xylabel", { value: key[0], align: "center" });
                }
                keyEl.addEventListener('mouseenter', () => keyEl.setAttribute("material", "visible", true));
                keyEl.addEventListener('mouseleave', () => keyEl.setAttribute("material", "visible", false));
                keyEl.addEventListener("mousedown", ev => {
                    if (key.code == "Fn") {
                        keyidx = keyidx == 2 ? 0 : 2;
                        return;
                    }
                    if (document.activeElement == document.body && this.target) {
                        this.target.focus();
                    }
                    this.target = document.activeElement;
                    if (this.data.targets.includes(document.activeElement.tagName.toLowerCase())) {
                        let data = key.code ? { code: key.code, key: key.code == "Space" ? " " : key.code } : { key: key[keyidx] || key[0] };
                        document.activeElement.dispatchEvent(new KeyboardEvent("keydown", data));
                    }
                    if (key.code == "Enter") {
                        this.hide();
                    }
                    if (key.code == "Shift") {
                        // toggle
                        keyidx = (keyidx + 1) % 2;
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
