import { Basic } from './basic';
import { Uia } from './uia';
import { Dat } from './dat';

import { Connection } from '../connection';

export const Contract = (connection: Connection) => {
  return {
    Basic: new Basic(connection),
    Uia: new Uia(connection),
    Dat: new Dat(connection),
  };
};
