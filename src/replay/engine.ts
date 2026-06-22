import { RecordedInteraction, ReplayOptions, ReplayResult, ReplaySession } from './types';

/**
 * A contract handler that the ReplayEngine dispatches interactions to.
 * Keyed by contractId → method → async function that accepts the recorded args.
 */
export type ContractHandlers = Record<
  string,
  Record<string, (...args: unknown[]) => Promise<unknown>>
>;

/**
 * Replays a {@link ReplaySession} against a set of contract handler functions.
 *
 * @example
 * ```typescript
 * const engine = new ReplayEngine({
 *   'CONTRACT_ID': { deposit: (amount) => vault.deposit({ amount: amount as bigint }) }
 * });
 * const results = await engine.replay(session);
 * ```
 */
export class ReplayEngine {
  constructor(private readonly handlers: ContractHandlers) {}

  /**
   * Replays all interactions in the session and returns per-interaction results.
   */
  async replay(session: ReplaySession, options: ReplayOptions = {}): Promise<ReplayResult[]> {
    const results: ReplayResult[] = [];

    for (const interaction of session.interactions) {
      const result = await this.replayOne(interaction);
      results.push(result);

      if (options.stopOnFailure && !result.success) {
        break;
      }
    }

    return results;
  }

  private async replayOne(interaction: RecordedInteraction): Promise<ReplayResult> {
    const { id, contractId, method, args } = interaction;
    const handler = this.handlers[contractId]?.[method];
    const start = Date.now();

    if (!handler) {
      return {
        interactionId: id,
        contractId,
        method,
        success: false,
        error: { name: 'Error', message: `No handler registered for ${contractId}.${method}` },
        durationMs: 0,
      };
    }

    try {
      const result = await handler(...args);
      return {
        interactionId: id,
        contractId,
        method,
        success: true,
        result,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        interactionId: id,
        contractId,
        method,
        success: false,
        error: {
          name: err instanceof Error ? err.name : 'Error',
          message: err instanceof Error ? err.message : String(err),
        },
        durationMs: Date.now() - start,
      };
    }
  }
}
