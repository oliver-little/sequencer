/**
 *
 *
 * @export
 * @class SortedArray
 * @extends {Array}
 * @template T The type of the array elements
 */
export default class SortedArray<T> extends Array{
    private _comparator : Function;

    /**
     *Creates an instance of SortedArray.
     * @param {*} [comparator=(a, b) => a - b] Comparator function to order elements
     * @memberof SortedArray
     */
    constructor(comparator = (a, b) => a - b) {
        super();
        this._comparator = comparator;
    }

    /**
     * Adds a new item to the array
     *
     * @param {T} value The item to add
     * @returns {number} The index the item was added at
     * @memberof SortedArray
     */
    public insert(value: T) : number {
        let left = 0;
        let right = this.length - 1;
        let mid = 0;

        while (left <= right) {
            mid = Math.floor((left + right) / 2);
            if (value === this[mid]) {
                this.splice(mid, 0, value);
                return mid;
            }
            else if (this._comparator(value, this[mid]) > 0) {
                left = mid + 1;
            }
            else {
                right = mid - 1;
            }
        }
        // If exact position wasn't found, splice at the left location, which contains the index of the closest element
        this.splice(left, 0, value);
        return left;
    }

    /**
     * Removes an item from the array if it exists
     *
     * @param {T} value The item to remove
     * @returns {number} The index where the item was removed from
     * @memberof SortedArray
     */
    public remove(value: T) : number {
        let index = this.indexOf(value);
        if (index === -1) {
            throw new Error("Element doesn't exist");
        }
        else {
            this.splice(index, 1);
            return index;
        }
    }

    public removeAt(index: number) : T {
        if (index < 0 || index >= this.length) {
            throw new RangeError("Index out of range.");
        }
        let elementRemoved = this[index];
        this.splice(index, 1);
        return elementRemoved;
    }

    public exists(value: T) : boolean {
        let index = this.binarySearch(value);

        if (index === -1) {
            return false;
        }
        else {
            return true;
        }
    }
    
    /**
     * Searches for a value in the sorted array, returns -1 if not found (or the index of the closest element if closest = True)
     *
     * @private
     * @param {*} value The value to find
     * @param {boolean} [closest=false] Set closest to true to return the closest index to the value
     * @returns The index of the element
     * @memberof SortedArray
     */
    public binarySearch(value: T|number, closest = false) {
        let left = 0;
        let right = this.length - 1;
        let mid = 0;

        if (this.length == 0) {
            return -1;
        }

        if (closest && this._comparator(value, this[right]) > 0) {
            return right;
        }

        while (left <= right) {
            mid = Math.floor((left + right) / 2);
            if (this._comparator(value, this[mid]) === 0) {
                while (mid > 0 && this._comparator(this[mid], this[mid-1]) === 0) {
                    mid = mid - 1;
                }
                return mid;
            }
            else if (this._comparator(value, this[mid]) > 0) {
                left = mid + 1;
            }
            else {
                if (closest && this._comparator(value, this[mid-1])) {
                    return mid-1;
                }
                right = mid - 1;
            }
        }

        if (closest) {
            return left;
        }
        else {
            return -1;
        }
    }
}
