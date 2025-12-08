"""
Vercel Serverless Function - 检查 API 状态
"""

import os
import json

def handler(request):
    """
    检查 API Key 是否已配置
    """
    # 处理 CORS 预检请求
    method = request.get('method', 'GET')
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    api_key = os.environ.get('DASHSCOPE_API_KEY', '')
    has_key = bool(api_key)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'configured': has_key,
            'message': 'API Key 已配置' if has_key else '未配置 DASHSCOPE_API_KEY 环境变量'
        })
    }
