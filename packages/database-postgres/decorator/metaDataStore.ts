import { MemoryOptions, MaxCachedOptions } from './config';

export class MetaDataStore {
  private static store: Map<string, MemoryOptions | MaxCachedOptions>;

  public static add(model: string, option: MemoryOptions | MaxCachedOptions) {
    if (!MetaDataStore.store) {
      MetaDataStore.store = new Map<string, MemoryOptions | MaxCachedOptions>();
    }

    if (!MetaDataStore.store.has(model)) {
      MetaDataStore.store.set(model, undefined); // default
    }

    if (option) {
      const modelObj = MetaDataStore.store.get(model);
      Object.assign(modelObj || {}, option);
      MetaDataStore.store.set(model, modelObj);
    }
  }

  public static getAllOptionsFor(model: string) {
    return MetaDataStore.store.get(model);
  }

  public static delete(model: string) {
    return MetaDataStore.store.delete(model);
  }

  public static clearAll() {
    MetaDataStore.store.clear();
  }
}

