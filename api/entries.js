/**
 * Vercel Serverless Function - 日志数据 API
 * 注意：Vercel Serverless Function 是无状态的，无法持久存储数据
 * 在 Vercel 上运行时，日志数据只能存储在浏览器 localStorage 中
 */

export default async function handler(req, res) {
    // 处理 CORS 预检请求
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
        success: false,
        useLocalStorage: true,
        message: 'Vercel 环境下请使用本地存储'
    });
}

