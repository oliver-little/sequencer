export class BaseEvent {

    public startPosition: number;

    static positionPattern = new RegExp("^[0-9]*:[0-9]*(:[0-9]*)?$")

    constructor (startPosition: number) {
        this.startPosition = startPosition;
    }

    public static comparator(a : BaseEvent, b : BaseEvent) {
        return a.startPosition - b.startPosition    
    }
}

export class NoteEvent extends BaseEvent {
    
    private _pitch: number;
    private _duration: string;

    static notes =  ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    static positionPattern = new RegExp("^[0-9]*:[0-9]*(:[0-9]*)?$");

    constructor (startPosition: number, pitch : number, duration: string) {
        super(startPosition);
        
        this.pitch = pitch;
        this.duration = duration;
    }

    /**
     * A number representing the frequency of the note.
     * Can be assigned as a pitch-octave string which will be converted.
     *
     * @memberof TrackEvent
     */
    public get pitch() {
        return this._pitch;
    }

    public set pitch(value: number|string) {
        if (typeof(value) === "number" && value > 0) {
            this._pitch = value;
        }
        else if (typeof(value) === "string") { // If it's a string, parse and convert to frequency: adapted code from https://gist.github.com/stuartmemo/3766449
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

            this._pitch = 440 * Math.pow(2, (noteNumber - 49) / 12);
        }
    }

    
    /**
     * Represents the length of the note.
     *
     * @memberof TrackEvent
     */
    //TODO: Validate note duration
    public get duration() : string {
        return this._duration;
    }

    public set duration(value: string) {
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
