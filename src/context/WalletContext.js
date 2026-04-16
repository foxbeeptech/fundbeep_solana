import { createContext, useContext } from "react";

// Context includes walletProvider — the raw wallet object (Phantom/Backpack/etc.)
// used by escrow.js and solana.js for signing transactions.
export const WalletContext = createContext(null);
export const useWallet = () => useContext(WalletContext);
