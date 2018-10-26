declare class Protobuf {
    constructor(schema: any);
    encodeBlock(block: any): any;
    decodeBlock(data: any): any;
    encodeBlockPropose(propose: any): any;
    decodeBlockPropose(data: any): any;
    encodeBlockVotes(obj: any): any;
    decodeBlockVotes(data: any): any;
    encodeTransaction(trs: any): any;
    decodeTransaction(data: any): any;
}
declare const _default: {
    protobuf: (schemaFile: any, cb: any) => void;
    protobufAlt: (schemaFile: any) => Protobuf;
};
export = _default;
