import changeCase = require('change-case');

// import contracts
import basic from './contract/basic';
import proposal from './contract/proposal';
import uia from './contract/uia';

interface ModuleWrapper {
  module: any;
  name: string;
}

function getContractName(fileName: string) {
  return changeCase.snakeCase(fileName);
}

function addContract(contract: ModuleWrapper) {
  if (contract.name !== 'index.js') {
    app.contract[contract.name] = contract.module;
  }
}

export default async function loadContracts() {
  addContract({ module: basic, name: 'basic' });
  addContract({ module: proposal, name: 'proposal' });
  addContract({ module: uia, name: 'uia' });
}
