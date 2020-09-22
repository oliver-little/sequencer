import * as PIXI from "pixi.js";
import { SequencerTimeline } from "./SequencerTimeline";
import { NoteUITrack } from "../UIObjects/UITrack";
import { SongManager } from "../../Model/SongManagement/SongManager";
import { UIColors, UIFonts, UIPositioning } from "../Shared/UITheme";
import { VerticalScrollView } from "../Shared/VerticalScrollView";
import NoteHelper from "../../HelperModules/NoteHelper";

export class SequencerView extends VerticalScrollView {

    static numNotes = 99;

    public timeline : SequencerTimeline;

    private _noteList : SequencerNotes;
    private _sidebarUI : PIXI.Graphics;

    constructor(renderer : PIXI.Renderer, track : NoteUITrack, songManager : SongManager) {
        super(renderer.width, renderer.height);
        this.endX = renderer.width;
        this.endY = renderer.height;        

        this.timeline = new SequencerTimeline(this._sidebarPosition, renderer.width, renderer.height, this.contentHeight, songManager, track);
        // Contains the background UI for the sidebar, as well as the 
        this._sidebarUI = new PIXI.Graphics().beginFill(UIColors.bgColor).drawRect(0, 0, UIPositioning.timelineSidebarWidth, renderer.height).endFill();
        this._sidebarUI.beginFill(UIColors.fgColor).drawRect(UIPositioning.timelineSidebarWidth - 4, 0, 4, renderer.height);
        this._noteList = new SequencerNotes(renderer.width, renderer.height, SequencerView.numNotes);
        this.addChild(this.timeline, this._sidebarUI, this._noteList);
    }

    get contentHeight() : number {
        return SequencerTimeline.noteHeight * SequencerView.numNotes;
    }

    protected updateVerticalScroll(value : number) {
        value = Math.min(0, value);
        this.timeline.updateVerticalScroll(value);
        this._noteList.y = value;        
    }
}

class SequencerNotes extends PIXI.Container {

    private _horizontalLines : PIXI.Graphics;

    constructor(screenWidth : number, screenHeight : number, numNotes : number) {
        super();

        numNotes = numNotes - 2;

        // Create and draw horizontal lines over the whole screen.
        this._horizontalLines = new PIXI.Graphics();
        this._horizontalLines.y = UIPositioning.timelineHeaderHeight;
        this._horizontalLines.beginFill(UIColors.fgColor);
        let noteValueOffset = (UIPositioning.timelineHeaderHeight / SequencerTimeline.noteHeight) + 1;
        for (let i = 0; i < numNotes; i++) {
            let height = i * SequencerTimeline.noteHeight;
            this._horizontalLines.drawRect(0, height, screenWidth, 1);
            let text = new PIXI.Text(NoteHelper.noteNumberToNoteString(numNotes - 1 - i), UIFonts.trackFont);
            text.x = UIPositioning.timelineSidebarWidth / 2 - text.width/2;
            text.y = UIPositioning.timelineHeaderHeight + height + SequencerTimeline.noteHeight/2 - text.height/2;
            this.addChild(text);
        }
        this._horizontalLines.endFill();
        this.addChild(this._horizontalLines);

        this.mask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(0, UIPositioning.timelineHeaderHeight, screenWidth, screenHeight).endFill();
    }
}