import * as PIXI from "pixi.js";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { UITrack } from "../UIObjects/UITrack.js";
import { UIColors, UIPositioning } from "../Shared/UITheme.js";
import { FileInput, Slider } from "../SharedReact/BasicElements.js";
import { SoundFileTrack } from "../../Model/Tracks/SoundFileTrack.js";

/**
 * Container for a the settings of a list of tracks.
 *
 * @export
 * @class TrackList
 * @extends {PIXI.Container}
 */
export class TrackList extends PIXI.Container {

    public tracks: UITrack[];

    private _sidebarWidth : number;

    private _trackListGraphics: PIXI.Graphics;
    private _trackLineGraphics: PIXI.Graphics;

    private _overflowContainer: HTMLDivElement;
    private _trackSettingsContainer: HTMLDivElement;
    private _trackSettingsList : TrackSettingsList;

    private _verticalScroll : number = 0;

    /**
     * Creates an instance of TrackList.
     * @param {number} sidebarWidth The width of the trackList (pixels)
     * @param {number} width The screen width
     * @param {number} height The screen height
     * @param {UITrack[]} tracks A list of UITracks representing the tracks to display.
     * @memberof TrackList
     */
    constructor(sidebarWidth : number, width: number, height: number, tracks: UITrack[]) {
        super();
        this.tracks = tracks;
        this._sidebarWidth = sidebarWidth;

        this._gainChanged = this._gainChanged.bind(this);
        this._nameChanged = this._nameChanged.bind(this);
        this._soundFileChanged = this._soundFileChanged.bind(this);
        this._updateSoundFile = this._updateSoundFile.bind(this);

        // Draw lines and background colour.

        this._trackListGraphics = new PIXI.Graphics();
        this.addChild(this._trackListGraphics);

        this._trackListGraphics.beginFill(UIColors.bgColor)
            .drawRect(0, 0, sidebarWidth, height)
            .endFill();
        this._trackListGraphics.beginFill(UIColors.fgColor)
            .drawRect(sidebarWidth, 0, 3, height)
            .drawRect(0, UIPositioning.timelineHeaderHeight - 2, width, 2)
            .endFill();

        this._trackLineGraphics = new PIXI.Graphics();
        this._trackLineGraphics.beginFill(UIColors.fgColor);

        tracks.forEach(track => {
            this._trackLineGraphics.drawRect(0, track.startY + track.height, width, 2);
        });

        this._trackLineGraphics.endFill();
        // Set mask so lines disappear once they go above the header
        this._trackLineGraphics.mask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(0, UIPositioning.timelineHeaderHeight, width, height).endFill();

        this.addChild(this._trackListGraphics, this._trackLineGraphics);

        // Setup container for settings boxes
        this._trackSettingsContainer = document.createElement("div");
        Object.assign(this._trackSettingsContainer.style, {
            position: "absolute",
            top: tracks[0].startY.toString(),
            width: sidebarWidth.toString(),
            height: (height - tracks[0].startY).toString(),
            overflow: "hidden"
        });
        document.getElementById("applicationContainer").appendChild(this._trackSettingsContainer);

        this._rerenderList();
    }

    public updateVerticalScroll(value: number) {
        this._trackLineGraphics.y = value;
        this._verticalScroll = value;
        this._rerenderList();
    }

    private _nameChanged(index: number, value: string) {
        this.tracks[index].name = value;
        this._rerenderList();
    }

    private _gainChanged(index: number, value: number) {
        this.tracks[index].track.audioSource.masterGain = value;
    }

    private _soundFileChanged(index: number, files: FileList) {
        let file = files[0];
        const objecturl = URL.createObjectURL(file);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', objecturl, true);
        xhr.responseType = 'blob';
        let onloadFunc = this._updateSoundFile;
        xhr.onload = function(e) {
            if (this.status == 200) {
                onloadFunc(index, this.response);
            }
            else {
                throw new Error("Loading failed, error code:" + this.status);
            }
        };
        xhr.send();
    }

    private _updateSoundFile(index: number, blob: Blob) {
        let soundFileTrack = this.tracks[index].track as SoundFileTrack;
        soundFileTrack.setSoundFile(blob);
    }

    private _rerenderList() {
        render(<TrackSettingsList tracks={this.tracks} onNameChange={this._nameChanged} onGainChange={this._gainChanged} onSoundFileUpdate={this._soundFileChanged} width={this._sidebarWidth} verticalScroll={this._verticalScroll} />, this._trackSettingsContainer);
    }
}

interface TrackSettingsListProps {
    tracks: UITrack[],
    onNameChange: Function,
    onGainChange: Function,
    onSoundFileUpdate: Function,
    width: number,
    verticalScroll: number;
}

class TrackSettingsList extends React.Component<TrackSettingsListProps> {
    render() {
        return (<div style={{position: "absolute", top: this.props.verticalScroll}}>
            {this.props.tracks.map((track, index) => {
                return <TrackSettingsBox key={index} index={index} name={track.name} onNameChange={this.props.onNameChange} gain={track.track.audioSource.masterGain} onGainChange={this.props.onGainChange} width={this.props.width} height={track.height} soundFileChange={(track.track instanceof SoundFileTrack ? this.props.onSoundFileUpdate : undefined)} />;
            })}
        </div>);
    }
}

interface TrackSettingsProps {
    index: number,
    name: string,
    onNameChange: Function,
    gain: number,
    onGainChange: Function,
    width: number,
    height: number
    soundFileChange?: Function
}

class TrackSettingsBox extends React.Component<TrackSettingsProps> {
    constructor(props) {
        super(props);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleGainChange = this.handleGainChange.bind(this);
        this.handleSoundFileChange = this.handleSoundFileChange.bind(this);
    }

    handleNameChange(value: string) {
        this.props.onNameChange(this.props.index, value);
    }

    handleGainChange(value: string) {
        this.props.onGainChange(this.props.index, parseFloat(value));
    }

    handleSoundFileChange(files: FileList) {
        this.props.soundFileChange(this.props.index, files);
    }

    render() {

        let soundFileButton = null;

        if (this.props.soundFileChange != undefined) {
            soundFileButton = <FileInput onChange={this.handleSoundFileChange} accept="audio/*" />
        }

        return <div className="trackSettingsDiv" style={{ width: this.props.width, height: this.props.height }}>
            <input className="trackSettingsName" type="text" value={this.props.name} size={Math.max(1, this.props.name.length)} onChange={(event) => { this.handleNameChange(event.target.value) }} />
            <Slider min="0" max="1" step="0.01" onChange={this.handleGainChange} />
            {soundFileButton}
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
    constructor(tracks: UITrack[], viewWidth: number) {
        super();
        this.beginFill(UIColors.fgColor);
        this.drawRect(0, -2, viewWidth, 3);
        
        this.endFill();
    }
}