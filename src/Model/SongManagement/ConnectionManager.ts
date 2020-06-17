import { ICustomOutputAudioNode, ICustomInputAudioNode } from "../Interfaces/ICustomAudioNode.js";

export class ConnectionManager {

    private _context : AudioContext|OfflineAudioContext;
    private _possibleConnections : {[connectionName : string] : AudioNode|ICustomInputAudioNode};
    private _currentConnections : {[uuid : string]: string[]}

    constructor (context : AudioContext|OfflineAudioContext) {
        this._context = context;
        this._possibleConnections = {"context" : context.destination};
        this._currentConnections = {};
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
}