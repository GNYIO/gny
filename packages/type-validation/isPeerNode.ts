import { PeerNode } from '../../packages/interfaces';
import joi from '../../packages/extendedJoi';

export function isPeerNode(peer: any): peer is PeerNode {
  const peerSchema = joi.object().keys({
    host: joi
      .string()
      .ip()
      .required(),
    port: joi
      .number()
      .port()
      .required(),
  });
  const peerReport = joi.validate(peer, peerSchema);
  if (peerReport.error) {
    return false;
  }
  return true;
}
