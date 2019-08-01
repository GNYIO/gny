import * as request from 'request';
import axios from 'axios';

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

interface Options {
  host: string;
  port: string;
  mainnet?: any;
}

export default class Api {
  options: Options;
  mainnet: any;
  host: any;
  port: any;
  baseUrl: string;
  magic: string;

  constructor(options: Options) {
    this.options = options;
    this.mainnet = this.options.mainnet;
    this.host = this.options.host || '127.0.0.1';
    this.port = this.options.port || (this.mainnet ? 8192 : 4096);
    this.baseUrl = 'http://' + this.host + ':' + this.port;
    this.magic = this.mainnet ? '5f5b3cf5' : '594fe0f3';
  }

  get = async function(path, params, cb?) {
    let qs = null;
    if (typeof params === 'function') {
      cb = params;
    } else {
      qs = params;
    }
    // const { data } = await axios.get(this.baseUrl + path);
    request(
      {
        method: 'GET',
        url: this.baseUrl + path,
        json: true,
        qs: qs,
      },
      resultHandler(cb)
    );
  };

  put = function(path, data, cb) {
    request(
      {
        method: 'PUT',
        url: this.baseUrl + path,
        json: data,
      },
      resultHandler(cb)
    );
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

  broadcastTransaction = function(trs, cb) {
    request(
      {
        method: 'POST',
        url: this.baseUrl + '/peer/transactions',
        // TODO magic should be read from a config file or options
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
