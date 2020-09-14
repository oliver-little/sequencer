import SortedArray from "../../HelperModules/SortedArray.js";
import {MetadataEvent, ISongEvent} from "../Notation/SongEvents.js";

/**
 * Container class to store global song data
 *
 * @export
 * @class SongMetadata
 */
export default class SongMetadata {

    private _metaEvents = new SortedArray<MetadataEvent>(MetadataEvent.comparator);
    private _metaEventSecondLengths = [];
    private _metaEventBarLengths = [];
    private _metaEventBeatLengths = [];


    constructor(bpm = 60, timeSignature = [4, 4]) {
        this.addMetadataEvent(0, bpm, timeSignature);
    }

    get events() {
        return this._metaEvents;
    }

    /**
     * Gets the BPM at a given quarter note position
     *
     * @param {number} time
     * @returns {number}
     * @memberof SongMetadata
     */
    public getBPM(time : number) : number {
        return this._metaEvents[this._metaEvents.binarySearch(time, true)].bpm;
    }

    /**
     * Gets the seconds per beat at a given quarter note position
     *
     * @param {number} time
     * @returns {number}
     * @memberof SongMetadata
     */
    public getSecondsPerBeat(time : number) : number {
        return this._metaEvents[this._metaEvents.binarySearch(time, true)].secondsPerBeat;
    }

    /**
     * Gets the time signature at a given quarter note position
     *
     * @param {number} time
     * @returns {number[]}
     * @memberof SongMetadata
     */
    public getTimeSignature(time : number) : number[] {
        return this._metaEvents[this._metaEvents.binarySearch(time, true)].timeSignature;
    }

    /**
     * Gets the quarter note multiplier at a given quarter note position
     *
     * @param {number} time
     * @returns {number}
     * @memberof SongMetadata
     */
    public getQuarterNoteMultiplier(time : number) : number {
        return this._metaEvents[this._metaEvents.binarySearch(time, true)].quarterNoteMultiplier;
    }

    /**
     * Converts a quarter note position to a seconds position.
     *
     * @param {number} time The position in quarter notes
     * @returns {number} The position in seconds
     * @memberof SongMetadata
     */
    public positionQuarterNoteToSeconds(time : number) : number {
        if (time === undefined || time < 0) {
            throw new RangeError("Time is invalid");
        }

        // Find the meta event this quarter note position is within.
        let index = this._metaEvents.binarySearch(time, true);
        if (index == 0) {
            // If it's the first one, just do the calculation
            return time * this._metaEvents[index].quarterNoteMultiplier * this._metaEvents[index].secondsPerBeat;
        }
        else {
            // If it's not the first one, get the number of seconds passed to this bpm/time sig pair then calculate exactly when the position occurs in that event.
            return this._metaEventSecondLengths[index] + (time - this._metaEvents[index].startPosition) * this._metaEvents[index].quarterNoteMultiplier * this._metaEvents[index].secondsPerBeat;
        }
    }

    /**
     * Converts a seconds position to a quarter note position.
     *
     * @param {number} time The position in seconds
     * @returns {number} The position in quarter notes
     * @memberof SongMetadata
     */
    public positionSecondsToQuarterNote(time : number) : number {
        for (let i = this._metaEventSecondLengths.length - 1; i >= 0; i--) {
            if (time >= this._metaEventSecondLengths[i]) {
                return this._metaEvents[i].startPosition + (((time - this._metaEventSecondLengths[i]) / this._metaEvents[i].secondsPerBeat) / this._metaEvents[i].quarterNoteMultiplier);
            }
        }
    }

    /**
     * Converts a quarter notes position to bars
     *
     * @param {number} time The position in quarter notes
     * @returns {number} The position in bars
     * @memberof SongMetadata
     */
    public positionQuarterNoteToBars(time : number) : number {
        if (time === undefined || time < 0) {
            throw new RangeError("Time is invalid");
        }

        // Find the meta event this quarter note position is within.
        let index = this._metaEvents.binarySearch(time, true);
        if (index == 0) {
            // If it's the first one, just do the calculation
            return (time * this._metaEvents[index].quarterNoteMultiplier) / this._metaEvents[index].timeSignature[0];
        }
        else {
            // If it's not the first one, get the number of bars passed to get to this bpm/time sig pair then calculate exactly when the position occurs in that event.
            return this._metaEventBarLengths[index ] + (((time - this._metaEvents[index].startPosition) * this._metaEvents[index].quarterNoteMultiplier) / this._metaEvents[index].timeSignature[0]);
        }
    }

    /**
     * Converts a bars position to quarter notes
     *
     * @param {number} time The position in bars
     * @returns {number}  The position in quarter notes
     * @memberof SongMetadata
     */
    public positionBarsToQuarterNote(time : number) : number {
        for (let i = this._metaEventBarLengths.length - 1; i >= 0; i--) {
            if (time >= this._metaEventBarLengths[i]) {
                return this._metaEvents[i].startPosition + (((time - this._metaEventBarLengths[i]) * this._metaEvents[i].timeSignature[0]) / this._metaEvents[i].quarterNoteMultiplier);
            }
        }
    }

    /**
     * Converts a quarter note position to beats 
     *
     * @param {number} time The position in quarter notes
     * @returns {number} The position in beats
     * @memberof SongMetadata
     */
    public positionQuarterNoteToBeats(time : number) : number {
        if (time === undefined || time < 0) {
            throw new RangeError("Time is invalid");
        }

        // Find the meta event this quarter note position is within.
        let index = this._metaEvents.binarySearch(time, true);
        if (index == 0) {
            // If it's the first one, just do the calculation
            return (time * this._metaEvents[index].quarterNoteMultiplier);
        }
        else {
            // If it's not the first one, get the number of beats passed to get to this bpm/time sig pair then calculate exactly when the position occurs in that event.
            return this._metaEventBeatLengths[index] + ((time - this._metaEvents[index].startPosition) * this._metaEvents[index].quarterNoteMultiplier);
        }
    }

    /**
     * Converts a beats position to quarter notes
     *
     * @param {number} time The position in beats
     * @returns {number}  The position in quarter notes
     * @memberof SongMetadata
     */
    public positionBeatsToQuarterNote(time : number) : number {
        for (let i = this._metaEventBeatLengths.length - 1; i >= 0; i--) {
            if (time >= this._metaEventBeatLengths[i]) {
                return this._metaEvents[i].startPosition + ((time - this._metaEventBeatLengths[i]) / this._metaEvents[i].quarterNoteMultiplier);
            }
        }
    }

    /**
     * Adds a new metadata event, or edits an existing one.
     *
     * @param {number} time
     * @param {number} bpm
     * @param {number[]} timeSignature 
     * @returns {MetadataEvent} The event that was created/edited
     * @memberof SongMetadata
     */
    public addMetadataEvent(time : number, bpm : number, timeSignature : number[]) : MetadataEvent {
        let index = this._metaEvents.binarySearch(time);
        if (index === -1) {
            index = this._metaEvents.insert(new MetadataEvent(time, bpm, timeSignature));
        }
        else {
            this._metaEvents[index].originalStartPosition = time;
            this._metaEvents[index].bpm = bpm,
            this._metaEvents[index].timeSignature = timeSignature;
        }
        this.precalculateLengths();
        // Now move every metadata event after the current one so it starts on a bar (to prevent errors in displaying the UI)
        let indicesToRemove = [];
        for (let i = index + 1; i < this._metaEvents.length; i++) {
            let prevEvent = this._metaEvents[i - 1];
            // Calculate the position of the current metaEvent in the context of the last metaEvent, then round it so it starts on a bar line.
            let roundedBarPosition = Math.round(((this._metaEvents[i].originalStartPosition - prevEvent.startPosition) * prevEvent.quarterNoteMultiplier) / prevEvent.timeSignature[0]);
            // Then, convert that bar position back to a quarter note position
            let newPosition = prevEvent.startPosition + ((roundedBarPosition) * prevEvent.timeSignature[0]) / prevEvent.quarterNoteMultiplier;
            
            // Check the new position does not collide with an existing event
            if (newPosition != this._metaEvents[i].startPosition && this._metaEvents.binarySearch(newPosition) != -1) {
                indicesToRemove.push(i);
            }
            else {
                // If it doesn't, change the information and recalculate the lengths to do it for the next events
                this._metaEvents[i].startPosition = newPosition;
                this.precalculateLengths();
            }
        }
        if (indicesToRemove != []) {
            indicesToRemove.forEach(index => {this._metaEvents.removeAt(index)});
            this.precalculateLengths();
        }

        return this._metaEvents[index];
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
     * Precalculates the number of seconds and bars at each bpm/timesignature pair to make conversions faster
     *
     * @private
     * @memberof SongMetadata
     */
    private precalculateLengths() {
        this._metaEventSecondLengths = [0];
        this._metaEventBarLengths = [0];
        this._metaEventBeatLengths = [0];
        let totalSecondsDuration = 0;
        let totalBarsDuration = 0;
        let totalBeatsDuration = 0;
        for (let i = 1; i < this._metaEvents.length; i++) {
            let quarterNoteDuration = this._metaEvents[i].startPosition - this._metaEvents[i - 1].startPosition;

            totalSecondsDuration += quarterNoteDuration * this._metaEvents[i - 1].quarterNoteMultiplier * this._metaEvents[i - 1].secondsPerBeat;
            this._metaEventSecondLengths.push(totalSecondsDuration);

            totalBarsDuration += (quarterNoteDuration * this._metaEvents[i - 1].quarterNoteMultiplier) / this._metaEvents[i - 1].timeSignature[0];
            this._metaEventBarLengths.push(totalBarsDuration);

            totalBeatsDuration += (quarterNoteDuration * this._metaEvents[i - 1].quarterNoteMultiplier);
            this._metaEventBeatLengths.push(totalBeatsDuration);
        }
    }

    /**
     * Serialises the current set of MetadataEvents
     *
     * @returns {Array<ISongEvent>}
     * @memberof SongMetadata
     */
    public serialise() : Array<ISongEvent> {
        let serialisedEvents = [];
        this._metaEvents.forEach(metaEvent => {
            serialisedEvents.push(metaEvent.serialise());
        });

        return serialisedEvents;
    }

    /**
     * Deserialises an array of serialised MetadataEvents and adds them to the array of events.
     *
     * @param {Array<ISongEvent>} metaEvents
     * @memberof SongMetadata
     */
    public deserialise(metaEvents : Array<ISongEvent>) {
        metaEvents.forEach(metaEvent => {
            if (metaEvent.eventType === "MetadataEvent") {
                this.addMetadataEvent(metaEvent.startPosition, metaEvent.bpm, metaEvent.timeSignature);
            }
            else {
                console.log("SongMetadata does not support this event type.");
            }
        });
    }
}
