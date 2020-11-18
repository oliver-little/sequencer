import * as React from "react";
import { EffectsChain } from "../../Model/Nodes/EffectsChain";
import { ConnectionManager } from "../../Model/SongManagement/ConnectionManager";
import { IEffect, IEffectBooleanProperty, IEffectNumberProperty, IEffectNumberRange, IEffectProperty, IEffectStringProperty } from "../../Model/Interfaces/IInstrumentSettings";
import { Slider } from "../SharedReact/BasicElements";

interface EffectsChainPanelProps {
    connectionManager : ConnectionManager
}

interface EffectsChainPanelState {
    currentChain : number
}

export class EffectsChainPanel extends React.Component<EffectsChainPanelProps, EffectsChainPanelState> {

    constructor(props) {
        super(props);

        this.state = {
            currentChain: 0
        }
    }

    get chainsAndBus() {
        return this.props.connectionManager.chains.concat([this.props.connectionManager.bus]);
    }


    render() {
        let currentChain = this.chainsAndBus[this.state.currentChain];

        return <div className={"effectsChainPanel"}>
            <div>
                {currentChain.chainName}
            </div>
            <EffectsChainInfo effectsChain={this.chainsAndBus[this.state.currentChain]} />
        </div>
    }
}

interface EffectsChainInfoProps {
    effectsChain : EffectsChain
}

class EffectsChainInfo extends React.Component<EffectsChainInfoProps> {

    constructor(props) {
        super(props);
        this._effectChanged = this._effectChanged.bind(this);
    }

    // Curried function to prevent passing down of index
    private _effectChanged (index : number) {
        return (propertyIndex : number) => {
            return () => {
                console.log(index, propertyIndex);
            }
        }
    }

    render() {
        return <div>
            {this.props.effectsChain.effects.map((effect, index) => {
                <ChainEffect key={index} {...effect} onPropertyChange={this._effectChanged(index)} />
            })}
        </div>;
    }
}

interface ChainEffectProps extends IEffect {
    onPropertyChange : Function
}

class ChainEffect extends React.Component<ChainEffectProps> {
    render() {
        return <div className="chainEffect">
            <div>
                <p>{this.props.effectType}</p>
            </div>
            {this.props.properties.map((property, index) => {
                switch (property.kind) {
                    case "number":
                        if (property.hasOwnProperty("min")) {
                            return <RangeEffectProperty key={index} {...property as IEffectNumberRange} onChange={this.props.onPropertyChange(index)} />
                        }
                        else {
                            return <NumberEffectProperty key={index} {...property as IEffectNumberProperty} onChange={this.props.onPropertyChange(index)} />
                        }   
                    case "string":
                        return <StringEffectProperty key={index} {...property as IEffectStringProperty} onChange={this.props.onPropertyChange(index)} />
                    case "boolean":
                        return <BooleanEffectProperty key={index} {...property as IEffectBooleanProperty} onChange={this.props.onPropertyChange(index)} />        
                }
            })}
        </div>
    }
}

interface RangeEffectPropertyProps extends IEffectNumberRange {
    onChange : Function
}

interface BooleanEffectPropertyProps extends IEffectBooleanProperty {
    onChange : Function
}

interface NumberEffectPropertyProps extends IEffectNumberProperty {
    onChange : Function
}

interface StringEffectPropertyProps extends IEffectStringProperty {
    onChange : Function
}


class NumberEffectProperty extends React.Component<NumberEffectPropertyProps> {
    render() {
        return <div className={"numberProperty"}>
            <p>{this.props.propertyName}</p>
            <input type="number" name={this.props.propertyName} value={this.props.value} step={this.props.step} onChange={(event) => {this.props.onChange(event.target.value)}}/>
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
            <input type="text" name={this.props.propertyName} value={this.props.value} onChange={(event) => {this.props.onChange(event.target.value)}}/>
        </div>
    }
}

class BooleanEffectProperty extends React.Component<BooleanEffectPropertyProps> {
    render() {
        return <div className={"booleanProperty"}>
            <p>{this.props.propertyName}</p>
            <input type="checkbox" name={this.props.propertyName} checked={this.props.value} onChange={(event) => {this.props.onChange(event.target.value)}}/>
        </div>
    }
}