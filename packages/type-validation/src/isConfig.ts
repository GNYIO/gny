import { IConfig, ILogger } from '@gny/interfaces';
import { joi } from '@gny/extendedJoi';

export function isConfig(config: IConfig, logger: ILogger): config is IConfig {
  const schema = joi
    .object()
    .keys({
      port: joi
        .number()
        .port()
        .required(),
      peerPort: joi
        .number()
        .port()
        .required(), // always must be port + 1
      address: joi.string().ip(),
      publicIp: joi
        .string()
        .ip()
        .required(),
      logLevel: joi.string(),
      magic: joi.string(),
      api: joi.object().keys({
        access: joi.object().keys({
          whiteList: joi
            .array()
            .items(joi.string().ip())
            .required(),
        }),
      }),
      peers: joi.object().keys({
        bootstrap: joi
          .array()
          .items(joi.string())
          .required(),
        p2pKeyFile: joi.string().required(),
        rawPeerInfo: joi.string().required(),
        privateP2PKey: joi.string().optional(),
      }),
      forging: joi
        .object()
        .keys({
          secret: joi
            .array()
            .items(joi.string().secret())
            .required(),
          access: joi.object().keys({
            whiteList: joi
              .array()
              .items(joi.string().ip())
              .required(),
          }),
        })
        .required(),
      ssl: joi.object().keys({
        enabled: joi.boolean(),
        options: joi.object().keys({
          port: joi.number().port(),
          address: joi.string().ip(),
          key: joi.string(),
          cert: joi.string(),
        }),
      }),

      version: joi.string(),
      baseDir: joi.string(),
      buildVersion: joi.string(),
      netVersion: joi.string(),
      ormConfigRaw: joi.string().required(),
    })
    .required();

  const report = joi.validate(config, schema);
  if (report.error) {
    logger.error(report.error.message);
    return false;
  }

  return true;
}
