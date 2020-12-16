import * as fs from 'fs';
import * as _ from 'lodash';
import * as protocolBuffers from 'protocol-buffers';
import {
  NewBlockMessage,
  BlockPropose,
  IProtobuf,
  UnconfirmedTransaction,
  BlockIdWrapper,
  BlockAndVotes,
} from '@gny/interfaces';

export class Protobuf implements IProtobuf {
  public schema;

  constructor(schema) {
    this.schema = schema;
  }

  encodeBlockVotes(obj: any): Buffer {
    for (let i = 0; i < obj.signatures.length; ++i) {
      const signature = obj.signatures[i];
      signature.publicKey = Buffer.from(signature.publicKey, 'hex');
      signature.signature = Buffer.from(signature.signature, 'hex');
    }
    return this.schema.BlockVotes.encode(obj);
  }

  decodeBlockVotes(data: Buffer) {
    const obj = this.schema.BlockVotes.decode(data);
    for (let i = 0; i < obj.signatures.length; ++i) {
      const signature = obj.signatures[i];
      signature.publicKey = signature.publicKey.toString('hex');
      signature.signature = signature.signature.toString('hex');
    }
    return obj;
  }

  encodeUnconfirmedTransaction(trs: UnconfirmedTransaction): Buffer {
    const obj = _.cloneDeep(trs);
    if (typeof obj.signatures !== 'string') {
      obj.signatures = JSON.stringify(obj.signatures);
    }
    if (typeof obj.args !== 'string') {
      obj.args = JSON.stringify(obj.args);
    }

    return this.schema.UnconfirmedTransaction.encode(obj);
  }

  decodeUnconfirmedTransaction(data: Buffer) {
    const obj = this.schema.UnconfirmedTransaction.decode(
      data
    ) as UnconfirmedTransaction;
    // this is default protobuf behaviour to add an empty string
    if (obj.secondSignature === '') {
      delete obj.secondSignature;
    }
    return obj;
  }

  encodeNewBlockMessage(msg): Buffer {
    const obj = _.cloneDeep(msg);
    return this.schema.NewBlockMessage.encode(obj);
  }

  decodeNewBlockMessage(data: Buffer): NewBlockMessage {
    const obj = this.schema.NewBlockMessage.decode(data);
    return obj;
  }

  encodeNewBlockIdQuery(msg): Buffer {
    const obj = _.cloneDeep(msg);
    return this.schema.NewBlockIdQuery.encode(obj);
  }

  decodeNewBlockIdQuery(data: Buffer): BlockIdWrapper {
    const obj = this.schema.NewBlockIdQuery.decode(data);
    return obj;
  }

  encodeNewBlockResult(msg): Buffer {
    const obj = _.cloneDeep(msg);
    return this.schema.NewBlockResult.encode(obj);
  }

  decodeNewBlockResult(data: Buffer): BlockAndVotes {
    const obj = this.schema.NewBlockResult.decode(data);
    return obj;
  }
}

export function getSchema(schemaFile: string) {
  const data = fs.readFileSync(schemaFile);
  const schema = protocolBuffers(data);
  return new Protobuf(schema);
}
