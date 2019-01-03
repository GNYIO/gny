import * as express from 'express';
import * as ed from '../../src/utils/ed';
import * as bip39 from 'bip39';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { Modules, IScope, Next } from '../../src/interfaces';

export default class AccountsApi {
  private modules: Modules;
  private library: IScope;

  constructor (modules: Modules, library: IScope) {
    this.modules = modules;
    this.library = library;

    this.attachApi();
  }

  private attachApi = () => {
    const router = express.Router();

    // for sensitve data use POST request: see https://stackoverflow.com/questions/7562675/proper-way-to-send-username-and-password-from-client-to-server
    router.get('/generateAccount', this.generateAccount);
    router.post('/open', this.open);
    router.get('/', this.getAccount);
    router.get('/getBalance', this.getBalance);
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
    console.log('query', query);
    const addressOrAccountName = this.library.joi.object().keys({
      address: this.library.joi.string().address(),
      name: this.library.joi.string().username()
    }).xor('address', 'name');
    const report = this.library.joi.validate(query, addressOrAccountName);
    if (report.error) {
      return next(report.error.message);
    }

    if (query.name) {
      const account = await this.modules.accounts.getAccountByName(query.name);
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

    const balance = accountOverview && accountOverview.account ? accountOverview.account.balance : 0;
    return res.json({
      balance,
    });
  }

  private getVotedDelegates = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const addressOrAccountName = this.library.joi.object().keys({
      address: this.library.joi.string().address(),
      name: this.library.joi.string().username()
    }).xor('address', 'name');
    const report = this.library.joi.validate(query, addressOrAccountName);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      let addr;
      if (query.name) {
        const account = await global.app.sdb.load('Account', { username: query.name });
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
      const delegates = this.modules.delegates.getDelegates();
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
      return next('Account does not have a public key');
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