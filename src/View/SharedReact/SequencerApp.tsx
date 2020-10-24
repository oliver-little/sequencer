import * as PIXI from "pixi.js";
import * as React from "react";
import { SongManager } from "../../Model/SongManagement/SongManager";
import { OscillatorTrack } from "../../Model/Tracks/OscillatorTrack";
import { SoundFileTrack } from "../../Model/Tracks/SoundFileTrack";
import { navigationView } from "../Shared/NavigationView";
import { UIColors, UIPositioning } from "../Shared/UITheme";
import { VerticalScrollView } from "../Shared/VerticalScrollView";
import { TimelineView } from "../Timeline/TimelineView";
import { NoteUITrack, SoundFileUITrack, UITrack } from "../UIObjects/UITrack";

export class SequencerApp extends React.Component {
    render() {
        return <div className="fullScreen">
            <div className="sequencerAppTopBar">
                Header bar
            </div>
            <div className="sequencerAppMainPanel">
                <PIXITimeline className="sequencerAppMainPanelLeft" />
                <div className="sequencerAppMainPanelRight">
                    Right panel
                </div>
            </div>
        </div>
    }
}

interface PIXITimelineProps {
    className?: string
}

interface PIXITimelineState {
    pixiApp: PIXI.Application,
    songManager: SongManager
}

export class PIXITimeline extends React.Component<PIXITimelineProps, PIXITimelineState> {

    public state : PIXITimelineState;

    protected _pixiContainer : React.RefObject<HTMLDivElement>;

    constructor(props) {
        super(props);

        this.state = {
            pixiApp : null,
            songManager : null
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
        app.view.addEventListener("mousedown", function(e) {e.preventDefault();});
        app.renderer.backgroundColor = UIColors.bgColor;

        // Add to DOM
        this._pixiContainer.current.appendChild(app.view);

        window.addEventListener("resize", this._resizePIXIApp);
        const parent = app.view.parentElement;
        app.renderer.resize(parent.clientWidth, parent.clientHeight);

        // Create songManager
        let songManager : SongManager = new SongManager();


        // Create timeline and show on pixi app
        let timeline = new TimelineView(app.renderer.width, app.renderer.height, [], songManager);

        // Need to figure out a solution for passing mouseWheelEvents to current 
        app.view.addEventListener("wheel", event => navigationView.passWheelEvent(event, app.renderer.view.getBoundingClientRect().left, app.renderer.view.getBoundingClientRect().top));
    
        navigationView.setStageRenderer(app.stage, app.renderer);
        navigationView.show(timeline);
        this.setState({pixiApp: app, songManager : songManager}, this._resizePIXIApp);

    }

    componentWillUnmount() {
        window.removeEventListener("resize", this._resizePIXIApp);
        if(this.state.pixiApp != undefined) {
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