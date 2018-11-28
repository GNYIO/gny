export default class System {
    private library;
    constructor(scope: any);
    getSystemInfo(): {
        os: string;
        version: any;
        timestamp: number;
        lastBlock: {
            height: any;
            timestamp: number;
            behind: number;
        };
    };
    onBind(scope: any): void;
}
