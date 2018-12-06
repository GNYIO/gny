import * as crypto from 'crypto';
import * as Mnemonic from 'bitcore-mnemonic';

import * as ed from '../utils/ed';
import Router from '../utils/router';
import * as addressHelper from '../utils/address';

export default class Account {
  modules: any;
  library: any;
  shared = {};

  constructor(scope: any) {
    this.library = scope;
    this.attachApi();
  }

  openAccount(passphrase) {
    const hash = crypto.createHash('sha256').update(passphrase, 'utf8').digest();
    const keyPair = ed.MakeKeypair(hash);
    const publicKey = keyPair.publicKey.toString('hex');
    const address = this.generateAddressByPublicKey(publicKey);

    this.shared.getAccount({
      body: {
        address
      }
    }, (err, ret) => {
      if (ret && ret.account && !ret.account.publicKey) {
        ret.account.publicKey = publicKey;
      }
      return ret;
    })
  }

  openAccount2(publicKey) {
    const address = this.generateAddressByPublicKey(publicKey);
    this.shared.getAccount({
      body: {
        address
      }
    }, (err, ret) => {
      if (ret && ret.account && !ret.account.publicKey) {
        ret.account.publicKey = publicKey;
      }
      return ret;
    })
  }

  generateAddressByPublicKey(publicKey) {
    return addressHelper.generateNormalAddress(publicKey);
  }

  onBind(scope: any) {
    this.modules = scope;
  }

  newAccount(req: any) {
    let ent = Number(req.body.ent);
    if ([128, 256, 384].indexOf(ent) === -1) {
      ent = 128;
    }
    const secret = new Mnemonic(ent).toString();
    const keypair = ed.MakeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());
    const address = this.generateAddressByPublicKey(keypair.publicKey);
    return {
      secret,
      publicKey: keypair.publicKey.toString('hex'),
      privateKey: keypair.privateKey.toString('hex'),
      address,
    };
  }

  open(req: any) {
    const { body } = req;
    this.library.scheme.validate(body, {
      type: 'object',
      properties: {
        secret: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
        },
      },
      required: ['secret'],
    }, (err: any) => {
      if (err) {
        return err[0].message;
      }
      return this.openAccount(body.secret);
    });
  }

  open2(req: any) {
    const { body } = req;
    this.library.scheme.validate(body, {
      type: 'object',
      properties: {
        publicKey: {
          type: 'string',
          format: 'publicKey',
        },
      },
      required: ['publicKey'],
    }, (err: any) => {
      if (err) {
        return err[0].message;
      }
      return this.openAccount2(body.publicKey);
    });
  }

  getBalance(req) {
    const query = req.body;
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          minLength: 1,
          maxLength: 50,
        },
      },
      required: ['address'],
    }, (err: any) => {
      if (err) {
        return err[0].message;
      }

      if (!addressHelper.isAddress(query.address)) {
        return 'Invalid address';
      }

      return this.getAccount({ body: { address: query.address } }, (err2, ret) => {
        if (err2) {
          return err2.toString();
        }
        const balance = ret && ret.account ? ret.account.balance : 0;
        const unconfirmedBalance = ret && ret.account ? ret.account.unconfirmedBalance : 0;
        return { balance, unconfirmedBalance };
      });
    });
  }

  getPublickey(req) {
    const query = req.body;
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          minLength: 1,
        },
      },
      required: ['address'],
    }, (err: any) => {
      if (err) {
        return err[0].message;
      }

      return this.getAccount({ address: query.address }, (err2, account) => {
        if (err2) {
          return err2.toString();
        }
        if (!account || !account.publicKey) {
          return 'Account does not have a public key';
        }
        return { publicKey: account.publicKey };
      });
    });
  }

  generatePublickey(req) {
    const { body } = req;
    this.library.scheme.validate(body, {
      type: 'object',
      properties: {
        secret: {
          type: 'string',
          minLength: 1,
        },
      },
      required: ['secret'],
    }, (err: any) => {
      if (err) {
        return err[0].message;
      }

      const kp = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());
      const publicKey = kp.publicKey.toString('hex');
      return { publicKey };
    });
  }

  myVotedDelegates(req: any) {
    const query = req.body;
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          minLength: 1,
        },
        name: {
          type: 'string',
          minLength: 1,
        },
      },
    }, (err: any) => {
      if (err) {
        return err[0].message;
      }

      return (async () => {
        try {
          let addr;
          if (query.name) {
            const account = await this.library.sdb.load('Account', { name: query.name });
            if (!account) {
              return 'Account not found';
            }
            addr = account.address;
          } else {
            addr = query.address;
          }
          const votes = await this.library.sdb.findAll('Vote', { condition: { address: addr } });
          if (!votes || !votes.length) {
            return { delegates: [] };
          }
          const delegateNames = new Set();
          for (const v of votes) {
            delegateNames.add(v.delegate);
          }
          const delegates = await PIFY(modules.delegates.getDelegates)({});
          if (!delegates || !delegates.length) {
            return { delegates: [] };
          }

          const myVotedDelegates = delegates.filter(d => delegateNames.has(d.name));
          return { delegates: myVotedDelegates };
        } catch (e) {
          this.library.logger.error('get voted delegates error', e);
          return 'Server error';
        }
      })();
    });
  }

  getAccount(req) {
    const query = req.body;
    this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          minLength: 1,
          mexLength: 50,
        },
      },
      required: ['address'],
    }, (err: any) => {
      if (err) {
        return err[0].message;
      }

      return (async () => {
        try {
          const account = await this.library.sdb.findOne('Account', { condition: { address: query.address } });
          let accountData;
          if (!account) {
            accountData = {
              address: query.address,
              unconfirmedBalance: 0,
              balance: 0,
              secondPublicKey: '',
              lockHeight: 0,
            };
          } else {
            const unconfirmedAccount = await this.library.sdb.load('Account', { address: account.address });
            accountData = {
              address: account.address,
              unconfirmedBalance: unconfirmedAccount.aec,
              balance: account.aec,
              secondPublicKey: account.secondPublicKey,
              lockHeight: account.lockHeight || 0,
            };
          }
          const latestBlock = this.modules.blocks.getLastBlock();
          const ret = {
            account: accountData,
            latestBlock: {
              height: latestBlock.height,
              timestamp: latestBlock.timestamp,
            },
            version: this.modules.peer.getVersion(),
          };
          return ret;
        } catch (e) {
          this.library.logger.error('Failed to get account', e)
          return 'Server Error';
        }
      })();
    });
  }

  private attachApi() {
    const router1 = new Router();
    const router = router1.router;


    router.use((req, res, next) => {
      if (this.modules) return next();
      return res.status(500).send({
        success: false,
        error: 'Blockchain is syncing'
      });
    });

    // router.map(this.shared, {
    //   'post /open': 'open',
    //   'post /open2': 'open2',
    //   'get /getBalance': 'getBalance',
    //   'get /getPublicKey': 'getPublicKey',
    //   'post /generatePublicKey': 'generatePublicKey',
    //   'get /delegates': 'myVotedDelegates',
    //   'get /': 'getAccount',
    //   'get /new': 'newAccount',
    // });

    router.get('/count', (req, res) => (async () => {
      try {
        const count = await this.library.sdb.count('Account')
        return res.json({ success: true, count })
      } catch (e) {
        return res.status(500).send({ success: false, error: 'Server error' })
      }
    })());

    router.use((req, res) => {
      res.status(500).send({
        success: false,
        error: 'API endpoint not found',
      })
    })

    this.library.network.app.use('/api/accounts', router);
    this.library.network.app.use((err: any, req: any, res: any, next: any) => {
      if (!err) return next();
      this.library.logger.error(req.url, err);
      return res.status(500).send({
        success: false,
        error: err.toString(),
      });
    });
  }
}