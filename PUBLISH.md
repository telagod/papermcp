# 发布到 npm 指南

## 前置要求

1. 注册 npm 账号：https://www.npmjs.com/signup
2. 验证邮箱

## 发布步骤

### 1. 登录 npm

```bash
npm login
```

输入：
- Username
- Password
- Email
- OTP (如果启用了 2FA)

### 2. 验证登录

```bash
npm whoami
```

### 3. 构建项目

```bash
npm run clean
npm run build
```

### 4. 发布

```bash
npm publish --access public
```

注意：由于包名是 `@telagod/papermcp`（scoped package），需要使用 `--access public` 参数。

### 5. 验证发布

访问：https://www.npmjs.com/package/@telagod/papermcp

### 6. 测试安装

```bash
npx @telagod/papermcp
```

## 更新版本

修改 `package.json` 中的 `version` 字段，然后重新发布：

```bash
# 补丁版本 (0.1.0 -> 0.1.1)
npm version patch

# 次版本 (0.1.0 -> 0.2.0)
npm version minor

# 主版本 (0.1.0 -> 1.0.0)
npm version major

# 发布
npm publish --access public
```

## 配置 .npmrc（可选）

如果需要配置 npm registry：

```bash
# 全局配置
npm config set registry https://registry.npmjs.org/

# 或在项目根目录创建 .npmrc
echo "registry=https://registry.npmjs.org/" > .npmrc
```

## 故障排除

### 包名已存在

如果包名被占用，需要修改 `package.json` 中的 `name` 字段。

### 权限错误

确保你有权限发布到 `@telagod` scope：
- 如果是个人 scope，需要在 npm 网站创建
- 如果是组织 scope，需要组织管理员授权

### 2FA 问题

如果启用了双因素认证，发布时需要提供 OTP：

```bash
npm publish --access public --otp=123456
```
