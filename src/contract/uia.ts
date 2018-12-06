
async function isProposalApproved(pid, topic) {
  const proposal = await app.sdb.load('Proposal', pid)
  if (!proposal) throw new Error('Proposal not found')

  if (topic !== proposal.topic) {
    throw new Error('Unexpected proposal topic')
  }

  if (proposal.activated) return 'Already activated'

  const votes = await app.sdb.findAll('ProposalVote', { condition: { pid } })
  let validVoteCount = 0
  for (const v of votes) {
    if (app.isCurrentBookkeeper(v.voter)) {
      validVoteCount++
    }
  }
  if (validVoteCount <= Math.ceil(101 * 0.51)) return 'Vote not enough'
  return true
}

export default {
  async registerIssuer(name, desc) {
    if (!/^[A-Za-z]{1,16}$/.test(name)) return 'Invalid issuer name'
    if (!desc) return 'No issuer description was provided'
    const descJson = JSON.stringify(desc)
    if (descJson.length > 4096) return 'Invalid issuer description'

    const senderId = this.sender.address
    app.sdb.lock(`uia.registerIssuer@${senderId}`)
    let exists = await app.sdb.exists('Issuer', { name })
    if (exists) return 'Issuer name already exists'

    exists = await app.sdb.exists('Issuer', { issuerId: senderId })
    if (exists) return 'Account is already an issuer'

    app.sdb.create('Issuer', {
      tid: this.trs.id,
      issuerId: senderId,
      name,
      desc: descJson,
    })
    return null
  },

  async registerAsset(symbol, desc, maximum, precision) {
    if (!/^[A-Z]{3,6}$/.test(symbol)) return 'Invalid symbol'
    if (desc.length > 4096) return 'Invalid asset description'
    if (!Number.isInteger(precision) || precision <= 0) return 'Precision should be positive integer'
    if (precision > 16 || precision < 0) return 'Invalid asset precision'
    app.validate('amount', maximum)

    const issuer = await app.sdb.findOne('Issuer', { condition: { issuerId: this.sender.address } })
    if (!issuer) return 'Account is not an issuer'

    const fullName = `${issuer.name}.${symbol}`
    app.sdb.lock(`uia.registerAsset@${fullName}`)

    exists = await app.sdb.exists('Asset', { name: fullName })
    if (exists) return 'Asset already exists'

    app.sdb.create('Asset', {
      tid: this.trs.id,
      timestamp: this.trs.timestamp,
      name: fullName,
      desc,
      maximum,
      precision,
      quantity: '0',
      issuerId: this.sender.address,
    })
    return null
  },

  // async issue(name, amount) {
  async issue(pid) {
    const proposal = await app.sdb.findOne('Proposal', { condition: { tid: pid } })
    if (!proposal) return 'Proposal not found'
    if (proposal.activated) return 'Proposal was already activated'
    if (!isProposalApproved(pid, 'asset_issue')) return 'Proposal is not approved'
    const content = JSON.parse(proposal.content)
    const name = content.currency
    const amount = content.amount

    if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(name)) return 'Invalid currency'
    app.validate('amount', amount)
    app.sdb.lock(`uia.issue@${name}`)

    const asset = await app.sdb.load('Asset', name)
    if (!asset) return 'Asset not exists'
    if (asset.issuerId !== this.sender.address) return 'Permission denied'

    const quantity = app.util.bignumber(asset.quantity).plus(amount)
    if (quantity.gt(asset.maximum)) return 'Exceed issue limit'

    asset.quantity = quantity.toString(10)
    app.sdb.update('Asset', { quantity: asset.quantity }, { name })

    app.balances.increase(this.sender.address, name, amount)
    app.sdb.update('Proposal', { activated: 1 }, { tid: pid })
    return null
  },

  async transfer(currency, amount, recipient) {
    if (currency.length > 30) return 'Invalid currency'
    if (!recipient || recipient.length > 50) return 'Invalid recipient'
    // if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(currency)) return 'Invalid currency'
    // if (!Number.isInteger(amount) || amount <= 0) return 'Amount should be positive integer'
    app.validate('amount', String(amount))
    const senderId = this.sender.address
    const balance = app.balances.get(senderId, currency)
    if (balance.lt(amount)) return 'Insufficient balance'

    let recipientAddress
    let recipientName = ''
    if (recipient && app.util.address.isAddress(recipient)) {
      recipientAddress = recipient
    } else {
      recipientName = recipient
      const recipientAccount = await app.sdb.findOne('Account', { condition: { name: recipient } })
      if (!recipientAccount) return 'Recipient name not exist'
      recipientAddress = recipientAccount.address
    }

    app.balances.transfer(currency, amount, senderId, recipientAddress)
    app.sdb.create('Transfer', {
      tid: this.trs.id,
      height: this.block.height,
      senderId,
      recipientId: recipientAddress,
      recipientName,
      currency,
      amount,
      timestamp: this.trs.timestamp,
    })
    return null
  },
}
