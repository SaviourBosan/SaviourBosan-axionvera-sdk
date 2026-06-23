import { RecordedInteraction, RecordingMetadata, ReplaySession } from './types';

/** Generates a simple unique ID without external dependencies. */
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Records contract interactions (calls + results) for later replay.
 *
 * @example
 * ```typescript
 * const recorder = new InteractionRecorder();
 * const result = await recorder.record('CONTRACT_ID', 'deposit', [1000n], () => vault.deposit({ amount: 1000n }));
 * const session = recorder.exportSession();
 * ```
 */
export class InteractionRecorder {
  private interactions: RecordedInteraction[] = [];

  /**
   * Wraps a contract call and records the interaction (args + result/error).
   *
   * @param contractId - The contract being called
   * @param method - The method name
   * @param args - Arguments passed to the method
   * @param fn - The async function that performs the contract call
   * @param metadata - Optional metadata to attach
   */
  async record<T>(
    contractId: string,
    method: string,
    args: unknown[],
    fn: () => Promise<T>,
    metadata?: RecordingMetadata
  ): Promise<T> {
    const interaction: RecordedInteraction = {
      id: uid(),
      timestamp: new Date().toISOString(),
      contractId,
      method,
      args,
      metadata,
    };

    try {
      const result = await fn();
      interaction.result = result;
      this.interactions.push(interaction);
      return result;
    } catch (err) {
      interaction.error = {
        name: err instanceof Error ? err.name : 'Error',
        message: err instanceof Error ? err.message : String(err),
      };
      this.interactions.push(interaction);
      throw err;
    }
  }

  /** Returns a copy of all recorded interactions. */
  getInteractions(): RecordedInteraction[] {
    return [...this.interactions];
  }

  /** Clears all recorded interactions. */
  clear(): void {
    this.interactions = [];
  }

  /** Exports all recorded interactions as a serialisable ReplaySession. */
  exportSession(): ReplaySession {
    return {
      id: uid(),
      createdAt: new Date().toISOString(),
      interactions: this.getInteractions(),
    };
  }

  /** Restores a previously exported session (appends to current interactions). */
  importSession(session: ReplaySession): void {
    this.interactions.push(...session.interactions);
  }
}
