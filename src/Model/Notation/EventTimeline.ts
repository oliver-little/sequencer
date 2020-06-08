import SortedArray from "../../HelperModules/SortedArray.js";
import {BaseEvent} from "./SongEvents.js";

/**
 * Container for a series of timeline events
 *
 * @class Track
 */
export class EventTimeline {

    private _events = new SortedArray<BaseEvent>(BaseEvent.comparator);
    private _eventPosition = 0; // Tracks the next event that should be scheduled

    get events() {
        return this._events;
    }

    public addEvent(note: BaseEvent) : void {
        this._events.insert(note);
    }

    public removeEvent(note: BaseEvent) : void {
        this._events.remove(note);
    }

    /**
     * Call this to signify that playback has begun.
     *
     * @param {number} time The time in **quarter notes** to start playback at 
     * @memberof EventTimeline
     */
    public start(time: number) : void {
        //FIXME: possibly better to do this using a binary search
        for (let i = 0; i < this._events.length; i++) {
            if ((this._events[i].startPosition + this._events[i].duration) > time){ 
                this._eventPosition = i;
                break;
            }
        }
    }


    /**
     * Call after startPlayback is called to get events to schedule between a given time and the last time this was called.
     *
     * @param {number} time The time up to which events should be 
     * @returns {BaseEvent[]} An array of events that should be scheduled up to the given time.
     * @memberof EventTimeline
     */
    public getEventsUntilTime(time: number) : BaseEvent[] {
        let eventsToSchedule = []
        while(this._eventPosition < this._events.length && this._events[this._eventPosition].startPosition < time) {
            eventsToSchedule.push(this._events[this._eventPosition]);
            this._eventPosition += 1;
        }

        return eventsToSchedule;
    }
}