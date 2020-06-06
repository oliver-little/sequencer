/**
 * Container class to store global song data
 *
 * @export
 * @class SongMetadata
 */
export default class SongMetadata {
    private _bpm : number;
    private _secondsPerBeat : number;
    private _timeSignature : number[];
    private _quarterNoteMultiplier : number;

    constructor(bpm = 60, timeSignature = [4, 4]) {
        this.bpm = bpm;
        this.timeSignature = timeSignature;
    }

    get bpm() {
        return this._bpm;
    }

    set bpm(value: number) {
        if (value < 0) {
            throw new Error("Invalid BPM: cannot be negative.");
        }
        this._bpm = value;
        this._secondsPerBeat = 60/this._bpm;
    }
    
    get secondsPerBeat() {
        return this._secondsPerBeat;
    }

    /**
     * The time signature of the song, represented as an array with two 
     *
     * @memberof SongMetadata
     */
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
        this._quarterNoteMultiplier = this._timeSignature[1]/4;
    }

    /**
     * A multiplier between the current time signature of the song and quarter notes 
     * (e.g: x/8 becomes 2 as quarter notes have double the length of 8th notes)
     *
     * @readonly
     * @memberof SongMetadata
     */
    get quarterNoteMultiplier() {
        return this._quarterNoteMultiplier;
    }
}