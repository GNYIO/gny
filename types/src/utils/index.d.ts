declare function sleep(ms: any): Promise<{}>;
declare function loopAsyncFunction(asyncFunc: any, interval: any): void;
declare function loop(func: any, interval: any): void;
declare function retryAsync(worker: any, times: any, interval: any, errorHandler: any): Promise<any>;
declare const _default: {
    sleep: typeof sleep;
    loopAsyncFunction: typeof loopAsyncFunction;
    loop: typeof loop;
    retryAsync: typeof retryAsync;
};
export = _default;
