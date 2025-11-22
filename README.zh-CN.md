# PaperMCP 服务器

<div align="center">

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.18-brightgreen)](https://nodejs.org)

强大的模型上下文协议（MCP）服务器，支持从 23+ 个学术来源搜索和访问论文。

[English](README.md) | 简体中文

[功能特性](#功能特性) • [安装](#安装) • [使用](#使用) • [支持平台](#支持平台) • [贡献](#贡献)

</div>

---

## 概述

PaperMCP 通过模型上下文协议提供对多个平台学术论文的统一访问。使用 TypeScript 构建，专为 Claude Desktop 和其他 MCP 客户端无缝集成而设计。

### 功能特性

- 🔍 **23+ 学术来源** - arXiv、PubMed、Scopus、Web of Science 等
- 🔌 **插件架构** - 敏感来源（Sci-Hub、LibGen）作为可选插件
- 📄 **全文访问** - 下载并提取 PDF 文本
- 🚀 **高性能** - 速率限制、缓存和异步操作
- 🛡️ **类型安全** - 完整的 TypeScript 严格模式实现
- 🎯 **MCP 原生** - 基于官方 MCP TypeScript SDK 构建

---

## 安装

### 前置要求

- Node.js >= 18.18
- npm 或 pnpm

### 使用 npx 快速开始

```bash
# 使用 npx 直接运行（推荐）
npx @telagod/papermcp
```

### 从 npm 安装

```bash
# 全局安装
npm install -g @telagod/papermcp

# 或本地安装
npm install @telagod/papermcp
```

### 从源码安装

```bash
# 克隆仓库
git clone https://github.com/telagod/papermcp.git
cd papermcp/ts

# 安装依赖
npm install

# 构建
npm run build

# 运行
npm run dev
```

### Claude Desktop 配置

添加到 Claude Desktop 配置文件（macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "paper-search": {
      "command": "npx",
      "args": ["papermcp"],
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

## 支持平台

### 核心平台（16个）

| 平台 | ID | 需要 API 密钥 | 状态 |
|------|----|--------------------|--------|
| arXiv | `arxiv` | 否 | ✅ |
| PubMed | `pubmed` | 否 | ✅ |
| PubMed Central | `pmc` | 否 | ✅ |
| bioRxiv | `biorxiv` | 否 | ✅ |
| medRxiv | `medrxiv` | 否 | ✅ |
| Google Scholar | `google-scholar` | 否 | ✅ |
| IACR ePrint | `iacr` | 否 | ✅ |
| Semantic Scholar | `semantic` | 可选 | ✅ |
| CrossRef | `crossref` | 否 | ✅ |
| ACM 数字图书馆 | `acm` | 否 | ✅ |
| Web of Science | `wos` | 是 | ✅ |
| Scopus | `scopus` | 是 | ✅ |
| JSTOR | `jstor` | 否 | ✅ |
| ResearchGate | `researchgate` | 否 | ✅ |
| CORE | `core` | 是 | ✅ |
| Microsoft Academic | `microsoft-academic` | 是 | ✅ |

### 可选插件（7个）

通过环境变量启用：

| 插件 | 环境变量 | 说明 |
|------|---------|------|
| Sci-Hub | `PLUGIN_SCI_HUB=true` | 通过 Sci-Hub 访问论文 |
| LibGen | `PLUGIN_LIBGEN=true` | Library Genesis 集成 |
| Unpaywall | `PLUGIN_UNPAYWALL=true` | 开放获取查找器（需要 `UNPAYWALL_EMAIL`）|
| Open Access Button | `PLUGIN_OA_BUTTON=true` | OA 发现服务 |
| ScienceDirect | `PLUGIN_SCIENCE_DIRECT=true` | Elsevier 论文 |
| Springer Link | `PLUGIN_SPRINGER_LINK=true` | Springer 论文 |
| IEEE Xplore | `PLUGIN_IEEE_XPLORE=true` | IEEE 论文 |

> ⚠️ **法律声明**：Sci-Hub 和 LibGen 插件默认禁用。请负责任地使用并遵守当地法规。

---

## 使用

### MCP 工具

服务器提供以下 MCP 工具：

#### `search_papers`
跨平台搜索论文。

```typescript
{
  "platform": "arxiv",
  "query": "machine learning",
  "limit": 10
}
```

#### `download_paper`
下载论文 PDF。

```typescript
{
  "platform": "arxiv",
  "id": "2301.00001",
  "directory": "/path/to/save"
}
```

#### `read_paper`
从论文中提取文本。

```typescript
{
  "platform": "arxiv",
  "id": "2301.00001",
  "directory": "/path/to/pdfs"
}
```

#### `lookup_paper`
通过 ID 获取论文元数据。

```typescript
{
  "platform": "crossref",
  "id": "10.1234/example"
}
```

---

## 配置

### 环境变量

#### 特定平台所需

```bash
# Web of Science
WOS_API_KEY=your-key

# Scopus
SCOPUS_API_KEY=your-key

# CORE
CORE_API_KEY=your-key

# Microsoft Academic
MICROSOFT_ACADEMIC_API_KEY=your-key

# Unpaywall（如果启用插件）
UNPAYWALL_EMAIL=your@email.com
```

#### 可选

```bash
# Semantic Scholar（增强功能）
SEMANTIC_SCHOLAR_API_KEY=your-key

# 插件开关
PLUGIN_SCI_HUB=false
PLUGIN_LIBGEN=false
PLUGIN_UNPAYWALL=false
PLUGIN_OA_BUTTON=false
PLUGIN_SCIENCE_DIRECT=false
PLUGIN_SPRINGER_LINK=false
PLUGIN_IEEE_XPLORE=false

# 自定义端点
SCIHUB_BASE_URL=https://sci-hub.se
LIBGEN_BASE_URL=https://libgen.is
```

---

## 开发

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
├── dist/               # 编译输出
└── package.json
```

### 添加新平台

1. 在 `src/platforms/` 创建适配器：

```typescript
import { BasePlatformAdapter } from './baseAdapter.js';

class MyAdapter extends BasePlatformAdapter {
  constructor() {
    super('my-platform');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    // 实现
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    // 实现
  }

  async read(id: string, dir: string): Promise<PaperText> {
    // 实现
  }
}

addAdapterFactory(() => new MyAdapter());
```

2. 添加平台 ID 到 `src/core/types.ts`
3. 在 `src/platforms/index.ts` 注册

### 脚本

```bash
npm run build      # 编译 TypeScript
npm run dev        # 开发模式运行
npm run clean      # 清理构建产物
npm run lint       # 运行 ESLint
npm test           # 运行测试
```

---

## API 密钥

### 如何获取

- **Web of Science**: [Clarivate 开发者门户](https://developer.clarivate.com/)
- **Scopus**: [Elsevier 开发者门户](https://dev.elsevier.com/)
- **CORE**: [CORE API](https://core.ac.uk/services/api)
- **Microsoft Academic**: [Azure 认知服务](https://azure.microsoft.com/services/cognitive-services/)
- **Semantic Scholar**: [S2 API](https://www.semanticscholar.org/product/api)

---

## 贡献

欢迎贡献！请：

1. Fork 仓库
2. 创建功能分支（`git checkout -b feature/amazing`）
3. 提交更改（`git commit -m 'Add amazing feature'`）
4. 推送到分支（`git push origin feature/amazing`）
5. 开启 Pull Request

### 指南

- 遵循现有代码风格
- 为新功能添加测试
- 更新文档
- 确保 `npm run build` 通过

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

---

## 致谢

- 基于 [Model Context Protocol](https://modelcontextprotocol.io) 构建
- 由 [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) 驱动
- 受学术研究社区启发

---

## 支持

- 🐛 [报告问题](https://github.com/telagod/papermcp/issues)
- 💬 [讨论](https://github.com/telagod/papermcp/discussions)
- 📧 联系：your@email.com

---

<div align="center">

**[⬆ 回到顶部](#papermcp-服务器)**

用 ❤️ 为研究者打造

</div>
