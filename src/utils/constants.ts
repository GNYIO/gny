export default {
  maxAmount: 100000000,
  maxPayloadLength: 8 * 1024 * 1024,
  blockHeaderLength: 248,
  addressLength: 208,
  maxAddressesLength: 208 * 128,
  maxClientConnections: 100,
  numberLength: 100000000,
  feeStartVolume: 10000 * 100000000,
  feeStart: 1,
  maxRequests: 10000 * 12,
  requestLength: 104,
  signatureLength: 196,
  maxSignaturesLength: 196 * 256,
  maxConfirmations: 77 * 100,
  confirmationLength: 77,
  fixedPoint: 10 ** 6,
  totalAmount: 2500000000000000,
  maxTxsPerBlock: 20000,
  interval: 15,
  INTERVAL: 10,
  DELEGATES: 101,
  EPOCH_TIME: new Date(Date.UTC(2018, 10, 18, 20, 0, 0, 0)),
  REWARDS: {
		MILESTONES: [
			200000000, // Initial Reward
			150000000, // Milestone 1
			100000000, // Milestone 2
			50000000, // Milestone 3
		],
		OFFSET: 2160, // Start rewards at first block of the second round
		DISTANCE: 3000000, // Distance between each milestone
  },
  TOTAL_AMOUNT: '10000000000000000',
}
