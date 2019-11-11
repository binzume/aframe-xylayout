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
        let el = this.el;
        let widthFactor = 0.65;
        let wrapCount = data.wrapCount;
        let xyrect = el.components.xyrect;
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
            el.setAttribute('text', textData);
            let textObj = el.getObject3D('text');
            if (textObj) {
                textObj.raycast = () => { }; // disable raycast
            }
            this._removeObject3d();
            return;
        }

        let canvasHeight = data.resolution;
        let textWidth = Math.floor(canvasHeight * wrapCount * widthFactor);

        let canvas = this.canvas;
        if (!canvas || this.textWidth !== textWidth || canvas.height !== canvasHeight) {
            let canvasWidth = 8;
            while (canvasWidth < textWidth) canvasWidth *= 2;
            this.remove(); // <= this.canvas = null
            this.canvas = canvas = canvas || document.createElement("canvas");
            canvas.height = canvasHeight;
            canvas.width = canvasWidth;
            this.textWidth = textWidth;
            let texture = new THREE.CanvasTexture(canvas);
            texture.anisotropy = 4;
            texture.alphaTest = 0.2;
            texture.repeat.x = textWidth / canvasWidth;
            let meshH = xyrect.data.height > 0 ? xyrect.height : w / (wrapCount * widthFactor);
            let mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(w, meshH),
                new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
            mesh.position.set(data.xOffset, 0, data.zOffset);
            mesh.raycast = () => { }; // disable raycast
            el.setObject3D("xylabel", mesh);
        }

        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, textWidth, canvasHeight);
        ctx.font = "" + (canvasHeight * 0.9) + "px bold sans-serif";
        ctx.textBaseline = "top";
        ctx.textAlign = data.align;
        ctx.fillStyle = data.color;
        let x = data.align === "center" ? textWidth / 2 : 0;
        ctx.fillText(data.value, x, canvasHeight * 0.1);

        el.object3DMap.xylabel.material.map.needsUpdate = true;
    },
    remove() {
        this._removeObject3d();
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
        let el = this.el;
        let xyrect = el.components.xyrect;
        el.sceneEl.systems.xywindow.createSimpleButton(xyrect.width, xyrect.height, this.data, null, el);
    }
});

AFRAME.registerComponent('xytoggle', {
    dependencies: ['xyrect'],
    schema: {
        value: { default: false }
    },
    init() {
        let el = this.el;
        Object.defineProperty(el, 'value', {
            get: () => this.data.value,
            set: (v) => el.setAttribute('xytoggle', 'value', v)
        });
        this._thumb = el.appendChild(document.createElement('a-circle'));
        el.addEventListener('click', ev => {
            el.value = !el.value;
            el.emit('change', { value: el.value }, false);
        });
        el.addEventListener('xyresize', (ev) => this.update());
    },
    update() {
        let el = this.el;
        let theme = el.sceneEl.systems.xywindow.theme;
        let xyrect = el.components.xyrect;
        let r = xyrect.height / 2;
        let v = el.value;
        let params = {
            color: v ? "#0066ff" : theme.buttonColor,
            hoverColor: v ? "#4499ff" : ""
        };
        el.setAttribute('xybutton', params);
        el.setAttribute('material', 'color', params.color);
        this._thumb.setAttribute("geometry", "radius", r * 0.8);
        this._thumb.setAttribute("position", { x: (xyrect.width / 2 - r) * (v ? 1 : -1), y: 0, z: 0.05 });
        el.setAttribute("geometry", {
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
        let el = this.el;
        el.addEventListener('click', ev => {
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
            marker.setAttribute('geometry', {
                vertexA: { x: 0.1, y: 0.03, z: 0 }, vertexB: { x: -0.1, y: 0.03, z: 0 }, vertexC: { x: 0, y: -0.12, z: 0 }
            });
            el.addEventListener('xyresize', ev => this.update());
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
        let values = this.data.values;
        let listY = (this.el.components.xyrect.height + values.length * 0.5) / 2 + 0.05;
        let listEl = this._listEl = this.el.appendChild(document.createElement('a-xycontainer'));
        listEl.setAttribute('position', { x: 0, y: listY, z: 0.1 });
        values.forEach((v, i) => {
            let itemEl = document.createElement('a-xybutton');
            itemEl.setAttribute('label', v);
            itemEl.addEventListener('click', ev => {
                ev.stopPropagation();
                this.select(i);
                this.hide();
            });
            listEl.appendChild(itemEl);
        });
        setTimeout(() => listEl.setAttribute('xyrect', { width: 2, height: values.length * 0.5 }), 0);
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
        base: { type: 'selector', default: null }
    },
    init() {
        let el = this.el;
        el.classList.add(el.sceneEl.systems.xywindow.theme.collidableClass);
        this._onmousedown = this._onmousedown.bind(this);
        el.addEventListener('mousedown', this._onmousedown);
        this._dragFun = null;
    },
    remove() {
        this.el.removeEventListener('mousedown', this._onmousedown);
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
        let point = new THREE.Vector3();
        if (draggingRaycaster.ray.intersectPlane(dragPlane, point) === null) {
            baseEl.object3D.worldToLocal(point);
        }
        let prevRay = draggingRaycaster.ray.clone();
        let _this = this;
        let dragging = false;
        ev.stopPropagation();

        // if (this._dragFun) this._dragFun("xy-dragend");
        let dragFun = _this._dragFun = (event) => {
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
            _this.el.emit(event, { raycaster: draggingRaycaster, point: point, pointDelta: prevPoint.sub(point), prevRay: prevRay, cursorEl: cursorEl }, false);
            prevRay.copy(draggingRaycaster.ray);
        };
        _this.play();

        let cancelEvelt = ev1 => ev1.target != ev.target && ev1.stopPropagation();
        window.addEventListener('mouseenter', cancelEvelt, true);
        window.addEventListener('mouseleave', cancelEvelt, true);

        let mouseup = (ev) => {
            if (ev.detail.cursorEl != cursorEl) return;
            window.removeEventListener('mouseup', mouseup);
            window.removeEventListener('mouseenter', cancelEvelt, true);
            window.removeEventListener('mouseleave', cancelEvelt, true);
            _this._dragFun = null;
            if (dragging) {
                _this.dragging = false;
                let cancelClick = ev => ev.stopPropagation();
                window.addEventListener('click', cancelClick, true);
                setTimeout(() => window.removeEventListener('click', cancelClick, true), 0);
                setTimeout(() => dragFun("xy-dragend"), 15);
            }
        };
        window.addEventListener('mouseup', mouseup);
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
        this._prevQ = new THREE.Quaternion();
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
        let { origin, direction } = ev.detail.raycaster.ray;
        let { origin: origin0, direction: direction0 } = ev.detail.prevRay;
        let cursorEl = ev.detail.cursorEl;
        let targetObj = (this.data.target || this.el).object3D;
        let rot = new THREE.Quaternion();
        if (cursorEl.components['tracked-controls']) {
            if (ev.type != "xy-dragstart") {
                rot.copy(this._prevQ).inverse()
                    .premultiply(cursorEl.object3D.getWorldQuaternion(this._prevQ));
            } else {
                cursorEl.object3D.getWorldQuaternion(this._prevQ);
            }
        } else {
            rot.setFromUnitVectors(direction0, direction);
        }

        let tr = new THREE.Matrix4();
        let mat = new THREE.Matrix4().makeRotationFromQuaternion(rot)
            .multiply(tr.setPosition(targetObj.parent.worldToLocal(origin0.clone()).negate()))
            .premultiply(tr.setPosition(targetObj.parent.worldToLocal(origin.clone())));
        targetObj.applyMatrix(mat);

        if (this.data.mode == "pull") {
            let targetPosition = targetObj.getWorldPosition(new THREE.Vector3());
            let d = direction.clone().sub(direction0);
            let f = targetPosition.distanceTo(origin) * 2;
            targetObj.position.add(direction.clone().multiplyScalar(-d.y * f));
        }

        if (this.data.autoRotate) {
            let cameraPosition = this.el.sceneEl.camera.getWorldPosition(new THREE.Vector3());
            let targetPosition = targetObj.getWorldPosition(new THREE.Vector3());
            let d = cameraPosition.clone().sub(targetPosition).normalize();
            let t = 0.8 - d.y * d.y;
            if (t > 0) {
                tr.lookAt(cameraPosition, targetPosition, new THREE.Vector3(0, 1, 0));
                let intersection = cursorEl.components.raycaster.getIntersection(ev.target);
                let intersectPoint = intersection ? intersection.point : targetPosition;
                let c = targetObj.parent.worldToLocal(intersectPoint);
                let tq = targetObj.quaternion.clone();
                targetObj.quaternion.slerp(rot.setFromRotationMatrix(tr), t * 0.1);
                targetObj.position.sub(c).applyQuaternion(tq.inverse().premultiply(targetObj.quaternion)).add(c);
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
        let theme = this.system.theme;
        let controls = this.controls = this.el.appendChild(document.createElement('a-entity'));
        controls.setAttribute("position", { x: 0, y: 0, z: 0.05 });
        controls.setAttribute("xyitem", { fixed: true });

        let dragButton = this._dragButton = this.system.createSimpleButton(1, 0.5, theme.windowTitleBar, controls);
        dragButton.setAttribute("xy-drag-control", { target: this.el, autoRotate: true });

        this._titleText = this._dragButton.appendChild(document.createElement('a-entity'));

        if (this.data.closable) {
            let closeButton = this.system.createSimpleButton(0.5, 0.5, theme.windowCloseButton, controls);
            closeButton.setAttribute("xylabel", {
                value: "X", align: "center", color: theme.buttonLabelColor
            });
            closeButton.addEventListener('click', (ev) =>
                this.el.parentNode.removeChild(this.el)
            );
            this._closeButton = closeButton;
        }

        this.el.addEventListener('xyresize', (ev) => {
            this.update({});
        });
        this.system.registerWindow(this);
    },
    remove() {
        this.system.unregisterWindow(this);
    },
    update(oldData) {
        let data = this.data;
        let xyrect = this.el.components.xyrect;
        let a = 0;
        if (this._closeButton) {
            this._closeButton.setAttribute("position", { x: xyrect.width / 2 - 0.25, y: 0.3, z: 0 });
            a += 0.52;
        }
        if (data.title != oldData.title) {
            let titleW = xyrect.width - a - 0.2;
            this._titleText.setAttribute("xyrect", { width: titleW, height: 0.45 });
            this._titleText.setAttribute("xylabel", {
                value: data.title, wrapCount: Math.max(10, titleW / 0.2),
                color: this.system.theme.windowTitleColor, xOffset: 0.1
            });
        }
        this.controls.setAttribute("position", "y", xyrect.height * 0.5);
        this._dragButton.setAttribute("geometry", "width", xyrect.width - a);
        this._dragButton.setAttribute("position", { x: -a / 2, y: 0.3, z: 0 });
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
        windowCloseButton: { color: "#111", hoverColor: "#f00" },
        windowTitleBar: { color: "#111" },
        windowTitleColor: "#fff",
        collidableClass: "collidable",
    },
    windows: [],
    createSimpleButton(width, height, params, parent, el) {
        let button = el || document.createElement('a-entity');
        if (!button.hasAttribute("geometry")) {
            button.setAttribute("geometry", {
                primitive: this.theme.buttonGeometry, width: width, height: height
            });
        }
        button.classList.add(this.theme.collidableClass);
        button.addEventListener('mouseenter', ev => {
            let trackedControls = ev.detail.cursorEl.components['tracked-controls'];
            let gamepad = trackedControls && trackedControls.controller;
            let theme = this.theme;
            button.setAttribute("material", { color: params.hoverColor || this.theme.buttonHoverColor });
            if (theme.buttonHoverHaptic && gamepad && gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
                gamepad.hapticActuators[0].pulse(theme.buttonHoverHaptic, theme.buttonHoverHapticMs);
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
    registerWindow(window) {
        this.windows.push(window);
    },
    unregisterWindow(window) {
        this.windows = this.windows.filter(w => w != window);
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
        let el = this.el;

        let thumb = this._thumb = el.sceneEl.systems.xywindow.createSimpleButton(
            data.thumbSize, data.thumbSize, {}, el);

        let plane = new THREE.PlaneGeometry(1, 0.08);
        let bar = this._bar = new THREE.Mesh(
            plane, new THREE.MeshBasicMaterial({ color: data.color0 }));

        let prog = this._prog = new THREE.Mesh(
            plane, new THREE.MeshBasicMaterial({ color: data.color1 }));
        prog.position.z = 0.02;
        el.setObject3D("xyrange", new THREE.Group().add(bar, prog));

        thumb.setAttribute("xy-draggable", { base: el });
        thumb.addEventListener("xy-drag", ev => {
            let r = el.components.xyrect.width - data.thumbSize;
            let p = (ev.detail.point.x + r / 2) / r * (data.max - data.min);
            if (data.step > 0) {
                p = Math.round(p / data.step) * data.step;
            }
            this.setValue(p + data.min, true);
        });
        Object.defineProperty(el, 'value', {
            get: () => data.value,
            set: (v) => this.setValue(v, false)
        });
    },
    update() {
        let data = this.data;
        if (data.max == data.min) return;
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
            let data = this.data;
            let v = Math.max(Math.min(value, data.max), data.min);
            if (v != data.value && emitEvent) {
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
        this._clippingPlanesLocal.forEach((plane, i) => {
            this._clippingPlanes[i] = plane.clone().applyMatrix4(this._currentMatrix);
        });
        this.applyClippings();
    },
    applyClippings() {
        let excludeObj = this.data.exclude && this.data.exclude.object3D;
        let setCliping = (obj) => {
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

AFRAME.registerComponent('xyscroll', {
    dependencies: ['xyrect'],
    schema: {
        scrollbar: { default: true }
    },
    init() {
        let el = this.el;
        this._scrollX = 0;
        this._scrollY = 0;
        this._speedY = 0;
        this._contentHeight = 0;
        this._thumbLen = 0.2;
        this._control = this._initScrollBar(el, 0.3);

        el.setAttribute("xyclipping", { exclude: this._control });

        el.setAttribute("xy-draggable", {});
        el.addEventListener("xy-drag", ev => {
            let d = ev.detail.pointDelta;
            this._speedY = 0;
            this._scrollOffset(d.x, -d.y);
        });
        el.addEventListener("xy-dragend", ev => {
            this._speedY = -ev.detail.pointDelta.y;
            this.play();
        });
        el.addEventListener('xyresize', ev => this.update());
        for (let child of el.children) {
            if (child != this._control) {
                child.addEventListener('xyresize', ev => this.update());
            }
        }
    },
    _initScrollBar(el, w) {
        let xywindow = el.sceneEl.systems.xywindow;
        let scrollBar = this._scrollBar = el.appendChild(document.createElement('a-entity'));

        this._upButton = xywindow.createSimpleButton(w, 0.3, {}, scrollBar);
        this._upButton.addEventListener('click', (ev) => {
            this._speedY = -this._scrollDelta;
            this.play();
        });

        this._downButton = xywindow.createSimpleButton(w, 0.3, {}, scrollBar);
        this._downButton.addEventListener('click', (ev) => {
            this._speedY = this._scrollDelta;
            this.play();
        });
        this._scrollThumb = xywindow.createSimpleButton(w * 0.7, 1, {}, scrollBar);
        this._scrollThumb.setAttribute("xy-draggable", { base: scrollBar });
        this._scrollThumb.addEventListener("xy-drag", ev => {
            let xyrect = this.el.components.xyrect;
            let dy = ev.detail.pointDelta.y
                * (this._contentHeight - xyrect.height) / (this._scrollLength - this._thumbLen || 1);
            this._scrollOffset(0, dy);
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

        this._scrollDelta = Math.max(scrollBarHeight / 2, 0.5) * 0.3;
        this._scrollStart = scrollBarHeight - 0.3;
        this._scrollLength = scrollBarHeight - 0.6;
        this.setScroll(0, 0);
    },
    tick() {
        if (Math.abs(this._speedY) > 0.001) {
            this._scrollOffset(0, this._speedY);
            this._speedY *= 0.8;
        } else {
            this.pause();
        }
    },
    _scrollOffset(dx, dy) {
        this.setScroll(this._scrollX + dx, this._scrollY + dy);
    },
    setScroll(x, y) {
        let xyrect = this.el.components.xyrect;
        let children = this.el.children;
        let contentHeight = 0;
        let contentWidth = 0;
        for (let child of children) {
            if (child === this._control) continue;
            if (!child.components.xyrect) {
                child.setAttribute("xyrect", {});
            }
            contentWidth = Math.max(contentWidth, child.components.xyrect.width);
            contentHeight = Math.max(contentHeight, child.components.xyrect.height);
        }
        this._contentHeight = contentHeight;

        this._scrollX = Math.max(0, Math.min(x, contentWidth - xyrect.width));
        this._scrollY = Math.max(0, Math.min(y, contentHeight - xyrect.height));

        let thumbLen = this._thumbLen = Math.max(0.2, Math.min(this._scrollLength * xyrect.height / contentHeight, this._scrollLength));
        let thumbY = this._scrollStart - thumbLen / 2 - (this._scrollLength - thumbLen) * this._scrollY / (contentHeight - xyrect.height || 1);
        this._scrollThumb.setAttribute("geometry", "height", thumbLen);
        this._scrollThumb.setAttribute("position", "y", thumbY);

        for (let item of children) {
            if (item === this._control || (item.getAttribute('xyitem') || {}).fixed) {
                continue;
            }
            let pos = item.getAttribute("position");
            let itemRect = item.components.xyrect;
            let itemPivot = itemRect.data.pivot;
            pos.x = -this._scrollX + (itemPivot.x) * itemRect.width;
            pos.y = this._scrollY - (1.0 - itemPivot.y) * itemRect.height + xyrect.height;
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
        let el = this.el;
        this._elementFactory = null;
        this._elementUpdator = null;
        this._elements = [];
        this._userData = null;
        this.itemCount = 0;
        el.setAttribute("xyrect", 'pivot', { x: 0, y: 1 });
        el.addEventListener('xyviewport', ev => this.setViewport(ev.detail));
        el.classList.add(el.sceneEl.systems.xywindow.theme.collidableClass);
        el.addEventListener('click', (ev) => {
            for (let p of (ev.path || ev.composedPath())) {
                let index = p.dataset.listPosition;
                if (index != null && index != -1) {
                    el.emit('clickitem', { index: index, ev: ev }, false);
                    break;
                }
            }
        });
        this.setViewport([0, 0]);
    },
    setCallback(factory, constructor) {
        this._elementFactory = factory;
        this._elementUpdator = constructor;
        if (this.data.itemHeight <= 0) {
            let el = this._elementFactory(this.el, this._userData);
            this.data.itemHeight = el.getAttribute("height") * 1;
            this.data.itemWidth = el.getAttribute("width") * 1;
        }
    },
    setContents(data, count) {
        this._userData = data;
        this.itemCount = count !== undefined ? count : data.length;
        let height = this.data.itemHeight * this.itemCount;
        this.el.setAttribute("xyrect", { width: this.data.itemWidth, height: height });
        for (let el of this._elements) {
            el.dataset.listPosition = -1;
        }
        this._refresh();
    },
    setViewport(vp) {
        this.viewport = vp;
        this._refresh();
    },
    _refresh() {
        if (!this._elementFactory) return;
        let itemHeight = this.data.itemHeight;
        let totalHeight = itemHeight * this.itemCount;

        let st = Math.max(Math.floor((totalHeight - this.viewport[0]) / itemHeight), 0);
        let en = Math.min(Math.ceil((totalHeight - this.viewport[1]) / itemHeight), this.itemCount);
        let n = en - st + 1;
        // TODO: compaction
        while (n > this._elements.length) {
            let el = this._elementFactory(this.el, this._userData);
            el.classList.add(this.el.sceneEl.systems.xywindow.theme.collidableClass);
            this.el.appendChild(el);
            this._elements.push(el);
        }

        for (let position = st; position < en; position++) {
            let el = this._elements[position % this._elements.length];
            if (!el.hasLoaded) {
                setTimeout(() => this._refresh(), 1);
                break;
            }
            if (el.dataset.listPosition != position) {
                el.dataset.listPosition = position;
                let x = 0, y = - position * itemHeight;
                let xyrect = el.components.xyrect;
                let pivot = xyrect ? xyrect.data.pivot : { x: 0.5, y: 0.5 };
                el.setAttribute("position", { x: x + pivot.x * xyrect.width, y: y - pivot.y * xyrect.height, z: 0 });
                this._elementUpdator && this._elementUpdator(position, el, this._userData);
            }
        }

        for (let el of this._elements) {
            let p = el.dataset.listPosition;
            el.setAttribute('visible', p >= st && p < en);
        }
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
        xyrect: { width: 2, height: 0.5, updateGeometry: true },
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
        xyrect: { width: 2, height: 0.5, updateGeometry: true },
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
        title: 'xywindow.title'
    }
});

AFRAME.registerPrimitive('a-xyscroll', {
    defaultComponents: {
        xyrect: { pivot: { x: 0, y: 1 } },
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
