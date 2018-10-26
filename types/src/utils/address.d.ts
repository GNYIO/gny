declare const _default: {
    TYPE: {
        NONE: number;
        NORMAL: number;
        CHAIN: number;
        GROUP: number;
    };
    getType(address: any): any;
    isAddress(address: any): boolean;
    isBase58CheckAddress(address: any): boolean;
    isNormalAddress(address: any): boolean;
    isGroupAddress(address: any): boolean;
    generateNormalAddress(publicKey: any): string;
    generateChainAddress(hash: any): string;
    generateGroupAddress(name: any): string;
};
export = _default;
