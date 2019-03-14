var output = {};
(function(FileChangeState) {
  FileChangeState[FileChangeState.Transient = -1] = "Transient";
  FileChangeState[FileChangeState.Persistent = 0] = "Persistent";
  FileChangeState[FileChangeState.New = 1] = "New";
  FileChangeState[FileChangeState.Modified = 2] = "Modified";
  FileChangeState[FileChangeState.Deleted = 3] = "Deleted";
})(output.EntityState || (output.EntityState = {}));

output.ENTITY_VERSION_PROPERTY = "_version_";
output.ENTITY_EXTENSION_SYMBOL = "__extension__";

(function(RequestMethod) {
  RequestMethod[RequestMethod.New = 1] = "New";
  RequestMethod[RequestMethod.Modify = 2] = "Modify";
  RequestMethod[RequestMethod.Delete = 3] = "Delete";
})(output.EntityChangeType || (output.EntityChangeType = {}));

module.exports = {
  EntityState: output.EntityState,
  EntityChangeType: output.EntityChangeType,
  ENTITY_VERSION_PROPERTY: output.ENTITY_VERSION_PROPERTY,
  ENTITY_EXTENSION_SYMBOL: output.ENTITY_EXTENSION_SYMBOL,
};
