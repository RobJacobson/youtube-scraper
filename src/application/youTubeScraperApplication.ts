import { Config } from "../types/Config";
import { ScrapingResult } from "../types/VideoMetadata";
import {
  getServiceContainer,
  ServiceContainer,
} from "../core/container/serviceContainer";
import { initializeLogger } from "../utils/globalLogger";
import { saveResults, setupDirectories } from "../utils/fileSystem";

export interface YouTubeScraperApplication {
  run: (config: Config) => Promise<ScrapingResult>;
}

export const createYouTubeScraperApplication =
  (): YouTubeScraperApplication => {
    const serviceContainer: ServiceContainer = getServiceContainer();

    const run = async (config: Config): Promise<ScrapingResult> => {
      // Initialize global logger
      initializeLogger(config.verbose);

      try {
        // Setup output directories
        await setupDirectories(config.outputDir);

        // Get the main orchestrator service
        const scrapingOrchestrator = serviceContainer.scrapingOrchestrator;

        // Execute the scraping process
        const result = await scrapingOrchestrator.scrapeChannel(config);

        // Save results
        await saveResults(result, config.outputDir);

        return result;
      } finally {
        // Cleanup services
        await serviceContainer.cleanup();
      }
    };

    return {
      run,
    };
  };
