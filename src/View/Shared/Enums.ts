// How TrackTimelineEvents should snap to bars
export enum EventSnapType {
    Beat,
    HalfBeat,
    QuarterBeat,
    EighthBeat,
    None
}

// Whether the user is able to edit the contents of the timeline or not.
export enum TimelineMode {
    Playback,
    Edit
}

// The type of mouse click the current pointer event is
export enum MouseClickType {
    LeftClick,
    RightClick,
    MiddleClick,
    None
}