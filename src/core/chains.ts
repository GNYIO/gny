import async = require('async');
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import rmdir = require('rimraf');
import Router = require('../utils/router');
import { IScope } from '../interfaces'

export class Chains {
  private library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }
}