import { MemoryOptions } from './config';

export class MetaDataStore {
  private static store: Map<string, MemoryOptions>;

  public static add(model: string, option: MemoryOptions) {
    if (!MetaDataStore.store) {
      MetaDataStore.store = new Map<string, MemoryOptions>();
    }

    if (!MetaDataStore.store.has(model)) {
      MetaDataStore.store.set(model, {});
    }

    if (option) {
      const modelObj = MetaDataStore.store.get(model);
      Object.assign(modelObj, option);
      MetaDataStore.store.set(model, modelObj);
    }
  }

  public static getAllOptionsFor(model: string) {
    return MetaDataStore.store.get(model);
  }

  public static clearAll() {
    MetaDataStore.store.clear();
  }
}

