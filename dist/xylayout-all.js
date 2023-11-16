AFRAME.registerComponent("css-borderline", {
    schema: {
        height: {
            default: 1,
            min: 0
        },
        width: {
            default: 1,
            min: 0
        },
        color: {
            default: ""
        },
        style: {
            default: "solid"
        },
        linewidth: {
            default: 1,
            min: 0
        },
        radiusBL: {
            default: 0,
            min: 0
        },
        radiusBR: {
            default: 0,
            min: 0
        },
        radiusTL: {
            default: 0,
            min: 0
        },
        radiusTR: {
            default: 0,
            min: 0
        }
    },
    update() {
        let data = this.data;
        let path = new THREE.Path();
        let w = (data.width || .01) / 2, h = (data.height || .01) / 2;
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
        let material = lstyle == "solid" ? new THREE.LineBasicMaterial({
            linewidth: lw,
            color: c
        }) : new THREE.LineDashedMaterial({
            linewidth: lw,
            color: c,
            gapSize: ls,
            dashSize: lstyle == "dashed" ? ls * 3 : ls
        });
        let line = new THREE.Line(geometry, material);
        if (lstyle != "solid") {
            line.computeLineDistances();
        }
        line.position.set(0, 0, .001);
        line.raycast = (() => {});
        this.el.setObject3D("css-borderline", line);
        this._setLineObj(line);
    },
    remove() {
        this.el.removeObject3D("css-borderline");
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

AFRAME.registerComponent("style", {
    dependencies: [ "xyrect" ],
    schema: {
        default: ""
    },
    _observer: null,
    _transformed: false,
    _transition: false,
    init() {
        let el = this.el;
        let style = getComputedStyle(el);
        if (style.pointerEvents != "none") {
            let cname = this._parseString(style.getPropertyValue("--collider-class")) || "collidable";
            let hover = this._parseString(style.getPropertyValue("--hover-alt-class")) || "_hover";
            el.classList.add(cname);
            el.addEventListener("mouseenter", ev => el.classList.add(hover));
            el.addEventListener("mouseleave", ev => el.classList.remove(hover));
        }
        let transitionstart = ev => {
            this._transition = true;
            this.play();
        };
        let transitionend = ev => this._transition = false;
        el.addEventListener("transitionstart", transitionstart);
        el.addEventListener("transitionend", transitionend);
        el.addEventListener("animationstart", transitionstart);
        el.addEventListener("animationend", transitionend);
        this._observer = new MutationObserver((mutationsList, _observer) => {
            if (mutationsList.some(r => [ "class", "style", "value" ].includes(r.attributeName))) {
                this._updateStyle();
            }
        });
        this._observer.observe(el, {
            attributes: true
        });
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
        el.setAttribute("visible", style.visibility != "hidden");
        if (el.childElementCount > 0) {
            this._updateLayout(el, style);
        } else {
            el.removeAttribute("xycontainer");
            if (el.components.xyinput) {
                el.setAttribute("xyinput", {
                    caretColor: style.caretColor,
                    color: style.color
                });
            } else {
                this._updateText(el, style);
            }
        }
        this._updateTransform(el, style);
    },
    _updateText(el, style) {
        let text = this._parseString(style.content);
        if (!text) {
            text = el.textContent.trim();
        }
        if (text || el.hasAttribute("xylabel")) {
            let align = style.textAlign;
            if (align == "start") {
                align = "left";
            }
            if (align == "end") {
                align = "right";
            }
            let attrs = {
                value: text,
                align: align
            };
            let c = this._parseColor(style.color);
            if (c[3] > 0) {
                attrs.color = style.color;
            }
            el.setAttribute("xylabel", attrs);
        }
    },
    _updateGeometry(el, style) {
        let w = this._parseSize(style.width, el.parentElement), h = this._parseSize(style.height, el.parentElement, true);
        if (w > 0 || h > 0) {
            el.setAttribute("xyrect", {
                width: w + this._parseSize(style.paddingInline) * 2,
                height: h + this._parseSize(style.paddingBlock) * 2
            });
        }
        let fixed = style.position == "fixed";
        let grow = parseInt(style.flexGrow), shrink = parseInt(style.flexShrink);
        if (fixed || grow || shrink) {
            el.setAttribute("xyitem", {
                fixed: fixed,
                grow: grow,
                shrink: shrink
            });
        }
        let g = el.getAttribute("geometry");
        if (g && g.primitive != "xy-rounded-rect") {
            el.setAttribute("material", {
                color: style.color,
                opacity: this._parseColor(style.color)[3]
            });
            return;
        }
        let bgcol = this._parseColor(style.backgroundColor);
        let bw = this._parseSizePx(style.borderWidth);
        if (bgcol[3] > 0 || style.pointerEvents != "none") {
            el.setAttribute("geometry", {
                primitive: "xy-rounded-rect",
                width: w,
                height: h,
                radiusBL: this._parseSize(style.borderBottomLeftRadius),
                radiusBR: this._parseSize(style.borderBottomRightRadius),
                radiusTL: this._parseSize(style.borderTopLeftRadius),
                radiusTR: this._parseSize(style.borderTopRightRadius)
            });
            el.setAttribute("material", {
                color: style.backgroundColor,
                opacity: bgcol[3],
                src: this._parseUrl(style.backgroundImage) || ""
            });
        }
        if (bw > 0) {
            el.setAttribute("css-borderline", {
                width: w,
                height: h,
                linewidth: bw,
                color: style.borderColor,
                style: style.borderStyle,
                radiusBL: this._parseSize(style.borderBottomLeftRadius),
                radiusBR: this._parseSize(style.borderBottomRightRadius),
                radiusTL: this._parseSize(style.borderTopLeftRadius),
                radiusTR: this._parseSize(style.borderTopRightRadius)
            });
        } else {
            el.removeAttribute("css-borderline");
        }
    },
    _updateLayout(el, style) {
        if (style.position == "fixed") {
            el.setAttribute("xyitem", {
                fixed: true
            });
        }
        el.setAttribute("xycontainer", {
            wrap: style.flexWrap,
            direction: style.flexDirection,
            spacing: this._parseSize(style.columnGap),
            alignContent: style.alignContent,
            justifyItems: [ "space-between", "space-around" ].includes(style.justifyContent) ? style.justifyContent : style.justifyItems,
            alignItems: style.alignItems
        });
    },
    _updateTransform(el, style) {
        this._transformed = this._transformed || style.transform != "none";
        if (this._transformed) {
            let t = new DOMMatrix(style.transform);
            let tr = new THREE.Vector3();
            let rot = new THREE.Quaternion();
            let sc = new THREE.Vector3();
            new THREE.Matrix4().set(t.m11, t.m21, t.m31, t.m41, t.m12, t.m22, t.m32, t.m42, t.m13, t.m23, t.m33, t.m43, t.m14, t.m24, t.m34, t.m44).decompose(tr, rot, sc);
            el.object3D.quaternion.copy(rot);
            el.object3D.scale.copy(sc);
            el.object3D.position.setZ(tr.z * 2.54 / 96 / 100);
        }
    },
    _parseSizePx(s, parent = null, v = false) {
        if (s.endsWith("%") && parent) {
            let style = getComputedStyle(parent);
            return this._parseSizePx(v ? style.height : style.width, parent.parentElement, v) * parseFloat(s.substring(0, s.length - 1)) * .01;
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
        if (m && (m[1] == "rgb" || m[1] == "rgba")) {
            let c = /^\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*(?:[,/]\s*(\d*\.?\d+)\s*)?$/.exec(m[2]);
            if (c) {
                return [ parseInt(c[1]), parseInt(c[2]), parseInt(c[3]), parseFloat(c[4] || "1") ];
            }
        }
        return [ 0, 0, 0, 0 ];
    }
});

"use strict";

AFRAME.registerComponent("xyinput", {
    dependencies: [ "xylabel" ],
    schema: {
        value: {
            default: ""
        },
        type: {
            default: ""
        },
        placeholder: {
            default: ""
        },
        caretColor: {
            default: "#0088ff"
        },
        color: {
            default: "black"
        },
        bgColor: {
            default: "white"
        }
    },
    init() {
        let data = this.data, el = this.el, xyrect = el.components.xyrect;
        let insertString = v => {
            let pos = this.cursor, s = el.value;
            this.cursor += v.length;
            el.value = s.slice(0, pos) + v + s.slice(pos);
        };
        Object.defineProperty(el, "value", {
            get: () => data.value,
            set: v => el.setAttribute("xyinput", "value", "" + v)
        });
        this._caretObj = new THREE.Mesh(new THREE.PlaneGeometry(.1, .9));
        el.setObject3D("caret", this._caretObj);
        XYTheme.get(el).createButton(xyrect.width, xyrect.height, null, {
            color: data.bgColor,
            hoverColor: data.bgColor
        }, false, el);
        el.setAttribute("tabindex", 0);
        let oncopy = ev => {
            ev.clipboardData.setData("text/plain", el.value);
            ev.preventDefault();
        };
        let onpaste = ev => {
            insertString(ev.clipboardData.getData("text/plain"));
            ev.preventDefault();
        };
        let self = this;
        this.events = {
            click(ev) {
                el.focus();
                el.emit("xykeyboard-request", data.type);
                let intersection = ev.detail.intersection;
                if (intersection) {
                    let v = intersection.uv.x;
                    let min = 0, max = el.value.length, p = 0;
                    while (max > min) {
                        p = min + ((max - min + 1) / 2 | 0);
                        if (self._caretpos(p) < v) {
                            min = p;
                        } else {
                            max = p - 1;
                        }
                    }
                    self._updateCursor(min);
                }
            },
            focus(ev) {
                self._updateCursor(self.cursor);
                window.addEventListener("copy", oncopy);
                window.addEventListener("paste", onpaste);
            },
            blur(ev) {
                self._updateCursor(self.cursor);
                window.removeEventListener("copy", oncopy);
                window.removeEventListener("paste", onpaste);
            },
            keypress(ev) {
                if (ev.code != "Enter") {
                    insertString(ev.key);
                }
            },
            keydown(ev) {
                let pos = self.cursor, s = el.value;
                if (ev.code == "ArrowLeft") {
                    if (pos > 0) {
                        self._updateCursor(pos - 1);
                    }
                } else if (ev.code == "ArrowRight") {
                    if (pos < s.length) {
                        self._updateCursor(pos + 1);
                    }
                } else if (ev.code == "Backspace") {
                    if (pos > 0) {
                        self.cursor--;
                        el.value = s.slice(0, pos - 1) + s.slice(pos);
                    }
                }
            }
        };
    },
    update(oldData) {
        let el = this.el, data = this.data;
        let s = el.value, cursor = this.cursor, len = s.length;
        if (cursor > len || oldData.value == null) {
            cursor = len;
        }
        el.setAttribute("xylabel", {
            color: s ? data.color : "#aaa",
            value: (data.type == "password" ? "*".repeat(len) : s) || data.placeholder
        });
        this._caretObj.material.color = new THREE.Color(data.caretColor);
        this._updateCursor(cursor);
    },
    _updateCursor(p) {
        let caretObj = this._caretObj;
        this.cursor = p;
        caretObj.visible = false;
        if (document.activeElement == this.el) {
            setTimeout(() => {
                let h = this.el.components.xyrect.height;
                caretObj.scale.set(h, h, 1);
                caretObj.position.set(this._caretpos(p) + h * .05, 0, .02);
                caretObj.visible = true;
            }, 0);
        }
    },
    _caretpos(cursorPos) {
        return this.el.components.xylabel.getPos(cursorPos);
    }
});

AFRAME.registerComponent("xyime", {
    schema: {
        label: {
            default: null,
            type: "selector"
        }
    },
    table: {
        a: "あ",
        i: "い",
        u: "う",
        e: "え",
        o: "お",
        ka: "か",
        ki: "き",
        ku: "く",
        ke: "け",
        ko: "こ",
        ga: "が",
        gi: "ぎ",
        gu: "ぐ",
        ge: "げ",
        go: "ご",
        sa: "さ",
        si: "し",
        su: "す",
        se: "せ",
        so: "そ",
        za: "ざ",
        zi: "じ",
        zu: "ず",
        ze: "ぜ",
        zo: "ぞ",
        ta: "た",
        ti: "ち",
        tu: "つ",
        te: "て",
        to: "と",
        da: "だ",
        di: "ぢ",
        du: "づ",
        de: "で",
        do: "ど",
        na: "な",
        ni: "に",
        nu: "ぬ",
        ne: "ね",
        no: "の",
        ha: "は",
        hi: "ひ",
        hu: "ふ",
        he: "へ",
        ho: "ほ",
        pa: "ぱ",
        pi: "ぴ",
        pu: "ぷ",
        pe: "ぺ",
        po: "ぽ",
        ba: "ば",
        bi: "び",
        bu: "ぶ",
        be: "べ",
        bo: "ぼ",
        ma: "ま",
        mi: "み",
        mu: "む",
        me: "め",
        mo: "も",
        ya: "や",
        yi: "い",
        yu: "ゆ",
        ye: "いぇ",
        yo: "よ",
        ra: "ら",
        ri: "り",
        ru: "る",
        re: "れ",
        ro: "ろ",
        wa: "わ",
        wi: "うぃ",
        wu: "う",
        we: "うぇ",
        wo: "を",
        xa: "ぁ",
        xi: "ぃ",
        xu: "ぅ",
        xe: "ぇ",
        xo: "ぉ",
        xya: "ゃ",
        xyi: "ぃ",
        xyu: "ゅ",
        xye: "ぇ",
        xyo: "ょ",
        xtu: "っ",
        xka: "ヵ",
        xke: "ヶ",
        nn: "ん",
        wyi: "ゐ",
        wye: "ゑ",
        fu: "ふ",
        vu: "ヴ",
        tsu: "つ",
        chi: "ち",
        ji: "じ",
        shi: "し",
        "-": "ー"
    },
    init() {
        this.enable = false;
        this._kana = "";
        this._suggestions = [];
        this._suggestionIdx = 0;
        this._onkeydown = this._onkeydown.bind(this);
        document.body.addEventListener("keydown", this._onkeydown, true);
        document.body.addEventListener("keypress", this._onkeydown, true);
    },
    remove() {
        document.body.removeEventListener("keydown", this._onkeydown, true);
        document.body.removeEventListener("keypress", this._onkeydown, true);
    },
    async convert(text, suggest) {
        let response = await fetch(`https://www.google.com/transliterate?langpair=ja-Hira|ja&text=${text},`);
        let result = await response.json();
        suggest(result[0][1]);
    },
    _onkeydown(ev) {
        if (ev.code == "CapsLock" && ev.shiftKey || ev.key == "HiraganaKatakana") {
            this.enable = !this.enable;
            this._confirm(ev.target);
            return;
        }
        if (!this.enable || !ev.code) {
            return;
        }
        if (ev.type == "keypress") {
            if (this._suggestions.length > 0) {
                if (ev.code == "Space") {
                    this._suggestionIdx = (this._suggestionIdx + 1) % this._suggestions.length;
                    this._updateStr(this._suggestions[this._suggestionIdx]);
                    ev.stopPropagation();
                    return;
                }
                this._confirm(ev.target);
            }
            if (ev.key.match(/^[^\s]$/)) {
                let temp = [ [ /n([^aiueoyn])/g, "nn$1" ], [ /([ksthmyrwgzbpdjfv])\1/g, "xtu$1" ], [ /([kstnhmrgzbpdj])(y[aiueo])/g, "$1ix$2" ], [ /(j|ch|sh)([aueo])/g, "$1ixy$2" ], [ /(f|v|ts)(y?[aieo])/g, "$1ux$2" ], [ /(t|d)h([aiueo])/g, "$1exy$2" ] ].reduce((acc, [ptn, r]) => acc.replace(ptn, r), this._kana + ev.key);
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
            } else if (ev.code == "Space" && this._kana) {
                this.convert(this._kana, ret => {
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
            if (ev.code == "Enter") {
                this._confirm(ev.target);
            } else if (ev.code == "Backspace") {
                this._updateStr(this._kana.slice(0, -1));
            }
        } else {
            return;
        }
        ev.stopPropagation();
    },
    _updateStr(s) {
        this._kana = s;
        (this.data.label || this.el).setAttribute("value", s);
    },
    _confirm(target) {
        if (this._kana) {
            target.dispatchEvent(new KeyboardEvent("keypress", {
                key: this._kana
            }));
            this._updateStr("");
        }
        this._suggestions = [];
    }
});

AFRAME.registerComponent("xykeyboard", {
    schema: {
        distance: {
            default: .7
        },
        ime: {
            default: false
        }
    },
    blocks: {
        main: {
            size: [ 11, 4 ],
            rows: [ {
                pos: [ 0, 3 ],
                keys: [ "qQ!", "wW@", "eE#", "rR$", "tT%", "yY^", "uU&", "iI*", "oO(", "pP)", "-_=" ]
            }, {
                pos: [ 0, 2 ],
                keys: [ "aA1", "sS2", "dD3", "fF4", "gG5", "hH`", "jJ~", "kK+", "lL[", ":;]" ]
            }, {
                pos: [ 0, 1 ],
                keys: [ {
                    code: "Shift",
                    symbols: "⇧⬆"
                }, "zZ6", "xX7", "cC8", "vV9", "bB0", "nN{", "mM}", ",'<", '.">', "/?\\" ]
            }, {
                pos: [ 0, 0 ],
                keys: [ {
                    code: "Space",
                    key: " ",
                    label: "_",
                    size: 4
                } ]
            }, {
                pos: [ -4.5, 0 ],
                keys: [ {
                    code: "_Fn",
                    label: "#!"
                }, {
                    code: "HiraganaKatakana",
                    label: "🌐"
                } ]
            } ]
        },
        num: {
            size: [ 4, 4 ],
            rows: [ {
                pos: [ 0, 3 ],
                keys: [ "7", "8", "9", "/" ]
            }, {
                pos: [ 0, 2 ],
                keys: [ "4", "5", "6", "*" ]
            }, {
                pos: [ 0, 1 ],
                keys: [ "1", "2", "3", "-" ]
            }, {
                pos: [ 0, 0 ],
                keys: [ "0", ":", ".", "+" ]
            } ]
        },
        ctrl: {
            size: [ 2, 4 ],
            rows: [ {
                pos: [ 0, 3 ],
                keys: [ {
                    code: "Backspace",
                    label: "⌫",
                    size: 2
                } ]
            }, {
                pos: [ 0, 2 ],
                keys: [ {
                    code: "Space",
                    key: " ",
                    label: "SP",
                    size: 2
                } ]
            }, {
                pos: [ 0, 1 ],
                keys: [ {
                    code: "Enter",
                    label: "⏎",
                    size: 2
                } ]
            }, {
                pos: [ 1.3, 3.5 ],
                keys: [ {
                    code: "_Close",
                    label: "x",
                    size: .8
                } ]
            }, {
                pos: [ 0, 0 ],
                keys: [ {
                    code: "ArrowLeft",
                    label: "⇦"
                }, {
                    code: "ArrowRight",
                    label: "⇨"
                } ]
            } ]
        }
    },
    init() {
        this.el.sceneEl.addEventListener("xykeyboard-request", ev => this.show(ev.detail));
    },
    show(type) {
        this.hide();
        let el = this.el;
        let data = this.data;
        let keySize = .2;
        let excludes = data.ime ? [] : [ "HiraganaKatakana" ];
        let blocks = this.blocks;
        let createKeys = (block, excludes = []) => {
            let pane = document.createElement("a-entity");
            let padding = keySize * .3;
            let size = block.size;
            pane.setAttribute("geometry", {
                primitive: "xy-rounded-rect",
                width: size[0] * keySize + padding,
                height: size[1] * keySize + padding
            });
            pane.setAttribute("material", {
                color: "#222233"
            });
            for (let row of block.rows) {
                let keyrow = pane.appendChild(document.createElement("a-xycontainer"));
                keyrow.setAttribute("xycontainer", {
                    direction: "row"
                });
                keyrow.setAttribute("position", {
                    x: row.pos[0] * keySize,
                    y: row.pos[1] * keySize - (size[1] - 1) * keySize / 2,
                    z: .02
                });
                for (let key of row.keys) {
                    if (excludes.includes(key.code)) {
                        continue;
                    }
                    let keyEl = keyrow.appendChild(document.createElement("a-xybutton"));
                    keyEl.setAttribute("material", "visible", false);
                    keyEl.setAttribute("xylabel", {
                        value: key.label || "",
                        align: "center"
                    });
                    keyEl.setAttribute("xyrect", {
                        width: (key.size || 1) * keySize,
                        height: keySize
                    });
                    keyEl.addEventListener("mouseenter", ev => keyEl.setAttribute("material", "visible", true));
                    keyEl.addEventListener("mouseleave", ev => keyEl.setAttribute("material", "visible", false));
                    if (key.symbols || typeof key === "string") {
                        keyEl.classList.add("xyinput-key");
                        keyEl.dataset.keySymbols = key.symbols || key;
                    }
                    if (key.code == "_Close") {
                        keyEl.classList.add("xyinput-close");
                        keyEl.addEventListener("click", ev => this.hide());
                    }
                    keyEl.addEventListener("mousedown", ev => {
                        if (document.activeElement == document.body && this._target) {
                            this._target.focus();
                        }
                        this._target = document.activeElement;
                        setTimeout(() => this._target.focus(), 0);
                        ev.preventDefault();
                        if (key.code == "_Fn") {
                            this._updateSymbols(this._keyidx == 2 ? 0 : 2);
                            return;
                        }
                        if (key.code == "Shift") {
                            this._updateSymbols((this._keyidx + 1) % 2);
                        }
                        let ks = key.code ? key.key : key;
                        let eventdata = {
                            key: ks ? ks[this._keyidx] || ks[0] : key.code,
                            code: key.code || key[0].toUpperCase()
                        };
                        let emit = (name, eventdata) => {
                            this._target.dispatchEvent(new KeyboardEvent(name, eventdata));
                        };
                        emit("keydown", eventdata);
                        emit("keyup", eventdata);
                        if (ks) {
                            emit("keypress", eventdata);
                        }
                    });
                }
            }
            return el.appendChild(pane);
        };
        if (type == "number") {
            let w = blocks.num.size[0] + blocks.ctrl.size[0];
            createKeys(blocks.num);
            createKeys(blocks.ctrl).setAttribute("position", "x", (w / 2 + .4) * keySize);
        } else if (type == "full") {
            let w = blocks.main.size[0] + blocks.ctrl.size[0];
            createKeys(blocks.main, excludes);
            createKeys(blocks.ctrl, [ "Space" ]).setAttribute("position", "x", (w / 2 + .4) * keySize);
            w += blocks.ctrl.size[0] + blocks.num.size[0];
            createKeys(blocks.num).setAttribute("position", "x", (w / 2 + .8) * keySize);
        } else {
            let w = blocks.main.size[0] + blocks.ctrl.size[0];
            createKeys(blocks.main, excludes);
            createKeys(blocks.ctrl, [ "Space" ]).setAttribute("position", "x", (w / 2 + .4) * keySize);
        }
        if (data.ime) {
            let convText = el.appendChild(document.createElement("a-xylabel"));
            convText.setAttribute("xylabel", {
                color: "yellow",
                renderingMode: "canvas"
            });
            convText.setAttribute("position", {
                x: 0,
                y: 2 * keySize * .95,
                z: .03
            });
            convText.setAttribute("xyrect", {
                width: 8 * keySize,
                height: keySize * .6
            });
            convText.setAttribute("xyime", "");
        }
        el.setAttribute("xy-drag-control", "draggable", ".xyinput-close");
        this._updateSymbols(0);
        let obj = el.object3D, position = obj.position;
        let tr = obj.parent.matrixWorld.clone().invert().multiply(el.sceneEl.camera.matrixWorld);
        let orgY = position.y;
        position.set(0, 0, -data.distance).applyMatrix4(tr);
        position.y = orgY;
        obj.rotation.y = new THREE.Euler().setFromRotationMatrix(tr.extractRotation(tr), "YXZ").y;
    },
    hide() {
        let el = this.el;
        this._target = null;
        el.removeAttribute("xy-drag-control");
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    },
    _updateSymbols(keyidx) {
        this._keyidx = keyidx;
        for (let keyEl of this.el.querySelectorAll(".xyinput-key")) {
            let s = keyEl.dataset.keySymbols;
            keyEl.setAttribute("xylabel", "value", s[keyidx] || s[0]);
        }
    }
});

AFRAME.registerPrimitive("a-xykeyboard", {
    defaultComponents: {
        xykeyboard: {}
    },
    mappings: {
        ime: "xykeyboard.ime",
        distance: "xykeyboard.distance"
    }
});

AFRAME.registerPrimitive("a-xyinput", {
    defaultComponents: {
        xyrect: {
            width: 2,
            height: .5
        },
        xyinput: {}
    },
    mappings: {
        width: "xyrect.width",
        height: "xyrect.height",
        value: "xyinput.value",
        type: "xyinput.type",
        placeholder: "xyinput.placeholder",
        "caret-color": "xyinput.caretColor",
        "background-color": "xyinput.bgColor"
    }
});

"use strict";

AFRAME.registerComponent("xycontainer", {
    dependencies: [ "xyrect" ],
    schema: {
        spacing: {
            default: 0
        },
        padding: {
            default: 0
        },
        reverse: {
            default: false
        },
        wrap: {
            default: "nowrap",
            oneOf: [ "wrap", "nowrap" ]
        },
        direction: {
            default: "column",
            oneOf: [ "none", "row", "column", "vertical", "horizontal" ]
        },
        alignItems: {
            default: "none",
            oneOf: [ "none", "center", "start", "end", "baseline", "stretch" ]
        },
        justifyItems: {
            default: "start",
            oneOf: [ "center", "start", "end", "space-between", "space-around", "stretch" ]
        },
        alignContent: {
            default: "",
            oneOf: [ "", "none", "start", "end", "center", "stretch" ]
        }
    },
    init() {
        for (let e of [ "child-attached", "child-detached", "xyresize" ]) {
            this.el.addEventListener(e, ev => ev.target == this.el && setTimeout(() => this.update()));
        }
    },
    update() {
        let data = this.data;
        let direction = data.direction;
        if (direction == "none") {
            return;
        }
        let containerRect = this.el.components.xyrect.data ? this.el.components.xyrect : {
            data: {
                height: -1,
                width: -1
            }
        };
        let children = this.el.children;
        let isVertical = direction == "vertical" || direction == "column";
        let padding = data.padding;
        let spacing = data.spacing;
        let mainDir = data.reverse != isVertical ? -1 : 1;
        let toXY = (m, c) => isVertical ? [ c, m * mainDir ] : [ m * mainDir, -c ];
        let xyToMainCross = (x, y) => isVertical ? [ y, x ] : [ x, y ];
        let [containerSizeM, containerSizeC] = xyToMainCross(containerRect.width - padding * 2, containerRect.height - padding * 2);
        let [attrNameM, attrNameC] = xyToMainCross("width", "height");
        let mainSize = 0;
        let crossSizeSum = 0;
        let targets = [];
        let lines = [];
        let sizeSum = 0;
        let growSum = 0;
        let shrinkSum = 0;
        let crossSize = 0;
        let newLine = () => {
            mainSize = Math.max(mainSize, sizeSum + spacing * (targets.length - 1));
            crossSizeSum += crossSize;
            lines.push([ targets, sizeSum, growSum, shrinkSum, crossSize ]);
            targets = [];
            sizeSum = 0;
            growSum = 0;
            shrinkSum = 0;
            crossSize = 0;
        };
        for (let el of children) {
            let xyitem = el.getAttribute("xyitem");
            if (xyitem && xyitem.fixed) {
                continue;
            }
            let rect = el.components.xyrect || el.getAttribute("geometry") || {
                width: +(el.getAttribute("width") || NaN),
                height: +(el.getAttribute("height") || NaN)
            };
            let childScale = el.getAttribute("scale") || {
                x: 1,
                y: 1
            };
            let size = xyToMainCross(rect.width * childScale.x, rect.height * childScale.y);
            let [sizeM, sizeC] = size;
            if (sizeM == null || isNaN(sizeM)) {
                continue;
            }
            let pivot = rect.data ? rect.data.pivot : {
                x: .5,
                y: .5
            };
            let contentSize = sizeSum + sizeM + spacing * targets.length;
            if (data.wrap == "wrap" && sizeSum > 0 && contentSize > containerSizeM) {
                newLine();
            }
            targets.push([ el, xyitem, size, xyToMainCross(pivot.x, pivot.y), xyToMainCross(childScale.x, childScale.y) ]);
            sizeSum += sizeM;
            growSum += xyitem ? xyitem.grow : 1;
            shrinkSum += xyitem ? xyitem.shrink : 1;
            crossSize = sizeC > crossSize ? sizeC : crossSize;
        }
        if (targets.length > 0) {
            newLine();
        }
        crossSizeSum += spacing * (lines.length - 1);
        if (containerRect.data[attrNameM] == -1) {
            containerSizeM = mainSize;
            containerRect[attrNameM] = mainSize + padding * 2;
        }
        if (containerRect.data[attrNameC] == -1) {
            containerSizeC = crossSizeSum;
            containerRect[attrNameC] = crossSizeSum + padding * 2;
        }
        let crossOffset = -containerSizeC / 2;
        let crossStretch = 0;
        let alignContent = data.alignContent || data.alignItems;
        if (alignContent == "end") {
            crossOffset += containerSizeC - crossSizeSum;
        } else if (alignContent == "center") {
            crossOffset += (containerSizeC - crossSizeSum) / 2;
        } else if (alignContent == "stretch" || alignContent == "none") {
            crossStretch = (containerSizeC - crossSizeSum) / lines.length;
        }
        for (let [targets, sizeSum, growSum, shrinkSum, crossSize] of lines) {
            this._layoutLine(targets, sizeSum, growSum, shrinkSum, -containerSizeM / 2, crossOffset, containerSizeM, crossSize + crossStretch, attrNameM, attrNameC, toXY);
            crossOffset += crossSize + crossStretch + spacing;
        }
    },
    _layoutLine(targets, sizeSum, growSum, shrinkSum, offset0, offset1, containerSize0, containerSize1, attrName0, attrName1, toXY) {
        let {justifyItems: justifyItems, alignItems: alignItems, spacing: spacing, wrap: wrap} = this.data;
        let stretchFactor = 0;
        let numTarget = targets.length;
        if (justifyItems === "center") {
            offset0 += (containerSize0 - sizeSum - spacing * numTarget) / 2;
        } else if (justifyItems === "end") {
            offset0 += containerSize0 - sizeSum - spacing * numTarget;
        } else if (justifyItems === "stretch") {
            stretchFactor = containerSize0 - sizeSum - spacing * (numTarget - 1);
            if (stretchFactor > 0) {
                stretchFactor = growSum > 0 ? stretchFactor / growSum : 0;
            } else {
                stretchFactor = shrinkSum > 0 ? stretchFactor / shrinkSum : 0;
            }
        } else if (justifyItems === "space-between") {
            spacing = (containerSize0 - sizeSum) / (numTarget - 1);
        } else if (justifyItems === "space-around") {
            spacing = (containerSize0 - sizeSum) / numTarget;
            offset0 += spacing / 2;
        }
        for (let [el, xyitem, [size0, size1], [pivot0, pivot1], [scale0, scale1]] of targets) {
            let align = xyitem && xyitem.align || alignItems;
            let stretch = (xyitem ? stretchFactor > 0 ? xyitem.grow : xyitem.shrink : 1) * stretchFactor;
            let posCross = offset1 + containerSize1 / 2;
            let pos = el.getAttribute("position") || {
                x: 0,
                y: 0
            };
            if (scale0 > 0 && stretch != 0) {
                size0 += stretch;
                el.setAttribute(attrName0, size0 / scale0);
            }
            if (scale1 > 0 && align === "stretch") {
                size1 = containerSize1;
                el.setAttribute(attrName1, size1 / scale1);
            }
            if (align === "start" || align === "stretch") {
                posCross = offset1 + pivot1 * size1;
            } else if (align === "end") {
                posCross = offset1 + containerSize1 - (1 - pivot1) * size1;
            } else if (align === "center") {
                posCross += (pivot1 - .5) * size1;
            } else if (align === "none" && wrap != "wrap") {
                posCross = attrName1 == "width" ? pos.x : -pos.y;
            }
            [pos.x, pos.y] = toXY(offset0 + size0 * pivot0, posCross);
            el.setAttribute("position", pos);
            offset0 += size0 + spacing;
        }
    }
});

AFRAME.registerComponent("xyitem", {
    schema: {
        align: {
            default: "none",
            oneOf: [ "none", "center", "start", "end", "baseline", "stretch" ]
        },
        grow: {
            default: 1
        },
        shrink: {
            default: 1
        },
        fixed: {
            default: false
        }
    },
    update(oldData) {
        if (oldData.align) {
            let xycontainer = this.el.parentNode.components.xycontainer;
            if (xycontainer) {
                xycontainer.update();
            }
        }
    }
});

AFRAME.registerComponent("xyrect", {
    schema: {
        width: {
            default: -1
        },
        height: {
            default: -1
        },
        pivot: {
            type: "vec2",
            default: {
                x: .5,
                y: .5
            }
        }
    },
    update(oldData) {
        let el = this.el;
        let {width: width, height: height} = this.data;
        let geometry = el.getAttribute("geometry") || {};
        this.width = width < 0 ? +(el.getAttribute("width") || geometry.width || 0) : width;
        this.height = height < 0 ? +(el.getAttribute("height") || geometry.height || 0) : height;
        if (oldData.width !== undefined) {
            el.emit("xyresize", {
                xyrect: this
            }, false);
        }
    }
});

AFRAME.registerPrimitive("a-xycontainer", {
    defaultComponents: {
        xyrect: {},
        xycontainer: {}
    },
    mappings: {
        width: "xyrect.width",
        height: "xyrect.height",
        direction: "xycontainer.direction",
        spacing: "xycontainer.spacing",
        padding: "xycontainer.padding",
        reverse: "xycontainer.reverse",
        wrap: "xycontainer.wrap",
        "align-items": "xycontainer.alignItems",
        "justify-items": "xycontainer.justifyItems",
        "align-content": "xycontainer.alignContent"
    }
});

"use strict";

const XYTheme = {
    get(el) {
        return this.defaultTheme;
    },
    defaultTheme: {
        button: {
            color: "#222",
            labelColor: "#fff",
            hoverColor: "#333",
            geometry: {},
            hoverHaptic: .3,
            hoverHapticMs: 10
        },
        window: {
            closeButton: {
                color: "#111",
                hoverColor: "#f00"
            },
            titleBar: {
                color: "#111"
            },
            background: {
                color: "#111",
                side: "double",
                transparent: true,
                opacity: .8
            }
        },
        thumb: {
            color: "white",
            hoverColor: "#ccf",
            geometry: {
                primitive: "circle"
            }
        },
        collidableClass: "collidable",
        createButton(width, height, parentEl, params, hasLabel, buttonEl, update = false) {
            buttonEl = buttonEl || document.createElement("a-entity");
            if (buttonEl.hasAttribute("style")) {
                return buttonEl;
            }
            let getParam = p => params && params[p] || this.button[p];
            if (!update) {
                if (parentEl) {
                    parentEl.append(buttonEl);
                    if (parentEl.hasAttribute("style")) {
                        buttonEl.setAttribute("style", "");
                        return buttonEl;
                    }
                }
                buttonEl.classList.add(this.collidableClass);
                buttonEl.addEventListener("mouseenter", ev => {
                    buttonEl.setAttribute("material", {
                        color: getParam("hoverColor")
                    });
                    let intensity = getParam("hoverHaptic");
                    if (intensity) {
                        let trackedControls = ev.detail.cursorEl.components["tracked-controls"];
                        let gamepad = trackedControls && trackedControls.controller;
                        let hapticActuators = gamepad && gamepad.hapticActuators;
                        if (hapticActuators && hapticActuators[0]) {
                            hapticActuators[0].pulse(intensity, getParam("hoverHapticMs"));
                        } else {}
                    }
                });
                buttonEl.addEventListener("mouseleave", ev => {
                    buttonEl.setAttribute("material", {
                        color: getParam("color")
                    });
                });
                buttonEl.addEventListener("xyresize", ev => {
                    let r = ev.detail.xyrect;
                    buttonEl.setAttribute("geometry", {
                        width: r.width,
                        height: r.height
                    });
                });
            }
            if (!buttonEl.hasAttribute("geometry")) {
                buttonEl.setAttribute("geometry", Object.assign({
                    primitive: "xy-rounded-rect",
                    width: width,
                    height: height,
                    radius: Math.min(width, height) * .1
                }, getParam("geometry")));
            }
            buttonEl.setAttribute("material", {
                color: getParam("color")
            });
            if (hasLabel) {
                buttonEl.setAttribute("xylabel", {
                    color: getParam("labelColor")
                });
            }
            return buttonEl;
        }
    }
};

AFRAME.registerGeometry("xy-rounded-rect", {
    schema: {
        height: {
            default: 1,
            min: 0
        },
        width: {
            default: 1,
            min: 0
        },
        radius: {
            default: 0,
            min: 0
        },
        radiusBL: {
            default: 0,
            min: 0
        },
        radiusBR: {
            default: 0,
            min: 0
        },
        radiusTL: {
            default: 0,
            min: 0
        },
        radiusTR: {
            default: 0,
            min: 0
        }
    },
    init(data) {
        let shape = new THREE.Shape();
        let w = (data.width || .01) / 2, h = (data.height || .01) / 2, r = data.radius;
        let tl = data.radiusTL || r, tr = data.radiusTR || r, bl = data.radiusBL || r, br = data.radiusBR || r;
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
        this.geometry = new THREE.ShapeGeometry(shape);
    }
});

AFRAME.registerComponent("xylabel", {
    dependencies: [ "xyrect" ],
    schema: {
        value: {
            default: ""
        },
        color: {
            default: "white"
        },
        align: {
            default: "left"
        },
        wrapCount: {
            default: 0
        },
        xOffset: {
            default: 0
        },
        zOffset: {
            default: .01
        },
        resolution: {
            default: 32
        },
        renderingMode: {
            default: "auto",
            oneOf: [ "auto", "canvas" ]
        }
    },
    init() {
        this.el.addEventListener("xyresize", ev => this.update());
    },
    update() {
        let data = this.data;
        let el = this.el;
        let value = data.value;
        let widthFactor = .65;
        let {width: w, height: h} = el.components.xyrect;
        let wrapCount = data.wrapCount;
        if (wrapCount == 0 && h > 0) {
            wrapCount = Math.max(w / h / widthFactor, value.length) + 1;
        }
        if (value == "") {
            this.remove();
            return;
        }
        if (data.renderingMode == "auto" && !/[\u0100-\uDFFF]/.test(value)) {
            let textData = Object.assign({}, data, {
                wrapCount: wrapCount,
                width: w,
                height: h
            });
            delete textData["resolution"];
            delete textData["renderingMode"];
            el.setAttribute("text", textData);
            el.components.text.data.mode = "pre";
            setTimeout(() => {
                let textObj = el.getObject3D("text");
                if (textObj) {
                    textObj.raycast = (() => {});
                }
            }, 0);
            this._removeObject3d();
            return;
        }
        let lineHeight = data.resolution;
        let textWidth = Math.floor(lineHeight * wrapCount * widthFactor);
        let canvas = this._canvas || document.createElement("canvas");
        let font = "" + lineHeight * .9 + "px bold sans-serif";
        let ctx = canvas.getContext("2d");
        ctx.font = font;
        let lines = [ "" ], ln = 0;
        for (let char of value) {
            if (char == "\n" || ctx.measureText(lines[ln] + char).width > textWidth) {
                lines.push("");
                ln++;
            }
            if (char != "\n") {
                lines[ln] += char;
            }
        }
        let canvasHeight = lineHeight * lines.length;
        if (!this._canvas || this.textWidth != textWidth || canvas.height != canvasHeight) {
            let canvasWidth = 8;
            while (canvasWidth < textWidth) canvasWidth *= 2;
            this.remove();
            this._canvas = canvas;
            canvas.height = canvasHeight;
            canvas.width = canvasWidth;
            this._textWidth = textWidth;
            let texture = this._texture = new THREE.CanvasTexture(canvas);
            texture.anisotropy = 4;
            texture.repeat.x = textWidth / canvasWidth;
            let meshH = Math.min(w / textWidth * canvasHeight, h);
            let mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, meshH), new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true
            }));
            mesh.position.set(data.xOffset, 0, data.zOffset);
            mesh.raycast = (() => {});
            el.setObject3D("xylabel", mesh);
        }
        ctx.clearRect(0, 0, textWidth, canvasHeight);
        ctx.font = font;
        ctx.textBaseline = "top";
        ctx.textAlign = data.align;
        ctx.fillStyle = data.color;
        let x = data.align === "center" ? textWidth / 2 : 0;
        let y = lineHeight * .1;
        for (let line of lines) {
            ctx.fillText(line, x, y);
            y += lineHeight;
        }
        this._texture.needsUpdate = true;
    },
    remove() {
        this._removeObject3d();
        if (this.el.hasAttribute("text")) {
            this.el.removeAttribute("text");
        }
    },
    _removeObject3d() {
        let el = this.el;
        let labelObj = el.getObject3D("xylabel");
        if (labelObj) {
            labelObj.material.map.dispose();
            labelObj.material.dispose();
            labelObj.geometry.dispose();
            el.removeObject3D("xylabel");
            this._canvas = null;
        }
    },
    getPos(cursorPos) {
        let {text: text, xyrect: xyrect} = this.el.components;
        let s = this.data.value;
        let pos = 0;
        if (this._canvas) {
            let ctx = this._canvas.getContext("2d");
            pos = ctx.measureText(s.slice(0, cursorPos)).width / this._textWidth;
        } else if (text) {
            let textLayout = text.geometry.layout;
            let glyphs = textLayout.glyphs;
            let numGlyph = glyphs.length;
            let p = Math.max(0, numGlyph + cursorPos - s.length);
            let g = glyphs[Math.min(p, numGlyph - 1)];
            pos = g ? (g.position[0] + g.data.width * (p >= numGlyph ? 1 : .1)) / textLayout.width : 0;
        }
        return (pos - .5) * xyrect.width;
    }
});

AFRAME.registerComponent("xybutton", {
    dependencies: [ "xyrect" ],
    schema: {
        color: {
            default: ""
        },
        hoverColor: {
            default: ""
        },
        labelColor: {
            default: ""
        }
    },
    init() {
        let el = this.el;
        let xyrect = el.components.xyrect;
        XYTheme.get(el).createButton(xyrect.width, xyrect.height, null, this.data, true, el);
    }
});

AFRAME.registerComponent("xytoggle", {
    dependencies: [ "xyrect" ],
    schema: {
        value: {
            default: false
        }
    },
    events: {
        click(ev) {
            let el = this.el;
            el.value = !el.value;
            el.emit("change", {
                value: el.value
            }, false);
        }
    },
    init() {
        let el = this.el;
        Object.defineProperty(el, "value", {
            get: () => this.data.value,
            set: v => {
                el.setAttribute("xytoggle", "value", v);
                el.setAttribute("value", v);
            }
        });
        let theme = XYTheme.get(el);
        this._thumb = theme.createButton(0, 0, el, theme.thumb);
        el.addEventListener("xyresize", ev => this.update());
    },
    update() {
        let el = this.el;
        let xyrect = el.components.xyrect;
        let h = xyrect.height, w = xyrect.width;
        let v = el.value;
        let params = {
            color: v ? "#0066ff" : XYTheme.get(el).button.color,
            hoverColor: v ? "#4499ff" : "",
            geometry: {
                radius: h / 2
            }
        };
        XYTheme.get(el).createButton(w, h, null, params, true, el, this._params != null);
        this._params = Object.assign(this._params || params, params);
        this._thumb.setAttribute("geometry", "radius", h * .4);
        this._thumb.object3D.position.set((w - h) / 2 * (v ? 1 : -1), 0, .01);
    }
});

AFRAME.registerComponent("xyselect", {
    dependencies: [ "xyrect", "xybutton" ],
    schema: {
        values: {
            default: []
        },
        label: {
            default: ""
        },
        toggle: {
            default: false
        },
        select: {
            default: 0
        }
    },
    events: {
        click(ev) {
            let data = this.data;
            if (data.toggle) {
                this.select((data.select + 1) % data.values.length);
            } else {
                this._listEl ? this.hide() : this.show();
            }
        }
    },
    init() {
        let el = this.el;
        if (this.data.toggle) {
            el.setAttribute("xylabel", "align", "center");
        } else {
            let marker = this._marker = el.appendChild(document.createElement("a-triangle"));
            marker.setAttribute("geometry", {
                vertexA: {
                    x: .1,
                    y: .03,
                    z: 0
                },
                vertexB: {
                    x: -.1,
                    y: .03,
                    z: 0
                },
                vertexC: {
                    x: 0,
                    y: -.12,
                    z: 0
                }
            });
            el.addEventListener("xyresize", ev => this.update());
        }
    },
    update() {
        let data = this.data, el = this.el;
        el.setAttribute("xylabel", {
            value: data.label || data.values[data.select]
        });
        if (this._marker) {
            this._marker.object3D.position.set(el.components.xyrect.width / 2 - .2, 0, .05);
        }
    },
    show() {
        if (this._listEl) return;
        let values = this.data.values;
        let height = this.el.components.xyrect.height;
        let listY = (height + values.length * height) / 2;
        let listEl = this._listEl = document.createElement("a-xycontainer");
        values.forEach((v, i) => {
            let itemEl = listEl.appendChild(document.createElement("a-xybutton"));
            itemEl.setAttribute("height", height);
            itemEl.setAttribute("label", v);
            itemEl.addEventListener("click", ev => {
                ev.stopPropagation();
                this.select(i);
                this.hide();
            });
        });
        listEl.object3D.position.set(0, listY, .1);
        this.el.appendChild(listEl);
    },
    select(idx) {
        this.el.setAttribute("xyselect", "select", idx);
        this.el.emit("change", {
            value: this.data.values[idx],
            index: idx
        }, false);
    },
    hide() {
        if (!this._listEl) return;
        this.el.removeChild(this._listEl);
        this._listEl.destroy();
        this._listEl = null;
    }
});

AFRAME.registerComponent("xydraggable", {
    schema: {
        dragThreshold: {
            default: .02
        },
        base: {
            type: "selector",
            default: null
        }
    },
    init() {
        let el = this.el;
        el.classList.add(XYTheme.get(el).collidableClass);
        this._onmousedown = this._onmousedown.bind(this);
        el.addEventListener("mousedown", this._onmousedown);
        this._dragFun = null;
    },
    remove() {
        this.el.removeEventListener("mousedown", this._onmousedown);
    },
    tick() {
        if (this._dragFun) {
            this._dragFun("xy-drag");
        } else {
            this.pause();
        }
    },
    _onmousedown(ev) {
        if (!ev.detail.cursorEl || !ev.detail.cursorEl.components.raycaster) {
            return;
        }
        let baseObj = (this.data.base || this.el).object3D;
        let cursorEl = ev.detail.cursorEl;
        let draggingRaycaster = cursorEl.components.raycaster.raycaster;
        let point = new THREE.Vector3();
        let startDirection = draggingRaycaster.ray.direction.clone();
        let dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0).applyMatrix4(baseObj.matrixWorld);
        let intersection = ev.detail.intersection;
        if (intersection) {
            dragPlane.setFromNormalAndCoplanarPoint(baseObj.getWorldDirection(point), intersection.point);
        }
        if (draggingRaycaster.ray.intersectPlane(dragPlane, point) === null) {
            baseObj.worldToLocal(point);
        }
        let prevRay = draggingRaycaster.ray.clone();
        let prevPoint = point.clone();
        let _this = this;
        let dragging = false;
        ev.stopPropagation();
        let dragFun = _this._dragFun = (event => {
            if (!dragging) {
                let d = startDirection.manhattanDistanceTo(draggingRaycaster.ray.direction);
                if (d < _this.data.dragThreshold) return;
                event = "xy-dragstart";
                _this.dragging = dragging = true;
            }
            prevPoint.copy(point);
            if (draggingRaycaster.ray.intersectPlane(dragPlane, point) !== null) {
                baseObj.worldToLocal(point);
            }
            _this.el.emit(event, {
                raycaster: draggingRaycaster,
                point: point,
                pointDelta: prevPoint.sub(point),
                prevRay: prevRay,
                cursorEl: cursorEl
            }, false);
            prevRay.copy(draggingRaycaster.ray);
        });
        _this.play();
        let cancelEvelt = ev1 => ev1.target != ev.target && ev1.stopPropagation();
        window.addEventListener("mouseenter", cancelEvelt, true);
        window.addEventListener("mouseleave", cancelEvelt, true);
        let mouseup = ev => {
            if (ev.detail.cursorEl != cursorEl) return;
            window.removeEventListener("mouseup", mouseup);
            window.removeEventListener("mouseenter", cancelEvelt, true);
            window.removeEventListener("mouseleave", cancelEvelt, true);
            _this._dragFun = null;
            if (dragging) {
                _this.dragging = false;
                let cancelClick = ev => ev.stopPropagation();
                window.addEventListener("click", cancelClick, true);
                setTimeout(() => window.removeEventListener("click", cancelClick, true), 0);
                dragFun("xy-dragend");
            }
        };
        window.addEventListener("mouseup", mouseup);
    }
});

AFRAME.registerComponent("xy-drag-control", {
    schema: {
        target: {
            type: "selector",
            default: null
        },
        draggable: {
            default: ""
        },
        autoRotate: {
            default: false
        }
    },
    init() {
        this._ondrag = this._ondrag.bind(this);
        this._draggable = [];
        this._prevQ = new THREE.Quaternion();
    },
    update(oldData) {
        let draggable = this.data.draggable;
        if (draggable !== oldData.draggable) {
            this.remove();
            this._draggable = Array.isArray(draggable) ? draggable : draggable ? this.el.querySelectorAll(draggable) : [ this.el ];
            this._draggable.forEach(el => {
                el.setAttribute("xydraggable", {});
                el.addEventListener("xy-dragstart", this._ondrag);
                el.addEventListener("xy-drag", this._ondrag);
            });
        }
    },
    remove() {
        this._draggable.forEach(el => {
            el.removeAttribute("xydraggable");
            el.removeEventListener("xy-dragstart", this._ondrag);
            el.removeEventListener("xy-drag", this._ondrag);
        });
    },
    _ondrag(ev) {
        let el = this.el;
        let data = this.data;
        let evDetail = ev.detail;
        let {origin: origin, direction: direction} = evDetail.raycaster.ray;
        let {origin: origin0, direction: direction0} = evDetail.prevRay;
        let cursorEl = evDetail.cursorEl;
        let targetObj = (data.target || el).object3D;
        let rot = new THREE.Quaternion();
        if (cursorEl.components["tracked-controls"]) {
            if (ev.type != "xy-dragstart") {
                rot.copy(this._prevQ).invert().premultiply(cursorEl.object3D.getWorldQuaternion(this._prevQ));
            } else {
                cursorEl.object3D.getWorldQuaternion(this._prevQ);
            }
        } else {
            rot.setFromUnitVectors(direction0, direction);
        }
        let pm = targetObj.parent.matrixWorld;
        let tr = new THREE.Matrix4();
        let mat = new THREE.Matrix4().makeRotationFromQuaternion(rot).multiply(tr.setPosition(origin0.clone().negate())).premultiply(tr.setPosition(origin)).premultiply(pm.clone().invert()).multiply(pm);
        targetObj.applyMatrix4 ? targetObj.applyMatrix4(mat) : targetObj.applyMatrix(mat);
        if (this.postProcess) {
            this.postProcess(targetObj, ev);
        }
        if (data.autoRotate) {
            let targetPosition = targetObj.getWorldPosition(new THREE.Vector3());
            let d = origin.clone().sub(targetPosition).normalize();
            let t = .8 - d.y * d.y;
            if (t > 0) {
                let intersection = cursorEl.components.raycaster.getIntersection(ev.target);
                let intersectPoint = intersection ? intersection.point : targetPosition;
                let c = targetObj.parent.worldToLocal(intersectPoint);
                let tq = targetObj.quaternion.clone();
                mat.lookAt(origin, targetPosition, new THREE.Vector3(0, 1, 0));
                targetObj.quaternion.slerp(rot.setFromRotationMatrix(mat.premultiply(pm.clone().invert())), t * .1);
                targetObj.position.sub(c).applyQuaternion(tq.invert().premultiply(targetObj.quaternion)).add(c);
            }
        }
    }
});

AFRAME.registerComponent("xywindow", {
    schema: {
        title: {
            default: ""
        },
        titleHeight: {
            default: .5
        },
        closable: {
            default: true
        },
        background: {
            default: false
        }
    },
    init() {
        let el = this.el;
        let theme = XYTheme.get(el);
        let windowStyle = theme.window;
        let controls = this.controls = el.appendChild(document.createElement("a-entity"));
        let titleSize = this.data.titleHeight;
        controls.setAttribute("xyitem", {
            fixed: true
        });
        if (this.data.background) {
            let background = this._background = controls.appendChild(document.createElement("a-plane"));
            background.setAttribute("material", windowStyle.background);
            background.object3D.position.set(0, titleSize / 2, -.04);
            el.addEventListener("object3dset", ev => {
                let children = el.object3D.children;
                let i = children.indexOf(controls.object3D);
                if (i > 0) {
                    children.unshift(...children.splice(i, 1));
                }
            });
        }
        let titleBar = this._titleBar = theme.createButton(1, titleSize, controls, windowStyle.titleBar, true);
        titleBar.setAttribute("xy-drag-control", {
            target: el,
            autoRotate: true
        });
        this._buttons = [];
        if (this.data.closable) {
            let closeButton = theme.createButton(titleSize, titleSize, controls, windowStyle.closeButton, true);
            closeButton.setAttribute("xylabel", {
                value: "X",
                align: "center"
            });
            closeButton.addEventListener("click", ev => el.parentNode.removeChild(el));
            this._buttons.push(closeButton);
        }
        el.addEventListener("xyresize", ev => {
            this.update({});
        });
    },
    update(oldData) {
        let el = this.el;
        let data = this.data;
        let title = data.title;
        let titleSize = data.titleHeight;
        let {width: width, height: height} = el.components.xyrect;
        let titleBar = this._titleBar;
        let background = this._background;
        let buttonsWidth = 0;
        let titleY = height / 2 + titleSize * .6;
        for (let b of this._buttons) {
            b.object3D.position.set((width - titleSize) / 2 - buttonsWidth, titleY, 0);
            buttonsWidth += titleSize * 1.04;
        }
        if (title != oldData.title) {
            let titleW = width - buttonsWidth - titleSize / 5;
            titleBar.setAttribute("xyrect", {
                width: titleW,
                height: titleSize * .9
            });
            titleBar.setAttribute("xylabel", {
                value: title,
                wrapCount: Math.max(10, titleW / (titleSize * .4)),
                xOffset: titleSize / 5
            });
        }
        titleBar.setAttribute("geometry", {
            width: width - buttonsWidth
        });
        titleBar.object3D.position.set(-buttonsWidth / 2, titleY, 0);
        if (background) {
            background.object3D.scale.set(width + titleSize * .2, height + titleSize * 1.4, 1);
        }
    }
});

AFRAME.registerComponent("xyrange", {
    dependencies: [ "xyrect" ],
    schema: {
        min: {
            default: 0
        },
        max: {
            default: 100
        },
        step: {
            default: 0
        },
        value: {
            default: 0
        },
        color0: {
            default: "white"
        },
        color1: {
            default: "#06f"
        },
        thumbSize: {
            default: .4
        },
        barHeight: {
            default: .08
        }
    },
    init() {
        let data = this.data;
        let el = this.el;
        let theme = XYTheme.get(el);
        let thumb = this._thumb = theme.createButton(0, 0, el, theme.thumb);
        theme.createButton(0, 0, null, {
            color: data.color0,
            hoverColor: data.color0
        }, false, el);
        let plane = new THREE.PlaneGeometry(1, 1);
        let bar = this._bar = new THREE.Mesh(plane);
        let prog = this._prog = new THREE.Mesh(plane);
        el.setObject3D("xyrange", new THREE.Group().add(bar, prog));
        thumb.setAttribute("xydraggable", {
            base: el,
            dragThreshold: 0
        });
        thumb.addEventListener("xy-drag", ev => {
            let r = el.components.xyrect.width - data.thumbSize;
            let p = (ev.detail.point.x + r / 2) / r * (data.max - data.min);
            if (data.step > 0) {
                p = Math.round(p / data.step) * data.step;
            }
            this.setValue(p + data.min, true);
        });
        Object.defineProperty(el, "value", {
            get: () => data.value,
            set: v => this.setValue(v, false)
        });
    },
    update() {
        let data = this.data;
        let barHeight = data.barHeight;
        let barWidth = this.el.components.xyrect.width - data.thumbSize;
        let len = data.max - data.min;
        let pos = len > 0 ? barWidth * (data.value - data.min) / len : 0;
        let prog = this._prog, bar = this._bar, thumb = this._thumb;
        bar.scale.set(barWidth, barHeight, 1);
        bar.material.color = new THREE.Color(data.color0);
        prog.scale.set(pos, barHeight, 1);
        prog.position.set((pos - barWidth) / 2, 0, .02);
        prog.material.color = new THREE.Color(data.color1);
        thumb.setAttribute("geometry", "radius", data.thumbSize / 2);
        thumb.object3D.position.set(pos - barWidth / 2, 0, .04);
    },
    setValue(value, emitEvent) {
        if (!this._thumb.components.xydraggable.dragging || emitEvent) {
            let data = this.data;
            let v = Math.max(Math.min(value, data.max), data.min);
            if (v != data.value && emitEvent) {
                this.el.emit("change", {
                    value: v
                }, false);
            }
            this.el.setAttribute("xyrange", "value", v);
        }
    }
});

AFRAME.registerComponent("xyclipping", {
    dependencies: [ "xyrect" ],
    schema: {
        exclude: {
            type: "selector",
            default: null
        },
        clipTop: {
            default: true
        },
        clipBottom: {
            default: true
        },
        clipLeft: {
            default: false
        },
        clipRight: {
            default: false
        }
    },
    init() {
        this.el.sceneEl.renderer.localClippingEnabled = true;
        this._clippingPlanesLocal = [];
        this._clippingPlanes = [];
        this._currentMatrix = null;
        this._raycastOverrides = {};
        this.update = this.update.bind(this);
        this.el.addEventListener("xyresize", this.update);
    },
    update() {
        let data = this.data;
        let rect = this.el.components.xyrect;
        let planes = this._clippingPlanesLocal = [];
        if (data.clipBottom) planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
        if (data.clipTop) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), rect.height));
        if (data.clipLeft) planes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
        if (data.clipRight) planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), rect.width));
        this._clippingPlanes = planes.map(p => p.clone());
        this._updateMatrix();
    },
    remove() {
        this.el.removeEventListener("xyresize", this.update);
        this._clippingPlanes.splice(0);
        for (let [obj, raycast] of Object.values(this._raycastOverrides)) {
            obj.raycast = raycast;
        }
    },
    tick() {
        if (!this.el.object3D.matrixWorld.equals(this._currentMatrix)) {
            this._updateMatrix();
        }
    },
    _updateMatrix() {
        this._currentMatrix = this.el.object3D.matrixWorld.clone();
        this._clippingPlanesLocal.forEach((plane, i) => {
            this._clippingPlanes[i].copy(plane).applyMatrix4(this._currentMatrix);
        });
        this.applyClippings();
    },
    applyClippings() {
        let excludeObj = this.data.exclude && this.data.exclude.object3D;
        let setCliping = obj => {
            if (obj === excludeObj) return;
            if (obj.material && obj.material.clippingPlanes !== undefined) {
                obj.material.clippingPlanes = this._clippingPlanes;
                if (!this._raycastOverrides[obj.uuid]) {
                    let raycastFn = obj.raycast;
                    this._raycastOverrides[obj.uuid] = [ obj, raycastFn ];
                    obj.raycast = ((r, intersects) => {
                        let len = intersects.length;
                        raycastFn.apply(obj, [ r, intersects ]);
                        let added = intersects[len];
                        if (added && this._clippingPlanes.some(plane => plane.distanceToPoint(added.point) < 0)) {
                            intersects.pop();
                        }
                    });
                }
            }
            for (let child of obj.children) {
                setCliping(child);
            }
        };
        setCliping(this.el.object3D);
    }
});

AFRAME.registerComponent("xyscroll", {
    dependencies: [ "xyrect" ],
    schema: {
        scrollbar: {
            default: true
        }
    },
    init() {
        this._scrollX = this._scrollY = this._speedY = 0;
        this._contentHeight = 0;
        this._thumbLen = 0;
        let el = this.el;
        let scrollBar = this._scrollBar = this._initScrollBar(el, .3);
        el.setAttribute("xyclipping", {
            exclude: scrollBar
        });
        el.setAttribute("xydraggable", {});
        el.addEventListener("xy-drag", ev => {
            let d = ev.detail.pointDelta;
            this._speedY = -d.y;
            this._scrollOffset(d.x, -d.y);
        });
        el.addEventListener("xy-dragstart", ev => this.pause());
        el.addEventListener("xy-dragend", ev => this.play());
        el.addEventListener("xyresize", ev => this.update());
        let item = this._getContentEl();
        if (item) {
            item.addEventListener("xyresize", ev => this.update());
        }
    },
    _getContentEl() {
        for (let item of this.el.children) {
            if (item === this._scrollBar || (item.getAttribute("xyitem") || {}).fixed) {
                continue;
            }
            return item;
        }
    },
    _initScrollBar(el, w) {
        let theme = XYTheme.get(el);
        let scrollBar = el.appendChild(document.createElement("a-entity"));
        this._upButton = theme.createButton(w, w, scrollBar);
        this._upButton.addEventListener("click", ev => {
            this._speedY = -this._scrollDelta;
            this.play();
        });
        this._downButton = theme.createButton(w, w, scrollBar);
        this._downButton.addEventListener("click", ev => {
            this._speedY = this._scrollDelta;
            this.play();
        });
        this._scrollThumb = theme.createButton(w * .7, 1, scrollBar);
        this._scrollThumb.setAttribute("xydraggable", {
            base: scrollBar
        });
        this._scrollThumb.addEventListener("xy-drag", ev => {
            let xyrect = this.el.components.xyrect;
            let dy = ev.detail.pointDelta.y * (this._contentHeight - xyrect.height) / (this._scrollLength - this._thumbLen || 1);
            this._scrollOffset(0, dy);
        });
        return scrollBar;
    },
    update() {
        let xyrect = this.el.components.xyrect;
        let scrollBarHeight = xyrect.height;
        this._scrollBar.setAttribute("visible", this.data.scrollbar);
        this._scrollBar.setAttribute("position", {
            x: xyrect.width + .1,
            y: 0,
            z: .05
        });
        this._upButton.setAttribute("position", {
            x: 0,
            y: scrollBarHeight - .15,
            z: 0
        });
        this._downButton.setAttribute("position", {
            x: 0,
            y: .15,
            z: 0
        });
        this._scrollDelta = Math.max(scrollBarHeight / 2, .5) * .3;
        this._scrollStart = scrollBarHeight - .3;
        this._scrollLength = scrollBarHeight - .6;
        this._scrollOffset(0, 0);
    },
    tick() {
        if (Math.abs(this._speedY) > .001) {
            this._speedY *= .8;
            this._scrollOffset(0, this._speedY);
        } else {
            this.pause();
        }
    },
    _scrollOffset(dx, dy) {
        this.setScroll(this._scrollX + dx, this._scrollY + dy);
    },
    setScroll(x, y) {
        let item = this._getContentEl();
        if (!item) {
            return;
        }
        let el = this.el;
        let {width: scrollWidth, height: scrollHeight} = el.components.xyrect;
        let itemRect = item.components.xyrect;
        let contentHeight = itemRect.height;
        let contentWidth = itemRect.width;
        if (!item.components.xyrec) {
            item.setAttribute("xyrect", {});
        }
        this._scrollX = Math.max(0, Math.min(x, contentWidth - scrollWidth));
        this._scrollY = Math.max(0, Math.min(y, contentHeight - scrollHeight));
        this._contentHeight = contentHeight;
        let thumbLen = this._thumbLen = Math.max(.2, Math.min(this._scrollLength * scrollHeight / contentHeight, this._scrollLength));
        let thumbY = this._scrollStart - thumbLen / 2 - (this._scrollLength - thumbLen) * this._scrollY / (contentHeight - scrollHeight || 1);
        this._scrollThumb.setAttribute("geometry", "height", thumbLen);
        this._scrollThumb.setAttribute("position", "y", thumbY);
        let itemPivot = itemRect.data.pivot;
        let vx = itemPivot.x * itemRect.width - this._scrollX;
        let vy = (1 - itemPivot.y) * itemRect.height - this._scrollY;
        item.setAttribute("position", {
            x: vx,
            y: scrollHeight - vy
        });
        item.emit("xyviewport", [ vy, vy - scrollHeight, -vx, scrollWidth - vx ], false);
        let clippling = el.components.xyclipping;
        if (clippling) {
            clippling.applyClippings();
        }
    }
});

AFRAME.registerComponent("xylist", {
    dependencies: [ "xyrect" ],
    schema: {
        itemWidth: {
            default: -1
        },
        itemHeight: {
            default: -1
        }
    },
    events: {
        click(ev) {
            for (let p of ev.composedPath()) {
                let index = p.dataset.listPosition;
                if (index != null && index >= 0) {
                    this.el.emit("clickitem", {
                        index: index,
                        ev: ev
                    }, false);
                    break;
                }
            }
        }
    },
    init() {
        let el = this.el;
        let data = this.data;
        this._adapter = null;
        this._elements = {};
        this._cache = [];
        this._userData = null;
        this._itemCount = 0;
        this._layout = {
            size(itemCount, list) {
                if (data.itemHeight <= 0) {
                    let el = list._adapter.create();
                    data.itemHeight = +el.getAttribute("height");
                    data.itemWidth = +el.getAttribute("width");
                }
                return {
                    width: data.itemWidth,
                    height: data.itemHeight * itemCount
                };
            },
            * targets(viewport) {
                let itemHeight = data.itemHeight;
                let position = Math.floor(-viewport[0] / itemHeight);
                let end = Math.ceil(-viewport[1] / itemHeight);
                while (position < end) {
                    yield position++;
                }
            },
            layout(el, position) {
                let x = 0, y = -position * data.itemHeight;
                let xyrect = el.components.xyrect;
                let pivot = xyrect ? xyrect.data.pivot : {
                    x: .5,
                    y: .5
                };
                el.setAttribute("position", {
                    x: x + pivot.x * xyrect.width,
                    y: y - pivot.y * xyrect.height,
                    z: 0
                });
            }
        };
        el.setAttribute("xyrect", "pivot", {
            x: 0,
            y: 1
        });
        el.addEventListener("xyviewport", ev => this.setViewport(ev.detail));
        this.setViewport([ 0, 0 ]);
    },
    setLayout(layout) {
        this._layout = layout;
    },
    setAdapter(adapter) {
        this._adapter = adapter;
    },
    setContents(data, count, invalidateView = true) {
        if (invalidateView) {
            for (let el of Object.values(this._elements)) {
                el.dataset.listPosition = -1;
                el.setAttribute("position", "y", 999);
            }
        }
        this._userData = data;
        count = count != null ? count : data.length;
        this._itemCount = count;
        this.el.setAttribute("xyrect", this._layout.size(count, this));
        this._refresh();
    },
    setViewport(vp) {
        this._viewport = vp;
        this._refresh();
    },
    _refresh() {
        let el = this.el;
        let adapter = this._adapter, layout = this._layout, elements = this._elements;
        let visibleItems = {};
        if (!adapter) return;
        for (let position of layout.targets(this._viewport)) {
            if (position >= 0 && position < this._itemCount) {
                let itemEl = elements[position];
                if (!itemEl) {
                    itemEl = elements[position] = this._cache.pop() || el.appendChild(adapter.create(el));
                    itemEl.classList.add(XYTheme.get(el).collidableClass);
                }
                visibleItems[position] = itemEl;
                let dataset = itemEl.dataset;
                if (dataset.listPosition != position) {
                    dataset.listPosition = position;
                    let update = () => {
                        if (dataset.listPosition == position) {
                            layout.layout(itemEl, position);
                            adapter.bind(position, itemEl, this._userData);
                        }
                    };
                    if (itemEl.hasLoaded) {
                        update();
                    } else {
                        itemEl.addEventListener("loaded", update, {
                            once: true
                        });
                    }
                }
            }
        }
        for (let [position, el] of Object.entries(elements)) {
            el.setAttribute("visible", visibleItems[position] != null);
            if (!visibleItems[position]) {
                this._cache.push(el);
            }
        }
        this._elements = visibleItems;
    }
});

AFRAME.registerPrimitive("a-xylabel", {
    defaultComponents: {
        xyrect: {},
        xylabel: {}
    },
    mappings: {
        width: "xyrect.width",
        height: "xyrect.height",
        value: "xylabel.value",
        color: "xylabel.color",
        align: "xylabel.align",
        "wrap-count": "xylabel.wrapCount"
    }
});

AFRAME.registerPrimitive("a-xybutton", {
    defaultComponents: {
        xyrect: {
            width: 2,
            height: .5
        },
        xylabel: {
            align: "center"
        },
        xybutton: {}
    },
    mappings: {
        width: "xyrect.width",
        height: "xyrect.height",
        label: "xylabel.value",
        align: "xylabel.align",
        color: "xybutton.color",
        "hover-color": "xybutton.hoverColor",
        "label-color": "xybutton.labelColor"
    }
});

AFRAME.registerPrimitive("a-xytoggle", {
    defaultComponents: {
        xyrect: {
            width: .8,
            height: .4
        },
        xytoggle: {}
    },
    mappings: {
        width: "xyrect.width",
        height: "xyrect.height",
        value: "xytoggle.value"
    }
});

AFRAME.registerPrimitive("a-xyselect", {
    defaultComponents: {
        xyrect: {
            width: 2,
            height: .5
        },
        xyselect: {}
    },
    mappings: {
        width: "xyrect.width",
        height: "xyrect.height",
        values: "xyselect.values",
        label: "xyselect.label",
        toggle: "xyselect.toggle",
        select: "xyselect.select",
        color: "xybutton.color",
        "hover-color": "xybutton.hoverColor",
        "label-color": "xybutton.labelColor"
    }
});

AFRAME.registerPrimitive("a-xywindow", {
    defaultComponents: {
        xycontainer: {
            alignItems: "center"
        },
        xywindow: {}
    },
    mappings: {
        width: "xyrect.width",
        height: "xyrect.height",
        title: "xywindow.title"
    }
});

AFRAME.registerPrimitive("a-xyscroll", {
    defaultComponents: {
        xyrect: {
            pivot: {
                x: 0,
                y: 1
            }
        },
        xyscroll: {}
    },
    mappings: {
        width: "xyrect.width",
        height: "xyrect.height",
        scrollbar: "xyscroll.scrollbar"
    }
});

AFRAME.registerPrimitive("a-xyrange", {
    defaultComponents: {
        xyrect: {},
        xyrange: {}
    },
    mappings: {
        width: "xyrect.width",
        height: "xyrect.height",
        min: "xyrange.min",
        max: "xyrange.max",
        step: "xyrange.step",
        value: "xyrange.value",
        "bar-height": "xyrange.barHeight"
    }
});