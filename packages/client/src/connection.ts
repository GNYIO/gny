import { Api } from './api';
import { Contract } from './contract';
import { NetworkType } from '@gny/interfaces';

export class Connection {
  host: string;
  port: number;
  network: NetworkType;
  baseUrl: string;

  constructor(host?: string, port?: number, network?: NetworkType) {
    this.host = host || '127.0.0.1';
    this.port = port || 4096;
    this.network = network || 'localnet';
    this.baseUrl = `http://${this.host}:${this.port}`;
  }

  public api = Api(this);

  public contract = Contract(this);
}
