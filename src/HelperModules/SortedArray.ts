/**
 * Array with an insert method that maintains a sorted state of the list.
 *
 * @export
 * @class SortedArray
 */
export default class SortedArray extends Array{
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

    public insert(value: any) : void {
        let index = this._binarySearch(value, true);
        this.splice(index, 0, value);
    }

    public remove(value: any) : void {
        let index = this._binarySearch(value);
        if (index === -1) {
            throw new Error("Element doesn't exist");
        }
        else {
            this.splice(index, 1);
        }
    }

    public exists(value: any) : boolean {
        let index = this._binarySearch(value);

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
    private _binarySearch(value: any, closest = false) {
        
        let left = 0;
        let right = this.length - 1;
        let mid = 0;

        while (left <= right) {
            mid = Math.floor((left + right) / 2);
            if (value === this[mid]) {
                return mid;
            }
            else if (this._comparator(value, this[mid]) > 0) {
                left = mid + 1;
            }
            else {
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
