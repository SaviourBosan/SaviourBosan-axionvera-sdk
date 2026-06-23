/**
 * Offline Transaction Creation Workflow example.
 *
 * Demonstrates building, validating, exporting, and signing a Soroban
 * transaction with zero network access. Run with: npx ts-node examples/offlineTransactionExample.ts
 */

import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { OfflineTransactionBuilder } from '../src/builders/offlineTransactionBuilder';
import { OfflineTransactionPackage } from '../src/types/offlineTransaction';

const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ID =
  process.env.AXIONVERA_VAULT_CONTRACT_ID ??
  'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

/** Step 1 (online machine): in a real workflow this comes from a prior RPC call. */
function fetchAccountInfoFromCache(accountId: string): { accountId: string; sequence: string } {
  return { accountId, sequence: '123456789' };
}

function main(): void {
  const signingKeypair = Keypair.random();

  console.log('=== Step 1: build the transaction offline ===');
  const sourceAccount = fetchAccountInfoFromCache(signingKeypair.publicKey());

  const builder = new OfflineTransactionBuilder({
    sourceAccount,
    networkPassphrase: NETWORK_PASSPHRASE,
    fee: 100_000,
    timeoutInSeconds: 120,
  });

  builder.addContractCall({ contractId: CONTRACT_ID, method: 'deposit', args: [1000n] });

  const transaction = builder.build();
  console.log(`Built unsigned transaction with ${transaction.operations.length} operation(s)`);

  console.log('\n=== Step 2: validate structurally, with no network access ===');
  const validation = OfflineTransactionBuilder.validate(transaction);
  console.log(`Valid: ${validation.valid}`);
  if (!validation.valid) {
    throw new Error(`Offline validation failed: ${validation.errors.join('; ')}`);
  }

  console.log('\n=== Step 3: export a transportable offline package ===');
  const offlinePackage: OfflineTransactionPackage = builder.export(transaction);
  const serialized = JSON.stringify(offlinePackage, null, 2);
  console.log(`Package ready to carry across an air gap (${serialized.length} bytes):`);
  console.log(serialized);

  console.log('\n=== Step 4: on the signing device, reconstruct and sign ===');
  const restored = OfflineTransactionBuilder.import(JSON.parse(serialized));
  const txToSign = TransactionBuilder.fromXDR(restored.toXDR(), NETWORK_PASSPHRASE);
  if (!('sign' in txToSign)) {
    throw new Error('Expected an inner transaction, not a fee bump transaction');
  }
  txToSign.sign(signingKeypair);
  console.log(`Signed transaction has ${txToSign.signatures.length} signature(s)`);

  console.log('\n=== Step 5: carry the signed XDR back online for submission ===');
  console.log(txToSign.toXDR());
  console.log(
    '\n(Submission itself requires network access and is out of scope for this example.)'
  );
}

if (require.main === module) {
  main();
}

export { main };
