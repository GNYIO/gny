export declare class Block {
    modules: any;
    library: any;
    genesisBlock: any;
    private lastBlock;
    private blockStatus;
    private isLoaded;
    private isActive;
    private blockCache;
    private proposeCache;
    private lastPropose;
    private isCollectingVotes;
    constructor(scope: any);
    private attachAPI;
    getIdSequence2(height: number): Promise<{
        ids: any;
        firstHeight: number;
    }>;
    getCommonBlock(peer: any, height: number): Promise<void>;
}
