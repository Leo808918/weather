"""
Vercel Serverless Function - 日志数据 API
注意：Vercel Serverless Function 是无状态的，无法持久存储数据
在 Vercel 上运行时，日志数据只能存储在浏览器 localStorage 中
"""

import json

def handler(request):
    """
    处理日志数据请求
    在 Vercel 环境下，返回提示信息，让前端使用 localStorage
    """
    # 获取请求方法
    method = request.get('method', 'GET')
    
    # 处理 CORS 预检请求
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
    
    # 返回提示信息，让前端使用 localStorage
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps({
            'success': False,
            'useLocalStorage': True,
            'message': 'Vercel 环境下请使用本地存储'
        })
    }
