import * as PIXI from "pixi.js";
import { UIColors } from "../UIColors.js";
import { TrackList } from "./TrackList.js";
import { NoteEvent, BaseEvent } from "../../Model/Notation/SongEvents.js";
import NoteHelper from "../../HelperModules/NoteHelper.js";
import { NoteUITrack } from "../UIObjects/UITrack.js";

export abstract class TrackTimelineEvent extends PIXI.Graphics {

    // Border around content inside the event (pixels)
    static contentBorder = 2;

    public assignedWidth : number;
    public assignedHeight : number;

    constructor(x : number, y : number, width : number, height : number) {
        super();
        this.x = x;
        this.y = y + TrackList.trackStartOffset;
        this.assignedWidth = width;
        this.assignedHeight = height;
        this.beginFill(UIColors.trackEventColor);
        this.drawRect(0, 0, width, height);
        this.endFill();
    }
}

export class NoteGroupTimelineEvent extends TrackTimelineEvent {

    private _noteRange : number;

    constructor(x : number, y : number, width : number, height : number, notes : NoteEvent[], highestNote : string, lowestNote : string) {
        super(x, y, width, height);
        this.setNotes(notes, highestNote, lowestNote);
    }

    public setNotes(notes : NoteEvent[], highestNote : string, lowestNote : string) {
        // TODO: border around all content
        // Borders around all notes, currently notes merge together
        this._noteRange = NoteHelper.distanceBetweenNotes(highestNote, lowestNote) + 1;

        let start = notes[0].startPosition;
        let end = start;
        notes.forEach(note => {
            if (note.startPosition + note.duration > end) {
                end = note.startPosition + note.duration
            }
        });
        let noteHeight = this.assignedHeight  / this._noteRange;
        let positionMap = position => {
            return (position - start)/(end - start);
        }
        this.beginFill(UIColors.trackEventHighlightColor);
        notes.forEach(note => {
            let startX = positionMap(note.startPosition) * this.assignedWidth;
            let endX = positionMap(note.startPosition + note.duration) * this.assignedWidth;
            this.drawRect(startX, 
                          NoteHelper.distanceBetweenNotes(highestNote, note.pitchString) * noteHeight, 
                          endX - startX, 
                          noteHeight);
        });
        this.endFill();
    }
}