import * as request from 'request';
import axios from 'axios';
import * as program from 'commander';
import { UnconfirmedTransaction } from '@gny/interfaces';

export function resultHandler(cb) {
  return function(err, resp, body) {
    if (err) {
      cb('Request error: ' + err);
    } else if (resp.statusCode != 200) {
      let msg = 'Unexpected status code: ' + resp.statusCode;
      if (body.error) {
        msg += ', ';
        msg += body.error;
      }
      cb(msg);
    } else {
      if (body.hasOwnProperty('success') && !body.success) {
        cb('Server error: ' + (body.error || body.message));
      } else {
        console.log(body);
        cb(null, body);
      }
    }
  };
}

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

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
      .get(this.baseUrl + path, { params: params })
      .then(function(response) {
        cb(null, response.data);
      })
      .catch(function(error) {
        cb(error, null);
      });

    // request(
    //   {
    //     method: 'GET',
    //     url: this.baseUrl + path,
    //     json: true,
    //     qs: qs,
    //   },
    //   resultHandler(cb)
    // );
  };

  post = function(path, data, cb) {
    request(
      {
        method: 'POST',
        url: this.baseUrl + path,
        json: data,
      },
      resultHandler(cb)
    );
  };

  broadcastTransaction = function(trs: UnconfirmedTransaction, cb) {
    request(
      {
        method: 'POST',
        url: this.baseUrl + '/peer/transactions',
        headers: {
          magic: this.magic,
          version: '',
        },
        json: {
          transaction: trs,
        },
      },
      resultHandler(cb)
    );
  };
}
