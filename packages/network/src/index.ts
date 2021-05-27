import { NetworkType } from '@gny/interfaces';

import { network as testnet } from './testnet';
import { network as testnet_app } from './testnet_app';
import { network as mainnet } from './mainnet';
import { network as localnet } from './localnet';

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
