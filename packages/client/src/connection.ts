import { Api } from './api';
import { Contract } from './contract';
import { NetworkType } from '@gny/interfaces';

function isIpOrUrl(value: any): value is string {
  const ip = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const url = /^([a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+.*)$/;

  return ip.test(value) || url.test(value);
}

function isPort(value: any): value is number {
  const result = Number.isInteger(value) && value > 0 && value < 65535;
  return result;
}

function isNetworkType(value: any): value is NetworkType {
  if (value === 'localnet' || value === 'testnet' || value === 'mainnet') {
    return true;
  }
  return false;
}

function isBoolean(value: any): value is boolean {
  const result = typeof value === 'boolean';
  return result;
}

export class Connection {
  host: string;
  port: number;
  network: NetworkType;
  baseUrl: string;

  constructor(
    host?: string,
    port?: number,
    network?: NetworkType,
    https = false
  ) {
    this.host = host || '127.0.0.1';
    this.port = port || 4096;
    this.network = network || 'localnet';
    if (this.port === 80) {
      this.baseUrl = `${https ? 'https' : 'http'}://${this.host}`;
    } else {
      this.baseUrl = `${https ? 'https' : 'http'}://${this.host}:${this.port}`;
    }

    if (!isIpOrUrl(this.host)) {
      throw new Error('host not valid');
    }

    if (!isPort(this.port)) {
      throw new Error('port not valid');
    }

    if (!isNetworkType(this.network)) {
      throw new Error('networktype not valid');
    }

    if (!isBoolean(https)) {
      throw new Error('https not valid');
    }
  }

  public api = Api(this);

  public contract = Contract(this);
}
