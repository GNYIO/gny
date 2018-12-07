import async = require('async');
import fs = require('fs');
import path = require('path');
import * as _ from 'lodash';
import Sandbox = require('asch-sandbox');
import rmdir = require('rimraf');
import Router = require('../utils/router');

export class Chains {
  library: any;
  modules: any;
  private baseDir: string;

  constructor(scope: any) {
    this.library = scope;
  }


}