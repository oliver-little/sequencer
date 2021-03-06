import * as React from "react";
import { SongManager } from "../../Model/SongManagement/SongManager";
import { editType } from "../Settings/EditType";
import { FAButton } from "../SharedReact/BasicElements";

interface PlaybackPanelProps {
    songManager: SongManager,
}

interface PlaybackPanelState {
    playing: boolean,
    markerCentred: boolean
}

export class PlaybackPanel extends React.Component<PlaybackPanelProps, PlaybackPanelState> {
    constructor(props) {
        super(props);
        this._markerCenteredChanged = this._markerCenteredChanged.bind(this);
        this._playingStateChanged = this._playingStateChanged.bind(this);

        editType.markerCenteredChanged.addListener(this._markerCenteredChanged);

        this.state = {
            playing: this.props.songManager.playing,
            markerCentred: editType.markerCentered,
        }
    }

    private _playingStateChanged(value : boolean) {
        this.setState({playing: value});
    }

    private _markerCenteredChanged(value: boolean) {
        this.setState({ markerCentred: value });
    }

    componentDidMount() {
        this.props.songManager.playingChangedEvent.addListener(this._playingStateChanged);
    }

    componentWillUnmount() {
        this.props.songManager.playingChangedEvent.removeListener(this._playingStateChanged);
    }

    render() {
        let c = "panelButton buttonAnim";

        return <div className={"playbackPanel"}>
            <div className={"playbackButtons"}>
                <PlayPauseButton className={c} playing={this.state.playing} playFunction={() => { this.props.songManager.start();}} pauseFunction={() => { this.props.songManager.stop(); }} />
                <FAButton className={c} title="Stop" iconName={"fa fa-stop"} onClick={() => { this.props.songManager.stopToBeginning(); this.setState({ playing: this.props.songManager.playing }) }} />
            </div>
            <button className={"recentreButton buttonAnim"} onClick={() => { editType.markerCentered = true }} style={{ visibility: ((!this.state.markerCentred && this.props.songManager.playing) ? "visible" : "hidden") }}>Recentre Marker</button>
        </div>
    }
}

interface PlayPauseButtonProps {
    className?: string,
    playing: boolean,
    playFunction: Function,
    pauseFunction: Function,
}

class PlayPauseButton extends React.Component<PlayPauseButtonProps> {
    constructor(props) {
        super(props);
    }

    render() {
        let icon = null;
        let func = null;
        let title = "";
        if (this.props.playing) {
            title = "Pause";
            icon = "fa fa-pause";
            func = this.props.pauseFunction;
        }
        else {
            title = "Play";
            icon = "fa fa-play";
            func = this.props.playFunction;
        }

        return <FAButton title={title} className={this.props.className} iconName={icon} onClick={func} />
    }
}