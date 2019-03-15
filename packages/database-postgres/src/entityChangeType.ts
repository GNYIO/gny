var output = {};

export enum EntityState {
  Transient = -1,
  Persistent = 0,
  New = 1,
  Modified = 2,
  Deleted = 3,
}

export const ENTITY_VERSION_PROPERTY = "_version_";
export const ENTITY_EXTENSION_SYMBOL = "__extension__";

export enum EntityChangeType {
  New = 1,
  Modify = 2,
  Delete = 3,
}
