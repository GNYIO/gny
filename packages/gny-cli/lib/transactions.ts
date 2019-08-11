// const ByteBuffer = require('bytebuffer');
import * as ByteBuffer from 'bytebuffer';

const bytesTypes = {
  2: function(trs) {
    let buf = new Buffer([]);
    try {
      buf = new Buffer(trs.asset.delegate.username, 'utf8');
    } catch (e) {
      throw Error(e.toString());
    }

    return buf;
  },

  3: function(trs) {
    let buf = new Buffer([]);
    try {
      buf = trs.asset.vote.votes
        ? new Buffer(trs.asset.vote.votes.join(''), 'utf8')
        : null;
    } catch (e) {
      throw Error(e.toString());
    }

    return buf;
  },

  5: function(trs) {
    let buf = new Buffer([]);
    try {
      const nameBuf = new Buffer(trs.asset.dapp.name, 'utf8');
      buf = Buffer.concat([buf, nameBuf]);

      if (trs.asset.dapp.description) {
        const descriptionBuf = new Buffer(trs.asset.dapp.description, 'utf8');
        buf = Buffer.concat([buf, descriptionBuf]);
      }

      if (trs.asset.dapp.git) {
        buf = Buffer.concat([buf, new Buffer(trs.asset.dapp.git, 'utf8')]);
      }

      const bb = new ByteBuffer(4 + 4, true);
      bb.writeInt(trs.asset.dapp.type);
      bb.writeInt(trs.asset.dapp.category);
      bb.flip();

      buf = Buffer.concat([buf, bb.toBuffer()]);
    } catch (e) {
      throw Error(e.toString());
    }

    return buf;
  },
};

export function getTransactionBytes(trs, skipSignature?, skipSecondSignature?) {
  const bb = new ByteBuffer(1, true);
  bb.writeInt(trs.type);
  bb.writeInt(trs.timestamp);
  bb.writeLong(trs.fee);
  bb.writeString(trs.senderId);

  if (trs.message) bb.writeString(trs.message);
  if (trs.args) {
    let args;
    if (Array.isArray(trs.args)) {
      args = JSON.stringify(trs.args);
    } else if (typeof trs.args === 'string') {
      args = trs.args;
    } else {
      throw new Error('Invalid transaction args');
    }
    bb.writeString(args);
  }

  if (!skipSignature && trs.signatures) {
    for (const signature of trs.signatures) {
      const signatureBuffer = new Buffer(signature, 'hex');
      for (let i = 0; i < signatureBuffer.length; i++) {
        bb.writeByte(signatureBuffer[i]);
      }
    }
  }

  if (!skipSecondSignature && trs.signSignature) {
    const signSignatureBuffer = new Buffer(trs.signSignature, 'hex');
    for (let i = 0; i < signSignatureBuffer.length; i++) {
      bb.writeByte(signSignatureBuffer[i]);
    }
  }

  bb.flip();

  return bb.toBuffer();
}

export default {
  getTransactionBytes: getTransactionBytes,
};
