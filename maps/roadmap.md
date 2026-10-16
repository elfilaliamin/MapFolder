---
markmap:
  colorFreezeLevel: 2
  initialExpandLevel: 2
---

# Road Map

## Phase 1: Foundation & Core Setup
- Project Initialization
  - Git repository & GitHub Pages integration
  - Automated CI/CD workflow with GitHub Actions
- Architecture & Stack
  - Plain HTML5, CSS3, ES2022 modules
  - Markmap & D3.js visualization engine
  - Zero-bundle static build pipeline
- Manifest System
  - Recursive folder indexing (`scripts/build-manifest.mjs`)
  - Dynamic `maps/index.json` generation
  - Title extraction from Markdown headings

## Phase 2: Navigation & User Experience
- Interactive Sidebar
  - Collapsible nested directory tree
  - Keyboard navigation (Arrow keys + Enter)
  - Real-time search & instant filtering
- Deep Linking & State
  - URL hash routing (`#roadmap.md`)
  - Browser back & forward navigation history
  - Persistent state in `localStorage`
- Adaptive Theming
  - System preference detection (`prefers-color-scheme`)
  - Smooth Dark & Light mode toggle
  - High-contrast color scales for readable node branches

## Phase 3: Advanced Visual Controls
- Mind Map Interaction
  - Smooth pan, drag, and pinch-to-zoom
  - Node expansion & folding controls
  - One-click Expand All / Collapse All
- Export & Sharing
  - Standalone SVG vector export with embedded styles
  - Read-only Markdown source inspector
  - Quick copy-to-clipboard functionality
- Internationalization (i18n)
  - Automatic RTL (Right-to-Left) language detection
  - Dedicated font stack for Arabic & Hebrew scripts

## Phase 4: Future Enhancements
- Content & Capabilities
  - Full-text search across all map contents
  - Rich LaTeX / KaTeX math formulas support
  - Syntax highlighted code blocks inside nodes
- Visual Customization
  - Customizable color palettes (Pastel, Vibrant, Monochromatic)
  - Layout orientation options (Horizontal, Vertical, Radial)
  - Custom node icons and tag badges
- Performance & Offline
  - Progressive Web App (PWA) with service worker
  - Offline caching of map assets
  - Direct PDF and PNG high-res exports
