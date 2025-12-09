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

    const qwenKey = process.env.DASHSCOPE_API_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    
    const hasQwen = !!qwenKey;
    const hasDeepseek = !!deepseekKey;
    const hasKey = hasQwen || hasDeepseek;
    
    let message;
    if (hasQwen && hasDeepseek) {
        message = '通义千问和 DeepSeek API Key 已配置';
    } else if (hasQwen) {
        message = '通义千问 API Key 已配置（DeepSeek 未配置）';
    } else if (hasDeepseek) {
        message = 'DeepSeek API Key 已配置（通义千问未配置）';
    } else {
        message = '未配置 API Key，请设置 DASHSCOPE_API_KEY 或 DEEPSEEK_API_KEY';
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
        configured: hasKey,
        message: message,
        qwen_configured: hasQwen,
        deepseek_configured: hasDeepseek
    });
}

