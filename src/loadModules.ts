import server from './core/server';
import accounts from './core/accounts';
import transactions from './core/transactions';
import loader from './core/loader';
import system from './core/system';
import peer from './core/peer';
import transport from './core/transport';
import delegates from './core/delegates';
import round from './core/round';
import uia from './core/uia';
import blocks from './core/blocks';


interface Wrapper {
  class: any;
  name: string;
}
const loadedModules: Wrapper[] = [];


const serverModule = { class: server, name: 'server' };
const accountsModule = { class: accounts, name: 'accounts' };
const transactionsModule = { class: transactions, name: 'transactions' };
const loaderModule = { class: loader, name: 'loader' };
const systemModule = { class: system, name: 'system' };
const peerModule = { class: peer, name: 'peer' };
const transportModule = { class: transport, name: 'transport' };
const delegatesModule = { class: delegates, name: 'delegates' };
const roundModule = { class: round, name: 'round' };
const uiaModule = { class: uia, name: 'uia' };
const blocksModule = { class: blocks, name: 'blocks' };

loadedModules.push(serverModule);
loadedModules.push(accountsModule);
loadedModules.push(transactionsModule);
loadedModules.push(loaderModule);
loadedModules.push(systemModule);
loadedModules.push(peerModule);
loadedModules.push(transportModule);
loadedModules.push(delegatesModule);
loadedModules.push(roundModule);
loadedModules.push(uiaModule);
loadedModules.push(blocksModule);

export default loadedModules;
