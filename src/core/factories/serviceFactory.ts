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

export const createScrapingOrchestratorWithDependencies =
  (): ScrapingOrchestrator => {
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

    return createScrapingOrchestrator(
      browserService,
      videoDiscoveryService,
      pageInteractionService,
      metadataExtractionService,
      screenshotService
    );
  };

export const createBrowserServiceFactory = (): BrowserService => {
  return createBrowserService();
};

export const createPageInteractionServiceFactory =
  (): PageInteractionService => {
    return createPageInteractionService();
  };

export const createMetadataExtractionServiceFactory =
  (): MetadataExtractionService => {
    return createMetadataExtractionService();
  };

export const createScreenshotServiceFactory = (): ScreenshotService => {
  return createScreenshotService();
};

export const createVideoDiscoveryServiceFactory = (
  browserService?: BrowserService,
  pageInteractionService?: PageInteractionService
): VideoDiscoveryService => {
  return createVideoDiscoveryService(
    browserService || createBrowserService(),
    pageInteractionService || createPageInteractionService()
  );
};
