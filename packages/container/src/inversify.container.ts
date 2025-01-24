import { Container, ContainerModule, interfaces } from 'inversify';
import { TYPES } from './inversify.types';
import {
  ICheckDat,
  IConfig,
  ICountDatsWithWrongName,
  IPromService,
} from './inversify.interfaces';

export const container = new Container();
