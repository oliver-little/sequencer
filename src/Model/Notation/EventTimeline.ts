import SortedArray from "../../HelperModules/SortedArray.js";
import {BaseEvent, ISongEvent, NoteEvent} from "./SongEvents.js";

/**
 * Container for a series of timeline events
 *
 * @class Track
 */
export class EventTimeline {

    private _events = new SortedArray<BaseEvent>(BaseEvent.comparator);
    private _eventPosition = 0; // Tracks the next event that should be scheduled
    
    // Used to calculate total playback time of this track.
    private longestEventIndex = null;
    private longestEventValue = 0;

    get events() {
        return this._events;
    }

    get playbackTime() {
        return this.longestEventValue;
    }

    /**
     * Adds an event to the timeline
     *
     * @param {BaseEvent} event
     * @memberof EventTimeline
     */
    public addEvent(event: BaseEvent) : void {
        let index = this._events.insert(event);

        // Check if this event is the new longest event
        if (this.longestEventIndex != null && (event.startPosition + event.duration) > this.longestEventValue) {
            this.longestEventIndex = index;
            this.longestEventValue = event.startPosition + event.duration;
        }
        else {
            this.longestEventIndex = 0;
        }
    }

    /**
     * Removes an event from the timeline
     *
     * @param {BaseEvent} event
     * @memberof EventTimeline
     */
    // TODO: add uuid to baseevents and remove using uuid
    public removeEvent(event : BaseEvent) : void {
        let index = this._events.binarySearch(event);
        if (index == -1) {
            throw new Error("Event doesn't exist.");
        }

        this.removeAt(index);
    }

    /**
     * Removes an event at a specific index from the timeline
     *
     * @param {BaseEvent} event
     * @memberof EventTimeline
     */
    public removeAt(index : number) : void {
        this._events.splice(index, 1); 
        
        // Check if the longest event was removed, find the new longest event if it was.
        if (index === this.longestEventIndex)  {
            if (this._events.length > 0) {
                this.longestEventIndex = null;
                this.longestEventValue = 0;
                for(let i = 0; i < this.longestEventIndex; i++) {
                    if ((this._events[i].startDuration + this._events[i].duration) > this.longestEventValue){
                        this.longestEventIndex = i;
                        this.longestEventValue = (this._events[i].startDuration + this._events[i].duration);
                    }
                }
            }
            else {
                this.longestEventIndex = null;
                this.longestEventValue = 0;
            }
        }
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

    /**
     * Serialises the events in the timeline by returning an array of data objects
     *
     * @memberof EventTimeline
     */
    public serialise() {
        let serialisedEvents = [];
        for(let i = 0; i < this.events.length; i++) {
            serialisedEvents.push(this.events[i].serialise());
        }
        return serialisedEvents;
    }

    /**
     * Deserialises an ordered list of song events
     *
     * @param {ISongEvent[]} songEvents
     * @memberof EventTimeline
     */
    public deserialise(songEvents : ISongEvent[]) {
        for (let i = 0; i < songEvents.length; i++) {
            switch (songEvents[i].eventType) {
                case "BaseEvent": 
                    this._events.push(new BaseEvent(songEvents[i].startPosition, songEvents[i].duration));
                case "NoteEvent":
                    this._events.push(new NoteEvent(songEvents[i].startPosition, songEvents[i].pitch, songEvents[i].duration));
            }
        }
    }
}