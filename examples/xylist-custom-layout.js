
AFRAME.registerComponent('xylist-grid-layout', {
    dependencies: ['xyrect', 'xylist'],
    schema: {
        itemWidth: { default: 1 },
        itemHeight: { default: 1 },
        stretch: { default: true },
    },
    init() {
        this.update = this.update.bind(this);
        this.el.addEventListener('xyresize', this.update);
    },
    remove() {
        this.el.removeEventListener('xyresize', this.update);
    },
    update() {
        let el = this.el, data = this.data;
        let { xylist, xyrect } = el.components;
        let containerWidth = xyrect.width;
        if (containerWidth <= 0) {
            containerWidth = el.parentElement.getAttribute("width");
        }

        let itemWidth = data.itemWidth;
        let itemHeight = data.itemHeight;
        let cols = Math.max(containerWidth / itemWidth | 0, 1);
        if (data.stretch) {
            itemWidth = containerWidth / cols;
            itemHeight *= itemWidth / data.itemWidth;
        }

        xylist.setLayout({
            size(itemCount) {
                return { width: itemWidth * cols, height: itemHeight * Math.ceil(itemCount / cols) };
            },
            *targets(viewport) {
                let position = Math.floor((-viewport[0]) / itemHeight) * cols;
                let end = Math.ceil((-viewport[1]) / itemHeight) * cols;
                while (position < end) {
                    yield position++;
                }
            },
            layout(el, position) {
                el.setAttribute("xyrect", { width: itemWidth, height: itemHeight });
                let x = (position % cols) * itemWidth, y = - (position / cols | 0) * itemHeight;
                let pivot = el.components.xyrect.data.pivot;
                el.setAttribute("position", { x: x + pivot.x * itemWidth, y: y - pivot.y * itemHeight, z: 0 });
            }
        });
    }
});



AFRAME.registerComponent('xylist-spriral-layout', {
    dependencies: ['xyrect', 'xylist'],
    schema: {
        itemWidth: { default: 1 },
        itemHeight: { default: 1 },
        radius: { default: 5 },
        stretch: { default: true },
    },
    init() {
        this.update = this.update.bind(this);
        this.el.addEventListener('xyresize', this.update);
    },
    remove() {
        this.el.removeEventListener('xyresize', this.update);
    },
    update() {
        let el = this.el, data = this.data;
        let { xylist } = el.components;
        let radius = this.data.radius;
        let containerWidth = this.data.radius * Math.PI * 2;

        let itemWidth = data.itemWidth;
        let itemHeight = data.itemHeight;
        let cols = Math.max(containerWidth / itemWidth | 0, 1);
        if (data.stretch) {
            itemWidth = containerWidth / cols;
            itemHeight *= itemWidth / data.itemWidth;
        }

        xylist.setLayout({
            size(itemCount) {
                return { width: 0.01, height: itemHeight * Math.ceil(itemCount / cols) };
            },
            *targets(viewport) {
                let position = Math.floor((-viewport[0]) / itemHeight - 1) * cols;
                let end = Math.ceil((-viewport[1]) / itemHeight) * cols;
                while (position < end) {
                    yield position++;
                }
            },
            layout(el, position) {
                el.setAttribute("xyrect", { width: itemWidth, height: itemHeight });
                let t = (position % cols) / cols * Math.PI * 2, y = - (position / cols) * itemHeight;
                let x = Math.sin(t) * radius;
                let z = Math.cos(t) * radius;
                let xyrect = el.components.xyrect;
                let pivot = xyrect.data.pivot;
                el.setAttribute("position", { x: x, y: y - pivot.y * itemHeight, z: z });
                el.setAttribute("rotation", { x: 0, y: t * 180 / Math.PI, z: 0 });
            }
        });
    }
});
