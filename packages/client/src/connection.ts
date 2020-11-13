import { Api } from './api';
import { Contract } from './contract';
import { NetworkType } from '@gny/interfaces';
const v = require('vlid');

function isIpOrUrl(value: any) {
  const ip = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const url = /^([a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+.*)$/;

  return ip.test(value) || url.test(value);
}

function isPort(value: any) {
  const result = Number.isInteger(value) && value > 0 && value < 65535;
  return result;
}

function isNetworkType(value: string) {
  if (value === 'localnet' || value === 'testnet' || value === 'mainnet') {
    return true;
  }
  return false;
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

    const config = {
      host: this.host,
      port: this.port,
      network: this.network,
      https: https,
    };
    const schema = v
      .object({
        host: v
          .string()
          .rule(isIpOrUrl)
          .required(),
        port: v
          .number()
          .rule(isPort)
          .required(),
        network: v
          .string()
          .rule(isNetworkType)
          .required(),
        https: v.boolean().required(),
      })
      .required();
    const report = v.validateSync(schema, config);
    if (report.isValid === false) {
      throw new Error(report.errors[0].message);
    }
  }

  public api = Api(this);

  public contract = Contract(this);
}
