import { Account, Keypair, Networks, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import {
  MAX_OPERATIONS_PER_TRANSACTION,
  OfflineTransactionBuilder,
} from '../../src/builders/offlineTransactionBuilder';
import { buildContractCallOperation } from '../../src/utils/transactionBuilder';
import { InvalidXDRError, ValidationError } from '../../src/errors/axionveraError';
import { OfflineTransactionPackage } from '../../src/types/offlineTransaction';

const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

function randomAccountId(): string {
  return Keypair.random().publicKey();
}

describe('OfflineTransactionBuilder', () => {
  describe('construction', () => {
    it('rejects a missing/invalid source account id', () => {
      expect(
        () =>
          new OfflineTransactionBuilder({
            sourceAccount: { accountId: 'not-a-valid-account', sequence: '1' },
            networkPassphrase: NETWORK_PASSPHRASE,
          })
      ).toThrow(ValidationError);
    });

    it('rejects a non-numeric sequence', () => {
      expect(
        () =>
          new OfflineTransactionBuilder({
            sourceAccount: { accountId: randomAccountId(), sequence: 'abc' },
            networkPassphrase: NETWORK_PASSPHRASE,
          })
      ).toThrow(ValidationError);
    });

    it('rejects a missing network passphrase', () => {
      expect(
        () =>
          new OfflineTransactionBuilder({
            sourceAccount: { accountId: randomAccountId(), sequence: '1' },
            networkPassphrase: '',
          })
      ).toThrow(ValidationError);
    });

    it('rejects a non-positive fee', () => {
      expect(
        () =>
          new OfflineTransactionBuilder({
            sourceAccount: { accountId: randomAccountId(), sequence: '1' },
            networkPassphrase: NETWORK_PASSPHRASE,
            fee: 0,
          })
      ).toThrow(ValidationError);
    });

    it('rejects a negative timeout', () => {
      expect(
        () =>
          new OfflineTransactionBuilder({
            sourceAccount: { accountId: randomAccountId(), sequence: '1' },
            networkPassphrase: NETWORK_PASSPHRASE,
            timeoutInSeconds: -5,
          })
      ).toThrow(ValidationError);
    });
  });

  describe('build', () => {
    it('builds a transaction with no network access using addContractCall', () => {
      const builder = new OfflineTransactionBuilder({
        sourceAccount: { accountId: randomAccountId(), sequence: '42' },
        networkPassphrase: NETWORK_PASSPHRASE,
        fee: 200_000,
        timeoutInSeconds: 30,
      });

      builder.addContractCall({ contractId: CONTRACT_ID, method: 'deposit', args: [1000n] });

      const tx = builder.build();

      expect(tx).toBeInstanceOf(Transaction);
      expect(tx.fee).toBe('200000');
      expect(tx.operations).toHaveLength(1);
      expect(tx.operations[0].type).toBe('invokeHostFunction');
      expect(tx.sequence).toBe('43');
      expect(tx.signatures).toHaveLength(0);
    });

    it('supports queuing multiple operations and a memo', () => {
      const builder = new OfflineTransactionBuilder({
        sourceAccount: { accountId: randomAccountId(), sequence: '1' },
        networkPassphrase: NETWORK_PASSPHRASE,
        memo: 'offline-demo',
      });

      builder
        .addContractCall({ contractId: CONTRACT_ID, method: 'deposit', args: [1n] })
        .addContractCall({ contractId: CONTRACT_ID, method: 'withdraw', args: [1n] });

      expect(builder.operationCount()).toBe(2);

      const tx = builder.build();
      expect(tx.operations).toHaveLength(2);
      expect(tx.memo.value?.toString()).toBe('offline-demo');
    });

    it('throws when no operations have been added', () => {
      const builder = new OfflineTransactionBuilder({
        sourceAccount: { accountId: randomAccountId(), sequence: '1' },
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      expect(() => builder.build()).toThrow(ValidationError);
    });

    it('throws when too many operations have been added', () => {
      const builder = new OfflineTransactionBuilder({
        sourceAccount: { accountId: randomAccountId(), sequence: '1' },
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      for (let i = 0; i < MAX_OPERATIONS_PER_TRANSACTION + 1; i++) {
        builder.addContractCall({ contractId: CONTRACT_ID, method: 'noop', args: [] });
      }

      expect(() => builder.build()).toThrow(ValidationError);
    });
  });

  describe('validate', () => {
    it('flags a transaction with zero fee', () => {
      const account = new Account(randomAccountId(), '1');
      const tx = new TransactionBuilder(account, {
        fee: '0',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          buildContractCallOperation({ contractId: CONTRACT_ID, method: 'deposit', args: [1n] })
        )
        .setTimeout(30)
        .build();

      const result = OfflineTransactionBuilder.validate(tx);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.toLowerCase().includes('fee'))).toBe(true);
    });

    it('passes for a well-formed, builder-produced transaction', () => {
      const builder = new OfflineTransactionBuilder({
        sourceAccount: { accountId: randomAccountId(), sequence: '1' },
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      builder.addContractCall({ contractId: CONTRACT_ID, method: 'deposit', args: [1n] });
      const tx = builder.build();

      expect(OfflineTransactionBuilder.validate(tx)).toEqual({ valid: true, errors: [] });
    });
  });

  describe('export / import round-trip', () => {
    it('exports a transportable package and reconstructs an equivalent transaction', () => {
      const accountId = randomAccountId();
      const builder = new OfflineTransactionBuilder({
        sourceAccount: { accountId, sequence: '7' },
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      builder.addContractCall({ contractId: CONTRACT_ID, method: 'deposit', args: [5n] });

      const tx = builder.build();
      const pkg = builder.export(tx);

      expect(pkg.version).toBe(1);
      expect(pkg.networkPassphrase).toBe(NETWORK_PASSPHRASE);
      expect(pkg.sourceAccountId).toBe(accountId);
      expect(pkg.sequence).toBe('7');
      expect(pkg.operationCount).toBe(1);
      expect(typeof pkg.createdAt).toBe('number');

      const restored = OfflineTransactionBuilder.import(pkg);
      expect(restored.toXDR()).toBe(tx.toXDR());
    });

    it('rejects importing a package with an unsupported version', () => {
      const pkg: OfflineTransactionPackage = {
        version: 99 as any,
        xdr: 'AAAAAA==',
        networkPassphrase: NETWORK_PASSPHRASE,
        sourceAccountId: randomAccountId(),
        sequence: '1',
        operationCount: 1,
        createdAt: Date.now(),
      };

      expect(() => OfflineTransactionBuilder.import(pkg)).toThrow(ValidationError);
    });
  });

  describe('fromXDR', () => {
    it('round-trips a transaction through toXDR/fromXDR', () => {
      const builder = new OfflineTransactionBuilder({
        sourceAccount: { accountId: randomAccountId(), sequence: '1' },
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      builder.addContractCall({ contractId: CONTRACT_ID, method: 'deposit', args: [1n] });
      const tx = builder.build();

      const restored = OfflineTransactionBuilder.fromXDR(tx.toXDR(), NETWORK_PASSPHRASE);
      expect(restored.toXDR()).toBe(tx.toXDR());
    });

    it('throws InvalidXDRError for malformed input', () => {
      expect(() =>
        OfflineTransactionBuilder.fromXDR('not-valid-xdr!!', NETWORK_PASSPHRASE)
      ).toThrow(InvalidXDRError);
    });

    it('rejects a fee bump transaction envelope', () => {
      const builder = new OfflineTransactionBuilder({
        sourceAccount: { accountId: randomAccountId(), sequence: '1' },
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      builder.addContractCall({ contractId: CONTRACT_ID, method: 'deposit', args: [1n] });
      const tx = builder.build();
      tx.sign(Keypair.random());

      const feeBumpXdr = TransactionBuilder.buildFeeBumpTransaction(
        Keypair.random().publicKey(),
        '200000',
        tx,
        NETWORK_PASSPHRASE
      ).toXDR();

      expect(() => OfflineTransactionBuilder.fromXDR(feeBumpXdr, NETWORK_PASSPHRASE)).toThrow(
        ValidationError
      );
    });
  });

  describe('signing compatibility', () => {
    it('produces a transaction that standard signing workflows can sign', () => {
      const keypair = Keypair.random();
      const builder = new OfflineTransactionBuilder({
        sourceAccount: { accountId: keypair.publicKey(), sequence: '1' },
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      builder.addContractCall({ contractId: CONTRACT_ID, method: 'deposit', args: [1n] });

      const unsignedTx = builder.build();
      const unsignedXdr = unsignedTx.toXDR();

      // Mirrors how LocalKeypairWalletConnector.signTransaction signs offline-built XDR.
      const txToSign = TransactionBuilder.fromXDR(unsignedXdr, NETWORK_PASSPHRASE) as Transaction;
      txToSign.sign(keypair);

      expect(txToSign.signatures).toHaveLength(1);

      const resigned = OfflineTransactionBuilder.fromXDR(txToSign.toXDR(), NETWORK_PASSPHRASE);
      expect(resigned.signatures).toHaveLength(1);
    });
  });
});
