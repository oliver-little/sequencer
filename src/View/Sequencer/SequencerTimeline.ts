import * as PIXI from "pixi.js";
import { ScrollableTimeline } from "../Shared/ScrollableTimeline.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { TimelineMode, MouseClickType } from "../Shared/Enums.js";
import { NoteUITrack } from "../UIObjects/UITrack.js";
import { TrackTimelineEvent, NoteTimelineEvent } from "../Shared/TrackTimelineEvent.js";
import NoteHelper from "../../HelperModules/NoteHelper.js";
import { UIColors, UIPositioning } from "../Shared/UITheme.js";
import { NoteEvent } from "../../Model/Notation/SongEvents.js";
import { NoteGroupMarker } from "./NoteGroupMarker.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";

enum NoteLength {
    Bar,
    Half,
    Quarter,
    Eighth,
    Sixteenth,
    ThirtySecond
}

interface INewNoteData {
    pitchString: string,
    startPosition: number,
    duration: number
}

export class SequencerTimeline extends ScrollableTimeline {

    static noteHeight = 20;

    static noteLengthDict = {
        [NoteLength.Bar]: 4,
        [NoteLength.Half]: 2,
        [NoteLength.Quarter]: 1,
        [NoteLength.Eighth]: 0.5,
        [NoteLength.Sixteenth]: 0.25,
        [NoteLength.ThirtySecond]: 0.125
    }

    public timelineMode: TimelineMode = TimelineMode.Edit;
    public noteLength: NoteLength = NoteLength.Quarter;

    public track: NoteUITrack;

    // Scrolling variables
    protected _startVerticalScrollPosition: number;

    protected _contentHeight: number;

    protected _newEventGraphics: PIXI.Graphics;
    protected _newEventData: INewNoteData;

    protected _noteGroupContainer: PIXI.Container;
    protected _noteGroupPool : ObjectPool<NoteGroupMarker>;


    constructor(startX: number, endX: number, endY: number, contentHeight: number, songManager: SongManager, track: NoteUITrack) {
        super(startX, endX, 0, endY, songManager);
        this.track = track;
        this._contentHeight = contentHeight;

        this._noteGroupContainer = new PIXI.Container();
        this._noteGroupPool = new ObjectPool();
        this._newEventGraphics = new PIXI.Graphics();
        this.addChild(this._noteGroupContainer, this._newEventGraphics);

        this._regenerateTimeline(0);
    }

    get contentHeight() {
        return this._contentHeight;
    }

    // Fixes the bug where C0 will be off the screen, by offsetting the height by one note.
    get offsetContentHeight() {
        return this.contentHeight - SequencerTimeline.noteHeight;
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        this._newEventGraphics.visible = false;
        super.pointerMoveHandler(event);
        if (this._mouseClickType == MouseClickType.None && this.timelineMode == TimelineMode.Edit) {
            this._newEventData = undefined;
            // Get the mouse position, extract the y coordinate and invert by the height (so C8 is at the top of the rows, not the bottom)
            let mousePos = event.data.getLocalPosition(this.parent);
            if (mousePos.x < this.startX || mousePos.x > this.endX || mousePos.y < (this.startY + UIPositioning.timelineHeaderHeight) || mousePos.y > this.endY) {
                return;
            }

            // Include the scroll position in the calculation for what note is selected
            let y = mousePos.y - this._verticalScrollPosition;
            y = y - (y % 20); // Snap to nearest note

            let noteString = NoteHelper.noteNumberToNoteString(Math.max(0, (this.offsetContentHeight - y) / SequencerTimeline.noteHeight));

            let [barPosition, beatPosition, numBeats] = this._getBarFromStageCoordinates(mousePos.x);
            beatPosition = this.snapBeatToDragType(beatPosition);
            barPosition += beatPosition / numBeats;
            let startPosition = this.metadata.positionBarsToQuarterNote(barPosition);

            let length = SequencerTimeline.noteLengthDict[this.noteLength];

            let noteData: INewNoteData = { pitchString: noteString, startPosition: startPosition, duration: length };

            // Check no events already occur at the point the new event should be added
            let events = this.track.track.timeline.getEventsBetweenTimes(startPosition, startPosition + length) as NoteEvent[];

            for (let i = 0; i < events.length; i++) {
                if (events[i].pitchString === noteData.pitchString) {
                    return;
                }
            }

            let x = this._getStageCoordinatesFromBar(barPosition);
            y += this._verticalScrollPosition;
            let width = (this.metadata.positionQuarterNoteToBeats(startPosition + length) - this.metadata.positionQuarterNoteToBeats(startPosition)) * this.beatWidth;

            this._newEventGraphics.clear()
                .beginFill(UIColors.trackEventColor)
                .drawRect(x, y, width, SequencerTimeline.noteHeight)
                .endFill()
                .beginHole()
                .drawRect(x + 2, y + 2, width - 4, SequencerTimeline.noteHeight - 4)
                .endHole();
            this._newEventData = noteData;
            this._newEventGraphics.visible = true;
        }
    }

    public pointerUpClickHandler(event: PIXI.InteractionEvent) {
        super.pointerUpClickHandler(event);
        // Check that the click was a left click, and the timeline is in edit mode, and there is some valid event data to use to create the object.
        if (this._mouseClickType == MouseClickType.LeftClick && this.timelineMode == TimelineMode.Edit && this._newEventData != undefined) {
            let noteEvent = this.track.track.addNote(this._newEventData.startPosition, this._newEventData.pitchString, this._newEventData.duration);

            // Now the note has been added, also edit the NoteGroups to contain this note
            let noteGroups = this.track.getNoteGroupsWithinTime(noteEvent.startPosition, noteEvent.endPosition);
            let chosenNoteGroup : number[] = null;

            // If more than 1 note group was found, merge them.
            if (noteGroups.length > 1) {
                chosenNoteGroup = [noteGroups[0][0], noteGroups[noteGroups.length - 1][1]];
                noteGroups.forEach(noteGroup => {
                    this.track.removeNoteGroup(noteGroup[0]);
                });
                this.track.addNoteGroup(chosenNoteGroup[0], chosenNoteGroup[1]);
            }
            else if (noteGroups.length == 1) { // Only one group was found, do nothing.
                chosenNoteGroup = noteGroups[0];
            }
            else { // If no NoteGroup was found, find the nearest one.
                // NoteEvent ends before the first event
                if (this.track.noteGroups[0][0] > noteEvent.endPosition) {
                    chosenNoteGroup = this.track.noteGroups[0];
                }
                else {
                    let index = 1;
                    while (index < this.track.noteGroups.length && this.track.noteGroups[index][1] < noteEvent.startPosition) {
                        index++;
                    }

                    // NoteEvent starts after the last event
                    if (index == this.track.noteGroups.length) {
                        chosenNoteGroup = this.track.noteGroups[index - 1];
                    }
                    else {
                        // NoteEvent occurs somewhere between some NoteGroups, find the closest
                        if (Math.abs(this.track.noteGroups[index - 1][1] - noteEvent.endPosition) <= Math.abs(this.track.noteGroups[index][0] - noteEvent.startPosition)) {
                            chosenNoteGroup = this.track.noteGroups[index-1];
                        }
                        else {
                            chosenNoteGroup = this.track.noteGroups[index];
                        }
                    }
                }
            }
            let newNoteGroup = chosenNoteGroup;
            // In all cases, check the start position is before this note's start and the end position is after this note's end
            if (newNoteGroup[0] > noteEvent.startPosition) {
                newNoteGroup[0] = noteEvent.startPosition;
            }
            if (newNoteGroup[1] < noteEvent.endPosition) {
                newNoteGroup[1] = noteEvent.endPosition;
            }
            if (newNoteGroup != chosenNoteGroup) {
                this.track.removeNoteGroup(chosenNoteGroup[0]);
                this.track.addNoteGroup(newNoteGroup[0], newNoteGroup[1]);
            }

            // Then update the noteGroups
            this._initialiseNoteGroups();

            this._initialiseNote(noteEvent);


            this._newEventData = undefined;
        }
    }

    public mouseWheelHandler(event: WheelEvent, canvasX: number, canvasY: number) {
        this._newEventGraphics.visible = false;
        super.mouseWheelHandler(event, canvasX, canvasY);
    }

    // Possible change here, use a regenerate event rather than overriding this function
    protected _regenerateTimeline(fromBar: number, toBar?: number) {
        super._regenerateTimeline(fromBar, toBar);

        this._initialiseNoteGroups();
    }

    protected _offsetChildren(pixelOffset: number) {
        super._offsetChildren(pixelOffset);

        this._noteGroupContainer.children.forEach(child => {
            child.x -= pixelOffset;
        });
    }

    protected _initialiseTrackTimelineEvents() {
        let notes = this.track.track.timeline.events as NoteEvent[];
        notes.forEach(note => {
            this._initialiseNote(note);
        })
    }

    protected _initialiseNote(note: NoteEvent): TrackTimelineEvent {
        // Offset initialise location to account for one note error, and the height of the header.
        let y = this.offsetContentHeight - NoteHelper.noteStringToNoteNumber(note.pitchString) * SequencerTimeline.noteHeight - UIPositioning.timelineHeaderHeight;
        let timelineEvent = new NoteTimelineEvent(this, this.track, note, y, SequencerTimeline.noteHeight);
        timelineEvent.borderHeight = 1;
        this._eventContainer.addChild(timelineEvent);
        return timelineEvent;
    }

    protected _initialiseNoteGroups() {
        this._noteGroupContainer.children.forEach(noteGroupMarker => {
            noteGroupMarker.visible = false;
            this._noteGroupPool.returnObject(noteGroupMarker as NoteGroupMarker);
        });
        this.track.noteGroups.forEach(noteGroup => {
            let marker = this._noteGroupPool.getObject();
            if (marker == null) {
                marker = new NoteGroupMarker(this);
                this._noteGroupContainer.addChild(marker);
            }
            marker.visible = true;
            marker.reinitialise(noteGroup);
        });
    }
}