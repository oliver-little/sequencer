export default class NoteHelper {
    static notes =  ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    /**
     * Converts a note string (e.g: "G4") to a frequency (Hz)
     *
     * @static
     * @param {string} value
     * @returns
     * @memberof NoteHelper
     */
    public static noteStringToFrequency(value : string) {
        let octave = NoteHelper.extractOctave(value);

        let noteNumber = NoteHelper.notes.indexOf(value.slice(0, -1)) + 3;
        noteNumber = noteNumber + ((octave - 1) * 12) + 1; 

        return 440 * Math.pow(2, (noteNumber - 49) / 12);
    }

    /**
     * Gets the distance between two note strings (semitones)
     *
     * @param {string} note1
     * @param {string} note2
     * @memberof NoteHelper
     */
    public static distanceBetweenNotes(note1 : string, note2 : string) {
        let notePosition1 = (NoteHelper.extractOctave(note1) * 12) + NoteHelper.notes.indexOf(note1.slice(0, -1));
        let notePosition2 = (NoteHelper.extractOctave(note2) * 12) + NoteHelper.notes.indexOf(note1.slice(0, -1));

        return notePosition1 - notePosition2;
    }

    private static extractOctave(note : string) : number {
        if (note.length == 2) {
            return parseInt(note.charAt(1));
        }
        else if (note.length === 3) {
            return parseInt(note.charAt(2));
        }
        else {
            throw new RangeError("String is invalid (incorrect length)");
        }
    }
}