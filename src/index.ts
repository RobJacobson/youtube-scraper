#!/usr/bin/env bun

import { Command } from "commander";
import inquirer from "inquirer";
import { Config } from "./types/Config";
import { getServiceContainer } from "./core/container/serviceContainer";
import { initializeLogger } from "./utils/logger";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const program = new Command()
  .name("youtube-scraper")
  .description("Scrape YouTube channel metadata and screenshots")
  .version("1.0.0")
  .option(
    "-u, --url <url>",
    "YouTube channel URL (e.g., https://www.youtube.com/@WeAreUnidosUS)"
  )
  .option(
    "-v, --video <url>",
    "Single YouTube video URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
  )
  .option("-l, --limit <number>", "Maximum number of videos to scrape", "50")
  .option("-o, --offset <number>", "Starting offset for pagination", "0")
  .option("-d, --delay <number>", "Base delay between requests (ms)", "1000")
  .option("-r, --retries <number>", "Max retries for failed requests", "3")
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

  // Handle single video mode vs channel mode
  let targetUrl: string;
  let isSingleVideo = false;

  if (options.video) {
    targetUrl = options.video;
    isSingleVideo = true;
    console.log(`🎥 Single video mode: ${targetUrl}\n`);
  } else {
    targetUrl = options.url || (await promptForUrl());
    console.log(`📺 Channel mode: ${targetUrl}\n`);
  }

  const config: Config = {
    channelUrl: targetUrl,
    maxVideos: isSingleVideo ? 1 : parseInt(options.limit),
    offset: parseInt(options.offset),
    baseDelay: parseInt(options.delay),
    maxRetries: parseInt(options.retries),
    headless: !options.interactive, // Headless by default, except in interactive mode
    skipScreenshots: options.skipScreenshots,
    verbose: options.verbose,
    useDarkMode: options.darkMode,
    useTheaterMode: options.theaterMode,
    hideSuggestedVideos: options.hideSuggested,
    interactive: options.interactive,
    outputDir: `/media/rob/D/youtube/metadata/${extractChannelName(targetUrl)}`,
  };

  // Initialize global logger
  initializeLogger(config.verbose);

  const serviceContainer = getServiceContainer();

  try {
    // Setup base output directory
    if (!existsSync(config.outputDir)) {
      await mkdir(config.outputDir, { recursive: true });
    }

    // Execute the scraping process
    let result;
    if (isSingleVideo) {
      result = await serviceContainer.scrapingOrchestrator.scrapeSingleVideo(
        config
      );
    } else {
      result = await serviceContainer.scrapingOrchestrator.scrapeChannel(
        config
      );
    }

    // No need to save results separately - they're saved individually per video
    console.log("\n✅ Scraping completed successfully!");
    console.log(`📁 Individual video folders created in: ${config.outputDir}`);
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
  // Handle both channel URLs and video URLs
  if (url.includes("/watch?v=")) {
    // Extract video ID for single videos
    const videoId = url.match(/[?&]v=([^&]+)/)?.[1];
    return videoId ? `video-${videoId}` : "unknown-video";
  }
  // Extract channel name for channel URLs
  const match = url.match(/\/@([^\/]+)/);
  return match?.[1] || "unknown-channel";
};

main().catch(console.error);
