# 个人日志笔记网站

一个简洁的个人日志笔记应用，支持按日期记录笔记，并集成通义千问AI对话功能。

## 功能特性

- 📅 **日期日志**：按日期创建和管理个人日志
- ✏️ **笔记管理**：支持创建、编辑、删除日志
- 🤖 **AI对话**：集成通义千问大模型，可与AI进行对话
- 💾 **本地存储**：数据保存在浏览器本地，无需服务器
- 🔒 **安全设计**：API Key 从系统环境变量读取，不暴露在前端
- ☁️ **Vercel 部署**：支持部署到 Vercel，使用 Serverless Functions

## 使用方法

### 本地开发

1. **启动本地服务器**
```bash
cd C:\Users\Surface\Desktop\weather
python server.py
```

2. **打开浏览器访问**
```
http://localhost:8000
```

### Vercel 部署

1. **推送到 GitHub**
```bash
git push
```

2. **在 Vercel 设置环境变量**
   - 进入项目 Settings → Environment Variables
   - 添加环境变量：
     - **Key**: `DASHSCOPE_API_KEY`
     - **Value**: 你的通义千问 API Key
     - **Environment**: Production, Preview, Development（全选）
   - 点击 Save

3. **重新部署**
   - Vercel 会自动检测代码更新并重新部署
   - 或手动点击 Redeploy

4. **访问你的网站**
   - 访问 Vercel 提供的域名（如 `your-project.vercel.app`）

## 技术栈

- HTML5
- CSS3
- JavaScript (原生)
- Python (本地服务器 / Vercel Serverless Functions)
- LocalStorage (本地数据存储)
- 通义千问 API

## 文件结构

```
weather/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── app.js              # 日志功能逻辑
├── ai-chat.js          # AI对话功能（重构版）
├── server.py           # 本地代理服务器
├── api/                # Vercel Serverless Functions
│   ├── chat.py         # AI 对话 API
│   ├── check.py        # API 状态检查
│   └── entries.py      # 日志数据 API
├── vercel.json         # Vercel 配置文件
└── README.md           # 项目说明
```

## 环境变量配置

### 本地开发

**Windows PowerShell (临时)**:
```powershell
# 通义千问 API Key
$env:DASHSCOPE_API_KEY="你的通义千问API Key"

# DeepSeek API Key（可选）
$env:DEEPSEEK_API_KEY="你的DeepSeek API Key"

python server.py
```

**Windows 永久设置**:
1. 右键「此电脑」→「属性」→「高级系统设置」
2. 点击「环境变量」
3. 在「用户变量」中新建：
   - `DASHSCOPE_API_KEY` = 你的通义千问 API Key
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek API Key（可选）

### Vercel 部署

在 Vercel 项目设置中添加环境变量：
- **Key**: `DASHSCOPE_API_KEY`，**Value**: 你的通义千问 API Key
- **Key**: `DEEPSEEK_API_KEY`，**Value**: 你的 DeepSeek API Key（可选）

**注意**：至少需要配置一个 API Key 才能使用 AI 对话功能

## 工作原理

### 本地环境
```
浏览器 → 本地服务器 (localhost:8000) → 通义千问 API
                ↑
        读取 DASHSCOPE_API_KEY 环境变量
```

### Vercel 环境
```
浏览器 → Vercel Serverless Function (/api/chat) → 通义千问 API
                ↑
        读取 Vercel 环境变量 DASHSCOPE_API_KEY
```

## 版本记录

- v1.2.0 - 重构 AI 对话功能，修复所有已知问题，支持 Vercel 部署
- v1.1.0 - 安全升级：通过本地服务器代理 API 请求
- v1.0.0 - 初始版本，实现基础日志和AI对话功能

## 常见问题

### Q: 本地运行提示找不到 API Key？
A: 确保已设置环境变量 `DASHSCOPE_API_KEY`，然后重启服务器。

### Q: Vercel 上 AI 对话无法使用？
A: 
1. 检查是否在 Vercel 设置了环境变量 `DASHSCOPE_API_KEY`
2. 确保环境变量已应用到所有环境（Production, Preview, Development）
3. 重新部署项目

### Q: 如何查看 Vercel 部署日志？
A: 在 Vercel 控制台的 Deployments 页面，点击部署记录查看 Build Logs 和 Runtime Logs。

---
*项目创建日期：2024年12月*
