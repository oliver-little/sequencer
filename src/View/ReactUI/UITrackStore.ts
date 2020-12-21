import * as Redux from "redux";
import { UIPositioning } from "../Settings/UITheme";
import { UITrack } from "../Shared/UITrack";

const ADD_TRACK = "ADD_TRACK";
const REMOVE_TRACK = "REMOVE_TRACK";
const SET_TRACKS = "SET_TRACKS";
const EDIT_ATTRIBUTE = "EDIT_ATTRIBUTE";

export interface AddTrackAction {
    type: typeof ADD_TRACK
    track: UITrack
}

export interface RemoveTrackAction {
    type: typeof REMOVE_TRACK
    index: number
}

export interface SetTrackAction {
    type: typeof SET_TRACKS
    tracks: UITrack[]
}

export interface EditAttributeAction {
    type: typeof EDIT_ATTRIBUTE
    index : number
    attributeName : "name" | "startY" | "height" 
    attributeValue : any
}

export type UITrackActions = AddTrackAction | RemoveTrackAction | SetTrackAction | EditAttributeAction

interface UITrackState {
    tracks: UITrack[]
}

const initialState: UITrackState = {
    tracks: []
}

function UITrackReducer(state: UITrackState = initialState, action: UITrackActions): UITrackState {
    switch (action.type) {
        case ADD_TRACK:
            return {
                tracks: [...state.tracks, action.track]
            };
        case REMOVE_TRACK:
            let newTracks = state.tracks.filter((t, index) => index != action.index);
            if (newTracks.length > 0) {
                newTracks[0].startY = UIPositioning.timelineHeaderHeight;
                for (let i = 1; i < newTracks.length; i++) {
                    newTracks[i].startY = newTracks[i - 1].startY + newTracks[i - 1].height;
                }
            }
            return { tracks: newTracks };
        case SET_TRACKS:
            return { tracks: action.tracks };
        default:
            return state;
    }
}

export const UITrackStore = Redux.createStore(UITrackReducer);