import * as React from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { v4 as uuid } from "uuid";
import { EffectsChain } from "../../Model/Nodes/EffectsChain";
import { ConnectionManager } from "../../Model/SongManagement/ConnectionManager";
import { IEffect, IEffectBooleanProperty, IEffectNumberProperty, IEffectNumberRange, IEffectProperty, IEffectStringProperty } from "../../Model/Interfaces/IInstrumentSettings";
import { Dropdown, Slider } from "../SharedReact/BasicElements";

interface EffectsChainPanelProps {
    connectionManager: ConnectionManager
}

interface EffectsChainPanelState {
    currentChainNumber: number
}

export class EffectsChainPanel extends React.Component<EffectsChainPanelProps, EffectsChainPanelState> {

    constructor(props) {
        super(props);

        this._effectChanged = this._effectChanged.bind(this);
        this._newEffect = this._newEffect.bind(this);
        this. _moveEffect = this._moveEffect.bind(this);

        this.state = {
            currentChainNumber: 0
        }
    }

    get currentChain() {
        return this.chainsAndBus[this.state.currentChainNumber];
    }

    get chainsAndBus() {
        return this.props.connectionManager.chains.concat([this.props.connectionManager.bus]);
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

    private _newEffect(newEffectIndex: number) {
        this.currentChain.addEffect(this.currentChain.effects.length, EffectsChain.possibleEffects.get(EffectsChainInfo.effectTitles[newEffectIndex])());
        this.setState({ currentChainNumber: this.state.currentChainNumber });
    }

    private _moveEffect(oldIndex: number, newIndex: number) {
        this.currentChain.moveEffect(oldIndex, newIndex);
        this.setState({ currentChainNumber: this.state.currentChainNumber });
    }

    render() {

        return <div className={"effectsChainPanel"}>
            <div>
                {this.currentChain.chainName}
            </div>
            <EffectsChainInfo effectsChain={this.currentChain.effects} moveEffect={this._moveEffect} effectPropertyChanged={this._effectChanged} newEffect={this._newEffect} />
        </div>
    }
}

interface EffectsChainInfoProps {
    effectsChain: IEffect[],
    moveEffect : Function
    effectPropertyChanged: Function,
    newEffect: Function
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
            return <ChainEffect key={effect.id} effectIndex={index} {...effect} onPropertyChange={this.props.effectPropertyChanged(index)} />
        });
        return <div>
            <DragDropContext onDragEnd={this._onDragEnd}>
                <Droppable droppableId={"effectsList"}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                            {effects}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <Dropdown title={"+"} optionTitles={EffectsChainInfo.effectTitles} optionClickCallback={this.props.newEffect} />
        </div >;
    }
}

interface ChainEffectProps extends IEffect {
    effectIndex: number
    onPropertyChange: Function
}

class ChainEffect extends React.PureComponent<ChainEffectProps> {

    render() {
        return <Draggable draggableId={this.props.id} index={this.props.effectIndex}>
            {(provided) => (
                <div className="chainEffect" ref={provided.innerRef} {...provided.draggableProps}>
                    <div {...provided.dragHandleProps}>
                        <p>{this.props.effectType}</p>
                    </div>
                    {this.props.properties.map((property, index) => {
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
                            default:
                                console.log("Unknown property type: " + property.type);
                                return null;
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


class NumberEffectProperty extends React.Component<NumberEffectPropertyProps> {
    render() {
        return <div className={"numberProperty"}>
            <p>{this.props.propertyName}</p>
            <input type="number" name={this.props.propertyName} value={this.props.value} step={this.props.step} onChange={(event) => { this.props.onChange(event.target.value) }} />
        </div>
    }
}

class RangeEffectProperty extends React.Component<RangeEffectPropertyProps> {
    render() {
        return <div className={"numberProperty"}>
            <p>{this.props.propertyName}</p>
            <Slider min={this.props.min.toString()} max={this.props.max.toString()} step={this.props.step.toString()} value={this.props.value.toString()} onChange={this.props.onChange} />
        </div>
    }
}

class StringEffectProperty extends React.Component<StringEffectPropertyProps> {
    render() {
        return <div className={"stringProperty"}>
            <p>{this.props.propertyName}</p>
            <input type="text" name={this.props.propertyName} value={this.props.value} onChange={(event) => { this.props.onChange(event.target.value) }} />
        </div>
    }
}

class BooleanEffectProperty extends React.Component<BooleanEffectPropertyProps> {
    render() {
        return <div className={"booleanProperty"}>
            <p>{this.props.propertyName}</p>
            <input type="checkbox" name={this.props.propertyName} checked={this.props.value} onChange={(event) => { this.props.onChange(event.target.value) }} />
        </div>
    }
}