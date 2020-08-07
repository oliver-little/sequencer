import * as PIXI from "pixi.js";
import { TimelineView } from "./View/Timeline/TimelineView.js";
import { SongManager } from "./Model/SongManagement/SongManager.js";
import { UITrack, NoteUITrack } from "./View/UIObjects/UITrack.js";
import { OscillatorTrack } from "./Model/Tracks/OscillatorTrack.js";

// Testing code
let songManager : SongManager = new SongManager();
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
    let newUITracks : UITrack[] = [];
    for (let i = 0; i < songManager.tracks.length; i++) {
        let newTrack = null;
        if (songManager.tracks[i] instanceof OscillatorTrack) {
            newTrack = new NoteUITrack("", 250 * i, 250, songManager.tracks[i] as OscillatorTrack, [[0, 2], [2, 4]]);
        }
        else {
            newTrack = new UITrack("", 250 * i, 250, songManager.tracks[i]);
        }
        newUITracks.push(newTrack);
    }

    let timeline = new TimelineView(app.renderer, newUITracks, songManager.metadata);
    app.view.addEventListener("wheel", event => timeline.timeline.mouseWheelHandler(event, app.renderer.view.getBoundingClientRect().left, app.renderer.view.getBoundingClientRect().top));
    app.stage.addChild(timeline);

}