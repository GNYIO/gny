export default class System {
    library: any;
    modules: any;
    private version;
    private port;
    private magic;
    private osName;
    constructor(scope: any);
    getSystemInfo(req: any): {
        os: string;
        version: any;
        timestamp: number;
        lastBlock: {
            height: any;
            timestamp: number;
            behind: number;
        };
    };
    getOS(): string;
    getVersion(): any;
    getPort(): any;
    getMagic(): string;
    onBind(scope: any): void;
    private attachApi;
}
