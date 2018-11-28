export declare function generateKeyPair(hash: any): {
    publicKey: any;
    privateKey: any;
};
export declare function sign(hash: any, keyPair: any): any;
export declare function verify(hash: any, signatureBuffer: any, publicKeyBuffer: any): any;
