import changeCase = require('change-case');

// import contracts
import basic from './contract/basic';
import proposal from './contract/proposal';
import uia from './contract/uia';

interface ModuleWrapper {
  module: any;
  name: string;
}

function addContract(contract: ModuleWrapper) {
  if (contract.name !== 'index.js') {
    global.app.contract[contract.name] = contract.module
  }
}

export default async function loadContracts() {
  addContract({ module: basic, name: 'basic' });
  addContract({ module: proposal, name: 'proposal' });
  addContract({ module: uia, name: 'uia' });
}
