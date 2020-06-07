export class BaseEvent {

    public startPosition: number;

    static positionPattern = new RegExp("^[0-9]*:[0-9]*(:[0-9]*)?$")

    constructor (startPosition: number) {
        this.startPosition = startPosition;
    }

    public static comparator(a : BaseEvent, b : BaseEvent) {
        return a.startPosition - b.startPosition;
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

    private _duration: string;

    static notes =  ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    static positionPattern = new RegExp("^[0-9]*:[0-9]*(:[0-9]*)?$");

    static durationPattern = new RegExp("^((1|2|4|8|16|32|64)(t|n|\\.)|([0-9]*b))$");

    /**
     *Creates an instance of NoteEvent.
     * @param {number} startPosition The position of the note to begin (quarter notes)
     * @param {(number|string)} pitch The pitch of the note (Hz / pitch-octave notation string)
     * @param {string} duration The duration of the note (1-64 n*(ote)* / t*(riplet)* /. *(dotted)* or **x**b *(number of bars)*)
     * @memberof NoteEvent
     */
    constructor (startPosition: number, pitch : number|string, duration: string) {
        super(startPosition);
        
        if (typeof(pitch) ==="string") {
            this.setPitchString(pitch);
        }
        else{
            this.pitch = pitch;
        }
        this.duration = duration;
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
     * Represents the length of the note.
     *
     * @memberof TrackEvent
     */
    public get duration() : string {
        return this._duration;
    }

    public set duration(value: string) {
        if (!NoteEvent.durationPattern.test(value)) {
            throw new Error("Invalid duration value");
        }
        this._duration = value;
    }
}

export class MetadataEvent extends BaseEvent {

    public changes: Map<String, any>;

    constructor(startPosition: number, changes : Map<String, any>) {
        super(startPosition);

        this.changes = changes;
    }
}
