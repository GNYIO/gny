/// <reference types="node" />
declare class Transaction {
    scope: any;
    constructor(scope: any);
    create(data: any): any;
    sign(keypair: any, transaction: any): any;
    multisign(keypair: any, transaction: any): any;
    getId(transaction: any): string;
    getHash(transaction: any): Buffer;
    getBytes(transaction: any, skipSignature: any, skipSecondSignature: any): any;
    verifyNormalSignature(transaction: any, requestor: any, bytes: any): "Invalid signature" | "Second signature not provided" | "Invalid second signature" | undefined;
    verify(context: any): Promise<any>;
    verifySignature(transaction: any, publicKey: any, signature: any): any;
    verifyBytes(bytes: any, publicKey: any, signature: any): any;
    apply(context: any): Promise<void>;
    objectNormalize(transaction: any): any;
}
export = Transaction;
