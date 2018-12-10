import async = require('async');
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import rmdir = require('rimraf');
import Router = require('../utils/router');

export class Chains {
  private library: any;

  constructor(scope: any) {
    this.library = scope;
  }
}