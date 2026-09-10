/**
 * =========================================================
 * COMPANY LOGO RESOLVER
 * =========================================================
 *
 * Client does NOT upload a logo.
 * Logo is NOT stored in MongoDB.
 *
 * The system determines the company's website/domain
 * from the company name and loads its logo from the internet.
 *
 * Supported companies:
 * - Indian Oil Corporation Limited
 * - Bharat Petroleum Corporation Limited
 * - Hindustan Petroleum Corporation Limited
 * - Nayara Energy
 * - Reliance
 * - Oil India Limited
 * - Shell
 *
 * Google favicon service is used because it returns an
 * image that can be fetched by the browser.
 */

const COMPANY_DOMAINS = {
  "indian oil":
    "iocl.com",

  "indian oil corporation":
    "iocl.com",

  "indian oil corporation limited":
    "iocl.com",

  "ioc":
    "iocl.com",

  "bharat petroleum":
    "bharatpetroleum.in",

  "bharat petroleum corporation":
    "bharatpetroleum.in",

  "bharat petroleum corporation limited":
    "bharatpetroleum.in",

  "bpcl":
    "bharatpetroleum.in",

  "hindustan petroleum":
    "hindustanpetroleum.com",

  "hindustan petroleum corporation":
    "hindustanpetroleum.com",

  "hindustan petroleum corporation limited":
    "hindustanpetroleum.com",

  "hpcl":
    "hindustanpetroleum.com",

  "nayara":
    "nayaraenergy.com",

  "nayara energy":
    "nayaraenergy.com",

  "reliance":
    "ril.com",

  "reliance industries":
    "ril.com",

  "reliance industries limited":
    "ril.com",

  "oil india":
    "oil-india.com",

  "oil india limited":
    "oil-india.com",

  "oil india ltd":
    "oil-india.com",

  "shell":
    "shell.com",
};

/**
 * Normalize company name.
 */
const normalizeCompanyName = (companyName = "") => {
  return String(companyName)
    .trim()
    .toLowerCase()
    .replace(/[.,&()]/g, " ")
    .replace(/\s+/g, " ");
};

/**
 * Find company domain.
 */
const getCompanyDomain = (companyName = "") => {
  const normalized = normalizeCompanyName(companyName);

  if (!normalized) {
    return null;
  }

  // Exact match first
  if (COMPANY_DOMAINS[normalized]) {
    return COMPANY_DOMAINS[normalized];
  }

  // Partial match
  const matchedKey = Object.keys(COMPANY_DOMAINS).find(
    (key) =>
      normalized.includes(key) ||
      key.includes(normalized)
  );

  return matchedKey
    ? COMPANY_DOMAINS[matchedKey]
    : null;
};

/**
 * Get internet logo URL.
 *
 * Google returns the company website favicon as PNG.
 *
 * Example:
 * Indian Oil
 * -> iocl.com
 * -> Google logo service
 */
export const getCompanyLogo = (companyName = "") => {
  const domain =
    getCompanyDomain(companyName);

  if (!domain) {
    return null;
  }

  return (
    `https://www.google.com/s2/favicons` +
    `?domain=${encodeURIComponent(domain)}` +
    `&sz=256`
  );
};

export {
  getCompanyDomain,
  normalizeCompanyName,
};

export default getCompanyLogo;