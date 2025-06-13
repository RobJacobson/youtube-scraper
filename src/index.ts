#!/usr/bin/env bun

import { Command } from "commander";
import inquirer from "inquirer";
import { Config } from "./types/Config";
import { getServiceContainer } from "./core/container/serviceContainer";
import { initializeLogger } from "./utils/logger";
import { saveResults, setupDirectories } from "./utils/fileSystem";

const program = new Command()
  .name("youtube-scraper")
  .description("Scrape YouTube channel metadata and screenshots")
  .version("1.0.0")
  .option(
    "-u, --url <url>",
    "YouTube channel URL (e.g., https://www.youtube.com/@WeAreUnidosUS)"
  )
  .option("-l, --limit <number>", "Maximum number of videos to scrape", "50")
  .option("-o, --offset <number>", "Starting offset for pagination", "0")
  .option("-d, --delay <number>", "Base delay between requests (ms)", "1000")
  .option("-r, --retries <number>", "Max retries for failed requests", "3")
  .option("--headless", "Run browser in headless mode", false)
  .option("--skip-screenshots", "Skip taking screenshots", false)
  .option("--verbose", "Enable verbose logging", false)
  .option("--dark-mode", "Enable dark mode for YouTube pages", false)
  .option("--theater-mode", "Enable theater mode for video pages", false)
  .option("--hide-suggested", "Hide suggested videos and distractions", false)
  .option(
    "-i, --interactive",
    "Interactive mode - pause after each screenshot",
    false
  );

const main = async (): Promise<void> => {
  program.parse();
  const options = program.opts();

  console.log("🎭 YouTube Scraper\nPowered by Playwright + Bun\n");

  const channelUrl = options.url || (await promptForUrl());

  const config: Config = {
    channelUrl,
    maxVideos: parseInt(options.limit),
    offset: parseInt(options.offset),
    baseDelay: parseInt(options.delay),
    maxRetries: parseInt(options.retries),
    headless: options.headless,
    skipScreenshots: options.skipScreenshots,
    verbose: options.verbose,
    useDarkMode: options.darkMode,
    useTheaterMode: options.theaterMode,
    hideSuggestedVideos: options.hideSuggested,
    interactive: options.interactive,
    outputDir: `/media/rob/D/youtube/metadata/${extractChannelName(
      channelUrl
    )}`,
  };

  // Initialize global logger
  initializeLogger(config.verbose);

  const serviceContainer = getServiceContainer();

  try {
    // Setup output directories
    await setupDirectories(config.outputDir);

    // Execute the scraping process
    const result = await serviceContainer.scrapingOrchestrator.scrapeChannel(
      config
    );

    // Save results
    await saveResults(result, config.outputDir);

    console.log("\n✅ Scraping completed successfully!");
  } catch (error) {
    console.error("\n❌ Scraping failed:", error);
    process.exit(1);
  } finally {
    // Cleanup services
    await serviceContainer.cleanup();
  }
};

const promptForUrl = async (): Promise<string> => {
  const { url } = await inquirer.prompt([
    {
      type: "input",
      name: "url",
      message: "Enter the YouTube channel URL:",
      validate: (input: string) =>
        /^https:\/\/www\.youtube\.com\/@[\w-]+$/.test(input) ||
        "Please enter a valid YouTube channel URL (e.g., https://www.youtube.com/@WeAreUnidosUS)",
    },
  ]);
  return url;
};

const extractChannelName = (url: string): string => {
  const match = url.match(/\/@([^\/]+)/);
  return match?.[1] || "unknown-channel";
};

main().catch(console.error);
