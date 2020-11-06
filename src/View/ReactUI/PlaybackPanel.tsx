import * as React from "react";
import { SongManager } from "../../Model/SongManagement/SongManager";
import { FAButton } from "../SharedReact/BasicElements";

interface PlaybackPanelProps {
    songManager : SongManager,
}

interface PlaybackPanelState {
    playing : boolean,
}

export class PlaybackPanel extends React.Component<PlaybackPanelProps, PlaybackPanelState> {
    constructor(props) {
        super(props);
        this.state = {
            playing : this.props.songManager.playing,
        }
    }

    render() {
        let c = "panelButton";

        return <div className={"playbackPanel"}> 
            <PlayPauseButton className={c} playing={this.state.playing} playFunction={() => {this.props.songManager.start(); this.setState({playing: this.props.songManager.playing})}} pauseFunction={() => {this.props.songManager.stop(); this.setState({playing: this.props.songManager.playing})}} />
            <FAButton className={c} iconName={"fa fa-stop"} onClick={() => {this.props.songManager.stopToBeginning(); this.setState({playing: this.props.songManager.playing})}} />
        </div>
    }
}

interface PlayPauseButtonProps {
    className? : string,
    playing : boolean,
    playFunction : Function,
    pauseFunction : Function,
}

class PlayPauseButton extends React.Component<PlayPauseButtonProps> {
    constructor(props) {
        super(props);
    }

    render() {
        let icon = null;
        let func = null;
        if(this.props.playing) {
            icon = "fa fa-pause";
            func = this.props.pauseFunction;
        }
        else {
            icon = "fa fa-play";
            func = this.props.playFunction;
        }

        return <FAButton className={this.props.className} iconName={icon} onClick={func}/>
    }
}