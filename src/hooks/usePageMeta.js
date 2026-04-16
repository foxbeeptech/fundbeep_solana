import { useEffect } from "react";

const SITE_NAME = "FundBeep";
const DEFAULT_DESC = "FundBeep is a Solana crowdfunding platform with smart contract escrow. Launch a campaign, back ideas you believe in, and receive funds via milestone-based payouts. KYC verified creators, Trust Score system.";
const DEFAULT_KEYWORDS = "solana crowdfunding, crypto fundraising, SOL donations, web3 crowdfunding, blockchain fundraising, phantom wallet, decentralized crowdfunding, solana campaigns, smart contract escrow, milestone funding";
const DEFAULT_IMG = "https://fundbeep.com/og-image.png";
const SITE_URL = "https://fundbeep.com";

/**
 * Dynamically updates <title>, meta description, OG/Twitter tags, and canonical.
 * Works for Google (executes JS) and social crawlers that read static HTML.
 *
 * @param {Object} opts
 * @param {string} opts.title        - Page title (without site name suffix)
 * @param {string} [opts.description]
 * @param {string} [opts.keywords]   - Comma-separated keywords for this page
 * @param {string} [opts.image]      - Full URL to OG image
 * @param {string} [opts.imageAlt]   - Alt text for OG image
 * @param {string} [opts.url]        - Canonical URL for this page
 * @param {string} [opts.type]       - og:type (default "website")
 * @param {boolean} [opts.noindex]   - Set true to noindex private pages
 */
export default function usePageMeta({ title, description, keywords, image, imageAlt, url, type = "website", noindex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Solana Crowdfunding Platform`;
    const desc   = description || DEFAULT_DESC;
    const kw     = keywords || DEFAULT_KEYWORDS;
    const img    = image || DEFAULT_IMG;
    const alt    = imageAlt || `${title || SITE_NAME} - FundBeep Solana Crowdfunding`;
    const canon  = url || SITE_URL;

    document.title = fullTitle;

    const setMeta = (selector, attr, val) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        const match = selector.match(/\[(.+?)="(.+?)"\]/);
        if (match) { el.setAttribute(match[1], match[2]); }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };

    setMeta('meta[name="description"]',         "content", desc);
    setMeta('meta[name="keywords"]',             "content", kw);
    setMeta('meta[name="robots"]',               "content", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1");
    setMeta('meta[property="og:title"]',         "content", fullTitle);
    setMeta('meta[property="og:description"]',   "content", desc);
    setMeta('meta[property="og:image"]',         "content", img);
    setMeta('meta[property="og:image:alt"]',     "content", alt);
    setMeta('meta[property="og:url"]',           "content", canon);
    setMeta('meta[property="og:type"]',          "content", type);
    setMeta('meta[name="twitter:title"]',        "content", fullTitle);
    setMeta('meta[name="twitter:description"]',  "content", desc);
    setMeta('meta[name="twitter:image"]',        "content", img);
    setMeta('meta[name="twitter:image:alt"]',    "content", alt);

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = canon;
  }, [title, description, keywords, image, imageAlt, url, type, noindex]);
}
