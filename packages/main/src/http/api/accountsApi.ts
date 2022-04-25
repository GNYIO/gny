import { Request, Response, Router } from 'express';
import {
  IScope,
  Next,
  DelegateViewModel,
  IBalance,
  IHttpApi,
  ApiResult,
  IAccount,
  ServerError,
  GetAccountError,
  AccountOpenModel,
  BalancesModel,
  BalanceResponseError,
  IBalanceWrapper,
  DelegatesWrapper,
  CountWrapper,
  PublicKeyWrapper,
} from '@gny/interfaces';
import {
  getAccountByUsername,
  getAccountByAddress,
  generateAddressByPublicKey,
  getAccount,
} from '../util';
import Delegates from '../../../src/core/delegates';
import { StateHelper } from '../../../src/core/StateHelper';
import { Balance } from '@gny/database-postgres';
import { Asset } from '@gny/database-postgres';
import { Vote } from '@gny/database-postgres';
import { Account } from '@gny/database-postgres';
import { joi } from '@gny/extended-joi';

interface BalanceCondition {
  address: string;
  flag?: number;
}

export default class AccountsApi implements IHttpApi {
  private library: IScope;

  constructor(library: IScope) {
    this.library = library;

    this.attachApi();
  }

  public attachApi = () => {
    const router = Router();

    router.use((req: Request, res: Response, next) => {
      if (StateHelper.BlockchainReady()) return next();
      return res
        .status(500)
        .send({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/', this.getAccountEndpoint);
    router.post('/openAccount', this.openAccount);
    router.get('/getBalance', this.getBalance);
    router.get('/:address/:currency', this.getAddressCurrencyBalance);
    router.get('/getVotes', this.getVotedDelegates);
    router.get('/count', this.count);
    router.get('/getPublicKey', this.getPublicKey);

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
        const span = this.library.tracer.startSpan('accountsApi');
        span.setTag('error', true);
        span.log({
          value: `${req.url} ${err}`,
        });
        span.finish();

        this.library.logger.error(req.url);
        this.library.logger.error(err);

        return res.status(500).json({
          success: false,
          error: err.toString(),
        });
      }
    );
  };

  private getAccountEndpoint = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const { query } = req;
    const addressOrAccountName = joi
      .object()
      .keys({
        address: joi.string().address(),
        username: joi.string().username(),
      })
      .xor('address', 'username')
      .required();

    const report = joi.validate(query, addressOrAccountName);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/accounts',
      statusCode: '200',
    });

    if (query.username) {
      const account = await getAccountByUsername(query.username);
      if (typeof account === 'string') {
        return next(account);
      }
      const result1: ApiResult<IAccount, ServerError> = {
        success: true,
        ...account,
      };
      return res.json(result1);
    }

    if (query.address) {
      const account = await getAccountByAddress(query.address as string);
      if (typeof account === 'string') {
        return next(account);
      }

      if (
        account !== null &&
        account !== undefined &&
        Object.keys(account).length > 0
      ) {
        const r: ApiResult<IAccount, ServerError> = {
          success: true,
          ...account,
        };
        return res.json(r);
      }

      const emptyAccount: ApiResult<IAccount, GetAccountError> = {
        success: true,
        address: query.address as string,
        username: null,
        gny: '',
        publicKey: null,
        secondPublicKey: null,
        isDelegate: 0,
        isLocked: 0,
        lockHeight: '0',
        lockAmount: '0',
      };
      return res.json(emptyAccount);
    }
  };

  private openAccount = async (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const publicKey = joi
      .object()
      .keys({
        publicKey: joi
          .string()
          .publicKey()
          .required(),
      })
      .required();
    const report = joi.validate(body, publicKey);

    if (report.error) {
      global.app.prom.requests.inc({
        method: 'POST',
        endpoint: '/api/accounts/openAccount',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    global.app.prom.requests.inc({
      method: 'POST',
      endpoint: '/api/accounts/openAccount',
      statusCode: '200',
    });

    const result2 = await this.openAccountWithPublicKey(body.publicKey);
    if (typeof result2 === 'string') {
      return next(result2);
    }

    const result: ApiResult<AccountOpenModel, GetAccountError> = {
      success: true,
      ...result2,
    };
    return res.json(result);
  };

  private openAccountWithPublicKey = async (publicKey: string) => {
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

  private getBalance = async (req: Request, res: Response, next: Next) => {
    const { query } = req;

    const hasAddress = joi.object().keys({
      address: joi
        .string()
        .address()
        .required(),
      limit: joi
        .number()
        .integer()
        .min(0)
        .max(100),
      offset: joi
        .number()
        .integer()
        .min(0),
    });
    const report = joi.validate(query, hasAddress);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts/getBalance',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/accounts/getBalance',
      statusCode: '200',
    });

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

    const result: ApiResult<BalancesModel, string> = {
      success: true,
      count: count + 1,
      balances,
    };
    return res.json(result);
  };

  private getAddressCurrencyBalance = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const schema = joi.object().keys({
      address: joi
        .string()
        .address()
        .required(),
      currency: joi
        .string()
        .asset()
        .required(),
    });

    const report = joi.validate(req.params, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts/:address/:currency',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/accounts/:address/:currency',
      statusCode: '200',
    });

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

    const result: ApiResult<IBalanceWrapper, BalanceResponseError> = {
      success: true,
      balance,
    };
    return res.json(result);
  };

  private getVotedDelegates = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const { query } = req;
    const addressOrAccountName = joi
      .object()
      .keys({
        address: joi.string().address(),
        username: joi.string().username(),
      })
      .xor('address', 'username')
      .required();
    const report = joi.validate(query, addressOrAccountName);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts/getVotes',
        statusCode: '422',
      });

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
          global.app.prom.requests.inc({
            method: 'GET',
            endpoint: '/api/accounts/:address/:currency',
            statusCode: '500',
          });

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
        global.app.prom.requests.inc({
          method: 'GET',
          endpoint: '/api/accounts/:address/:currency',
          statusCode: '200',
        });

        return res.json({ delegates: [] });
      }
      const delegateNames = new Set();
      for (const v of votes) {
        delegateNames.add(v.delegate);
      }
      const delegates: DelegateViewModel[] = await Delegates.getDelegates();
      let result: ApiResult<DelegatesWrapper>;
      if (!delegates || !delegates.length) {
        result = {
          success: true,
          delegates: [] as DelegateViewModel[],
        };

        global.app.prom.requests.inc({
          method: 'GET',
          endpoint: '/api/accounts/:address/:currency',
          statusCode: '200',
        });

        return res.json(result);
      }

      const myVotedDelegates = delegates.filter(d =>
        delegateNames.has(d.username)
      );
      result = {
        success: true,
        delegates: myVotedDelegates,
      };

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts/:address/:currency',
        statusCode: '200',
      });

      return res.json(result);
    } catch (e) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts/:address/:currency',
        statusCode: '500',
      });

      const span = this.library.tracer.startSpan(
        'AccountsApi.getVotedDelegates'
      );
      span.setTag('error', true);
      span.log({
        value: `get voted delegates error ${e.message}`,
      });
      span.finish();

      this.library.logger.error('get voted delegates error');
      this.library.logger.error(e);

      return next('Server error');
    }
  };

  private count = async (req: Request, res: Response, next: Next) => {
    try {
      const count = await global.app.sdb.count<Account>(Account, {});
      const result: ApiResult<CountWrapper, ServerError> = {
        success: true,
        count,
      };

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts/count',
        statusCode: '200',
      });

      return res.json(result);
    } catch (e) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts/count',
        statusCode: '500',
      });

      return next('Server error');
    }
  };

  private getPublicKey = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const isAddress = joi
      .object()
      .keys({
        address: joi
          .string()
          .address()
          .required(),
      })
      .required();

    const report = joi.validate(query, isAddress);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts/getPublicKey',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const accountInfoOrError = await getAccount(query.address);
    if (typeof accountInfoOrError === 'string') {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts/getPublicKey',
        statusCode: '500',
      });

      return next(accountInfoOrError);
    }
    if (!accountInfoOrError.account || !accountInfoOrError.account.publicKey) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/accounts/getPublicKey',
        statusCode: '500',
      });

      return next('Can not find public key');
    }
    const result: ApiResult<PublicKeyWrapper, GetAccountError> = {
      success: true,
      publicKey: accountInfoOrError.account.publicKey,
    };

    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/accounts/getPublicKey',
      statusCode: '200',
    });
    return res.json(result);
  };
}
