/** Status of a full migration run, as recorded in a {@link MigrationReport}. */
export enum MigrationStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

/** Status of a single migration (or rollback) step attempt. */
export enum MigrationStepStatus {
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

/** Contextual information passed to every step's `migrate`/`rollback` function. */
export interface MigrationContext {
  contractId: string;
  dryRun: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * One migration step, transforming a contract's state from `fromVersion`'s
 * shape (`TFrom`) to `toVersion`'s shape (`TTo`). Steps are pure functions
 * over the state value — they perform no network I/O — so they can be
 * composed into multi-hop chains and dry-run safely.
 */
export interface MigrationStepDefinition<TFrom = unknown, TTo = unknown> {
  /** Unique id for this step, used by the registry and in reports. */
  id: string;
  fromVersion: string;
  toVersion: string;
  description?: string;
  /** Transforms state at `fromVersion` into state at `toVersion`. */
  migrate: (state: TFrom, context: MigrationContext) => TTo | Promise<TTo>;
  /**
   * Optional inverse of `migrate`, used by {@link MigrationRunner} to undo a
   * completed step when a later step fails and `rollbackOnFailure` is set.
   */
  rollback?: (state: TTo, context: MigrationContext) => TFrom | Promise<TFrom>;
}

/** A type-erased view of {@link MigrationStepDefinition}, as stored in {@link MigrationRegistry}. */
export type AnyMigrationStep = MigrationStepDefinition;

/** An ordered, resolved chain of steps connecting `fromVersion` to `toVersion`. */
export interface MigrationPlan {
  contractId: string;
  fromVersion: string;
  toVersion: string;
  steps: readonly AnyMigrationStep[];
}

/** The outcome of one step attempt (forward or rollback) within a migration run. */
export interface MigrationStepResult {
  stepId: string;
  fromVersion: string;
  toVersion: string;
  status: MigrationStepStatus;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  error?: { name: string; message: string };
}

/** Options accepted by {@link MigrationRunner.run} / {@link MigrationRunner.migrate}. */
export interface RunMigrationOptions {
  /** Run every step's migrate/validate logic without persisting the result state. Defaults to `false`. */
  dryRun?: boolean;
  /** Attempt to roll back completed steps (in reverse) if a later step fails. Defaults to `false`. */
  rollbackOnFailure?: boolean;
  /** Validate state against registered schemas before/after each step. Defaults to `true`. */
  validateState?: boolean;
  /** Arbitrary metadata forwarded to every step via {@link MigrationContext}. */
  metadata?: Record<string, unknown>;
}

/** A complete record of one migration run, suitable for logging, CLI output, or PR notes. */
export interface MigrationReport {
  contractId: string;
  fromVersion: string;
  toVersion: string;
  status: MigrationStatus;
  dryRun: boolean;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  totalSteps: number;
  succeededSteps: number;
  failedSteps: number;
  steps: MigrationStepResult[];
  /** Present only when `rollbackOnFailure` triggered at least one rollback attempt. */
  rollbackSteps?: MigrationStepResult[];
}

/** The return value of {@link MigrationRunner.run} / {@link MigrationRunner.migrate}. */
export interface RunMigrationResult<TState> {
  state: TState;
  report: MigrationReport;
}
