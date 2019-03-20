import { MetaDataStore } from './metaDataStore';

export interface MemoryOptions {
  memory: boolean;
}

export interface MaxCachedOptions {
  maxCached: number;
}

export function Config(options: MemoryOptions | MaxCachedOptions) {
  return function (target: Function) {
    if (options) {
      MetaDataStore.add(target.name, options);
    }
  };
}
