import * as PIXI from "pixi.js";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { SequencerTimeline } from "./SequencerTimeline";
import { NoteUITrack } from "../UIObjects/UITrack";
import { SongManager } from "../../Model/SongManagement/SongManager";
import { UIColors, UIFonts, UIPositioning } from "../Shared/UITheme";
import { VerticalScrollView } from "../Shared/VerticalScrollView";
import NoteHelper from "../../HelperModules/NoteHelper";
import { FAButton } from "../SharedReact/BasicElements";
import { navigationView } from "../Shared/NavigationView";

export class SequencerView extends VerticalScrollView {

    static numNotes = 99;

    public timeline : SequencerTimeline;

    private _noteList : SequencerNotes;
    private _sidebarUI : PIXI.Graphics;

    private _backButtonContainer: HTMLDivElement;

    constructor(width: number, height: number, track : NoteUITrack, songManager : SongManager) {
        super(width, height);      

        this.timeline = new SequencerTimeline(this._sidebarPosition, width, height, this.contentHeight, songManager, track);
        // Contains the background UI for the sidebar, as well as the 
        this._sidebarUI = new PIXI.Graphics().beginFill(UIColors.bgColor).drawRect(0, 0, this._sidebarPosition, height).endFill();
        this._sidebarUI.beginFill(UIColors.fgColor).drawRect(this._sidebarPosition - 4, 0, 4, height).endFill();
        this._noteList = new SequencerNotes(this._sidebarPosition, width, height, SequencerView.numNotes);
        this.addChild(this.timeline, this._sidebarUI, this._noteList);

        this._backButtonContainer = document.createElement("div");
        Object.assign(this._backButtonContainer.style, {
            position: "absolute",
            top: "5px",
            left: "5px"
        });
        document.getElementById("applicationContainer").appendChild(this._backButtonContainer);
        render(<FAButton iconName="fa fa-arrow-left" onClick={() => {navigationView.back()}}/>, this._backButtonContainer);
    }

    get contentHeight() : number {
        return SequencerTimeline.noteHeight * SequencerView.numNotes;
    }

    public resize(width: number, height: number) {
        super.resize(width, height);
        this._sidebarUI.clear();
        this._sidebarUI.beginFill(UIColors.bgColor).drawRect(0, 0, this._sidebarPosition, height).endFill()
        this._sidebarUI.beginFill(UIColors.fgColor).drawRect(this._sidebarPosition - 4, 0, 4, height).endFill();
        this._noteList.resize(width, height);
    }

    public destroy() {
        unmountComponentAtNode(this._backButtonContainer);
        document.getElementById("applicationContainer").removeChild(this._backButtonContainer);
        super.destroy();
    }

    protected updateVerticalScroll(value : number) {
        value = Math.min(0, value);
        this.timeline.updateVerticalScroll(value);
        this._noteList.y = value;        
    }

}

class SequencerNotes extends PIXI.Container {

    private _horizontalLines : PIXI.Graphics;
    private _numNotes : number;

    constructor(width : number, screenWidth : number, screenHeight : number, numNotes : number) {
        super();

        // Fixes drawing C0 to C8
        this._numNotes = numNotes - 2;

        // Create and draw horizontal lines over the whole screen.
        this._horizontalLines = new PIXI.Graphics();
        this._horizontalLines.y = UIPositioning.timelineHeaderHeight;
        for (let i = 0; i < this._numNotes; i++) {
            let height = i * SequencerTimeline.noteHeight;
            let text = new PIXI.Text(NoteHelper.noteNumberToNoteString(this._numNotes - 1 - i), UIFonts.trackFont);
            text.x = width / 2 - text.width/2;
            text.y = UIPositioning.timelineHeaderHeight + height + SequencerTimeline.noteHeight/2 - text.height/2;
            this.addChild(text);
        }
        this.addChild(this._horizontalLines);

        this.resize(screenWidth, screenHeight);
    }

    public resize(width: number, height: number) {
        this._horizontalLines.beginFill(UIColors.fgColor);
        for (let i = 0; i < this._numNotes; i++) {
            let currentHeight = i * SequencerTimeline.noteHeight;
            this._horizontalLines.drawRect(0, currentHeight, width, 1);
        }
        this._horizontalLines.endFill();

        this.mask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(0, UIPositioning.timelineHeaderHeight, width, height).endFill();
    }
}