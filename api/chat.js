/**
 * Vercel Serverless Function - AI 对话 API
 * 转发请求到通义千问 API
 */

export default async function handler(req, res) {
    // 处理 CORS 预检请求
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    // 只允许 POST 请求
    if (req.method !== 'POST') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(405).json({
            error: {
                message: 'Method not allowed',
                code: 405
            }
        });
    }

    // 获取模型名称
    const model = req.body?.model || 'qwen-turbo';
    
    // 判断使用哪个 API
    let apiKey, apiUrl;
    if (model.startsWith('deepseek')) {
        // DeepSeek 模型
        apiKey = process.env.DEEPSEEK_API_KEY;
        apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        
        if (!apiKey) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.status(500).json({
                error: {
                    message: '服务器未配置 DeepSeek API Key，请在 Vercel 环境变量中设置 DEEPSEEK_API_KEY',
                    code: 500
                }
            });
        }
    } else {
        // 通义千问模型
        apiKey = process.env.DASHSCOPE_API_KEY;
        apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
        
        if (!apiKey) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.status(500).json({
                error: {
                    message: '服务器未配置 API Key，请在 Vercel 环境变量中设置 DASHSCOPE_API_KEY',
                    code: 500
                }
            });
        }
    }

    try {
        // 发送请求到相应的 API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.status(response.status).json({
                error: {
                    message: `API 请求失败: ${errorText}`,
                    code: response.status
                }
            });
        }

        const data = await response.json();
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json(data);

    } catch (error) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(500).json({
            error: {
                message: `服务器错误: ${error.message}`,
                code: 500
            }
        });
    }
}

