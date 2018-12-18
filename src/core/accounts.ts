import * as addressHelper from '../utils/address';
import { Modules, IScope } from '../interfaces';

export default class Account {
  private modules: Modules;
  private readonly library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }

  public generateAddressByPublicKey = (publicKey) => {
    return addressHelper.generateAddress(publicKey);
  }

  public getAccount = async (address: string) => {
    let report = this.library.scheme.validate(address, {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    });
    if (!report) {
      return 'address must be between 1 and 50 chars long';
    }

    try {
      const account = await global.app.sdb.findOne('Account', {
        condition: { address }
      });
      let accountData;
      if (!account) {
        accountData = {
          address: address,
          unconfirmedBalance: 0,
          balance: 0,
          secondPublicKey: '',
          lockHeight: 0,
        };
      } else {
        accountData = {
          address: account.address,
          unconfirmedBalance: account.gny,
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
  }

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope;
  }
}