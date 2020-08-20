import * as PIXI from "pixi.js";
import { UITrack } from "../UIObjects/UITrack.js";
import { UIColors } from "../Shared/UITheme.js";

/**
 * Container for a the settings of a list of tracks.
 *
 * @export
 * @class TrackList
 * @extends {PIXI.Container}
 */
export class TrackList extends PIXI.Container {

    public tracks : UITrack[];

    private _width : number;
    private _height : number;

    private _lines = new PIXI.Graphics();

    /**
     * Creates an instance of TrackList.
     * @param {number} width The width of the TrackList (pixels)
     * @param {number} viewWidth The width of the whole view - used to draw horizontal lines across the whole view (pixels)
     * @param {UITrack[]} tracks A list of UITracks representing the tracks to display.
     * @memberof TrackList
     */
    constructor(width : number,  height : number, tracks : UITrack[]) {
        super();
        this.tracks = tracks;
        this._width = width;
        this._height = height;
        
        let yPosition = 0;
        this._lines.beginFill(UIColors.fgColor);
        this._lines.drawRect(0, yPosition, width, 2);
        this.tracks.forEach(track => {
            this.addChild(new TrackSettings(track.startY, width, track));
        });
    }
}

/**
 * Represents the settings for a single track in the TrackList sidebar
 *
 * @export
 * @class TrackSettings
 * @extends {PIXI.Container}
 */
export class TrackSettings extends PIXI.Container {

    public width : number;

    constructor(startY : number, width : number, track : UITrack) {
        super();
    }
}

/**
 * Draws horizontal lines across the view to divide tracks
 *
 * @export
 * @class TrackHorizontalLines
 * @extends {PIXI.Graphics}
 */
export class TrackHorizontalLines extends PIXI.Graphics {
    /**
     * Creates an instance of TrackHorizontalLines.
     * @param {UITrack[]} tracks The list of UITracks to draw lines for
     * @param {number} viewWidth The width of the view (pixels)
     * @param {number} viewHeight The height of the view (pixels)
     * @memberof TrackHorizontalLines
     */
    constructor(tracks : UITrack[], viewWidth : number) {
        super();
        this.beginFill(UIColors.fgColor);
        tracks.forEach(track => {
            this.drawRect(0, track.startY, viewWidth, 2);
        });
        this.drawRect(0, tracks[tracks.length - 1].startY + tracks[tracks.length - 1].height, viewWidth, 2);
    }
}