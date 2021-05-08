import { Coordinate, Entity, Scene } from "aframe"

declare module "aframe" {
    type XYRectComponent = Component<{
        width: number
        height: number
        pivot: { x: number, y: number }
    }> & {
        width: number
        height: number
    };

    // Events
    export interface EntityEventMap {
        clickitem: DetailEvent<{ index: number }>
        change: DetailEvent<{ value: any, index?: number }>
        xyresize: DetailEvent<{ xyrect: XYRectComponent }>
        xyviewport: DetailEvent<[t: number, b: number, l: number, r: number]>
        'xy-drag': DetailEvent<{ raycaster: THREE.Raycaster, point: THREE.Vector3, pointDelta: THREE.Vector3 }>
        'xy-dragstart': DetailEvent<{ raycaster: THREE.Raycaster, point: THREE.Vector3, pointDelta: THREE.Vector3 }>
        'xy-dragend': DetailEvent<{ raycaster: THREE.Raycaster, point: THREE.Vector3, pointDelta: THREE.Vector3 }>
    }

    // Components
    export interface DefaultComponents {
        xyrect: XYRectComponent
    }
}
