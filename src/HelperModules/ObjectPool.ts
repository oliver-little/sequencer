import {v4 as uuid} from "uuid";

export class ObjectPool<T>{
    private _creatable : {new () : T};
    private _availableObjects : Array<T>;


    constructor(pooledObject : (new () => T)) {
        this._creatable = pooledObject;
        this._availableObjects = [];
    }

    get objectCount() {
        return this._availableObjects.length;
    }

    /**
     * Gets a pooled object, if there is one - returns null if not.
     *
     * @returns {T}
     * @memberof ObjectPool
     */
    public getObject() : T {
        if (this._availableObjects.length > 0) {
            return this._availableObjects.pop();
        }
        else {
            return null;
        }
    }

    /**
     * Returns an instance of the pooled object to the pool.
     *
     * @param {T} instance
     * @memberof ObjectPool
     */
    public returnObject(instance : T) {
        this._availableObjects.push(instance);
    }
}