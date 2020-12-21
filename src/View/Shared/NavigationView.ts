import { IFullScreenView } from "../Interfaces/IFullScreenView";

export class NavigationView {
    
    public controlledStage : PIXI.Container;
    public renderer : PIXI.Renderer;

    protected _viewStack : IFullScreenView[];
    
    constructor() {
        this._viewStack = [];
    }

    get viewDepth() {
        return this._viewStack.length;
    }

    get currentElement() : IFullScreenView {
        return this._viewStack[this._viewStack.length - 1];
    }

    /**
     * Sets the view that this element will control.
     *
     * @param {PIXI.Container} view
     * @memberof NavigationView
     */
    public setStageRenderer(view : PIXI.Container, renderer : PIXI.Renderer) {
        this.controlledStage = view;
        this.renderer = renderer;
        this.controlledStage.removeChildren(0, this.controlledStage.children.length);
    }

    /**
     * Replaces the default element of this navigation view 
     * (i.e: the first element after back cannot be called any more).
     *
     * @param {IFullScreenView} element
     * @memberof NavigationView
     */
    public setDefaultElement(element : IFullScreenView) {
        if (this._viewStack.length == 0) {
            this.controlledStage.addChild(element);
            this._viewStack.push(element);
        }
        else {
            this._viewStack.splice(0, 1, element);
        }
    }

    /**
     * Pushes a new element to the stack and displays it.
     *
     * @param {IFullScreenView} element
     * @memberof NavigationView
     */
    public show(element : IFullScreenView) {
        if(this._viewStack.length > 0) {
            this.controlledStage.removeChild(this.currentElement);
        }

        this._viewStack.push(element);
        this.controlledStage.addChild(this.currentElement);
    }

    /**
     * Pops the last element from the stack (as long as it would not put the stack below 1 elements) and shows the element before it.
     *
     * @memberof NavigationView
     */
    public back() {
        if (this._viewStack.length <= 1) {
            throw new Error("Cannot bring view stack below 1 element.");
        }

        this.controlledStage.removeChild(this.currentElement);
        let removed = this._viewStack.pop();
        removed.destroy();
        this.controlledStage.addChild(this.currentElement);
        this.currentElement.resize(this.renderer.width, this.renderer.height);
    }

    public passWheelEvent(event: WheelEvent, canvasX : number, canvasY : number) {
        if (this.currentElement != undefined) {
            this.currentElement.mouseWheelHandler(event, canvasX, canvasY);
        }
    }
}

const navigationView = new NavigationView();
export {navigationView};