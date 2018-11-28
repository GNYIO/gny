declare class Block {
    private blockStatus;
    scope: any;
    constructor(scope: any);
    private sortTransactions;
    create(data: any): any;
    sign(block: any, keypair: any): any;
    private calculateHash;
    serialize(block: any, skipSignature?: any): any;
    verifySignature(block: any): any;
    objectNormalize(block: any): any;
    calculateFee(): number;
    dbRead(raw: any): any;
}
export = Block;
