import { ILogger, BufferList } from '@gny/interfaces';
import * as PeerInfo from 'peer-info';
import * as PeerId from 'peer-id';

export type AsyncMapFuncCallback = (
  err: Error,
  result?: String | Buffer
) => void;
export type AsyncMapFuncType = (
  data: Buffer,
  cb: AsyncMapFuncCallback
) => Promise<void>;

export type SimplePushTypeCallback = (err: Error, values: BufferList) => void;
