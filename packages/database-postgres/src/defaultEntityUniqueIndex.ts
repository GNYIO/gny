
/**
 * Class that represents an UNIQUE index for an Entity
 * Gets called for every UNIQUE index of a Model.
 * Example: Delegate has UNIQUE Constraints: tid, username, publicKey
 */
export class DefaultEntityUniqueIndex {
  private name: string;
  private indexFields: string[];
  indexMap: Map<string, string>;

  /**
   * @constructor
   * @param {string} name - Name of unique index - Example: "username"
   * @param {string[]} columns - Columns of that unique index - Example - ["username"]
   */
  constructor(name: string, indexFields: string[]) {
    this.name = name;
    this.indexFields = indexFields;
    this.indexMap = new Map<string, string>();
  }

  /**
   * @param {Object} key - can be for instance: { username:"gny_d1" }
   */
  private getIndexKey(key) {
    return JSON.stringify(key);
  }

  public exists(event) {
    return this.indexMap.has(this.getIndexKey(event));
  }

  /**
   * @param {Object} key - Object - Example: { username:"gny_d1" }
   */
  public get(key) {
    return this.indexMap.get(this.getIndexKey(key));
  }

  /**
   * Usage: this.indexMap.set('{"username":"gny_d1"}', '{"address":"GM5CevQY3brUyRtDMng5Co41nWHh"}')
   * @param {Object} uniqueColumnValue - Example: { username:"gny_d1" }
   * @param {string} keyStringified - Exapmle: "{"address":"GM5CevQY3brUyRtDMng5Co41nWHh"}"
   */
  public add(uniqueColumnValue, keyStringified: string) {
    const key = this.getIndexKey(uniqueColumnValue);
    if (this.indexMap.has(key)) {
      throw new Error("Unique named '" + this.name + "' key = '" + key + "' exists already");
    }
    this.indexMap.set(key, keyStringified);
  }

  /**
   * @param {Object} key - Example: { username: null }
   */
  public delete(key: any) {
    this.indexMap.delete(this.getIndexKey(key));
  }

  public get indexName() {
    return this.name;
  }

  public get fields() {
    return this.indexFields;
  }
}

export type ModelIndex = {
  name: string,
  properties: string[];
};
