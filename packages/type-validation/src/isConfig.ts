import { IConfig, ILogger } from '@gny/interfaces';
import { joi } from '@gny/extended-joi';

export function isConfig(config: IConfig, logger: ILogger): config is IConfig {
  const schema = joi
    .object()
    .keys({
      port: joi
        .number()
        .integer()
        .port()
        .required(),
      peerPort: joi
        .number()
        .integer()
        .port()
        .required(), // always must be port + 1
      address: joi.string().ip(),
      publicIp: joi
        .string()
        .ip()
        .required(),
      logLevel: joi.string(),
      magic: joi.string().required(),
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
          .items(joi.string().multiaddr())
          .required(),
        privateP2PKey: joi.string().required(),
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
          port: joi
            .number()
            .integer()
            .port(),
          address: joi.string().ip(),
          key: joi.string(),
          cert: joi.string(),
        }),
      }),

      version: joi.string(),
      baseDir: joi.string(),
      buildVersion: joi.string(),
      netVersion: joi
        .string()
        .networkType()
        .required(),
      dbPassword: joi.string().required(),
      dbDatabase: joi.string().required(),
      dbUser: joi.string().required(),
      dbHost: joi.string().required(),
      dbPort: joi
        .number()
        .integer()
        .port()
        .required(),
      nodeAction: joi
        .string()
        .regex(
          new RegExp(
            /^forging|rollback:[1-9][0-9]*|stopWithHeight:[1-9][0-9]*$/
          )
        )
        .required(),
      jaegerHost: joi
        .string()
        .uri()
        .required(),
      p2pConfig: joi
        .object()
        .keys({
          P2P_VERSION: joi
            .string()
            .regex(new RegExp(/^v[0-9]+.[0-9]+$/))
            .required(),
          P2P_PARTIAL_GENESIS_ID: joi.string().required(),
          V1_NEW_BLOCK_PROTOCOL: joi.string().required(),
          V1_VOTES: joi.string().required(),
          V1_COMMON_BLOCK: joi.string().required(),
          V1_GET_HEIGHT: joi.string().required(),
          V1_BLOCKS: joi.string().required(),
          V1_GET_PEERS: joi.string().required(),

          V1_BROADCAST_NEW_BLOCK_HEADER: joi.string().required(),
          V1_BROADCAST_TRANSACTION: joi.string().required(),
          V1_BROADCAST_PROPOSE: joi.string().required(),
          V1_RENDEZVOUS_BROADCAST: joi.string().required(),
        })
        .required(),
      activateDat: joi
        .boolean()
        .strict()
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
