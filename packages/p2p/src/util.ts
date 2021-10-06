import { BufferList } from '@gny/interfaces';

export type AsyncMapFuncCallback = (
  err: Error,
  result?: String | Buffer
) => void;
export type AsyncMapFuncType = (
  data: Buffer,
  cb: AsyncMapFuncCallback
) => Promise<void>;

export type SimplePushTypeCallback = (err: Error, values: BufferList) => void;
