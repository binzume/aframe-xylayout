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
        bgColor: {
            default: "white"
        },
        virtualKeyboard: {
            default: "[xykeyboard]"
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
        this._caretObj = new THREE.Mesh(new THREE.PlaneGeometry(.04, xyrect.height * .9), new THREE.MeshBasicMaterial({
            color: data.caretColor
        }));
        el.setObject3D("caret", this._caretObj);
        this._caretObj.position.z = .02;
        el.classList.add("collidable");
        let updateGeometory = () => {
            el.setAttribute("geometry", {
                primitive: "xy-rounded-rect",
                width: xyrect.width,
                height: xyrect.height
            });
        };
        updateGeometory();
        el.setAttribute("material", {
            color: data.bgColor
        });
        el.setAttribute("tabindex", 0);
        el.addEventListener("xyresize", updateGeometory);
        el.addEventListener("click", ev => {
            el.focus();
            let kbd = document.querySelector(data.virtualKeyboard);
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
        let oncopy = ev => {
            ev.clipboardData.setData("text/plain", el.value);
            ev.preventDefault();
        };
        let onpaste = ev => {
            insertString(ev.clipboardData.getData("text/plain"));
            ev.preventDefault();
        };
        el.addEventListener("focus", ev => {
            this._updateCursor(this.cursor);
            window.addEventListener("copy", oncopy);
            window.addEventListener("paste", onpaste);
        });
        el.addEventListener("blur", ev => {
            this._updateCursor(this.cursor);
            window.removeEventListener("copy", oncopy);
            window.removeEventListener("paste", onpaste);
        });
        el.addEventListener("keypress", ev => {
            if (ev.code != "Enter") {
                insertString(ev.key);
            }
        });
        el.addEventListener("keydown", ev => {
            let pos = this.cursor, s = el.value;
            if (ev.code == "ArrowLeft") {
                if (pos > 0) {
                    this._updateCursor(pos - 1);
                }
            } else if (ev.code == "ArrowRight") {
                if (pos < s.length) {
                    this._updateCursor(pos + 1);
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
        let el = this.el, data = this.data;
        let s = el.value, p = this.cursor;
        if (p > s.length || oldData.value == null) {
            p = s.length;
        }
        if (data.type == "password") {
            s = s.replace(/./g, "*");
        }
        el.setAttribute("xylabel", {
            color: s ? "black" : "#aaa",
            value: s || data.placeholder
        });
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
        let el = this.el;
        let {xylabel: xylabel, xyrect: xyrect, text: text} = el.components;
        let s = el.value;
        let pos = 0;
        if (cursorPos == 0) {} else if (xylabel.canvas) {
            let ctx = xylabel.canvas.getContext("2d");
            pos = ctx.measureText(s.slice(0, cursorPos)).width / xylabel.textWidth;
        } else if (text) {
            let textLayout = text.geometry.layout;
            let glyphs = textLayout.glyphs;
            let p = Math.max(0, cursorPos - (s.length - glyphs.length));
            let g = glyphs[Math.min(p, glyphs.length - 1)];
            pos = g ? (g.position[0] + g.data.width * (p >= glyphs.length ? 1 : .1)) / textLayout.width : 0;
        }
        return (pos - .5) * xyrect.width + .04;
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
        keySize: {
            default: .2
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
    show(type) {
        this.hide();
        let el = this.el;
        let data = this.data;
        let keySize = data.keySize;
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
                        if (document.activeElement != document.body) {
                            let ks = key.code ? key.key : key;
                            let eventdata = {
                                key: ks ? ks[this._keyidx] || ks[0] : key.code,
                                code: key.code || key[0].toUpperCase()
                            };
                            document.activeElement.dispatchEvent(new KeyboardEvent("keydown", eventdata));
                            if (ks) {
                                document.activeElement.dispatchEvent(new KeyboardEvent("keypress", eventdata));
                            }
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
        let tr = new THREE.Matrix4().getInverse(obj.parent.matrixWorld).multiply(el.sceneEl.camera.matrixWorld);
        let orgY = position.y;
        position.set(0, 0, -.7).applyMatrix4(tr);
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
        "key-size": "xykeyboard.keySize"
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
        this.el.addEventListener("xyresize", ev => this.layout());
        this.layout();
    },
    layout() {
        let data = this.data;
        let direction = data && data.direction;
        if (!direction || direction == "none") {
            return;
        }
        let containerRect = this.el.components.xyrect, children = this.el.children;
        let isVertical = direction == "vertical" || direction == "column";
        let padding = data.padding;
        let spacing = data.spacing;
        let mainDir = data.reverse != isVertical ? -1 : 1;
        let xymat = isVertical ? [ 0, 1, mainDir, 0 ] : [ mainDir, 0, 0, -1 ];
        let xyToMainCross = isVertical ? (x, y) => [ y, x ] : (x, y) => [ x, y ];
        let containerSize = xyToMainCross(containerRect.width - padding * 2, containerRect.height - padding * 2);
        let attrNames = xyToMainCross("width", "height");
        let mainSize = 0;
        let crossSizeSum = 0;
        let lines = [];
        let targets = [];
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
                width: (el.getAttribute("width") || undefined) * 1,
                height: (el.getAttribute("height") || undefined) * 1
            };
            let childScale = el.getAttribute("scale") || {
                x: 1,
                y: 1
            };
            let pivot = rect.data ? rect.data.pivot : {
                x: .5,
                y: .5
            };
            let itemData = {
                el: el,
                xyitem: xyitem,
                size: xyToMainCross(rect.width, rect.height),
                pivot: xyToMainCross(pivot.x, pivot.y),
                scale: xyToMainCross(childScale.x, childScale.y)
            };
            if (itemData.size[0] == null || isNaN(itemData.size[0])) {
                continue;
            }
            let sz = itemData.size[0] * itemData.scale[0];
            let contentSize = sizeSum + sz + spacing * targets.length;
            if (data.wrap == "wrap" && sizeSum > 0 && contentSize > containerSize[0]) {
                newLine();
            }
            targets.push(itemData);
            sizeSum += sz;
            growSum += xyitem ? xyitem.grow : 1;
            shrinkSum += xyitem ? xyitem.shrink : 1;
            crossSize = itemData.size[1] > crossSize ? itemData.size[1] : crossSize;
        }
        if (targets.length > 0) {
            newLine();
        }
        crossSizeSum += spacing * (lines.length - 1);
        if (containerRect.data[attrNames[0]] == -1) {
            containerSize[0] = mainSize;
            containerRect[attrNames[0]] = mainSize + padding * 2;
        }
        if (containerRect.data[attrNames[1]] == -1) {
            containerSize[1] = crossSizeSum;
            containerRect[attrNames[1]] = crossSizeSum + padding * 2;
        }
        let crossOffset = -containerSize[1] / 2;
        let mainOffset = -containerSize[0] / 2;
        let crossStretch = 0;
        let alignContent = data.alignContent || data.alignItems;
        if (alignContent == "end") {
            crossOffset += containerSize[1] - crossSizeSum;
        } else if (alignContent == "center") {
            crossOffset += (containerSize[1] - crossSizeSum) / 2;
        } else if (alignContent == "stretch" || alignContent == "none") {
            crossStretch = (containerSize[1] - crossSizeSum) / lines.length;
        }
        for (let [targets, sizeSum, growSum, shrinkSum, crossSize] of lines) {
            this._layoutLine(targets, sizeSum, growSum, shrinkSum, mainOffset, crossOffset, containerSize[0], crossSize + crossStretch, xymat, attrNames);
            crossOffset += crossSize + crossStretch + spacing;
        }
    },
    _layoutLine(targets, sizeSum, growSum, shrinkSum, p, crossOffset, containerSize0, containerSize1, xymat, attrNames) {
        let {justifyItems: justifyItems, alignItems: alignItems, spacing: spacing, wrap: wrap} = this.data;
        let stretchFactor = 0;
        let numTarget = targets.length;
        if (justifyItems === "center") {
            p += (containerSize0 - sizeSum - spacing * numTarget) / 2;
        } else if (justifyItems === "end") {
            p += containerSize0 - sizeSum - spacing * numTarget;
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
            p += spacing / 2;
        }
        for (let itemData of targets) {
            let el = itemData.el;
            let xyitem = itemData.xyitem;
            let [pivot0, pivot1] = itemData.pivot;
            let [scale0, scale1] = itemData.scale;
            let [size0, size1] = itemData.size;
            let align = xyitem && xyitem.align || alignItems;
            let stretch = (xyitem ? stretchFactor > 0 ? xyitem.grow : xyitem.shrink : 1) * stretchFactor;
            let szMain = size0 * scale0 + stretch;
            let posMain = p + pivot0 * szMain;
            let posCross = crossOffset + containerSize1 / 2;
            let pos = el.getAttribute("position") || {
                x: 0,
                y: 0,
                z: 0
            };
            if (scale0 > 0 && stretch != 0) {
                el.setAttribute(attrNames[0], size0 + stretch / scale0);
            }
            if (scale1 > 0 && align === "stretch") {
                size1 = containerSize1;
                el.setAttribute(attrNames[1], size1 / scale1);
            }
            if (align === "start" || align === "stretch") {
                posCross = crossOffset + pivot1 * size1;
            } else if (align === "end") {
                posCross = crossOffset + containerSize1 - (1 - pivot1) * size1;
            } else if (align === "center") {
                posCross += (pivot1 - .5) * size1;
            } else if (align === "none" && wrap != "wrap") {
                posCross += xymat[1] * pos.x + xymat[3] * pos.y;
            }
            pos.x = xymat[0] * posMain + xymat[1] * posCross;
            pos.y = xymat[2] * posMain + xymat[3] * posCross;
            el.setAttribute("position", pos);
            p += szMain + spacing;
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
        if (oldData.align !== undefined) {
            let xycontainer = this.el.parentNode.components.xycontainer;
            if (xycontainer) {
                xycontainer.layout();
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
        },
        updateGeometry: {
            default: false
        }
    },
    update(oldData) {
        let el = this.el;
        let {width: width, height: height, updateGeometry: updateGeometry} = this.data;
        let geometry = el.getAttribute("geometry") || {};
        this.width = width < 0 ? (el.getAttribute("width") || geometry.width || 0) * 1 : width;
        this.height = height < 0 ? (el.getAttribute("height") || geometry.height || 0) * 1 : height;
        if (oldData.width !== undefined) {
            if (updateGeometry) {
                el.setAttribute("geometry", {
                    width: width,
                    height: height
                });
            }
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
            geometry: "xy-rounded-rect",
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
                color: "#111"
            }
        },
        collidableClass: "collidable",
        createButton(width, height, parentEl, params, hasLabel, buttonEl) {
            let getParam = p => params && params[p] || this.button[p];
            buttonEl = buttonEl || document.createElement("a-entity");
            if (!buttonEl.hasAttribute("geometry")) {
                buttonEl.setAttribute("geometry", {
                    primitive: getParam("geometry"),
                    width: width,
                    height: height
                });
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
            buttonEl.setAttribute("material", {
                color: getParam("color")
            });
            if (hasLabel) {
                buttonEl.setAttribute("xylabel", {
                    color: getParam("labelColor")
                });
            }
            return parentEl ? parentEl.appendChild(buttonEl) : buttonEl;
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
            default: .05,
            min: 0
        }
    },
    init(data) {
        let shape = new THREE.Shape();
        let radius = data.radius;
        let w = (data.width || .01) / 2, h = (data.height || .01) / 2;
        shape.moveTo(-w, -h + radius);
        shape.lineTo(-w, h - radius);
        shape.quadraticCurveTo(-w, h, -w + radius, h);
        shape.lineTo(w - radius, h);
        shape.quadraticCurveTo(w, h, w, h - radius);
        shape.lineTo(w, -h + radius);
        shape.quadraticCurveTo(w, -h, w - radius, -h);
        shape.lineTo(-w + radius, -h);
        shape.quadraticCurveTo(-w, -h, -w, -h + radius);
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
            let textData = Object.assign({}, data);
            delete textData["resolution"];
            delete textData["renderingMode"];
            textData.wrapCount = wrapCount;
            textData.width = w;
            textData.height = h;
            el.setAttribute("text", textData);
            let textObj = el.getObject3D("text");
            if (textObj) {
                textObj.raycast = (() => {});
            }
            this._removeObject3d();
            return;
        }
        let lineHeight = data.resolution;
        let textWidth = Math.floor(lineHeight * wrapCount * widthFactor);
        let canvas = this.canvas || document.createElement("canvas");
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
        if (!this.canvas || this.textWidth != textWidth || canvas.height != canvasHeight) {
            let canvasWidth = 8;
            while (canvasWidth < textWidth) canvasWidth *= 2;
            this.remove();
            this.canvas = canvas;
            canvas.height = canvasHeight;
            canvas.width = canvasWidth;
            this.textWidth = textWidth;
            let texture = this._texture = new THREE.CanvasTexture(canvas);
            texture.anisotropy = 4;
            texture.alphaTest = .2;
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
            this.canvas = null;
        }
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
    init() {
        let el = this.el;
        Object.defineProperty(el, "value", {
            get: () => this.data.value,
            set: v => el.setAttribute("xytoggle", "value", v)
        });
        this._thumb = el.appendChild(document.createElement("a-circle"));
        el.addEventListener("click", ev => {
            el.value = !el.value;
            el.emit("change", {
                value: el.value
            }, false);
        });
        el.addEventListener("xyresize", ev => this.update());
    },
    update() {
        let el = this.el;
        let xyrect = el.components.xyrect;
        let r = xyrect.height / 2;
        let v = el.value;
        let params = {
            color: v ? "#0066ff" : XYTheme.get(el).button.color,
            hoverColor: v ? "#4499ff" : ""
        };
        el.setAttribute("xybutton", params);
        el.setAttribute("material", "color", params.color);
        this._thumb.setAttribute("geometry", "radius", r * .8);
        this._thumb.object3D.position.set((xyrect.width / 2 - r) * (v ? 1 : -1), 0, .05);
        el.setAttribute("geometry", {
            primitive: "xy-rounded-rect",
            width: xyrect.width,
            height: r * 2,
            radius: r
        });
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
    init() {
        let el = this.el;
        el.addEventListener("click", ev => {
            let data = this.data;
            if (data.toggle) {
                this.select((data.select + 1) % data.values.length);
            } else {
                this._listEl ? this.hide() : this.show();
            }
        });
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
        let data = this.data;
        this.el.setAttribute("xylabel", {
            value: data.label || data.values[data.select]
        });
        if (this._marker) {
            this._marker.object3D.position.set(this.el.components.xyrect.width / 2 - .2, 0, .05);
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
        let baseEl = this.data.base || this.el;
        let cursorEl = ev.detail.cursorEl;
        let draggingRaycaster = cursorEl.components.raycaster.raycaster;
        let dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0).applyMatrix4(baseEl.object3D.matrixWorld);
        let startDirection = draggingRaycaster.ray.direction.clone();
        let point = new THREE.Vector3(), prevPoint = point.clone();
        if (draggingRaycaster.ray.intersectPlane(dragPlane, point) === null) {
            baseEl.object3D.worldToLocal(point);
        }
        let prevRay = draggingRaycaster.ray.clone();
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
                baseEl.object3D.worldToLocal(point);
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
                rot.copy(this._prevQ).inverse().premultiply(cursorEl.object3D.getWorldQuaternion(this._prevQ));
            } else {
                cursorEl.object3D.getWorldQuaternion(this._prevQ);
            }
        } else {
            rot.setFromUnitVectors(direction0, direction);
        }
        let pm = targetObj.parent.matrixWorld;
        let tr = new THREE.Matrix4();
        let mat = new THREE.Matrix4().makeRotationFromQuaternion(rot).multiply(tr.setPosition(origin0.clone().negate())).premultiply(tr.setPosition(origin)).premultiply(tr.getInverse(pm)).multiply(pm);
        targetObj.applyMatrix4 ? targetObj.applyMatrix4(mat) : targetObj.applyMatrix(mat);
        if (this.postProcess) {
            this.postProcess(targetObj, ev);
        }
        if (data.autoRotate) {
            let cameraPosition = el.sceneEl.camera.getWorldPosition(new THREE.Vector3());
            let targetPosition = targetObj.getWorldPosition(new THREE.Vector3());
            let d = cameraPosition.clone().sub(targetPosition).normalize();
            let t = .8 - d.y * d.y;
            if (t > 0) {
                mat.lookAt(cameraPosition, targetPosition, new THREE.Vector3(0, 1, 0));
                let intersection = cursorEl.components.raycaster.getIntersection(ev.target);
                let intersectPoint = intersection ? intersection.point : targetPosition;
                let c = targetObj.parent.worldToLocal(intersectPoint);
                let tq = targetObj.quaternion.clone();
                targetObj.quaternion.slerp(rot.setFromRotationMatrix(mat.premultiply(tr.getInverse(pm))), t * .1);
                targetObj.position.sub(c).applyQuaternion(tq.inverse().premultiply(targetObj.quaternion)).add(c);
            }
        }
    }
});

AFRAME.registerComponent("xywindow", {
    dependencies: [ "xycontainer" ],
    schema: {
        title: {
            default: ""
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
        controls.setAttribute("xyitem", {
            fixed: true
        });
        controls.object3D.position.set(0, 0, .02);
        if (this.data.background) {
            let background = this._background = controls.appendChild(document.createElement("a-plane"));
            background.setAttribute("material", {
                color: windowStyle.background.color,
                side: "double",
                transparent: true,
                opacity: .8
            });
            background.object3D.position.set(0, .25, -.04);
            el.addEventListener("object3dset", ev => {
                if (ev.detail.object.el == background) {
                    el.object3D.children.unshift(el.object3D.children.pop());
                }
            });
        }
        let dragButton = this._dragButton = theme.createButton(1, .5, controls, windowStyle.titleBar, true);
        dragButton.setAttribute("xy-drag-control", {
            target: el,
            autoRotate: true
        });
        this._buttons = [];
        if (this.data.closable) {
            let closeButton = theme.createButton(.5, .5, controls, windowStyle.closeButton, true);
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
        this.system.registerWindow(this);
    },
    remove() {
        this.system.unregisterWindow(this);
    },
    update(oldData) {
        let el = this.el;
        let data = this.data;
        let {width: width, height: height} = el.components.xyrect;
        let dragButton = this._dragButton;
        let background = this._background;
        let buttonsWidth = 0;
        let tiyleY = height / 2 + .3;
        for (let b of this._buttons) {
            b.object3D.position.set(width / 2 - .25 - buttonsWidth, tiyleY, 0);
            buttonsWidth += .52;
        }
        if (data.title != oldData.title) {
            let titleW = width - buttonsWidth - .1;
            dragButton.setAttribute("xyrect", {
                width: titleW,
                height: .45
            });
            dragButton.setAttribute("xylabel", {
                value: data.title,
                wrapCount: Math.max(10, titleW / .2),
                xOffset: .1
            });
        }
        dragButton.setAttribute("geometry", {
            width: width - buttonsWidth
        });
        dragButton.object3D.position.set(-buttonsWidth / 2, tiyleY, 0);
        if (background) {
            background.object3D.scale.set(width + .1, height + .7, 1);
        }
    }
});

AFRAME.registerSystem("xywindow", {
    windows: [],
    registerWindow(window) {
        this.windows.push(window);
    },
    unregisterWindow(window) {
        this.windows = this.windows.filter(w => w != window);
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
        }
    },
    init() {
        let data = this.data;
        let el = this.el;
        let thumb = this._thumb = XYTheme.get(el).createButton(data.thumbSize, data.thumbSize, el);
        let plane = new THREE.PlaneGeometry(1, .08);
        let bar = this._bar = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
            color: data.color0
        }));
        let prog = this._prog = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
            color: data.color1
        }));
        prog.position.z = .02;
        el.setObject3D("xyrange", new THREE.Group().add(bar, prog));
        thumb.setAttribute("xydraggable", {
            base: el
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
        if (data.max == data.min) return;
        let r = this.el.components.xyrect.width - data.thumbSize;
        let w = r * (data.value - data.min) / (data.max - data.min);
        this._thumb.setAttribute("geometry", "radius", data.thumbSize / 2);
        this._thumb.object3D.position.set(w - r / 2, 0, .04);
        this._bar.scale.x = r;
        this._prog.scale.x = w || .01;
        this._prog.position.x = (w - r) / 2;
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
        this._filterEvent = this._filterEvent.bind(this);
        this._filterTargets = [ "click", "mousedown", "mouseenter", "mouseleave", "mousemove" ];
        this._filterTargets.forEach(t => this.el.addEventListener(t, this._filterEvent, true));
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
        this._filterTargets.forEach(t => this.el.removeEventListener(t, this._filterEvent, true));
        this._clippingPlanes = [];
        this.applyClippings();
    },
    tick() {
        if (!this.el.object3D.matrixWorld.equals(this._currentMatrix)) {
            this._updateMatrix();
        }
    },
    _filterEvent(ev) {
        if (!(ev.path || ev.composedPath()).includes(this.data.exclude)) {
            if (ev.detail.intersection && this.isClipped(ev.detail.intersection.point)) {
                ev.stopPropagation();
                let raycaster = ev.detail.cursorEl && ev.detail.cursorEl.components.raycaster;
                if (raycaster) {
                    let targets = raycaster.intersectedEls;
                    let c = targets.lastIndexOf(ev.target);
                    if (c >= 0 && c + 1 < targets.length) {
                        targets[c + 1].dispatchEvent(new CustomEvent(ev.type, ev));
                    }
                }
            }
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
            }
            for (let child of obj.children) {
                setCliping(child);
            }
        };
        setCliping(this.el.object3D);
    },
    isClipped(p) {
        return this._clippingPlanes.some(plane => plane.distanceToPoint(p) < 0);
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
        let controls = this._control = this._initScrollBar(el, .3);
        el.setAttribute("xyclipping", {
            exclude: controls
        });
        el.setAttribute("xydraggable", {});
        el.addEventListener("xy-drag", ev => {
            let d = ev.detail.pointDelta;
            this._speedY = -d.y;
            this._scrollOffset(d.x, -d.y);
        });
        el.addEventListener("xy-dragstart", ev => this.play());
        el.addEventListener("xy-dragend", ev => this.play());
        el.addEventListener("xyresize", ev => this.update());
        for (let child of el.children) {
            if (child != controls) {
                child.addEventListener("xyresize", ev => this.update());
            }
        }
    },
    _initScrollBar(el, w) {
        let theme = XYTheme.get(el);
        let scrollBar = this._scrollBar = el.appendChild(document.createElement("a-entity"));
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
        this.setScroll(0, 0);
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
        let el = this.el;
        let xyrect = el.components.xyrect;
        let children = el.children;
        let contentHeight = 0;
        let contentWidth = 0;
        for (let child of children) {
            if (child === this._control) continue;
            if (!child.components.xyrec) {
                child.setAttribute("xyrect", {});
            }
            contentWidth = Math.max(contentWidth, child.components.xyrect.width);
            contentHeight = Math.max(contentHeight, child.components.xyrect.height);
        }
        this._contentHeight = contentHeight;
        this._scrollX = Math.max(0, Math.min(x, contentWidth - xyrect.width));
        this._scrollY = Math.max(0, Math.min(y, contentHeight - xyrect.height));
        let thumbLen = this._thumbLen = Math.max(.2, Math.min(this._scrollLength * xyrect.height / contentHeight, this._scrollLength));
        this._scrollThumb.setAttribute("geometry", "height", thumbLen);
        let thumbY = this._scrollStart - thumbLen / 2 - (this._scrollLength - thumbLen) * this._scrollY / (contentHeight - xyrect.height || 1);
        this._scrollThumb.setAttribute("position", "y", thumbY);
        for (let item of children) {
            if (item === this._control || (item.getAttribute("xyitem") || {}).fixed) {
                continue;
            }
            let itemRect = item.components.xyrect;
            let itemPivot = itemRect.data.pivot;
            let vy = (1 - itemPivot.y) * itemRect.height - this._scrollY;
            let vx = -itemPivot.x * itemRect.width + this._scrollX;
            let pos = item.getAttribute("position");
            pos.x = -vx;
            pos.y = -vy + xyrect.height;
            item.setAttribute("position", pos);
            item.emit("xyviewport", [ vy, vy - xyrect.height, vx, vx + xyrect.width ], false);
        }
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
                    data.itemHeight = el.getAttribute("height") * 1;
                    data.itemWidth = el.getAttribute("width") * 1;
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
        el.addEventListener("click", ev => {
            for (let p of ev.path || ev.composedPath()) {
                let index = p.dataset.listPosition;
                if (index != null && index >= 0) {
                    el.emit("clickitem", {
                        index: index,
                        ev: ev
                    }, false);
                    break;
                }
            }
        });
        this.setViewport([ 0, 0 ]);
    },
    setLayout(layout) {
        this._layout = layout;
    },
    setAdapter(adapter) {
        this._adapter = adapter;
    },
    setContents(data, count) {
        this._userData = data;
        this._itemCount = count != null ? count : data.length;
        this.el.setAttribute("xyrect", this._layout.size(this._itemCount, this));
        for (let el of Object.values(this._elements)) {
            el.dataset.listPosition = -1;
        }
        this._refresh();
    },
    setViewport(vp) {
        this._viewport = vp;
        this._refresh();
    },
    _refresh() {
        let adapter = this._adapter;
        let el = this.el;
        let elements = this._elements;
        let visiblePositions = {};
        let retry = false;
        if (!adapter) return;
        for (let position of this._layout.targets(this._viewport)) {
            if (position >= 0 && position < this._itemCount) {
                visiblePositions[position] = true;
                let itemEl = elements[position];
                if (!itemEl) {
                    itemEl = elements[position] = this._cache.pop() || el.appendChild(adapter.create(el));
                    itemEl.classList.add(XYTheme.get(el).collidableClass);
                }
                retry |= !itemEl.hasLoaded;
                if (itemEl.hasLoaded && itemEl.dataset.listPosition != position) {
                    itemEl.dataset.listPosition = position;
                    this._layout.layout(itemEl, position);
                    adapter.bind(position, itemEl, this._userData);
                }
            }
        }
        for (let [position, el] of Object.entries(elements)) {
            el.setAttribute("visible", visiblePositions[position] == true);
            if (!visiblePositions[position]) {
                this._cache.push(el);
                delete elements[position];
            }
        }
        if (retry) {
            setTimeout(() => this._refresh(), 1);
        }
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
            height: .5,
            updateGeometry: true
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
            height: .5,
            updateGeometry: true
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
        value: "xyrange.value"
    }
});