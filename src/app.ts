import * as PIXI from "pixi.js";
import { TimelineView } from "./View/Timeline/TimelineView.js";

import {SongManager} from "../build/Model/SongManagement/SongManager.js";
import {ISoundFileSettings} from "../build/Model/Interfaces/IInstrumentSettings.js";
import { ISongSettings } from "../src/Model/SongManagement/SongManager.js";

// Testing code
let songManager = new SongManager();
let oscillatorTrack = songManager.addOscillatorTrack();
oscillatorTrack.addNote(0, "E5", "2n");
oscillatorTrack.addNote(0, "C5", "2n");
oscillatorTrack.addNote(0, "G5", "2n");
oscillatorTrack.addNote(2, "E5", "2n");
oscillatorTrack.addNote(2, "C6", "2n");
oscillatorTrack.addNote(2, "G5", "2n");
oscillatorTrack.addNote(3, "G6", "32n");

songManager.metadata.addMetadataEvent(0, 180, [4,4]);

window.onload = function () {
    let app = new PIXI.Application({ width: window.innerWidth * 0.8, height: window.innerHeight * 0.8 });

    document.body.appendChild(app.view);

    app.renderer.backgroundColor = 0x303030;
    let timeline = new TimelineView(app.renderer, songManager.metadata);
    app.view.addEventListener("wheel", event => timeline.timeline.mouseWheelHandler(event));
    app.stage.addChild(timeline);

}