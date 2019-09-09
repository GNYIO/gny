import { PeerNode } from '@gny/interfaces';
import { joi } from '@gny/extendedJoi';

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
