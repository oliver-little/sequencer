import * as PIXI from "pixi.js";

export class PointHelper {
    public static distance(a : PIXI.Point, b : PIXI.Point) {
        let x = a.x - b.x;
        let y = a.y - b.y;
        return Math.sqrt(x * x + y * y);
    }

    public static distanceSquared(a : PIXI.Point, b : PIXI.Point) {
        let x = a.x - b.x;
        let y = a.y - b.y;
        return x * x + y * y;
    }
}