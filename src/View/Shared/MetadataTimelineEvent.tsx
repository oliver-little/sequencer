import * as PIXI from "pixi.js";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { MouseTypeContainer } from "./InteractiveContainer";
import { MetadataEvent } from "../../Model/Notation/SongEvents";
import { MouseClickType } from "./Enums";
import { UIColors, UIPositioning } from "./UITheme";
import { ScrollableTimeline } from "./ScrollableTimeline";
import {MetadataEditBox} from "./MetadataEditBox";


/**
 * Represents a MetadataEvent in the timeline, with support for editing, adding and removing timeline events.
 *
 * @export
 * @class MetadataTimelineEvent
 * @extends {MouseTypeContainer}
 */
// TODO: these events should be put in
export class MetadataTimelineEvent extends MouseTypeContainer {

  public event: MetadataEvent;
  public timeline: ScrollableTimeline;

  private _graphics: PIXI.Graphics;
  private _editDiv: HTMLDivElement;

  private _showingEditBox : boolean = false;
  private _active : boolean;
  private _timelineListenerActive = false;

  constructor(timeline: ScrollableTimeline) {
    super();
    this.timeline = timeline;

    this._eventEdited = this._eventEdited.bind(this);
    this._hideEditMenu = this._hideEditMenu.bind(this);

    this._editDiv = document.createElement("div");
    this._editDiv.style.position = "absolute";
    this._editDiv.style.top = this.getGlobalPosition().y.toString();

    document.getElementById("applicationContainer").appendChild(this._editDiv);

    this._graphics = new PIXI.Graphics();
    this._graphics.beginFill(UIColors.metadataEventColor).drawRect(0, 0, 3, UIPositioning.timelineHeaderHeight).endFill();
    this.addChild(this._graphics);
  }

  get active() : boolean {
    return this._active;
  }

  set active(value : boolean) {
    this._active = value;

    if (value) {
      this.alpha = 1;
    }
    else {
      this.alpha = 0.2;
    }
  }

  public initialise(quarterNotePosition : number, active : boolean) {
    this.active = active;

    let closestEvent = this.timeline.metadata.events[this.timeline.metadata.events.binarySearch(quarterNotePosition, true)];
    if (active) {
      this.event = closestEvent;
      this.alpha = 1;
      
      if (!this._timelineListenerActive) {
        this.timeline.timelineViewChange.addListener(this._hideEditMenu);
        this._timelineListenerActive = true;
      }
    }
    else {
      this.event = new MetadataEvent(quarterNotePosition, closestEvent.bpm, closestEvent.timeSignature);
    }
  }

  public pointerOverHandler(event : PIXI.InteractionEvent) {
    super.pointerOverHandler(event);
    if (!this.active) {
      this.alpha = 0.5;
    }
  }

  public pointerOutHandler(event: PIXI.InteractionEvent) {
    super.pointerOutHandler(event);
    if (!this.active) {
      this.alpha = 0.2;
    }
  }

  public pointerUpClickHandler(event: PIXI.InteractionEvent) {
    if (this._mouseClickType == MouseClickType.LeftClick) {
      if (!this.active) {
        this.active = true;
        this.event = this.timeline.metadata.addMetadataEvent(this.event.startPosition, this.event.bpm, this.event.timeSignature);
        this.timeline.timelineViewChange.addListener(this._hideEditMenu);
        this._timelineListenerActive = true;
      }
      this._editDiv.style.left = this.getGlobalPosition().x.toString();
      // Render the edit box at the position of the MetadataTimelineEvent
      render(<MetadataEditBox numerator={this.event.timeSignature[0]} denominator={this.event.timeSignature[1]} bpm={this.event.bpm} onSubmit={this._eventEdited} />, this._editDiv);
      this._showingEditBox = true;
    }
    else if (this.active && this._mouseClickType == MouseClickType.RightClick && this.event.startPosition != 0) {
      // Delete this metadata event
      this.active = false;
      this.timeline.metadata.removeMetadataEvent(this.event.startPosition);
      this._hideEditMenu();
      this.timeline.timelineViewChange.removeListener(this._hideEditMenu);
      this._timelineListenerActive = false;

      // Setup the event for the next time the user left clicks on this object
      let closestEvent = this.timeline.metadata.events[this.timeline.metadata.events.binarySearch(this.event.startPosition, true)];
      this.event = new MetadataEvent(this.event.startPosition, closestEvent.bpm, closestEvent.timeSignature);

      // Regenerate the timeline
      this.timeline.regenerateAroundPosition(this.event.startPosition);
    }
  }

  public setVisible(value : boolean) {
    this.visible = value;

    if (value && !this._timelineListenerActive) {
      this.timeline.timelineViewChange.addListener(this._hideEditMenu);
      this._timelineListenerActive = true;
    }
    else if (!value && this._timelineListenerActive) {
      this.timeline.timelineViewChange.removeListener(this._hideEditMenu);
      this._timelineListenerActive = false;
    }
  }

  private _eventEdited(timeSigNumerator : number, timeSigDenominator : number, bpm : number) {
    this.event = this.timeline.metadata.addMetadataEvent(this.event.startPosition, bpm, [timeSigNumerator, timeSigDenominator]);
    this.timeline.regenerateAroundPosition(this.timeline.metadata.positionQuarterNoteToBars(this.event.startPosition));
    // The event was edited, so regenerate the box at the same position (no difference in the user's view) to update it's props
    render(<MetadataEditBox numerator={this.event.timeSignature[0]} denominator={this.event.timeSignature[1]} bpm={this.event.bpm} onSubmit={this._eventEdited} />, this._editDiv);
  }

  /**
   * Called when the timeline view is changed in any way to hide the metadata edit box
   * (this prevents the need to add code to move the edit box with the timeline)
   *
   * @private
   * @memberof MetadataTimelineEvent
   */
  private _hideEditMenu() {
    if (this._showingEditBox) {
      unmountComponentAtNode(this._editDiv);
      this._showingEditBox = false;
    }
  }
}