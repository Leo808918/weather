/**
 * Vercel Serverless Function - 检查 API 状态
 */

export default async function handler(req, res) {
    // 处理 CORS 预检请求
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    const apiKey = process.env.DASHSCOPE_API_KEY;
    const hasKey = !!apiKey;

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
        configured: hasKey,
        message: hasKey ? 'API Key 已配置' : '未配置 DASHSCOPE_API_KEY 环境变量'
    });
}

