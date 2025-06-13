import {
  createBrowserService,
  BrowserService,
} from "../services/browserService";
import {
  createVideoDiscoveryService,
  VideoDiscoveryService,
} from "../services/videoDiscoveryService";
import {
  createPageInteractionService,
  PageInteractionService,
} from "../services/pageInteractionService";
import {
  createMetadataExtractionService,
  MetadataExtractionService,
} from "../services/metadataExtractionService";
import {
  createScreenshotService,
  ScreenshotService,
} from "../services/screenshotService";
import {
  createScrapingOrchestrator,
  ScrapingOrchestrator,
} from "../services/scrapingOrchestrator";

// Simplified service container - just create and return services
export const createServiceContainer = () => {
  const browserService = createBrowserService();
  const pageInteractionService = createPageInteractionService();
  const metadataExtractionService = createMetadataExtractionService();
  const screenshotService = createScreenshotService();

  const videoDiscoveryService = createVideoDiscoveryService(
    browserService,
    pageInteractionService
  );

  const scrapingOrchestrator = createScrapingOrchestrator(
    browserService,
    videoDiscoveryService,
    pageInteractionService,
    metadataExtractionService,
    screenshotService
  );

  return {
    browserService,
    pageInteractionService,
    metadataExtractionService,
    screenshotService,
    videoDiscoveryService,
    scrapingOrchestrator,
    cleanup: async () => {
      if (browserService.isInitialized()) {
        await browserService.cleanup();
      }
    },
  };
};

// Singleton instance
let containerInstance: ReturnType<typeof createServiceContainer> | null = null;

export const getServiceContainer = () => {
  if (!containerInstance) {
    containerInstance = createServiceContainer();
  }
  return containerInstance;
};
