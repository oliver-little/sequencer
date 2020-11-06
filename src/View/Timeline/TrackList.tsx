import * as PIXI from "pixi.js";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { SoundFileUITrack, UITrack } from "../UIObjects/UITrack.js";
import { UIColors, UIPositioning } from "../Shared/UITheme.js";
import { FileInput, IconFileInput, LabelledCheckbox, Slider } from "../SharedReact/BasicElements.js";
import { SoundFileTrack } from "../../Model/Tracks/SoundFileTrack.js";
import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";

/**
 * Container for a the settings of a list of tracks.
 *
 * @export
 * @class TrackList
 * @extends {PIXI.Container}
 */
export class TrackList extends PIXI.Container {

    public tracks: UITrack[];

    public endX: number;
    public endY: number;

    public trackRemoved: SimpleEvent;
    public trackEdited: SimpleEvent;

    private _sidebarWidth: number;

    private _trackListGraphics: PIXI.Graphics;
    private _trackLineGraphics: PIXI.Graphics;

    private _trackSettingsContainer: HTMLDivElement;

    private _verticalScroll: number = 0;

    /**
     * Creates an instance of TrackList.
     * @param {number} sidebarWidth The width of the trackList (pixels)
     * @param {number} width The screen width
     * @param {number} height The screen height
     * @param {UITrack[]} tracks A list of UITracks representing the tracks to display.
     * @memberof TrackList
     */
    constructor(sidebarWidth: number, width: number, height: number, tracks: UITrack[]) {
        super();
        this.tracks = tracks;
        this._sidebarWidth = sidebarWidth;
        this.trackRemoved = new SimpleEvent();
        this.trackEdited = new SimpleEvent();

        this._gainChanged = this._gainChanged.bind(this);
        this._nameChanged = this._nameChanged.bind(this);
        this._soundFileChanged = this._soundFileChanged.bind(this);
        this._allowOverlapChanged = this._allowOverlapChanged.bind(this);
        this._displayActualWidthChanged = this._displayActualWidthChanged.bind(this);
        this._updateSoundFile = this._updateSoundFile.bind(this);
        this._deleteTrack = this._deleteTrack.bind(this);

        // Draw lines and background colour.

        this._trackListGraphics = new PIXI.Graphics();
        this._trackLineGraphics = new PIXI.Graphics();


        this.addChild(this._trackListGraphics, this._trackLineGraphics);

        // Setup container for settings boxes
        this._trackSettingsContainer = document.createElement("div");
        document.getElementById("applicationContainer").appendChild(this._trackSettingsContainer);

        this.resize(width, height);
    }

    public resize(width: number, height: number) {
        this.endX = width;
        this.endY = height;
        this._trackListGraphics.clear().beginFill(UIColors.bgColor)
            .drawRect(0, 0, this._sidebarWidth, this.endY)
            .endFill();
        this._trackListGraphics.beginFill(UIColors.fgColor)
            .drawRect(this._sidebarWidth - 2, 0, 3, this.endY)
            .drawRect(0, UIPositioning.timelineHeaderHeight - 2, this.endX, 2)
            .endFill();

        this.drawTracks();
    }

    public updateVerticalScroll(value: number) {
        this._trackLineGraphics.y = value;
        this._verticalScroll = value;
        this._rerenderList();
    }

    public destroy() {
        unmountComponentAtNode(this._trackSettingsContainer);
        super.destroy({ children: true });
    }

    public addedHandler() {
        this._trackSettingsContainer.style.removeProperty("display");
    }

    public removedHandler() {
        this._trackSettingsContainer.style.display = "none";
    }

    public drawTracks() {
        this._trackLineGraphics.clear();
        if (this.tracks.length > 0) {
            this._trackLineGraphics.beginFill(UIColors.fgColor);
            this.tracks.forEach(track => {
                this._trackLineGraphics.drawRect(0, track.startY + track.height, this.endX, 2);
            });

            this._trackLineGraphics.endFill();
            // Set mask so lines disappear once they go above the header
            this._trackLineGraphics.mask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(0, UIPositioning.timelineHeaderHeight, this.endX, this.endY).endFill();

            Object.assign(this._trackSettingsContainer.style, {
                position: "absolute",
                top: this.tracks[0].startY.toString(),
                width: this._sidebarWidth.toString(),
                height: (this.endY - this.tracks[0].startY).toString(),
                overflow: "hidden"
            });

            this._rerenderList();
        }
        else {
            unmountComponentAtNode(this._trackSettingsContainer);
        }
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
        xhr.onload = function (e) {
            if (this.status == 200) {
                onloadFunc(index, this.response);
            }
            else {
                throw new Error("Loading failed, error code:" + this.status);
            }
        };
        xhr.send();
    }

    private async _updateSoundFile(index: number, blob: Blob) {
        let soundFileTrack = this.tracks[index].track as SoundFileTrack;
        await soundFileTrack.setSoundFile(blob);
        this.trackEdited.emit(index);
    }

    private _allowOverlapChanged(index: number, value: boolean) {
        let soundFileTrack = this.tracks[index].track as SoundFileTrack;
        soundFileTrack.allowOverlaps = value;
        this.trackEdited.emit(index);
        this._rerenderList();
    }

    private _displayActualWidthChanged(index: number, value: boolean) {
        let soundFileTrack = this.tracks[index] as SoundFileUITrack;
        soundFileTrack.displayActualWidth = value;
        this._rerenderList();
    }

    private _deleteTrack(index: number) {
        let removedTrack = this.tracks[index];
        this.tracks.splice(index, 1);
        if (this.tracks.length > 0) {
            this.tracks[0].startY = UIPositioning.timelineHeaderHeight;
            for (let i = 1; i < this.tracks.length; i++) {
                this.tracks[i].startY = this.tracks[i - 1].startY + this.tracks[i - 1].height;
            }
        }
        this.drawTracks();
        this.trackRemoved.emit();
        removedTrack.destroy();
    }

    private _rerenderList() {
        render(<TrackSettingsList tracks={this.tracks}
            onNameChange={this._nameChanged}
            onGainChange={this._gainChanged}
            onSoundFileUpdate={this._soundFileChanged}
            onAllowOverlapChange={this._allowOverlapChanged}
            onDisplayActualWidthChange={this._displayActualWidthChanged}
            onDeleteTrack={this._deleteTrack}
            width={this._sidebarWidth}
            verticalScroll={this._verticalScroll} />, this._trackSettingsContainer);
    }
}

interface TrackSettingsListProps {
    tracks: UITrack[],
    onNameChange: Function,
    onGainChange: Function,
    onSoundFileUpdate: Function,
    onDisplayActualWidthChange: Function,
    onAllowOverlapChange: Function,
    onDeleteTrack: Function,
    width: number,
    verticalScroll: number;
}

class TrackSettingsList extends React.Component<TrackSettingsListProps> {
    render() {
        return (<div style={{ position: "absolute", top: this.props.verticalScroll }}>
            {this.props.tracks.map((track, index) => {
                let soundFileProps = undefined;
                if (track instanceof SoundFileUITrack) {
                    soundFileProps = {
                        soundFileChange: this.props.onSoundFileUpdate,
                        displayActualWidth: track.displayActualWidth,
                        displayActualWidthChange: this.props.onDisplayActualWidthChange,
                        allowOverlap: track.track.allowOverlaps,
                        allowOverlapChange: this.props.onAllowOverlapChange,
                    }
                }

                return <TrackSettingsBox key={index} index={index}
                    name={track.name} onNameChange={this.props.onNameChange}
                    gain={track.track.audioSource.masterGain} onGainChange={this.props.onGainChange}
                    deleteTrack={this.props.onDeleteTrack}
                    width={this.props.width} height={track.height}
                    soundFileProps={soundFileProps} />;
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
    deleteTrack: Function
    width: number,
    height: number
    soundFileProps?: TrackSettingsSoundFileProps
}

interface TrackSettingsSoundFileProps {
    soundFileChange: Function
    displayActualWidth: boolean,
    displayActualWidthChange?: Function,
    allowOverlap: boolean,
    allowOverlapChange?: Function
}

class TrackSettingsBox extends React.Component<TrackSettingsProps> {
    constructor(props) {
        super(props);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleGainChange = this.handleGainChange.bind(this);
    }

    handleNameChange(value: string) {
        this.props.onNameChange(this.props.index, value);
    }

    handleGainChange(value: string) {
        this.props.onGainChange(this.props.index, parseFloat(value));
    }


    render() {

        let soundFileInfo = null;

        if (this.props.soundFileProps != undefined) {
            soundFileInfo = <>
                <IconFileInput className={"trackSettingsIconInput"} iconName={"fa fa-music"} onChange={(files: FileList) => { this.props.soundFileProps.soundFileChange(this.props.index, files) }} accept="audio/*" />
                <LabelledCheckbox className={"trackSettingsCheckbox"} label={"Display Actual Width"} state={this.props.soundFileProps.displayActualWidth} onChange={(value) => { this.props.soundFileProps.displayActualWidthChange(this.props.index, value) }} />
                <LabelledCheckbox className={"trackSettingsCheckbox"} label={"Allow Overlaps"} state={this.props.soundFileProps.allowOverlap} onChange={(value) => { this.props.soundFileProps.allowOverlapChange(this.props.index, value) }} />
            </>
        }

        return <div style={{ position: "relative" }}>
            <button className="trackSettingsDeleteButton" onClick={() => { this.props.deleteTrack(this.props.index) }}>X</button>
            <div className="trackSettingsDiv" style={{ width: this.props.width, height: this.props.height }}>
                <input className="trackSettingsName" type="text" value={this.props.name} size={Math.max(1, this.props.name.length)} onChange={(event) => { this.handleNameChange(event.target.value) }} />
                <Slider className={"trackSettingsSlider"} min="0" max="1" step="0.01" onChange={this.handleGainChange} />
                {soundFileInfo}
            </div>
        </div>
    }
}