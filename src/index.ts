#!/usr/bin/env bun

import { Command } from "commander";
import inquirer from "inquirer";
import { scrapeYouTubeChannel } from "./scraper/scrapeYouTubeChannel";
import { Config } from "./types/Config";
import { setupDirectories } from "./utils/fileSystem";

// CLI default values
const DEFAULT_VERSION = "1.0.0";
const DEFAULT_MAX_VIDEOS = "50";
const DEFAULT_OFFSET = "0";
const DEFAULT_BASE_DELAY = "1000";
const DEFAULT_MAX_RETRIES = "3";

// Regex constants
const CHANNEL_NAME_REGEX_GROUP = 1;

// Exit codes
const ERROR_EXIT_CODE = 1;

const program = new Command();

program
  .name("youtube-scraper")
  .description("Scrape YouTube channel metadata and screenshots")
  .version(DEFAULT_VERSION);

program
  .option(
    "-u, --url <url>",
    "YouTube channel URL (e.g., https://www.youtube.com/@WeAreUnidosUS)"
  )
  .option(
    "-l, --limit <number>",
    "Maximum number of videos to scrape",
    DEFAULT_MAX_VIDEOS
  )
  .option(
    "-o, --offset <number>",
    "Starting offset for pagination",
    DEFAULT_OFFSET
  )
  .option(
    "-d, --delay <number>",
    "Base delay between requests (ms)",
    DEFAULT_BASE_DELAY
  )
  .option(
    "-r, --retries <number>",
    "Max retries for failed requests",
    DEFAULT_MAX_RETRIES
  )
  .option("--headless", "Run browser in headless mode", false)
  .option("--skip-screenshots", "Skip taking screenshots", false)
  .option("--verbose", "Enable verbose logging", false)
  .option("--dark-mode", "Enable dark mode for YouTube pages", false)
  .option("--theater-mode", "Enable theater mode for video pages", false)
  .option("--hide-suggested", "Hide suggested videos and distractions", false);

async function main() {
  program.parse();
  const options = program.opts();

  console.log("🎭 YouTube Scraper");
  console.log("Powered by Playwright + Bun\n");

  let channelUrl = options.url;

  // Prompt for URL if not provided
  if (!channelUrl) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "Enter the YouTube channel URL:",
        validate: (input: string) => {
          const urlPattern = /^https:\/\/www\.youtube\.com\/@[\w-]+$/;
          return (
            urlPattern.test(input) ||
            "Please enter a valid YouTube channel URL (e.g., https://www.youtube.com/@WeAreUnidosUS)"
          );
        },
      },
    ]);
    channelUrl = answers.url;
  }

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
    outputDir: `/media/rob/D/youtube/metadata/${extractChannelName(
      channelUrl
    )}`,
  };

  try {
    // Setup output directories
    await setupDirectories(config.outputDir);

    // Run scraper using functional approach
    await scrapeYouTubeChannel(config);

    console.log("\n✅ Scraping completed successfully!");
  } catch (error) {
    console.error("\n❌ Scraping failed:", error);
    process.exit(ERROR_EXIT_CODE);
  }
}

function extractChannelName(url: string): string {
  const match = url.match(/\/@([^\/]+)/);
  return match ? match[CHANNEL_NAME_REGEX_GROUP] : "unknown-channel";
}

main().catch(console.error);
