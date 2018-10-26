import async = require('async');
import fs = require('fs');
import path = require('path');
import _ = require('lodash');
import Sandbox = require('asch-sandbox');
import rmdir = require('rimraf');
import Router = require('../utils/router');
import sandboxHelper = require('../utils/sandbox');

export class Chains {
  library: any;
  modules: any;
  private baseDir: string;

  constructor(scope: any) {
    this.library = scope;
  }


}