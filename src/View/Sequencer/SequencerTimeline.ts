import * as PIXI from "pixi.js";
import { ScrollableTimeline } from "../Shared/ScrollableTimeline.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { ScrollableBar } from "../Shared/ScrollableBar.js";

export class SequencerTimeline extends ScrollableTimeline {

    static noteHeight = 20;
    // Scrolling variables
    protected _startVerticalScrollPosition: number;

    protected _contentHeight : number;

    constructor(startX : number, endX : number, endY : number, contentHeight : number, songManager: SongManager) {
        super(startX, endX, 0, endY, songManager);

        this._contentHeight = contentHeight;

        this._regenerateTimeline(0);
    }

    get contentHeight() {
        return this._contentHeight;
    }
}