import BigNumber from 'bignumber.js';
import {
  IAccount,
  ITransfer,
  IDelegate,
  Context,
  IBurn,
} from '@gny/interfaces';
import { Vote } from '@gny/database-postgres';
import { Account } from '@gny/database-postgres';
import { Delegate } from '@gny/database-postgres';
import { Transfer } from '@gny/database-postgres';
import { Burn } from '@gny/database-postgres';
import { isAddress } from '@gny/utils';

async function deleteCreatedVotes(account: IAccount) {
  const voteList = await global.app.sdb.findAll<Vote>(Vote, {
    condition: { voterAddress: account.address },
  });
  if (
    voteList &&
    voteList.length > 0 &&
    new BigNumber(account.lockAmount).isGreaterThan(0)
  ) {
    for (let i = 0; i < voteList.length; ++i) {
      const voteItem = voteList[i];

      await global.app.sdb.increase<Delegate>(
        Delegate,
        { votes: String(-account.lockAmount) },
        { username: voteItem.delegate }
      );
      const vote: Vote = {
        voterAddress: voteItem.voterAddress,
        delegate: voteItem.delegate,
      };
      await global.app.sdb.del<Vote>(Vote, vote);
    }
  }
}

function isUniq(arr) {
  const s = new Set();
  for (const i of arr) {
    if (s.has(i)) {
      return false;
    }
    s.add(i);
  }
  return true;
}

export default {
  async transfer(this: Context, amount, recipient) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (!recipient) return 'Invalid recipient';
    // Verify amount should be positive integer
    // if (!Number.isInteger(amount) || amount <= 0) return 'Amount should be positive integer'
    global.app.validate('amount', String(amount));

    amount = Number(amount);
    const sender = this.sender;
    const senderId = sender.address;
    if (
      new BigNumber(this.block.height).isGreaterThan(0) &&
      new BigNumber(sender.gny).isLessThan(amount)
    ) {
      return 'Insufficient balance';
    }

    if (senderId === recipient || sender.username === recipient) {
      return 'Invalid recipient';
    }

    let recipientAccount: IAccount;
    // Validate recipient is valid address
    if (recipient && isAddress(recipient)) {
      recipientAccount = await global.app.sdb.load<Account>(Account, {
        address: recipient,
      });
      if (recipientAccount) {
        await global.app.sdb.increase<Account>(
          Account,
          { gny: String(amount) },
          { address: recipientAccount.address }
        );
      } else {
        recipientAccount = await global.app.sdb.create<Account>(Account, {
          address: recipient,
          gny: String(amount),
          username: null,
        });
      }
    } else {
      recipientAccount = await global.app.sdb.load<Account>(Account, {
        username: recipient,
      });
      if (!recipientAccount) return 'Recipient name not exist';
      await global.app.sdb.increase<Account>(
        Account,
        { gny: String(amount) },
        { address: recipientAccount.address }
      );
    }
    await global.app.sdb.increase<Account>(
      Account,
      { gny: String(-amount) },
      { address: sender.address }
    );

    const transfer: ITransfer = {
      tid: this.trs.id,
      height: String(this.block.height),
      senderId,
      recipientId: recipientAccount.address,
      recipientName: recipientAccount.username,
      currency: 'GNY',
      amount: String(amount),
      timestamp: this.trs.timestamp,
    };
    await global.app.sdb.create<Transfer>(Transfer, transfer);
    return null;
  },

  async setUserName(this: Context, username) {
    if (arguments.length !== 1) return 'Invalid arguments length';
    global.app.validate('name', username);

    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);

    const exists = await global.app.sdb.load<Account>(Account, {
      username: username,
    });

    if (exists) return 'Name already registered';
    if (this.sender.username) return 'Name already set';
    this.sender.username = username;
    await global.app.sdb.update<Account>(
      Account,
      { username },
      { address: this.sender.address }
    );

    return null;
  },

  async setSecondPassphrase(this: Context, publicKey) {
    if (arguments.length !== 1) return 'Invalid arguments length';
    global.app.validate('publickey', publicKey);

    if (!isAddress(this.sender.address)) {
      return 'Invalid account type';
    }
    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);
    if (this.sender.secondPublicKey) return 'Password already set';
    this.sender.secondPublicKey = publicKey;
    await global.app.sdb.update<Account>(
      Account,
      { secondPublicKey: publicKey },
      { address: this.sender.address }
    );
    return null;
  },

  async lock(this: Context, height: BigNumber, amount: BigNumber) {
    if (arguments.length !== 2) return 'Invalid arguments length';

    global.app.validate('amount', String(height));
    global.app.validate('amount', String(amount));

    height = new BigNumber(height);
    amount = new BigNumber(amount);

    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);

    // const MIN_LOCK_HEIGHT = 8640 * 30
    // 60/15 * 60 * 24 = 5760
    const MIN_LOCK_HEIGHT = 5760 * 30;
    const sender = this.sender;
    if (new BigNumber(sender.gny).minus(100000000).isLessThan(amount)) {
      return 'Insufficient balance';
    }
    if (sender.isLocked) {
      if (
        BigNumber.max(this.block.height, sender.lockHeight)
          .plus(MIN_LOCK_HEIGHT)
          .isGreaterThan(height)
      ) {
        return 'Invalid lock height';
      }
    } else {
      if (
        height.isLessThan(
          new BigNumber(this.block.height).plus(MIN_LOCK_HEIGHT)
        )
      ) {
        return 'Invalid lock height';
      }
    }

    if (amount.isEqualTo(0)) {
      return 'Invalid amount';
    }

    if (!sender.isLocked) {
      sender.isLocked = 1;
    }
    if (!height.isEqualTo(0)) {
      sender.lockHeight = new BigNumber(height).toFixed();
    }
    if (!amount.isEqualTo(0)) {
      sender.gny = new BigNumber(sender.gny).minus(amount).toFixed();
      sender.lockAmount = new BigNumber(sender.lockAmount)
        .plus(amount)
        .toFixed();
      await global.app.sdb.update<Account>(Account, sender, {
        address: sender.address,
      });

      const voteList = await global.app.sdb.findAll<Vote>(Vote, {
        condition: { voterAddress: senderId },
      });
      if (voteList && voteList.length > 0) {
        for (const voteItem of voteList) {
          await global.app.sdb.increase<Delegate>(
            Delegate,
            { votes: String(amount) },
            { username: voteItem.delegate }
          );
        }
      }
    }
    return null;
  },

  async unlock(this: Context) {
    if (arguments.length !== 0) return 'Invalid arguments length';
    const sender = this.sender;
    if (!sender) return 'Account not found';
    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);
    if (!sender.isLocked) return 'Account is not locked';
    if (
      new BigNumber(this.block.height).isLessThanOrEqualTo(sender.lockHeight)
    ) {
      return 'Account cannot unlock';
    }

    // in order to not break the chain
    // mainnet between 3,500,000 and 8,150,000 should keep running this bug
    // issue: #582
    if (
      global.Config.netVersion === 'mainnet' &&
      new BigNumber(this.block.height).isGreaterThan(3500000) &&
      new BigNumber(this.block.height).isLessThan(8150000) &&
      this.sender.isDelegate // keep the bug for mainnet and this period alive
    ) {
      await deleteCreatedVotes(this.sender);
    } else {
      await deleteCreatedVotes(this.sender);
    }

    sender.isLocked = 0;
    sender.lockHeight = String(0);
    sender.gny = new BigNumber(sender.gny).plus(sender.lockAmount).toFixed();
    sender.lockAmount = String(0);
    await global.app.sdb.update<Account>(Account, sender, {
      address: senderId,
    });

    return null;
  },

  async registerDelegate(this: Context) {
    if (arguments.length !== 0) return 'Invalid arguments length';
    const sender = this.sender;
    if (!sender) return 'Account not found';

    const senderId = this.sender.address;
    if (new BigNumber(this.block.height).isGreaterThan(0))
      await global.app.sdb.lock(`basic.account@${senderId}`);

    if (!sender.username) return 'Account has not a name';
    if (sender.isDelegate) return 'Account is already Delegate';

    const delegate: IDelegate = {
      address: senderId,
      username: sender.username,
      tid: this.trs.id,
      publicKey: this.trs.senderPublicKey,
      votes: String(0),
      producedBlocks: String(0),
      missedBlocks: String(0),
      fees: String(0),
      rewards: String(0),
    };
    await global.app.sdb.create<Delegate>(Delegate, delegate);
    sender.isDelegate = 1;
    await global.app.sdb.update<Account>(
      Account,
      { isDelegate: 1 },
      { address: senderId }
    );

    return null;
  },

  async vote(this: Context, delegates) {
    if (arguments.length !== 1) return 'Invalid arguments length';
    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);

    const sender = this.sender;
    if (!sender.isLocked) return 'Account is not locked';

    if (typeof delegates !== 'string') return 'Invalid delegates';
    delegates = delegates.split(',');
    if (delegates.length > 33) return 'Voting limit exceeded';
    if (!isUniq(delegates)) return 'Duplicated vote item';

    // validate all passed in delegates
    for (let i = 0; i < delegates.length; ++i) {
      const one = delegates[i];
      global.app.validate('name', one);
    }

    // check if all passed in delegates exists in DB
    for (const username of delegates) {
      const exists = await global.app.sdb.exists<Delegate>(Delegate, {
        username,
      });
      if (!exists) return `Voted delegate not exists: ${username}`;
    }

    if (
      (global.Config.netVersion === 'testnet' &&
        new BigNumber(this.block.height).isGreaterThan(3130000)) ||
      (global.Config.netVersion === 'mainnet' &&
        new BigNumber(this.block.height).isGreaterThan(3500000)) ||
      (global.Config.netVersion === 'testnet_app' &&
        new BigNumber(this.block.height).isGreaterThan(2700000)) ||
      (global.Config.netVersion === 'localnet' &&
        new BigNumber(this.block.height).isGreaterThan(0))
    ) {
      for (let i = 0; i < delegates.length; ++i) {
        const one = delegates[i];

        const account = await global.app.sdb.findOne<Account>(Account, {
          condition: {
            username: one,
          },
        });
        if (new BigNumber(account.lockAmount).isLessThan(187500 * 1e8)) {
          return 'one of the delegate has not 187500 GNY locked';
        }
      }
    }

    const currentVotes = await global.app.sdb.findAll<Vote>(Vote, {
      condition: { voterAddress: senderId },
    });
    if (currentVotes) {
      if (currentVotes.length + delegates.length > 101) {
        return 'Maximum number of votes exceeded';
      }
      const currentVotedDelegates = new Set();
      for (const v of currentVotes) {
        currentVotedDelegates.add(v.delegate);
      }
      for (const name of delegates) {
        if (currentVotedDelegates.has(name)) {
          return `Already voted for delegate: ${name}`;
        }
      }
    }

    for (const username of delegates) {
      const votes = sender.lockAmount;
      await global.app.sdb.increase<Delegate>(
        Delegate,
        { votes: String(votes) },
        { username }
      );
      const v: Vote = {
        voterAddress: senderId,
        delegate: username,
      };
      await global.app.sdb.create<Vote>(Vote, v);
    }
    return null;
  },

  async unvote(this: Context, delegates) {
    if (arguments.length !== 1) return 'Invalid arguments length';
    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);

    const sender = this.sender as IAccount;
    if (!sender.isLocked) return 'Account is not locked';

    if (typeof delegates !== 'string') return 'Invalid delegates';
    delegates = delegates.split(',');
    if (delegates.length > 33) return 'Voting limit exceeded';
    if (!isUniq(delegates)) return 'Duplicated vote item';

    const currentVotes = await global.app.sdb.findAll<Vote>(Vote, {
      condition: { voterAddress: senderId },
    });
    if (currentVotes) {
      const currentVotedDelegates = new Set();
      for (const v of currentVotes) {
        currentVotedDelegates.add(v.delegate);
      }
      for (const name of delegates) {
        if (!currentVotedDelegates.has(name)) {
          return `Delegate not voted yet: ${name}`;
        }
      }
    }

    for (const username of delegates) {
      const exists = await global.app.sdb.exists<Delegate>(Delegate, {
        username,
      });
      if (!exists) return `Voted delegate not exists: ${username}`;
    }

    for (const username of delegates) {
      const votes = new BigNumber(sender.lockAmount).times(-1).toFixed();
      await global.app.sdb.increase<Delegate>(
        Delegate,
        { votes: String(votes) },
        { username }
      );

      const v: Vote = {
        voterAddress: senderId,
        delegate: username,
      };
      await global.app.sdb.del<Vote>(Vote, v);
    }
    return null;
  },

  async burn(this: Context, amount) {
    if (arguments.length !== 1) return 'Invalid arguments length';
    global.app.validate('amount', String(amount));

    const sender = this.sender;
    if (new BigNumber(sender.gny).minus(0.1 * 1e8).isLessThan(amount)) {
      return 'Insufficient balance';
    }
    await global.app.sdb.lock(`basic.burn@${sender.address}`);

    const oneMillion = new BigNumber(1000000).times(1e8).toFixed(0);
    if (new BigNumber(amount).isGreaterThan(oneMillion)) {
      return 'Only 1 million can be burned at once';
    }

    await global.app.sdb.increase<Account>(
      Account,
      { gny: String(-amount) },
      { address: sender.address }
    );

    const burn: IBurn = {
      tid: this.trs.id,
      height: String(this.block.height),
      amount: String(amount),
      timestamp: this.trs.timestamp,
      senderId: sender.address,
    };
    await global.app.sdb.create<Burn>(Burn, burn);
    return null;
  },
};
