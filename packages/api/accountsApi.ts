import * as express from 'express';
import * as ed from '../../src/utils/ed'
import * as Mnemonic from 'bitcore-mnemonic';
import * as addressHelper from '../../src/utils/address';
import * as crypto from 'crypto';
import { Modules, IScope } from '../../src/interfaces';
import PIFY from 'pify';

export default class AccountsApi {
  private modules: Modules;
  private library: IScope;

  constructor (modules: Modules, library: IScope) {
    this.modules = modules;
    this.library = library;

    this.attachApi();
  }

  private generatePublicKey(req) {
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

      const kp = ed.generateKeyPair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());
      const publicKey = kp.publicKey.toString('hex');
      return { publicKey };
    });
  }

  private open(req: any) {
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

  private open2(req: any) {
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

  private getBalance(req: any) {
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
          const account = await global.app.sdb.findOne('Account', { condition: { address: query.address } });
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
            accountData = {
              address: account.address,
              unconfirmedBalance: unconfirmedAccount.gny,
              balance: account.gny,
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
          this.library.logger.error('Failed to get account', e);
          return 'Server Error';
        }
      })();
    });
  }

  private newAccount(req: any) {
    let ent = Number(req.body.ent);
    if ([128, 256, 384].indexOf(ent) === -1) {
      ent = 128;
    }
    const secret = new Mnemonic(ent).toString();
    const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(secret, 'utf8').digest());
    const address = this.generateAddressByPublicKey(keypair.publicKey);
    return {
      secret,
      publicKey: keypair.publicKey.toString('hex'),
      privateKey: keypair.privateKey.toString('hex'),
      address,
    };
  }


  openAccount(passphrase) {
    const hash = crypto.createHash('sha256').update(passphrase, 'utf8').digest();
    const keyPair = ed.generateKeyPair(hash);
    const publicKey = keyPair.publicKey.toString('hex');
    const address = this.generateAddressByPublicKey(publicKey);

    this.getAccount({
      body: {
        address
      }
    }, (err, ret) => {
      if (ret && ret.account && !ret.account.publicKey) {
        ret.account.publicKey = publicKey;
      }
      return ret;
    });
  }


  private openAccount2 = (publicKey: any) => {
    const address = this.generateAddressByPublicKey(publicKey);
    this.getAccount({
      body: {
        address
      }
    }, (err, ret) => {
      if (ret && ret.account && !ret.account.publicKey) {
        ret.account.publicKey = publicKey;
      }
      return ret;
    });
  }

  private getPublicKey = (req) => {
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

  private generateAddressByPublicKey = (publicKey) => {
    return addressHelper.generateAddress(publicKey);
  }

  private myVotedDelegates = (req: any) => {
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
            const account = await global.app.sdb.load('Account', { name: query.name });
            if (!account) {
              return 'Account not found';
            }
            addr = account.address;
          } else {
            addr = query.address;
          }
          const votes = await global.app.sdb.findAll('Vote', { condition: { address: addr } });
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

  private getAddress = async (req) => {
    const condition: { name?: string; address?: string; } = {};
    if (req.params.address.length <= 20) {
      condition.name = req.params.address;
    } else {
      condition.address = req.params.address;
    }

    const account = await global.app.sdb.findOne('Account', { condition });
    let unconfirmedAccount = null;
    if (account) {
      unconfirmedAccount = await global.app.sdb.load('Account', account.address);
    } else {
      unconfirmedAccount = null;
    }

    const lastBlock = this.modules.blocks.getLastBlock();
    const ret = {
      account,
      unconfirmedAccount,
      latestBlock: {
        height: lastBlock.height,
        timestamp: lastBlock.timestamp,
      },
      version: this.modules.peer.getVersion(),
    };
    return ret;
  }

  private attachApi = () => {
    const router = express.Router();

    router.post('/open', this.open);
    router.post('/open', this.open2);
    router.get('/getBalance', this.getBalance);
    router.get('/getPublicKey', this.getPublicKey);
    router.post('/generatePublicKey', this.generatePublicKey);
    router.get('/delegates', this.myVotedDelegates);
    router.get('/', this.getAccount);
    router.get('/new', this.newAccount);

    // v2
    router.get('/:address', this.getAddress);


    // Configuration
    router.get('/count', (req, res) => (async () => {
      try {
        const count = await global.app.sdb.count('Account', {});
        return res.json({ success: true, count });
      } catch (e) {
        return res.status(500).send({ success: false, error: 'Server error' });
      }
    })());

    router.use((req, res) => {
      res.status(500).send({
        success: false,
        error: 'API endpoint not found',
      });
    });

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