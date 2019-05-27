import { IBlock, IScope } from '../../../src/interfaces';
import { createStore, combineReducers } from 'redux';
import consensus from './consensusReducer';

const reducers = combineReducers({
  consensus,
});

export const store = createStore(reducers);
// checkout redux documentation - use with typescript
