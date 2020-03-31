import { Connection } from '../connection';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

export class Base {
  public constructor(protected readonly connection: Connection) {}

  protected async get(url: string, params?: any) {
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

  protected async post(url: string, params?: any) {
    const { data, headers, status } = await axios.post(
      this.connection.baseUrl + url,
      params,
      config
    );
    return {
      data,
      headers,
      status,
    };
  }

  protected async put(url: string, params?: any) {
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
