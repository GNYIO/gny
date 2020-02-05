import * as ed from '@gny/ed';
import * as crypto from 'crypto';
import { Request, Response, Router } from 'express';
import {
  IScope,
  Next,
  DelegateViewModel,
  IHttpApi,
  AccountWeightViewModel,
  ApiResult,
  CountWrapper,
  AccountsWrapper,
  DelegateWrapper,
  DelegatesWrapper,
  ForgingStatus,
} from '@gny/interfaces';
import { BlockReward } from '@gny/utils';
import { StateHelper } from '../../../src/core/StateHelper';
import { generateAddressByPublicKey, getAccount } from '../util';
import Delegates from '../../../src/core/delegates';
import { Vote } from '@gny/database-postgres';
import { Account } from '@gny/database-postgres';
import { Delegate } from '@gny/database-postgres';
import { joi } from '@gny/extended-joi';
import { BigNumber } from 'bignumber.js';

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
    router.get('/get', this.getDelegate);
    router.get('/', this.getDelegates);
    router.post('/forging/enable', this.forgingEnable);
    router.post('/forging/disable', this.forgingDisable);
    router.get('/forging/status', this.forgingStatus);

    if (process.env.DEBUG) {
      router.get('/forging/enableAll', this.forgingEnableAll);
      router.get('/forging/disableAll', this.forgingDisableAll);
    }

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
  };

  private count = async (req: Request, res: Response, next: Next) => {
    try {
      const delegates = await global.app.sdb.getAll<Delegate>(Delegate);
      const result: ApiResult<CountWrapper> = {
        success: true,
        count: delegates.length,
      };
      return res.json(result);
    } catch (e) {
      this.library.logger.error('Error in counting delegates', e);
      return next('Failed to count delegates');
    }
  };

  private getVoters = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const nameSchema = joi.object().keys({
      username: joi
        .string()
        .username()
        .required(),
    });
    const report = joi.validate(query, nameSchema);
    if (report.error) {
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
      if (!votes || !votes.length) return res.json({ accounts: [] });

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

      result = {
        success: true,
        accounts: accountsViewModel,
      };
      return res.json(result);
    } catch (e) {
      this.library.logger.error('Failed to find voters', e);
      return next('Server error');
    }
  };

  private getDelegate = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const publicKeyOrNameOrAddress = joi.object().keys({
      publicKey: joi.string().publicKey(),
      username: joi.string().username(),
      address: joi.string().address(),
    });
    const report = joi.validate(query, publicKeyOrNameOrAddress);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const delegates: DelegateViewModel[] = await Delegates.getDelegates();
    if (!delegates) {
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
      const result: ApiResult<DelegateWrapper> = {
        success: true,
        delegate,
      };
      return res.json(result);
    }
    return next('Can not find delegate');
  };

  private getDelegates = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const offset = Number(query.offset || 0);
    const limit = Number(query.limit || 10);
    if (Number.isNaN(limit) || Number.isNaN(offset)) {
      return res.status(422).send({
        success: false,
        error: 'Invalid params',
      });
    }

    const schema = joi.object().keys({
      limit: joi
        .number()
        .min(0)
        .max(101),
      offset: joi.number().min(0),
    });

    const report = joi.validate({ limit, offset }, schema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const delegates: DelegateViewModel[] = await Delegates.getDelegates();
    if (!delegates) return next('No delegates found');
    const result: ApiResult<DelegatesWrapper> = {
      success: true,
      totalCount: delegates.length,
      delegates: delegates.slice(offset, offset + limit),
    };
    return res.json(result);
  };

  private forgingEnable = async (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const secretAndPublicKey = joi.object().keys({
      secret: joi
        .string()
        .secret()
        .required(),
      publicKey: joi.string().publicKey(),
    });
    const report = joi.validate(body, secretAndPublicKey);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const ip = req.connection.remoteAddress;

    if (
      this.library.config.forging.access.whiteList.length > 0 &&
      this.library.config.forging.access.whiteList.indexOf(ip) < 0
    ) {
      return next('Access denied');
    }

    const keypair = ed.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(body.secret, 'utf8')
        .digest()
    );

    if (body.publicKey) {
      if (keypair.publicKey.toString('hex') !== body.publicKey) {
        return next('Invalid passphrase');
      }
    }

    const publicKey = keypair.publicKey.toString('hex');
    if (StateHelper.isPublicKeyInKeyPairs(publicKey)) {
      return next('Forging is already enabled');
    }

    const address = generateAddressByPublicKey(publicKey);
    const accountInfo = await getAccount(address);
    if (typeof accountInfo === 'string') {
      return next(accountInfo.toString());
    }

    if (accountInfo && accountInfo.account.isDelegate) {
      StateHelper.setKeyPair(publicKey, keypair);
      this.library.logger.info(
        `Forging enabled on account: ${accountInfo.account.address}`
      );
      return res.json({ success: true });
    }
    return next('Delegate not found');
  };

  private forgingDisable = async (req: Request, res: Response, next: Next) => {
    const { body } = req;
    const secretAndPublicKey = joi.object().keys({
      secret: joi
        .string()
        .secret()
        .required(),
      publicKey: joi.string().publicKey(),
    });
    const report = joi.validate(body, secretAndPublicKey);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const ip = req.connection.remoteAddress;

    if (
      this.library.config.forging.access.whiteList.length > 0 &&
      this.library.config.forging.access.whiteList.indexOf(ip) < 0
    ) {
      return next('Access denied');
    }

    const keypair = ed.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(body.secret, 'utf8')
        .digest()
    );

    if (body.publicKey) {
      if (keypair.publicKey.toString('hex') !== body.publicKey) {
        return next('Invalid passphrase');
      }
    }

    const publicKey = keypair.publicKey.toString('hex');
    if (!StateHelper.isPublicKeyInKeyPairs(keypair.publicKey.toString('hex'))) {
      return next('Delegate not found');
    }

    const address = generateAddressByPublicKey(publicKey);
    const accountOverview = await getAccount(address);

    if (typeof accountOverview === 'string') {
      return next(accountOverview.toString());
    }

    if (accountOverview.account && accountOverview.account.isDelegate) {
      StateHelper.removeKeyPair(keypair.publicKey.toString('hex'));
      this.library.logger.info(
        `Forging disabled on account: ${accountOverview.account.address}`
      );
      return res.json({ success: true });
    }
    return next('Delegate not found');
  };

  private forgingStatus = (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const needPublicKey = joi.object().keys({
      publicKey: joi
        .string()
        .publicKey()
        .required(),
    });
    const report = joi.validate(query, needPublicKey);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const isEnabled = !!StateHelper.isPublicKeyInKeyPairs(query.publicKey);
    const result: ApiResult<ForgingStatus> = {
      success: true,
      enabled: isEnabled,
    };
    return res.json(result);
  };

  // only used in DEBUG
  private forgingEnableAll = (req: Request, res: Response, next: Next) => {
    StateHelper.SetForgingEnabled(true);
    return res.json({ success: true });
  };

  private forgingDisableAll = (req: Request, res: Response, next: Next) => {
    StateHelper.SetForgingEnabled(false);
    return res.json({ success: true });
  };
}
