import joi from '../../src/utils/extendedJoi';
import * as crypto from 'crypto';
import * as ed from '../../src/utils/ed';
import { copyObject } from './helpers';
import { Transaction, Context } from '../../src/interfaces';
import slots from '../../src/utils/slots';
import feeCalculators from '../../src/utils/calculate-fee';
import * as addressHelper from '../../src/utils/address';

export function transactionNormalize(old) {
  const transaction = copyObject(old);

  for (const i in transaction) {
    if (transaction[i] === null || typeof transaction[i] === 'undefined') {
      delete transaction[i];
    }
    if (Buffer.isBuffer(transaction[i])) {
      transaction[i] = transaction[i].toString();
    }
  }

  if (transaction.args && typeof transaction.args === 'string') {
    try {
      transaction.args = JSON.parse(transaction.args);
      if (!Array.isArray(transaction.args))
        throw new Error('Transaction args must be json array');
    } catch (e) {
      throw new Error(`Failed to parse args: ${e}`);
    }
  }

  if (transaction.signatures && typeof transaction.signatures === 'string') {
    try {
      transaction.signatures = JSON.parse(transaction.signatures);
    } catch (e) {
      throw new Error(`Failed to parse signatures: ${e}`);
    }
  }

  const signedTransactionSchema = joi.object().keys({
    fee: joi
      .number()
      .integer()
      .min(0)
      .required(),
    type: joi
      .number()
      .integer()
      .min(0)
      .required(),
    timestamp: joi
      .number()
      .integer()
      .min(0)
      .required(),
    args: joi.array().optional(),
    message: joi
      .string()
      .max(256)
      .allow('')
      .optional(),
    senderId: joi
      .string()
      .address()
      .required(),
    senderPublicKey: joi
      .string()
      .publicKey()
      .required(),
    signatures: joi
      .array()
      .length(1)
      .items(
        joi
          .string()
          .signature()
          .required()
      )
      .required()
      .single(),
    secondSignature: joi
      .string()
      .signature()
      .optional(),
    id: joi
      .string()
      .hex()
      .required(),
    height: joi
      .number()
      .integer()
      .optional(),
  });
  const report = joi.validate(transaction, signedTransactionSchema);
  if (report.error) {
    global.app.logger.error(
      `Failed to normalize transaction body: ${report.error.message}`,
      transaction
    );
    throw new Error(report.error.message);
  }

  return transaction;
}

function verifyBytes(bytes: Buffer, publicKey: string, signature: string) {
  try {
    const data2 = Buffer.alloc(bytes.length);

    for (let i = 0; i < data2.length; i++) {
      data2[i] = bytes[i];
    }

    const hash = crypto
      .createHash('sha256')
      .update(data2)
      .digest();
    const signatureBuffer = Buffer.from(signature, 'hex');
    const publicKeyBuffer = Buffer.from(publicKey, 'hex');
    return ed.verify(hash, signatureBuffer, publicKeyBuffer);
  } catch (e) {
    throw new Error(e.toString());
  }
}

export function verifyNormalSignature(
  transaction: Transaction,
  sender,
  bytes: Buffer
) {
  if (
    !verifyBytes(bytes, transaction.senderPublicKey, transaction.signatures[0])
  ) {
    return 'Invalid signature';
  }
  if (sender.secondPublicKey) {
    if (!transaction.secondSignature) return 'Second signature not provided';
    if (
      !verifyBytes(bytes, sender.secondPublicKey, transaction.secondSignature)
    ) {
      return 'Invalid second signature';
    }
  }
  return undefined;
}

export async function apply(context: Context) {
  const { block, trs, sender } = context;
  const name = global.app.getContractName(String(trs.type));
  if (!name) {
    throw new Error(`Unsupported transaction type: ${trs.type}`);
  }
  const [mod, func] = name.split('.');
  if (!mod || !func) {
    throw new Error('Invalid transaction function');
  }
  const fn = global.app.contract[mod][func];
  if (!fn) {
    throw new Error('Contract not found');
  }

  if (block.height !== 0) {
    if (sender.gny < trs.fee) throw new Error('Insufficient sender balance');
    sender.gny -= trs.fee;
    await global.app.sdb.update(
      'Account',
      { gny: sender.gny },
      { address: sender.address }
    );
  }

  const error = await fn.apply(context, trs.args);
  if (error) {
    throw new Error(error);
  }
  // transaction.executed = 1
  return null;
}

export async function verify(context: Context) {
  const { trs, sender } = context;
  if (slots.getSlotNumber(trs.timestamp) > slots.getSlotNumber()) {
    return 'Invalid transaction timestamp';
  }

  if (trs.type === undefined || trs.type === null) {
    return 'Invalid function';
  }

  const feeCalculator = feeCalculators[trs.type];
  if (!feeCalculator) return 'Fee calculator not found';
  const minFee = 100000000 * feeCalculator(trs);
  if (trs.fee < minFee) return 'Fee not enough';

  try {
    const bytes = this.getBytes(trs, true, true);
    if (trs.senderPublicKey) {
      const error = verifyNormalSignature(trs, sender, bytes);
      if (error) return error;
    } else {
      return 'Failed to verify signature';
    }
  } catch (e) {
    this.library.logger.error('verify signature excpetion', e);
    return 'Failed to verify signature';
  }
  return undefined;
}

export function create(data) {
  const transaction = {
    type: data.type,
    senderId: addressHelper.generateAddress(
      data.keypair.publicKey.toString('hex')
    ),
    senderPublicKey: data.keypair.publicKey.toString('hex'),
    timestamp: slots.getTime(undefined),
    message: data.message,
    args: data.args,
    fee: data.fee,
  } as Transaction;

  transaction.signatures = [this.sign(data.keypair, transaction)];

  if (data.secondKeypair) {
    transaction.secondSignature = this.sign(data.secondKeypair, transaction);
  }

  transaction.id = this.getHash(transaction).toString('hex');

  return transaction;
}
