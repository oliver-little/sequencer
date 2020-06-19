import {SongManager} from "../build/Model/SongManagement/SongManager.js";
import {ISoundFileSettings} from "../build/Model/Interfaces/IInstrumentSettings"
import { ISongSettings } from "./Model/SongManagement/SongManager.js";

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

songManager.addSoundFileTrack().then(result =>{
    let soundFileTrack = result;
    soundFileTrack.addOneShot(0);
    const input = document.getElementById("soundFile");
    input.addEventListener("change", handleFiles, false);
    function handleFiles() {
        const objecturl = URL.createObjectURL(this.files[0]);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', objecturl, true);
        xhr.responseType = 'blob';
        xhr.onload = function(e) {
            if (this.status == 200) {
                soundFileTrack.setSoundFile(this.response).then(() => {console.log("done");});
            }
        };
        xhr.send();
    }

});

let btn = document.getElementById("startButton");
let restartBtn = document.getElementById("restartButton");
let saveBtn = document.getElementById("saveButton");

btn.onclick = function () {
    if (!songManager.playing) {
        songManager.start();
        btn.innerHTML = "Stop";
    }
    else {
        songManager.stop();
        btn.innerHTML = "Start";
    }

}

restartBtn.onclick = function () {
    songManager.stop();
    songManager.start(0);
    btn.innerHTML = "Stop";
}

/* // Saving the track
saveBtn.onclick = function () {
    var a = document.createElement("a");
    var file = new Blob([JSON.stringify(songManager.serialise())], {type: "text/plain"});
    a.href = URL.createObjectURL(file);
    a.download = "song.sqn";
    a.click();
}*/

// Saving to wav
saveBtn.onclick = async function() {
    songManager.saveToWAV().then(result => {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(result);
        a.download = "song.wav";
        a.click();
    });
}

/*loadBtn.addEventListener("change", handleLoadSong, false);

function handleLoadSong() {
    const objecturl = URL.createObjectURL(this.files[0]);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', objecturl, true);
        xhr.responseType = 'text';
        xhr.onload = function(e) {
            if (this.status == 200) {
                songManager.deserialise(JSON.parse(this.response) as ISongSettings).then(() => {console.log("done");});
            }
        };
        xhr.send();
}*/