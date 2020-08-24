import * as PIXI from "pixi.js";
import { ScrollableTimeline } from "../Shared/ScrollableTimeline.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { ScrollableBar } from "../Shared/ScrollableBar.js";

export class SequencerTimeline extends ScrollableTimeline {

    static noteHeight = 20;

    protected _barContainer : PIXI.Container;
    protected _headerContainer : PIXI.Container;

    protected _songManager : SongManager;

    // Scrolling variables
    protected _startVerticalScrollPosition: number;

    constructor(startX : number, endX : number, endY : number, songManager: SongManager) {
        super(startX, endX, 0, endY);
        this._songManager = songManager;

        this._barContainer = new PIXI.Container();
        this._headerContainer = new PIXI.Container();
        this.addChild(this._barContainer, this._headerContainer);

        this._regenerateTimeline(0);
    }

    get metadata() {
        return this._songManager.metadata;
    }

    protected _initialiseScrollableBar(xPosition: number, barNumber: number, leftSide : boolean) {
        let bar : ScrollableBar = null;
        if (this._barPool.objectCount > 0) {
            bar = this._barPool.getObject();
            bar.setVisible(true);
        }
        else {
            bar = new ScrollableBar(this._headerContainer);
            this._barContainer.addChild(bar);
        }
        // Initialise bar
        let quarterNotePosition = this.metadata.positionBarsToQuarterNote(barNumber);
        let numberOfBeats = this.metadata.getTimeSignature(quarterNotePosition)[0];
        bar.initialise(xPosition, this.endY, barNumber, numberOfBeats, this.beatWidth, leftSide);
        return bar;
    }
}