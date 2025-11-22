# 配置指南

## 快速开始

### 默认配置（推荐）
无需任何配置即可使用，默认使用保守的限流策略。

### 环境变量配置

在 Claude Desktop 配置中添加环境变量：

```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"],
      "env": {
        "HTTP_MAX_CONCURRENT": "2",
        "HTTP_MIN_INTERVAL_MS": "1000"
      }
    }
  }
}
```

## 配置选项

### HTTP 配置

| 变量 | 默认值 | 说明 | 推荐值 |
|------|--------|------|--------|
| `HTTP_TIMEOUT_MS` | 30000 | 请求超时（毫秒） | 30000-60000 |
| `HTTP_RETRY_COUNT` | 5 | 重试次数 | 3-5 |
| `HTTP_MAX_CONCURRENT` | 2 | 最大并发请求数 | 1-3 |
| `HTTP_MIN_INTERVAL_MS` | 1000 | 请求最小间隔（毫秒） | 1000-2000 |

### 插件配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PLUGIN_SCI_HUB` | false | 启用 Sci-Hub |
| `PLUGIN_LIBGEN` | false | 启用 LibGen |
| `PLUGIN_UNPAYWALL` | false | 启用 Unpaywall |
| `PLUGIN_OA_BUTTON` | false | 启用 Open Access Button |

### API Keys（可选）

| 变量 | 平台 | 获取方式 |
|------|------|----------|
| `SEMANTIC_SCHOLAR_API_KEY` | Semantic Scholar | [申请](https://www.semanticscholar.org/product/api) |
| `WOS_API_KEY` | Web of Science | [申请](https://developer.clarivate.com/) |
| `SCOPUS_API_KEY` | Scopus | [申请](https://dev.elsevier.com/) |
| `CORE_API_KEY` | CORE | [申请](https://core.ac.uk/services/api) |
| `UNPAYWALL_EMAIL` | Unpaywall | 任意邮箱 |

## 使用场景配置

### 场景 1: 高稳定性（推荐新手）
```json
{
  "env": {
    "HTTP_MAX_CONCURRENT": "1",
    "HTTP_MIN_INTERVAL_MS": "2000",
    "HTTP_RETRY_COUNT": "3"
  }
}
```
- 最低风险
- 速度较慢
- 适合：偶尔查询

### 场景 2: 平衡模式（默认）
```json
{
  "env": {
    "HTTP_MAX_CONCURRENT": "2",
    "HTTP_MIN_INTERVAL_MS": "1000",
    "HTTP_RETRY_COUNT": "5"
  }
}
```
- 平衡性能和稳定性
- 适合：日常使用

### 场景 3: 高性能（有风险）
```json
{
  "env": {
    "HTTP_MAX_CONCURRENT": "4",
    "HTTP_MIN_INTERVAL_MS": "500",
    "HTTP_RETRY_COUNT": "3"
  }
}
```
- 最快速度
- 可能触发限流
- 适合：批量查询，配合 API keys

## 平台选择建议

### 按学科领域

**生物医学**
```
推荐: PubMed Central → PubMed → bioRxiv
```

**计算机科学**
```
推荐: arXiv → Semantic Scholar → ACM
```

**物理/数学**
```
推荐: arXiv → Semantic Scholar
```

**密码学**
```
推荐: IACR → arXiv
```

**通用学术**
```
推荐: Semantic Scholar → CrossRef → arXiv
```

### 按可用性

**高可用性（无需 API key）**
- Semantic Scholar ⭐⭐⭐⭐⭐
- CrossRef ⭐⭐⭐⭐⭐
- PubMed Central ⭐⭐⭐⭐⭐
- arXiv ⭐⭐⭐⭐

**避免频繁使用**
- Google Scholar（易封禁）
- ResearchGate（需登录）
- JSTOR（付费墙）

## 故障排查

### 429 Too Many Requests
```
解决方案：
1. 增加 HTTP_MIN_INTERVAL_MS 到 2000
2. 减少 HTTP_MAX_CONCURRENT 到 1
3. 等待 5-10 分钟后重试
4. 切换到其他平台
```

### 超时错误
```
解决方案：
1. 增加 HTTP_TIMEOUT_MS 到 60000
2. 检查网络连接
3. 尝试其他平台
```

### 频繁失败
```
解决方案：
1. 使用 Tier 1 平台（Semantic Scholar, CrossRef）
2. 配置 API keys
3. 降低并发和增加间隔
```

## 完整配置示例

### 基础配置
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

### 高级配置（带 API keys）
```json
{
  "mcpServers": {
    "papermcp": {
      "command": "npx",
      "args": ["-y", "@telagod/papermcp"],
      "env": {
        "HTTP_MAX_CONCURRENT": "3",
        "HTTP_MIN_INTERVAL_MS": "800",
        "SEMANTIC_SCHOLAR_API_KEY": "your-key",
        "CORE_API_KEY": "your-key",
        "UNPAYWALL_EMAIL": "your@email.com",
        "PLUGIN_UNPAYWALL": "true"
      }
    }
  }
}
```

## 性能优化建议

1. **优先使用 Tier 1 平台**
   - Semantic Scholar（全学科）
   - CrossRef（元数据）
   - PubMed Central（生物医学）

2. **配置 API Keys**
   - 提高限额
   - 更稳定的服务

3. **合理设置并发**
   - 单平台查询：concurrent=1
   - 多平台查询：concurrent=2-3

4. **使用缓存**
   - 避免重复下载
   - 默认缓存在 `./downloads`

5. **批量查询策略**
   - 增加间隔到 2000ms
   - 分批处理
   - 使用 Tier 1 平台
