const VALID_TOPICS = [
  'asset_issue',
]

async function validateAssetIssue(content) {
  if (!content || content.currency === undefined || content.amount === undefined) throw new Error('Invalid proposal content')
  if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(content.currency)) throw new Error('Invalid currency')
  app.validate('amount', String(content.amount))
}

export default {
  async propose(title, desc, topic, content, endHeight) {
    if (!/^[A-Za-z0-9_\-+!@$% ]{10,100}$/.test(title)) return 'Invalid proposal title'
    if (desc.length > 4096) return 'Invalid proposal description'
    if (VALID_TOPICS.indexOf(topic) === -1) return 'Invalid proposal topic'
    if (!Number.isInteger(endHeight) || endHeight < 0) return 'EndHeight should be positive integer'
    if (endHeight < this.block.height + 5760) return 'Invalid proposal finish date'

    if (topic === 'asset_issue') {
      await validateAssetIssue(content, this)
    }

    app.sdb.create('Proposal', {
      tid: this.trs.id,
      timestamp: this.trs.timestamp,
      title,
      desc,
      topic,
      content: JSON.stringify(content),
      activated: 0,
      height: this.block.height,
      endHeight,
      senderId: this.sender.address,
    })
    return null
  },

  async vote(pid) {
    if (!app.isCurrentBookkeeper(this.sender.address)) return 'Permission denied'
    const proposal = await app.sdb.findOne('Proposal', { condition: { tid: pid } })
    if (!proposal) return 'Proposal not found'
    // if (this.block.height - proposal.height > 8640 * 30) return 'Proposal expired'
    if (this.block.height - proposal.height > 5760 * 30) return 'Proposal expired'
    const exists = await app.sdb.exists('ProposalVote', { voter: this.sender.address, pid })
    if (exists) return 'Already voted'
    app.sdb.create('ProposalVote', {
      tid: this.trs.id,
      pid,
      voter: this.sender.address,
    })
    return null
  },

}
