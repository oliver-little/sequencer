import SortedArray from "../../HelperModules/SortedArray.js";
import {MetadataEvent} from "../Notation/SongEvents.js";

/**
 * Container class to store global song data
 *
 * @export
 * @class SongMetadata
 */
export default class SongMetadata {

    private _metaEvents = new SortedArray<MetadataEvent>(MetadataEvent.comparator);
    private _metaEventLengths = [];


    constructor(bpm = 60, timeSignature = [4, 4]) {
        this.addMetadataEvent(0, bpm, timeSignature);
    }


    public getBPM(time : number) : number {
        return this._metaEvents[this._metaEvents.binarySearch(time, true)].bpm;
    }

    public getSecondsPerBeat(time : number) : number {
        return this._metaEvents[this._metaEvents.binarySearch(time, true)].secondsPerBeat;
    }


    public getTimeSignature(time : number) : number[] {
        return this._metaEvents[this._metaEvents.binarySearch(time, true)].timeSignature;
    }

    public getQuarterNoteMultiplier(time : number) : number {
        return this._metaEvents[this._metaEvents.binarySearch(time, true)].quarterNoteMultiplier;
    }

    /**
     * Converts a quarter note position to a seconds position.
     *
     * @param {number} time
     * @returns {number}
     * @memberof SongMetadata
     */
    public positionQuarterNoteToSeconds(time : number) : number {
        if (time < 0) {
            throw new RangeError("Cannot have negative time");
        }

        // Find the meta event this quarter note position is within.
        let index = this._metaEvents.binarySearch(time, true);
        if (index == 0) {
            // If it's the first one, just do the calculation
            return time * this._metaEvents[index].quarterNoteMultiplier * this._metaEvents[index].secondsPerBeat;
        }
        else {
            // If it's not the first one, get the number of seconds passed to this bpm/time sig pair then calculate exactly when the position occurs in that event.
            return this._metaEventLengths[index - 1] + (time - this._metaEventLengths[index - 1]) * this._metaEvents[index].quarterNoteMultiplier * this._metaEvents[index].secondsPerBeat;
        }
    }

    /**
     * Converts a seconds position to a quarter note position.
     *
     * @param {number} time
     * @returns {number}
     * @memberof SongMetadata
     */
    public positionSecondsToQuarterNote(time : number) : number {
        if (this._metaEvents.length == 1) {
            // If there's only one event,  just do the calculation.
            return (time / this._metaEvents[0].secondsPerBeat) / this._metaEvents[0].quarterNoteMultiplier;
        }
        else {
            // If there's more than one event, find which one the seconds falls into
            if (this._metaEventLengths[0] > time) { // It's part of the first event.
                return (time / this._metaEvents[0].secondsPerBeat) / this._metaEvents[0].quarterNoteMultiplier;
            }
            let eventIndex = null; // It's part of one of the middle events
            for (let i = 0; i < this._metaEventLengths.length; i++) {
                if (this._metaEventLengths[i] > time) {
                    // Add the previous number of quarter notes with the exact number of quarter notes that seconds value represents in the current bpm/time sig pair.
                    return this._metaEvents[i].startPosition + (((time - this._metaEventLengths[i-1]) / this._metaEvents[i].secondsPerBeat) / this._metaEvents[i].quarterNoteMultiplier);
                }
            }
            // It didn't match to anything in the lengths array, it has to be part of the last bpm/time sig pair.
            let event = this._metaEvents[this._metaEvents.length - 1]
            return event.startPosition + (((time - this._metaEventLengths[this._metaEvents.length - 2]) / event.secondsPerBeat) / event.quarterNoteMultiplier);
                
        }
    }

    /**
     * Adds a new metadata event, or edits an existing one.
     *
     * @param {number} time
     * @param {number} bpm
     * @param {number[]} timeSignature
     * @memberof SongMetadata
     */
    public addMetadataEvent(time : number, bpm : number, timeSignature : number[]) {
        let index = this._metaEvents.binarySearch(time);
        if (index === -1) {
            this._metaEvents.insert(new MetadataEvent(time, bpm, timeSignature));
        }
        else {
            this._metaEvents[index].bpm = bpm,
            this._metaEvents[index].timeSignature = timeSignature;
        }
        this.precalculateLengths();
    }

    /**
     * Removes a metadata event from the list of events
     *
     * @param {number} time
     * @memberof SongMetadata
     */
    public removeMetadataEvent(time : number) {
        if (time == 0) {
            throw new RangeError("Cannot remove initial event.");
        }
        let index = this._metaEvents.binarySearch(time);

        if (index == -1) {
            throw new RangeError("Event does not exist at this time.")
        }
        this._metaEvents.removeAt(index);
        this.precalculateLengths();
    }

    /**
     * Precalculates the number of seconds at each bpm/timesignature pair to make conversions faster
     *
     * @private
     * @memberof SongMetadata
     */
    private precalculateLengths() {
        this._metaEventLengths = [];
        if (this._metaEvents.length > 1) {
            let totalDuration = 0;
            for (let i = 0; i < (this._metaEvents.length - 1); i++) {
                let duration = this._metaEvents[i+1].startPosition - this._metaEvents[i].startPosition;
                totalDuration += duration * this._metaEvents[i].quarterNoteMultiplier * this._metaEvents[i].secondsPerBeat
                this._metaEventLengths.push(totalDuration);
            }
        }
        console.log(this._metaEventLengths);
    }
}
