import 'reflect-metadata';
import { Connection, getConnection, MoreThan } from 'typeorm';

import { Account } from './entity/Account';
import { Asset } from './entity/Asset';
import { Balance } from './entity/Balance';
import { Block } from './entity/Block';
import { Delegate } from './entity/Delegate';
import { Issuer } from './entity/Issuer';
import { Round } from './entity/Round';
import { Transaction } from './entity/Transaction';
import { Transfer } from './entity/Transfer';
import { Variable } from './entity/Variable';
import { Vote } from './entity/Vote';
import { ILogger } from '../../src/interfaces';

import { loadConfig } from './loadConfig';

interface LimitAndOffset {
  limit: number;
  offset: number;
}

const ENTITY: any = {
  'Account': Account,
  'Asset': Asset,
  'Balance': Balance,
  'Block': Block,
  'Delegate': Delegate,
  'Issuer': Issuer,
  'Round': Round,
  'Transaction': Transaction,
  'Variable': Variable,
  'Vote': Vote,
  'Transfer': Transfer
};



