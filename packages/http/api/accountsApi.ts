import * as ed from '../../../src/utils/ed';
import * as bip39 from 'bip39';
import * as crypto from 'crypto';
import { Request, Response, Router } from 'express';
import {
  IScope,
  Next,
  DelegateViewModel,
  IAccount,
  IBalance,
  IAsset,
} from '../../../src/interfaces';
import {
  generateAddressByPublicKey,
  getAccountByName,
  getAccount,
} from '../util';
import Delegates from '../../../src/core/delegates';
import { StateHelper } from '../../../src/core/StateHelper';
import { Balance } from '../../database-postgres/entity/Balance';
import { Asset } from '../../database-postgres/entity/Asset';
import { Vote } from '../../database-postgres/entity/Vote';
import { Account } from '../../database-postgres/entity/Account';

interface BalanceCondition {
  address: string;
  flag?: number;
}

export default class AccountsApi {
  private library: IScope;

  constructor(library: IScope) {
    this.library = library;

    this.attachApi();
  }

  private attachApi = () => {
    const router = Router();

    router.use((req: Request, res: Response, next) => {
      if (StateHelper.BlockchainReady()) return next();
      return res
        .status(500)
        .send({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/generateAccount', this.generateAccount);
    router.post('/open', this.open);
    router.get('/', this.getAccountEndpoint);
    router.get('/getBalance', this.getBalance);
    router.get('/:address/:currency', this.getAddressCurrencyBalance);
    router.get('/getVotes', this.getVotedDelegates);
    router.get('/count', this.count);
    router.get('/getPublicKey', this.getPublicKey);
    router.post('/generatePublicKey', this.generatePublicKey);

    // Configuration
    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/accounts', router);
    this.library.network.app.use(
      (err: string, req: Request, res: Response, next: Next) => {
        if (!err) return next();
        this.library.logger.error(req.url, err);
        return res.status(500).json({
          success: false,
          error: err.toString(),
        });
      }
    );
  };

  private generateAccount = (req: Request, res: Response, next: Next) => {
    const secret = bip39.generateMnemonic();
    const keypair = ed.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(secret, 'utf8')
        .digest()
    );
    const address = generateAddressByPublicKey(
      keypair.publicKey.toString('hex')
    );
    return res.json({
      secret,
      publicKey: keypair.publicKey.toString('hex'),
      privateKey: keypair.privateKey.toString('hex'),
      address,
    });
  };

  private open = async (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const publicKeyOrSecret = this.library.joi
      .object()
      .keys({
        publicKey: this.library.joi.string().publicKey(),
        secret: this.library.joi.string().secret(),
      })
      .xor('publicKey', 'secret');
    const report = this.library.joi.validate(body, publicKeyOrSecret);

    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    if (body.secret) {
      const result = await this.openAccount(body.secret);
      if (typeof result === 'string') {
        return next(result);
      }
      return res.json({
        success: true,
        ...result,
      });
    } else {
      const result2 = await this.openAccount2(body.publicKey);
      if (typeof result2 === 'string') {
        return next(result2);
      }
      return res.json({
        success: true,
        result2,
      });
    }
  };

  private getAccountEndpoint = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const { query } = req;
    const addressOrAccountName = this.library.joi
      .object()
      .keys({
        address: this.library.joi.string().address(),
        username: this.library.joi.string().username(),
      })
      .xor('address', 'username');
    const report = this.library.joi.validate(query, addressOrAccountName);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    if (query.username) {
      const account = await getAccountByName(query.username);
      if (typeof account === 'string') {
        return next(account);
      }
      return res.json(account);
    }

    const account = await getAccount(query.address);
    if (typeof account === 'string') {
      return next(account);
    }
    return res.json(account);
  };

  private getBalance = async (req: Request, res: Response, next: Next) => {
    const { query } = req;

    const hasAddress = this.library.joi.object().keys({
      address: this.library.joi
        .string()
        .address()
        .required(),
      limit: this.library.joi
        .number()
        .min(0)
        .max(100),
      offset: this.library.joi.number().min(0),
    });
    const report = this.library.joi.validate(query, hasAddress);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const accountOverview = await getAccount(query.address);
    if (typeof accountOverview === 'string') {
      return next(accountOverview);
    }

    const gnyBalance =
      accountOverview && accountOverview.account
        ? accountOverview.account.balance
        : String(0);

    // get assets balances
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const condition: BalanceCondition = { address: req.params.address };
    if (req.query.flag) {
      condition.flag = Number(req.query.flag);
    }
    const count = await global.app.sdb.count<Balance>(Balance, condition);
    let balances: IBalance[] = [];
    if (count > 0) {
      balances = await global.app.sdb.findAll<Balance>(Balance, {
        condition,
        limit,
        offset,
      });
      const currencyMap = new Map();
      for (const b of balances) {
        currencyMap.set(b.currency, 1);
      }
      const assetNameList = Array.from(currencyMap.keys());
      const uiaNameList = assetNameList.filter(n => n.indexOf('.') !== -1);

      if (uiaNameList && uiaNameList.length) {
        const assets = await global.app.sdb.findAll<Asset>(Asset, {
          condition: {
            name: {
              $in: uiaNameList,
            },
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
      gny: gnyBalance,
    });

    return res.json({
      count: count + 1,
      balances,
    });
  };

  private getAddressCurrencyBalance = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const schema = this.library.joi.object().keys({
      address: this.library.joi
        .string()
        .address()
        .required(),
      currency: this.library.joi
        .string()
        .asset()
        .required(),
    });

    const report = this.library.joi.validate(req.params, schema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const currency = req.params.currency;
    const condition = {
      address: req.params.address as string,
      currency: currency as string,
    };
    const balance = await global.app.sdb.findOne<Balance>(Balance, {
      condition,
    });
    if (!balance) return next('No balance');
    if (currency.indexOf('.') !== -1) {
      balance.asset = await global.app.sdb.findOne<Asset>(Asset, {
        condition: {
          name: balance.currency,
        },
      });
    }

    return res.json({ balance });
  };

  private getVotedDelegates = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const { query } = req;
    const addressOrAccountName = this.library.joi
      .object()
      .keys({
        address: this.library.joi.string().address(),
        username: this.library.joi.string().username(),
      })
      .xor('address', 'username');
    const report = this.library.joi.validate(query, addressOrAccountName);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    try {
      let addr: string;
      if (query.username) {
        const account = await global.app.sdb.load<Account>(Account, {
          username: query.username,
        });
        if (!account) {
          return next('Account not found');
        }
        addr = account.address;
      } else {
        addr = query.address;
      }
      const votes = await global.app.sdb.findAll<Vote>(Vote, {
        condition: {
          voterAddress: addr,
        },
      });
      if (!votes || !votes.length) {
        return res.json({ delegates: [] });
      }
      const delegateNames = new Set();
      for (const v of votes) {
        delegateNames.add(v.delegate);
      }
      const delegates: DelegateViewModel[] = await Delegates.getDelegates();
      if (!delegates || !delegates.length) {
        return res.json({ delegates: [] });
      }

      const myVotedDelegates = delegates.filter(d =>
        delegateNames.has(d.username)
      );
      return res.json({ delegates: myVotedDelegates });
    } catch (e) {
      this.library.logger.error('get voted delegates error', e);
      return next('Server error');
    }
  };

  private count = async (req: Request, res: Response, next: Next) => {
    try {
      const count = await global.app.sdb.count<Account>(Account, {});
      return res.json({ success: true, count });
    } catch (e) {
      return next('Server error');
    }
  };

  private getPublicKey = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const isAddress = this.library.joi.object().keys({
      address: this.library.joi
        .string()
        .address()
        .required(),
    });
    const report = this.library.joi.validate(query, isAddress);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const accountInfoOrError = await getAccount(query.address);
    if (typeof accountInfoOrError === 'string') {
      return res.json(accountInfoOrError);
    }
    if (!accountInfoOrError.account || !accountInfoOrError.account.publicKey) {
      return next('Can not find public key');
    }
    return res.json({ publicKey: accountInfoOrError.account.publicKey });
  };

  private generatePublicKey = (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const hasSecret = this.library.joi.object().keys({
      secret: this.library.joi
        .string()
        .secret()
        .required(),
    });
    const report = this.library.joi.validate(body, hasSecret);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    try {
      const kp = ed.generateKeyPair(
        crypto
          .createHash('sha256')
          .update(body.secret, 'utf8')
          .digest()
      );
      const publicKey = kp.publicKey.toString('hex');
      return res.json({ publicKey });
    } catch (err) {
      return next('Server error');
    }
  };

  // helper functions
  private openAccount = async (passphrase: string) => {
    const hash = crypto
      .createHash('sha256')
      .update(passphrase, 'utf8')
      .digest();
    const keyPair = ed.generateKeyPair(hash);
    const publicKey = keyPair.publicKey.toString('hex');
    const address = generateAddressByPublicKey(publicKey);

    const accountInfoOrError = await getAccount(address);
    if (typeof accountInfoOrError === 'string') {
      return accountInfoOrError;
    }

    if (
      accountInfoOrError &&
      accountInfoOrError.account &&
      !accountInfoOrError.account.publicKey
    ) {
      accountInfoOrError.account.publicKey = publicKey;
    }
    return accountInfoOrError;
  };

  private openAccount2 = async (publicKey: string) => {
    const address = generateAddressByPublicKey(publicKey);
    const accountInfoOrError = await getAccount(address);
    if (typeof accountInfoOrError === 'string') {
      return accountInfoOrError;
    }

    if (
      accountInfoOrError &&
      accountInfoOrError.account &&
      !accountInfoOrError.account.publicKey
    ) {
      accountInfoOrError.account.publicKey = publicKey;
    }
    return accountInfoOrError;
  };
}
