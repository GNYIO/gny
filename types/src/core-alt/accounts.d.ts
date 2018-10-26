export default class Account {
    modules: any;
    library: any;
    shared: {};
    constructor(scope: any);
    openAccount(passphrase: any): void;
    openAccount2(publicKey: any): void;
    generateAddressByPublicKey(publicKey: any): string;
    onBind(scope: any): void;
    newAccount(req: any): {
        secret: any;
        publicKey: any;
        privateKey: any;
        address: string;
    };
    open(req: any): void;
    open2(req: any): void;
    getBalance(req: any): void;
    getPublickey(req: any): void;
    generatePublickey(req: any): void;
    myVotedDelegates(req: any): void;
    getAccount(req: any): void;
    private attachApi;
}
