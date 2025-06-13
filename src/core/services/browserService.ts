import { Browser, BrowserContext, chromium } from "playwright";
import { getLogger } from "../../utils/globalLogger";

// Browser configuration constants
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 1024;
const DEVICE_SCALE_FACTOR = 2.0;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

export interface BrowserServiceConfig {
  headless: boolean;
  interactive: boolean;
  useDarkMode: boolean;
}

export interface BrowserState {
  browser: Browser | null;
  context: BrowserContext | null;
}

export interface BrowserService {
  initialize: (config: BrowserServiceConfig) => Promise<void>;
  getContext: () => BrowserContext;
  getBrowser: () => Browser;
  cleanup: () => Promise<void>;
  isInitialized: () => boolean;
}

export const createBrowserService = (): BrowserService => {
  const logger = getLogger();
  let state: BrowserState = { browser: null, context: null };

  const initialize = async (config: BrowserServiceConfig): Promise<void> => {
    logger.info("🔧 Initializing browser...");

    state.browser = await chromium.launch({
      headless: config.interactive ? false : config.headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--force-device-scale-factor=2",
        "--high-dpi-support=1",
        "--force-color-profile=srgb",
      ],
    });

    state.context = await state.browser.newContext({
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      userAgent: USER_AGENT,
      colorScheme: config.useDarkMode ? "dark" : "light",
    });

    logger.info("✅ Browser initialized successfully");
  };

  const getContext = (): BrowserContext => {
    if (!state.context) {
      throw new Error(
        "Browser context not initialized. Call initialize() first."
      );
    }
    return state.context;
  };

  const getBrowser = (): Browser => {
    if (!state.browser) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }
    return state.browser;
  };

  const cleanup = async (): Promise<void> => {
    logger.info("🧹 Cleaning up browser resources...");

    if (state.context) {
      await state.context.close();
      state.context = null;
    }

    if (state.browser) {
      await state.browser.close();
      state.browser = null;
    }

    logger.info("✅ Browser cleanup completed");
  };

  const isInitialized = (): boolean => {
    return state.browser !== null && state.context !== null;
  };

  return {
    initialize,
    getContext,
    getBrowser,
    cleanup,
    isInitialized,
  };
};
