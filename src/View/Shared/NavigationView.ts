export class NavigationView {
    
    public controlledView : PIXI.Container;

    private _viewStack : PIXI.DisplayObject[];
    
    constructor() {
        this._viewStack = [];
    }

    get currentElement() : PIXI.DisplayObject {
        return this._viewStack[this._viewStack.length - 1];
    }

    /**
     * Sets the view that this element will control.
     *
     * @param {PIXI.Container} view
     * @memberof NavigationView
     */
    public setControlledView(view : PIXI.Container) {
        this.controlledView = view;
        this.controlledView.removeChildren(0, this.controlledView.children.length);
    }

    /**
     * Replaces the default element of this navigation view 
     * (i.e: the first element after back cannot be called any more).
     *
     * @param {PIXI.DisplayObject} element
     * @memberof NavigationView
     */
    public setDefaultElement(element : PIXI.DisplayObject) {
        if (this._viewStack.length == 0) {
            this.controlledView.addChild(element);
            this._viewStack.push(element);
        }
        else {
            this._viewStack.splice(0, 1, element);
        }
    }

    /**
     * Pushes a new element to the stack and displays it.
     *
     * @param {PIXI.DisplayObject} element
     * @memberof NavigationView
     */
    public show(element : PIXI.DisplayObject) {
        if(this._viewStack.length > 0) {
            this.controlledView.removeChild(this.currentElement);
        }

        this._viewStack.push(element);
        this.controlledView.addChild(this.currentElement);
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

        this.controlledView.removeChild(this.currentElement);
        let removed = this._viewStack.pop();
        removed.destroy();
        this.controlledView.addChild(this.currentElement);
    }
}

const navigationView = new NavigationView();
export {navigationView};