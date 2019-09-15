import { Connection } from '../connection';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

export class Basic {
  public constructor(protected readonly connection: Connection) {}

  public async get(url: string, params?: any) {
    try {
      const { data, headers, status } = await axios.get(
        this.connection.baseUrl + url,
        { params: params }
      );
      return {
        data,
        headers,
        status,
      };
    } catch (error) {
      throw new Error(error);
    }
  }

  public async post(url: string, params?: any) {
    try {
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
    } catch (error) {
      throw new Error(error);
    }
  }

  public async put(url: string, params?: any) {
    try {
      const { data, headers, status } = await axios.put(
        this.connection.baseUrl + url,
        params
      );
      return {
        data,
        headers,
        status,
      };
    } catch (error) {
      throw new Error(error);
    }
  }
}
