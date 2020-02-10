import axios from 'axios';
import * as program from 'commander';
import { UnconfirmedTransaction } from '@gny/interfaces';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

export const http = axios.create();

export interface ApiOptions {
  host: string;
  port: number;
}

export type ApiConfig = Partial<program.CommanderStatic> & ApiOptions;

export async function get(url, params?) {
  try {
    const { data } = await http.get(url, {
      params: params,
    });
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response.data);
  }
}

export async function post(url, params) {
  try {
    const { data } = await http.post(url, params, config);
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response.data);
  }
}

export default {
  get: get,
  post: post,
};
