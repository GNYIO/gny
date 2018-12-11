import server from './core/server'
import accounts from './core/accounts'
import transactions from './core/transactions'
import loader from './core/loader'
import system from './core/system'
import peer from './core/peer'
import transport from './core/transport'
import delegates from './core/delegates'
import round from './core/round'
import uia from './core/uia'
import blocks from './core/blocks'


interface Wrapper {
  class: any;
  name: string;
}
let loadedModules: Wrapper[] = [];


let serverModule = { class: server, name: 'server' }
let accountsModule = { class: accounts, name: 'accounts' }
let transactionsModule = { class: transactions, name: 'transactions' }
let loaderModule = { class: loader, name: 'loader' }
let systemModule = { class: system, name: 'system' }
let peerModule = { class: peer, name: 'peer' }
let transportModule = { class: transport, name: 'transport' }
let delegatesModule = { class: delegates, name: 'delegates' }
let roundModule = { class: round, name: 'round' }
let uiaModule = { class: uia, name: 'uia' }
let blocksModule = { class: blocks, name: 'blocks' }

loadedModules.push(serverModule)
loadedModules.push(accountsModule)
loadedModules.push(transactionsModule)
loadedModules.push(loaderModule)
loadedModules.push(systemModule)
loadedModules.push(peerModule)
loadedModules.push(transportModule)
loadedModules.push(delegatesModule)
loadedModules.push(roundModule)
loadedModules.push(uiaModule)
loadedModules.push(blocksModule)

export default loadedModules
