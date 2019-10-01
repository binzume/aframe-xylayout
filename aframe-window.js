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
        let w = data.width || 0.01, h = data.height || 0.01;
        let x = -w / 2, y = -h / 2;
        shape.moveTo(x, y + radius);
        shape.lineTo(x, y + h - radius);
        shape.quadraticCurveTo(x, y + h, x + radius, y + h);
        shape.lineTo(x + w - radius, y + h);
        shape.quadraticCurveTo(x + w, y + h, x + w, y + h - radius);
        shape.lineTo(x + w, y + radius);
        shape.quadraticCurveTo(x + w, y, x + w - radius, y);
        shape.lineTo(x + radius, y);
        shape.quadraticCurveTo(x, y, x, y + radius);
        this.geometry = new THREE.ShapeGeometry(shape);
    }
});

AFRAME.registerComponent('xylabel', {
    dependencies: ['xyrect'],
    schema: {
        resolution: { default: 32 },
        renderingMode: { default: 'auto', oneOf: ['auto', 'canvas'] },
        wrapCount: { default: 0 },
        xOffset: { default: 0 },
        zOffset: { default: 0.01 },
        value: { default: '' },
        color: { default: 'white' },
        align: { default: 'left' }
    },
    init() {
        this.el.addEventListener('xyresize', ev => this.update());
    },
    update() {
        let data = this.data;
        let widthFactor = 0.65;
        let wrapCount = data.wrapCount;
        let xyrect = this.el.components.xyrect;

        if (data.value == "") {
            this.remove();
            return;
        }
        if (wrapCount == 0) {
            let h = xyrect.height;
            if (h > 0) {
                let w = xyrect.width;
                wrapCount = Math.max(w / h / widthFactor, data.value.length) + 1;
            }
        }
        if (data.renderingMode == 'auto' && !/[\u0100-\uDFFF]/.test(data.value)) {
            let textData = Object.assign({}, data);
            delete textData['resolution'];
            delete textData['renderingMode'];
            textData.wrapCount = wrapCount;
            textData.width = xyrect.width;
            textData.height = xyrect.height;
            this.el.setAttribute('text', textData);
            let textObj = this.el.getObject3D('text');
            if (textObj) {
                textObj.raycast = function () { }; // to disable raycast
            }
            this.canvas = null;
            this._removeObject3d();
            return;
        }
        this._removeText();

        let canvasWidth = Math.floor(data.resolution * (wrapCount * widthFactor));
        let canvasHeight = Math.floor(data.resolution);

        if (!this.canvas || this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
            if (this.canvas == null) {
                this.canvas = document.createElement("canvas");
            }
            this.canvas.height = canvasHeight;
            this.canvas.width = canvasWidth;
            let w = xyrect.width || 1;
            let h = xyrect.data.height > 0 ? xyrect.height : w / (wrapCount * widthFactor);
            let texture = new THREE.CanvasTexture(this.canvas);
            texture.anisotropy = 4;
            // texture.minFilter = THREE.LinearFilter;
            let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            let mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
            mesh.position.copy(new THREE.Vector3(data.xOffset, 0, data.zOffset));
            this._removeObject3d();
            this.el.setObject3D("xylabel", mesh);
        }

        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.font = "" + (data.resolution * 0.9) + "px bold sans-serif";
        ctx.textBaseline = "top";
        ctx.textAlign = data.align;
        ctx.fillStyle = data.color;
        let x = data.align === "center" ? canvasWidth / 2 : 0;
        ctx.fillText(data.value, x, data.resolution * 0.1);

        this.el.object3DMap.xylabel.material.map.needsUpdate = true;
    },
    remove() {
        this.canvas = null;
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
        }
    }
});

AFRAME.registerComponent('xybutton', {
    dependencies: ['xyrect'],
    schema: {
        label: { default: "" },
        labelColor: { default: "" },
        color: { default: "" },
        hoverColor: { default: "" }
    },
    init() {
        this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: this.el.components.xyrect.width, height: this.el.components.xyrect.height,
            color: this.data.color, hoverColor: this.data.hoverColor
        }, null, this.el);
        this.el.addEventListener('xyresize', (ev) => {
            this.el.setAttribute("geometry", { width: ev.detail.xyrect.width, height: ev.detail.xyrect.height });
        });
    },
    update(oldData) {
        if (this.data.label !== oldData.label) {
            this.el.setAttribute("xylabel", { value: this.data.label, color: this.data.labelColor, align: 'center' });
        }
    }
});

AFRAME.registerComponent('xytoggle', {
    dependencies: ['xyrect'],
    schema: {
        value: { default: false }
    },
    init() {
        this.buttonParams = {
            width: 1, height: 1
        };
        this.el.sceneEl.systems.xywindow.createSimpleButton(this.buttonParams, null, this.el);

        this.thumb = document.createElement('a-circle');
        this.thumb.setAttribute("position", "z", 0.1);
        this.el.appendChild(this.thumb);
        this.el.addEventListener('click', ev => {
            this.el.setAttribute('xytoggle', 'value', !this.data.value);
        });
    },
    update() {
        let theme = this.el.sceneEl.systems.xywindow.theme;
        let v = this.data.value;
        this.buttonParams.color = v ? "#0066ff" : theme.buttonColor;
        this.buttonParams.hoverColor = v ? "#4499ff" : theme.buttonHoverColor;
        this.el.setAttribute('material', 'color', this.buttonParams.color);
        let xyrect = this.el.components.xyrect;
        let r = xyrect.height / 2;
        this.thumb.setAttribute("geometry", "radius", r * 0.8);
        this.thumb.setAttribute("position", "x", (xyrect.width / 2 - r) * (v ? 1 : -1));
        this.el.setAttribute("geometry", {
            primitive: "xy-rounded-rect", width: xyrect.width, height: xyrect.height, radius: r
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
                let idx = (this.data.select + 1) % this.data.values.length;
                this.el.setAttribute('xyselect', 'select', idx);
                this.el.dispatchEvent(new CustomEvent('change', { detail: { value: this.data.values[idx], index: idx } }));
            } else {
                this.listEl ? this.hide() : this.show();
            }
        });
    },
    update() {
        this.el.setAttribute('xybutton', { label: this.data.label || this.data.values[this.data.select] });
    },
    show() {
        if (this.listEl) return;
        let listY = (this.el.components.xyrect.height + this.data.values.length * 0.5) / 2 + 0.1;
        this.listEl = document.createElement('a-entity');
        this.listEl.setAttribute('xycontainer', { spacing: 0 });
        this.listEl.setAttribute('position', { x: 0, y: listY, z: 0.05 });
        this.el.appendChild(this.listEl);
        this.data.values.forEach((v, i) => {
            let itemEl = document.createElement('a-xybutton');
            itemEl.setAttribute('xybutton', { label: v });
            itemEl.addEventListener('click', ev => {
                ev.stopPropagation();
                this.el.setAttribute('xybutton', { label: this.data.label || v });
                this.el.dispatchEvent(new CustomEvent('change', { detail: { value: v, index: i } }));
                this.hide();
            });
            this.listEl.appendChild(itemEl);
        });
        setTimeout(() => this.listEl && this.listEl.setAttribute('xyrect', { width: 2, height: this.data.values.length * 0.5 }), 0);
    },
    hide() {
        if (!this.listEl) return;
        this.el.removeChild(this.listEl);
        this.listEl.destroy();
        this.listEl = null;
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
        this.dragFun = null;
    },
    remove() {
        this.el.removeEventListener('mousedown', this._onmousedown);
    },
    tick() {
        if (this.dragFun !== null) {
            this.dragFun("xy-drag");
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
        let dragging = false;
        let point = new THREE.Vector3();
        if (draggingRaycaster.ray.intersectPlane(dragPlane, point) === null) {
            baseEl.object3D.worldToLocal(point);
        }
        let prevRay = draggingRaycaster.ray.clone();

        let dragFun = (event) => {
            if (!dragging) {
                let d = startDirection.manhattanDistanceTo(draggingRaycaster.ray.direction);
                if (d < this.data.dragThreshold) return;
                event = "xy-dragstart"
                dragging = true;
            }
            let prevPoint = point.clone();
            if (draggingRaycaster.ray.intersectPlane(dragPlane, point) !== null) {
                baseEl.object3D.worldToLocal(point);
            }
            this.el.emit(event, { raycaster: draggingRaycaster, point: point, prevPoint: prevPoint, prevRay: prevRay, cursorEl: cursorEl });
            prevRay.copy(draggingRaycaster.ray);
        };
        let self = this;
        this.dragFun = dragFun;
        self.play();

        let cancelEvelt = ev1 => ev1.target != ev.target && ev1.stopPropagation();
        window.addEventListener('mouseenter', cancelEvelt, true);
        window.addEventListener('mouseleave', cancelEvelt, true);

        window.addEventListener('mouseup', function mouseup(ev) {
            if (ev.detail.cursorEl != cursorEl) return;
            window.removeEventListener('mouseup', mouseup);
            window.removeEventListener('mouseenter', cancelEvelt, true);
            window.removeEventListener('mouseleave', cancelEvelt, true);
            self.dragFun = null;
            if (!dragging) return;
            if (self.data.preventClick) {
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
        this.draggable = [];
    },
    update(oldData) {
        let draggable = this.data.draggable;
        if (draggable !== oldData.draggable) {
            this.remove();
            this.draggable = Array.isArray(draggable) ? draggable :
                draggable != "" ? this.el.querySelectorAll(draggable) : [this.el];
            this.draggable.forEach(el => {
                el.setAttribute("xy-draggable", {});
                el.addEventListener("xy-dragstart", this._ondrag);
                el.addEventListener("xy-drag", this._ondrag);
            });
        }
    },
    remove() {
        this.draggable.forEach(el => {
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
                rot = this.prevQ.inverse().premultiply(ev.detail.cursorEl.object3D.quaternion);
            }
            this.prevQ = ev.detail.cursorEl.object3D.quaternion.clone();
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
        this.controls = document.createElement('a-entity');
        this.controls.setAttribute("position", { x: 0, y: 0, z: 0.05 });
        this.el.appendChild(this.controls);

        let dragButton = this.system.createSimpleButton({
            width: 1, height: 0.5, color: this.theme.windowTitleBarColor
        }, this.controls);
        dragButton.setAttribute("xy-drag-control", { target: this.el, autoRotate: true });
        this.dragButton = dragButton;

        if (this.data.closable) {
            let closeButton = this.system.createSimpleButton({
                width: 0.5, height: 0.5,
                color: this.theme.windowTitleBarColor,
                hoverColor: this.theme.windowCloseButtonColor
            }, this.controls);
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
        params.color = params.color || this.theme.buttonColor;
        params.hoverColor = params.hoverColor || this.theme.buttonHoverColor;
        let geometry = params.geometry || this.theme.buttonGeometry;
        let button = el || document.createElement('a-entity');
        button.classList.add(this.theme.collidableClass);
        button.addEventListener('mouseenter', ev => {
            button.setAttribute("material", { color: params.hoverColor });
            if (this.theme.buttonHoverHaptic && ev.detail.cursorEl.components['tracked-controls']) {
                let gamepad = ev.detail.cursorEl.components['tracked-controls'].controller;
                if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
                    gamepad.hapticActuators[0].pulse(this.theme.buttonHoverHaptic, this.theme.buttonHoverHapticMs);
                }
            } else {
                // this.theme.buttonHoverHaptic && navigator.vibrate && navigator.vibrate(this.theme.buttonHoverHapticMs);
            }
        });
        button.addEventListener('mouseleave', ev => {
            button.setAttribute("material", { color: params.color });
        });

        button.setAttribute("geometry", { primitive: geometry, width: params.width, height: params.height });
        button.setAttribute("material", { color: params.color });
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
        thumbSize: { default: 0.4 }
    },
    init() {
        let data = this.data;
        this.value = data.value;

        this.bar = document.createElement('a-entity');
        this.bar.setAttribute("geometry", { primitive: "plane", width: this.el.components.xyrect.width - data.thumbSize, height: 0.05 });
        this.bar.setAttribute("material", { color: "#fff" });
        this.el.appendChild(this.bar);

        this.dragging = false;

        this.thumb = this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: data.thumbSize, height: data.thumbSize
        }, this.el);

        this.thumb.setAttribute("xy-draggable", { base: this.el });
        this.thumb.addEventListener("xy-drag", ev => {
            this.dragging = true;
            let r = this.el.components.xyrect.width - data.thumbSize;
            let p = (ev.detail.point.x + r * 0.5) / r * (data.max - data.min);
            if (data.step > 0) {
                p = Math.round(p / data.step) * data.step;
            }
            this.setValue(p + data.min, true);
            this.el.dispatchEvent(new CustomEvent('change', { detail: { value: this.value } }));
        });
        this.thumb.addEventListener("xy-dragend", ev => this.dragging = false);
    },
    update() {
        let data = this.data;
        if (data.max <= data.min) return;
        let r = this.el.components.xyrect.width - data.thumbSize;
        this.thumb.setAttribute("position", {
            x: r * (data.value - data.min) / (data.max - data.min) - r * 0.5,
            y: 0,
            z: 0.01
        });
    },
    setValue(value, force) {
        if (!this.dragging || force) {
            this.value = Math.max(Math.min(value, this.data.max), this.data.min);
            this.el.setAttribute("xyrange", "value", this.value);
        }
    }
});

AFRAME.registerComponent('xyscroll', {
    dependencies: ['xyrect'],
    schema: {
        scrollbar: { default: true }
    },
    init() {
        this.scrollX = 0;
        this.scrollY = 0;
        this.speedY = 0;
        this.contentHeight = 0;
        this.control = document.createElement('a-entity');
        this.thumbLen = 0.2;
        this.el.appendChild(this.control);
        this._initScrollBar(this.control, 0.3);

        this.el.setAttribute("xyclipping", { exclude: this.control });

        this.el.setAttribute("xy-draggable", {});
        this.el.addEventListener("xy-drag", ev => {
            this.speedY = 0;
            this.setScroll(this.scrollX, this.scrollY + ev.detail.point.y - ev.detail.prevPoint.y);
        });
        this.el.addEventListener("xy-dragend", ev => {
            this.speedY = ev.detail.point.y - ev.detail.prevPoint.y;
            this.play();
        });
        this.el.addEventListener('xyresize', ev => this.update());
        let children = this.el.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i] != this.control) {
                children[i].addEventListener('xyresize', ev => this.update());
            }
        }
    },
    _initScrollBar(el, w) {
        this.upButton = this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: w, height: 0.3
        }, el);
        this.upButton.addEventListener('click', (ev) => {
            this.speedY = -this.scrollDelta * 0.3;
            this.play();
        });

        this.downButton = this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: w, height: 0.3
        }, el);
        this.downButton.addEventListener('click', (ev) => {
            this.speedY = this.scrollDelta * 0.3;
            this.play();
        });
        this.scrollThumb = this.el.sceneEl.systems.xywindow.createSimpleButton({
            width: w * 0.7, height: this.thumbLen
        }, el);
        this.scrollThumb.setAttribute("xy-draggable", { base: this.el });
        this.scrollThumb.addEventListener("xy-drag", ev => {
            let xyrect = this.el.components.xyrect;
            let thumbH = this.thumbLen;
            let scrollY = (this.scrollStart - thumbH / 2 - ev.detail.point.y)
                * Math.max(0.01, this.contentHeight - xyrect.height) / (this.scrollLength - thumbH);
            this.setScroll(this.scrollX, scrollY);
        });
    },
    update() {
        let xyrect = this.el.components.xyrect;
        this.scrollDelta = Math.max(xyrect.height / 2, 0.5);

        let enableScrollbar = this.data.scrollbar;
        this.upButton.setAttribute('visible', enableScrollbar);
        this.upButton.setAttribute("position", { x: xyrect.width + 0.1, y: xyrect.height - 0.15, z: 0.05 });
        this.downButton.setAttribute('visible', enableScrollbar);
        this.downButton.setAttribute("position", { x: xyrect.width + 0.1, y: 0.15, z: 0.05 });
        this.scrollThumb.setAttribute('visible', enableScrollbar);

        this.scrollStart = xyrect.height - 0.3;
        this.scrollLength = xyrect.height - 0.6;
        this.setScroll(0, 0);
    },
    tick() {
        if (Math.abs(this.speedY) > 0.001) {
            this.setScroll(this.scrollX, this.scrollY + this.speedY);
            this.speedY *= 0.8;
        } else {
            this.pause();
        }
    },
    setScroll(x, y) {
        let children = this.el.children;
        let maxH = 0.001;
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            if (child === this.control) continue;
            if (!child.components.xyrect) {
                child.setAttribute("xyrect", {});
            }
            maxH = Math.max(maxH, child.components.xyrect.height);
        }
        this.contentHeight = maxH;
        let xyrect = this.el.components.xyrect;

        this.scrollX = Math.max(0, x);
        this.scrollY = Math.max(0, Math.min(y, this.contentHeight - xyrect.height));

        let thumbH = Math.max(0.2, Math.min(this.scrollLength * xyrect.height / this.contentHeight, this.scrollLength));
        let thumbY = this.scrollStart - thumbH / 2 - (this.scrollLength - thumbH) * this.scrollY / Math.max(0.01, this.contentHeight - xyrect.height);
        this.thumbLen = thumbH;
        this.scrollThumb.hasAttribute("geometry") && this.scrollThumb.setAttribute("geometry", "height", thumbH);
        this.scrollThumb.setAttribute("position", { x: xyrect.width + 0.1, y: thumbY, z: 0.05 });

        for (let i = 0; i < children.length; i++) {
            let item = children[i];
            if (item === this.control) continue;
            if (item.components.xyitem && item.components.xyitem.data.fixed) {
                continue;
            }
            let pos = item.getAttribute("position");
            let itemRect = item.components.xyrect;
            pos.x = -this.scrollX + itemRect.data.pivotX * itemRect.width;
            pos.y = this.scrollY - (1.0 - itemRect.data.pivotY) * itemRect.height + xyrect.height;
            item.setAttribute("position", pos);
            let t = itemRect.height - this.scrollY;
            item.emit('xyviewport', [t, t - xyrect.height, this.scrollX, this.scrollX + xyrect.width]);
        }
        if (this.el.components.xyclipping) {
            this.el.components.xyclipping.applyClippings();
        }
    }
});

AFRAME.registerComponent('xylist', {
    dependencies: ['xyrect'],
    schema: {
        width: { default: -1 },
        itemHeight: { default: -1 },
        vertical: { default: true }
    },
    init() {
        this.elementFactory = null;
        this.elementUpdator = null;
        this.elements = [];
        this.userData = null;
        this.itemCount = 0;
        this.el.setAttribute("xyrect", { width: this.data.width, height: this.data.itemHeight, pivotX: 0, pivotY: 0 });
        this.setViewPort([0, 0]);
        this.el.addEventListener('xyviewport', ev => this.setViewPort(ev.detail));
        this.el.classList.add(this.el.sceneEl.systems.xywindow.theme.collidableClass);
        this.el.addEventListener('click', (ev) => {
            let path = ev.path || ev.composedPath();
            for (let i = 0; i < path.length; i++) {
                let index = path[i].dataset.listPosition;
                if (index != null && index != -1) {
                    this.el.emit('clickitem', { index: index, ev: ev });
                    break;
                }
            }
        });
    },
    setCallback(factory, constructor) {
        this.elementFactory = factory;
        this.elementUpdator = constructor;
        if (this.data.itemHeight < 0) {
            let el = this.elementFactory(this.el, this.userData);
            this.data.itemHeight = el.getAttribute("height") * 1.0;
        }
    },
    setContents(data, size) {
        this.userData = data;
        this.itemCount = size != null ? size : data.length;
        let hh = this.data.itemHeight * this.itemCount;
        this.el.setAttribute("xyrect", { width: this.data.width, height: hh });
        for (let t = 0; t < this.elements.length; t++) {
            this.elements[t].setAttribute('visible', false);
            this.elements[t].dataset.listPosition = -1;
        }
        this.refresh();
    },
    setViewPort(vp) {
        this.top = vp[0];
        this.bottom = vp[1];
        this.refresh();
    },
    refresh() {
        if (!this.elementFactory) return;
        let hh = this.data.itemHeight * this.itemCount;
        let st = Math.max(Math.floor((hh - this.top) / this.data.itemHeight), 0);
        let en = Math.min(Math.ceil((hh - this.bottom) / this.data.itemHeight), this.itemCount);
        let n = en - st + 1;
        if (n > this.elements.length) {
            // TODO: compaction
            while (n > this.elements.length) {
                let el = this.elementFactory(this.el, this.userData);
                el.dataset.listPosition = -1;
                el.classList.add(this.el.sceneEl.systems.xywindow.theme.collidableClass);
                this.el.appendChild(el);
                this.elements.push(el);
            }
        }
        let retry = false;
        for (let position = st; position < en; position++) {
            retry |= !this._updateElement(position);
        }
        if (retry) setTimeout(this.refresh.bind(this), 100);

        for (let t = 0; t < this.elements.length; t++) {
            let p = this.elements[t].dataset.listPosition;
            this.elements[t].setAttribute('visible', p >= st && p < en);
        }
    },
    _updateElement(position) {
        let el = this.elements[position % this.elements.length];
        if (!el.hasLoaded) return false;
        if (el.dataset.listPosition == position) return true;
        el.dataset.listPosition = position;
        let x = 0.0, y = (this.itemCount - position - 1) * this.data.itemHeight;
        let xyrect = el.components.xyrect;
        if (xyrect) {
            x += xyrect.data.pivotX * xyrect.width;
            y += xyrect.data.pivotY * xyrect.height;
        }
        el.setAttribute("position", { x: x, y: y, z: 0 });
        this.elementUpdator && this.elementUpdator(position, el, this.userData);
        return true;
    },
});

AFRAME.registerComponent('xycanvas', {
    schema: {
        width: { default: 100 },
        height: { default: 100 }
    },
    init() {
        this.canvas = document.createElement("canvas");

        // to avoid texture cache confrict in a-frame.
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
        xybutton: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        label: 'xybutton.label'
    }
});

AFRAME.registerPrimitive('a-xytoggle', {
    xyrect: { width: 2, height: 0.5 },
    defaultComponents: {
        xyrect: {}
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
        min: 'xyrange.min',
        max: 'xyrange.max',
        step: 'xyrange.step',
        value: 'xyrange.value',
        width: 'xyrect.width',
        height: 'xyrect.height'
    }
});
