export { TransactionLifecycleManager } from './transactionLifecycleManager';
export type {
  TransactionLifecycleRecord,
  CreateTransactionOptions,
  TransactionStatusQuery,
} from './types';

// Offline transaction creation workflow
export {
  OfflineTransactionBuilder,
  MAX_OPERATIONS_PER_TRANSACTION,
} from '../builders/offlineTransactionBuilder';
export type {
  OfflineSourceAccount,
  OfflineTransactionBuilderOptions,
  OfflineTransactionValidationResult,
  OfflineTransactionPackage,
} from '../types/offlineTransaction';
export { OFFLINE_TRANSACTION_PACKAGE_VERSION } from '../types/offlineTransaction';
