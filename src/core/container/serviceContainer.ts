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

export interface ServiceContainer {
  browserService: BrowserService;
  pageInteractionService: PageInteractionService;
  metadataExtractionService: MetadataExtractionService;
  screenshotService: ScreenshotService;
  videoDiscoveryService: VideoDiscoveryService;
  scrapingOrchestrator: ScrapingOrchestrator;
  cleanup: () => Promise<void>;
}

export const createServiceContainer = (): ServiceContainer => {
  // Create service instances
  const browserService = createBrowserService();
  const pageInteractionService = createPageInteractionService();
  const metadataExtractionService = createMetadataExtractionService();
  const screenshotService = createScreenshotService();

  // Services with dependencies
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

  const cleanup = async (): Promise<void> => {
    // Cleanup browser service if needed
    if (browserService.isInitialized()) {
      await browserService.cleanup();
    }
  };

  return {
    browserService,
    pageInteractionService,
    metadataExtractionService,
    screenshotService,
    videoDiscoveryService,
    scrapingOrchestrator,
    cleanup,
  };
};

// Singleton instance
let containerInstance: ServiceContainer | null = null;

export const getServiceContainer = (): ServiceContainer => {
  if (!containerInstance) {
    containerInstance = createServiceContainer();
  }
  return containerInstance;
};
