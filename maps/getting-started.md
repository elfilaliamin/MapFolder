---
markmap:
  colorFreezeLevel: 2
  initialExpandLevel: 2
---

# MapFolder Mindmap

## Introduction
- What is MapFolder?
  - A lightweight, fast, zero-backend Markdown mind map viewer
  - Powered by [Markmap](https://markmap.js.org/) & [D3.js](https://d3js.org/)
  - Deployed seamlessly on GitHub Pages
- Why Markdown?
  - Human readable and version controllable with Git
  - Easy to author, edit, and organize
  - Supports headings, nested lists, code blocks, and math formulas

## Core Capabilities
- Automated File Manifest
  - Drop any `.md` file in `maps/` and push
  - GitHub Actions runs the manifest builder automatically
- Interactive Navigation
  - Smooth pan and zoom with mouse or touch
  - Click node circles to expand or collapse branches
  - Deep linking via URL hash (e.g. `#projects/example.md`)
- Custom Controls
  - Zoom in (`+`), Zoom out (`-`), and Fit to screen
  - Expand all and Collapse all branches with one click
  - Download current mind map as an SVG file
  - Built-in Markdown source viewer with copy button

## Styling & Localization
- Dual Theme Support
  - Automatic detection of system preference (`prefers-color-scheme`)
  - Instant toggle between sleek dark mode and crisp light mode
- Right-to-Left (RTL) Support
  - Automatic language detection for Arabic and Hebrew text
  - Dedicated typography with clean font rendering
- Mobile Friendly
  - Slide-over drawer on smaller screens
  - Touch-optimized gestures for pan and zoom

## Useful Links
- [Markmap Official Documentation](https://markmap.js.org/docs)
- [Markmap GitHub Repository](https://github.com/markmap/markmap)
- [CommonMark Specification](https://commonmark.org/)
