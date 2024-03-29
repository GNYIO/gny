import { Request, Response, Router } from 'express';
import {
  IScope,
  Next,
  DelegateViewModel,
  ExtendedDelegateViewModel,
  IHttpApi,
  AccountWeightViewModel,
  ApiResult,
  CountWrapper,
  AccountsWrapper,
  DelegateWrapper,
  DelegatesWrapperSimple,
  ExtendedDelegatesWrapper,
  ForgingStatus,
  SimpleAccountsWrapper,
} from '@gny/interfaces';
import { BlockReward, isAddress } from '@gny/utils';
import { StateHelper } from '../../core/StateHelper.js';
import Delegates from '../../core/delegates.js';
import { Vote } from '@gny/database-postgres';
import { Account } from '@gny/database-postgres';
import { Delegate } from '@gny/database-postgres';
import { Block } from '@gny/database-postgres';
import { joi } from '@gny/extended-joi';
import BigNumber from 'bignumber.js';
import { slots } from '@gny/utils';
import { RoundBase } from '@gny/base';

async function getDelegateAccount(
  sliced: DelegateViewModel[]
): Promise<ExtendedDelegateViewModel[]> {
  const addresses = sliced.map(x => x.address);
  const accounts =
    (await global.app.sdb.findAll<Account>(Account, {
      condition: {
        address: {
          $in: addresses,
        },
      },
    })) || [];

  const extendedResult: ExtendedDelegateViewModel[] = sliced.map(x => {
    const account = accounts.find(account => account.address === x.address);

    const one: ExtendedDelegateViewModel = {
      ...x,
      gny: account.gny,
      lockAmount: account.lockAmount,
      isLocked: account.isLocked,
      lockHeight: account.lockHeight,
    };

    return one;
  });

  return extendedResult;
}

export default class DelegatesApi implements IHttpApi {
  private library: IScope;
  private blockReward = new BlockReward();
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

    router.get('/count', this.count);
    router.get('/getVoters', this.getVoters);
    router.get('/getOwnVotes', this.getOwnVotes);
    router.get('/get', this.getDelegate);
    router.get('/', this.getDelegates);
    router.get('/ownProducedBlocks', this.ownProducedBlocks);
    router.get('/forging/status', this.forgingStatus);
    router.get('/search', this.search);
    router.get('/forging', this.forging);

    // Configuration
    router.use((req: Request, res: Response) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/delegates', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url);
      this.library.logger.error(err);

      return res.status(500).send({ success: false, error: err.toString() });
    });
  };

  // this returns every delegate that should forge for the current round
  // one round is 101 blocks
  private forging = async (req: Request, res: Response, next: Next) => {
    const result = [];

    const currentBlock = StateHelper.getState().lastBlock;

    if (new BigNumber(currentBlock.height).isEqualTo(0)) {
      return res.json([]);
    }

    // all delegates that where ever registered
    const allDelegates = await Delegates.getDelegates();

    const currentSlot = slots.getSlotNumber();

    const currentRound = RoundBase.calculateRound(currentBlock.height);
    const allBlockHeightsFromThisRound = RoundBase.getAllBlocksInRound(
      currentRound
    ) as any[];

    let nextSlot = currentSlot + 1;

    for (let i = 0; i < allBlockHeightsFromThisRound.length; ++i) {
      const oneBlock = allBlockHeightsFromThisRound[i];

      if (new BigNumber(oneBlock).isLessThanOrEqualTo(currentBlock.height)) {
        const loadedBlock = await global.app.sdb.findOne<Block>(Block, {
          condition: {
            height: oneBlock,
          },
        });

        allBlockHeightsFromThisRound[i] = {
          height: loadedBlock.height,
          status: 'forged',
          round: currentRound,
          delegate: allDelegates.find(x => x.publicKey === loadedBlock.delegate)
            .username,
          timestamp: loadedBlock.timestamp,
          timestampPretty: new Date(slots.getRealTime(loadedBlock.timestamp)),
        };
      } else {
        const timestampInFuture = nextSlot * 10;

        const activeDelegates = await Delegates.generateDelegateList(oneBlock);
        const delegateKey = activeDelegates[nextSlot % 101];

        allBlockHeightsFromThisRound[i] = {
          height: oneBlock,
          status: 'planned',
          round: currentRound,
          delegate: allDelegates.find(x => x.publicKey === delegateKey)
            .username,
          timestamp: timestampInFuture,
          timestampPretty: new Date(slots.getRealTime(timestampInFuture)),
        };

        nextSlot += 1;
      }
    }

    return res.json(allBlockHeightsFromThisRound);
  };

  private count = async (req: Request, res: Response, next: Next) => {
    try {
      const delegates = await global.app.sdb.getAll<Delegate>(Delegate);
      const result: ApiResult<CountWrapper> = {
        success: true,
        count: delegates.length,
      };

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/count',
        statusCode: '200',
      });

      return res.json(result);
    } catch (e) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/count',
        statusCode: '500',
      });

      this.library.logger.error('Error in counting delegates');
      this.library.logger.error(e);

      return next('Failed to count delegates');
    }
  };

  private getVoters = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const nameSchema = joi
      .object()
      .keys({
        username: joi
          .string()
          .username()
          .required(),
      })
      .required();
    const report = joi.validate(query, nameSchema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/getVoters',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    let result: ApiResult<AccountsWrapper>;

    try {
      const votes = await global.app.sdb.findAll<Vote>(Vote, {
        condition: {
          delegate: query.username,
        },
      });

      result = {
        success: true,
        accounts: [] as AccountWeightViewModel[],
      };
      if (!votes || !votes.length) {
        global.app.prom.requests.inc({
          method: 'GET',
          endpoint: '/api/delegates/getVoters',
          statusCode: '200',
        });

        return res.json({ accounts: [] });
      }

      const addresses = votes.map(v => v.voterAddress);
      const accounts =
        (await global.app.sdb.findAll<Account>(Account, {
          condition: {
            address: {
              $in: addresses,
            },
          },
        })) || [];
      const lastBlock = StateHelper.getState().lastBlock;
      const totalSupply = this.blockReward.calculateSupply(lastBlock.height);
      const accountsViewModel = accounts.map(ac => {
        const acVM: AccountWeightViewModel = {
          ...ac,
          balance: ac.gny,
          weightRatio: new BigNumber(ac.lockAmount)
            .times(100)
            .dividedBy(totalSupply)
            .toFixed(),
        };
        return acVM;
      });

      const delegates = await Delegates.getDelegates();
      for (let i = 0; i < accountsViewModel.length; ++i) {
        const vm = accountsViewModel[i];
        if (vm.isDelegate === 1) {
          const delegate = delegates.find(x => x.address === vm.address);
          vm.delegate = delegate;
        }
      }

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/getVoters',
        statusCode: '200',
      });

      result = {
        success: true,
        accounts: accountsViewModel,
      };
      return res.json(result);
    } catch (e) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/getVoters',
        statusCode: '500',
      });

      this.library.logger.error('Failed to find voters');
      this.library.logger.error(e);

      return next('Server error');
    }
  };

  private getOwnVotes = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const nameSchema = joi
      .object()
      .keys({
        username: joi.string().username(),
        address: joi.string().address(),
      })
      .xor('username', 'address')
      .required();
    const report = joi.validate(query, nameSchema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/getOwnVotes',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    try {
      let account: Account = undefined;

      if (query.username) {
        account = await global.app.sdb.findOne<Account>(Account, {
          condition: {
            username: query.username,
          },
        });
      } else {
        account = await global.app.sdb.findOne<Account>(Account, {
          condition: {
            address: query.address,
          },
        });
      }

      if (!account) {
        global.app.prom.requests.inc({
          method: 'GET',
          endpoint: '/api/delegates/getOwnVotes',
          statusCode: '200',
        });

        const result: ApiResult<SimpleAccountsWrapper> = {
          success: true,
          delegates: [],
        };
        return res.json(result);
      }

      const votes = await global.app.sdb.findAll<Vote>(Vote, {
        condition: {
          voterAddress: account.address,
        },
      });

      if (!votes || !votes.length) {
        global.app.prom.requests.inc({
          method: 'GET',
          endpoint: '/api/delegates/getOwnVotes',
          statusCode: '200',
        });

        const result: ApiResult<SimpleAccountsWrapper> = {
          success: true,
          delegates: [],
        };
        return res.json(result);
      }

      const voteResult = votes.map(x => x.delegate);

      const delegates: DelegateViewModel[] = await Delegates.getDelegates();
      const result = delegates.filter(x => voteResult.includes(x.username));

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/getOwnVotes',
        statusCode: '200',
      });

      const resultPretty: ApiResult<SimpleAccountsWrapper> = {
        success: true,
        delegates: result,
      };
      return res.json(resultPretty);
    } catch (e) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/getOwnVotes',
        statusCode: '500',
      });

      this.library.logger.error('Failed to find voters');
      this.library.logger.error(e);

      return next('Server error');
    }
  };

  private getDelegate = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const publicKeyOrNameOrAddress = joi
      .object()
      .keys({
        publicKey: joi.string().publicKey(),
        username: joi.string().username(),
        address: joi.string().address(),
      })
      .xor('publicKey', 'username', 'address')
      .required();
    const report = joi.validate(query, publicKeyOrNameOrAddress);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/get',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const delegates: DelegateViewModel[] = await Delegates.getDelegates();
    if (!delegates) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/get',
        statusCode: '200',
      });

      return next('no delegates');
    }

    const delegate = delegates.find(one => {
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
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/get',
        statusCode: '200',
      });

      const result: ApiResult<DelegateWrapper> = {
        success: true,
        delegate,
      };
      return res.json(result);
    }

    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/delegates/get',
      statusCode: '500',
    });

    return next('Can not find delegate');
  };

  private getDelegates = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const offset = Number(query.offset || 0);
    const limit = Number(query.limit || 10);
    if (Number.isNaN(limit) || Number.isNaN(offset)) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: 'Invalid params',
      });
    }

    const schema = joi.object().keys({
      limit: joi
        .number()
        .integer()
        .min(0)
        .max(101),
      offset: joi
        .number()
        .integer()
        .min(0),
    });

    const report = joi.validate({ limit, offset }, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const delegates: DelegateViewModel[] = await Delegates.getDelegates();
    if (!delegates) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates',
        statusCode: '500',
      });

      return next('No delegates found');
    }

    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/delegates',
      statusCode: '200',
    });

    const sliced = delegates.slice(offset, offset + limit);
    const extendedResult = await getDelegateAccount(sliced);

    const result: ApiResult<ExtendedDelegatesWrapper> = {
      success: true,
      totalCount: delegates.length,
      delegates: extendedResult,
    };
    return res.json(result);
  };

  private ownProducedBlocks = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    const { query } = req;

    const publicKeyOrNameOrAddress = joi
      .object()
      .keys({
        publicKey: joi.string().publicKey(),
        username: joi.string().username(),
        address: joi.string().address(),
        limit: joi
          .number()
          .integer()
          .min(0)
          .max(100),
        offset: joi
          .number()
          .integer()
          .min(0),
      })
      .xor('publicKey', 'username', 'address')
      .required();
    const report = joi.validate(query, publicKeyOrNameOrAddress);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/ownProducedBlocks',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const delegates: DelegateViewModel[] = await Delegates.getDelegates();
    if (!delegates) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/ownProducedBlocks',
        statusCode: '500',
      });

      return next('no delegates');
    }

    const delegate = delegates.find(one => {
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
    if (!delegate) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/ownProducedBlocks',
        statusCode: '500',
      });

      return next('delegate not found');
    }

    const blocks = await global.app.sdb.findAll<Block>(Block, {
      limit: query.limit || 100,
      offset: query.offset || 0,
      condition: {
        delegate: delegate.publicKey,
      },
      sort: {
        height: 1,
      },
    });

    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/delegates/ownProducedBlocks',
      statusCode: '200',
    });

    return res.json({
      success: true,
      delegate: delegate,
      blocks: blocks,
    });
  };

  private forgingStatus = (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const needPublicKey = joi
      .object()
      .keys({
        publicKey: joi
          .string()
          .publicKey()
          .required(),
      })
      .required();
    const report = joi.validate(query, needPublicKey);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/forging/status',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/delegates/forging/status',
      statusCode: '200',
    });

    const isEnabled = !!StateHelper.isPublicKeyInKeyPairs(query.publicKey);
    const result: ApiResult<ForgingStatus> = {
      success: true,
      enabled: isEnabled,
    };
    return res.json(result);
  };

  private search = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const rules = joi
      .object()
      .keys({
        searchFor: joi
          .alternatives(joi.string().address(), joi.partialUsername())
          .required(),
        offset: joi
          .number()
          .integer()
          .optional(),
        limit: joi
          .number()
          .integer()
          .optional(),
      })
      .required();

    const report = joi.validate(query, rules);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/delegates/forging/status',
        statusCode: '422',
      });

      const r: ApiResult<DelegatesWrapperSimple> = {
        success: false,
        error: report.error.message,
      };
      return res.status(422).send(r);
    }

    const offset = ((query.offset as never) as number) || 0;
    const limit = ((query.limit as never) as number) || 200;

    const { searchFor } = query;
    const delegates = await Delegates.getDelegates();

    if (isAddress(searchFor)) {
      const result = delegates.filter(value => {
        if (value.address === searchFor) {
          return true;
        } else {
          return false;
        }
      });

      const r: ApiResult<DelegatesWrapperSimple> = {
        success: true,
        count: result.length,
        delegates: result,
      };
      return res.json(r);
    } else {
      // is a partial username
      let result = delegates.filter(value => {
        if (value.username.includes(searchFor)) {
          return true;
        } else {
          return false;
        }
      });
      const count = result.length;
      result = result.slice(offset, offset + limit);

      const r: ApiResult<DelegatesWrapperSimple> = {
        success: true,
        count,
        delegates: result,
      };
      return res.json(r);
    }
  };
}
