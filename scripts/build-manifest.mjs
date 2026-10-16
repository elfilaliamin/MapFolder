#!/usr/bin/env node

/**
 * build-manifest.mjs
 * Dependency-free Node script that recursively scans the `maps/` directory
 * for `.md` files and outputs `maps/index.json`.
 *
 * Data format:
 * Tree structure of folders and files.
 * Folders contain `children`, sorted alphabetically (folders first, then files).
 * Files contain `name`, `path` (relative to maps/), and `title` (first `# heading`, or filename fallback).
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MAPS_DIR = join(__dirname, '..', 'maps');
const OUTPUT_FILE = join(MAPS_DIR, 'index.json');

/**
 * Extract the first level-1 heading (# Title) from Markdown content,
 * ignoring frontmatter blocks (--- ... ---).
 *
 * @param {string} content
 * @param {string} fallback
 * @returns {string}
 */
function extractTitle(content, fallback) {
  // Check frontmatter title if present
  let cleanContent = content;
  if (content.startsWith('---')) {
    const endMatch = content.indexOf('\n---', 3);
    if (endMatch !== -1) {
      const frontmatterBlock = content.slice(3, endMatch);
      const titleMatch = frontmatterBlock.match(/^\s*title:\s*["']?(.+?)["']?\s*$/m);
      if (titleMatch && titleMatch[1]) {
        return titleMatch[1].trim();
      }
      cleanContent = content.slice(endMatch + 4);
    }
  }

  // Find first # Heading line
  const lines = cleanContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      const heading = trimmed.slice(2).trim();
      if (heading) {
        return heading;
      }
    }
  }

  return fallback;
}

/**
 * Recursively scan directory and build tree
 *
 * @param {string} dir Current directory path
 * @param {string} rootDir Base maps directory
 * @returns {Promise<Array<object>>}
 */
async function scanDirectory(dir, rootDir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const folders = [];
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Ignore hidden directories
      if (entry.name.startsWith('.')) continue;

      const relPath = relative(rootDir, fullPath).replace(/\\/g, '/');
      const children = await scanDirectory(fullPath, rootDir);

      // Only include folders that have content
      if (children.length > 0) {
        folders.push({
          type: 'folder',
          name: entry.name,
          path: relPath,
          children,
        });
      }
    } else if (entry.isFile()) {
      // Only process .md files, ignore index.json and hidden files
      if (entry.name.startsWith('.') || extname(entry.name).toLowerCase() !== '.md') {
        continue;
      }

      const relPath = relative(rootDir, fullPath).replace(/\\/g, '/');
      const fallbackTitle = basename(entry.name, extname(entry.name));

      try {
        const content = await readFile(fullPath, 'utf-8');
        const title = extractTitle(content, fallbackTitle);

        files.push({
          type: 'file',
          name: entry.name,
          path: relPath,
          title,
        });
      } catch (err) {
        console.warn(`Warning: Could not read ${fullPath}:`, err.message);
        files.push({
          type: 'file',
          name: entry.name,
          path: relPath,
          title: fallbackTitle,
        });
      }
    }
  }

  // Sort folders alphabetically by name
  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  // Sort files alphabetically by title (fallback to name)
  files.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  return [...folders, ...files];
}

async function main() {
  console.log(`Scanning maps in: ${MAPS_DIR}`);

  try {
    const stats = await stat(MAPS_DIR).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      console.error(`Error: maps/ directory does not exist at ${MAPS_DIR}`);
      process.exit(1);
    }

    const tree = await scanDirectory(MAPS_DIR, MAPS_DIR);
    const jsonOutput = JSON.stringify(tree, null, 2) + '\n';

    await writeFile(OUTPUT_FILE, jsonOutput, 'utf-8');
    console.log(`Successfully generated manifest at: ${OUTPUT_FILE}`);
    console.log(`Total root items: ${tree.length}`);
  } catch (error) {
    console.error('Fatal error building manifest:', error);
    process.exit(1);
  }
}

main();
