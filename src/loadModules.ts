import Server from './core/server'
import Accounts from './core/accounts'
import Transactions from './core/transactions'
import Loader from './core/loader'
import System from './core/system'
import Peer from './core/peer'
import Transport from './core/transport'
import Delegates from './core/delegates'
import Round from './core/round'
import Uia from './core/uia'
import Blocks from './core/blocks'

import { Modules, IScope } from './interfaces'


export default function loadModules(scope: Partial<IScope>) {

  let server = new Server(scope)
  let accounts = new Accounts(scope)
  let transactions = new Transactions(scope)
  let loader = new Loader(scope)
  let system = new System(scope)
  let peer = new Peer(scope)
  let transport = new Transport(scope)
  let delegates = new Delegates(scope)
  let round = new Round(scope)
  let uia = new Uia(scope)
  let blocks = new Blocks(scope)

  let modules : Modules = {
    server: server,
    accounts: accounts,
    transactions: transactions,
    loader: loader,
    system: system,
    peer: peer,
    transport: transport,
    delegates: delegates,
    round: round,
    uia: uia,
    blocks: blocks
  }
  return modules
}
