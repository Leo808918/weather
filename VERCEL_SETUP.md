# Vercel 环境变量配置指南

## 方法 1：通过网页控制台（推荐）

### 步骤 1：登录 Vercel
访问 https://vercel.com/dashboard 并登录

### 步骤 2：进入项目设置
1. 在项目列表中找到你的项目（如 `weather` 或 `lbylog`）
2. 点击项目进入详情页
3. 点击顶部导航栏的 **Settings**

### 步骤 3：添加环境变量
1. 在左侧菜单找到 **Environment Variables**
2. 点击 **Add New** 按钮
3. 填写以下信息：
   ```
   Key: DASHSCOPE_API_KEY
   Value: [你的通义千问 API Key]
   Environment: 
     ☑ Production
     ☑ Preview  
     ☑ Development
   ```
4. 点击 **Save**

### 步骤 4：重新部署
1. 回到 **Deployments** 页面
2. 找到最新的部署记录
3. 点击右侧的 **...** 菜单
4. 选择 **Redeploy**
5. 等待部署完成（约 1-2 分钟）

### 步骤 5：验证
1. 访问你的 Vercel 域名
2. 打开浏览器控制台（F12）
3. 点击 AI 按钮测试对话功能
4. 如果还有错误，检查控制台的错误信息

---

## 方法 2：通过 Vercel CLI

如果你安装了 Vercel CLI：

```bash
# 安装 Vercel CLI（如果还没安装）
npm i -g vercel

# 登录
vercel login

# 在项目目录下设置环境变量
vercel env add DASHSCOPE_API_KEY

# 输入你的 API Key，然后选择环境（Production/Preview/Development）
```

---

## 如何获取通义千问 API Key

1. 访问阿里云 DashScope 控制台
2. 登录你的账号
3. 在 API Keys 页面创建或查看你的 API Key
4. 复制完整的 API Key（格式类似：`sk-xxxxxxxxxxxxx`）

---

## 常见问题

### Q: 设置环境变量后还是报错？
A: 
1. 确保环境变量已应用到所有环境（Production、Preview、Development）
2. **必须重新部署**才能生效
3. 检查 API Key 是否正确（没有多余空格）

### Q: 如何确认环境变量已设置？
A: 
1. 在 Vercel 控制台的 Environment Variables 页面查看
2. 或者在部署日志中查看（不会显示具体值，但会显示变量名）

### Q: 环境变量设置后多久生效？
A: 需要重新部署后立即生效，通常 1-2 分钟

---

## 验证配置是否成功

部署完成后，访问你的网站：
1. 打开浏览器控制台（F12）
2. 点击右上角的 AI 按钮
3. 如果看到 "API Key 已配置" 的提示，说明配置成功
4. 尝试发送一条消息测试

