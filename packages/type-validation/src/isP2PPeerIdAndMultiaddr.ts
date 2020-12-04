import { P2PPeerIdAndMultiaddr, ILogger } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';

export function isP2PPeerIdAndMultiaddr(
  config: P2PPeerIdAndMultiaddr,
  logger: ILogger
): config is P2PPeerIdAndMultiaddr {
  const schema = joi
    .object({
      peerId: joi
        .string()
        .peerId()
        .required(),
      multiaddr: joi
        .array()
        .items(
          joi
            .string()
            .multiaddr()
            .required()
        )
        .min(1)
        .required(),
    })
    .required();

  const report = joi.validate(config, schema);
  if (report.error) {
    logger.error(report.error.message);
    return false;
  }
  return true;
}
