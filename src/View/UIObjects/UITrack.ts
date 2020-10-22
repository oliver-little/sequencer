import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";
import { NoteEvent } from "../../Model/Notation/SongEvents.js";
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
    public noteGroupsChanged : SimpleEvent;

    private _noteGroups: number[][];

    constructor(name: string, startY : number, height: number, baseTrack: OscillatorTrack, noteGroups?: number[][]) {
        super(name, startY, height, baseTrack);
        if (noteGroups != undefined) {
            this._noteGroups = noteGroups;
        }
        else {
            this._noteGroups = [];
        }
        this.noteGroupsChanged = new SimpleEvent();
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
     * Gets the note groups that fall within a time period (does not have to start or end in that period)
     *
     * @param {number} startTime The start time (quarter notes)
     * @param {number} endTime The end time (quarter notes)
     * @returns {number[][]} The note groups that are within that time period.
     * @memberof NoteUITrack
     */
    public getNoteGroupsWithinTime(startTime : number, endTime : number) : number[][] {
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

    /**
     * Gets the index of a noteGroup
     *
     * @param {number[]} noteGroup The noteGroup to get the index of
     * @returns {number} The index of the noteGroup (null if it doesn't exist)
     * @memberof NoteUITrack
     */
    public getNoteGroupIndex(noteGroup : number[]) : number {
        for (let i = 0; i < this._noteGroups.length; i++) {
            if (noteGroup[0] == this._noteGroups[i][0] && noteGroup[1] == this._noteGroups[i][1]) {
                return i; 
            }
        }

        return null;
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

        this.noteGroupsChanged.emit();

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
                this.noteGroupsChanged.emit();
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

    /**
     * Updates the NoteGroups when a NoteEvent is edited or added
     *
     * @param {NoteEvent} noteEvent The event that was edited or added
     * @memberof NoteUITrack
     */
    public updateNoteGroups(noteEvent: NoteEvent) {
        // Handle the special case where there are no notegroups by creating one around the note
        if (this._noteGroups.length == 0) {
            this.addNoteGroup(noteEvent.startPosition, noteEvent.endPosition);
            return;
        }

        // Get the notegroups that are within this note
        let noteGroups = this.getNoteGroupsWithinTime(noteEvent.startPosition, noteEvent.endPosition);
        let chosenNoteGroup : number[] = null;

        // If more than 1 note group was found, merge them.
        if (noteGroups.length > 1) {
            chosenNoteGroup = [noteGroups[0][0], noteGroups[noteGroups.length - 1][1]];
            noteGroups.forEach(noteGroup => {
                this.removeNoteGroup(noteGroup[0]);
            });
            this.addNoteGroup(chosenNoteGroup[0], chosenNoteGroup[1]);
        }
        else if (noteGroups.length == 1) { // Only one group was found, do nothing.
            chosenNoteGroup = noteGroups[0];
        }
        else { // If no NoteGroup was found, find the nearest one.
            // NoteEvent ends before the first event
            if (this.noteGroups[0][0] > noteEvent.endPosition) {
                chosenNoteGroup = this.noteGroups[0];
            }
            else {
                let index = 1;
                while (index < this.noteGroups.length && this.noteGroups[index][1] < noteEvent.startPosition) {
                    index++;
                }

                // NoteEvent starts after the last event
                if (index == this.noteGroups.length) {
                    chosenNoteGroup = this.noteGroups[index - 1];
                }
                else {
                    // NoteEvent occurs somewhere between some NoteGroups, find the closest
                    if (Math.abs(this.noteGroups[index - 1][1] - noteEvent.endPosition) <= Math.abs(this.noteGroups[index][0] - noteEvent.startPosition)) {
                        chosenNoteGroup = this.noteGroups[index-1];
                    }
                    else {
                        chosenNoteGroup = this.noteGroups[index];
                    }
                }
            }
        }
        let newNoteGroup = chosenNoteGroup;
        // In all cases, check the start position is before this note's start and the end position is after this note's end
        if (newNoteGroup[0] > noteEvent.startPosition) {
            newNoteGroup[0] = noteEvent.startPosition;
        }
        if (newNoteGroup[1] < noteEvent.endPosition) {
            newNoteGroup[1] = noteEvent.endPosition;
        }
        // Check if the NoteGroup was actually moved
        if (newNoteGroup != chosenNoteGroup) {
            this.removeNoteGroup(chosenNoteGroup[0]);
            this.addNoteGroup(newNoteGroup[0], newNoteGroup[1]);
            this.noteGroupsChanged.emit();
        }
        // If not, the change might have moved the first or last note, adjust the boundaries.
        else {
            this.checkNoteGroupBoundaries(this.getNoteGroupIndex(chosenNoteGroup));
        }
    }

    /**
     * Checks that the boundaries of a NoteGroup are at the start of the first note and the end of the last note.
     *
     * @param {number} index Index of the NoteGroup
     * @memberof NoteUITrack
     */
    public checkNoteGroupBoundaries(index : number) {
        let notes = this.getNoteGroupNotes(index);
        // If there are no notes, remove the NoteGroup
        if (notes.length == 0) {
            this.removeNoteGroup(this._noteGroups[index][0]);
            return;
        }

        // Get the largest end position
        let max = notes[0].endPosition;
        for (let i = 1; i < notes.length; i++) {
            max = Math.max(max, notes[i].endPosition);
        }
        this._noteGroups[index][0] = notes[0].startPosition;
        this._noteGroups[index][1] = max;

        this.noteGroupsChanged.emit();
    }

    /**
     * Gets the notes within a NoteGroup
     *
     * @param {number} index The NoteGroup index
     * @returns {NoteEvent[]} The notes within the NoteGroup
     * @memberof NoteUITrack
     */
    public getNoteGroupNotes(index: number) : NoteEvent[] {
        let noteGroup = this._noteGroups[index];
        return this.track.timeline.getEventsBetweenTimes(noteGroup[0], noteGroup[1]) as NoteEvent[];
    }

    /**
     * Adds a new NoteEvent to the track
     *
     * @param {number} startPosition
     * @param {string} pitch
     * @param {number} duration
     * @returns {NoteEvent}
     * @memberof NoteUITrack
     */
    public addEvent(startPosition: number, pitch : string, duration : number) : NoteEvent {
        let event = this.track.addNote(startPosition, pitch, duration);
        this.updateNoteGroups(event);
        return event;
    }

    public editEvent(event : NoteEvent, startPosition : number, pitch : string, duration? : number) {
        event.pitchString = pitch;
        this.track.timeline.editEvent(this.track.timeline.getIndexOfEvent(event), startPosition, duration);
        this.updateNoteGroups(event);
    }

    public removeEvent(event : NoteEvent) {
        let noteGroupIndex = this.getNoteGroupIndex(this.getNoteGroupsWithinTime(event.startPosition, event.endPosition)[0]);
        this.track.removeNote(event);
        this.checkNoteGroupBoundaries(noteGroupIndex);
    }
}

/**
 * Adds support for tracks that can play sound files.
 *
 * @export
 * @class OneShotUITrack
 */
export class SoundFileUITrack extends UITrack {

    public track : SoundFileTrack;
    public displayActualWidth : Boolean = true;

    constructor(name : string, startY : number, height : number, track : SoundFileTrack) {
        super(name, startY, height, track);
    }

    /**
     * Gets the event duration (quarter notes)
     *
     * @readonly
     * @memberof SoundFileUITrack
     */
    get eventDuration() {
        return this.track.soundFileDuration;
    }

    public getOneShotsBetweenTime(startTime : number, endTime : number) {
        return this.track.timeline.getEventsBetweenTimes(startTime, endTime);
    }
}