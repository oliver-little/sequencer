export interface ICustomOutputAudioNode {
    // Unique ID
    id : string;
    connect(node? : AudioNode|ICustomInputAudioNode);
    disconnect(node? : AudioNode|ICustomInputAudioNode);
    disconnectAll();
}

export interface ICustomInputAudioNode {
    // Unique ID
    id : string;
    input : AudioNode;
}