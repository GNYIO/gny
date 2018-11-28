export default class Round {
    private library;
    private isloaded;
    constructor(scope: any);
    getLoadStatus(): boolean;
    calculateRound(height: number): number;
    onBind(scope: any): void;
    onBlockChainReady(): void;
    onFinishRound(round: any): void;
    cleanup(): void;
}
