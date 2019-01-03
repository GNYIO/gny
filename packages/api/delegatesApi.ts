import * as express from 'express';
import * as ed from '../../src/utils/ed';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { Modules, IScope, Next } from '../../src/interfaces';
import BlockReward from '../../src/utils/block-reward';

export default class DelegatesApi {

  private modules: Modules;
  private library: IScope;
  private loaded = false;
  private blockreward = new BlockReward();
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
    const router = express.Router();

    router.use((req: Request, res: Response, next) => {
      if (this.modules && this.loaded === true) return next();
      return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/count', this.count);
    router.get('/voters', this.getVoters);
    router.get('/get', this.getDelegate);
    router.get('/', this.getDelegates);

    if (process.env.DEBUG) {
      router.get('/forging/enableAll', this.forgingEnableAll);
      router.get('/forging/disableAll', this.forgingDisableAll);
    }

    router.post('/forging/enable', this.forgingEnable);
    router.post('/forging/disable', this.forgingDisable);
    router.get('/forging/status', this.forgingStatus);

    // Configuration
    router.use((req: Request, res: Response) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/delegates', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err.toString());
      return res.status(500).send({ success: false, error: err.toString() });
    });
  }

  public count = async (req: Request, res: Response, next: Next) => {
    try {
      const count = global.app.sdb.getAll('Delegate').length;
      return res.json({ count });
    } catch (e) {
      this.library.logger.error('get delegate count error', e);
      return next('Failed to count delegates');
    }
  }

  // only DEBUG
  public forgingEnableAll = (req: Request, res: Response, next: Next) => {
    this.modules.delegates.enableForging();
    return res.json({ success: true });
  }

  // only DEBUG
  public forgingDisableAll = (req: Request, res: Response, next: Next) => {
    this.modules.delegates.disableForging();
    return res.json({ success: true });
  }

  public forgingEnable = async (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const secretAndPublicKey = this.library.joi.object().keys({
      secret: this.library.joi.string().secret().required(),
      publicKey: this.library.joi.string().publicKey(),
    });
    const report = this.library.joi.validate(body, secretAndPublicKey);
    if (report.error) {
      return next(report.error.message);
    }

    const ip = req.connection.remoteAddress;

    if (this.library.config.forging.access.whiteList.length > 0
      && this.library.config.forging.access.whiteList.indexOf(ip) < 0) {
      return next('Access denied');
    }

    const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());

    if (body.publicKey) {
      if (keypair.publicKey.toString('hex') !== body.publicKey) {
        return next('Invalid passphrase');
      }
    }

    const publicKey = keypair.publicKey.toString('hex');
    if (this.modules.delegates.isPublicKeyInKeyPairs(publicKey)) {
      return next('Forging is already enabled');
    }

    const address = this.modules.accounts.generateAddressByPublicKey(publicKey);
    const accountInfo = await this.modules.accounts.getAccount(address);
    if (typeof accountInfo === 'string') {
      return next(accountInfo.toString());
    }

    if (accountInfo && accountInfo.account.isDelegate) {
      this.modules.delegates.setKeyPair(publicKey, keypair);
      this.library.logger.info(`Forging enabled on account: ${accountInfo.account.address}`);
      return res.json({ success: true });
    }
    return next('Delegate not found');
  }

  public forgingStatus = (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const needPublicKey = this.library.joi.object().keys({
      publicKey: this.library.joi.string().publicKey().required(),
    });
    const report = this.library.joi.validate(query, needPublicKey);
    if (report.error) {
      return next(report.error.message);
    }

    const isEnabled = !!this.modules.delegates.isPublicKeyInKeyPairs(query.publicKey);
    return res.json({
      success: true,
      enabled: isEnabled
    });
  }

  public getVoters = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const nameSchema = this.library.joi.object().keys({
      username: this.library.joi.string().username().required(),
    });
    const report = this.library.joi.validate(query, nameSchema);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const votes = await global.app.sdb.findAll('Vote', { condition: { delegate: query.username } });
      if (!votes || !votes.length) return res.json({ accounts: [] });

      const addresses = votes.map(v => v.voterAddress);
      const accounts = await global.app.sdb.findAll('Account', { condition: { address: { $in: addresses } } });
      const lastBlock = this.modules.blocks.getLastBlock();
      const totalSupply = this.blockreward.calculateSupply(lastBlock.height);
      for (const a of accounts) {
        a.balance = a.gny;
        a.weightRatio = (a.weight * 100) / totalSupply;
      }
      return res.json({ accounts });
    } catch (e) {
      this.library.logger.error('Failed to find voters', e);
      return next('Server error');
    }
  }

  public getDelegate = (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const publicKeyOrNameOrAddress = this.library.joi.object().keys({
      publicKey: this.library.joi.string().publicKey(),
      username: this.library.joi.string().username(),
      address: this.library.joi.string().address(),
    });
    const report = this.library.joi.validate(query, publicKeyOrNameOrAddress);
    if (report.error) {
      return next(report.error.message);
    }

    const delegates = this.modules.delegates.getDelegates();
    if (!delegates) {
      return next('no delegates');
    }

    const delegate = delegates.find((one) => {
      if (query.publicKey) {
        return one.publicKey === query.publicKey;
      }
      if (query.address) {
        return one.address === query.address;
      }
      if (query.username) {
        return one.username === query.username;
      }

      return false;
    });

    if (delegate) {
      return res.json({ delegate });
    }
    return next('Delegate not found');
  }

  public forgingDisable = async (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const secretAndPublicKey = this.library.joi.object().keys({
      secret: this.library.joi.string().secret().required(),
      publicKey: this.library.joi.string().publicKey(),
    });
    const report = this.library.joi.validate(body, secretAndPublicKey);
    if (report.error) {
      return next(report.error.message);
    }

    const ip = req.connection.remoteAddress;

    if (this.library.config.forging.access.whiteList.length > 0
        && this.library.config.forging.access.whiteList.indexOf(ip) < 0) {
      return next('Access denied');
    }

    const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());

    if (body.publicKey) {
      if (keypair.publicKey.toString('hex') !== body.publicKey) {
        return next('Invalid passphrase');
      }
    }

    const publicKey = keypair.publicKey.toString('hex');
    if (!this.modules.delegates.isPublicKeyInKeyPairs(keypair.publicKey.toString('hex'))) {
      return next('Delegate not found');
    }

    const address = this.modules.accounts.generateAddressByPublicKey(publicKey);
    const accountOverview = await this.modules.accounts.getAccount(address);

    if (typeof accountOverview === 'string') {
      return next(accountOverview.toString());
    }

    if (accountOverview.account && accountOverview.account.isDelegate) {
      this.modules.delegates.removeKeyPair(keypair.publicKey.toString('hex'));
      this.library.logger.info(`Forging disabled on account: ${accountOverview.account.address}`);
      return res.json({ success: true });
    }
    return next('Delegate not found');
  }

  public getDelegates = (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const offset = Number(query.offset || 0);
    const limit = Number(query.limit || 10);
    if (Number.isNaN(limit) || Number.isNaN(offset)) {
      return next('Invalid params');
    }

    const delegates = this.modules.delegates.getDelegates();
    if (!delegates) return next('no delegates found');
    return res.json({
      totalCount: delegates.length,
      delegates: delegates.slice(offset, offset + limit),
    });
  }
}