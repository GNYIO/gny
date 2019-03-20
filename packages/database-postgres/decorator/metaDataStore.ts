import { ConfigOptions } from './config';

export class MetaDataStore {
  private static store: Map<string, ConfigOptions>;

  public static add(model: string, option: ConfigOptions) {
    if (!MetaDataStore.store) {
      MetaDataStore.store = new Map<string, ConfigOptions>();
    }

    if (!MetaDataStore.store.has(model)) {
      MetaDataStore.store.set(model, undefined); // default
    }

    let modelObj = MetaDataStore.store.get(model);
    modelObj = option;

    MetaDataStore.store.set(model, modelObj);
  }

  public static getOptionsFor(model: string) {
    return MetaDataStore.store.get(model);
  }

  public static delete(model: string) {
    return MetaDataStore.store.delete(model);
  }

  public static clearAll() {
    MetaDataStore.store.clear();
  }
}

