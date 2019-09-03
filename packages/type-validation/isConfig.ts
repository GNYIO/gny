import { IConfig, ILogger } from '../../packages/interfaces';
import joi from '../../src/utils/extendedJoi';

export function isConfig(config: IConfig, logger: ILogger): config is IConfig {
  const schema = joi.object().keys({
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
        .string()
        .allow(null)
        .required(),
      p2pKeyFile: joi.string(),
      rawPeerInfo: joi.string().required(),
      options: joi.object().keys({
        timeout: joi
          .number()
          .integer()
          .min(0),
      }),
    }),
    forging: joi
      .object()
      .keys({
        secret: joi.array().items(
          joi
            .string()
            .secret()
            .required()
        ),
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
    dataDir: joi.string(),
    appDir: joi.string(),
    buildVersion: joi.string(),
    netVersion: joi.string(),
    publicDir: joi.string(),
    ormConfigRaw: joi.string().required(),
  });

  const report = joi.validate(config, schema);
  if (report.error) {
    logger.error(report.error.message);
    return false;
  }

  return true;
}
