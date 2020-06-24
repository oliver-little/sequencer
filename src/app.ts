import { BarTimeline } from "./View/Timeline/Bar.js";
import * as PIXI from "pixi.js";

window.onload = function () {
    let app = new PIXI.Application({ width: window.innerWidth * 0.8, height: window.innerHeight * 0.8 });

    document.body.appendChild(app.view);

    app.stage.addChild(new BarTimeline(app.renderer));

}