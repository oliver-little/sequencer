import { ICustomOutputAudioNode, ICustomInputAudioNode } from "../Interfaces/ICustomAudioNode.js";
import { EffectsChain } from "../Nodes/EffectsChain.js";

export class ConnectionManager {

    private _context : AudioContext|OfflineAudioContext;
    private _possibleConnections : {[connectionName : string] : AudioNode|ICustomInputAudioNode};
    private _currentConnections : {[uuid : string]: string[]}

    constructor (context : AudioContext|OfflineAudioContext) {
        this._context = context;
        this._possibleConnections = {"context" : context.destination};
        this._currentConnections = {};
    }

    get possibleConnections() {
        return this._possibleConnections;
    }

    /**
     * 
     *
     * @param {ICustomOutputAudioNode} object
     * @memberof ConnectionManager
     */
    public getConnections(object : ICustomOutputAudioNode) {
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
    public createConnections(object : ICustomOutputAudioNode, connections : string[]) {
        if (object.id in this._currentConnections) { // Remove all existing connections
            object.disconnectAll();
        }
        for (let i = 0; i < connections.length; i++) {
            if (connections[i] in this._possibleConnections){
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
    public addConnection(object : ICustomOutputAudioNode, connection : string) {
        if(connection in this._possibleConnections) { // Check connection is valid
            if (object.id in this._currentConnections){ // Check if the object already has connections
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
    public removeConnection(object : ICustomOutputAudioNode, connection : string) {
        if (object.id in this._currentConnections) {
            let index = this._currentConnections[object.id].indexOf(connection);
            if (index != -1) {
                this._currentConnections[object.id].splice(index, 1);
            }
            else {
                throw new Error("")
            }
        }
        else {
            throw new Error("Object does not have any connections.");
        }
    }

    /**
     * Adds an EffectsChain to the list of possible connections
     *
     * @param {EffectsChain} object
     * @returns The connection name given to this effects chain 
     * @memberof ConnectionManager
     */
    public addChain(object : EffectsChain) : string {
        let chainNo = 0;
        while (("chain" + chainNo) in this._possibleConnections) {
            chainNo++;
        }
        this._possibleConnections["chain" + chainNo] = object;
        return "chain" + chainNo;
    }

    /**
     * Removes an EffectsChain from the list of possible connections by its name
     *
     * @param {string} name The name of the EffectsChain in the list of possible connections
     * @memberof ConnectionManager
     */
    public removeChain(name : string) {
        if (name.startsWith("chain") && name in this._possibleConnections) {
            delete this._possibleConnections[name];
        }
        else {
            throw new Error("Object not in ConnectionManager");
        }
    }

    /**
     * Sets the global effects bus (overwrites the one that is already set if it exists)
     *
     * @param {EffectsChain} object An EffectsChain, or null to remove the bus
     * @memberof ConnectionManager
     */
    public setBus(object : EffectsChain) {
        if (object === null) {
            delete this._possibleConnections["bus"];
        }
        else {
            this._possibleConnections["bus"] = object;
        }
    }
}