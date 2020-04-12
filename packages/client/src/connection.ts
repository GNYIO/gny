import { Api } from './api';
import { Contract } from './contract';
import { NetworkType } from '@gny/interfaces';

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
    console.log(`@gny/client baseUrl ${this.baseUrl}`);
  }

  public api = Api(this);

  public contract = Contract(this);
}
