import { ICustomOutputAudioNode, ICustomInputAudioNode } from "../Interfaces/ICustomAudioNode.js";
import { EffectsChain } from "../Nodes/EffectsChain.js";
import { IChainSettings } from "../Interfaces/IInstrumentSettings.js";
import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";

export class ConnectionManager {

    public effectsDeserialised : SimpleEvent;

    private _context: AudioContext | OfflineAudioContext;
    private _outputGain : GainNode;
    private _bus: EffectsChain;
    private _chains: EffectsChain[];
    private _possibleConnections: { [connectionName: string]: AudioNode | ICustomInputAudioNode };
    private _possibleConnectionStrings : string[];

    private _currentConnections: { [uuid: string]: string[] }

    constructor(context: AudioContext | OfflineAudioContext) {
        this.effectsDeserialised = new SimpleEvent();

        this._context = context;
        this._outputGain = this._context.createGain();
        this._outputGain.connect(context.destination);
        this._bus = new EffectsChain(context);
        this._bus.chainName = "Bus";

        this._possibleConnections = { "Context": this._outputGain, "Bus": this._bus };
        this._possibleConnectionStrings = ["Context", "Bus"];
        this._currentConnections = {};
        this._chains = [];

        this.createConnections(this._bus, ["Context"]);

    }

    get possibleConnections() {
        return this._possibleConnections;
    }

    get possibleConnectionStrings() {
        return this._possibleConnectionStrings;
    }

    get outputGain() : GainNode {
        return this._outputGain;
    }

    get bus(): EffectsChain {
        return this._bus;
    }

    get chains(): EffectsChain[] {
        return this._chains;
    }

    /**
     * Gets the connections for a given object
     *
     * @param {ICustomOutputAudioNode} object
     * @memberof ConnectionManager
     */
    public getConnections(object: ICustomOutputAudioNode) {
        if (object.id in this._currentConnections) {
            return this._currentConnections[object.id];
        }
        else {
            throw new Error("Object not found");
        }
    }

    /**
     * Creates a new set of connections, overwriting existing ones if they exist.
     *
     * @param {ICustomAudioNode} object
     * @param {string[]} connections
     * @memberof ConnectionManager
     */
    public createConnections(object: ICustomOutputAudioNode, connections: string[]) {
        if (object.id in this._currentConnections) { // Remove all existing connections
            object.disconnectAll();
        }
        for (let i = 0; i < connections.length; i++) {
            if (connections[i] in this._possibleConnections) {
                object.connect(this._possibleConnections[connections[i]]);
            }
            else {
                throw new Error("Invalid connection name: " + connections[i])
            }
        }
        this._currentConnections[object.id] = connections
    }

    /**
     * Adds a new connection to a node
     *
     * @param {ICustomAudioNode} object
     * @param {string} connection
     * @returns
     * @memberof ConnectionManager
     */
    public addConnection(object: ICustomOutputAudioNode, connection: string) {
        if (connection in this._possibleConnections) { // Check connection is valid
            if (object.id in this._currentConnections) { // Check if the object already has connections
                if (this._currentConnections[object.id].indexOf(connection) == -1) { // Check if this connection has not already been made.
                    this._currentConnections[object.id].push(connection);
                }
                else { // Quit if the connection has already been made.
                    return;
                }
            }
            else { // If this object doesn't have connections, add it to the list.
                this._currentConnections[object.id] = [connection];
            }
            object.connect(this._possibleConnections[connection]);
        }
        else {
            throw new Error("Invalid connection name: " + connection);
        }
    }

    /**
     * Removes an existing connection from a node
     *
     * @param {ICustomAudioNode} object
     * @param {string} connection
     * @memberof ConnectionManager
     */
    public removeConnection(object: ICustomOutputAudioNode, connection: string) {
        if (object.id in this._currentConnections) {
            let index = this._currentConnections[object.id].indexOf(connection);
            if (index != -1) {
                object.disconnect(this._possibleConnections[connection]);
                this._currentConnections[object.id].splice(index, 1);
            }
            else {
                throw new Error("Object does not have this connection");
            }
        }
        else {
            throw new Error("Object does not have any connections.");
        }
    }

    /**
     * Removes all existing connections from a node
     *
     * @param {ICustomOutputAudioNode} object
     * @memberof ConnectionManager
     */
    public removeAllConnections(object: ICustomOutputAudioNode) {
        object.disconnectAll();
        delete this._currentConnections[object.id];
    }

    /**
     * Adds an EffectsChain to the list of possible connections
     *
     * @returns The connection name given to this effects chain 
     * @memberof ConnectionManager
     */
    public addChain(settings?: IChainSettings): EffectsChain {
        let object = new EffectsChain(this._context, settings);
        if (settings === undefined) {
            let chainNo = 0;
            while (("Chain " + chainNo) in this._possibleConnections) {
                chainNo++;
            };
            let name = "Chain " + chainNo.toString();

            object.chainName = name;
            this.createConnections(object, EffectsChain.createDefaults().connections);
        }
        else {
            this.createConnections(object, settings.connections);
        }
        this._possibleConnectionStrings.push(object.chainName);
        this._possibleConnections[object.chainName] = object;
        this._chains.push(object)
        return object;
    }

    /**
     * Removes an EffectsChain from the list of possible connections by its name
     *
     * @param {string} name The name of the EffectsChain in the list of possible connections
     * @memberof ConnectionManager
     */
    public removeChain(name: string) {
        if (name.startsWith("Chain ") && name in this._possibleConnections) {
            let index = this._chains.indexOf(this._possibleConnections[name] as EffectsChain);
            this._chains.splice(index, 1);
            delete this._possibleConnections[name];
            this._possibleConnectionStrings.splice(this._possibleConnectionStrings.indexOf(name), 1);
        }
        else {
            throw new Error("Object not in ConnectionManager");
        }
    }

    public getChain(name: string): EffectsChain {
        if (name == "Bus") {
            return this._bus;
        }
        else {
            let chain = this._chains.find((value) => { value.chainName === name });
            if (chain !== undefined) {
                return chain;
            }
            else {
                throw new Error("Invalid chain name");
            }
        }
    }

    public getChainDelayTime(name: string): number {
        let chain = this.getChain(name);
        let delayTime = chain.getDelayTime();
        if ("bus" in this._currentConnections[chain.id]) {
            delayTime += this._bus.getDelayTime();
        }

        return delayTime;
    }

    public serialiseChains(): Array<IChainSettings> {
        let serialisedChains = []
        this.chains.concat(this.bus).forEach(chain => {
            let chainSettings = chain.serialise();
            if (chain.id in this._currentConnections) {
                chainSettings.connections = this._currentConnections[chain.id];
            }
            else {
                chainSettings.connections = ["Context"];
            }
            serialisedChains.push(chainSettings);
        });
        return serialisedChains;
    }

    public deserialiseChains(newChains: Array<IChainSettings>) {
        this._possibleConnectionStrings = ["Context"];
        this._possibleConnections = {"Context": this._outputGain};

        for (let i = 0; i < this._chains.length; i++) {
            delete this._possibleConnections[this._chains[i].chainName];
            this._possibleConnectionStrings.splice(this._possibleConnectionStrings.indexOf(this._chains[i].chainName), 1);
            this._chains[i].destroy();
        }

        this._chains = [];

        newChains.forEach(chain => {
            if (chain.chainName === "Bus") {
                this._bus = new EffectsChain(this._context, chain);
                this._possibleConnectionStrings.push("Bus");
                this._possibleConnections[chain.chainName] = this._bus;
                this.createConnections(this._bus, chain.connections);
            }
            else {
                this.addChain(chain);
            }
        });

        this.effectsDeserialised.emit();
    }
}