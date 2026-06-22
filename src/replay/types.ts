/**
 * Represents a single recorded contract interaction.
 */
export type RecordedInteraction = {
  /** Unique identifier for this interaction */
  id: string;
  /** ISO timestamp when the interaction was recorded */
  timestamp: string;
  /** The contract ID that was called */
  contractId: string;
  /** The method name that was invoked */
  method: string;
  /** Serialized arguments passed to the method */
  args: unknown[];
  /** The result returned by the call (undefined if it errored) */
  result?: unknown;
  /** The error thrown (undefined if successful) */
  error?: { message: string; name: string };
  /** Optional transaction metadata */
  metadata?: RecordingMetadata;
};

export type RecordingMetadata = {
  network?: string;
  sourceAccount?: string;
  txHash?: string;
  ledger?: number;
  /** Arbitrary extra context */
  [key: string]: unknown;
};

/**
 * A collection of recorded interactions (a replay session).
 */
export type ReplaySession = {
  id: string;
  createdAt: string;
  interactions: RecordedInteraction[];
};

/**
 * The outcome of replaying a single interaction.
 */
export type ReplayResult = {
  interactionId: string;
  contractId: string;
  method: string;
  success: boolean;
  result?: unknown;
  error?: { message: string; name: string };
  durationMs: number;
};

/**
 * The outcome of validating a replay against its recording.
 */
export type ValidationResult = {
  interactionId: string;
  passed: boolean;
  /** Human-readable description of what differed, if anything */
  diff?: string;
};

export type ReplayValidationReport = {
  sessionId: string;
  total: number;
  passed: number;
  failed: number;
  results: ValidationResult[];
};

/**
 * Options for the ReplayEngine.
 */
export type ReplayOptions = {
  /** Stop replaying after the first failure (default: false) */
  stopOnFailure?: boolean;
};
