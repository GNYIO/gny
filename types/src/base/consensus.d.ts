/// <reference types="node" />
declare class Consensus {
    pendingBlock: any;
    pendingVotes: any;
    votesKeySet: Set<any>;
    scope: any;
    constructor(scope: any);
    createVotes(keypairs: any, block: any): {
        height: any;
        id: any;
        signatures: never[];
    };
    verifyVote(height: any, id: any, voteItem: any): any;
    private calculateHash;
    hasEnoughVotes(votes: any): boolean;
    getPendingBlock(): any;
    hasPendingBlock(timestamp: any): boolean;
    setPendingBlock(block: any): void;
    clearState(): void;
    addPendingVotes(votes: any): any;
    createPropose(keypair: any, block: any, address: any): any;
    getProposeHash(propose: any): Buffer;
    normalizeVotes(votes: any): any;
    acceptPropose(propose: any): string;
}
export = Consensus;
