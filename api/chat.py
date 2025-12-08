"""
Vercel Serverless Function - AI 对话 API
转发请求到通义千问 API
"""

import os
import json
import urllib.request
import urllib.error

def handler(request):
    """
    处理 AI 对话请求
    Vercel Serverless Function 入口
    """
    # Vercel 传递的 request 是一个字典
    method = request.get('method', 'GET')
    body = request.get('body', '')
    
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
    
    # 只允许 POST 请求
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': {'message': 'Method not allowed', 'code': 405}})
        }
    
    # 获取环境变量中的 API Key
    api_key = os.environ.get('DASHSCOPE_API_KEY', '')
    
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'message': '服务器未配置 API Key，请在 Vercel 环境变量中设置 DASHSCOPE_API_KEY',
                    'code': 500
                }
            })
        }
    
    try:
        # 解析请求体
        if isinstance(body, bytes):
            body = body.decode('utf-8')
        if isinstance(body, str):
            request_data = json.loads(body)
        else:
            request_data = body if body else {}
        
        # 通义千问 API 地址
        api_url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        
        # 构建请求
        req = urllib.request.Request(
            api_url,
            data=json.dumps(request_data).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
        )
        
        # 发送请求
        with urllib.request.urlopen(req, timeout=60) as response:
            result = response.read().decode('utf-8')
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': result
        }
        
    except urllib.error.HTTPError as e:
        try:
            error_body = e.read().decode('utf-8')
        except:
            error_body = str(e)
        return {
            'statusCode': e.code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'message': f'API 请求失败: {error_body}',
                    'code': e.code
                }
            })
        }
    except json.JSONDecodeError as e:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'message': f'无效的 JSON 数据: {str(e)}',
                    'code': 400
                }
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'message': f'服务器错误: {str(e)}',
                    'code': 500
                }
            })
        }
