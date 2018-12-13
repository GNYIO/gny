import * as _ from 'lodash';

export default (router) => {
  router.get('/', async (req) => {
    const query = req.query
    const offset = query.offset ? Number(query.offset) : 0
    const limit = query.limit ? Number(query.limit) : 20
    let minHeight
    let maxHeight
    let needReverse = false
    if (query.orderBy === 'height:desc') {
      needReverse = true
      maxHeight = modules.blocks.getLastBlock().height - offset
      minHeight = (maxHeight - limit) + 1
      minHeight = minHeight > 0 ? minHeight : 0
    } else {
      minHeight = offset
      maxHeight = (offset + limit) - 1
    }
    const withTransactions = !!query.transactions
    let blocks = await modules.blocks.getBlocks(minHeight, maxHeight, withTransactions)
    if (needReverse) {
      blocks = _.reverse(blocks)
    }
    const count = global.app.sdb.blocksCount
    return { count, blocks }
  })

  router.get('/:idOrHeight', async (req) => {
    const idOrHeight = req.params.idOrHeight
    let block
    if (idOrHeight.length === 64) {
      let id = idOrHeight
      block = await global.app.sdb.getBlockById(id)
    } else {
      let height = Number(idOrHeight)
      if (Number.isInteger(height) && height >= 0) {
        block = await global.app.sdb.getBlockByHeight(height)
      }
    }
    if (!block) throw new Error('Block not found')
    if (!!req.query.transactions) {
      const transactions = await global.app.sdb.findAll('Transaction', {
        condition: {
          height: block.height,
        },
      })
      block.transactions = transactions
    }
    return { block }
  })
}
