/**
 * ==================== 
 * AI对话功能模块（重构版）
 * ====================
 * 
 * 功能：
 * - 通过本地服务器或 Vercel Serverless Function 调用通义千问API
 * - 管理对话历史
 * - 处理设置弹窗
 */

(function() {
    'use strict';
    
    // ==================== 配置 ====================
    
    // 检测运行环境
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE = isLocalDev ? 'http://localhost:8000' : '';
    
    // ==================== 全局变量 ====================
    
    let chatHistory = [];
    let apiConfig = { model: 'qwen-turbo' };
    let apiKeyConfigured = false;
    
    // DOM 元素引用（延迟初始化）
    let elements = {};
    
    // ==================== DOM 元素获取 ====================
    
    function getElements() {
        if (Object.keys(elements).length === 0) {
            elements = {
                aiSidebar: document.getElementById('aiSidebar'),
                aiMessages: document.getElementById('aiMessages'),
                aiInput: document.getElementById('aiInput'),
                sendAIBtn: document.getElementById('sendAI'),
                toggleAIBtn: document.getElementById('toggleAI'),
                closeAIBtn: document.getElementById('closeAI'),
                settingsModal: document.getElementById('settingsModal'),
                openSettingsBtn: document.getElementById('openSettings'),
                closeSettingsBtn: document.getElementById('closeSettings'),
                saveSettingsBtn: document.getElementById('saveSettings'),
                apiKeyStatus: document.getElementById('apiKeyStatus'),
                modelSelect: document.getElementById('modelSelect'),
                overlay: document.getElementById('overlay')
            };
        }
        return elements;
    }
    
    // ==================== 初始化 ====================
    
    function init() {
        // 等待 DOM 加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        const el = getElements();
        
        // 检查关键元素
        if (!el.toggleAIBtn || !el.aiSidebar) {
            console.error('AI 功能初始化失败：关键元素未找到');
            return;
        }
        
        // 加载配置和历史
        loadConfig();
        loadChatHistory();
        
        // 绑定事件
        bindEvents();
        
        // 检查 API 状态
        checkAPIStatus();
    }
    
    // ==================== 配置管理 ====================
    
    function loadConfig() {
        const saved = localStorage.getItem('ai_config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                apiConfig.model = parsed.model || 'qwen-turbo';
                const el = getElements();
                if (el.modelSelect) {
                    el.modelSelect.value = apiConfig.model;
                }
            } catch (e) {
                console.error('加载配置失败:', e);
            }
        }
    }
    
    function saveConfig() {
        const el = getElements();
        if (el.modelSelect) {
            apiConfig.model = el.modelSelect.value;
        }
        localStorage.setItem('ai_config', JSON.stringify(apiConfig));
    }
    
    function loadChatHistory() {
        const saved = localStorage.getItem('chat_history');
        if (saved) {
            try {
                chatHistory = JSON.parse(saved);
                renderChatHistory();
            } catch (e) {
                console.error('加载对话历史失败:', e);
            }
        }
    }
    
    function saveChatHistory() {
        if (chatHistory.length > 50) {
            chatHistory = chatHistory.slice(-50);
        }
        localStorage.setItem('chat_history', JSON.stringify(chatHistory));
    }
    
    // ==================== 事件绑定 ====================
    
    function bindEvents() {
        const el = getElements();
        
        // AI 侧边栏切换
        if (el.toggleAIBtn) {
            el.toggleAIBtn.addEventListener('click', toggleAISidebar);
        }
        if (el.closeAIBtn) {
            el.closeAIBtn.addEventListener('click', closeAISidebar);
        }
        
        // 发送消息
        if (el.sendAIBtn) {
            el.sendAIBtn.addEventListener('click', sendMessage);
        }
        if (el.aiInput) {
            el.aiInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        // 设置弹窗
        if (el.openSettingsBtn) {
            el.openSettingsBtn.addEventListener('click', openSettings);
        }
        if (el.closeSettingsBtn) {
            el.closeSettingsBtn.addEventListener('click', closeSettings);
        }
        if (el.saveSettingsBtn) {
            el.saveSettingsBtn.addEventListener('click', () => {
                saveConfig();
                closeSettings();
                showToast('设置已保存');
            });
        }
        
        // 刷新状态
        const refreshBtn = document.getElementById('refreshStatus');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                checkAPIStatus();
                showToast('正在检查状态...');
            });
        }
        
        // 遮罩层
        if (el.overlay) {
            el.overlay.addEventListener('click', () => {
                closeSettings();
                closeAISidebar();
            });
        }
    }
    
    // ==================== UI 控制 ====================
    
    function toggleAISidebar() {
        const el = getElements();
        if (!el.aiSidebar) return;
        
        el.aiSidebar.classList.toggle('active');
        
        if (el.aiSidebar.classList.contains('active')) {
            if (el.aiInput) {
                el.aiInput.focus();
            }
            checkAPIStatus();
        }
    }
    
    function closeAISidebar() {
        const el = getElements();
        if (el.aiSidebar) {
            el.aiSidebar.classList.remove('active');
        }
    }
    
    function openSettings() {
        const el = getElements();
        if (el.settingsModal) {
            el.settingsModal.classList.add('active');
        }
        if (el.overlay) {
            el.overlay.classList.add('active');
        }
        checkAPIStatus();
    }
    
    function closeSettings() {
        const el = getElements();
        if (el.settingsModal) {
            el.settingsModal.classList.remove('active');
        }
        if (el.overlay) {
            el.overlay.classList.remove('active');
        }
    }
    
    // ==================== API 状态检查 ====================
    
    async function checkAPIStatus() {
        const checkUrl = `${API_BASE}/api/check`;
        
        try {
            const response = await fetch(checkUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            apiKeyConfigured = data.configured;
            updateAPIStatusUI(data.configured, data.message);
            
        } catch (error) {
            // 本地环境：检查失败说明服务器未运行
            if (isLocalDev) {
                apiKeyConfigured = false;
                updateAPIStatusUI(false, '本地服务器未运行，请先启动 server.py');
            } else {
                // Vercel 环境：允许尝试发送
                apiKeyConfigured = true;
                updateAPIStatusUI(true, 'Vercel 环境 - 如果无法使用，请检查环境变量配置');
            }
        }
    }
    
    function updateAPIStatusUI(configured, message) {
        const el = getElements();
        if (el.apiKeyStatus) {
            if (configured) {
                el.apiKeyStatus.innerHTML = `<span class="status-ok">✅ ${message}</span>`;
            } else {
                el.apiKeyStatus.innerHTML = `<span class="status-error">❌ ${message}</span>`;
            }
        }
    }
    
    // ==================== 对话功能 ====================
    
    async function sendMessage() {
        const el = getElements();
        if (!el.aiInput) return;
        
        const message = el.aiInput.value.trim();
        if (!message) return;
        
        // 本地环境检查
        if (isLocalDev && !apiKeyConfigured) {
            showToast('请先启动本地服务器 (python server.py)');
            return;
        }
        
        // 清空输入
        el.aiInput.value = '';
        
        // 显示用户消息
        addMessage('user', message);
        chatHistory.push({ role: 'user', content: message });
        
        // 显示加载
        const loadingId = showLoading();
        if (el.sendAIBtn) {
            el.sendAIBtn.disabled = true;
        }
        
        try {
            const response = await callAPI(message);
            removeLoading(loadingId);
            addMessage('assistant', response);
            chatHistory.push({ role: 'assistant', content: response });
            saveChatHistory();
        } catch (error) {
            removeLoading(loadingId);
            addMessage('assistant', `抱歉，发生错误：${error.message}`);
            console.error('API 调用错误:', error);
        }
        
        if (el.sendAIBtn) {
            el.sendAIBtn.disabled = false;
        }
    }
    
    async function callAPI(userMessage) {
        const recentHistory = chatHistory.slice(-20);
        const messages = [
            {
                role: 'system',
                content: '你是一个友好的AI助手，可以帮助用户整理想法、回答问题、提供建议。请用简洁清晰的中文回答。'
            },
            ...recentHistory,
            {
                role: 'user',
                content: userMessage
            }
        ];
        
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 1500
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API 请求失败 (${response.status})`);
        }
        
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error('API 响应格式异常');
        }
    }
    
    // ==================== UI 渲染 ====================
    
    function addMessage(role, content) {
        const el = getElements();
        if (!el.aiMessages) return;
        
        // 移除欢迎消息
        const welcome = el.aiMessages.querySelector('.ai-welcome');
        if (welcome) {
            welcome.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `<div class="bubble">${content.replace(/\n/g, '<br>')}</div>`;
        
        el.aiMessages.appendChild(messageDiv);
        el.aiMessages.scrollTop = el.aiMessages.scrollHeight;
    }
    
    function showLoading() {
        const el = getElements();
        if (!el.aiMessages) return null;
        
        const loadingId = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = loadingId;
        loadingDiv.className = 'message assistant';
        loadingDiv.innerHTML = `
            <div class="bubble">
                <div class="loading">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        el.aiMessages.appendChild(loadingDiv);
        el.aiMessages.scrollTop = el.aiMessages.scrollHeight;
        return loadingId;
    }
    
    function removeLoading(loadingId) {
        if (loadingId) {
            const el = document.getElementById(loadingId);
            if (el) {
                el.remove();
            }
        }
    }
    
    function renderChatHistory() {
        const el = getElements();
        if (!el.aiMessages) return;
        
        const welcome = el.aiMessages.querySelector('.ai-welcome');
        el.aiMessages.innerHTML = '';
        
        if (chatHistory.length > 0) {
            chatHistory.forEach(msg => {
                addMessage(msg.role, msg.content);
            });
        } else if (welcome) {
            el.aiMessages.appendChild(welcome);
        }
    }
    
    // ==================== 工具函数 ====================
    
    function showToast(message) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
    
    // ==================== 启动 ====================
    
    // 立即初始化
    init();
    
})();
