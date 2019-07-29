import { IBlock, AccountViewModel } from '../../src/interfaces';
import * as addressHelper from '../../src/utils/address';
import joi from '../../src/utils/extendedJoi';
import Peer from '../../src/core/peer';
import { StateHelper } from '../../src/core/StateHelper';
import { BigNumber } from 'bignumber.js';
import { Transaction } from '../database-postgres/entity/Transaction';
import { Account } from '../database-postgres/entity/Account';

export default zscheme => (req, res, next) => {
  req.sanitize = function sanitize(value, scheme, callback) {
    return zscheme.validate(value, scheme, (err, valid) =>
      callback(
        null,
        {
          isValid: valid,
          issues: err ? `${err[0].message}: ${err[0].path}` : null,
        },
        value
      )
    );
  };
  next();
};

export async function getBlocks(
  minHeight: string,
  maxHeight: string,
  withTransaction: boolean
) {
  const blocks = await global.app.sdb.getBlocksByHeightRange(
    minHeight,
    maxHeight
  );

  if (!blocks || !blocks.length) {
    return [];
  }

  maxHeight = blocks[blocks.length - 1].height;
  if (withTransaction) {
    const transactions = await global.app.sdb.findAll<Transaction>(
      Transaction,
      {
        condition: {
          height: {
            $gte: minHeight,
            $lte: maxHeight,
          },
        },
      }
    );
    const firstHeight = blocks[0].height;
    for (const t of transactions) {
      const index = new BigNumber(t.height).minus(firstHeight).toFixed();
      const b = blocks[index];
      if (b) {
        if (!b.transactions) {
          b.transactions = [];
        }
        b.transactions.push(t);
      }
    }
  }

  return blocks;
}

// account helper
export function generateAddressByPublicKey(publicKey: string) {
  return addressHelper.generateAddress(publicKey);
}

// account helper
export async function getAccountByName(name: string) {
  try {
    const account = await global.app.sdb.findOne<Account>(Account, {
      condition: { username: name },
    });
    return account;
  } catch (err) {
    return 'Server Error';
  }
}

// account helper
export async function getAccount(address: string) {
  const schema = joi
    .string()
    .address()
    .required();
  const report = joi.validate(address, schema);
  if (report.error) {
    return 'provided address is not a GNY address';
  }

  try {
    const account = await global.app.sdb.findOne<Account>(Account, {
      condition: { address },
    });

    // TODO change balance -> gny in AccountViewModel
    let accountData: AccountViewModel = undefined;
    if (!account) {
      accountData = {
        address: address,
        balance: String(0),
        secondPublicKey: '',
        lockHeight: String(0),
        isDelegate: 0,
        username: null,
        publicKey: null,
      };
    } else {
      accountData = {
        address: account.address,
        balance: account.gny,
        secondPublicKey: account.secondPublicKey,
        lockHeight: account.lockHeight || String(0),
        isDelegate: account.isDelegate,
        username: account.username,
        publicKey: account.publicKey,
      };
    }
    const latestBlock = StateHelper.getState().lastBlock;
    const ret = {
      account: accountData,
      latestBlock: {
        height: latestBlock.height,
        timestamp: latestBlock.timestamp,
      },
      version: Peer.getVersion(),
    };
    return ret;
  } catch (e) {
    this.library.logger.error('Failed to get account', e);
    return 'Server Error';
  }
}
