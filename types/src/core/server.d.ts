export default class Server {
    private isLoaded;
    library: any;
    constructor(scope: any);
    onBind(scope: any): void;
    onBlockchainReady(): void;
    cleanup(): void;
}
