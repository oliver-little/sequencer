import * as React from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { v4 as uuid } from "uuid";
import { EffectsChain } from "../../Model/Nodes/EffectsChain";
import { ConnectionManager } from "../../Model/SongManagement/ConnectionManager";
import { IEffect, IEffectBooleanProperty, IEffectListProperty, IEffectNumberProperty, IEffectNumberRange, IEffectProperty, IEffectStringProperty } from "../../Model/Interfaces/IInstrumentSettings";
import { BoxSelect, Dropdown, FAButton, Slider } from "../SharedReact/BasicElements";

interface EffectsChainPanelProps {
    connectionManager: ConnectionManager
}

interface EffectsChainPanelState {
    currentChainNumber: number
    hidden: boolean,
}

export class EffectsChainPanel extends React.Component<EffectsChainPanelProps, EffectsChainPanelState> {

    constructor(props) {
        super(props);

        this._effectChanged = this._effectChanged.bind(this);
        this._effectRemoved = this._effectRemoved.bind(this);
        this._newEffect = this._newEffect.bind(this);
        this._moveEffect = this._moveEffect.bind(this);
        this._selectedChainChanged = this._selectedChainChanged.bind(this);


        this.state = {
            currentChainNumber: 0,
            hidden: false
        }
    }

    get currentChain() {
        if (this.state.currentChainNumber > this.props.connectionManager.chains.length) {
            return this.props.connectionManager.bus;
        }
        return this.chainsAndBus[this.state.currentChainNumber];
    }

    get chainsAndBus() {
        return [this.props.connectionManager.bus].concat(this.props.connectionManager.chains);
    }

    private _newEffect(newEffectIndex: number) {
        this.currentChain.addEffect(this.currentChain.effects.length, EffectsChain.possibleEffects.get(EffectsChainInfo.effectTitles[newEffectIndex])());
        this.setState({ currentChainNumber: this.state.currentChainNumber });
    }

    // Curried function to prevent passing down of index
    private _effectChanged(index: number) {
        return (propertyIndex: number) => {
            return (value: any) => {
                let property = this.currentChain.effects[index].properties[propertyIndex];
                property.value = value;
                this.currentChain.effectNodes[index][property.propertyName] = value;

                this.setState({ currentChainNumber: this.state.currentChainNumber });
            }
        }
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
        this.setState({ hidden: !this.state.hidden })
    }

    private _selectedChainChanged(index: number) {
        if (index > this.props.connectionManager.chains.length) {
            this.props.connectionManager.addChain();
        }
        this.setState({currentChainNumber: index});
    }

    // TODO: UI for switching effects chain, and UI for adding new effects chains.
    render() {
        let options = this.chainsAndBus.map(value =>{return value.chainName});
        options.push("New Chain...");

        return <div className={"effectsChainPanel" + (this.state.hidden ? " hidden" : "")}>
            <FAButton title={this.state.hidden ? "Show Effects" : "Hide Effects"} className="effectsChainHideShowButton" iconName={this.state.hidden ? "fa fa-caret-left" : "fa fa-caret-right"} onClick={() => { this._hidePanel() }} />
            <div className={"effectsChainContent"} >
                <div className={"effectsChainPanelTitle"}>
                    <BoxSelect mainButtonClassName={"effectsChainTitleButton"} selectButtonClassName={"effectsChainSelectButton"} selected={this.state.currentChainNumber} options={options} selectedCallback={this._selectedChainChanged} />
                </div>
                <EffectsChainInfo effectsChain={this.currentChain.effects} moveEffect={this._moveEffect} effectPropertyChanged={this._effectChanged} newEffect={this._newEffect} effectRemoved={this._effectRemoved} />
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
    /*preGainValue : number,
    preGainValueChanged : Function,
    postGainValue : number,
    postGainValueChanged : Function,*/

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
            return <ChainEffect key={effect.id} effectIndex={index} {...effect} onPropertyChange={this.props.effectPropertyChanged(index)} onDelete={this.props.effectRemoved} />
        });
        return <div className={"effectsList"}>
            <DragDropContext onDragEnd={this._onDragEnd}>
                <Droppable droppableId={"effectsList"}>
                    {(provided, snapshot) => (
                        <div className={"effectsListDroppable" + (snapshot.isDraggingOver ? " dragging" : "")} ref={provided.innerRef} {...provided.droppableProps}>
                            {effects}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <BoxSelect mainButtonClassName={"effectsChainDropdownButton"} title={"+"} options={EffectsChainInfo.effectTitles} selectedCallback={this.props.newEffect} />
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
                <div className={"chainEffect" + (snapshot.isDragging ? " dragging" : "")} ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                    <div>
                        <div className={"chainEffectTitle"}>
                            <p style={{marginRight: "5px"}}>{this.props.effectType}</p>
                            <FAButton className={"chainEffectDelete"} iconName={"fa fa-times"} onClick={() => {this.props.onDelete(this.props.effectIndex)}} />
                        </div>
                    </div>
                    {this.props.properties.map((property, index) => {
                        if (property.editable) {
                            switch (property.type) {
                                case "number":
                                    if (property.hasOwnProperty("min")) {
                                        return <RangeEffectProperty key={index} {...property as IEffectNumberRange} onChange={this.props.onPropertyChange(index)} />;
                                    }
                                    else {
                                        return <NumberEffectProperty key={index} {...property as IEffectNumberProperty} onChange={this.props.onPropertyChange(index)} />;
                                    }
                                case "string":
                                    return <StringEffectProperty key={index} {...property as IEffectStringProperty} onChange={this.props.onPropertyChange(index)} />;
                                case "boolean":
                                    return <BooleanEffectProperty key={index} {...property as IEffectBooleanProperty} onChange={this.props.onPropertyChange(index)} />;
                                case "list":
                                    return <ListEffectProperty key={index} {...property as IEffectListProperty} onChange={this.props.onPropertyChange(index)} />;
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
    onChange: Function
}

interface BooleanEffectPropertyProps extends IEffectBooleanProperty {
    onChange: Function
}

interface NumberEffectPropertyProps extends IEffectNumberProperty {
    onChange: Function
}

interface StringEffectPropertyProps extends IEffectStringProperty {
    onChange: Function
}

interface ListEffectPropertyProps extends IEffectListProperty {
    onChange: Function
}

function capitalise(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

class NumberEffectProperty extends React.Component<NumberEffectPropertyProps> {
    render() {
        let nameToUse = capitalise(this.props.displayName ? this.props.displayName : this.props.propertyName) + ":";

        return <div className={"effectProperty number"}>
            <p>{nameToUse}</p>
            <input type="number" name={nameToUse} value={this.props.value} step={this.props.step} onChange={(event) => { this.props.onChange(event.target.value) }} />
        </div>
    }
}

class RangeEffectProperty extends React.Component<RangeEffectPropertyProps> {
    render() {
        let nameToUse = capitalise(this.props.displayName ? this.props.displayName : this.props.propertyName) + ":";

        return <div className={"effectProperty range"}>
            <p>{nameToUse}</p>
            <Slider min={this.props.min.toString()} max={this.props.max.toString()} step={this.props.step.toString()} value={this.props.value.toString()} onChange={this.props.onChange} />
        </div>
    }
}

class StringEffectProperty extends React.Component<StringEffectPropertyProps> {
    render() {
        let nameToUse = capitalise(this.props.displayName ? this.props.displayName : this.props.propertyName) + ":";

        return <div className={"effectProperty string"}>
            <p>{nameToUse}</p>
            <input type="text" name={nameToUse} value={this.props.value} onChange={(event) => { this.props.onChange(event.target.value) }} />
        </div>
    }
}

class BooleanEffectProperty extends React.Component<BooleanEffectPropertyProps> {
    render() {
        let nameToUse = capitalise(this.props.displayName ? this.props.displayName : this.props.propertyName) + ":";

        return <div className={"effectProperty boolean"}>
            <p>{nameToUse}</p>
            <input type="checkbox" name={nameToUse} checked={this.props.value} onChange={(event) => { this.props.onChange(event.target.checked) }} />
        </div>
    }
}

class ListEffectProperty extends React.Component<ListEffectPropertyProps> {
    render() {
        let nameToUse = capitalise(this.props.displayName ? this.props.displayName : this.props.propertyName) + ":";

        return <div className={"effectProperty list"}>
            <p>{nameToUse}</p>
            <BoxSelect selected={this.props.options.indexOf(this.props.value)} options={this.props.options} selectedCallback={(newIndex) => { this.props.onChange(this.props.options[newIndex]) }} />
        </div>
    }
}