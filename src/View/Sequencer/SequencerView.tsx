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

    constructor(renderer : PIXI.Renderer, track : NoteUITrack, songManager : SongManager) {
        super(renderer.width, renderer.height);
        this.endX = renderer.width;
        this.endY = renderer.height;        

        this.timeline = new SequencerTimeline(this._sidebarPosition, renderer.width, renderer.height, this.contentHeight, songManager, track);
        // Contains the background UI for the sidebar, as well as the 
        this._sidebarUI = new PIXI.Graphics().beginFill(UIColors.bgColor).drawRect(0, 0, this._sidebarPosition, renderer.height).endFill();
        this._sidebarUI.beginFill(UIColors.fgColor).drawRect(this._sidebarPosition - 4, 0, 4, renderer.height);
        this._noteList = new SequencerNotes(this._sidebarPosition, renderer.width, renderer.height, SequencerView.numNotes);
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

    constructor(width : number, screenWidth : number, screenHeight : number, numNotes : number) {
        super();

        numNotes = numNotes - 2;

        // Create and draw horizontal lines over the whole screen.
        this._horizontalLines = new PIXI.Graphics();
        this._horizontalLines.y = UIPositioning.timelineHeaderHeight;
        this._horizontalLines.beginFill(UIColors.fgColor);
        for (let i = 0; i < numNotes; i++) {
            let height = i * SequencerTimeline.noteHeight;
            this._horizontalLines.drawRect(0, height, screenWidth, 1);
            let text = new PIXI.Text(NoteHelper.noteNumberToNoteString(numNotes - 1 - i), UIFonts.trackFont);
            text.x = width / 2 - text.width/2;
            text.y = UIPositioning.timelineHeaderHeight + height + SequencerTimeline.noteHeight/2 - text.height/2;
            this.addChild(text);
        }
        this._horizontalLines.endFill();
        this.addChild(this._horizontalLines);

        this.mask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(0, UIPositioning.timelineHeaderHeight, screenWidth, screenHeight).endFill();
    }
}