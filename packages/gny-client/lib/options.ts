const optionMap: any = {
  clientDriftSeconds: 5,
};

export default {
  set: function(key: string, val: any) {
    optionMap[key] = val;
  },
  get: function(key: string) {
    return optionMap[key];
  },
  getAll: function() {
    return optionMap;
  },
};
