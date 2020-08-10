import { BaseTrack } from "../../Model/Tracks/BaseTrack.js";
import { OscillatorTrack } from "../../Model/Tracks/OscillatorTrack.js";
import { SoundFileTrack } from "../../Model/Tracks/SoundFileTrack.js";

export class UITrack {
    public name: string;
    public startY: number;
    public height: number;
    public track: BaseTrack;
    constructor(name: string, startY : number, height: number, track: BaseTrack) {
        this.name = name;
        this.startY = startY;
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

    constructor(name: string, startY : number, height: number, baseTrack: OscillatorTrack, noteGroups?: number[][]) {
        super(name, startY, height, baseTrack);
        this._noteGroups = noteGroups;
    }

    get noteGroups() {
        return this._noteGroups;
    }

    /**
     * Gets all note groups that start within a time period
     *
     * @param {number} startTime The start time (quarter notes)
     * @param {number} endTime The end time (quarter notes)
     * @returns {number[][]} The note groups that start within that time period.
     * @memberof NoteUITrack
     */
    public getNoteGroupsStartingBetweenTime(startTime : number, endTime : number) : number[][] {
        let noteGroupsInRange = [];
        for(let i = 0; i < this._noteGroups.length; i++) {
            let noteGroup = this._noteGroups[i];
            if (noteGroup[0] >= startTime && noteGroup[0] <= endTime) {
                noteGroupsInRange.push(noteGroup);
            }
            else if (noteGroup[0] > endTime) {
                break;
            }
        }
        return noteGroupsInRange;
    }

    /**
     * Gets the note groups that start within a time period
     *
     * @param {number} startTime The start time (quarter notes)
     * @param {number} endTime The end time (quarter notes)
     * @returns {number[][]} The note groups that start within that time period.
     * @memberof NoteUITrack
     */
    public getNoteGroupsWithinTime(startTime : number, endTime : number) : number[] {
        let noteGroupsToReturn = []
        for(let i = 0; i < this._noteGroups.length; i++) {
            let noteGroup = this._noteGroups[i];
            if (noteGroup[1] > startTime && noteGroup[0] < endTime) {
                noteGroupsToReturn.push(noteGroup);
            }
            else if (noteGroup[0] > endTime) {
                break;
            }
        }
        return noteGroupsToReturn;
    }

    public getNoteGroupIndex(noteGroup : number[]) : number {
        for (let i = 0; i < this._noteGroups.length; i++) {
            if (noteGroup[0] == this._noteGroups[i][0] && noteGroup[1] == this._noteGroups[i][1]) {
                return i; 
            }
        }

        throw new RangeError("NoteGroup does not exist.");
    }

    /**
     * Adds a note grouping using the start time and end time (quarter notes)
     * This will fail if either the start or end time falls under another note grouping.
     *
     * @param {number} startTime Start time of this note group in quarter notes
     * @param {number} endTime End time of this note group in quarter notes
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
            return 0;
        }
        else { // This could possibly be done with a binary search?
            if (endTime <= this._noteGroups[0][0]) { // Handle case where region is less than first value.
                this._noteGroups.splice(0, 0, [startTime, endTime]);
                return 0;
            }
            else if (startTime >= this._noteGroups[this._noteGroups.length - 1][1]) { // Handle case where region is greater than last value
                this._noteGroups.push([startTime, endTime]);
                return this._noteGroups.length - 1;
            }
            for (let i = 0; i < this._noteGroups.length - 1; i++) { // Handle case where it's somewhere in the middle
                if (startTime >= this._noteGroups[i][1] && endTime <= this._noteGroups[i+1][0]) {
                    this._noteGroups.splice(i+1, 0, [startTime, endTime]);
                    return i;
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