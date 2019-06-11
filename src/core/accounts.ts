import * as addressHelper from '../utils/address';
import { Modules, IScope } from '../interfaces';
import { BlocksCorrect } from './blocks-correct';

export default class Account {
  private modules: Modules;
  private readonly library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }

  public generateAddressByPublicKey = (publicKey: string) => {
    return addressHelper.generateAddress(publicKey);
  };

  public getAccountByName = async (name: string) => {
    try {
      const account = await global.app.sdb.findOne('Account', {
        condition: { username: name },
      });
      return account;
    } catch (err) {
      return 'Server Error';
    }
  };

  public getAccount = async (address: string) => {
    const schema = this.library.joi
      .string()
      .address()
      .required();
    const report = this.library.joi.validate(address, schema);
    if (report.error) {
      return 'provided address is not a GNY address';
    }

    try {
      const account = await global.app.sdb.findOne('Account', {
        condition: { address },
      });
      let accountData;
      if (!account) {
        accountData = {
          address: address,
          balance: 0,
          secondPublicKey: '',
          lockHeight: 0,
          isDelegate: 0,
          username: null,
        };
      } else {
        accountData = {
          address: account.address,
          balance: account.gny,
          secondPublicKey: account.secondPublicKey,
          lockHeight: account.lockHeight || 0,
          isDelegate: account.isDelegate,
          username: account.username,
        };
      }
      const latestBlock = BlocksCorrect.getState().lastBlock;
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
  };

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope;
  };
}
