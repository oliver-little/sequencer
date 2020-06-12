export class BaseEvent {

    public startPosition: number;

    // Basic duration, has a different meaning for different kinds of events.
    protected _duration = 0; 


    constructor (startPosition: number) {
        this.startPosition = startPosition;
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

    public static comparator(a : BaseEvent, b : BaseEvent) {
        if (a.startPosition > b.startPosition) return 1;
        if (a.startPosition < b.startPosition) return -1;
        if (a.duration > b.duration) return 1;
        if (a.duration < b.duration) return -1;
        return 0;
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

    static notes =  ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
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
            this.setPitchString(pitch);
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

    /**
     * Sets the pitch of the note with pitch-octave notation
     *
     * @param {string} value The pitch-octave notation string
     * @memberof NoteEvent
     */
    public setPitchString(value: string) : void {
        let octave = 0;
        if (value.length == 2) {
            octave = parseInt(value.charAt(1));
        }
        else if (value.length === 3) {
            octave = parseInt(value.charAt(2));
        }
        else {
            throw new RangeError("String is invalid (incorrect length)");
        }

        let noteNumber = NoteEvent.notes.indexOf(value.slice(0, -1)) + 3;
        noteNumber = noteNumber + ((octave - 1) * 12) + 1; 

        this.pitch = 440 * Math.pow(2, (noteNumber - 49) / 12);
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
}