import * as _ from 'lodash'
import { AschCore } from 'asch-smartdb';

// import models
import account from './model/account'
import asset from './model/asset'
import balance from './model/balance'
import delegate from './model/delegate'
import issuer from './model/issuer'
import proposalVote from './model/proposal-vote'
import proposal from './model/proposal'
import round from './model/round'
import transactionStatu from './model/transaction-statu'
import transaction from './model/transaction'
import transfer from './model/transfer'
import variable from './model/variable'
import vote from './model/vote'

interface Wrapper {
  class: any;
  name: string;
}

function formatName(name: string) {
  return _.chain(name).camelCase().upperFirst().value()
}

function createModelSchema(model: Wrapper): AschCore.ModelSchema<{}> {
  let formattedName = formatName(model.name)
  return new AschCore.ModelSchema(model.class, formattedName)
}

export default async function loadModels() {
  const schemas = []
  schemas.push(createModelSchema({ class: account, name: 'account' }))
  schemas.push(createModelSchema({ class: asset, name: 'asset' }))
  schemas.push(createModelSchema({ class: balance, name: 'balance' }))
  schemas.push(createModelSchema({ class: delegate, name: 'delegate' }))
  schemas.push(createModelSchema({ class: issuer, name: 'issuer' }))
  schemas.push(createModelSchema({ class: proposalVote, name: 'proposal-vote' }))
  schemas.push(createModelSchema({ class: proposal, name: 'proposal' }))
  schemas.push(createModelSchema({ class: round, name: 'round' }))
  schemas.push(createModelSchema({ class: transactionStatu, name: 'transaction-statu' }))
  schemas.push(createModelSchema({ class: transaction, name: 'transaction' }))
  schemas.push(createModelSchema({ class: transfer, name: 'transfer'}))
  schemas.push(createModelSchema({ class: variable, name:'variable' }))
  schemas.push(createModelSchema({ class: vote, name: 'vote' }))

  await app.sdb.init(schemas)
}