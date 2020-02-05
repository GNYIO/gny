// import contracts
import basic from './contract/basic';
import uia from './contract/uia';
import ml from './contract/ml';

interface ModuleWrapper {
  module: any;
  name: string;
}

function addContract(contract: ModuleWrapper) {
  if (contract.name !== 'index.js') {
    global.app.contract[contract.name] = contract.module;
  }
}

export default async function loadContracts() {
  addContract({ module: basic, name: 'basic' });
  addContract({ module: uia, name: 'uia' });
  addContract({ module: ml, name: 'ml' });
}
