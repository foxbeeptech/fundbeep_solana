import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// Hardcoded fallback — works without any env vars
const RPC_URL = import.meta.env.VITE_HELIUS_RPC_URL?.startsWith("http")
  ? import.meta.env.VITE_HELIUS_RPC_URL
  : "https://api.mainnet-beta.solana.com";

export async function sendSol(fromAddress, toAddress, amountSol) {
  if (!window.solana?.isPhantom) {
    throw new Error("Phantom wallet not found.");
  }

  const conn       = new Connection(RPC_URL, "confirmed");
  const fromPubkey = new PublicKey(fromAddress);
  const toPubkey   = new PublicKey(toAddress);
  const lamports   = Math.round(amountSol * LAMPORTS_PER_SOL);

  const transaction = new Transaction().add(
    SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
  );

  const { blockhash, lastValidBlockHeight } =
    await conn.getLatestBlockhash("confirmed");

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  // Opens Phantom popup
  const { signature } = await window.solana.signAndSendTransaction(transaction);

  await conn.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return signature;
}

export async function getSolBalance(address) {
  try {
    const conn = new Connection(RPC_URL, "confirmed");
    const lamports = await conn.getBalance(new PublicKey(address));
    return lamports / LAMPORTS_PER_SOL;
  } catch {
    return null;
  }
}
