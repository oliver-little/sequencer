import * as PIXI from "pixi.js";
import { TimelineView } from "./View/Timeline/TimelineView.js";
import { SongManager } from "./Model/SongManagement/SongManager.js";
import { UITrack, NoteUITrack, SoundFileUITrack } from "./View/UIObjects/UITrack.js";
import { OscillatorTrack } from "./Model/Tracks/OscillatorTrack.js";
import { SoundFileTrack } from "./Model/Tracks/SoundFileTrack.js";
import { SequencerView } from "./View/Sequencer/SequencerView.js";

/*const input = document.getElementById("soundFile");
    input.addEventListener("change", handleFiles, false);
    function handleFiles() {
        const objecturl = URL.createObjectURL(this.files[0]);
        console.log(this.files[0]);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', objecturl, true);
        xhr.responseType = 'blob';
        xhr.onload = function(e) {
            if (this.status == 200) {
                let blob = this.response;
                var reader = new FileReader();
                reader.readAsDataURL(blob); 
                reader.onloadend = function() {
                    var base64data = reader.result;                
                    console.log(base64data);
                }
            }
        };
        xhr.send();
    }*/

// Fix for blurry fonts
PIXI.settings.ROUND_PIXELS = true;

let base64data = "data:audio/mpeg;base64,SUQzAwAAAAAAH1RYWFgAAAAVAAAAU29mdHdhcmUATGF2ZjUyLjY0LjL/+5BkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYaW5nAAAADwAAAAIAAAe/AKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqr//////////////////////////////////////////////////////////////////wAAAFBMQU1FMy4xMDAEuQAAAAAAAAAANSAkA8BNAAHgAAAHv0EeXv0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/++BkAAADXwDg7QQACmnAGn2ggAFipetbufwGghkdqT828FAMlJx2y2227gUjh4eAAAAAAY/MPDwAAAAADDw8PDwAAAAADDw8PHgDgAAAw8PDw8AAAAARh4f+YAAAAABh4eHh4AAAAAjDw8PHgAAAOzDw8PDwAAAAADDw8PHgAAAACMPDw8eAAAAIzDw8f7ALbljsktttvGHr8AA8PDw8MEYAAAHvDw8MAAAAEB4eHh4YAAAAIf0PDwwAAOAAeHh4eGAAAAAAeHh4eGAAAAAAeHh4eGAAAACA8PDw9IAADvDw//SAAj/Dw8PDwwAAAAxOHh4ekAAAAEB4AgaFTZeF5mLyVhrDIBgEYGiBQBUxgRMoMLrCSjBIRkEwRwAwMBGAIRGADGAPgK5gD4DYYCAANGAsAAACABi4wAAKmfBACoYAgADMhRVMIBICKEtYjEmdF7UcHLUOWchMh6ZjMtIIrxR5aENAYg9bpzT/S6rGXKelmqqKrWTtYaB9PLa0qtbpWYSKVSNpMMwtz6kCWIbs3Ka/ul5GpI+0lp5b2Lw/lZsU8/qXZ50tTmV2tTSnG92SU1LK9YRivT38Me41sfq5fNY47q5ZX7tWxlcyw33PD9Z9/lXLKtjjVyyrY41csuVbNbLK7jytrLHHn//91//////Wxxq5ZVscauWVb/////////+tWtVceVq1qrd5cAAAAAwAwEwKFdk72WYAAADAhm5m6AW7OoeTLhuVYtP2X6aFjjzOxS4tSCpFFbOfm/lcK/fF8e6JbjgE8EKU3rr7ZMbzCQ2SVD5PnX+HNcSbhuLYncZfJq2c1+NqpbizSYbqeDJAu3b1r4/1/8/OtfMgqVFQD/9w8TvI//9V06+Kf////1vuAHQHU4QXYlYlztT0FgzGIM4yoxYEjAwTGAQbPtBt8YmehkZ1KYCDTMTPAZMbHcyeRzHITMKBMwYBzQAdMHhg3igzhhmSKxh0hoQxsiR1Xpr1aDzMUVV8l9S9JpQ5wFhpEBnASxXiVMy5nyaSOTdTZpTNmQErNUcMsUeFUrLYCXcqqnS3ZaSlwQMMqLMOHDA5kBBhAUPTL+y2s/0dfV+Yk+z9A4gZkiYsWEDzKDDECAwRA0y5MhuP9P1atmtWtVTDgSyaOZhABaRJABBy26a92M0mEqm+0tBVs1q1qrVs1jFBDBAC9BiQpgQKFZhgQCAIUGFAlk8cpnL5rH4jWyrWqtWzWrWqtWyjmYQAWYSQAQctOmuAgBaRNQDAy26a5ZguRWxxq5ZU2OMpyylVXGtWtVatmtWtVatmtWtWI3T25ZSWJfT26Sksf/////////1csqbHGlyypscaX/////////+rVs1q1qrVs1q1rihjBZhIgBABgEQjFouGYwBu2Bb/+6Bkv4ALYYjU/nNAMF/DKo/MjBJAAAGkHAAAIAAANIOAAAQBgMIfajRhVO/12zVp7dLS89EjeTu1X90RFjN/i3MQkUkd/gY8AKguX/6MeAK4+d//mPAEY/Gw3G3//gCMeAIz+/bv///+YBmHgCMeAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqo=";

// Testing code
let songManager : SongManager = new SongManager();
let oscillatorTrack = songManager.addOscillatorTrack();
oscillatorTrack.addNote(0, "E5", "2n");
oscillatorTrack.addNote(0, "C0", "2n");
oscillatorTrack.addNote(0, "G5", "2n");
oscillatorTrack.addNote(2, "E5", "2n");
oscillatorTrack.addNote(2, "C6", "2n");
oscillatorTrack.addNote(2, "G5", "2n");
oscillatorTrack.addNote(3, "G6", "32n");

songManager.metadata.addMetadataEvent(0, 180, [4,4]);

window.onload = async function () {
    let soundFileTrack =await songManager.addSoundFileTrack()
    soundFileTrack.addOneShot(0);
    soundFileTrack.setSoundFile(await (await fetch(base64data)).blob());
    
    let app = new PIXI.Application({ width: window.innerWidth * 0.8, height: window.innerHeight * 0.8 });

    // This prevents context menu on right click
    app.view.setAttribute("oncontextmenu", "return false;");
    // This prevents text from being selected when the mouse triple clicks the canvas
    app.view.addEventListener("mousedown", function(e) {e.preventDefault();});

    document.getElementById("applicationContainer").appendChild(app.view);

    app.renderer.backgroundColor = 0x303030;
    let newUITracks : UITrack[] = [];
    for (let i = 0; i < songManager.tracks.length; i++) {
        let modelTrack = songManager.tracks[i]
        let newTrack = null;
        if (modelTrack instanceof OscillatorTrack) {
            newTrack = new NoteUITrack("", (250 * i), 250, modelTrack as OscillatorTrack, [[0, 2], [2, 4]]);
        }
        else if (modelTrack instanceof SoundFileTrack) {
            newTrack = new SoundFileUITrack("", (250 * i), 250, modelTrack);
        }
        newUITracks.push(newTrack);
    }

    let btn = document.getElementById("startButton");
    btn.onclick = function() {
        if (!songManager.playing) {
            songManager.start();
            btn.innerHTML = "Stop";
        }
        else {
            songManager.stop();
            btn.innerHTML = "Start";
        }
    }
    let track : NoteUITrack = null;
    for(let i = 0; i < newUITracks.length; i++) {
        if (newUITracks[i] instanceof NoteUITrack) {
            track = newUITracks[i] as NoteUITrack;
        }
    }
    let timeline = new TimelineView(app.renderer, newUITracks, songManager);
    //let timeline = new SequencerView(app.renderer, track, songManager);
    app.view.addEventListener("wheel", event => timeline.timeline.mouseWheelHandler(event, app.renderer.view.getBoundingClientRect().left, app.renderer.view.getBoundingClientRect().top));
    app.stage.addChild(timeline);

}