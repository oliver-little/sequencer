import SortedArray from "../../HelperModules/SortedArray.js";
import {BaseEvent, ISongEvent, NoteEvent, SecondsBaseEvent} from "./SongEvents.js";
import SongMetadata from "../SongManagement/SongMetadata.js";

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
        let event = this._events[this.longestEventIndex];
        return event.startPosition + event.duration;
    }

    /**
     * Scans the list of events to find the new longest event.
     *
     * @memberof EventTimeline
     */
    public updatePlaybackTime() {
        this.longestEventIndex = null;
        this.longestEventValue = 0;
        for(let i = 0; i < this._events.length; i++) {
            if ((this._events[i].startPosition + this._events[i].duration) > this.longestEventValue){
                this.longestEventIndex = i;
            }
        }
    }

    /**
     * Adds an event to the timeline
     *
     * @param {BaseEvent} event
     * @returns The index the event was added at
     * @memberof EventTimeline
     */
    public addEvent(event: BaseEvent) : number {
        let index = this._events.insert(event);

        // Check if this event is the new longest event
        if (this.longestEventIndex != null && (event.startPosition + event.duration) > this.longestEventValue) {
            this.longestEventIndex = index;
        }
        else {
            this.longestEventIndex = 0;
        }

        return index;
    }

    /**
     * Repositions an event by editing it, removing it from the timeline and adding it again.
     *
     * @param {number} index The index of the event to edit
     * @param {number} startPosition The new startPosition of the event (quarter notes)
     * @param {number} duration The new duration of the event (quarter notes)
     * @returns {number} The new index of the event
     * @memberof EventTimeline
     */
    public editEvent(index : number, startPosition : number, duration? : number) : number {
        let event = this.events[index];
        event.startPosition = startPosition;
        if (duration != undefined) {
            event.duration = duration;
        }
        this.removeAt(index);
        return this.addEvent(event);
    }

    /**
     * Removes an event from the timeline
     *
     * @param {BaseEvent} event
     * @memberof EventTimeline
     */
    public removeEvent(event : BaseEvent) : void {
        let index = this.getIndexOfEvent(event);
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
                this.updatePlaybackTime();
            }
            else {
                this.longestEventIndex = null;
            }
        }
    }

    public getIndexOfEvent(event : BaseEvent) {
        return this.events.map(function(x : BaseEvent) {return x.id}).indexOf(event.id);
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
     * Returns all events within a time period
     *
     * @param {number} startTime The time to return events from (quarter notes)
     * @param {number} endTime The time to return events to (quarter notes)
     * @returns {BaseEvent[]} The events within the time period
     * @memberof EventTimeline
     */
    public getEventsBetweenTimes(startTime : number, endTime : number) : BaseEvent[] {
        // FIXME: this works, but it isn't as efficient as working from the front of the array, then from the back to find the values in the middle.
        let index = 0;
        
        while (index < this._events.length && (this._events[index].startPosition + this._events[index].duration) <= startTime) {
            index++;
        }
        let startIndex = index;
        while (index < this._events.length && this._events[index].startPosition < endTime) {
            index++;
        }
        let endIndex = index;
        
        if (startIndex == endIndex) {
            return [];
        }

        return this._events.slice(startIndex, endIndex);
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
    public deserialise(songEvents : ISongEvent[], metadata : SongMetadata) {
        for (let i = 0; i < songEvents.length; i++) {
            switch (songEvents[i].eventType) {
                case "BaseEvent": 
                    this._events.push(new BaseEvent(songEvents[i].startPosition, songEvents[i].duration));
                    break;
                case "NoteEvent":
                    this._events.push(new NoteEvent(songEvents[i].startPosition, songEvents[i].pitch, songEvents[i].duration));
                    break;
                case "SecondsBaseEvent":
                    this._events.push(new SecondsBaseEvent(songEvents[i].startPosition, metadata, songEvents[i].duration));
                    break;
            }
        }
        this.updatePlaybackTime();
    }
}