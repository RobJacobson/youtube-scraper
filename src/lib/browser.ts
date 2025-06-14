import { Browser, BrowserContext, chromium, Page } from "playwright";
import { log } from "../utils/logger";
import { BrowserConfig, PageConfig } from "../types";

// Browser configuration constants
const VIEWPORT_WIDTH = 1000;
const VIEWPORT_HEIGHT = VIEWPORT_WIDTH * 1.25;
const DEVICE_SCALE_FACTOR = 2.0;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

// Timeout constants
const PAUSE = 500;
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

export async function setupPage(
  page: Page,
  config: PageConfig,
  videoPage: boolean,
): Promise<void> {
  // Handle consent dialog first
  await handleConsentDialog(page);

  // Enable dark mode
  if (config.useDarkMode) await enableDarkMode(page);

  if (videoPage) {
    // Hide suggested content
    await hideSuggestedContent(page);

    // Expand description
    await expandDescription(page);

    // Dismiss popups
    await dismissPopups(page);

    // Enable theater mode
    if (config.useTheaterMode) await enableTheaterMode(page);
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
  await page.waitForTimeout(PAUSE);
}
88;

export async function clickElement(
  page: Page,
  selectors: string[],
  successMessage: string,
  errorMessage?: string,
): Promise<void> {
  try {
    for (const selector of selectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        await element.click();
        log.debug(successMessage);
        return;
      }
    }
  } catch (error) {
    log.error(error);
  }
  errorMessage && log.debug(errorMessage);
  await page.waitForTimeout(PAUSE);
}

const handleConsentDialog = async (page: Page) =>
  clickElement(
    page,
    ['button:has-text("Accept all")'],
    "✅ Accepted consent dialog",
  );

const enableDarkMode = async (page: Page) => {
  try {
    // Method 1: Set dark theme attributes on the document
    await page.evaluate(() => {
      document.documentElement.setAttribute("dark", "");
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.style.colorScheme = "dark";
    });

    // Method 2: Inject CSS for dark mode
    // await page.addStyleTag({
    //   content: `
    //     html[dark], html[data-theme="dark"] {
    //       background-color: #0f0f0f !important;
    //       color: #ffffff !important;
    //     }
    //     ytd-app {
    //       background-color: #0f0f0f !important;
    //     }
    //     #content, #primary, #secondary {
    //       background-color: #0f0f0f !important;
    //     }
    //     ytd-watch-flexy {
    //       background-color: #0f0f0f !important;
    //     }
    //   `,
    // });

    log.debug("🌙 Dark mode enabled");
  } catch (error) {
    log.debug("⚠️ Could not enable dark mode");
  }
  await page.waitForTimeout(PAUSE);
};

const enableTheaterMode = async (page: Page) =>
  clickElement(
    page,
    ['button[title*="Theater"], button[aria-label*="Theater"]'],
    "🎭 Theater mode enabled",
    "⚠️ Could not enable theater mode",
  );

const dismissPopups = async (page: Page) =>
  clickElement(
    page,
    [
      "button[aria-label*='Dismiss']",
      "button[aria-label*='Close']",
      "#dismiss-button",
      ".ytd-popup-container button",
      "ytd-button-renderer:has-text('Dismiss')",
    ],
    "✅ Dismissed popup",
  );

const expandDescription = async (page: Page) =>
  clickElement(
    page,
    ["div#description"],
    "📖 Description expanded",
    "⚠️ Could not expand description (not found)",
  );

export async function pauseVideo(page: Page): Promise<void> {
  try {
    await page.waitForSelector("video", { timeout: PAUSE });
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
  await page.waitForTimeout(PAUSE);
}

export async function scrollToLoadVideos(page: Page): Promise<void> {
  log.debug("📜 Scrolling to load more videos...");

  for (let i = 0; i < SCROLL_ITERATIONS; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(PAUSE);
    log.debug(`📜 Scroll iteration ${i + 1}/${SCROLL_ITERATIONS}`);
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(PAUSE);
}
