import * as PIXI from "pixi.js";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { SoundFileUITrack, UITrack } from "../Shared/UITrack.js";
import { UIColors, UIPositioning } from "../Settings/UITheme.js";
import { BoxSelect, FileInput, IconFileInput, LabelledCheckbox, Slider } from "../SharedReact/BasicElements.js";
import { SoundFileTrack } from "../../Model/Tracks/SoundFileTrack.js";
import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { UITrackStore } from "../ReactUI/UITrackStore.js";

/**
 * Container for a the settings of a list of tracks.
 *
 * @export
 * @class TrackList
 * @extends {PIXI.Container}
 */
export class TrackList extends PIXI.Container {

    public songManager: SongManager;

    public endX: number;
    public endY: number;

    public trackEdited: SimpleEvent;

    private _sidebarWidth: number;

    private _trackListGraphics: PIXI.Graphics;
    private _trackLineGraphics: PIXI.Graphics;

    private _trackSettingsContainer: HTMLDivElement;

    private _verticalScroll: number = 0;

    private _cleanupListener: Function;

    /**
     * Creates an instance of TrackList.
     * @param {number} sidebarWidth The width of the trackList (pixels)
     * @param {number} width The screen width
     * @param {number} height The screen height
     * @param {UITrack[]} tracks A list of UITracks representing the tracks to display.
     * @memberof TrackList
     */
    constructor(sidebarWidth: number, width: number, height: number, songManager: SongManager,) {
        super();
        this.songManager = songManager;
        this._sidebarWidth = sidebarWidth;
        this.trackEdited = new SimpleEvent();

        this._gainChanged = this._gainChanged.bind(this);
        this._nameChanged = this._nameChanged.bind(this);
        this._soundFileChanged = this._soundFileChanged.bind(this);
        this._allowOverlapChanged = this._allowOverlapChanged.bind(this);
        this._displayActualWidthChanged = this._displayActualWidthChanged.bind(this);
        this._updateSoundFile = this._updateSoundFile.bind(this);
        this._deleteTrack = this._deleteTrack.bind(this);
        this._connectionChanged = this._connectionChanged.bind(this);
        this.drawTracks = this.drawTracks.bind(this);

        // Draw lines and background colour.

        this._trackListGraphics = new PIXI.Graphics();
        this._trackLineGraphics = new PIXI.Graphics();


        this.addChild(this._trackListGraphics, this._trackLineGraphics);

        // Setup container for settings boxes
        this._trackSettingsContainer = document.createElement("div");
        this._trackSettingsContainer.style.position = "absolute";
        this._trackSettingsContainer.style.width = this._sidebarWidth.toString() + "px";
        this._trackSettingsContainer.style.overflow = "hidden";
        document.getElementById("applicationContainer").appendChild(this._trackSettingsContainer);

        this.resize(width, height);
        this._cleanupListener = UITrackStore.subscribe(this.drawTracks);
    }

    public resize(width: number, height: number) {
        this.endX = width;
        this.endY = height;
        this._trackListGraphics.clear().beginFill(UIColors.bgColor)
            .drawRect(0, 0, this._sidebarWidth, this.endY)
            .endFill();
        this._trackListGraphics.beginFill(UIColors.fgColor)
            .drawRect(this._sidebarWidth - 2, 0, 3, this.endY)
            .drawRect(0, UIPositioning.timelineHeaderHeight, this._sidebarWidth, 2)
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
        this._cleanupListener();
        super.destroy({ children: true });
    }

    public addedHandler() {
        this._trackSettingsContainer.style.removeProperty("display");
    }

    public removedHandler() {
        this._trackSettingsContainer.style.display = "none";
    }

    public drawTracks() {
        let tracks = UITrackStore.getState().tracks;
        this._trackLineGraphics.clear();
        if (tracks.length > 0) {
            this._trackLineGraphics.beginFill(UIColors.fgColor);
            tracks.forEach(track => {
                this._trackLineGraphics.drawRect(0, track.startY + track.height, this.endX, 2);
            });

            this._trackLineGraphics.endFill();
            // Set mask so lines disappear once they go above the header
            this._trackLineGraphics.mask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(0, UIPositioning.timelineHeaderHeight, this.endX, this.endY).endFill();

            this._trackSettingsContainer.style.top = tracks[0].startY.toString() + "px";
            this._trackSettingsContainer.style.height = (this.endY - tracks[0].startY).toString() + "px";

            this._rerenderList();
        }
        else {
            unmountComponentAtNode(this._trackSettingsContainer);
        }
    }

    // All the below functions do not use the Redux store properly but it would require massive rewrites all of the UITrack and Track code to implement correctly
    private _nameChanged(index: number, value: string) {
        let tracks = UITrackStore.getState().tracks;
        tracks[index].name = value;
        this._rerenderList();
    }

    private _gainChanged(index: number, value: number) {
        let tracks = UITrackStore.getState().tracks;
        tracks[index].track.audioSource.masterGain = value;
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
        let tracks = UITrackStore.getState().tracks;
        let soundFileTrack = tracks[index].track as SoundFileTrack;
        await soundFileTrack.setSoundFile(blob);
        this.trackEdited.emit(index);
    }

    private _allowOverlapChanged(index: number, value: boolean) {
        let tracks = UITrackStore.getState().tracks;
        let soundFileTrack = tracks[index].track as SoundFileTrack;
        soundFileTrack.allowOverlaps = value;
        this._rerenderList();
    }

    private _displayActualWidthChanged(index: number, value: boolean) {
        let tracks = UITrackStore.getState().tracks;
        let soundFileTrack = tracks[index] as SoundFileUITrack;
        soundFileTrack.displayActualWidth = value;
        this.trackEdited.emit(index);
        this._rerenderList();
    }

    private _connectionChanged(index: number, connectionIndex: number) {
        let tracks = UITrackStore.getState().tracks;
        tracks[index].track.connectTo(tracks[index].track.possibleConnections[connectionIndex]);
        this._rerenderList();
    }

    private _deleteTrack(index: number) {
        let tracks = UITrackStore.getState().tracks;
        this.songManager.removeTrack(tracks[index].track);
        UITrackStore.dispatch({ type: "REMOVE_TRACK", index: index });
    }

    private _rerenderList() {
        let tracks = UITrackStore.getState().tracks;
        if (tracks.length > 0) {
            render(<TrackSettingsList tracks={tracks}
                possibleConnections={this.songManager.connectionManager.possibleConnectionStrings}
                onNameChange={this._nameChanged}
                onGainChange={this._gainChanged}
                onSoundFileUpdate={this._soundFileChanged}
                onAllowOverlapChange={this._allowOverlapChanged}
                onDisplayActualWidthChange={this._displayActualWidthChanged}
                onDeleteTrack={this._deleteTrack}
                onConnectionChanged={this._connectionChanged}
                width={this._sidebarWidth}
                verticalScroll={this._verticalScroll} />, this._trackSettingsContainer);
        }
    }
}

interface TrackSettingsListProps {
    tracks: UITrack[],
    possibleConnections : string[],
    onNameChange: Function,
    onGainChange: Function,
    onSoundFileUpdate: Function,
    onDisplayActualWidthChange: Function,
    onAllowOverlapChange: Function,
    onDeleteTrack: Function,
    onConnectionChanged: Function,
    width: number,
    verticalScroll: number;
}

class TrackSettingsList extends React.Component<TrackSettingsListProps> {
    render() {
        return (<div style={{ position: "absolute", top: this.props.verticalScroll.toString() + "px" }}>
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
                    {...soundFileProps}
                    connection={track.track.connection}
                    connectionOptions={this.props.possibleConnections}
                    connectionChanged={this.props.onConnectionChanged} />;
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
    deleteTrack: Function,
    width: number,
    height: number,
    connection: string,
    connectionOptions: string[]
    connectionChanged: Function,
    soundFileChange? : Function,
    displayActualWidth? : boolean,
    displayActualWidthChange?: Function,
    allowOverlap? : boolean,
    allowOverlapChange? : Function
}

interface TrackSettingsSoundFileProps {
    soundFileChange: Function
    displayActualWidth: boolean,
    displayActualWidthChange?: Function,
    allowOverlap: boolean,
    allowOverlapChange?: Function
}

class TrackSettingsBox extends React.PureComponent<TrackSettingsProps> {
    constructor(props) {
        super(props);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleGainChange = this.handleGainChange.bind(this);
        this.handleConnectionChanged = this.handleConnectionChanged.bind(this);
    }

    handleNameChange(value: string) {
        this.props.onNameChange(this.props.index, value);
    }

    handleGainChange(value: string) {
        this.props.onGainChange(this.props.index, parseFloat(value));
    }

    handleConnectionChanged(index: number) {
        this.props.connectionChanged(this.props.index, index);
    }

    render() {

        let soundFileInfo = null;

        if (this.props.soundFileChange != undefined) {
            soundFileInfo = <>
                <IconFileInput className={"trackSettingsIconInput"} iconName={"fa fa-music"} onChange={(files: FileList) => { this.props.soundFileChange(this.props.index, files) }} accept="audio/*" />
                <LabelledCheckbox className={"trackSettingsCheckbox"} label={"Display Actual Width"} state={this.props.displayActualWidth} onChange={(value) => { this.props.displayActualWidthChange(this.props.index, value) }} />
                <LabelledCheckbox className={"trackSettingsCheckbox"} label={"Allow Overlaps"} state={this.props.allowOverlap} onChange={(value) => { this.props.allowOverlapChange(this.props.index, value) }} />
            </>
        }

        return <div style={{ position: "relative" }}>
            <button className="trackSettingsDeleteButton" onClick={() => { this.props.deleteTrack(this.props.index) }}>X</button>
            <div className="trackSettingsDiv" style={{ width: this.props.width, height: this.props.height }}>
                <input className="trackSettingsName" type="text" value={this.props.name} size={Math.max(1, this.props.name.length)} onChange={(event) => { this.handleNameChange(event.target.value) }} />
                <Slider className={"trackSettingsSlider"} min="0" max="1" step="0.01" value={this.props.gain.toString()} onChange={this.handleGainChange} />
                {soundFileInfo}
                <BoxSelect mainButtonClassName={"trackSettingsBoxSelectButton"} title={this.props.connection} options={this.props.connectionOptions} selectedCallback={this.handleConnectionChanged} />
            </div>
        </div>
    }
}