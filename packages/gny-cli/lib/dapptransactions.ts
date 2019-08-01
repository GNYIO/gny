import * as assert from 'assert';
import * as ByteBuffer from 'bytebuffer';

const bytesTypes = {
  2: function(trs) {
    try {
      const buf = new Buffer(trs.asset.delegates.list.join(','), 'utf8');
    } catch (e) {
      throw Error(e.toString());
    }

    return buf;
  },
};

export function getTransactionBytes(trs, skipSignature?) {
  try {
    const bb = new ByteBuffer(1, true);
    bb.writeInt(trs.timestamp);
    bb.writeString(trs.fee);

    const senderPublicKeyBuffer = new Buffer(trs.senderPublicKey, 'hex');
    for (let i = 0; i < senderPublicKeyBuffer.length; i++) {
      bb.writeByte(senderPublicKeyBuffer[i]);
    }

    bb.writeInt(trs.type);

    assert(Array.isArray(trs.args));
    bb.writeString(JSON.stringify(trs.args));

    if (!skipSignature && trs.signature) {
      const signatureBuffer = new Buffer(trs.signature, 'hex');
      for (let i = 0; i < signatureBuffer.length; i++) {
        bb.writeByte(signatureBuffer[i]);
      }
    }

    bb.flip();
  } catch (e) {
    throw Error(e.toString());
  }
  return bb.toBuffer();
}

export default {
  getTransactionBytes: getTransactionBytes,
};
