import { Browser, BrowserContext, chromium, Page } from "playwright";
import { log } from "../utils/logger";
import { BrowserConfig, PageConfig } from "../types";

// Browser configuration constants
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 1024;
const DEVICE_SCALE_FACTOR = 2.0;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

// Timeout constants
const CONSENT_DIALOG_TIMEOUT = 5000;
const VIDEO_SELECTOR_TIMEOUT = 5000;
const SCROLL_DELAY = 1000;
const SCROLL_ITERATIONS = 5;

// Browser state
let browser: Browser | null = null;
let context: BrowserContext | null = null;

export async function initializeBrowser(config: BrowserConfig): Promise<void> {
  log.debug("🚀 Initializing browser...");

  browser = await chromium.launch({
    headless: config.headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    userAgent: USER_AGENT,
  });

  if (config.useDarkMode) {
    await context.addInitScript(() => {
      Object.defineProperty(window.navigator, "userAgent", {
        value:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Dark",
        configurable: true,
      });
    });
  }

  log.debug("✅ Browser initialized");
}

export function getContext(): BrowserContext {
  if (!context) {
    throw new Error("Browser not initialized. Call initializeBrowser() first.");
  }
  return context;
}

export async function cleanupBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    log.debug("🧹 Browser cleaned up");
  }
}

export async function setupPage(page: Page, config: PageConfig): Promise<void> {
  // Handle consent dialog
  await handleConsentDialog(page);
  await page.waitForTimeout(1000);

  // Apply page configurations
  if (config.useDarkMode) {
    await enableDarkMode(page);
    await page.waitForTimeout(1000);
  }

  if (config.useTheaterMode) {
    await enableTheaterMode(page);
    await page.waitForTimeout(1000);
  }

  if (config.hideSuggestedVideos) {
    await hideSuggestedContent(page);
    await page.waitForTimeout(1000);
  }

  // Dismiss any popups
  await dismissPopups(page);
  await page.waitForTimeout(1000);
}

async function handleConsentDialog(page: Page): Promise<void> {
  try {
    const consentButton = page.locator('button:has-text("Accept all")').first();
    if (await consentButton.isVisible({ timeout: CONSENT_DIALOG_TIMEOUT })) {
      await consentButton.click();
      log.debug("✅ Accepted consent dialog");
    }
  } catch (error) {
    // Consent dialog not found or already dismissed
  }
}

async function enableDarkMode(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      document.documentElement.setAttribute("dark", "");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    log.debug("🌙 Dark mode enabled");
  } catch (error) {
    log.debug("⚠️ Could not enable dark mode");
  }
}

async function enableTheaterMode(page: Page): Promise<void> {
  try {
    const theaterButton = page.locator(
      'button[title*="Theater"], button[aria-label*="Theater"]'
    );
    if (await theaterButton.isVisible({ timeout: 2000 })) {
      await theaterButton.click();
      log.debug("🎭 Theater mode enabled");
    }
  } catch (error) {
    log.debug("⚠️ Could not enable theater mode");
  }
}

async function hideSuggestedContent(page: Page): Promise<void> {
  try {
    await page.addStyleTag({
      content: `
        #related, #secondary, .ytd-watch-next-secondary-results-renderer,
        .ytp-suggestion-set, .ytp-cards-teaser, .ytp-endscreen-content { display: none !important; }
      `,
    });
    log.debug("🙈 Suggested content hidden");
  } catch (error) {
    log.debug("⚠️ Could not hide suggested content");
  }
}

async function dismissPopups(page: Page): Promise<void> {
  const popupSelectors = [
    'button[aria-label*="Dismiss"]',
    'button[aria-label*="Close"]',
    ".ytd-popup-container button",
    'ytd-button-renderer:has-text("No thanks")',
  ];

  for (const selector of popupSelectors) {
    try {
      const popup = page.locator(selector).first();
      if (await popup.isVisible({ timeout: 1000 })) {
        await popup.click();
        await page.waitForTimeout(500);
        log.debug(`✅ Dismissed popup: ${selector}`);
      }
    } catch (error) {
      // Popup not found, continue
    }
  }
}

export async function expandDescription(page: Page): Promise<void> {
  try {
    const showMoreButton = page.locator("#expand").first();
    if (await showMoreButton.isVisible({ timeout: 2000 })) {
      await showMoreButton.click();
      await page.waitForTimeout(1000);
      log.debug("📖 Description expanded");
    }
  } catch (error) {
    log.debug("⚠️ Could not expand description");
  }
}

export async function pauseVideo(page: Page): Promise<void> {
  try {
    await page.waitForSelector("video", { timeout: VIDEO_SELECTOR_TIMEOUT });
    await page.evaluate(() => {
      const video = document.querySelector("video");
      if (video && !video.paused) {
        video.pause();
      }
    });
    log.debug("⏸️ Video paused");
  } catch (error) {
    log.debug("⚠️ Could not pause video");
  }
}

export async function scrollToLoadVideos(page: Page): Promise<void> {
  log.debug("📜 Scrolling to load more videos...");

  for (let i = 0; i < SCROLL_ITERATIONS; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(SCROLL_DELAY);
    log.debug(`📜 Scroll iteration ${i + 1}/${SCROLL_ITERATIONS}`);
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(SCROLL_DELAY);
}
