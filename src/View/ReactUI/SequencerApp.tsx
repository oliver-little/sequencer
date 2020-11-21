import * as PIXI from "pixi.js";
import * as React from "react";
import { SongManager } from "../../Model/SongManagement/SongManager";
import { navigationView } from "../Shared/NavigationView";
import { UIColors } from "../Settings/UITheme";
import { TimelineView } from "../Timeline/TimelineView";
import { EditPanel } from "./EditPanel";
import { PlaybackPanel } from "./PlaybackPanel";
import { EffectsChainPanel } from "./EffectsChainPanel";

// Global songManager

interface SequencerAppState {
    songManager: SongManager;
}

export class SequencerApp extends React.Component<{}, SequencerAppState> {
    constructor(props) {
        super(props);
        this.state = {
            songManager: new SongManager(),
        }
    }

    componentWillUnmount() {
        this.state.songManager.destroy();
    }

    render() {
        return <div className="fullScreen">
            <div style={{ position: "relative", width: "100%", height: "100%"}}>
                <div className="sequencerAppTopBar">
                    <PlaybackPanel songManager={this.state.songManager} />
                    <EditPanel />
                </div>
                <div className="sequencerAppMainPanel">
                    <PIXITimeline className="sequencerAppMainPanelLeft" songManager={this.state.songManager} />
                    <div className="sequencerAppMainPanelRight">
                        <EffectsChainPanel connectionManager={this.state.songManager.connectionManager} />
                    </div>
                </div>
            </div>
        </div>
    }
}

interface PIXITimelineProps {
    className?: string,
    songManager: SongManager
}

interface PIXITimelineState {
    pixiApp: PIXI.Application
}

export class PIXITimeline extends React.Component<PIXITimelineProps, PIXITimelineState> {

    public state: PIXITimelineState;

    protected _pixiContainer: React.RefObject<HTMLDivElement>;

    constructor(props) {
        super(props);

        this.state = {
            pixiApp: null,
        }

        PIXI.settings.ROUND_PIXELS = true;
        this._pixiContainer = React.createRef();

        this._resizePIXIApp = this._resizePIXIApp.bind(this);
    }

    protected _resizePIXIApp() {
        const parent = this.state.pixiApp.view.parentElement;
        this.state.pixiApp.renderer.resize(parent.clientWidth, parent.clientHeight);
        navigationView.currentElement.resize(parent.clientWidth, parent.clientHeight);
        this.state.pixiApp.render();
    }

    componentDidMount() {
        let app = new PIXI.Application();

        // Setup operations
        app.view.setAttribute("oncontextmenu", "return false;");
        app.view.addEventListener("mousedown", function (e) { e.preventDefault(); });
        app.renderer.backgroundColor = UIColors.bgColor;

        // Add to DOM
        this._pixiContainer.current.appendChild(app.view);

        window.addEventListener("resize", this._resizePIXIApp);
        const parent = app.view.parentElement;
        app.renderer.resize(parent.clientWidth, parent.clientHeight);

        // Create timeline and show on pixi app
        let timeline = new TimelineView(app.renderer.width, app.renderer.height, [], this.props.songManager);

        // Need to figure out a solution for passing mouseWheelEvents to current 
        app.view.addEventListener("wheel", event => navigationView.passWheelEvent(event, app.renderer.view.getBoundingClientRect().left, app.renderer.view.getBoundingClientRect().top));

        navigationView.setStageRenderer(app.stage, app.renderer);
        navigationView.show(timeline);
        this.setState({ pixiApp: app }, this._resizePIXIApp);

    }

    componentWillUnmount() {
        window.removeEventListener("resize", this._resizePIXIApp);
        if (this.state.pixiApp != undefined) {
            this.state.pixiApp.destroy(true);
        }
    }

    render() {
        return <div className={this.props.className}>
            <div id="applicationContainer" ref={this._pixiContainer}>
            </div>
        </div>
    }
}