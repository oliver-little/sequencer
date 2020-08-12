import SongMetadata from "../SongManagement/SongMetadata.js";
import NoteHelper from "../../HelperModules/NoteHelper.js";
import {v4 as uuid} from "uuid";

export interface ISongEvent {
    "eventType" : string,
    "startPosition" : number
    [x: string]: any 
}

export class BaseEvent {

    public startPosition: number;
    public id : string;

    // Basic duration, has a different meaning for different kinds of events.
    protected _duration = 0; 

    constructor (startPosition: number, duration = 0) {
        this.startPosition = startPosition;
        this.duration = duration;
        this.id = uuid();
    }

    /**
     * Represents the length of the note in quarter notes.
     *
     * @memberof BaseEvent
     */
    public get duration() : number {
        return this._duration;
    }

    public set duration(value: number) {
        this._duration = value;
    }

    public serialise() : ISongEvent {
        return {
            "eventType": "BaseEvent",
            "startPosition": this.startPosition,
            "duration": this.duration
        };
    }

    public static comparator(a : BaseEvent, b : BaseEvent) {
        if (a.startPosition > b.startPosition) return 1;
        if (a.startPosition < b.startPosition) return -1;
        if (a.duration > b.duration) return 1;
        if (a.duration < b.duration) return -1;
        return 0;
    }
}

/**
 * Same as BaseEvent but duration is set in seconds and returned in quarter notes.
 * This takes a reference to the metadata because it does the conversion every time the quarter note duration is requested.
 *
 * @export
 * @class SecondsBaseEvent
 */
export class SecondsBaseEvent extends BaseEvent {

    private _metadata : SongMetadata;

    /**
     * Creates an instance of SecondsBaseEvent.
     * @param {number} startPosition The start position in quarter notes
     * @param {SongMetadata} metadata The SongMetadata object this event should use
     * @param {number} [secondsDuration=0] The duration of the note in seconds
     * @memberof SecondsBaseEvent
     */
    constructor (startPosition: number, metadata : SongMetadata, secondsDuration : number = 0) {
        super(startPosition);
        this._metadata = metadata;
        this.secondsDuration = secondsDuration;
    }

    /**
     * Get duration in quarter notes.
     *
     * @memberof SecondsBaseEvent
     */
    public get duration() {
        return this._metadata.positionSecondsToQuarterNote(this._duration);
    }

    /**
     * Set duration in quarter notes.
     *
     * @memberof SecondsBaseEvent
     */
    public set duration(value : number) {
        this._duration = this._metadata.positionQuarterNoteToSeconds(this._duration);
    }

    /**
     * Get duration in seconds.
     *
     * @memberof SecondsBaseEvent
     */
    public get secondsDuration() {
        return this._duration;
    }

    /**
     * Set duration in seconds.
     *
     * @memberof SecondsBaseEvent
     */
    public set secondsDuration(value : number) {
        this._duration = value;
    }

    public serialise() : ISongEvent {
        let obj = super.serialise();
        obj.eventType = "SecondsBaseEvent";
        obj.duration = this._duration;
        return obj;
    }
}

export class NoteEvent extends BaseEvent {
    
    /**
     * Represents the frequency of the note (Hz)
     * Use setPitchString to set this with pitch-octave notation.
     *
     * @memberof NoteEvent
     */
    public pitch: number;

    private _pitchString;

    static durationPattern = new RegExp("^(1|2|4|8|16|32|64)(t|n|\\.)$");

    /**
     *Creates an instance of NoteEvent.
     * @param {number} startPosition The position of the note to begin (quarter notes)
     * @param {(number|string)} pitch The pitch of the note (Hz / pitch-octave notation string)
     * @param {string} duration The duration of the note (1-64 n*(ote)* / t*(riplet)* /. *(dotted)* or a number of quarter notes)
     * @memberof NoteEvent
     */
    constructor (startPosition: number, pitch : number|string, duration: number|string) {
        super(startPosition);
    
        if (typeof(pitch) ==="string") {
            this.pitchString = pitch;
        }
        else {
            this.pitch = pitch;
        }
        if(typeof(duration) === "string") {
            this.duration = this._parseQuarterNoteLength(duration)
        }
        else {
            this.duration = duration;
        }
    }

    get pitchString() : string {
        return this._pitchString;
    }

    /**
     * Sets the pitch of the note with pitch-octave notation
     *
     * @param {string} value The pitch-octave notation string
     * @memberof NoteEvent
     */
    set pitchString(value: string) {
        this._pitchString = value;
        this.pitch = NoteHelper.noteStringToFrequency(value);
    }

    /**
     * Represents the length of the note in quarter notes.
     *
     * @memberof BaseEvent
     */
    // Duplicated because getters aren't inherited in js
    public get duration() : number {
        return this._duration;
    }

    /**
     * Set note duration as number of quarter notes
     *
     * @memberof NoteEvent
     */
    public set duration(value: number) {
        if (value < 0) {
            throw new Error("Invalid duration value");
        }
        this._duration = value;
    }

    /**
     * Use to assign duration using a string (1/2/4/8... n(note)/t(riplet)/.(dotted))
     *
     * @param {string} value
     * @memberof NoteEvent
     */
    public setDurationString(value : string) {
        if (!NoteEvent.durationPattern.test(value)) {
            throw new Error("Invalid duration value");
        }
        this._duration = this._parseQuarterNoteLength(value);
    }

    public serialise() : ISongEvent {
        let obj = super.serialise();
        obj.eventType = "NoteEvent";
        obj["pitch"] = this.pitch;
        return obj;
    }

    private _parseQuarterNoteLength(note : string) : number {
        // General calculation for getting a note's length:
        // (Beat Type (denominator of time signature) / Note Type) * Seconds Per Beat
        // E.G: At 120bpm the seconds per beat is 0.5 (60/120),
        // Therefore in 4/4, an 8th note is 4/8 * 0.5 = 0.25s
        let noteLength = parseInt(note.slice(0, note.length - 1));
        switch (note.charAt(note.length - 1)) {
            case "n":
                return (4 / noteLength);
            case ".":
                return ((4 / noteLength) * 1.5);
            case "t":
                return ((4 / noteLength) / 1.5);
            default:
                throw new Error("Invalid note.");
        }
    }

    public toString() : string {
        return "(NoteEvent: Duration: " + this.duration + " Pitch: " + this.pitch + " startPosition: " + this.startPosition + ")\n";
    }
}

export class MetadataEvent {

    public startPosition : number;

    private _bpm : number;
    private _secondsPerBeat : number;
    private _timeSignature : number[];
    private _quarterNoteMultiplier : number;

    constructor(startPosition : number, bpm : number, timeSignature : number[]) {
        this.startPosition = startPosition;
        this.bpm = bpm;
        this.timeSignature = timeSignature
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

    get timeSignature() {
        return this._timeSignature;
    }

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

    get quarterNoteMultiplier() {
        return this._quarterNoteMultiplier;
    }

    public static comparator(a : MetadataEvent|number, b : MetadataEvent) {
        if (typeof(a) === "number") {
            return a - b.startPosition;
        }
        else {
            return a.startPosition - b.startPosition;
        }
    }

    public serialise() : ISongEvent {
        return {
            "eventType" : "MetadataEvent",
            "startPosition" : this.startPosition,
            "bpm" : this.bpm,
            "timeSignature" : this.timeSignature,
        };
    }
}