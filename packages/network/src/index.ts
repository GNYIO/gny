import { NetworkType } from '@gny/interfaces';

import { network as testnet } from './testnet.js';
import { network as testnet_app } from './testnet_app.js';
import { network as mainnet } from './mainnet.js';
import { network as localnet } from './localnet.js';

export function getConfig(network: NetworkType) {
  if (network === 'mainnet') {
    return mainnet;
  }
  if (network === 'testnet') {
    return testnet;
  }
  if (network === 'testnet_app') {
    return testnet_app;
  }
  if (network === 'localnet') {
    return localnet;
  }
  throw new Error('no network selected');
}
