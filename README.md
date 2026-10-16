# MapFolder 🗺️

**MapFolder** is a zero-backend, high-performance static web application that turns any folder of Markdown files (`maps/`) into beautiful, interactive mind maps using the [markmap](https://markmap.js.org/) ecosystem and D3.js.

Designed to be hosted entirely on **GitHub Pages**, it requires no database, no bundler, and no complex configuration.

---

## ✨ Features

- 📁 **Automated Folder Tree**: Organizes mind maps into a clean, collapsible nested directory tree.
- 🔍 **Instant Search**: Real-time filtering by map title, filename, and path.
- 🔗 **Deep Linking & Browser History**: Maps are tracked via URL hashes (e.g. `#projects/example.md`) making them directly shareable.
- 🌐 **Full RTL Support**: Automatic language detection for Arabic and Hebrew mind maps with dedicated Arabic typography.
- 🌓 **Adaptive Theming**: Seamless dark and light themes that respect your system settings and persist in `localStorage`.
- 🛠️ **Rich Controls**:
  - Zoom in (`+`), Zoom out (`-`), and Fit to screen
  - Expand all and Collapse all branches with a single click
  - Download current mind map as a standalone SVG file
  - Built-in read-only Markdown source inspector with one-click copy
- 📱 **Responsive Design**: Desktop dual-pane interface transforms into a touch-friendly slide-over drawer on mobile devices.

---

## 🚀 How to Add New Maps

1. Add your `.md` files anywhere inside the `maps/` directory (subfolders are supported!).
2. Ensure the first line (or heading after frontmatter) is a level-1 heading:
   ```markdown
   # My New Mind Map
   ## Section 1
   - Key point A
   - Key point B
   ```
3. *(Optional)* Add markmap frontmatter options at the top:
   ```markdown
   ---
   markmap:
     colorFreezeLevel: 2
     initialExpandLevel: 2
   ---
   # My New Mind Map
   ```
4. Commit and push your changes to GitHub:
   ```bash
   git add maps/
   git commit -m "Add new mind map"
   git push origin main
   ```
   GitHub Actions will automatically re-index the manifest and update your live site!

---

## 💻 Running Locally

You can test and run MapFolder locally using Node.js:

1. **Generate the map manifest**:
   ```bash
   node scripts/build-manifest.mjs
   ```

2. **Serve the project with any local HTTP server**:
   ```bash
   npx serve .
   ```
   Or using Python:
   ```bash
   python -m http.server 3000
   ```

3. Open your browser at `http://localhost:3000` (or the port shown in your terminal).

---

## 🌐 Deploying to GitHub Pages

1. **Push this repository** to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for MapFolder"
   git branch -M main
   git remote add origin https://github.com/elfilaliamin/MapFolder.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - In your GitHub repository, navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, select:
     👉 **GitHub Actions**
   - The `.github/workflows/deploy.yml` workflow will automatically trigger, build the manifest, and publish your site!

---

## 📄 File Structure

```text
MapFolder/
├── .github/
│   └── workflows/
│       └── deploy.yml           # Automated manifest generation & deployment
├── css/
│   └── style.css                # Modern CSS variables, themes, & responsive layout
├── js/
│   └── app.js                   # Application logic, tree navigation, & markmap engine
├── maps/
│   ├── index.json               # Auto-generated manifest of all maps
│   ├── getting-started.md       # Sample English map with frontmatter
│   ├── arabic-demo.md           # Sample Arabic map with RTL detection
│   └── projects/
│       └── example.md           # Sample map in a subfolder
├── scripts/
│   └── build-manifest.mjs       # Dependency-free Node script to scan maps/
├── index.html                   # Semantic HTML5 entry point
└── README.md                    # Project documentation
```

---

## 💖 Credits & Acknowledgments

- Built on the wonderful [markmap](https://github.com/markmap/markmap) library by [@gera2ld](https://github.com/gera2ld) (licensed under MIT).
- Visualizations powered by [D3.js](https://d3js.org/).
- Fonts by [Google Fonts](https://fonts.google.com/) (*Outfit* & *Tajawal*).
