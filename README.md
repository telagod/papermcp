# PaperMCP

<div align="center">

[![npm version](https://img.shields.io/npm/v/@telagod/papermcp)](https://www.npmjs.com/package/@telagod/papermcp)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

**Search and access academic papers from 23+ sources through Model Context Protocol**

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## ❌ Without PaperMCP

- Manually visiting multiple academic databases
- Copy-pasting DOIs and paper IDs between tools
- Switching contexts to download PDFs
- No unified interface for paper search

## ✅ With PaperMCP

- **Single interface** for 23+ academic sources
- **Direct access** from Claude and other AI assistants
- **Automatic PDF download** and text extraction
- **Plugin system** for sensitive sources

---

## 🛠️ Installation

<details>
<summary><b>Install in Claude Desktop</b></summary>

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### Using npx (Recommended)

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

#### Using npm global install

```bash
npm install -g @telagod/papermcp
```

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "papermcp"
    }
  }
}
```

#### With API keys

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"],
      "env": {
        "SEMANTIC_SCHOLAR_API_KEY": "YOUR_KEY",
        "WOS_API_KEY": "YOUR_KEY",
        "SCOPUS_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Install in Cline</b></summary>

Add to Cline MCP settings:

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Zed</b></summary>

Add to `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Continue</b></summary>

Add to Continue config:

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Sourcegraph Cody</b></summary>

Add to Cody settings:

```json
{
  "cody.experimental.mcp": {
    "servers": {
      "papermcp": {
        "command": "npx",
        "args": ["-y", "@telagod/papermcp"]
      }
    }
  }
}
```

</details>

<details>
<summary><b>Install in Cursor</b></summary>

Add to Cursor MCP settings:

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Windsurf</b></summary>

Add to Windsurf config:

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Roo Cline</b></summary>

Add to Roo Cline settings:

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in OpenHands</b></summary>

Add to OpenHands config:

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Void</b></summary>

Add to Void settings:

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Claude Code</b></summary>

Use the `claude mcp add` command:

```bash
claude mcp add papermcp -- npx -y @telagod/papermcp
```

Or manually add to `~/.claude.json`:

```json
{
  "projects": {
    "/your/project/path": {
      "mcpServers": {
        "papermcp": {
          "command": "npx",
          "args": ["-y", "@telagod/papermcp"]
        }
      }
    }
  }
}
```

</details>

<details>
<summary><b>Install in Gemini CLI</b></summary>

Add to `~/.config/gemini-cli/settings.json`:

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Codex CLI</b></summary>

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.papermcp]
command = "npx"
args = ["-y", "@telagod/papermcp"]
```

</details>

<details>
<summary><b>Install in OpenCode</b></summary>

Add to `.opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "papermcp": {
      "type": "local",
      "command": ["npx", "-y", "@telagod/papermcp"],
      "enabled": true
    }
  }
}
```

</details>

<details>
<summary><b>Install in Crush CLI</b></summary>

Add to Crush config:

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"]
    }
  }
}
```

</details>

---

## 📚 Supported Platforms

### Core Platforms (16)

| Platform | ID | API Key | Features |
|----------|----|---------|---------|
| arXiv | `arxiv` | ❌ | Search, Download, Read |
| PubMed | `pubmed` | ❌ | Search, Lookup |
| PubMed Central | `pmc` | ❌ | Search, Download, Read |
| bioRxiv | `biorxiv` | ❌ | Search |
| medRxiv | `medrxiv` | ❌ | Search |
| Google Scholar | `google-scholar` | ❌ | Search |
| IACR ePrint | `iacr` | ❌ | Search, Download |
| Semantic Scholar | `semantic` | ⚠️ | Search, Lookup |
| CrossRef | `crossref` | ❌ | Search, Lookup |
| ACM Digital Library | `acm` | ❌ | Search |
| Web of Science | `wos` | ✅ | Search |
| Scopus | `scopus` | ✅ | Search |
| JSTOR | `jstor` | ❌ | Search |
| ResearchGate | `researchgate` | ❌ | Search |
| CORE | `core` | ✅ | Search |
| Microsoft Academic | `microsoft-academic` | ✅ | Search |

### Optional Plugins (7)

Enable via environment variables:

```bash
PLUGIN_SCI_HUB=true
PLUGIN_LIBGEN=true
PLUGIN_UNPAYWALL=true
PLUGIN_OA_BUTTON=true
PLUGIN_SCIENCE_DIRECT=true
PLUGIN_SPRINGER_LINK=true
PLUGIN_IEEE_XPLORE=true
```

> [!WARNING]
> Sci-Hub and LibGen plugins are disabled by default. Use responsibly and comply with local regulations.

---

## 🚀 Usage

### Available Tools (4 Unified Tools)

#### `recommend_platforms`
Get platform recommendations based on field

```typescript
{
  "query": "transformer neural network",
  "field": "computer-science"  // biomedical, physics, mathematics, cryptography, open-access, general
}
```

#### `search_papers`
Search for papers on specified platform

```typescript
{
  "platform": "arxiv",  // Use recommend_platforms to get suggestions
  "query": "machine learning",
  "limit": 10
}
```

#### `download_paper`
Download paper PDF from platform

```typescript
{
  "platform": "arxiv",
  "id": "2301.00001",
  "dir": "/path/to/save"
}
```

#### `read_paper`
Extract text from paper PDF

```typescript
{
  "platform": "pmc",
  "id": "PMC8123456",
  "dir": "/path/to/pdfs"
}
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Optional API keys for enhanced features
SEMANTIC_SCHOLAR_API_KEY=your-key
WOS_API_KEY=your-key
SCOPUS_API_KEY=your-key
CORE_API_KEY=your-key

# Plugin toggles (default: false)
PLUGIN_SCI_HUB=true              # No config needed
PLUGIN_LIBGEN=true               # No config needed
PLUGIN_UNPAYWALL=true            # Requires UNPAYWALL_EMAIL
PLUGIN_OA_BUTTON=true            # Optional OA_BUTTON_API_KEY
PLUGIN_SCIENCE_DIRECT=true       # Requires ELSEVIER_API_KEY
PLUGIN_SPRINGER_LINK=true        # No config needed
PLUGIN_IEEE_XPLORE=true          # No config needed

# Plugin API keys
UNPAYWALL_EMAIL=your@email.com           # Required for Unpaywall
ELSEVIER_API_KEY=your-key                # Required for ScienceDirect
OA_BUTTON_API_KEY=your-key               # Optional for Open Access Button
```

### Getting API Keys

| Platform | Link | Notes |
|----------|------|-------|
| **Semantic Scholar** | [Apply](https://www.semanticscholar.org/product/api) | Free, increases rate limit |
| **Web of Science** | [Apply](https://developer.clarivate.com/) | Requires institutional subscription |
| **Scopus** | [Apply](https://dev.elsevier.com/) | Requires institutional subscription |
| **CORE** | [Apply](https://core.ac.uk/services/api) | Free |
| **Unpaywall** | Any email | No registration needed |
| **ScienceDirect** | [Apply](https://dev.elsevier.com/) | Requires institutional subscription |
| **Open Access Button** | [Apply](https://openaccessbutton.org/account) | Optional, free |

---

## 🔧 Development

### Install from source

```bash
git clone https://github.com/telagod/papermcp.git
cd papermcp/ts
npm install
npm run build
npm run dev
```

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
└── dist/               # Compiled output
```

### Adding a Platform

```typescript
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';

class MyAdapter extends BasePlatformAdapter {
  constructor() {
    super('my-platform');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    // Implementation
  }
}

addAdapterFactory(() => new MyAdapter());
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with [Model Context Protocol](https://modelcontextprotocol.io) and [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

---

<div align="center">

**[⬆ back to top](#papermcp)**

Made with ❤️ for researchers

</div>
