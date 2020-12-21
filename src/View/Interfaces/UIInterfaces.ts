import { ISongSettings } from "../../Model/SongManagement/SongManager";
import { IOscillatorTrackSettings, ISoundFileTrackSettings, ITrackSettings } from "../../Model/Tracks/BaseTrack";

export interface IUITrackSettings {
    type : string,
    name : string,
    startY : number,
    height: number,
    modelTrackID : string,
}

export interface IUIOscillatorTrackSettings extends IUITrackSettings {
    type : "oscillator",
    noteGroups : Array<Array<number>>,
}

export interface IUISoundFileTrackSettings extends IUITrackSettings {
    type: "soundFile",
    displayActualWidth : boolean
}

export interface IUISongSettings extends ISongSettings {
    UITracks : Array<IUITrackSettings>
}