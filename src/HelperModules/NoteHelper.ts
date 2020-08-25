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
        let notePosition1 = NoteHelper.noteStringToNoteNumber(note1);
        let notePosition2 = NoteHelper.noteStringToNoteNumber(note2);
        return notePosition1 - notePosition2;
    }

    /**
     * Converts a note number (> 0) to its corresponding note string (0 = C0, 96 = C8)
     *
     * @public
     * @param {number} value The note's value (> 0)
     * @returns {string} The note in pitch-octave notation
     * @memberof NoteHelper
     */
    public static noteNumberToNoteString(value : number) : string {
        if (value < 0) {
            throw new RangeError("Note value cannot be less than 0");
        }

        let note = NoteHelper.notes[value % 12]
        let octave = Math.floor(value/12);
        return note + octave.toString();
    }

    public static noteStringToNoteNumber(value : string) : number {
        return (NoteHelper.extractOctave(value) * 12) + NoteHelper.notes.indexOf(value.slice(0, -1));
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