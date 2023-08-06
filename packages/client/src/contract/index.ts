import { Basic } from './basic';
import { Uia } from './uia';
import { Nft } from './nft';

import { Connection } from '../connection';

export const Contract = (connection: Connection) => {
  return {
    Basic: new Basic(connection),
    Uia: new Uia(connection),
    Nft: new Nft(connection),
  };
};
