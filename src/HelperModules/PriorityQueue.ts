export default class PriorityQueue {
    // Constant functions to get certain elements
    private _top = 0;
    private _parent = i => ((i + 1) >>> 1) - 1;
    private _left = i => ((i + 1) << 1) - 1;
    private _right = i => ((i + 1) << 1);

    private _heap = [];
    private _comparator: Function;


    /**
     *Creates an instance of PriorityQueue.
     * @param {*} [comparator=(a, b) => a > b] A comparator for two objects in the queue, takes parameters a and b and returns true if a > b 
     * @memberof PriorityQueue
     */
    constructor(comparator = (a, b) => a > b) {
        this._comparator = comparator;
    }

    /**
     * Gets the actual array storing the queue values.
     *
     * @readonly
     * @memberof PriorityQueue
     */
    public get heap() {
        return this._heap;
    }

    public get length() {
        return this._heap.length;
    } 

    /**
     * Returns true if the queue is empty.
     *
     * @returns {boolean}
     * @memberof PriorityQueue
     */
    public isEmpty() : boolean {
        return this._heap.length === 0
    }

    /**
     * Pushes an item to the correct position in the priority queue.
     *
     * @param {*} value The value to push onto the queue
     * @memberof PriorityQueue
     */
    public push(value: any) : void {
        this._heap.push(value);
        this._bubbleUp(this.length - 1);
    }

    /**
     * Views the first item in the queue.
     *
     * @returns The first item in the queue.
     * @memberof PriorityQueue
     */
    public peek() {
        return this._heap[0];
    }

    /**
     * Removes the first item from the queue.
     *
     * @returns The first item in the queue.
     * @memberof PriorityQueue
     */
    public pop() {
        let nodeToRemove = this.peek();
        if ((this.length - 1) > 0) {
            this._swap(this.length - 1, 0);
        }
        this._heap.pop();
        this._bubbleDown(0);
        return nodeToRemove;
    }

    /**
     * Removes a specific item from the queue
     *
     * @param {*} value The item to remove from the queue
     * @memberof PriorityQueue
     */
    public delete(value: any) : void {
        let index = this._heap.indexOf(value);
        if (value === -1) {
            throw new Error("Item not found");
        }
        this._heap.splice(index, 1);
    }

    private _bubbleUp(index: number) : void {
        while (index > this._top && this._comparator(this._heap[index], this._heap[this._parent(index)])) {
            this._swap(index, this._parent(index));
            index = this._parent(index);
        }
    }

    private _bubbleDown(index: number) : void {
        // Get the indices of the children
        let leftChild = this._left(index);
        let rightChild = this._right(index);

        // Loop while children elements exist and the item is greater than one of them.
        while (rightChild < this.length && this._comparator(this._heap[rightChild], this._heap[index]) || 
            (leftChild < this.length && this._comparator(this._heap[leftChild], this._heap[index]))) {

            // Find the largest child, as we know it is greater than the current item. Then swap it.
            let maxChild = (rightChild < this.length && this._comparator(this._heap[rightChild], this._heap[leftChild])) ? rightChild : leftChild;
            this._swap(index, maxChild);

            leftChild = this._left(index);
            rightChild = this._right(index);
            index = maxChild;
        }
    }

    private _swap(index1: number, index2: number) : void {
        [this._heap[index1], this._heap[index2]] = [this._heap[index2], this._heap[index1]];
    }
}

let pq = new PriorityQueue();
pq.push(5);
pq.push(6);
pq.push(4);
pq.push(7);
pq.push(1);
pq.push(6);
pq.push(9);
pq.push(15);
pq.push(83);
pq.push(8);
console.log(pq.heap);
while(!pq.isEmpty()) {
    console.log(pq.pop());
}