import {
  Transaction,
  KeyPair,
  IBlock,
  BlockPropose,
  IState,
  ISimpleCache,
  IConfig,
  NewBlockMessage,
  ILogger,
  KeyPairsIndexer,
} from '../interfaces';

export class StateHelper {
  // keyPairs
  public static getInitialKeyPairs() {
    return {} as KeyPairsIndexer;
  }
  public static SetKeyPairs(keyPairs: KeyPairsIndexer) {
    global.keyPairs = keyPairs;
  }
  public static GetKeyPairs() {
    return global.keyPairs;
  }
  public static isPublicKeyInKeyPairs(publicKey: string) {
    if (global.keyPairs[publicKey]) {
      return true;
    } else {
      return false;
    }
  }
  public static setKeyPair(publicKey: string, keys: KeyPair) {
    global.keyPairs[publicKey] = keys;
  }
  public static removeKeyPair(publicKey: string) {
    delete global.keyPairs[publicKey];
  }

  // isForgingEnabled
  public static IsForgingEnabled() {
    return global.isForgingEnabled;
  }
  public static SetForgingEnabled(newStatus: boolean) {
    global.isForgingEnabled = newStatus;
  }
}
