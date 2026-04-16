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

// Extract Helius API key from the RPC URL for enhanced transaction API
const HELIUS_KEY = (() => {
  try { return new URL(import.meta.env.VITE_HELIUS_RPC_URL || "").searchParams.get("api-key") || ""; }
  catch { return ""; }
})();

export async function sendSol(walletProvider, fromAddress, toAddress, amountSol) {
    if (!walletProvider) throw new Error("No wallet connected.");

    const conn = new Connection(RPC_URL, "confirmed");
    const fromPubkey = new PublicKey(fromAddress);
    const toPubkey = new PublicKey(toAddress);
    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
        SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
    );

    const { blockhash, lastValidBlockHeight } =
        await conn.getLatestBlockhash("confirmed");

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const { signature } = await walletProvider.signAndSendTransaction(transaction);

    await conn.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
    );

    return signature;
}

/**
 * Asks Phantom to sign a one-time nonce, then verifies the Ed25519 signature
 * using the browser's built-in Web Crypto API (no extra packages).
 * Returns true if the signature is valid, throws otherwise.
 */
export async function verifyWalletOwnership(walletProvider, walletAddress) {
    if (!walletProvider) throw new Error("No wallet connected.");

    const nonce   = `FundBeep wallet verify: ${walletAddress} @ ${Date.now()}`;
    const message = new TextEncoder().encode(nonce);

    const { signature } = await walletProvider.signMessage(message, "utf8");

    // Derive the 32-byte Ed25519 public key from the wallet address
    const pubKeyBytes = new PublicKey(walletAddress).toBytes();

    // Import as a Web Crypto Ed25519 verify key (no external libs needed)
    const cryptoKey = await crypto.subtle.importKey(
        "raw", pubKeyBytes, { name: "Ed25519" }, false, ["verify"]
    );

    const isValid = await crypto.subtle.verify(
        { name: "Ed25519" }, cryptoKey, signature, message
    );

    if (!isValid) throw new Error("Signature verification failed: wallet mismatch.");
    return true;
}

/**
 * Fetch recent outgoing SOL transfers from a wallet using Helius Enhanced API.
 * Returns only transfers where the wallet SENT SOL (not incoming, not tokens).
 */
export async function fetchOutgoingSOLTransactions(walletAddress, limit = 50) {
  if (!HELIUS_KEY || !walletAddress) return [];
  try {
    const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_KEY}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const txns = await res.json();
    if (!Array.isArray(txns)) return [];

    const outgoing = [];
    for (const tx of txns) {
      if (!Array.isArray(tx.nativeTransfers)) continue;
      // Only transfers FROM this wallet, with amount > fee dust (> 5000 lamports)
      const sends = tx.nativeTransfers.filter(
        t => t.fromUserAccount?.toLowerCase() === walletAddress.toLowerCase() && t.amount > 5000
      );
      if (sends.length === 0) continue;
      const totalLamports = sends.reduce((s, t) => s + t.amount, 0);
      outgoing.push({
        signature:   tx.signature,
        timestamp:   tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : null,
        amount_sol:  +(totalLamports / 1e9).toFixed(6),
        wallet_to:   sends[0].toUserAccount || null,
      });
    }
    return outgoing;
  } catch {
    return [];
  }
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