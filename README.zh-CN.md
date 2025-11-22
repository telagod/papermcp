# PaperMCP

<div align="center">

[![npm version](https://img.shields.io/npm/v/@telagod/papermcp)](https://www.npmjs.com/package/@telagod/papermcp)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

**通过模型上下文协议搜索和访问 23+ 个学术来源的论文**

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## ❌ 没有 PaperMCP

- 手动访问多个学术数据库
- 在工具之间复制粘贴 DOI 和论文 ID
- 切换上下文下载 PDF
- 没有统一的论文搜索界面

## ✅ 有了 PaperMCP

- **单一界面**访问 23+ 个学术来源
- 从 Claude 和其他 AI 助手**直接访问**
- **自动下载 PDF** 并提取文本
- 敏感来源的**插件系统**

---

## 🛠️ 安装

<details>
<summary><b>在 Claude Desktop 中安装</b></summary>

添加到 Claude Desktop 配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### 使用 npx（推荐）

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

#### 使用 npm 全局安装

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

#### 配置 API 密钥

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
<summary><b>在 Cline 中安装</b></summary>

添加到 Cline MCP 设置：

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
<summary><b>在 Zed 中安装</b></summary>

添加到 `~/.config/zed/settings.json`：

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
<summary><b>在 Continue 中安装</b></summary>

添加到 Continue 配置：

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
<summary><b>在 Sourcegraph Cody 中安装</b></summary>

添加到 Cody 设置：

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
<summary><b>在 Cursor 中安装</b></summary>

添加到 Cursor MCP 设置：

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
<summary><b>在 Windsurf 中安装</b></summary>

添加到 Windsurf 配置：

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
<summary><b>在 Roo Cline 中安装</b></summary>

添加到 Roo Cline 设置：

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
<summary><b>在 OpenHands 中安装</b></summary>

添加到 OpenHands 配置：

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
<summary><b>在 Void 中安装</b></summary>

添加到 Void 设置：

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
<summary><b>在 Claude Code 中安装</b></summary>

使用 `claude mcp add` 命令：

```bash
claude mcp add papermcp -- npx -y @telagod/papermcp
```

或手动添加到 `~/.claude.json`：

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
<summary><b>在 Gemini CLI 中安装</b></summary>

添加到 `~/.config/gemini-cli/settings.json`：

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
<summary><b>在 Codex CLI 中安装</b></summary>

添加到 `~/.codex/config.toml`：

```toml
[mcp_servers.papermcp]
command = "npx"
args = ["-y", "@telagod/papermcp"]
```

</details>

<details>
<summary><b>在 OpenCode 中安装</b></summary>

添加到 `.opencode.json`：

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
<summary><b>在 Crush CLI 中安装</b></summary>

添加到 Crush 配置：

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

## 📚 支持的平台

### 核心平台（16 个）

| 平台 | ID | API 密钥 | 功能 |
|------|----|---------|------|
| arXiv | `arxiv` | ❌ | 搜索、下载、阅读 |
| PubMed | `pubmed` | ❌ | 搜索、查询 |
| PubMed Central | `pmc` | ❌ | 搜索、下载、阅读 |
| bioRxiv | `biorxiv` | ❌ | 搜索 |
| medRxiv | `medrxiv` | ❌ | 搜索 |
| Google Scholar | `google-scholar` | ❌ | 搜索 |
| IACR ePrint | `iacr` | ❌ | 搜索、下载 |
| Semantic Scholar | `semantic` | ⚠️ | 搜索、查询 |
| CrossRef | `crossref` | ❌ | 搜索、查询 |
| ACM 数字图书馆 | `acm` | ❌ | 搜索 |
| Web of Science | `wos` | ✅ | 搜索 |
| Scopus | `scopus` | ✅ | 搜索 |
| JSTOR | `jstor` | ❌ | 搜索 |
| ResearchGate | `researchgate` | ❌ | 搜索 |
| CORE | `core` | ✅ | 搜索 |
| Microsoft Academic | `microsoft-academic` | ✅ | 搜索 |

### 可选插件（7 个）

通过环境变量启用：

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
> Sci-Hub 和 LibGen 插件默认禁用。请负责任地使用并遵守当地法规。

---

## 🚀 使用

### 可用工具（4个统一工具）

#### `recommend_platforms`
根据领域获取平台推荐

```typescript
{
  "query": "transformer neural network",
  "field": "computer-science"  // biomedical, physics, mathematics, cryptography, open-access, general
}
```

#### `search_papers`
在指定平台搜索论文

```typescript
{
  "platform": "arxiv",  // 使用 recommend_platforms 获取推荐
  "query": "machine learning",
  "limit": 10
}
```

#### `download_paper`
从平台下载论文 PDF

```typescript
{
  "platform": "arxiv",
  "id": "2301.00001",
  "dir": "/path/to/save"
}
```

#### `read_paper`
提取论文 PDF 文本

```typescript
{
  "platform": "pmc",
  "id": "PMC8123456",
  "dir": "/path/to/pdfs"
}
```

---

## ⚙️ 配置

### 环境变量

```bash
# 增强功能的可选 API 密钥
SEMANTIC_SCHOLAR_API_KEY=your-key
WOS_API_KEY=your-key
SCOPUS_API_KEY=your-key
CORE_API_KEY=your-key

# 插件开关（默认：false）
PLUGIN_SCI_HUB=true              # 无需配置
PLUGIN_LIBGEN=true               # 无需配置
PLUGIN_UNPAYWALL=true            # 需要 UNPAYWALL_EMAIL
PLUGIN_OA_BUTTON=true            # 可选 OA_BUTTON_API_KEY
PLUGIN_SCIENCE_DIRECT=true       # 需要 ELSEVIER_API_KEY
PLUGIN_SPRINGER_LINK=true        # 无需配置
PLUGIN_IEEE_XPLORE=true          # 无需配置

# 插件 API 密钥
UNPAYWALL_EMAIL=your@email.com           # Unpaywall 必需
ELSEVIER_API_KEY=your-key                # ScienceDirect 必需
OA_BUTTON_API_KEY=your-key               # Open Access Button 可选
```

### 获取 API 密钥

| 平台 | 链接 | 说明 |
|------|------|------|
| **Semantic Scholar** | [申请](https://www.semanticscholar.org/product/api) | 免费，提高限额 |
| **Web of Science** | [申请](https://developer.clarivate.com/) | 需要机构订阅 |
| **Scopus** | [申请](https://dev.elsevier.com/) | 需要机构订阅 |
| **CORE** | [申请](https://core.ac.uk/services/api) | 免费 |
| **Unpaywall** | 任意邮箱 | 无需注册 |
| **ScienceDirect** | [申请](https://dev.elsevier.com/) | 需要机构订阅 |
| **Open Access Button** | [申请](https://openaccessbutton.org/account) | 可选，免费 |

---

## 🔧 开发

### 从源码安装

```bash
git clone https://github.com/telagod/papermcp.git
cd papermcp/ts
npm install
npm run build
npm run dev
```

### 项目结构

```
ts/
├── src/
│   ├── core/           # 核心类型和配置
│   ├── platforms/      # 平台适配器
│   ├── plugins/        # 可选插件
│   ├── services/       # 注册表和工具
│   ├── server/         # MCP 服务器
│   └── utils/          # HTTP、日志
└── dist/               # 编译输出
```

### 添加新平台

```typescript
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';

class MyAdapter extends BasePlatformAdapter {
  constructor() {
    super('my-platform');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    // 实现
  }
}

addAdapterFactory(() => new MyAdapter());
```

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)。

---

## 🙏 致谢

基于 [Model Context Protocol](https://modelcontextprotocol.io) 和 [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) 构建

---

<div align="center">

**[⬆ 回到顶部](#papermcp)**

用 ❤️ 为研究者打造

</div>
