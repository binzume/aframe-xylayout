import { Coordinate, Entity, Scene } from "aframe"

declare module "aframe" {
    // Events
    export interface EntityEventMap {
        clickitem: DetailEvent<{ index: number }>
        change: DetailEvent<{ value: any, index?: number }>
        xyviewport: DetailEvent<[t: number, b: number, l: number, r: number]>
        'xy-drag': DetailEvent<{ raycaster: any, point: any, pointDelta: any }>
        'xy-dragstart': DetailEvent<{ raycaster: any, point: any, pointDelta: any }>
        'xy-dragend': DetailEvent<{ raycaster: any, point: any, pointDelta: any }>
    }

    // Components
    export interface DefaultComponents {
        xyrect: Component<{
            width: number
            height: number
            pivot: { x: number, y: number }
        }> & {
            width: number
            height: number
        };
    }
}
