// Browser configuration constants
export const BROWSER_CONFIG = {
  VIEWPORT_WIDTH: 800,
  VIEWPORT_HEIGHT: 1024,
  DEVICE_SCALE_FACTOR: 2.0,
  USER_AGENT:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
} as const;

// Timeout constants
export const TIMEOUTS = {
  CONSENT_DIALOG: 5000,
  VIDEO_SELECTOR: 5000,
  PAGE_NAVIGATION: 30000,
  TITLE_SELECTOR: 5000,
  FALLBACK_TITLE: 2000,
  CHANNEL_PAGE: 30000,
} as const;

// Delay constants
export const DELAYS = {
  SCROLL: 1000,
  SCREENSHOT_SCROLL: 5000,
  INITIAL_PAGE: 1000,
} as const;

// Scroll configuration
export const SCROLL_CONFIG = {
  ITERATIONS: 5,
} as const;

// Selector constants
export const SELECTORS = {
  CONSENT_BUTTONS: [
    'button[aria-label*="consent"]',
    'button[aria-label*="Accept"]',
    'button[aria-label*="agree"]',
    'button[aria-label*="I agree"]',
    'button[aria-label*="I accept"]',
  ],
  POPUP_BUTTONS: [
    'button[aria-label*="Close"]',
    'button[aria-label*="Dismiss"]',
    'button[aria-label*="Skip"]',
    'button[aria-label*="Not now"]',
  ],
  HIDE_BUTTONS: [
    'button[aria-label*="Hide"]',
    'button[aria-label*="Not interested"]',
    'button[aria-label*="Don\'t recommend"]',
  ],
  EXPAND_BUTTONS: ["#expand"],
  VIDEO_LINKS: 'a[href*="/watch?v="]',
  VIDEO_ELEMENT: "video",
  TITLE_VISIBLE: "h1:not([hidden])",
  TITLE_FALLBACK: "title",
} as const;

// Metadata extraction selectors
export const METADATA_SELECTORS = {
  TITLE: "h1.title",
  CHANNEL: "ytd-channel-name a",
  VIEW_COUNT: "span.view-count",
  LIKE_COUNT: "ytd-menu-renderer button[aria-label*='like']",
  DESCRIPTION: "ytd-expander#description",
  UPLOAD_DATE: "div#info-strings yt-formatted-string",
  CATEGORY: "div#info-strings yt-formatted-string:last-child",
  CHANNEL_URL: "ytd-channel-name a",
  DURATION: "span.ytp-time-duration",
  THUMBNAIL: "link[itemprop='thumbnailUrl']",
  VIDEO_TAGS: 'meta[property="og:video:tag"]',
} as const;

// Default values
export const DEFAULTS = {
  LANGUAGE: "en",
  BUTTON_CLICK_TIMEOUT: 200,
  WAIT_TIMEOUT: 500,
} as const;
