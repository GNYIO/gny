declare const _default: {
    MakeKeypair(hash: any): {
        publicKey: any;
        privateKey: any;
    };
    Sign(hash: any, keypair: any): any;
    Verify(hash: any, signatureBuffer: any, publicKeyBuffer: any): any;
};
export = _default;
