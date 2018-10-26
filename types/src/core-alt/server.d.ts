export default class Server {
    private isLoaded;
    library: any;
    modules: any;
    constructor(scope: any);
    private attachApi;
    onBind(scope: any): void;
    onBlockchainReady(): void;
    cleanup(): void;
}
