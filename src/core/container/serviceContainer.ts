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
  createScrapingOrchestrator,
  ScrapingOrchestrator,
} from "../services/scrapingOrchestrator";
import {
  createImageDownloadService,
  ImageDownloadService,
} from "../services/imageDownloadService";
import {
  createHtmlSaveService,
  HtmlSaveService,
} from "../services/htmlSaveService";
import {
  createVideoOutputService,
  VideoOutputService,
} from "../services/videoOutputService";

// Simplified service container - just create and return services
export const createServiceContainer = () => {
  const browserService = createBrowserService();
  const pageInteractionService = createPageInteractionService();
  const metadataExtractionService = createMetadataExtractionService();
  const imageDownloadService = createImageDownloadService();
  const htmlSaveService = createHtmlSaveService();

  const videoDiscoveryService = createVideoDiscoveryService(
    browserService,
    pageInteractionService
  );

  const videoOutputService = createVideoOutputService(
    imageDownloadService,
    htmlSaveService
  );

  const scrapingOrchestrator = createScrapingOrchestrator(
    browserService,
    videoDiscoveryService,
    pageInteractionService,
    metadataExtractionService,
    videoOutputService
  );

  return {
    browserService,
    pageInteractionService,
    metadataExtractionService,
    imageDownloadService,
    htmlSaveService,
    videoDiscoveryService,
    videoOutputService,
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
