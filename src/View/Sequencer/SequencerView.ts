import * as PIXI from "pixi.js";
import { SequencerTimeline } from "./SequencerTimeline";
import { NoteUITrack } from "../UIObjects/UITrack";
import { SongManager } from "../../Model/SongManagement/SongManager";
import { UIColors } from "../Shared/UITheme";
import { VerticalScrollView } from "../Shared/VerticalScrollView";
import NoteHelper from "../../HelperModules/NoteHelper";

export class SequencerView extends VerticalScrollView {
    static noteHeight = 20;

    public timeline : SequencerTimeline;

    private _horizontalLines : PIXI.Graphics;

    constructor(renderer : PIXI.Renderer, track : NoteUITrack, songManager : SongManager) {
        super(renderer.width, renderer.height);
        this.endX = renderer.width;
        this.endY = renderer.height;        

        this.timeline = new SequencerTimeline(this._sidebarPosition, renderer.width, renderer.height, this.contentHeight, songManager);

        // Create and draw horizontal lines over the whole screen.
        this._horizontalLines = new PIXI.Graphics();
        this._horizontalLines.beginFill(UIColors.fgColor);
        for (let i = 0; i < 97; i++) {
            this._horizontalLines.drawRect(0, 40 + i * SequencerView.noteHeight, renderer.width, 1);
        }
        this._horizontalLines.endFill();
        this.addChild(this._horizontalLines, this.timeline);
    }

    get contentHeight() : number {
        return SequencerView.noteHeight * 96;
    }

    protected updateVerticalScroll(value : number) {
        value = Math.min(0, value);
        this.timeline.updateVerticalScroll(value);
        this._horizontalLines.y = value;        
    }
}