async function deleteCreatedVotes(account) {
  interface Vote {
    voterAddress: string;
    delegate: string;
  }
  const voteList = (await global.app.sdb.findAll('Vote', {
    condition: { voterAddress: account.address },
  })) as Vote[];
  if (voteList && voteList.length > 0 && account.lockAmount > 0) {
    for (let i = 0; i < voteList.length; ++i) {
      const voteItem = voteList[i];

      await global.app.sdb.increase(
        'Delegate',
        { votes: -account.lockAmount },
        { username: voteItem.delegate }
      );
      await global.app.sdb.del('Vote', {
        voterAddress: voteItem.voterAddress,
        delegate: voteItem.delegate,
      });
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
  async transfer(amount, recipient) {
    if (!recipient) return 'Invalid recipient';
    // Verify amount should be positive integer
    // if (!Number.isInteger(amount) || amount <= 0) return 'Amount should be positive integer'
    global.app.validate('amount', String(amount));

    amount = Number(amount);
    const sender = this.sender;
    const senderId = sender.address;
    if (this.block.height > 0 && sender.gny < amount)
      return 'Insufficient balance';

    let recipientAccount;
    // Validate recipient is valid address
    if (recipient && global.app.util.address.isAddress(recipient)) {
      recipientAccount = await global.app.sdb.load('Account', {
        address: recipient,
      });
      if (recipientAccount) {
        await global.app.sdb.increase(
          'Account',
          { gny: amount },
          { address: recipientAccount.address }
        );
      } else {
        recipientAccount = await global.app.sdb.create('Account', {
          address: recipient,
          gny: amount,
          username: null,
        });
      }
    } else {
      recipientAccount = await global.app.sdb.load('Account', {
        username: recipient,
      });
      if (!recipientAccount) return 'Recipient name not exist';
      await global.app.sdb.increase(
        'Account',
        { gny: amount },
        { address: recipientAccount.address }
      );
    }
    await global.app.sdb.increase(
      'Account',
      { gny: -amount },
      { address: sender.address }
    );

    await global.app.sdb.create('Transfer', {
      tid: this.trs.id,
      height: this.block.height,
      senderId,
      recipientId: recipientAccount.address,
      recipientName: recipientAccount.username,
      currency: 'gny',
      amount: String(amount),
      timestamp: this.trs.timestamp,
    });
    return null;
  },

  async setUserName(username) {
    global.app.validate('name', username);

    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);

    const exists = await global.app.sdb.load('Account', { username: username });

    if (exists) return 'Name already registered';
    if (this.sender.username) return 'Name already set';
    this.sender.username = username;
    await global.app.sdb.update(
      'Account',
      { username },
      { address: this.sender.address }
    );

    return null;
  },

  async setSecondPassphrase(publicKey) {
    global.app.validate('publickey', publicKey);

    if (!global.app.util.address.isAddress(this.sender.address)) {
      return 'Invalid account type';
    }
    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);
    if (this.sender.secondPublicKey) return 'Password already set';
    this.sender.secondPublicKey = publicKey;
    await global.app.sdb.update(
      'Account',
      { secondPublicKey: publicKey },
      { address: this.sender.address }
    );
    return null;
  },

  async lock(height, amount) {
    if (!Number.isInteger(height) || height <= 0)
      return 'Height should be positive integer';
    // if (!Number.isInteger(amount) || amount <= 0) return 'Amount should be positive integer'

    height = Number(height);
    amount = Number(amount);
    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);

    // const MIN_LOCK_HEIGHT = 8640 * 30
    // 60/15 * 60 * 24 = 5760
    const MIN_LOCK_HEIGHT = 5760 * 30;
    const sender = this.sender;
    if (sender.gny - 100000000 < amount) return 'Insufficient balance';
    if (sender.isLocked) {
      if (
        height !== 0 &&
        height <
          Math.max(this.block.height, sender.lockHeight) + MIN_LOCK_HEIGHT
      ) {
        return 'Invalid lock height';
      }
      if (height === 0 && amount === 0) {
        return 'Invalid height or amount';
      }
    } else {
      if (height < this.block.height + MIN_LOCK_HEIGHT) {
        return 'Invalid lock height';
      }
      if (amount === 0) {
        return 'Invalid amount';
      }
    }

    if (!sender.isLocked) {
      sender.isLocked = 1;
    }
    if (height !== 0) {
      sender.lockHeight = height;
    }
    if (amount !== 0) {
      sender.gny -= amount;
      sender.lockAmount += amount;
      await global.app.sdb.update('Account', sender, {
        address: sender.address,
      });

      const voteList = await global.app.sdb.findAll('Vote', {
        condition: { voterAddress: senderId },
      });
      if (voteList && voteList.length > 0) {
        for (const voteItem of voteList) {
          await global.app.sdb.increase(
            'Delegate',
            { votes: amount },
            { username: voteItem.delegate }
          );
        }
      }
    }
    return null;
  },

  async unlock() {
    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);
    const sender = this.sender;
    if (!sender) return 'Account not found';
    if (!sender.isLocked) return 'Account is not locked';
    if (this.block.height <= sender.lockHeight) return 'Account cannot unlock';

    if (this.sender.isDelegate) {
      await deleteCreatedVotes(this.sender);
    }

    sender.isLocked = 0;
    sender.lockHeight = 0;
    sender.gny += sender.lockAmount;
    sender.lockAmount = 0;
    await global.app.sdb.update('Account', sender, { address: senderId });

    return null;
  },

  async registerDelegate() {
    const senderId = this.sender.address;
    if (this.block.height > 0)
      await global.app.sdb.lock(`basic.account@${senderId}`);
    const sender = this.sender;
    if (!sender) return 'Account not found';
    if (!sender.username) return 'Account has not a name';
    if (sender.isDelegate) return 'Account is already Delegate';

    await global.app.sdb.create('Delegate', {
      address: senderId,
      username: sender.username,
      tid: this.trs.id,
      publicKey: this.trs.senderPublicKey,
      votes: 0,
      producedBlocks: 0,
      missedBlocks: 0,
      fees: 0,
      rewards: 0,
    });
    sender.isDelegate = 1;
    await global.app.sdb.update(
      'Account',
      { isDelegate: 1 },
      { address: senderId }
    );

    return null;
  },

  async vote(delegates) {
    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);

    const sender = this.sender;
    if (!sender.isLocked) return 'Account is not locked';

    delegates = delegates.split(',');
    if (!delegates || !delegates.length) return 'Invalid delegates';
    if (delegates.length > 33) return 'Voting limit exceeded';
    if (!isUniq(delegates)) return 'Duplicated vote item';

    const currentVotes = await global.app.sdb.findAll('Vote', {
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
      const exists = await global.app.sdb.exists('Delegate', { username });
      if (!exists) return `Voted delegate not exists: ${username}`;
    }

    for (const username of delegates) {
      const votes = sender.lockAmount;
      await global.app.sdb.increase('Delegate', { votes }, { username });
      await global.app.sdb.create('Vote', {
        voterAddress: senderId,
        delegate: username,
      });
    }
    return null;
  },

  async unvote(delegates) {
    const senderId = this.sender.address;
    await global.app.sdb.lock(`basic.account@${senderId}`);

    const sender = this.sender;
    if (!sender.isLocked) return 'Account is not locked';

    delegates = delegates.split(',');
    if (!delegates || !delegates.length) return 'Invalid delegates';
    if (delegates.length > 33) return 'Voting limit exceeded';
    if (!isUniq(delegates)) return 'Duplicated vote item';

    const currentVotes = await global.app.sdb.findAll('Vote', {
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
      const exists = await global.app.sdb.exists('Delegate', { username });
      if (!exists) return `Voted delegate not exists: ${username}`;
    }

    for (const username of delegates) {
      const votes = -sender.lockAmount;
      await global.app.sdb.increase('Delegate', { votes }, { username });

      await global.app.sdb.del('Vote', {
        voterAddress: senderId,
        delegate: username,
      });
    }
    return null;
  },
};
