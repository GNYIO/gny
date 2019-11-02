import { MetaDataStore } from './metaDataStore';

export interface ConfigOptions {
  memory: boolean;
  maxCachedCount?: number;
}

export function Config(options: ConfigOptions) {
  return function(target: Function) {
    MetaDataStore.add(target.name, options);
  };
}
