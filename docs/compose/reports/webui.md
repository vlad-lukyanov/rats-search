---
feature: webui
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-07-04-webui-implementation.md
branch: master
commits: c22ab2c..6357b14
---

# Web Interface — Final Report

## What Was Built

A simple web interface for searching torrents, viewing torrent details, and monitoring P2P network statistics. The interface is a Vue.js 3 SPA served from a `webui/` directory on disk, with no build step required — Vue.js is loaded from CDN.

The web interface provides:
- **Search**: Full-text search of the torrent database with results showing name, size, seeders, leechers, and content type
- **Torrent Details**: Modal view with complete torrent information and file list
- **Statistics Dashboard**: Real-time display of database stats (torrents, files, size) and P2P network status (peers, DHT nodes)

## Architecture

### Components

```
webui/
├── index.html          # Vue.js SPA entry point
├── css/
│   └── style.css       # Dark theme styles
└── js/
    └── app.js          # Vue.js application logic
```

### C++ Integration

- **ConfigManager** (`src/api/configmanager.h/cpp`): Added `webuiDir` configuration option with getter/setter
- **ApiServer** (`src/api/apiserver.h/cpp`): Extended with `handleStaticFile()` method for serving static files
- **main.cpp**: Added `--webui-dir` CLI option for both console and GUI modes

### Data Flow

1. User navigates to `http://localhost:8095`
2. ApiServer serves `webui/index.html`
3. Vue.js app loads and fetches statistics from `/api/stats.database` and `/api/stats.p2pStatus`
4. User enters search query → app calls `/api/search.torrents?text=<query>&limit=50`
5. User clicks torrent → app calls `/api/search.torrent?hash=<hash>&includeFiles=true`
6. Results displayed in modal with file list

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/api/search.torrents?text=<query>&limit=<n>` | Search torrents |
| `/api/search.torrent?hash=<hash>&includeFiles=true` | Get torrent details |
| `/api/stats.database` | Database statistics |
| `/api/stats.p2pStatus` | P2P network status |

## Usage

### Starting with Web UI

```bash
# Console mode with web interface
./RatsSearch --console --webui-dir ./webui

# Or specify custom directory
./RatsSearch --console --webui-dir /path/to/webui
```

### Configuration

The webui directory can also be configured in `rats.json`:

```json
{
  "webuiDir": "/path/to/webui"
}
```

### Accessing the Interface

Open browser to `http://localhost:8095`

## Verification

### Build Verification
- Built successfully with Docker (Ubuntu 24.04 + Qt6)
- All 115 CMake targets compiled without errors

### Functional Testing
- Static file serving: HTML, CSS, JS files served correctly
- API endpoints: All endpoints respond with correct JSON
- Search functionality: Returns results from database
- Statistics display: Shows real-time P2P and database stats

### Security Testing
- Directory traversal: Fixed vulnerability using `QDir::cleanPath()` for path normalization
- Path validation: Clean paths must start with webuiDir prefix

### Test Coverage
- `tests/test_webui.cpp`: 13 test cases for static file serving, content types, and directory traversal

## Journey Log

- [pivot] Original plan used incorrect API endpoint names (`/api/statistics`, `/api/p2p.status`). Fixed during testing to match actual endpoints (`/api/stats.database`, `/api/stats.p2pStatus`)
- [lesson] ConfigManager stores all config in `QJsonObject config_` — no `m_*` member variables. New settings just add a JSON key, getter/setter, and signal
- [dead end] Directory traversal check using string `startsWith` was bypassable. Fixed with `QDir::cleanPath()` for proper path normalization

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/plans/2026-07-04-webui-implementation.md` | Implementation plan | 9 tasks + 4 fix tasks |
