import { RecordedInteraction, ReplayResult, ReplaySession, ReplayValidationReport, ValidationResult } from './types';

/**
 * Compares replay results against the original recorded interactions.
 *
 * @example
 * ```typescript
 * const validator = new ReplayValidator();
 * const report = validator.validate(session, replayResults);
 * console.log(`${report.passed}/${report.total} passed`);
 * ```
 */
export class ReplayValidator {
  /**
   * Validates a set of replay results against their original recordings.
   *
   * @param session - The original recorded session
   * @param replayResults - Results produced by {@link ReplayEngine.replay}
   */
  validate(session: ReplaySession, replayResults: ReplayResult[]): ReplayValidationReport {
    const resultMap = new Map(replayResults.map((r) => [r.interactionId, r]));

    const results: ValidationResult[] = session.interactions.map((interaction) => {
      const replayResult = resultMap.get(interaction.id);

      if (!replayResult) {
        return {
          interactionId: interaction.id,
          passed: false,
          diff: 'Interaction was not replayed',
        };
      }

      return this.compareOne(interaction, replayResult);
    });

    const passed = results.filter((r) => r.passed).length;

    return {
      sessionId: session.id,
      total: results.length,
      passed,
      failed: results.length - passed,
      results,
    };
  }

  private compareOne(
    recorded: RecordedInteraction,
    replayed: ReplayResult
  ): ValidationResult {
    // Both errored — compare error messages
    if (recorded.error && !replayed.success) {
      const match = recorded.error.message === replayed.error?.message;
      return {
        interactionId: recorded.id,
        passed: match,
        diff: match ? undefined : `Error mismatch: recorded "${recorded.error.message}" vs replayed "${replayed.error?.message}"`,
      };
    }

    // Originally errored but replay succeeded (or vice versa)
    if (!!recorded.error !== !replayed.success) {
      return {
        interactionId: recorded.id,
        passed: false,
        diff: recorded.error
          ? `Expected an error ("${recorded.error.message}") but replay succeeded`
          : `Expected success but replay errored: "${replayed.error?.message}"`,
      };
    }

    // Both succeeded — deep compare results
    const recordedJson = JSON.stringify(recorded.result, replacer);
    const replayedJson = JSON.stringify(replayed.result, replacer);
    const match = recordedJson === replayedJson;

    return {
      interactionId: recorded.id,
      passed: match,
      diff: match ? undefined : `Result mismatch:\n  recorded: ${recordedJson}\n  replayed: ${replayedJson}`,
    };
  }
}

/** JSON replacer that serialises BigInt values so they survive stringify. */
function replacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? `__bigint__${value.toString()}` : value;
}
