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
            return this._metaEventSecondLengths[index - 1] + (time - this._metaEvents[index].startPosition) * this._metaEvents[index].quarterNoteMultiplier * this._metaEvents[index].secondsPerBeat;
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
            // More than one event, find out which one it is part of.
            if (this._metaEventSecondLengths[0] > time) { // It's in the first event
                return (time / this._metaEvents[0].secondsPerBeat) / this._metaEvents[0].quarterNoteMultiplier;
            }
            // It's in the middle events
            for (let i = 1; i < this._metaEventSecondLengths.length; i++) {
                if (this._metaEventSecondLengths[i] > time) {
                    // Add the previous number of quarter notes with the exact number of quarter notes that seconds value represents in the current bpm/time sig pair.
                    return this._metaEvents[i].startPosition + (((time - this._metaEventSecondLengths[i-1]) / this._metaEvents[i].secondsPerBeat) / this._metaEvents[i].quarterNoteMultiplier);
                }
            }
            // It didn't match to anything in the lengths array, it has to be part of the last bpm/time sig pair.
            let event = this._metaEvents[this._metaEvents.length - 1];
            return event.startPosition + (((time - this._metaEventSecondLengths[this._metaEvents.length - 2]) / event.secondsPerBeat) / event.quarterNoteMultiplier);
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
        if (time < 0) {
            throw new RangeError("Cannot have negative time");
        }

        // Find the meta event this quarter note position is within.
        let index = this._metaEvents.binarySearch(time, true);
        if (index == 0) {
            // If it's the first one, just do the calculation
            return (time * this._metaEvents[index].quarterNoteMultiplier) / this._metaEvents[index].timeSignature[0];
        }
        else {
            // If it's not the first one, get the number of bars passed to get to this bpm/time sig pair then calculate exactly when the position occurs in that event.
            return this._metaEventBarLengths[index - 1] + (((time - this._metaEvents[index].startPosition) * this._metaEvents[index].quarterNoteMultiplier) / this._metaEvents[index].timeSignature[0]);
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
        if (this._metaEvents.length == 1) {
            return (time * this._metaEvents[0].timeSignature[0]) / this._metaEvents[0].quarterNoteMultiplier;
        }
        else {
            // More than one event, find out which one it is part of.
            if (this._metaEventBarLengths[0] > time) { // It's in the first event
                return (time * this._metaEvents[0].timeSignature[0]) / this._metaEvents[0].quarterNoteMultiplier;
            }
            // It's in the middle event
            for (let i = 0; i < this._metaEventBarLengths.length - 1; i++) {
                if (this._metaEventBarLengths[i] > time) {
                    // Add the previous number of quarter notes with the exact number of quarter notes that bars value represents in the current bpm/time sig pair.
                    return this._metaEvents[i].startPosition + (((time - this._metaEventBarLengths[i-1]) * this._metaEvents[i].timeSignature[0]) / this._metaEvents[i].quarterNoteMultiplier);
                }
            }
            // It didn't match to anything in the lengths array, it has to be part of the last bpm/time sig pair.
            let event = this._metaEvents[this._metaEvents.length - 1];
            return event.startPosition + (((time - this._metaEventBarLengths[this._metaEvents.length - 2]) * event.timeSignature[0]) / event.quarterNoteMultiplier);
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
        if (time < 0) {
            throw new RangeError("Cannot have negative time");
        }

        // Find the meta event this quarter note position is within.
        let index = this._metaEvents.binarySearch(time, true);
        if (index == 0) {
            // If it's the first one, just do the calculation
            return (time * this._metaEvents[index].quarterNoteMultiplier);
        }
        else {
            // If it's not the first one, get the number of bars passed to get to this bpm/time sig pair then calculate exactly when the position occurs in that event.
            return this._metaEventBeatLengths[index - 1] + ((time - this._metaEvents[index].startPosition) * this._metaEvents[index].quarterNoteMultiplier);
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
        if (this._metaEvents.length == 1) {
            return time / this._metaEvents[0].quarterNoteMultiplier;
        }
        else {
            // More than one event, find out which one it is part of.
            if (this._metaEventBarLengths[0] > time) { // It's in the first event
                return time / this._metaEvents[0].quarterNoteMultiplier;
            }
            // It's in the middle event
            for (let i = 0; i < this._metaEventBeatLengths.length - 1; i++) {
                if (this._metaEventBarLengths[i] > time) {
                    // Add the previous number of quarter notes with the exact number of quarter notes that bars value represents in the current bpm/time sig pair.
                    return this._metaEvents[i].startPosition + ((time - this._metaEventBeatLengths[i-1]) / this._metaEvents[i].quarterNoteMultiplier);
                }
            }
            // It didn't match to anything in the lengths array, it has to be part of the last bpm/time sig pair.
            let event = this._metaEvents[this._metaEvents.length - 1];
            return event.startPosition + (((time - this._metaEventBeatLengths[this._metaEvents.length - 2]) * event.timeSignature[0]) / event.quarterNoteMultiplier);
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
     * Precalculates the number of seconds and bars at each bpm/timesignature pair to make conversions faster
     *
     * @private
     * @memberof SongMetadata
     */
    private precalculateLengths() {
        this._metaEventSecondLengths = [];
        this._metaEventBarLengths = [];
        if (this._metaEvents.length > 1) {
            let totalSecondsDuration, totalBarsDuration, totalBeatsDuration = 0;
            for (let i = 0; i < (this._metaEvents.length - 1); i++) {
                let quarterNoteDuration = this._metaEvents[i+1].startPosition - this._metaEvents[i].startPosition;
                totalSecondsDuration += quarterNoteDuration * this._metaEvents[i].quarterNoteMultiplier * this._metaEvents[i].secondsPerBeat;
                this._metaEventSecondLengths.push(totalSecondsDuration);

                totalBarsDuration += (quarterNoteDuration * this._metaEvents[i].quarterNoteMultiplier) / this._metaEvents[i].timeSignature[0];
                this._metaEventBarLengths.push(totalBarsDuration);

                totalBeatsDuration += (quarterNoteDuration * this._metaEvents[i].quarterNoteMultiplier);
                this._metaEventBeatLengths.push(totalBeatsDuration);
            }
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
