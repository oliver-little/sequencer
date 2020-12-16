export class MouseState {
    public buttons : number;
    constructor() {
        this.buttons = 0;
        document.addEventListener("pointerdown", this._pointerDownHandler.bind(this));
        document.addEventListener("pointerup", this._pointerUpHandler.bind(this));
    }

    private _pointerDownHandler() {
        this.buttons = 1;
    }

    private _pointerUpHandler() {
        this.buttons = 0;
    }
}

export const mouseState = new MouseState();