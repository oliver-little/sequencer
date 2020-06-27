import { BaseTrack } from "../../Model/Tracks/BaseTrack.js";

export class UITrack {

    public height : number;
    public track : BaseTrack;

    constructor(track : BaseTrack) {
        this.track = track;
    }

    
}