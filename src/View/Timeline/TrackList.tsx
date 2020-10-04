import * as PIXI from "pixi.js";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { UITrack } from "../UIObjects/UITrack.js";
import { UIColors, UIPositioning } from "../Shared/UITheme.js";

/**
 * Container for a the settings of a list of tracks.
 *
 * @export
 * @class TrackList
 * @extends {PIXI.Container}
 */
export class TrackList extends PIXI.Container {

    public tracks : UITrack[];

    private _assignedWidth : number;
    private _assignedHeight : number;

    private _trackListGraphics : PIXI.Graphics;
    private _trackSettingsBoxes : HTMLDivElement;

    /**
     * Creates an instance of TrackList.
     * @param {number} width The screen width of the TrackList (pixels)
     * @param {number} height The screen height of the trackList (pixels)
     * @param {UITrack[]} tracks A list of UITracks representing the tracks to display.
     * @memberof TrackList
     */
    constructor(width : number,  height : number, tracks : UITrack[]) {
        super();
        this.tracks = tracks;
        this._assignedWidth = width;
        this._assignedHeight = Math.max(height, tracks[tracks.length - 1].startY + tracks[tracks.length - 1].height);
        
        this._trackListGraphics = new PIXI.Graphics();
        this.addChild(this._trackListGraphics);

        this._trackListGraphics.beginFill(UIColors.bgColor)
            .drawRect(0, 0, this._assignedWidth, this._assignedHeight)
            .endFill();
        this._trackListGraphics.beginFill(UIColors.fgColor)
            .drawRect(this._assignedWidth-3, 0, 3, this._assignedHeight)
            .endFill();

        this._trackSettingsBoxes = document.createElement("div");
        this._trackSettingsBoxes.style.position = "absolute";
        this._trackSettingsBoxes.style.top = this.getGlobalPosition().y.toString();
        document.getElementById("applicationContainer").appendChild(this._trackSettingsBoxes);

        this._gainChanged = this._gainChanged.bind(this);

        for(let i = 0; i < this.tracks.length; i++) {
            let track = this.tracks[i];
            let trackDiv = document.createElement("div");
            trackDiv.style.position = "absolute";
            trackDiv.style.top = (UIPositioning.timelineHeaderHeight + track.startY).toString();
            this._trackSettingsBoxes.appendChild(trackDiv);
            render(<TrackSettingsBox index ={i} name={track.name} onNameChange={() => {}} gain={track.track.audioSource.masterGain} onGainChange={this._gainChanged}/>, trackDiv);
        }
    }

    private _gainChanged(index : number, value : number) {
        console.log(this.tracks[index].track.audioSource);
        this.tracks[index].track.audioSource.masterGain = value;
        console.log(value);
    }
}

interface TrackSettingsProps {
    index : number,
    name : string,
    onNameChange : Function,
    gain : number,
    onGainChange : Function
}

class TrackSettingsBox extends React.Component<TrackSettingsProps> {
    constructor(props) {
        super(props);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleGainChange = this.handleGainChange.bind(this);
    }

    handleNameChange(value: string) {

    }

    handleGainChange(value: string) {
        this.props.onGainChange(this.props.index, parseFloat(value));
    }

    render() {
        return <div className="trackSettingsDiv">
            <p>{this.props.name}</p>
            <input type="range" min="0" max="1" step="0.01" defaultValue={this.props.gain.toString()} className="trackSettingsSlider" onChange={(event) => {this.handleGainChange(event.target.value)}}/>
        </div>
    }
}

/**
 * Draws horizontal lines across the view to divide tracks
 *
 * @export
 * @class TrackHorizontalLines
 * @extends {PIXI.Graphics}
 */
export class TrackLines extends PIXI.Graphics {
    /**
     * Creates an instance of TrackLines.
     * @param {UITrack[]} tracks The list of UITracks to draw lines for
     * @param {number} viewWidth The width of the view (pixels)
     * @param {number} viewHeight The height of the view (pixels)
     * @memberof TrackLines
     */
    constructor(tracks : UITrack[], viewWidth : number) {
        super();
        this.beginFill(UIColors.fgColor);
        this.drawRect(0, -2, viewWidth, 3);
        tracks.forEach(track => {
            this.drawRect(0, track.startY + track.height, viewWidth, 2);
        });
        this.endFill();
    }
}