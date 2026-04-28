import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";

/**
 * Interface for wallet implementations that can sign transactions.
 */
export interface WalletConnector {
  /**
   * Gets the public key of the connected account.
   * @returns The public key
   */
  getPublicKey(): Promise<string>;

  /**
   * Signs a transaction XDR string.
   * @param transactionXdr - The base64-encoded transaction XDR
   * @param networkPassphrase - The network passphrase
   * @returns The base64-encoded signed transaction XDR
   */
  signTransaction(transactionXdr: string, networkPassphrase: string): Promise<string>;
}

/**
 * Wallet connector implementation using a local Keypair.
 * Useful for testing and development without a browser wallet.
 */
export class LocalKeypairWalletConnector implements WalletConnector {
  private readonly keypair: Keypair;

  /**
   * Creates a new LocalKeypairWalletConnector.
   * @param keypair - The Keypair to use for signing
   */
  constructor(keypair: Keypair) {
    this.keypair = keypair;
  }

  /** @inheritdoc */
  async getPublicKey(): Promise<string> {
    return this.keypair.publicKey();
  }

  /** @inheritdoc */
  async signTransaction(
    transactionXdr: string,
    networkPassphrase: string
  ): Promise<string> {
    const tx = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
    tx.sign(this.keypair);
    return tx.toXDR();
  }
}

/**
 * Mock wallet connector for browser sandbox testing.
 * Returns a fake public key and simulates signing without requiring a real wallet.
 * Useful for playground environments and StackBlitz demos.
 */
export class MockWalletConnector implements WalletConnector {
  private readonly mockPublicKey: string;

  /**
   * Creates a new MockWalletConnector.
   * @param publicKey - Optional fake public key. If not provided, generates a random one.
   */
  constructor(publicKey?: string) {
    this.mockPublicKey = publicKey || Keypair.random().publicKey();
  }

  /** @inheritdoc */
  async getPublicKey(): Promise<string> {
    return this.mockPublicKey;
  }

  /** @inheritdoc */
  async signTransaction(
    transactionXdr: string,
    networkPassphrase: string
  ): Promise<string> {
    // In a real implementation, this would sign the transaction.
    // For the mock, we just return the unsigned XDR to simulate the flow.
    // The transaction will fail during simulation, but the UI will remain responsive.
    return transactionXdr;
  }
}
