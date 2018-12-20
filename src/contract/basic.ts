async function doCancelVote(account) {
  const voteList = await global.app.sdb.findAll('Vote', { condition: { address: account.address } })
  if (voteList && voteList.length > 0 && account.weight > 0) {
    for (const voteItem of voteList) {
      global.app.sdb.increase('Delegate', { votes: -account.weight }, { name: voteItem.delegate })
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
    if (this.block.height > 0 && sender.gny < amount) return 'Insufficient balance';

    let recipientAccount;
    // Validate recipient is valid address
    if (recipient && global.app.util.address.isAddress(recipient)) {
      recipientAccount = await global.app.sdb.load('Account', recipient);
      if (recipientAccount) {
        global.app.sdb.increase('Account', { gny: amount }, { address: recipientAccount.address });
      } else {
        recipientAccount = global.app.sdb.create('Account', {
          address: recipient,
          gny: amount,
          username: null,
        });
      }
    } else {
      recipientAccount = await global.app.sdb.load('Account', { username: recipient });
      if (!recipientAccount) return 'Recipient name not exist';
      global.app.sdb.increase('Account', { gny: amount }, { address: recipientAccount.address });
    }
    global.app.sdb.increase('Account', { gny: -amount }, { address: sender.address });

    global.app.sdb.create('Transfer', {
      transactionId: this.trs.id,
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
    global.app.sdb.lock(`basic.account@${senderId}`);

    const exists = await global.app.sdb.load('Account', { username });
    if (exists) return 'Name already registered';
    if (this.sender.username) return 'Name already set';
    this.sender.username = username;
    global.app.sdb.update('Account', { username }, { address: this.sender.address });

    return null;
  },

  async setPassword(publicKey) {
    global.app.validate('publickey', publicKey);

    if (!global.app.util.address.isAddress(this.sender.address)) {
      return 'Invalid account type';
    }
    const senderId = this.sender.address;
    global.app.sdb.lock(`basic.account@${senderId}`);
    if (this.sender.secondPublicKey) return 'Password already set';
    this.sender.secondPublicKey = publicKey;
    global.app.sdb.update('Account', { secondPublicKey: publicKey }, { address: this.sender.address });
    return null;
  },

  async lock(height, amount) {
    if (!Number.isInteger(height) || height <= 0) return 'Height should be positive integer';
    // if (!Number.isInteger(amount) || amount <= 0) return 'Amount should be positive integer'

    height = Number(height);
    amount = Number(amount);
    const senderId = this.sender.address;
    global.app.sdb.lock(`basic.account@${senderId}`);

    // const MIN_LOCK_HEIGHT = 8640 * 30
    // 60/15 * 60 * 24 = 5760
    const MIN_LOCK_HEIGHT = 5760 * 30;
    const sender = this.sender;
    if (sender.gny - 100000000 < amount) return 'Insufficient balance';
    if (sender.isLocked) {
      if (height !== 0
        && height < (Math.max(this.block.height, sender.lockHeight) + MIN_LOCK_HEIGHT)) {
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
      sender.weight += amount;
      global.app.sdb.update('Account', sender, { address: sender.address });

      const voteList = await global.app.sdb.findAll('Vote', { condition: { address: senderId } });
      if (voteList && voteList.length > 0) {
        for (const voteItem of voteList) {
          global.app.sdb.increase('Delegate', { votes: amount }, { username: voteItem.delegate });
        }
      }
    }
    return null;
  },

  async unlock() {
    const senderId = this.sender.address;
    global.app.sdb.lock(`basic.account@${senderId}`);
    const sender = this.sender;
    if (!sender) return 'Account not found';
    if (!sender.isLocked) return 'Account is not locked';
    if (this.block.height <= sender.lockHeight) return 'Account cannot unlock';

    sender.isLocked = 0;
    sender.lockHeight = 0;
    sender.gny += sender.weight;
    sender.weight = 0;
    global.app.sdb.update('Account', sender, { address: senderId });

    return null;
  },

  // async registerGroup(name, members, min, max, m, updateInterval) {
  //   global.app.validate('name', name)
  //   // rule: min, max, m, updateInterval should be integer
  //   // rule：min >=3, min < max, updateInterval > 1
  //   if (!Number.isInteger(min) || min <= 0) return 'Min should be positive integer'
  //   if (!Number.isInteger(max) || max <= 0) return 'Max should be positive integer'
  //   if (!Number.isInteger(m) || m <= 0) return 'M should be positive integer'
  //   if (!Number.isInteger(updateInterval) || updateInterval <= 0) return 'UpdateInterval should be positive integer'

  //   if (min < 3) return 'Min should be greater than 3'
  //   if (min >= max) return 'Max should be greater than min'
  //   if (updateInterval < 1) return 'UpdateInterval should be greater than 1'

  //   for (const member of members) {
  //     // member.weight should be integer
  //     // member.address should have valid address format
  //     global.app.validate('name', member.name)
  //     if (!Number.isInteger(member.weight) || member.weight <= 0) return 'Member weight should be positive integer'
  //     if (!global.app.util.address.isAddress(member.address)) {
  //       return 'Invalid member address'
  //     }
  //   }

  //   if (await global.app.sdb.load('Account', { name })) return 'Name already registered'
  //   const address = global.app.util.address.generateGroupAddress(name)
  //   const account = await global.app.sdb.load('Account', address)
  //   if (!account) {
  //     global.app.sdb.create('Account', {
  //       address,
  //       name,
  //       gny: 0,
  //     })
  //   }
  //   global.app.sdb.create('Group', {
  //     name,
  //     address,
  //     tid: this.trs.id,
  //     min,
  //     max,
  //     m,
  //     updateInterval,
  //     createTime: this.trs.timestamp,
  //   })
  //   for (const member of members) {
  //     global.app.sdb.create('GroupMember', {
  //       name,
  //       member: member.address,
  //       weight: member.weight,
  //     })
  //   }
  //   return null
  // },



  async registerDelegate() {
    const senderId = this.sender.address
    if (this.block.height > 0) global.app.sdb.lock(`basic.account@${senderId}`)
    const sender = this.sender
    if (!sender) return 'Account not found'
    if (!sender.username) return 'Account has not a name'
    if (sender.role) return 'Account already have a role'

    global.app.sdb.create('Delegate', {
      address: senderId,
      username: sender.username,
      transactionId: this.trs.id,
      publicKey: this.trs.senderPublicKey,
      votes: 0,
      producedBlocks: 0,
      missedBlocks: 0,
      fees: 0,
      rewards: 0,
    })
    sender.isDelegate = 1;
    sender.role = global.app.AccountRole.DELEGATE;
    global.app.sdb.update('Account', { isDelegate: 1, role: global.app.AccountRole.DELEGATE }, { address: senderId });

    return null;
  },

  async vote(delegates) {
    const senderId = this.sender.address;
    global.app.sdb.lock(`basic.account@${senderId}`);

    const sender = this.sender;
    if (!sender.isLocked) return 'Account is not locked';

    delegates = delegates.split(',');
    if (!delegates || !delegates.length) return 'Invalid delegates';
    if (delegates.length > 33) return 'Voting limit exceeded';
    if (!isUniq(delegates)) return 'Duplicated vote item';

    const currentVotes = await global.app.sdb.findAll('Vote', { condition: { address: senderId } });
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
          return `Delegate already voted: ${name}`;
        }
      }
    }

    for (const name of delegates) {
      const exists = await global.app.sdb.exists('Delegate', { name });
      if (!exists) return `Voted delegate not exists: ${name}`;
    }

    for (const name of delegates) {
      const votes = (sender.weight);
      global.app.sdb.increase('Delegate', { votes }, { name });
      global.app.sdb.create('Vote', {
        address: senderId,
        delegate: name,
      });
    }
    return null;
  },

  async unvote(delegates) {
    const senderId = this.sender.address;
    global.app.sdb.lock(`account@${senderId}`);

    const sender = this.sender;
    if (!sender.isLocked) return 'Account is not locked';

    delegates = delegates.split(',');
    if (!delegates || !delegates.length) return 'Invalid delegates';
    if (delegates.length > 33) return 'Voting limit exceeded';
    if (!isUniq(delegates)) return 'Duplicated vote item';

    const currentVotes = await global.app.sdb.findAll('Vote', { condition: { address: senderId } });
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

    for (const name of delegates) {
      const exists = await global.app.sdb.exists('Delegate', { name });
      if (!exists) return `Voted delegate not exists: ${name}`;
    }

    for (const name of delegates) {
      const votes = -(sender.weight);
      global.app.sdb.increase('Delegate', { votes }, { name });

      global.app.sdb.del('Vote', { address: senderId, delegate: name });
    }
    return null;
  },
};
