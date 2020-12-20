import * as React from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { EffectsChain } from "../../Model/Nodes/EffectsChain";
import { ConnectionManager } from "../../Model/SongManagement/ConnectionManager";
import { IEffect, IEffectBooleanProperty, IEffectListProperty, IEffectNumberProperty, IEffectNumberRange, IEffectStringProperty } from "../../Model/Interfaces/IInstrumentSettings";
import { BoxSelect, FAButton, Slider } from "../SharedReact/BasicElements";

interface EffectsChainPanelProps {
    connectionManager: ConnectionManager,
    hideShowCallback: Function
}

interface EffectsChainPanelState {
    currentChainNumber: number
    hidden: boolean,
}

export class EffectsChainPanel extends React.Component<EffectsChainPanelProps, EffectsChainPanelState> {

    private _deserialiseFunction = () => { this.forceUpdate() };

    constructor(props) {
        super(props);

        this._effectChanged = this._effectChanged.bind(this);
        this._effectRemoved = this._effectRemoved.bind(this);
        this._newEffect = this._newEffect.bind(this);
        this._moveEffect = this._moveEffect.bind(this);
        this._selectedChainChanged = this._selectedChainChanged.bind(this);
        this._deleteCurrentChain = this._deleteCurrentChain.bind(this);
        this._preGainChanged = this._preGainChanged.bind(this);
        this._postGainChanged = this._postGainChanged.bind(this);
        this._connectionChanged = this._connectionChanged.bind(this);

        this.state = {
            currentChainNumber: 0,
            hidden: false
        }
    }

    get currentChain() {
        if (this.state.currentChainNumber === 0) {
            return this.props.connectionManager.bus;
        }
        return this.props.connectionManager.chains[this.state.currentChainNumber - 1];
    }

    get chainsAndBus() {
        return [this.props.connectionManager.bus].concat(this.props.connectionManager.chains);
    }

    private _newEffect(newEffectIndex: number) {
        this.currentChain.addEffect(this.currentChain.effects.length, EffectsChain.possibleEffects.get(EffectsChainInfo.effectTitles[newEffectIndex])());
        this.setState({ currentChainNumber: this.state.currentChainNumber });
    }

    // Curried function to prevent passing down of index
    private _effectChanged(effectIndex: number, propertyIndex: number, value: any) {
        let property = this.currentChain.effects[effectIndex].properties[propertyIndex];
        property.value = value;
        this.currentChain.effectNodes[effectIndex][property.propertyName] = value;

        this.setState({ currentChainNumber: this.state.currentChainNumber });
    }

    private _effectRemoved(index: number) {
        this.currentChain.removeEffect(index);
        this.setState({ currentChainNumber: this.state.currentChainNumber });
    }

    private _moveEffect(oldIndex: number, newIndex: number) {
        this.currentChain.moveEffect(oldIndex, newIndex);
        this.setState({ currentChainNumber: this.state.currentChainNumber });
    }

    private _hidePanel() {
        this.setState({ hidden: !this.state.hidden },
            () => {
                if (this.state.hidden) {
                    this.props.hideShowCallback();
                }
                else {
                    setTimeout(() => { this.props.hideShowCallback() }, 500);
                }
            });
    }

    private _selectedChainChanged(index: number) {
        if (index > this.props.connectionManager.chains.length) {
            this.props.connectionManager.addChain();
        }
        this.setState({ currentChainNumber: index });
    }

    private _deleteCurrentChain() {
        this.props.connectionManager.removeChain(this.currentChain.chainName);
        this.setState({ currentChainNumber: 0 });
    }

    private _preGainChanged(value: number) {
        this.currentChain.preGain = value;
    }

    private _postGainChanged(value: number) {
        this.currentChain.postGain = value;
    }

    private _connectionChanged(index: number, value: string) {
        let curChain = this.currentChain;
        if (curChain !== this.props.connectionManager.bus && this.props.connectionManager.getConnections(curChain)[0] != value) {
            console.log(this.props.connectionManager.getConnections(curChain)[0]);
            this.props.connectionManager.removeAllConnections(curChain);
            this.props.connectionManager.addConnection(curChain, value);
            this.setState({ currentChainNumber: this.state.currentChainNumber });
        }
    }

    componentDidMount() {
        this.props.connectionManager.effectsDeserialised.addListener(this._deserialiseFunction);
    }

    componentWillUnmount() {
        this.props.connectionManager.effectsDeserialised.removeListener(this._deserialiseFunction);
    }

    render() {
        let options = this.chainsAndBus.map(value => { return value.chainName });
        options.push("New Chain...");

        let curChain = this.currentChain;

        return <div className={"effectsChainPanel" + (this.state.hidden ? " hidden" : "")}>
            <FAButton title={this.state.hidden ? "Show Effects" : "Hide Effects"} className="effectsChainHideShowButton" iconName={this.state.hidden ? "fa fa-caret-left" : "fa fa-caret-right"} onClick={() => { this._hidePanel() }} />
            <div className={"effectsChainContent"} >
                <div className={"effectsChainPanelTitle"}>
                    <BoxSelect mainButtonClassName={"effectsChainTitleButton"} selectButtonClassName={"effectsChainSelectButton"} selected={this.state.currentChainNumber} options={options} selectedCallback={this._selectedChainChanged} />
                    <FAButton className="effectsChainButton buttonColorAnim delete title" iconName="fa fa-close" onClick={this._deleteCurrentChain} disabled={curChain.chainName === "Bus"} />
                </div>
                <EffectsChainInfo
                    effectsChain={curChain.effects}
                    moveEffect={this._moveEffect}
                    effectPropertyChanged={this._effectChanged}
                    newEffect={this._newEffect}
                    effectRemoved={this._effectRemoved}
                    preGainValue={curChain.preGain}
                    preGainValueChanged={this._preGainChanged}
                    postGainValue={curChain.postGain}
                    postGainValueChanged={this._postGainChanged}
                    connection={this.props.connectionManager.getConnections(curChain)[0]}
                    connectionOptions={(curChain === this.props.connectionManager.bus ? ["Context"] : ["Context", "Bus"])}
                    connectionChangedCallback={this._connectionChanged}
                />
            </div>
        </div>
    }
}

interface EffectsChainInfoProps {
    effectsChain: IEffect[],
    moveEffect: Function
    effectPropertyChanged: Function,
    newEffect: Function
    effectRemoved: Function
    preGainValue: number,
    preGainValueChanged: (value : number) => void,
    postGainValue: number,
    postGainValueChanged: (value : number) => void,
    connection: string,
    connectionOptions: string[],
    connectionChangedCallback: Function
}

class EffectsChainInfo extends React.Component<EffectsChainInfoProps> {

    static effectTitles = Array.from(EffectsChain.possibleEffects.keys());

    constructor(props) {
        super(props);

        this._onDragEnd = this._onDragEnd.bind(this);
    }

    private _onDragEnd(result) {

        if (!result.destination || result.source.index == result.destination.index) {
            return;
        }

        this.props.moveEffect(result.source.index, result.destination.index);
    }

    render() {

        let effects = this.props.effectsChain.map((effect, index) => {
            return <ChainEffect key={effect.id} effectIndex={index} {...effect} onPropertyChange={this.props.effectPropertyChanged} onDelete={this.props.effectRemoved} />
        });
        return <div className={"effectsList"}>
            <div className={"effectsListDivider"} style={{ marginTop: "0px" }} />
            <div className="effectProperty range">
                <p className={"effectTitleText"}>Input Gain:</p>
                <Slider value={this.props.preGainValue} min={0} max={1} step={0.01} onRelease={true} onChange={this.props.preGainValueChanged} />
            </div>
            <div className="effectProperty range ">
                <p className={"effectTitleText"}>Output Gain:</p>
                <Slider value={this.props.postGainValue} min={0} max={1} step={0.01} onRelease={true} onChange={this.props.postGainValueChanged} />
            </div>
            <div className="effectProperty list">
                <p className={"effectTitleText"}>Output:</p>
                <BoxSelect mainButtonClassName="" title={this.props.connection} options={this.props.connectionOptions} selectedCallback={this.props.connectionChangedCallback} />
            </div>
            <div className={"effectsListDivider"} />
            <p className={"effectTitleText"}>Effects:</p>
            <DragDropContext onDragEnd={this._onDragEnd}>
                <Droppable droppableId={"effectsList"}>
                    {(provided, snapshot) => (
                        <div className={"effectsListDroppable effectsListElement" + (snapshot.isDraggingOver ? " dragging" : "")} ref={provided.innerRef} {...provided.droppableProps}>
                            {effects}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <BoxSelect mainButtonClassName={"effectsChainButton buttonColorAnim dropdownButton"} title="" options={EffectsChainInfo.effectTitles} selectedCallback={this.props.newEffect}>
                <i className={"fa fa-plus"} />
            </BoxSelect>
        </div >;
    }
}

interface ChainEffectProps extends IEffect {
    effectIndex: number
    onPropertyChange: Function
    onDelete: Function
}

class ChainEffect extends React.PureComponent<ChainEffectProps> {

    render() {
        return <Draggable draggableId={this.props.id} index={this.props.effectIndex}>
            {(provided, snapshot) => (
                <div className={"chainEffect" + (snapshot.isDragging ? " dragging" : "")} ref={provided.innerRef} {...provided.draggableProps}>
                    <div>
                        <div className={"chainEffectTitle"} {...provided.dragHandleProps}>
                            <p className={"effectTitleText"} style={{ marginRight: "5px" }}>{this.props.effectType}</p>
                            <FAButton className="effectsChainButton buttonColorAnim delete" iconName={"fa fa-close"} onClick={() => { this.props.onDelete(this.props.effectIndex) }} />
                        </div>
                    </div>
                    {this.props.properties.map((property, index) => {
                        if (property.editable) {
                            switch (property.type) {
                                case "number":
                                    if (property.hasOwnProperty("min")) {
                                        return <RangeEffectProperty key={index} effectIndex={this.props.effectIndex} propertyIndex={index} {...property as IEffectNumberRange} onChange={this.props.onPropertyChange} />;
                                    }
                                    else {
                                        return <NumberEffectProperty key={index} effectIndex={this.props.effectIndex} propertyIndex={index} {...property as IEffectNumberProperty} onChange={this.props.onPropertyChange} />;
                                    }
                                case "string":
                                    return <StringEffectProperty key={index} effectIndex={this.props.effectIndex} propertyIndex={index} {...property as IEffectStringProperty} onChange={this.props.onPropertyChange} />;
                                case "boolean":
                                    return <BooleanEffectProperty key={index} effectIndex={this.props.effectIndex} propertyIndex={index} {...property as IEffectBooleanProperty} onChange={this.props.onPropertyChange} />;
                                case "list":
                                    return <ListEffectProperty key={index} effectIndex={this.props.effectIndex} propertyIndex={index} {...property as IEffectListProperty} onChange={this.props.onPropertyChange} />;
                                default:
                                    console.log("Unknown property type: " + property.type);
                                    return null;
                            }
                        }
                    })}
                </div>)
            }
        </Draggable>
    }
}

interface RangeEffectPropertyProps extends IEffectNumberRange {
    effectIndex: number,
    propertyIndex: number,
    onChange: Function
}

interface BooleanEffectPropertyProps extends IEffectBooleanProperty {
    effectIndex: number,
    propertyIndex: number,
    onChange: Function
}

interface NumberEffectPropertyProps extends IEffectNumberProperty {
    effectIndex: number,
    propertyIndex: number,
    onChange: Function
}

interface StringEffectPropertyProps extends IEffectStringProperty {
    effectIndex: number,
    propertyIndex: number,
    onChange: Function
}

interface ListEffectPropertyProps extends IEffectListProperty {
    effectIndex: number,
    propertyIndex: number,
    onChange: Function
}

function capitalise(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

class NumberEffectProperty extends React.PureComponent<NumberEffectPropertyProps> {
    render() {
        let nameToUse = capitalise(this.props.displayName ? this.props.displayName : this.props.propertyName) + ":";

        return <div className={"effectProperty number"}>
            <p>{nameToUse}</p>
            <input type="number" name={nameToUse} value={this.props.value} step={this.props.step} onChange={(event) => { this.props.onChange(this.props.effectIndex, this.props.propertyIndex, event.target.value) }} />
        </div>
    }
}

class RangeEffectProperty extends React.PureComponent<RangeEffectPropertyProps> {
    render() {
        let nameToUse = capitalise(this.props.displayName ? this.props.displayName : this.props.propertyName) + ":";

        return <div className={"effectProperty range"}>
            <p>{nameToUse}</p>
            <Slider onRelease={true} min={this.props.min} max={this.props.max} step={this.props.step} value={this.props.value} onChange={(value) => { this.props.onChange(this.props.effectIndex, this.props.propertyIndex, value) }} />
        </div>
    }
}

class StringEffectProperty extends React.PureComponent<StringEffectPropertyProps> {
    render() {
        let nameToUse = capitalise(this.props.displayName ? this.props.displayName : this.props.propertyName) + ":";

        return <div className={"effectProperty string"}>
            <p>{nameToUse}</p>
            <input type="text" name={nameToUse} value={this.props.value} onChange={(event) => { this.props.onChange(this.props.effectIndex, this.props.propertyIndex, event.target.value) }} />
        </div>
    }
}

class BooleanEffectProperty extends React.PureComponent<BooleanEffectPropertyProps> {
    render() {
        let nameToUse = capitalise(this.props.displayName ? this.props.displayName : this.props.propertyName) + ":";

        return <div className={"effectProperty boolean"}>
            <p>{nameToUse}</p>
            <input type="checkbox" name={nameToUse} checked={this.props.value} onChange={(event) => { this.props.onChange(this.props.effectIndex, this.props.propertyIndex, event.target.checked) }} />
        </div>
    }
}

class ListEffectProperty extends React.PureComponent<ListEffectPropertyProps> {
    render() {
        let nameToUse = capitalise(this.props.displayName ? this.props.displayName : this.props.propertyName) + ":";

        return <div className={"effectProperty list"}>
            <p>{nameToUse}</p>
            <BoxSelect selected={this.props.options.indexOf(this.props.value)} options={this.props.options} selectedCallback={(newIndex) => { this.props.onChange(this.props.effectIndex, this.props.propertyIndex, this.props.options[newIndex]) }} />
        </div>
    }
}