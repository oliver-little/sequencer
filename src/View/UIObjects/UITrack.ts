import { BaseTrack } from "../../Model/Tracks/BaseTrack.js";
import { OscillatorTrack } from "../../Model/Tracks/OscillatorTrack.js";

export class UITrack {
    public name: string;
    public height: number;
    public track: BaseTrack;
    constructor(name: string, height: number, track: BaseTrack) {
        this.name = name;
        this.height = height;
        this.track = track;
    }
}

/**
 * Adds note groupings to UITrack. If no note groupings exist the note grouping is the entire track.
 *
 * @export
 * @class NoteUITrack
 * @extends {UITrack}
 */
export class NoteUITrack extends UITrack {
    public track : OscillatorTrack;

    private _noteGroups: number[][];

    constructor(name: string, height: number, baseTrack: BaseTrack, noteGroups?: number[][]) {
        super(name, height, baseTrack);
        if (noteGroups != undefined) {
            this._noteGroups = noteGroups;
        }
    }

    public getNoteGroups() {
        return this._noteGroups;
    }

    /**
     * Adds a note grouping using the start time and end time (quarter notes)
     * This will fail if either the start or end time falls under another note grouping.
     *
     * @param {number} startTime
     * @param {number} endTime
     * @memberof NoteUITrack
     */
    public addNoteGroup(startTime: number, endTime: number) {
        if (startTime < 0 || endTime < 0) {
            throw new RangeError("StartTime and EndTime must both be greater than 0.");
        }
        if (startTime > endTime) {
            throw new RangeError("StartTime cannot be greater than endTime");
        }

        if (this._noteGroups.length === 0) {
            this._noteGroups.push([startTime, endTime]);
        }
        else {// This could possibly be done with a binary search?
            if (endTime < this._noteGroups[0][0]) { // Handle case where region is less than first value.
                this._noteGroups.splice(0, 0, [startTime, endTime]);
                return;
            }
            else if (startTime > this._noteGroups[this._noteGroups.length - 1][1]) { // Handle case where region is greater than last value
                this._noteGroups.push([startTime, endTime]);
                return;
            }
            for (let i = 0; i < this._noteGroups.length - 1; i++) { // Handle case where it's somewhere in the middle
                if (startTime > this._noteGroups[i][1] && endTime < this._noteGroups[i+1][0]) {
                    this._noteGroups.splice(i+1, 0, [startTime, endTime]);
                }
            }

            // If this code has been reached, the region must be invalid, throw an error.
            throw new RangeError("Region invalid, likely collides with other existing region.")
        }
    }

    /**
     * Removes an existing note grouping using the start time (quarter notes)
     *
     * @param {number} startTime
     * @memberof NoteUITrack
     */
    public removeNoteGroup(startTime : number) {
        let left = 0;
        let right = this._noteGroups.length - 1;
        let mid = 0;

        while (left <= right) {
            mid = Math.floor((left + right) / 2);
            if (startTime - this._noteGroups[mid][0] === 0) {
                this._noteGroups.splice(mid, 1);
                return;
            }
            else if (startTime - this._noteGroups[mid][0] > 0) {
                left = mid + 1;
            }
            else {
                right = mid - 1;
            }
        }

        // Element does not exist in array, throw an error.
        throw new RangeError("Element with given startTime does not exist.");
    }
}

