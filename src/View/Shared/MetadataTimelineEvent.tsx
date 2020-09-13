import * as PIXI from "pixi.js";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { MouseTypeContainer } from "./InteractiveContainer";
import { MetadataEvent } from "../../Model/Notation/SongEvents";
import { MouseClickType } from "./Enums";
import { UIColors } from "./UITheme";
import { ScrollableTimeline } from "./ScrollableTimeline";
import {MetadataEditBox} from "./MetadataEditBox";


export class MetadataTimelineEvent extends MouseTypeContainer {

  static diamondSize = 10;

  public event: MetadataEvent;
  public timeline: ScrollableTimeline;

  private _graphics: PIXI.Graphics;
  private _editDiv: HTMLDivElement;
  private _showingEditBox : boolean = false;

  constructor(timeline: ScrollableTimeline, event: MetadataEvent, y: number) {
    super();
    this.timeline = timeline;
    this.timeline.timelineViewChange.addListener(this._objectMoved.bind(this));
    this.event = event;

    this._eventEdited = this._eventEdited.bind(this);

    this.reinitialise(y);

    this._editDiv = document.createElement("div");
    this._editDiv.style.position = "absolute";
    this._editDiv.style.top = this.y.toString();

    document.getElementById("applicationContainer").appendChild(this._editDiv);

    this._graphics = new PIXI.Graphics();
    let diamondSize = MetadataTimelineEvent.diamondSize;
    this._graphics.beginFill(UIColors.metadataEventColor)
      .moveTo(0, 0).lineTo(diamondSize / 2, diamondSize / 2).lineTo(0, diamondSize).lineTo(-diamondSize / 2, diamondSize / 2).lineTo(0, 0)
      .endFill();
    this.addChild(this._graphics);
  }

  public reinitialise(y?: number) {
    if (y != undefined) {
      this.y = y;
    }
    this.x = this.timeline.getTimelineEventX(this.event.startPosition) + 2;
  }

  public pointerUpClickHandler(event: PIXI.InteractionEvent) {
    if (this._mouseClickType == MouseClickType.LeftClick) {
      this._editDiv.style.left = this.x.toString();
      // Render the edit box at the position of the MetadataTimelineEvent
      render(<MetadataEditBox numerator={this.event.timeSignature[0]} denominator={this.event.timeSignature[1]} bpm={this.event.bpm} onSubmit={this._eventEdited} />, this._editDiv);
      this._showingEditBox = true;
    }
  }

  private _eventEdited(timeSigNumerator : number, timeSigDenominator : number, bpm : number) {
    this.event.timeSignature = [timeSigNumerator, timeSigDenominator];
    this.event.bpm = bpm;
    this.timeline.regenerateAroundPosition(this.event.startPosition);
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
  private _objectMoved() {
    if (this._showingEditBox) {
      unmountComponentAtNode(this._editDiv);
      this._showingEditBox = false;
    }
  }
}