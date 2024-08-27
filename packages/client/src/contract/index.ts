import { Basic } from './basic.js';
import { Uia } from './uia.js';
import { Dat } from './dat.js';
import { Verification } from './verification.js';

import { Connection } from '../connection.js';

export const Contract = (connection: Connection) => {
  return {
    Basic: new Basic(connection),
    Uia: new Uia(connection),
    Dat: new Dat(connection),
    Verification: new Verification(connection),
  };
};
