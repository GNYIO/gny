import { MetaDataStore } from './metaDataStore';

export interface MemoryOptions {
  memory: boolean;
  maxCached?: number;
}

export function Config(memoryOptions?: MemoryOptions) {
  return function (target: Function) {
    if (memoryOptions) {
      MetaDataStore.add(target.name, memoryOptions);
    }
  };
}
