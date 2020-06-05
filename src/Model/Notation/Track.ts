import SortedArray from "../../HelperModules/SortedArray.js";
import {BaseEvent, NoteEvent, MetadataEvent} from "./SongTrackEvent.js";
import SongMetadata from "../SongManagement/SongMetadata.js";

/**
 * Container for a series of notes, using a given time signature.
 *
 * @class Track
 */
class Track {

    public metadata : SongMetadata;

    private _events = new SortedArray(BaseEvent.comparator);

    /**
     * Creates an instance of Track.
     * @param {SongMetadata} metadata SongMetadata object tracking bpm and time signature.
     * @memberof Track
     */
    constructor (metadata : SongMetadata) {
        this.metadata = metadata;
    }

    get events() {
        return this._events;
    }

    public addEvent(note: BaseEvent) : void {
        this._events.insert(note);
    }

    public removeEvent(note: BaseEvent) : void {
        this._events.remove(note);
    }
}