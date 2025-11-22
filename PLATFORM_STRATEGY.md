# 平台策略分析

## 平台分级

### Tier 1: 高可用性（无限制/宽松限制）
| 平台 | API | 限流 | 稳定性 | 覆盖范围 | 推荐场景 |
|------|-----|------|--------|----------|----------|
| **Semantic Scholar** | ✅ 官方 | 宽松 | ⭐⭐⭐⭐⭐ | 全学科 | 首选搜索 |
| **CrossRef** | ✅ 官方 | 宽松 | ⭐⭐⭐⭐⭐ | DOI 元数据 | 元数据查询 |
| **PubMed Central** | ✅ 官方 | 宽松 | ⭐⭐⭐⭐⭐ | 生物医学 | 生物医学首选 |
| **arXiv** | ✅ 官方 | 中等 | ⭐⭐⭐⭐ | 物理/CS/数学 | 预印本首选 |

### Tier 2: 中等可用性（有限制但可用）
| 平台 | API | 限流 | 稳定性 | 覆盖范围 | 注意事项 |
|------|-----|------|--------|----------|----------|
| **PubMed** | ✅ 官方 | 中等 | ⭐⭐⭐⭐ | 生物医学 | 需要 API key 提高限额 |
| **bioRxiv/medRxiv** | ❌ 爬虫 | 中等 | ⭐⭐⭐ | 生物医学预印本 | 需要控制频率 |
| **IACR** | ✅ 官方 | 宽松 | ⭐⭐⭐⭐ | 密码学 | 垂直领域 |

### Tier 3: 低可用性（严格限制/反爬）
| 平台 | API | 限流 | 稳定性 | 覆盖范围 | 注意事项 |
|------|-----|------|--------|----------|----------|
| **Google Scholar** | ❌ 爬虫 | 严格 | ⭐⭐ | 全学科 | 高风险，易封禁 |
| **ResearchGate** | ❌ 爬虫 | 严格 | ⭐⭐ | 全学科 | 需要登录 |
| **JSTOR** | ❌ 爬虫 | 严格 | ⭐⭐ | 人文社科 | 付费墙 |
| **ACM** | ❌ 爬虫 | 中等 | ⭐⭐⭐ | 计算机 | 付费墙 |

### Tier 4: 需要认证（API Key 必需）
| 平台 | API | 限流 | 稳定性 | 覆盖范围 | 注意事项 |
|------|-----|------|--------|----------|----------|
| **Web of Science** | ✅ 官方 | 严格 | ⭐⭐⭐⭐⭐ | 全学科 | 需要机构订阅 |
| **Scopus** | ✅ 官方 | 严格 | ⭐⭐⭐⭐⭐ | 全学科 | 需要机构订阅 |
| **CORE** | ✅ 官方 | 中等 | ⭐⭐⭐⭐ | 开放获取 | 免费 API key |

## 推荐策略

### 1. 通用学术搜索
```
优先级: Semantic Scholar → CrossRef → arXiv → Google Scholar(备用)
```

### 2. 生物医学领域
```
优先级: PubMed Central → PubMed → bioRxiv/medRxiv
```

### 3. 计算机/物理/数学
```
优先级: arXiv → Semantic Scholar → ACM
```

### 4. 密码学
```
优先级: IACR → arXiv
```

### 5. 开放获取
```
优先级: PMC → CORE → Semantic Scholar
```

## 限流策略

### 全局配置
```env
HTTP_MAX_CONCURRENT=2        # 最大并发数
HTTP_MIN_INTERVAL_MS=1000    # 最小请求间隔
HTTP_RETRY_COUNT=5           # 重试次数
HTTP_TIMEOUT_MS=30000        # 超时时间
```

### 平台特定配置（建议）
```typescript
const platformLimits = {
  // Tier 1: 宽松
  'semantic': { concurrent: 3, interval: 500 },
  'crossref': { concurrent: 3, interval: 500 },
  'pmc': { concurrent: 3, interval: 500 },
  'arxiv': { concurrent: 2, interval: 1000 },

  // Tier 2: 中等
  'pubmed': { concurrent: 2, interval: 1000 },
  'biorxiv': { concurrent: 1, interval: 2000 },
  'medrxiv': { concurrent: 1, interval: 2000 },
  'iacr': { concurrent: 2, interval: 1000 },

  // Tier 3: 严格
  'google-scholar': { concurrent: 1, interval: 5000 },
  'researchgate': { concurrent: 1, interval: 3000 },
  'jstor': { concurrent: 1, interval: 3000 },
  'acm': { concurrent: 1, interval: 2000 },

  // Tier 4: API
  'wos': { concurrent: 2, interval: 1000 },
  'scopus': { concurrent: 2, interval: 1000 },
  'core': { concurrent: 2, interval: 1000 },
};
```

## 故障转移策略

### 1. 自动降级
```
429 Too Many Requests → 等待 60 秒后重试
503 Service Unavailable → 切换到备用平台
```

### 2. 健康检查
```typescript
// 每个平台维护健康状态
interface PlatformHealth {
  available: boolean;
  lastError: Date | null;
  errorCount: number;
  cooldownUntil: Date | null;
}
```

### 3. 熔断机制
```
连续失败 5 次 → 熔断 5 分钟
连续失败 10 次 → 熔断 30 分钟
```

## 用户建议

### 最佳实践
1. **优先使用 Tier 1 平台**（Semantic Scholar, CrossRef, PMC）
2. **避免频繁使用 Google Scholar**（易触发限流）
3. **配置 API Keys** 提高 PubMed, CORE 等平台限额
4. **批量查询时增加间隔**（设置 `HTTP_MIN_INTERVAL_MS=2000`）
5. **使用缓存**避免重复请求

### 环境变量配置示例
```bash
# 保守配置（高稳定性）
HTTP_MAX_CONCURRENT=1
HTTP_MIN_INTERVAL_MS=2000
HTTP_RETRY_COUNT=3

# 平衡配置（推荐）
HTTP_MAX_CONCURRENT=2
HTTP_MIN_INTERVAL_MS=1000
HTTP_RETRY_COUNT=5

# 激进配置（高性能，高风险）
HTTP_MAX_CONCURRENT=4
HTTP_MIN_INTERVAL_MS=500
HTTP_RETRY_COUNT=3
```

## 监控指标

### 关键指标
- **成功率**: > 95%
- **平均响应时间**: < 5s
- **429 错误率**: < 1%
- **超时率**: < 5%

### 告警阈值
- 单平台连续失败 > 5 次
- 全局成功率 < 90%
- 429 错误率 > 5%
