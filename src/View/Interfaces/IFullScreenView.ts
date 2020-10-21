export interface IFullScreenView extends PIXI.DisplayObject {
    resize(width: number, height: number);
    mouseWheelHandler(event: WheelEvent, canvasX : number, canvasY : number);
}