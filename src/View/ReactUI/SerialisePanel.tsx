import * as React from "react";
import { SongManager } from "../../Model/SongManagement/SongManager";
import { OscillatorTrack } from "../../Model/Tracks/OscillatorTrack";
import { SoundFileTrack } from "../../Model/Tracks/SoundFileTrack";
import { IUIOscillatorTrackSettings, IUISongSettings, IUISoundFileTrackSettings } from "../Interfaces/UIInterfaces";
import { navigationView } from "../Shared/NavigationView";
import { NoteUITrack, SoundFileUITrack } from "../Shared/UITrack";
import { FAButton } from "../SharedReact/BasicElements";
import { LoadingErrorModal, LoadingSpinnerModal } from "../SharedReact/Modal";
import { UITrackStore } from "./UITrackStore";

interface SerialisePanelProps {
    songManager: SongManager
}

export class SerialisePanel extends React.Component<SerialisePanelProps, { modalShown: boolean, modalLoading: boolean, modalText: string }> {

    private _inputRef: React.RefObject<HTMLInputElement>;

    private _modalCloseFunc = () => { this.setState({ modalShown: false }) };

    constructor(props) {
        super(props);

        this.state = {
            modalShown: false,
            modalLoading: true,
            modalText: ""
        }

        this._serialise = this._serialise.bind(this);
        this._deserialise = this._deserialise.bind(this);
        this._getFile = this._getFile.bind(this);
        this._saveToWAV = this._saveToWAV.bind(this);

        this._inputRef = React.createRef();
    }

    private _serialise() {
        this.setState({modalShown: true, modalLoading: true, modalText: "Saving to File..."});
        let tracks = UITrackStore.getState().tracks.map(t => t.serialise());

        let modelSettings = this.props.songManager.serialise()
        let songSettings = { ...modelSettings, UITracks: tracks } as IUISongSettings;
        let outputString = JSON.stringify(songSettings);

        // Download file
        let a = document.createElement("a");
        let file = new Blob([outputString], { type: "application/web-sequencer" });
        a.href = URL.createObjectURL(file);
        a.download = new Date().toLocaleDateString() + ".sqn";
        a.click();
        this.setState({modalShown: false});
    }

    private _deserialise() {
        this._inputRef.current.click();
    }

    private _getFile(event) {
        this.setState({modalShown: true, modalLoading: true, modalText: "Loading File..."});
        const file = event.target.files[0];
        if (!file) {
            this.setState({modalLoading: false, modalText: "Invalid File"});
            return;
        }
        else {
            let reader = new FileReader();
            reader.onloadend = async () => {
                let parsed = JSON.parse(reader.result as string);
                // Check parsed type
                if (!(typeof parsed === 'object' && parsed.hasOwnProperty("fileType") && parsed.fileType == "SequencerSongSettings")) {
                    console.log("Invalid file type.")
                    return;
                }

                await this.props.songManager.deserialise(parsed);

                let UITracks = [];
                for (let i = 0; i < parsed.UITracks.length; i++) {
                    let track = parsed.UITracks[i];
                    let baseTrack = this.props.songManager.tracks.find(modelTrack => modelTrack.id == track.modelTrackID);
                    if (baseTrack == undefined) {
                        console.log("UITrack with missing ID found: ", track);
                        continue;
                    }


                    switch (track.type) {
                        case "oscillator":
                            UITracks.push(new NoteUITrack(track as IUIOscillatorTrackSettings, baseTrack as OscillatorTrack));
                            break;
                        case "soundFile":
                            UITracks.push(new SoundFileUITrack((track as IUISoundFileTrackSettings), baseTrack as SoundFileTrack));
                            break;
                        default:
                            console.log("Invalid track type: ", track.type);
                            break;
                    }
                }
                UITrackStore.dispatch({ type: "SET_TRACKS", tracks: UITracks });

                // Go back to timeline screen if needed
                while (navigationView.viewDepth > 1) {
                    navigationView.back();
                }
                this.setState({modalShown: false});
            }
            reader.readAsText(file);
        }
    }

    private async _saveToWAV() {
        this.setState({ modalShown: true, modalLoading: true, modalText: "Generating WAV..." });
        let file = null;
        try {
            file = await this.props.songManager.saveToWAV();
        }
        catch {
            this.setState({modalLoading: false, modalText: "Please add events to the song before saving."});
            return;
        }
        let a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = new Date().toLocaleDateString() + ".wav";
        a.click();
        this.setState({ modalShown: false, modalText: "" });
    }

    componentDidMount() {
        this._inputRef.current.addEventListener("change", this._getFile);
    }

    componentWillUnmount() {
        this._inputRef.current.removeEventListener("change", this._getFile);
    }

    render() {
        let c = "panelButton buttonAnim"
        return <div className="serialisePanel">
            <FAButton className={c} title="Save File..." iconName="fa fa-save" onClick={this._serialise} />
            <FAButton className={c} title="Open File..." iconName="fa fa-folder-open" onClick={this._deserialise} />
            <FAButton className={c} title="Download as WAV" iconName="fa fa-music" onClick={this._saveToWAV} />
            {this.state.modalShown && <LoadingErrorModal loading={this.state.modalLoading} title={this.state.modalText} onClose={this._modalCloseFunc} />}
            <input type="file" ref={this._inputRef} accept=".sqn" style={{ position: "absolute", top: "-9999px" }} />
        </div>
    }
}