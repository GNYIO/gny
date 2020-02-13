import * as process from 'process';

declare global {
  namespace NodeJS {
    interface Global {
      host: string;
      port: number;
    }
  }
}
