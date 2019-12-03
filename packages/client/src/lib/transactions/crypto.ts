import { generateAddress } from '@gny/utils';
export { getKeys } from '@gny/web-base';
import * as webBase from '@gny/web-base';
import { TransactionWebBase } from '@gny/web-base';

export const getAddress = generateAddress;
export const verify = webBase.verify;
export const verifySecondSignature = webBase.verifySecondSignature;
export const getBytes = TransactionWebBase.getBytes;
export const getHash = TransactionWebBase.getHash;
export const getId = TransactionWebBase.getId;
export const sign = TransactionWebBase.sign;
