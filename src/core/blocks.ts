import assert = require('assert');
import crypto = require('crypto');
import async = require('async');
import util = require('util');
import isArray = require('util').isArray;
import BlockStatus from '../utils/block-status';
import Router = require('../utils/router');
import slots = require('../utils/slots');
import sandboxHelper = require('../utils/sandbox');
import addressHelper = require('../utils/address');
import transactionMode = require('../utils/transaction-mode');

export class Block {
  modules: any;
  library: any;
  genesisBlock: any;
  private lastBlock = {};
  private blockStatus = new BlockStatus();
  private isLoaded: boolean = false;
  private isActive: boolean = false;
  private blockCache = {};
  private proposeCache = {};
  private lastPropose = null;
  private isCollectingVotes = false;

  constructor(scope: any) {
    this.library = scope;
    this.genesisBlock = scope.genesisBlock;
    this.attachAPI();
  }

  private attachAPI() {
    const router = new Router();

    router.use((req, res, next) => {
      if (modules) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    })

    router.map(shared, {
      'get /get': 'getBlock',
      'get /full': 'getFullBlock',
      'get /': 'getBlocks',
      'get /getHeight': 'getHeight',
      'get /getMilestone': 'getMilestone',
      'get /getReward': 'getReward',
      'get /getSupply': 'getSupply',
      'get /getStatus': 'getStatus',
    })

    router.use((req, res) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' })
    })

    this.library.network.app.use('/api/blocks', router)
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next()
      this.library.logger.error(req.url, err.toString());
      return res.status(500).send({ success: false, error: err.toString() });
    })
  }

  async getIdSequence2(height: number) {
    try {
      const maxHeight = Math.max(height, this.lastBlock.height);
      const minHeight = Math.max(0, maxHeight - 4);
      let blocks = await app.sdb.getBlocksByHeightRange(minHeight, maxHeight);
      blocks = blocks.reverse();
      const ids = blocks.map(b => b.id);
      return { ids, firstHeight: minHeight };
    } catch (e) {
      throw e;
    }
  }

  async getCommonBlock(peer, height: number) {
    const lastBlockHeight = height;


  }
}