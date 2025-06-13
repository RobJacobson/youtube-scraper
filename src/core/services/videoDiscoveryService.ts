import { Page } from "playwright";
import { BrowserService } from "./browserService";
import { PageInteractionService } from "./pageInteractionService";
import { log } from "../../utils/logger";

// URL discovery constants
const CHANNEL_PAGE_TIMEOUT = 30000;

export interface VideoDiscoveryConfig {
  channelUrl: string;
  maxVideos: number;
  offset: number;
}

export interface VideoDiscoveryService {
  discoverVideoUrls: (config: VideoDiscoveryConfig) => Promise<string[]>;
}

export const createVideoDiscoveryService = (
  browserService: BrowserService,
  pageInteractionService: PageInteractionService
): VideoDiscoveryService => {
  

  const navigateToChannelVideos = async (
    page: Page,
    channelUrl: string
  ): Promise<void> => {
    await page.goto(`${channelUrl}/videos`, {
      waitUntil: "networkidle",
      timeout: CHANNEL_PAGE_TIMEOUT,
    });
  };

  const setupChannelPage = async (page: Page): Promise<void> => {
    // Handle consent and popups
    await pageInteractionService.handleConsentDialog(page);
    await pageInteractionService.dismissPopups(page);
  };

  const loadMoreVideos = async (page: Page): Promise<void> => {
    await pageInteractionService.scrollToLoadVideos(page);
  };

  const extractVideoUrls = async (
    page: Page,
    config: VideoDiscoveryConfig
  ): Promise<string[]> => {
    return await page.evaluate(
      (configData) => {
        const links = Array.from(
          document.querySelectorAll('a[href*="/watch?v="]')
        );
        const uniqueUrls = [
          ...new Set(
            links.map((link) => {
              const href = (link as HTMLAnchorElement).href;
              return href.split("&")[0]; // Remove extra parameters
            })
          ),
        ];

        return uniqueUrls.slice(
          configData.offset,
          configData.offset + configData.maxVideos
        );
      },
      { maxVideos: config.maxVideos, offset: config.offset }
    );
  };

  const discoverVideoUrls = async (
    config: VideoDiscoveryConfig
  ): Promise<string[]> => {
    log.info("🔍 Discovering videos on channel...");

    const context = browserService.getContext();
    const page = await context.newPage();

    try {
      await navigateToChannelVideos(page, config.channelUrl);
      await setupChannelPage(page);
      await loadMoreVideos(page);

      const videoUrls = await extractVideoUrls(page, config);

      log.info(`📹 Found ${videoUrls.length} videos to scrape`);
      return videoUrls;
    } finally {
      await page.close();
    }
  };

  return {
    discoverVideoUrls,
  };
};
