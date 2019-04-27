# gny-js Examples

Order in which transactions should be executed

> Info: Between every contract execution you will need to wait at least 1 block (~10 seconds) for the new information to persist

> Second Passphrase: If the contract `gnySetSecondPassphrase.js` is executed, then all following contract transactions will need to be signed with the `second passphrase`

## Create Asset
1. `gnyRegisterIssuer.js`
2. `gnyRegisterAsset.js`
3. `gnyIssuerAsset.js`
4. `gnyTransferAsset.js` or `gnyTransferAssetByUsername`

## Become Delegate
1. `gnyLock.js`
2. `gnySetUsername.js`
2. `gnyRegisterDelegate.js`

## Vote for other Delegate
1. `gnyLock.js`
2. `gnyVote.js`
3. `gnyUnvote.js` (optional)

## Transfer GNY examples
`gnyTransferGNY.js`  
`gnyTransferGNYToRandomAccount.js`  
`gnyTransferGNYUnconfirmed.js` (this doesn't sign the transaction)  