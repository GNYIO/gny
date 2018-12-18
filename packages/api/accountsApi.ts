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

  private open2 = async (req: any) => {
    const { body } = req;
    const report = this.library.scheme.validate(body, {
      type: 'object',
      properties: {
        publicKey: {
          type: 'string',
          format: 'publicKey',
        },
      },
      required: ['publicKey'],
    });
    if (!report) {
      return this.library.scheme.getLastError();
    }

    return await this.openAccount2(body.publicKey);
  }

  private getBalance = async (req: any) => {
    const query = req.body;
    const report = this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          minLength: 1,
          maxLength: 50,
        },
      },
      required: ['address'],
    });
    
    if (!report) {
      return this.library.scheme.getLastError();
    }

    if (!addressHelper.isAddress(query.address)) {
      return 'Invalid address';
    }

    const accountOverview = await this.modules.accounts.getAccount(query.address);
    if (typeof accountOverview === 'string') {
      return accountOverview;
    }

    const balance = accountOverview && accountOverview.account ? accountOverview.account.balance : 0;
    const unconfirmedBalance = accountOverview && accountOverview.account ? accountOverview.account.unconfirmedBalance : 0;
    return {
      balance,
      unconfirmedBalance
    };
  }


  private newAccount(req: any) {
    let ent = Number(req.body.ent);
    if ([128, 256, 384].indexOf(ent) === -1) {
      ent = 128;
    }
    const secret = new Mnemonic(ent).toString();
    const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(secret, 'utf8').digest());
    const address = this.modules.accounts.generateAddressByPublicKey(keypair.publicKey.toString('hex'));
    return {
      secret,
      publicKey: keypair.publicKey.toString('hex'),
      privateKey: keypair.privateKey.toString('hex'),
      address,
    };
  }


  private openAccount = async (passphrase) => {
    const hash = crypto.createHash('sha256').update(passphrase, 'utf8').digest();
    const keyPair = ed.generateKeyPair(hash);
    const publicKey = keyPair.publicKey.toString('hex');
    const address = this.modules.accounts.generateAddressByPublicKey(publicKey);

    let accountInfoOrError = await this.modules.accounts.getAccount(address);
    if (typeof accountInfoOrError === 'string') {
      return accountInfoOrError;
    }

    if (accountInfoOrError && accountInfoOrError.account && !accountInfoOrError.account.publicKey) {
      accountInfoOrError.account.publicKey = publicKey;
    }
    return accountInfoOrError;
  }


  private openAccount2 = async (publicKey: string) => {
    const address = this.modules.accounts.generateAddressByPublicKey(publicKey);
    const accountInfoOrError = await this.modules.accounts.getAccount(address);
    if (typeof accountInfoOrError === 'string') {
      return accountInfoOrError;
    }

    if (accountInfoOrError && accountInfoOrError.account && !accountInfoOrError.account.publicKey) {
      accountInfoOrError.account.publicKey = publicKey;
    }
    return accountInfoOrError;
  }

  private getPublicKey = async (req) => {
    const query = req.body;
    const report = this.library.scheme.validate(query, {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          minLength: 1,
        },
      },
      required: ['address'],
    });
    
    if (!report) {
      return this.library.scheme.getLastError();
    }

    let accountInfoOrError = await this.modules.accounts.getAccount(query.address);
    if (typeof accountInfoOrError === 'string') {
      return accountInfoOrError;
    }
    if (!accountInfoOrError.account || !accountInfoOrError.account.publicKey) {
      return 'Account does not have a public key';
    }
    return {
      publicKey: accountInfoOrError.account.publicKey
    };
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

  private getAccount = async (req) => {
    const query = req.body;
    const report = this.library.scheme.validate(query, {
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
    });

    if (!report) {
      return this.library.scheme.getLastError();
    }

    const address = query.address;
    return await this.modules.accounts.getAccount(address);
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