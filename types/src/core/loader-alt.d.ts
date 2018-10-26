declare class Loader {
    scope: any;
    private loaded;
    private syncing;
    private loadingBlock;
    private genesisBlock;
    private total;
    private blockToSync;
    private syncintervalId;
    constructor(scope: any);
    private attachApi;
    private: any;
}
export = Loader;
