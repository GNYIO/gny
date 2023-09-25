import { ISpan } from '@gny/tracer';
import { slots } from '@gny/utils';
import { parseOptions } from 'commander';

export type TimeStampType = 'block-header' | 'propose';

export class TransportHelper {
  /**
   * do not accept block headers for blocks that
   * were created more than 5 seconds ago
   */
  public static timestampWithinTreshold(
    timestampType: TimeStampType,
    incomingEpoch: number,
    parentSpan: ISpan
  ): boolean {
    const diff = slots.secondsAfterTimestamp(incomingEpoch);
    const currentEpoch = slots.getEpochTime();

    if (diff >= 3) {
      const diffSpan = global.library.tracer.startSpan(
        'block header too late',
        {
          childOf: parentSpan.context(),
        }
      );
      diffSpan.log({
        value: timestampType,
      });
      diffSpan.setTag('error', true);
      diffSpan.log({
        message:
          'we will not accept this block header. Returning. The timestamp of the block indicates that the block was created more than 5 seconds ago. Variable diff is the difference of currentEpoch - incomingEpoch (block timestamp)',
        diff,
        currentEpoch,
        incomingEpoch,
      });
      global.library.logger.info(
        `[p2p] we will not accept this block header. Returning. The timestamp of the block indicates that the block was created more than 5 seconds ago. Variable diff is the difference of currentEpoch - incomingEpoch (block timestamp) (diff: ${diff}, currentEpoch ${currentEpoch} -  incomingEpoch ${incomingEpoch})`
      );

      diffSpan.finish();
      parentSpan.finish();

      return false;
    }

    return true;
  }
}
