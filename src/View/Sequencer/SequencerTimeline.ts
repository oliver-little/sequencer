import * as PIXI from "pixi.js";
import { ScrollableTimeline } from "../Shared/ScrollableTimeline.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { TimelineMode, MouseClickType, ClickState } from "../Shared/Enums.js";
import { NoteUITrack } from "../UIObjects/UITrack.js";
import { TrackTimelineEvent, NoteTimelineEvent } from "../Shared/TrackTimelineEvent.js";
import NoteHelper from "../../HelperModules/NoteHelper.js";
import { UIColors, UIPositioning } from "../Shared/UITheme.js";
import { NoteEvent } from "../../Model/Notation/SongEvents.js";

enum NoteLength {
    Bar,
    Half,
    Quarter,
    Eighth,
    Sixteenth,
    ThirtySecond
}

interface INewNoteData {
    pitch: string,
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


    constructor(startX: number, endX: number, endY: number, contentHeight: number, songManager: SongManager, track: NoteUITrack) {
        super(startX, endX, 0, endY, songManager);
        this.track = track;
        this._contentHeight = contentHeight;

        this._newEventGraphics = new PIXI.Graphics();
        this.addChild(this._newEventGraphics);

        this._regenerateTimeline(0);
    }

    get contentHeight() {
        return this._contentHeight;
    }

    // Fixes the bug where C0 will be off the screen, by offsetting the height by one note.
    get offsetContentHeight() {
        return this.contentHeight - SequencerTimeline.noteHeight
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        this._newEventGraphics.visible = false;
        super.pointerMoveHandler(event);
        if (this._mouseClickType == MouseClickType.None && this.timelineMode == TimelineMode.Edit) {
            // Get the mouse position, extract the y coordinate and offset by the header (so C8 is at the top of the rows, not the top of the view)
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

            let noteData: INewNoteData = { pitch: noteString, startPosition: startPosition, duration: length };

            // Only regenerate the new event graphics if the note is different
            if (this._newEventData != noteData) {
                // Check no events already occur at the point the new event should be added
                let events = this.track.track.timeline.getEventsBetweenTimes(startPosition, startPosition + length) as NoteEvent[];

                for (let i = 0; i < events.length; i++) {
                    if (events[i].pitchString === noteData.pitch) {
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
            }
            this._newEventGraphics.visible = true;
        }
    }

    public pointerUpClickHandler(event: PIXI.InteractionEvent) {
        super.pointerUpClickHandler(event);
        // Check that the click was a left click, and the click was on the timeline, and the timeline is in edit mode, and there is some valid event data to use to create the object.
        if (this._mouseClickType == MouseClickType.LeftClick && this._clickState == ClickState.Dragging && this.timelineMode == TimelineMode.Edit && this._newEventData != undefined) {
            let noteEvent = this.track.track.addNote(this._newEventData.startPosition, this._newEventData.pitch, this._newEventData.duration);
            this._initialiseNote(noteEvent);
            this._newEventData = undefined;
        }
    }

    public mouseWheelHandler(event: WheelEvent, canvasX: number, canvasY: number) {
        this._newEventGraphics.visible = false;
        super.mouseWheelHandler(event, canvasX, canvasY);
    }

    protected _initialiseTrackTimelineEvents() {
        let notes = this.track.track.timeline.events as NoteEvent[];
        notes.forEach(note => {
            this._initialiseNote(note);
        })
    }

    protected _initialiseNote(note : NoteEvent) : TrackTimelineEvent {
        let [x, width] = this._getTimelineEventXWidth(note.startPosition, note.startPosition + note.duration);
        let y = this.offsetContentHeight - NoteHelper.noteStringToNoteNumber(note.pitchString) * SequencerTimeline.noteHeight;
        let timelineEvent = new NoteTimelineEvent(this, x, width, y, SequencerTimeline.noteHeight, this.track, note);
        timelineEvent.borderHeight = 1;
        this._eventContainer.addChild(timelineEvent);
        return timelineEvent;
    }
}