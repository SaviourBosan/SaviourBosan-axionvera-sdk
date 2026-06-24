/**
 * Identifies the account a transaction will be built for, without requiring
 * a network call to fetch it. The caller is responsible for supplying the
 * current sequence number (e.g. cached from a previous online session).
 */
export interface OfflineSourceAccount {
  /** The G-prefixed Stellar account ID. */
  accountId: string;
  /** The account's current sequence number, as a numeric string. */
  sequence: string;
}

/** Options accepted by {@link OfflineTransactionBuilder}. */
export interface OfflineTransactionBuilderOptions {
  /** The account the transaction will be built for. */
  sourceAccount: OfflineSourceAccount;
  /** The network passphrase the transaction is intended for. */
  networkPassphrase: string;
  /** The transaction fee in stroops (default: 100_000). */
  fee?: number;
  /** Transaction timeout in seconds (default: 60). */
  timeoutInSeconds?: number;
  /** Optional text memo (max 28 bytes), attached when the transaction is built. */
  memo?: string;
}

/** Result returned by {@link OfflineTransactionBuilder.validate}. */
export interface OfflineTransactionValidationResult {
  /** Whether the transaction passed every offline structural check. */
  valid: boolean;
  /** Human-readable descriptions of every failed check. */
  errors: string[];
}

/** Current schema version of {@link OfflineTransactionPackage}. */
export const OFFLINE_TRANSACTION_PACKAGE_VERSION = 1 as const;

/**
 * A self-contained, transportable representation of an unsigned transaction.
 *
 * This is the format produced by {@link OfflineTransactionBuilder.export} and
 * consumed by {@link OfflineTransactionBuilder.import}. It is plain JSON so it
 * can be written to disk, copied to a QR code, or carried across an air gap to
 * a signing device, then brought back for submission.
 */
export interface OfflineTransactionPackage {
  /**
   * Schema version, so future format changes can be detected and migrated.
   * Typed as `number` (rather than the current literal) because packages may
   * be loaded from external storage written by an older version of this SDK.
   */
  version: number;
  /** The base64-encoded unsigned transaction envelope (TransactionEnvelope XDR). */
  xdr: string;
  /** The network passphrase the transaction was built for. */
  networkPassphrase: string;
  /** The source account ID the transaction was built for. */
  sourceAccountId: string;
  /** The sequence number that was consumed when the transaction was built. */
  sequence: string;
  /** Number of operations contained in the transaction, for quick inspection. */
  operationCount: number;
  /** Epoch milliseconds when the package was created. */
  createdAt: number;
}
