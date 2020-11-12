import { SimpleEvent } from "../../HelperModules/SimpleEvent";
import { EventSnapType, NoteLength } from "./Enums";

export class EditType {
    public snapType : EventSnapType;
    public noteLength : NoteLength;
    public noteLengthDisabledChange : SimpleEvent;

    private _noteLengthDisabled : boolean;

    constructor() {
        this.snapType = EventSnapType.Beat;
        this.noteLength = NoteLength.Quarter;
        this._noteLengthDisabled = true;
        this.noteLengthDisabledChange = new SimpleEvent();
    }

    get noteLengthDisabled() {
        return this._noteLengthDisabled;
    }

    set noteLengthDisabled(value : boolean) {
        this._noteLengthDisabled = value;
        this.noteLengthDisabledChange.emit(value);
    }
}

export const editType = new EditType();