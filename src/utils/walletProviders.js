/**
 * FundBeep — Supported Solana wallet providers.
 * Each entry auto-detects the injected window object for that wallet.
 * The provider object is passed directly to escrow.js / solana.js for signing.
 */

export const WALLET_LIST = [
  {
    id: "phantom",
    name: "Phantom",
    icon: "👻",
    url: "https://phantom.app",
    getProvider: () => {
      if (window?.phantom?.solana?.isPhantom) return window.phantom.solana;
      if (window?.solana?.isPhantom) return window.solana;
      return null;
    },
    mobileDeepLink: () => {
      const url = encodeURIComponent(window.location.href);
      const ref = encodeURIComponent(window.location.origin);
      return `https://phantom.app/ul/browse/${url}?ref=${ref}`;
    },
  },
  {
    id: "backpack",
    name: "Backpack",
    icon: "🎒",
    url: "https://backpack.app",
    getProvider: () => {
      if (window?.backpack?.isBackpack) return window.backpack;
      return null;
    },
    mobileDeepLink: () => null,
    mobileInstallUrl: "https://backpack.app",
  },
  {
    id: "solflare",
    name: "Solflare",
    icon: "☀️",
    url: "https://solflare.com",
    getProvider: () => {
      if (window?.solflare?.isSolflare) return window.solflare;
      return null;
    },
    mobileDeepLink: () => {
      const url = encodeURIComponent(window.location.href);
      const ref = encodeURIComponent(window.location.origin);
      return `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`;
    },
  },
  {
    id: "okx",
    name: "OKX Wallet",
    icon: "⭕",
    url: "https://okx.com/web3",
    getProvider: () => {
      if (window?.okxwallet?.solana) return window.okxwallet.solana;
      return null;
    },
    mobileDeepLink: () => null,
    mobileInstallUrl: "https://okx.com/download",
  },
];

/** Returns only the wallets whose browser extension / app is currently installed. */
export function getInstalledWallets() {
  return WALLET_LIST.filter(w => w.getProvider() !== null);
}

/** Returns true if we are running inside any Solana wallet's in-app browser. */
export function isInWalletBrowser() {
  return !!(
    window?.phantom?.solana?.isPhantom ||
    window?.solana?.isPhantom ||
    window?.backpack?.isBackpack ||
    window?.solflare?.isSolflare
  );
}
