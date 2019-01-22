import * as ed from '../../src/utils/ed';
import * as bip39 from 'bip39';
import * as crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { Modules, IScope, Next } from '../../src/interfaces';

export default class AccountsApi {
  private modules: Modules;
  private library: IScope;
  private loaded = false;

  constructor (modules: Modules, library: IScope) {
    this.modules = modules;
    this.library = library;

    this.attachApi();
  }

  // Events
  public onBlockchainReady = () => {
    this.loaded = true;
  }

  private attachApi = () => {
    const router = Router();

    router.use((req: Request, res: Response, next) => {
      if (this.modules && this.loaded === true) return next();
      return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/generateAccount', this.generateAccount);
    router.post('/open', this.open);
    router.get('/', this.getAccount);
    router.get('/getBalance', this.getBalance);
    router.get('/:address/:currency', this.getAddressCurrencyBalance);
    router.get('/getVotes', this.getVotedDelegates);
    router.get('/count', this.count);
    router.get('/getPublicKey', this.getPublicKey);
    router.post('/generatePublicKey', this.generatePublicKey);

    // Configuration
    router.use((req: Request, res: Response) => {
      return res.status(500).json({ success: false, error: 'API endpoint not found', });
    });

    this.library.network.app.use('/api/accounts', router);
    this.library.network.app.use((err: string, req: Request, res: Response, next: any) => {
      if (!err) return next();
      this.library.logger.error(req.url, err);
      return res.status(500).json({
        success: false,
        error: err.toString(),
      });
    });
  }

  private generateAccount = (req: Request, res: Response, next: Next) => {
    const secret = bip39.generateMnemonic();
    const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(secret, 'utf8').digest());
    const address = this.modules.accounts.generateAddressByPublicKey(keypair.publicKey.toString('hex'));
    return res.json({
      secret,
      publicKey: keypair.publicKey.toString('hex'),
      privateKey: keypair.privateKey.toString('hex'),
      address,
    });
  }

  private open = async (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const publicKeyOrSecret = this.library.joi.object().keys({
      publicKey: this.library.joi.string().publicKey(),
      secret: this.library.joi.string().secret(),
    }).xor('publicKey', 'secret');
    const report = this.library.joi.validate(body, publicKeyOrSecret);

    if (report.error) {
      return next(report.error.message);
    }

    if (body.secret) {
      const result = await this.openAccount(body.secret);
      if (typeof result === 'string') {
        return next(result);
      }
      return res.json(result);
    } else {
      const result2 = await this.openAccount2(body.publicKey);
      if (typeof result2 === 'string') {
        return next(result2);
      }
      return res.json(result2);
    }
  }

  private getAccount = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const addressOrAccountName = this.library.joi.object().keys({
      address: this.library.joi.string().address(),
      username: this.library.joi.string().username()
    }).xor('address', 'username');
    const report = this.library.joi.validate(query, addressOrAccountName);
    if (report.error) {
      return next(report.error.message);
    }

    if (query.username) {
      const account = await this.modules.accounts.getAccountByName(query.username);
      if (typeof account === 'string') {
        return next(account);
      }
      return res.json(account);
    }

    const account = await this.modules.accounts.getAccount(query.address);
    if (typeof account === 'string') {
      return next(account);
    }
    return res.json(account);
  }

  private getBalance = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const hasAddress = this.library.joi.object().keys({
      address: this.library.joi.string().address().required()
    });
    const report = this.library.joi.validate(query, hasAddress);
    if (report.error) {
      return next(report.error.message);
    }

    const accountOverview = await this.modules.accounts.getAccount(query.address);
    if (typeof accountOverview === 'string') {
      return next(accountOverview);
    }

    const gnyBalance = accountOverview && accountOverview.account ? accountOverview.account.balance : 0;

    // get assets balances
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const condition: any = { address: req.params.address };
    if (req.query.flag) {
      condition.flag = Number(req.query.flag);
    }
    const count = await global.app.sdb.count('Balance', condition);
    let balances = [];
    if (count > 0) {
      balances = await global.app.sdb.findAll('Balance', { condition, limit, offset });
      const currencyMap = new Map();
      for (const b of balances) {
        currencyMap.set(b.currency, 1);
      }
      const assetNameList = Array.from(currencyMap.keys());
      const uiaNameList = assetNameList.filter(n => n.indexOf('.') !== -1);

      if (uiaNameList && uiaNameList.length) {
        const assets = await global.app.sdb.findAll('Asset', {
          condition: {
            name: { $in: uiaNameList },
          },
        });
        for (const a of assets) {
          currencyMap.set(a.name, a);
        }
      }

      for (const b of balances) {
        b.asset = currencyMap.get(b.currency);
      }
    }
    balances.push({
      gny: gnyBalance
    });

    return res.json({
      count: count + 1,
      balances
    });
  }

  private getAddressCurrencyBalance = async (req: Request, res: Response, next: Next) => {
    const currency = req.params.currency;
    const condition = {
      address: req.params.address,
      currency,
    };
    const balance = await global.app.sdb.findOne('Balance', { condition });
    if (!balance) return next('No balance');
    if (currency.indexOf('.') !== -1) {
      balance.asset = await global.app.sdb.findOne('Asset', { condition: { name: balance.currency } });
    }

    return res.json({ balance });
  }

  private getVotedDelegates = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const addressOrAccountName = this.library.joi.object().keys({
      address: this.library.joi.string().address(),
      username: this.library.joi.string().username()
    }).xor('address', 'username');
    const report = this.library.joi.validate(query, addressOrAccountName);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      let addr;
      if (query.username) {
        const account: any = await global.app.sdb.load('Account', { username: query.username });
        if (!account) {
          return next('Account not found');
        }
        addr = account.address;
      } else {
        addr = query.address;
      }
      const votes = await global.app.sdb.findAll('Vote', { condition: { voterAddress: addr } });
      if (!votes || !votes.length) {
        return res.json({ delegates: [] });
      }
      const delegateNames = new Set();
      for (const v of votes) {
        delegateNames.add(v.delegate);
      }
      const delegates: any = this.modules.delegates.getDelegates();
      if (!delegates || !delegates.length) {
        return res.json({ delegates: [] });
      }

      const myVotedDelegates = delegates.filter(d => delegateNames.has(d.name));
      return res.json({ delegates: myVotedDelegates });
    } catch (e) {
      this.library.logger.error('get voted delegates error', e);
      return next('Server error');
    }
  }

  private count = async (req: Request, res: Response, next: Next) => {
    try {
      const count = await global.app.sdb.count('Account', {});
      return res.json({ success: true, count });
    } catch (e) {
      return next('Server error');
    }
  }

  private getPublicKey = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const isAddress = this.library.joi.object().keys({
      address: this.library.joi.string().address()
    });
    const report = this.library.joi.validate(query, isAddress);
    if (report.error) {
      return next(report.error.message);
    }

    const accountInfoOrError = await this.modules.accounts.getAccount(query.address);
    if (typeof accountInfoOrError === 'string') {
      return res.json(accountInfoOrError);
    }
    if (!accountInfoOrError.account || !accountInfoOrError.account.publicKey) {
      return next('Can not find public key');
    }
    return res.json({ publicKey: accountInfoOrError.account.publicKey });
  }

  private generatePublicKey = (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const hasSecret = this.library.joi.object().keys({
      secret: this.library.joi.string().secret().required()
    });
    const report = this.library.joi.validate(body, hasSecret);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const kp = ed.generateKeyPair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());
      const publicKey = kp.publicKey.toString('hex');
      return res.json({ publicKey });
    } catch (err) {
      return next('Server error');
    }
  }

  // helper functions
  private openAccount = async (passphrase) => {
    const hash = crypto.createHash('sha256').update(passphrase, 'utf8').digest();
    const keyPair = ed.generateKeyPair(hash);
    const publicKey = keyPair.publicKey.toString('hex');
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
}