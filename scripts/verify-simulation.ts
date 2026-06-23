import { StellarClient, ContractCallBuilder } from "../src"; // Adjust path as needed
import { Account, Networks } from "@stellar/stellar-sdk";

async function test() {
  const client = new StellarClient({ network: "testnet" });
  const source = new Account("GD...", "1"); // Use a valid test account

  const tx = new ContractCallBuilder()
    .setContract("CB...") // Use a known contract ID
    .setMethod("increment")
    .build(source, Networks.TESTNET);

  console.log("Simulating transaction...");
  const result = await client.simulateTransaction(tx);
  console.log("Simulation successful. Footprint:", result.footprint);
}

test().catch(console.error);