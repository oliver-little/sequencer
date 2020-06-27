import * as PIXI from "pixi.js";
import { TimelineView } from "./View/Timeline/TimelineView.js";

window.onload = function () {
    let app = new PIXI.Application({ width: window.innerWidth * 0.8, height: window.innerHeight * 0.8 });

    document.body.appendChild(app.view);

    app.renderer.backgroundColor = 0x303030;
    app.stage.addChild(new TimelineView(app.renderer));

}