import {
  summarizeMigrationReport,
  serializeMigrationReport,
} from '../../src/migrations/migrationReporter';
import { MigrationStatus, MigrationStepStatus } from '../../src/types/migration';
import type { MigrationReport } from '../../src/types/migration';

function buildReport(overrides: Partial<MigrationReport> = {}): MigrationReport {
  return {
    contractId: 'Vault',
    fromVersion: 'v1',
    toVersion: 'v2',
    status: MigrationStatus.COMPLETED,
    dryRun: false,
    startedAt: 1_700_000_000_000,
    finishedAt: 1_700_000_000_050,
    durationMs: 50,
    totalSteps: 1,
    succeededSteps: 1,
    failedSteps: 0,
    steps: [
      {
        stepId: 'v1-to-v2',
        fromVersion: 'v1',
        toVersion: 'v2',
        status: MigrationStepStatus.SUCCEEDED,
        startedAt: 1_700_000_000_000,
        finishedAt: 1_700_000_000_050,
        durationMs: 50,
      },
    ],
    ...overrides,
  };
}

describe('summarizeMigrationReport', () => {
  it('includes the contract id and version range', () => {
    const summary = summarizeMigrationReport(buildReport());
    expect(summary).toContain('Vault');
    expect(summary).toContain('v1 -> v2');
  });

  it('includes the overall status', () => {
    const summary = summarizeMigrationReport(buildReport({ status: MigrationStatus.FAILED }));
    expect(summary).toContain('Status: FAILED');
  });

  it('flags dry runs', () => {
    const summary = summarizeMigrationReport(buildReport({ dryRun: true }));
    expect(summary).toContain('(dry run)');
  });

  it('lists each step with a pass/fail marker', () => {
    const summary = summarizeMigrationReport(buildReport());
    expect(summary).toContain('[OK]');
    expect(summary).toContain('v1-to-v2');
  });

  it('marks a failed step distinctly and includes its error', () => {
    const report = buildReport({
      status: MigrationStatus.FAILED,
      succeededSteps: 0,
      failedSteps: 1,
      steps: [
        {
          stepId: 'broken',
          fromVersion: 'v1',
          toVersion: 'v2',
          status: MigrationStepStatus.FAILED,
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
          error: { name: 'Error', message: 'boom' },
        },
      ],
    });

    const summary = summarizeMigrationReport(report);
    expect(summary).toContain('[FAIL]');
    expect(summary).toContain('Error: boom');
  });

  it('includes a rollback section when rollbackSteps are present', () => {
    const report = buildReport({
      status: MigrationStatus.ROLLED_BACK,
      rollbackSteps: [
        {
          stepId: 'v1-to-v2',
          fromVersion: 'v2',
          toVersion: 'v1',
          status: MigrationStepStatus.SUCCEEDED,
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      ],
    });

    const summary = summarizeMigrationReport(report);
    expect(summary).toContain('Rollback:');
  });

  it('omits the rollback section when no rollback was attempted', () => {
    const summary = summarizeMigrationReport(buildReport());
    expect(summary).not.toContain('Rollback:');
  });
});

describe('serializeMigrationReport', () => {
  it('round-trips through JSON.parse with the same step data', () => {
    const report = buildReport();
    const parsed = JSON.parse(serializeMigrationReport(report)) as MigrationReport;
    expect(parsed.contractId).toBe('Vault');
    expect(parsed.steps[0].stepId).toBe('v1-to-v2');
  });

  it('produces pretty-printed (indented) output', () => {
    const serialized = serializeMigrationReport(buildReport());
    expect(serialized).toContain('\n  ');
  });
});
