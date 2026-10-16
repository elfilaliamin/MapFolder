# Project Architecture & Roadmap

## Frontend Architecture
- Technology Stack
  - Vanilla JavaScript (ES2022 Modules)
  - Native CSS Variables & CSS Grid/Flexbox
  - Zero framework runtime overhead
- Mindmap Integration
  - markmap-lib (Markdown transformer)
  - markmap-view (SVG interactive canvas)
  - markmap-toolbar (Zoom, fit, expand controls)
  - D3.js (Hierarchical layouts & transitions)
- Responsive Layout
  - Sticky glassmorphic top header
  - Collapsible drawer for handheld devices
  - Clean floating action controls

## Data & Build Pipeline
- Headless File Indexing
  - Node.js script (`scripts/build-manifest.mjs`)
  - No external npm dependencies required
  - Extracts Markdown titles & builds folder hierarchy
- GitHub Actions CI/CD
  - Automated deployment workflow (`.github/workflows/deploy.yml`)
  - Runs manifest generation on commit
  - Direct upload to GitHub Pages

## Roadmap & Milestones
- Phase 1: Core Functionality
  - Tree navigation & search filter
  - URL hash routing with browser history
  - Theme switching & RTL detection
- Phase 2: Enhanced Features
  - SVG export with embedded styling
  - Expand / Collapse all nodes
  - Markdown raw source viewer
- Phase 3: Future Polish
  - Full-text search across all map contents
  - PNG export option
  - Custom color themes selector
