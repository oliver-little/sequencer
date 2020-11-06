/**
 * Simple Event system with add, remove and emit functions
 *
 * @export
 * @class SimpleEvent
 */
export class SimpleEvent{

    private _callbacks = [];

    get callbacks() {
        return this._callbacks;
    }

    public addListener(callback : Function) : void {
        this._callbacks.push(callback);
    }

    public removeListener(callback : Function) : void {
        let index = this._callbacks.indexOf(callback);
        if (index == -1) {
            throw new Error("Element not found");
        }
        this._callbacks.splice(index, 1);
    }

    public hasListener(callback : Function) : boolean {
        let index = this._callbacks.indexOf(callback);
        if (index == -1) {
            return false;
        }
        return true;
    }

    public removeAt(index : number) : void {
        this._callbacks.splice(index, 1);
    }

    public removeAllListeners() {
        this._callbacks = [];
    }

    public emit(...args : any) : void {
        this._callbacks.forEach(element => {
            element(...args);
        });
    }
}