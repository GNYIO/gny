import { generateAddress } from '@gnyio/utils';
export { getKeys } from '@gnyio/web-base';
import * as webBase from '@gnyio/web-base';
import { TransactionWebBase } from '@gnyio/web-base';

export const getAddress = generateAddress;
export const verify = webBase.verify;
export const verifySecondSignature = webBase.verifySecondSignature;
export const getBytes = TransactionWebBase.getBytes;
export const getHash = TransactionWebBase.getHash;
export const getId = TransactionWebBase.getId;
export const sign = TransactionWebBase.sign;
export const secondSign = TransactionWebBase.sign;
