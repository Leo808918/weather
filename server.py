"""
==================== 
本地代理服务器
====================

功能：
- 读取系统环境变量 DASHSCOPE_API_KEY
- 提供本地 API 端点，转发请求到通义千问
- 提供日志数据的持久化存储（保存到本地文件）
- 解决前端无法访问环境变量的问题

使用方法：
1. 确保已设置环境变量 DASHSCOPE_API_KEY
2. 双击运行此脚本，或在终端执行: python server.py
3. 打开浏览器访问 http://localhost:8000
"""

import os
import json
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

# ==================== 配置 ====================

# 服务器端口
PORT = 8000

# 通义千问 API 地址
QWEN_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"

# 数据存储文件路径
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
ENTRIES_FILE = os.path.join(DATA_DIR, 'entries.json')

# ==================== 数据存储函数 ====================

def ensure_data_dir():
    """确保数据目录存在"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print(f"📁 已创建数据目录: {DATA_DIR}")

def load_entries():
    """从文件加载日志数据"""
    ensure_data_dir()
    if os.path.exists(ENTRIES_FILE):
        try:
            with open(ENTRIES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []

def save_entries(entries):
    """保存日志数据到文件"""
    ensure_data_dir()
    with open(ENTRIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

# ==================== 请求处理器 ====================

class ProxyHandler(SimpleHTTPRequestHandler):
    """
    自定义请求处理器
    - 静态文件请求：直接返回文件
    - /api/chat 请求：转发到通义千问 API
    - /api/entries 请求：处理日志数据的增删改查
    """
    
    def do_OPTIONS(self):
        """处理 CORS 预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """处理 GET 请求"""
        if self.path == '/api/check':
            self.handle_check()
        elif self.path == '/api/entries':
            self.handle_get_entries()
        else:
            # 其他 GET 请求作为静态文件处理
            super().do_GET()
    
    def do_POST(self):
        """处理 POST 请求"""
        if self.path == '/api/chat':
            self.handle_chat()
        elif self.path == '/api/entries':
            self.handle_save_entries()
        else:
            self.send_error(404, 'Not Found')
    
    # ==================== 日志数据 API ====================
    
    def handle_get_entries(self):
        """获取所有日志数据"""
        try:
            entries = load_entries()
            self.send_json_response({'success': True, 'entries': entries})
        except Exception as e:
            self.send_error_response(500, f'读取数据失败: {str(e)}')
    
    def handle_save_entries(self):
        """保存日志数据"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            entries = data.get('entries', [])
            save_entries(entries)
            
            self.send_json_response({
                'success': True, 
                'message': '数据已保存',
                'count': len(entries)
            })
        except json.JSONDecodeError:
            self.send_error_response(400, '无效的 JSON 数据')
        except Exception as e:
            self.send_error_response(500, f'保存数据失败: {str(e)}')
    
    # ==================== AI 对话 API ====================
    
    def handle_check(self):
        """检查 API Key 是否已配置"""
        api_key = os.environ.get('DASHSCOPE_API_KEY', '')
        has_key = bool(api_key)
        
        self.send_json_response({
            'configured': has_key,
            'message': 'API Key 已配置' if has_key else '未找到 DASHSCOPE_API_KEY 环境变量'
        })
    
    def handle_chat(self):
        """处理聊天请求，转发到通义千问 API"""
        api_key = os.environ.get('DASHSCOPE_API_KEY', '')
        
        if not api_key:
            self.send_error_response(500, '未配置 DASHSCOPE_API_KEY 环境变量')
            return
        
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_body = json.loads(post_data.decode('utf-8'))
            
            req = urllib.request.Request(
                QWEN_API_URL,
                data=json.dumps(request_body).encode('utf-8'),
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {api_key}'
                }
            )
            
            with urllib.request.urlopen(req, timeout=60) as response:
                result = response.read().decode('utf-8')
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(result.encode('utf-8'))
            
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            self.send_error_response(e.code, f'API 请求失败: {error_body}')
        except urllib.error.URLError as e:
            self.send_error_response(500, f'网络错误: {str(e.reason)}')
        except json.JSONDecodeError:
            self.send_error_response(400, '无效的 JSON 请求')
        except Exception as e:
            self.send_error_response(500, f'服务器错误: {str(e)}')
    
    # ==================== 响应辅助函数 ====================
    
    def send_json_response(self, data):
        """发送 JSON 响应"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def send_error_response(self, code, message):
        """发送错误响应"""
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = json.dumps({
            'error': {
                'message': message,
                'code': code
            }
        })
        self.wfile.write(response.encode('utf-8'))
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {args[0]}")

# ==================== 启动服务器 ====================

def main():
    """主函数：启动服务器"""
    api_key = os.environ.get('DASHSCOPE_API_KEY', '')
    
    print("=" * 50)
    print("📝 个人日志笔记 - 本地服务器")
    print("=" * 50)
    
    if api_key:
        masked_key = api_key[:8] + '*' * (len(api_key) - 12) + api_key[-4:] if len(api_key) > 12 else '***'
        print(f"✅ API Key 已配置: {masked_key}")
    else:
        print("⚠️  警告: 未找到 DASHSCOPE_API_KEY 环境变量")
        print("   AI 对话功能将无法使用")
    
    # 检查数据文件
    ensure_data_dir()
    entries = load_entries()
    print(f"💾 数据存储: {ENTRIES_FILE}")
    print(f"📊 已有日志: {len(entries)} 篇")
    
    print("-" * 50)
    print(f"🌐 服务器地址: http://localhost:{PORT}")
    print(f"📂 静态文件目录: {os.getcwd()}")
    print("-" * 50)
    print("按 Ctrl+C 停止服务器")
    print("=" * 50)
    
    server = HTTPServer(('localhost', PORT), ProxyHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        server.shutdown()

if __name__ == '__main__':
    main()
