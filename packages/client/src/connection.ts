import { Api } from './api';

export class Connection {
  host: string;
  port: number;
  network: string;
  baseUrl: string;

  constructor(host?: string, port?: number, network?: string) {
    this.host = host || '127.0.0.1';
    this.port = port || 4096;
    this.network = network || 'testnet';
    this.baseUrl = 'http://' + this.host + ':' + this.port;
  }

  public api = Api(this);
}
