export declare class Round {
    library: any;
    modules: any;
    private isloaded;
    private feesByRound;
    private rewardsByRound;
    private delegatesByRound;
    private unFeesByRound;
    private unRewardsByRound;
    private unDelegatesByRound;
    constructor(scope: any);
    loaded(): boolean;
    calc(height: number): number;
    onBind(scope: any): void;
    onBlockChainReady(): void;
    onFinishRound(round: any): void;
    cleanup(): void;
}
