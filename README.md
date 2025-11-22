# PaperMCP Server

<div align="center">

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.18-brightgreen)](https://nodejs.org)

A powerful Model Context Protocol (MCP) server for searching and accessing academic papers from 23+ sources.

English | [简体中文](README.zh-CN.md)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Platforms](#supported-platforms) • [Contributing](#contributing)

</div>

---

## Overview

PaperMCP provides unified access to academic papers across multiple platforms through the Model Context Protocol. Built with TypeScript and designed for seamless integration with Claude Desktop and other MCP clients.

### Key Features

- 🔍 **23+ Academic Sources** - arXiv, PubMed, Scopus, Web of Science, and more
- 🔌 **Plugin Architecture** - Optional sensitive sources (Sci-Hub, LibGen) as opt-in plugins
- 📄 **Full-Text Access** - Download and extract text from PDFs
- 🚀 **High Performance** - Rate limiting, caching, and async operations
- 🛡️ **Type Safe** - Full TypeScript implementation with strict typing
- 🎯 **MCP Native** - Built on official MCP TypeScript SDK

---

## Installation

### Prerequisites

- Node.js >= 18.18
- npm or pnpm

### Quick Start with npx

```bash
# Run directly with npx (recommended)
npx @telagod/papermcp
```

### Install from GitHub Packages

First, configure npm to use GitHub Packages:

```bash
# Add to ~/.npmrc
echo "@telagod:registry=https://npm.pkg.github.com" >> ~/.npmrc
```

Then install:

```bash
# Install globally
npm install -g @telagod/papermcp

# Or install locally
npm install @telagod/papermcp
```

### Install from source

```bash
# Clone repository
git clone https://github.com/telagod/papermcp.git
cd papermcp/ts

# Install dependencies
npm install

# Build
npm run build

# Run
npm run dev
```

### Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "paper-search": {
      "command": "npx",
      "args": ["@telagod/papermcp"],
      "env": {
        "SEMANTIC_SCHOLAR_API_KEY": "your-key-here",
        "WOS_API_KEY": "your-key-here",
        "SCOPUS_API_KEY": "your-key-here",
        "CORE_API_KEY": "your-key-here",
        "MICROSOFT_ACADEMIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

---

## Supported Platforms

### Core Platforms (16)

| Platform | ID | API Key Required | Status |
|----------|----|--------------------|--------|
| arXiv | `arxiv` | No | ✅ |
| PubMed | `pubmed` | No | ✅ |
| PubMed Central | `pmc` | No | ✅ |
| bioRxiv | `biorxiv` | No | ✅ |
| medRxiv | `medrxiv` | No | ✅ |
| Google Scholar | `google-scholar` | No | ✅ |
| IACR ePrint | `iacr` | No | ✅ |
| Semantic Scholar | `semantic` | Optional | ✅ |
| CrossRef | `crossref` | No | ✅ |
| ACM Digital Library | `acm` | No | ✅ |
| Web of Science | `wos` | Yes | ✅ |
| Scopus | `scopus` | Yes | ✅ |
| JSTOR | `jstor` | No | ✅ |
| ResearchGate | `researchgate` | No | ✅ |
| CORE | `core` | Yes | ✅ |
| Microsoft Academic | `microsoft-academic` | Yes | ✅ |

### Optional Plugins (7)

Enable via environment variables:

| Plugin | Env Var | Description |
|--------|---------|-------------|
| Sci-Hub | `PLUGIN_SCI_HUB=true` | Access papers via Sci-Hub |
| LibGen | `PLUGIN_LIBGEN=true` | Library Genesis integration |
| Unpaywall | `PLUGIN_UNPAYWALL=true` | Open access finder (requires `UNPAYWALL_EMAIL`) |
| Open Access Button | `PLUGIN_OA_BUTTON=true` | OA discovery service |
| ScienceDirect | `PLUGIN_SCIENCE_DIRECT=true` | Elsevier papers |
| Springer Link | `PLUGIN_SPRINGER_LINK=true` | Springer papers |
| IEEE Xplore | `PLUGIN_IEEE_XPLORE=true` | IEEE papers |

> ⚠️ **Legal Notice**: Sci-Hub and LibGen plugins are disabled by default. Use responsibly and comply with local regulations.

---

## Usage

### MCP Tools

The server exposes the following MCP tools:

#### `search_papers`
Search for papers across platforms.

```typescript
{
  "platform": "arxiv",
  "query": "machine learning",
  "limit": 10
}
```

#### `download_paper`
Download paper PDF.

```typescript
{
  "platform": "arxiv",
  "id": "2301.00001",
  "directory": "/path/to/save"
}
```

#### `read_paper`
Extract text from paper.

```typescript
{
  "platform": "arxiv",
  "id": "2301.00001",
  "directory": "/path/to/pdfs"
}
```

#### `lookup_paper`
Get paper metadata by ID.

```typescript
{
  "platform": "crossref",
  "id": "10.1234/example"
}
```

---

## Configuration

### Environment Variables

#### Required for Specific Platforms

```bash
# Web of Science
WOS_API_KEY=your-key

# Scopus
SCOPUS_API_KEY=your-key

# CORE
CORE_API_KEY=your-key

# Microsoft Academic
MICROSOFT_ACADEMIC_API_KEY=your-key

# Unpaywall (if plugin enabled)
UNPAYWALL_EMAIL=your@email.com
```

#### Optional

```bash
# Semantic Scholar (for enhanced features)
SEMANTIC_SCHOLAR_API_KEY=your-key

# Plugin toggles
PLUGIN_SCI_HUB=false
PLUGIN_LIBGEN=false
PLUGIN_UNPAYWALL=false
PLUGIN_OA_BUTTON=false
PLUGIN_SCIENCE_DIRECT=false
PLUGIN_SPRINGER_LINK=false
PLUGIN_IEEE_XPLORE=false

# Custom endpoints
SCIHUB_BASE_URL=https://sci-hub.se
LIBGEN_BASE_URL=https://libgen.is
```

---

## Development

### Project Structure

```
ts/
├── src/
│   ├── core/           # Core types and config
│   ├── platforms/      # Platform adapters
│   ├── plugins/        # Optional plugins
│   ├── services/       # Registry and tools
│   ├── server/         # MCP server
│   └── utils/          # HTTP, logging
├── dist/               # Compiled output
└── package.json
```

### Adding a New Platform

1. Create adapter in `src/platforms/`:

```typescript
import { BasePlatformAdapter } from './baseAdapter.js';

class MyAdapter extends BasePlatformAdapter {
  constructor() {
    super('my-platform');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    // Implementation
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    // Implementation
  }

  async read(id: string, dir: string): Promise<PaperText> {
    // Implementation
  }
}

addAdapterFactory(() => new MyAdapter());
```

2. Add platform ID to `src/core/types.ts`
3. Register in `src/platforms/index.ts`

### Scripts

```bash
npm run build      # Compile TypeScript
npm run dev        # Run in development
npm run clean      # Clean build artifacts
npm run lint       # Run ESLint
npm test           # Run tests
```

---

## API Keys

### How to Obtain

- **Web of Science**: [Clarivate Developer Portal](https://developer.clarivate.com/)
- **Scopus**: [Elsevier Developer Portal](https://dev.elsevier.com/)
- **CORE**: [CORE API](https://core.ac.uk/services/api)
- **Microsoft Academic**: [Azure Cognitive Services](https://azure.microsoft.com/services/cognitive-services/)
- **Semantic Scholar**: [S2 API](https://www.semanticscholar.org/product/api)

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

### Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure `npm run build` passes

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io)
- Powered by [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Inspired by the academic research community

---

## Support

- 🐛 [Report Issues](https://github.com/yourusername/papermcp/issues)
- 💬 [Discussions](https://github.com/yourusername/papermcp/discussions)
- 📧 Contact: your@email.com

---

<div align="center">

**[⬆ back to top](#papermcp-server)**

Made with ❤️ for researchers

</div>
