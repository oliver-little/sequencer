/**
 * Container class to store global song data
 *
 * @export
 * @class SongMetadata
 */
export default class SongMetadata {
    private _bpm = 60;
    private _timeSignature = [4, 4];

    get bpm() {
        return this._bpm;
    }

    set bpm(value: number) {
        if (value > 0) {
            this._bpm = value;
        }
    }

    get timeSignature() {
        return this._timeSignature;
    }

        // The second number of the array must be a power of 2.
    set timeSignature(value: number[]) {
        if (value.length != 2) {
            throw new RangeError("Incorrect number of values in array.");
        }
        else if (value[0] < 0 || value[1] < 0) {
            throw new RangeError("Numbers must be greater than 0.");
        }
        if (value[1] % 2 != 0) {
            throw new RangeError("Second number must be a power of two.");
        }
        this._timeSignature = value;
    }
}