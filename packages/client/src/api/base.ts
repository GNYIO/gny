import { Connection } from '../connection';
import axios from 'axios';

export class Base {
  public constructor(protected readonly connection: Connection) {}

  public async get(url: string, params?: any) {
    const { data, headers, status } = await axios.get(
      this.connection.baseUrl + url,
      { params: params }
    );
    return {
      data,
      headers,
      status,
    };
  }

  public async post(url: string, params?: any) {
    const { data, headers, status } = await axios.post(
      this.connection.baseUrl + url,
      params,
      {
        headers: {
          magic: this.connection.hash,
        },
      }
    );
    return {
      data,
      headers,
      status,
    };
  }

  public async put(url: string, params?: any) {
    const { data, headers, status } = await axios.put(
      this.connection.baseUrl + url,
      params
    );
    return {
      data,
      headers,
      status,
    };
  }
}
