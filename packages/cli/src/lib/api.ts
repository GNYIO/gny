import axios from 'axios';
import * as program from 'commander';
import { UnconfirmedTransaction } from '@gny/interfaces';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

export interface ApiOptions {
  host: string;
  port: number;
}

export type ApiConfig = Partial<program.CommanderStatic> & ApiOptions;

export class Api {
  options: ApiConfig;
  host: string;
  port: number;
  baseUrl: string;
  magic: string;

  constructor(options: ApiConfig) {
    this.options = options;
    this.host = this.options.host || '127.0.0.1';
    this.port = this.options.port || 4096;
    this.baseUrl = `http://${this.host}:${this.port}`;
    this.magic = '594fe0f3';
  }

  get = function(path: string, params, cb?) {
    let qs = null;
    if (typeof params === 'function') {
      cb = params;
    } else {
      qs = params;
    }

    axios
      .get(this.baseUrl + path, { params: qs })
      .then(function(response) {
        cb(null, response.data);
      })
      .catch(function(error) {
        cb(error, null);
      });
  };

  post = function(path, data, cb) {
    axios
      .post(this.baseUrl + path, data, config)
      .then(function(response) {
        cb(null, response.data);
      })
      .catch(function(error) {
        cb(error, null);
      });
  };

  broadcastTransaction = function(trs: UnconfirmedTransaction, cb) {
    const data = {
      transaction: trs,
    };
    axios
      .post(this.baseUrl + '/peer/transactions', data, config)
      .then(function(response) {
        cb(null, response.data);
      })
      .catch(function(error) {
        cb(error, null);
      });
  };
}
