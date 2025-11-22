# NPM_TOKEN 配置指南

## 1. 获取 npm Access Token

1. 登录 https://www.npmjs.com/
2. 点击头像 → **Access Tokens**
3. 点击 **Generate New Token** → **Classic Token**
4. 选择 **Automation** 类型
5. 复制生成的 token（格式：`npm_xxxxxxxxxxxx`）

## 2. 添加到 GitHub Secrets

1. 打开仓库：https://github.com/telagod/papermcp
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. Name: `NPM_TOKEN`
5. Secret: 粘贴你的 npm token
6. 点击 **Add secret**

## 3. 测试发布

推送一个新标签触发发布：

```bash
git tag v0.1.1
git push origin v0.1.1
```

或手动触发：
1. 进入 **Actions** 标签
2. 选择 **Publish Package** workflow
3. 点击 **Run workflow**

## 4. 验证发布

- npm: https://www.npmjs.com/package/@telagod/papermcp
- GitHub: https://github.com/telagod/papermcp/pkgs/npm/papermcp

## 注意事项

- npm token 类型必须是 **Automation**，不能是 **Publish**
- token 需要有发布权限
- 如果包名是 scoped (`@telagod/xxx`)，确保 npm 账号有该 scope 的权限
