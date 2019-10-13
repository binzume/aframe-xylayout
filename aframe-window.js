"use strict";

AFRAME.registerGeometry('xy-rounded-rect', {
    schema: {
        height: { default: 1, min: 0 },
        width: { default: 1, min: 0 },
        radius: { default: 0.05, min: 0 }
    },
    init(data) {
        let shape = new THREE.Shape();
        let radius = data.radius;
        let w = (data.width || 0.01) / 2, h = (data.height || 0.01) / 2;
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

AFRAME.registerComponent('xylabel', {
    dependencies: ['xyrect'],
    schema: {
        value: { default: '' },
        color: { default: 'white' },
        align: { default: 'left' },
        wrapCount: { default: 0 },
        xOffset: { default: 0 },
        zOffset: { default: 0.01 },
        resolution: { default: 32 },
        renderingMode: { default: 'auto', oneOf: ['auto', 'canvas'] }
    },
    init() {
        // TODO: removeEventListener
        this.el.addEventListener('xyresize', ev => this.update());
    },
    update() {
        let data = this.data;
        let widthFactor = 0.65;
        let wrapCount = data.wrapCount;
        let xyrect = this.el.components.xyrect;
        let h = xyrect.height;
        let w = xyrect.width;

        if (data.value == "") {
            this.remove();
            return;
        }
        if (wrapCount == 0 && h > 0) {
            wrapCount = Math.max(w / h / widthFactor, data.value.length) + 1;
        }
        if (data.renderingMode == 'auto' && !/[\u0100-\uDFFF]/.test(data.value)) {
            let textData = Object.assign({}, data);
            delete textData['resolution'];
            delete textData['renderingMode'];
            textData.wrapCount = wrapCount;
            textData.width = w;
            textData.height = h;
            this.el.setAttribute('text', textData);
            let textObj = this.el.getObject3D('text');
            if (textObj) {
                textObj.raycast = function () { }; // to disable raycast
            }
            this._removeObject3d();
            return;
        }
        this._removeText();

        let textWidth = Math.floor(data.resolution * (wrapCount * widthFactor));
        let canvasHeight = data.resolution;
        let canvasWidth = data.resolution;
        while (canvasWidth < textWidth) canvasWidth <<= 1;

        let canvas = this.canvas;
        if (!canvas || this.textWidth !== textWidth || canvas.height !== canvasHeight) {
            this._removeObject3d(); // <= this.canvas = null
            this.canvas = canvas = canvas || document.createElement("canvas");
            canvas.height = canvasHeight;
            canvas.width = canvasWidth;
            this.textWidth = textWidth;
            let meshH = xyrect.data.height > 0 ? xyrect.height : w / (wrapCount * widthFactor);
            let texture = new THREE.CanvasTexture(canvas);
            texture.anisotropy = 4;
            texture.alphaTest = 0.2;
            texture.repeat.x = textWidth / canvasWidth;
            let mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(w, meshH),
                new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
            mesh.position.copy(new THREE.Vector3(data.xOffset, 0, data.zOffset));
            this.el.setObject3D("xylabel", mesh);
        }

        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.font = "" + (canvasHeight * 0.9) + "px bold sans-serif";
        ctx.textBaseline = "top";
        ctx.textAlign = data.align;
        ctx.fillStyle = data.color;
        let x = data.align === "center" ? textWidth / 2 : 0;
        ctx.fillText(data.value, x, canvasHeight * 0.1);

        this.el.object3DMap.xylabel.material.map.needsUpdate = true;
    },
    remove() {
        this._removeObject3d();
        this._removeText();
    },
    _removeText() {
        if (this.el.hasAttribute('text')) {
            this.el.removeAttribute('text');
        }
    },
    _removeObject3d() {
        let labelObj = this.el.getObject3D('xylabel');
        if (labelObj) {
            labelObj.material.map.dispose();
            labelObj.material.dispose();
            labelObj.geometry.dispose();
            this.el.removeObject3D("xylabel");
            this.canvas = null;
        }
    }
});

AFRAME.registerComponent('xybutton', {
    dependencies: ['xyrect'],
    schema: {
        color: { default: "" },
        hoverColor: { default: "" }
    },
    init() {
        let xyrect = this.el.components.xyrect;
        this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: xyrect.width, height: xyrect.height,
            color: this.data.color, hoverColor: this.data.hoverColor
        }, null, this.el);
        this.el.addEventListener('xyresize', (ev) => {
            this.el.setAttribute("geometry", { width: ev.detail.xyrect.width, height: ev.detail.xyrect.height });
        });
    }
});

AFRAME.registerComponent('xytoggle', {
    dependencies: ['xyrect'],
    schema: {
        value: { default: false }
    },
    init() {
        this._buttonParams = {
            width: 1, height: 1
        };
        this.el.sceneEl.systems.xywindow.createSimpleButton(this._buttonParams, null, this.el);
        this._thumb = document.createElement('a-circle');
        this.el.appendChild(this._thumb);
        this.el.addEventListener('click', ev => {
            this.el.setAttribute('xytoggle', 'value', !this.data.value);
            this.el.emit('change', { value: !this.data.value }, false);
        });
        this.el.addEventListener('xyresize', (ev) => this.update());
    },
    update() {
        let theme = this.el.sceneEl.systems.xywindow.theme;
        let xyrect = this.el.components.xyrect;
        let params = this._buttonParams;
        let v = this.data.value;
        params.color = v ? "#0066ff" : theme.buttonColor;
        params.hoverColor = v ? "#4499ff" : "";
        this.el.setAttribute('material', 'color', params.color);
        let r = xyrect.height / 2;
        this._thumb.setAttribute("geometry", "radius", r * 0.8);
        this._thumb.setAttribute("position", { x: (xyrect.width / 2 - r) * (v ? 1 : -1), y: 0, z: 0.05 });
        this.el.setAttribute("geometry", {
            primitive: "xy-rounded-rect", width: xyrect.width, height: r * 2, radius: r
        });
    }
});

AFRAME.registerComponent('xyselect', {
    dependencies: ['xyrect', 'xybutton'],
    schema: {
        values: { default: [] },
        label: { default: "" },
        toggle: { default: false },
        select: { default: 0 }
    },
    init() {
        this.el.addEventListener('click', ev => {
            if (this.data.toggle) {
                this.select((this.data.select + 1) % this.data.values.length);
            } else {
                this._listEl ? this.hide() : this.show();
            }
        });
        if (this.data.toggle) {
            this.el.setAttribute("xylabel", "align", "center");
        } else {
            let marker = this._marker = document.createElement("a-triangle");
            marker.setAttribute('geometry', {
                vertexA: { x: 0.1, y: 0.03, z: 0 }, vertexB: { x: -0.1, y: 0.03, z: 0 }, vertexC: { x: 0, y: -0.12, z: 0 }
            });
            this.el.appendChild(marker);
            this.el.addEventListener('xyresize', ev => this.update());
        }
    },
    update() {
        let data = this.data;
        this.el.setAttribute('xylabel', { value: data.label || data.values[data.select] });
        if (this._marker) {
            this._marker.setAttribute('position', { x: this.el.components.xyrect.width / 2 - 0.2, y: 0, z: 0.05 });
        }
    },
    show() {
        if (this._listEl) return;
        let listY = (this.el.components.xyrect.height + this.data.values.length * 0.5) / 2 + 0.1;
        this._listEl = document.createElement('a-entity');
        this._listEl.setAttribute('xycontainer', { spacing: 0 });
        this._listEl.setAttribute('position', { x: 0, y: listY, z: 0.05 });
        this.el.appendChild(this._listEl);
        this.data.values.forEach((v, i) => {
            let itemEl = document.createElement('a-xybutton');
            itemEl.setAttribute('label', v);
            itemEl.addEventListener('click', ev => {
                ev.stopPropagation();
                this.select(i);
                this.hide();
            });
            this._listEl.appendChild(itemEl);
        });
        setTimeout(() => this._listEl && this._listEl.setAttribute('xyrect', { width: 2, height: this.data.values.length * 0.5 }), 0);
    },
    select(idx) {
        this.el.setAttribute('xyselect', 'select', idx);
        this.el.emit('change', { value: this.data.values[idx], index: idx }, false);
    },
    hide() {
        if (!this._listEl) return;
        this.el.removeChild(this._listEl);
        this._listEl.destroy();
        this._listEl = null;
    },
});

AFRAME.registerComponent('xy-draggable', {
    schema: {
        dragThreshold: { default: 0.02 },
        preventClick: { default: true },
        base: { type: 'selector', default: null }
    },
    init() {
        this.el.classList.add(this.el.sceneEl.systems.xywindow.theme.collidableClass);
        this._onmousedown = this._onmousedown.bind(this);
        this.el.addEventListener('mousedown', this._onmousedown);
        this._dragFun = null;
    },
    remove() {
        this.el.removeEventListener('mousedown', this._onmousedown);
    },
    tick() {
        if (this._dragFun !== null) {
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
        let point = new THREE.Vector3();
        if (draggingRaycaster.ray.intersectPlane(dragPlane, point) === null) {
            baseEl.object3D.worldToLocal(point);
        }
        let prevRay = draggingRaycaster.ray.clone();
        let _this = this;
        let dragging = false;

        let dragFun = this._dragFun = (event) => {
            if (!dragging) {
                let d = startDirection.manhattanDistanceTo(draggingRaycaster.ray.direction);
                if (d < _this.data.dragThreshold) return;
                event = "xy-dragstart"
                _this.dragging = dragging = true;
            }
            let prevPoint = point.clone();
            if (draggingRaycaster.ray.intersectPlane(dragPlane, point) !== null) {
                baseEl.object3D.worldToLocal(point);
            }
            _this.el.emit(event, { raycaster: draggingRaycaster, point: point, prevPoint: prevPoint, prevRay: prevRay, cursorEl: cursorEl });
            prevRay.copy(draggingRaycaster.ray);
        };
        _this.play();

        let cancelEvelt = ev1 => ev1.target != ev.target && ev1.stopPropagation();
        window.addEventListener('mouseenter', cancelEvelt, true);
        window.addEventListener('mouseleave', cancelEvelt, true);

        window.addEventListener('mouseup', function mouseup(ev) {
            if (ev.detail.cursorEl != cursorEl) return;
            window.removeEventListener('mouseup', mouseup);
            window.removeEventListener('mouseenter', cancelEvelt, true);
            window.removeEventListener('mouseleave', cancelEvelt, true);
            _this._dragFun = null;
            if (!dragging) return;
            _this.dragging = false;
            if (_this.data.preventClick) {
                let cancelClick = ev => ev.stopPropagation();
                window.addEventListener('click', cancelClick, true);
                setTimeout(() => window.removeEventListener('click', cancelClick, true), 0);
            }
            setTimeout(() => dragFun("xy-dragend"), 15);
        });
    }
});

AFRAME.registerComponent('xy-drag-control', {
    schema: {
        target: { type: 'selector', default: null },
        draggable: { default: "" },
        autoRotate: { default: false },
        mode: { default: "grab" }
    },
    init() {
        this._ondrag = this._ondrag.bind(this);
        this._draggable = [];
    },
    update(oldData) {
        let draggable = this.data.draggable;
        if (draggable !== oldData.draggable) {
            this.remove();
            this._draggable = Array.isArray(draggable) ? draggable :
                draggable != "" ? this.el.querySelectorAll(draggable) : [this.el];
            this._draggable.forEach(el => {
                el.setAttribute("xy-draggable", {});
                el.addEventListener("xy-dragstart", this._ondrag);
                el.addEventListener("xy-drag", this._ondrag);
            });
        }
    },
    remove() {
        this._draggable.forEach(el => {
            el.removeAttribute("xy-draggable");
            el.removeEventListener("xy-dragstart", this._ondrag);
            el.removeEventListener("xy-drag", this._ondrag);
        });
    },
    _ondrag(ev) {
        let direction = ev.detail.raycaster.ray.direction;
        let prevDirection = ev.detail.prevRay.direction;
        let target = this.data.target || this.el;
        let rot;
        if (ev.detail.cursorEl.components['tracked-controls']) {
            if (ev.type == "xy-dragstart") {
                rot = new THREE.Quaternion();
            } else {
                rot = this._prevQ.inverse().premultiply(ev.detail.cursorEl.object3D.quaternion);
            }
            this._prevQ = ev.detail.cursorEl.object3D.quaternion.clone();
        } else {
            rot = new THREE.Quaternion().setFromUnitVectors(prevDirection, direction);
        }

        let matrix = new THREE.Matrix4().makeRotationFromQuaternion(rot);
        let o1 = ev.detail.prevRay.origin;
        let o2 = ev.detail.raycaster.ray.origin;
        let tr = new THREE.Matrix4();
        matrix.multiply(tr.makeTranslation(-o1.x, -o1.y, -o1.z));
        matrix.premultiply(tr.makeTranslation(o2.x, o2.y, o2.z));
        target.object3D.applyMatrix(matrix);

        if (this.data.mode == "pull") {
            let targetPosition = target.object3D.getWorldPosition(new THREE.Vector3());
            let d = direction.clone().sub(prevDirection);
            let f = targetPosition.distanceTo(ev.detail.raycaster.ray.origin) * 2;
            target.object3D.position.add(direction.clone().multiplyScalar(-d.y * f));
        }

        if (this.data.autoRotate) {
            let cameraPosition = this.el.sceneEl.camera.getWorldPosition(new THREE.Vector3());
            let targetPosition = target.object3D.getWorldPosition(new THREE.Vector3());
            let d = cameraPosition.clone().sub(targetPosition).normalize();
            let t = 0.8 - d.y * d.y;
            if (t > 0) {
                let mat = new THREE.Matrix4().lookAt(cameraPosition, targetPosition, new THREE.Vector3(0, 1, 0));
                let rotation = new THREE.Quaternion().setFromRotationMatrix(mat);
                let intersection = ev.detail.cursorEl.components.raycaster.getIntersection(ev.target);
                let intersectPoint = intersection ? intersection.point : targetPosition;
                let c = target.object3D.parent.worldToLocal(intersectPoint);
                let oq = target.object3D.quaternion.clone();
                THREE.Quaternion.slerp(target.object3D.quaternion, rotation, target.object3D.quaternion, t * 0.1);
                target.object3D.position.sub(c).applyQuaternion(oq.inverse().premultiply(target.object3D.quaternion)).add(c);
            }
        }
    }
});

AFRAME.registerComponent('xywindow', {
    dependencies: ['xycontainer'],
    schema: {
        title: { default: "" },
        closable: { default: true }
    },
    init() {
        this.theme = this.system.theme;
        let controls = this.controls = document.createElement('a-entity');
        controls.setAttribute("position", { x: 0, y: 0, z: 0.05 });
        controls.setAttribute("xyitem", { fixed: true });
        this.el.appendChild(controls);

        let dragButton = this.system.createSimpleButton({
            width: 1, height: 0.5, color: this.theme.windowTitleBarColor
        }, controls);
        dragButton.setAttribute("xy-drag-control", { target: this.el, autoRotate: true });
        this.dragButton = dragButton;

        if (this.data.closable) {
            let closeButton = this.system.createSimpleButton({
                width: 0.5, height: 0.5,
                color: this.theme.windowTitleBarColor,
                hoverColor: this.theme.windowCloseButtonColor
            }, controls);
            closeButton.setAttribute("xylabel", {
                value: "X", align: "center", color: this.theme.buttonLabelColor
            });
            closeButton.addEventListener('click', (ev) =>
                this.el.parentNode.removeChild(this.el)
            );
            this.closeButton = closeButton;
        }

        this.titleText = document.createElement('a-entity');
        this.dragButton.appendChild(this.titleText);
        this.el.addEventListener('xyresize', (ev) => {
            this.update({});
        });
        this.system.registerWindow(this);
    },
    remove() {
        this.system.unregisterWindow(this);
    },
    update(oldData) {
        let xyrect = this.el.components.xyrect;
        let a = 0;
        if (this.closeButton) {
            this.closeButton.setAttribute("position", { x: xyrect.width / 2 - 0.25, y: 0.3, z: 0 });
            a += 0.52;
        }
        if (this.data.title != oldData.title) {
            let titleW = xyrect.width - a - 0.2;
            this.titleText.setAttribute("xyrect", { width: titleW, height: 0.45 });
            this.titleText.setAttribute("xylabel", {
                value: this.data.title, wrapCount: Math.max(10, titleW / 0.2),
                color: this.theme.windowTitleColor, xOffset: 0.1
            });
        }
        this.controls.setAttribute("position", "y", xyrect.height * 0.5);
        this.dragButton.setAttribute("geometry", "width", xyrect.width - a);
        this.dragButton.setAttribute("position", { x: -a / 2, y: 0.3, z: 0 });
    },
    setTitle(title) {
        this.el.setAttribute("xywindow", "title", title);
    }
});

AFRAME.registerSystem('xywindow', {
    theme: {
        buttonColor: "#222",
        buttonHoverColor: "#333",
        buttonLabelColor: "#fff",
        buttonHoverHaptic: 0.3,
        buttonHoverHapticMs: 10,
        buttonGeometry: 'xy-rounded-rect',
        windowCloseButtonColor: "#f00",
        windowTitleBarColor: "#111",
        windowTitleColor: "#fff",
        collidableClass: "collidable",
    },
    windows: [],
    createSimpleButton(params, parent, el) {
        let button = el || document.createElement('a-entity');
        if (!button.hasAttribute("geometry")) {
            button.setAttribute("geometry", {
                primitive: this.theme.buttonGeometry, width: params.width, height: params.height
            });
        }
        button.classList.add(this.theme.collidableClass);
        button.addEventListener('mouseenter', ev => {
            let theme = this.theme;
            button.setAttribute("material", { color: params.hoverColor || this.theme.buttonHoverColor });
            if (theme.buttonHoverHaptic && ev.detail.cursorEl.components['tracked-controls']) {
                let gamepad = ev.detail.cursorEl.components['tracked-controls'].controller;
                if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
                    gamepad.hapticActuators[0].pulse(theme.buttonHoverHaptic, theme.buttonHoverHapticMs);
                }
            } else {
                // theme.buttonHoverHaptic && navigator.vibrate && navigator.vibrate(theme.buttonHoverHapticMs);
            }
        });
        button.addEventListener('mouseleave', ev => {
            button.setAttribute("material", { color: params.color || this.theme.buttonColor });
        });
        button.setAttribute("material", { color: params.color || this.theme.buttonColor });
        parent && parent.appendChild(button);
        return button;
    },
    registerWindow(w) {
        this.windows.push(w);
    },
    unregisterWindow(w) {
        let p = this.windows.indexOf(w);
        if (p >= 0) {
            this.windows.splice(p, 1);
        }
    }
});

AFRAME.registerComponent('xyrange', {
    dependencies: ['xyrect'],
    schema: {
        min: { default: 0 },
        max: { default: 100 },
        step: { default: 0 },
        value: { default: 0 },
        color0: { default: "white" },
        color1: { default: "#06f" },
        thumbSize: { default: 0.4 }
    },
    init() {
        let data = this.data;

        let plane = new THREE.PlaneGeometry(1, 0.08);
        let bar = this._bar = new THREE.Mesh(
            plane, new THREE.MeshBasicMaterial({ color: data.color0 }));

        let prog = this._prog = new THREE.Mesh(
            plane, new THREE.MeshBasicMaterial({ color: data.color1 }));
        prog.position.z = 0.02;
        this.el.setObject3D("xyrange-bar", bar);
        this.el.setObject3D("xyrange-prog", prog);

        this._thumb = this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: data.thumbSize, height: data.thumbSize
        }, this.el);

        this._thumb.setAttribute("xy-draggable", { base: this.el });
        this._thumb.addEventListener("xy-drag", ev => {
            let r = this.el.components.xyrect.width - data.thumbSize;
            let p = (ev.detail.point.x + r / 2) / r * (data.max - data.min);
            if (data.step > 0) {
                p = Math.round(p / data.step) * data.step;
            }
            this.setValue(p + data.min, true);
        });
    },
    update() {
        let data = this.data;
        this.value = data.value;
        if (data.max <= data.min) return;
        let r = this.el.components.xyrect.width - data.thumbSize;
        let w = r * (data.value - data.min) / (data.max - data.min);
        this._thumb.setAttribute("geometry", "radius", data.thumbSize / 2);
        this._thumb.setAttribute("position", {
            x: w - r / 2,
            y: 0,
            z: 0.04
        });
        this._bar.scale.x = r;
        this._prog.scale.x = w || 0.01;
        this._prog.position.x = (w - r) / 2;
    },
    setValue(value, emitEvent) {
        if (!this._thumb.components["xy-draggable"].dragging || emitEvent) {
            let v = Math.max(Math.min(value, this.data.max), this.data.min);
            if (v != this.value && emitEvent) {
                this.el.emit('change', { value: v }, false);
            }
            this.el.setAttribute("xyrange", "value", v);
        }
    }
});

AFRAME.registerComponent('xyclipping', {
    dependencies: ['xyrect'],
    schema: {
        exclude: { type: 'selector', default: null },
        clipTop: { default: true },
        clipBottom: { default: true },
        clipLeft: { default: false },
        clipRight: { default: false }
    },
    init() {
        this.el.sceneEl.renderer.localClippingEnabled = true;
        this._clippingPlanesLocal = [];
        this._clippingPlanes = [];
        this._currentMatrix = null;
        this._filterEvent = this._filterEvent.bind(this);
        this._filterTargets = ['click', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove'];
        this._filterTargets.forEach(t => this.el.addEventListener(t, this._filterEvent, true));
    },
    update() {
        let rect = this.el.components.xyrect;
        let planes = [];
        if (this.data.clipBottom) planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
        if (this.data.clipTop) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), rect.height));
        if (this.data.clipLeft) planes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
        if (this.data.clipRight) planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), rect.width));
        this._clippingPlanesLocal = planes;
        this._clippingPlanes = [];
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
                if (ev.detail.cursorEl && ev.detail.cursorEl.components.raycaster) {
                    let targets = ev.detail.cursorEl.components.raycaster.intersectedEls;
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
        for (let i = 0; i < this._clippingPlanesLocal.length; i++) {
            this._clippingPlanes[i] = this._clippingPlanesLocal[i].clone().applyMatrix4(this._currentMatrix);
        }
        this.applyClippings();
    },
    applyClippings() {
        let excludeObj = this.data.exclude && this.data.exclude.object3D;
        let setCliping = (obj) => {
            if (obj === excludeObj) return;
            if (obj.material && obj.material.clippingPlanes !== undefined) {
                obj.material.clippingPlanes = this._clippingPlanes;
            }
            for (let i = 0; i < obj.children.length; i++) {
                setCliping(obj.children[i]);
            }
        };
        setCliping(this.el.object3D);
    },
    isClipped(p) {
        return this._clippingPlanes.some(plane => plane.distanceToPoint(p) < 0);
    }
});

AFRAME.registerComponent('xyscroll', {
    dependencies: ['xyrect'],
    schema: {
        scrollbar: { default: true }
    },
    init() {
        this._scrollX = 0;
        this._scrollY = 0;
        this._speedY = 0;
        this._contentHeight = 0;
        this._thumbLen = 0.2;
        this._control = this._initScrollBar(this.el, 0.3);

        this.el.setAttribute("xyclipping", { exclude: this._control });

        this.el.setAttribute("xy-draggable", {});
        this.el.addEventListener("xy-drag", ev => {
            this._speedY = 0;
            this.setScroll(this._scrollX, this._scrollY + ev.detail.point.y - ev.detail.prevPoint.y);
        });
        this.el.addEventListener("xy-dragend", ev => {
            this._speedY = ev.detail.point.y - ev.detail.prevPoint.y;
            this.play();
        });
        this.el.addEventListener('xyresize', ev => this.update());
        let children = this.el.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i] != this._control) {
                children[i].addEventListener('xyresize', ev => this.update());
            }
        }
    },
    _initScrollBar(el, w) {
        let scrollBar = document.createElement('a-entity');
        el.appendChild(scrollBar);
        this._scrollBar = scrollBar;
        let xywindow = this.el.sceneEl.systems.xywindow;

        this._upButton = xywindow.createSimpleButton({
            width: w, height: 0.3
        }, scrollBar);
        this._upButton.addEventListener('click', (ev) => {
            this._speedY = -this._scrollDelta * 0.3;
            this.play();
        });

        this._downButton = xywindow.createSimpleButton({
            width: w, height: 0.3
        }, scrollBar);
        this._downButton.addEventListener('click', (ev) => {
            this._speedY = this._scrollDelta * 0.3;
            this.play();
        });
        this._scrollThumb = xywindow.createSimpleButton({
            width: w * 0.7, height: this._thumbLen
        }, scrollBar);
        this._scrollThumb.setAttribute("xy-draggable", { base: scrollBar });
        this._scrollThumb.addEventListener("xy-drag", ev => {
            let xyrect = this.el.components.xyrect;
            let thumbH = this._thumbLen;
            let scrollY = (this._scrollStart - thumbH / 2 - ev.detail.point.y)
                * Math.max(0.01, this._contentHeight - xyrect.height) / (this._scrollLength - thumbH);
            this.setScroll(this._scrollX, scrollY);
        });
        return scrollBar;
    },
    update() {
        let xyrect = this.el.components.xyrect;

        let scrollBarHeight = xyrect.height;
        this._scrollBar.setAttribute('visible', this.data.scrollbar);
        this._scrollBar.setAttribute("position", { x: xyrect.width + 0.1, y: 0, z: 0.05 });
        this._upButton.setAttribute("position", { x: 0, y: scrollBarHeight - 0.15, z: 0 });
        this._downButton.setAttribute("position", { x: 0, y: 0.15, z: 0 });

        this._scrollDelta = Math.max(scrollBarHeight / 2, 0.5);
        this._scrollStart = scrollBarHeight - 0.3;
        this._scrollLength = scrollBarHeight - 0.6;
        this.setScroll(0, 0);
    },
    tick() {
        if (Math.abs(this._speedY) > 0.001) {
            this.setScroll(this._scrollX, this._scrollY + this._speedY);
            this._speedY *= 0.8;
        } else {
            this.pause();
        }
    },
    setScroll(x, y) {
        let children = this.el.children;
        let contentHeight = 0;
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            if (child === this._control) continue;
            if (!child.components.xyrect) {
                child.setAttribute("xyrect", {});
            }
            contentHeight = Math.max(contentHeight, child.components.xyrect.height);
        }
        this._contentHeight = contentHeight;
        let xyrect = this.el.components.xyrect;

        this._scrollX = Math.max(0, x);
        this._scrollY = Math.max(0, Math.min(y, contentHeight - xyrect.height));

        let thumbH = Math.max(0.2, Math.min(this._scrollLength * xyrect.height / contentHeight, this._scrollLength));
        let thumbY = this._scrollStart - thumbH / 2 - (this._scrollLength - thumbH) * this._scrollY / Math.max(0.01, contentHeight - xyrect.height);
        this._thumbLen = thumbH;
        this._scrollThumb.hasAttribute("geometry") && this._scrollThumb.setAttribute("geometry", "height", thumbH);
        this._scrollThumb.setAttribute("position", "y", thumbY);

        for (let i = 0; i < children.length; i++) {
            let item = children[i];
            if (item === this._control) continue;
            if (item.components.xyitem && item.components.xyitem.data.fixed) {
                continue;
            }
            let pos = item.getAttribute("position");
            let itemRect = item.components.xyrect;
            pos.x = -this._scrollX + itemRect.data.pivotX * itemRect.width;
            pos.y = this._scrollY - (1.0 - itemRect.data.pivotY) * itemRect.height + xyrect.height;
            item.setAttribute("position", pos);
            let t = itemRect.height - this._scrollY;
            item.emit('xyviewport', [t, t - xyrect.height, this._scrollX, this._scrollX + xyrect.width], false);
        }
        if (this.el.components.xyclipping) {
            this.el.components.xyclipping.applyClippings();
        }
    }
});

AFRAME.registerComponent('xylist', {
    dependencies: ['xyrect'],
    schema: {
        itemWidth: { default: -1 },
        itemHeight: { default: -1 },
        vertical: { default: true }
    },
    init() {
        this._elementFactory = null;
        this._elementUpdator = null;
        this.elements = [];
        this._userData = null;
        this.itemCount = 0;
        this.el.setAttribute("xyrect", { pivotX: 0, pivotY: 0 });
        this.setViewPort([0, 0]);
        this.el.addEventListener('xyviewport', ev => this.setViewPort(ev.detail));
        this.el.classList.add(this.el.sceneEl.systems.xywindow.theme.collidableClass);
        this.el.addEventListener('click', (ev) => {
            let path = ev.path || ev.composedPath();
            for (let i = 0; i < path.length; i++) {
                let index = path[i].dataset.listPosition;
                if (index != null && index != -1) {
                    this.el.emit('clickitem', { index: index, ev: ev }, false);
                    break;
                }
            }
        });
    },
    setCallback(factory, constructor) {
        this._elementFactory = factory;
        this._elementUpdator = constructor;
        if (this.data.itemHeight <= 0) {
            let el = this._elementFactory(this.el, this._userData);
            this.data.itemHeight = el.getAttribute("height") * 1.0;
            this.data.itemWidth = el.getAttribute("width") * 1.0;
        }
    },
    setContents(data, count) {
        this._userData = data;
        this.itemCount = count !== undefined ? count : data.length;
        let height = this.data.itemHeight * this.itemCount;
        this.el.setAttribute("xyrect", { width: this.data.itemWidth, height: height });
        for (let el of this.elements) {
            el.setAttribute('visible', false);
            el.dataset.listPosition = -1;
        }
        this.refresh();
    },
    setViewPort(vp) {
        this.top = vp[0];
        this.bottom = vp[1];
        this.refresh();
    },
    refresh() {
        if (!this._elementFactory) return;
        let itemHeight = this.data.itemHeight;
        let totalHeight = itemHeight * this.itemCount;

        let st = Math.max(Math.floor((totalHeight - this.top) / itemHeight), 0);
        let en = Math.min(Math.ceil((totalHeight - this.bottom) / itemHeight), this.itemCount);
        let n = en - st + 1;
        // TODO: compaction
        while (n > this.elements.length) {
            let el = this._elementFactory(this.el, this._userData);
            el.classList.add(this.el.sceneEl.systems.xywindow.theme.collidableClass);
            this.el.appendChild(el);
            this.elements.push(el);
        }

        let retry = false;
        for (let position = st; position < en; position++) {
            let el = this.elements[position % this.elements.length];
            if (!el.hasLoaded) {
                retry = true;
            } else if (el.dataset.listPosition != position) {
                el.dataset.listPosition = position;
                let x = 0, y = (this.itemCount - position - 1) * itemHeight;
                let xyrect = el.components.xyrect;
                if (xyrect) {
                    x += xyrect.data.pivotX * xyrect.width;
                    y += xyrect.data.pivotY * xyrect.height;
                }
                el.setAttribute("position", { x: x, y: y, z: 0 });
                this._elementUpdator && this._elementUpdator(position, el, this._userData);
            }
        }
        if (retry) setTimeout(() => this.refresh(), 100);

        for (let el of this.elements) {
            let p = el.dataset.listPosition;
            el.setAttribute('visible', p >= st && p < en);
        }
    }
});

AFRAME.registerComponent('xycanvas', {
    schema: {
        width: { default: 100 },
        height: { default: 100 }
    },
    init() {
        this.canvas = document.createElement("canvas");

        // to avoid texture cache conflict in a-frame.
        this.canvas.id = "_CANVAS" + Math.random();
        let src = new THREE.CanvasTexture(this.canvas);
        this.updateTexture = function () {
            src.needsUpdate = true;
        };

        this.el.setAttribute('material', { shader: "flat", npot: true, src: src, transparent: true });
    },
    update() {
        this.canvas.width = this.data.width;
        this.canvas.height = this.data.height;
    }
});

AFRAME.registerPrimitive('a-xylabel', {
    defaultComponents: {
        xyrect: {},
        xylabel: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        value: 'xylabel.value',
        color: 'xylabel.color',
        align: 'xylabel.align',
        'wrap-count': 'xylabel.wrapCount',
    }
});

AFRAME.registerPrimitive('a-xybutton', {
    defaultComponents: {
        xyrect: { width: 2, height: 0.5 },
        xylabel: { align: 'center' },
        xybutton: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        label: 'xylabel.value',
        align: 'xylabel.align',
    }
});

AFRAME.registerPrimitive('a-xytoggle', {
    defaultComponents: {
        xyrect: { width: 0.8, height: 0.4 },
        xytoggle: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        value: 'xytoggle.value'
    }
});

AFRAME.registerPrimitive('a-xyselect', {
    defaultComponents: {
        xyrect: { width: 2, height: 0.5 },
        xyselect: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        values: 'xyselect.values',
        label: 'xyselect.label',
        toggle: 'xyselect.toggle',
        select: 'xyselect.select',
    }
});

AFRAME.registerPrimitive('a-xywindow', {
    defaultComponents: {
        xycontainer: { alignItems: 'stretch' },
        xywindow: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        direction: 'xycontainer.direction',
        title: 'xywindow.title'
    }
});

AFRAME.registerPrimitive('a-xyscroll', {
    defaultComponents: {
        xyrect: { pivotX: 0, pivotY: 1 },
        xyscroll: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        scrollbar: 'xyscroll.scrollbar'
    }
});

AFRAME.registerPrimitive('a-xyrange', {
    defaultComponents: {
        xyrect: {},
        xyrange: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        min: 'xyrange.min',
        max: 'xyrange.max',
        step: 'xyrange.step',
        value: 'xyrange.value'
    }
});
