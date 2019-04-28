export default {
  async registerIssuer(name, desc) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (!/^[A-Za-z]{1,16}$/.test(name)) return 'Invalid issuer name';
    if (!desc) return 'No issuer description was provided';
    const descJson = JSON.stringify(desc);
    if (descJson.length > 4096) return 'Invalid issuer description';

    const senderId = this.sender.address;
    await global.app.sdb.lock(`uia.registerIssuer@${senderId}`);
    let exists = await global.app.sdb.exists('Issuer', { name });
    if (exists) return 'Issuer name already exists';

    exists = await global.app.sdb.exists('Issuer', { issuerId: senderId });
    if (exists) return 'Account is already an issuer';

    await global.app.sdb.create('Issuer', {
      tid: this.trs.id,
      issuerId: senderId,
      name,
      desc: descJson,
    });
    return null;
  },

  async registerAsset(symbol, desc, maximum, precision) {
    if (arguments.length !== 4) return 'Invalid arguments length';
    if (!/^[A-Z]{3,6}$/.test(symbol)) return 'Invalid symbol';
    if (desc.length > 4096) return 'Invalid asset description';
    if (!Number.isInteger(precision) || precision <= 0)
      return 'Precision should be positive integer';
    if (precision > 16 || precision < 0) return 'Invalid asset precision';
    global.app.validate('amount', maximum);

    const issuer = await global.app.sdb.findOne('Issuer', {
      condition: { issuerId: this.sender.address },
    });
    if (!issuer) return 'Account is not an issuer';

    const fullName = `${issuer.name}.${symbol}`;
    await global.app.sdb.lock(`uia.registerAsset@${fullName}`);

    const exists = await global.app.sdb.exists('Asset', { name: fullName });
    if (exists) return 'Asset already exists';

    await global.app.sdb.create('Asset', {
      tid: this.trs.id,
      name: fullName,
      timestamp: this.trs.timestamp,
      desc,
      maximum,
      precision,
      quantity: '0',
      issuerId: this.sender.address,
    });
    return null;
  },

  async issue(name, amount) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(name)) return 'Invalid currency';
    global.app.validate('amount', amount);

    // Move the lock above the findOne so that first judging if it is in use in lock,
    // if it is not in use(can not find in cache), it can be updated.
    await global.app.sdb.lock(`uia.issue@${name}`);

    const asset = await global.app.sdb.findOne('Asset', { name });
    if (!asset) return 'Asset not exists';

    if (asset.issuerId !== this.sender.address) return 'Permission denied';
    const quantity = new global.app.util.bignumber(asset.quantity).plus(amount);
    if (quantity.gt(asset.maximum)) return 'Exceed issue limit';

    asset.quantity = quantity.toString(10);
    await global.app.sdb.update(
      'Asset',
      { quantity: asset.quantity },
      { name }
    );

    await global.app.balances.increase(this.sender.address, name, amount);
    return null;
  },

  async transfer(currency, amount, recipient) {
    if (arguments.length !== 3) return 'Invalid arguments length';
    if (currency.length > 30) return 'Invalid currency';
    if (!recipient || recipient.length > 50) return 'Invalid recipient';
    // if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(currency)) return 'Invalid currency'
    // if (!Number.isInteger(amount) || amount <= 0) return 'Amount should be positive integer'
    global.app.validate('amount', String(amount));
    const senderId = this.sender.address;
    const balance = await global.app.balances.get(senderId, currency);
    if (balance.lt(amount)) return 'Insufficient balance';

    let recipientAddress;
    let recipientName = '';
    if (recipient && global.app.util.address.isAddress(recipient)) {
      recipientAddress = recipient;
    } else {
      recipientName = recipient;
      const recipientAccount = await global.app.sdb.findOne('Account', {
        condition: { username: recipient },
      });
      if (!recipientAccount) return 'Recipient name not exist';
      recipientAddress = recipientAccount.address;
    }

    await global.app.balances.transfer(
      currency,
      amount,
      senderId,
      recipientAddress
    );
    await global.app.sdb.create('Transfer', {
      tid: this.trs.id,
      height: this.block.height,
      senderId,
      recipientId: recipientAddress,
      recipientName,
      currency,
      amount,
      timestamp: this.trs.timestamp,
    });
    return null;
  },
};
