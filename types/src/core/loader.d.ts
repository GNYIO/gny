export default class Loader {
    private isLoaded;
    private isSynced;
    private library;
    private modules;
    private genesisBlock;
    private syncIntervalId;
    constructor(scope: any);
    syncTrigger(turnOn: boolean): void;
    private loadFullDatabase;
    private findUpdate;
    priv: any;
    findUpdate: (lastBlock: any, peer: any) => Promise<void>;
    private loadBlocks;
    private loadUnconfirmedTransactions;
    startSyncBlocks(): void;
    syncBlocksFromPeer(peer: any): void;
    onPeerReady(): void;
    onBind(scope: any): void;
    onBlockchainReady(): void;
    Loader: any;
    prototype: any;
    cleanup: (cb: any) => void;
    shared: any;
    status: (req: any, cb: any) => void;
    sync(): {
        syncing: any;
        blocks: any;
        height: any;
    };
}
