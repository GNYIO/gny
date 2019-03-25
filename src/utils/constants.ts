export const maxAmount: number = 100000000;
export const maxPayloadLength: number = 8 * 1024 * 1024;
export const blockHeaderLength: number = 248;
export const addressLength: number = 208;
export const maxAddressesLength: number = 208 * 128;
export const maxClientConnections: number = 100;
export const numberLength: number = 100000000;
export const feeStartVolume: number = 10000 * 100000000;
export const feeStart: number = 1;
export const maxRequests: number = 10000 * 12;
export const requestLength: number = 104;
export const signatureLength: number = 196;
export const maxSignaturesLength: number = 196 * 256;
export const maxConfirmations: number = 77 * 100;
export const confirmationLength: number = 77;
export const fixedPoint: number = 10 ** 6;
export const totalAmount: number = 2500000000000000;
export const maxTxsPerBlock: number = 20000;
export const TIMEOUT: number = 15;

export const INTERVAL: number = 10;
export const DELEGATES: number = 101;
export const EPOCH_TIME: Date = new Date(Date.UTC(2018, 10, 18, 20, 0, 0, 0));

interface IReward {
  MILESTONES: number[];
  OFFSET: number;
  DISTANCE: number;
}
export const REWARDS: IReward = {
  MILESTONES: [
    200000000, // Initial Reward
    150000000, // Milestone 1
    100000000, // Milestone 2
    50000000 // Milestone 3
  ],
  OFFSET: 2160, // Start rewards at first block of the second round
  DISTANCE: 3000000 // Distance between each milestone
};
export const INITIAL_AMOUNT: string = '40000000000000000';

export const SAVE_PEERS_INTERVAL: number = 1 * 60 * 1000;
export const CHECK_BUCKET_OUTDATE: number = 1 * 60 * 1000;
export const MAX_BOOTSTRAP_PEERS: number = 25;
