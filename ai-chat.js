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
    
    // 对话会话管理
    let conversations = []; // 所有对话会话
    let currentConversationId = null; // 当前对话ID
    let chatHistory = []; // 当前对话的消息历史
    
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
                newChatBtn: document.getElementById('newChatBtn'),
                chatList: document.getElementById('chatList'),
                chatListSidebar: document.getElementById('chatListSidebar'),
                toggleChatList: document.getElementById('toggleChatList'),
                currentChatTitle: document.getElementById('currentChatTitle'),
                quickModelSelect: document.getElementById('quickModelSelect'),
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
        
        // 加载配置和对话会话
        loadConfig();
        loadConversations();
        
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
    
    // ==================== 对话会话管理 ====================
    
    function loadConversations() {
        const saved = localStorage.getItem('ai_conversations');
        if (saved) {
            try {
                conversations = JSON.parse(saved);
                // 如果没有对话，创建第一个
                if (conversations.length === 0) {
                    createNewConversation();
                } else {
                    // 加载最后一个对话
                    currentConversationId = conversations[conversations.length - 1].id;
                    loadConversation(currentConversationId);
                }
            } catch (e) {
                console.error('加载对话会话失败:', e);
                createNewConversation();
            }
        } else {
            createNewConversation();
        }
        renderChatList();
    }
    
    function saveConversations() {
        // 更新当前对话
        if (currentConversationId) {
            const conv = conversations.find(c => c.id === currentConversationId);
            if (conv) {
                conv.messages = chatHistory;
                conv.updatedAt = new Date().toISOString();
                // 如果没有标题且有消息，生成标题
                if (!conv.title || conv.title === '新对话') {
                    const firstUserMsg = chatHistory.find(m => m.role === 'user');
                    if (firstUserMsg) {
                        conv.title = firstUserMsg.content.substring(0, 30) || '新对话';
                    }
                }
            }
        }
        localStorage.setItem('ai_conversations', JSON.stringify(conversations));
    }
    
    function createNewConversation() {
        const newId = 'conv_' + Date.now();
        const newConv = {
            id: newId,
            title: '新对话',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        conversations.push(newConv);
        currentConversationId = newId;
        chatHistory = [];
        saveConversations();
        renderChatList();
        renderChatHistory();
    }
    
    function loadConversation(conversationId) {
        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
            currentConversationId = conversationId;
            chatHistory = conv.messages || [];
            renderChatHistory();
            updateChatTitle();
        }
    }
    
    function deleteConversation(conversationId) {
        const index = conversations.findIndex(c => c.id === conversationId);
        if (index !== -1) {
            conversations.splice(index, 1);
            saveConversations();
            
            // 如果删除的是当前对话
            if (conversationId === currentConversationId) {
                if (conversations.length > 0) {
                    // 切换到最后一个对话
                    currentConversationId = conversations[conversations.length - 1].id;
                    loadConversation(currentConversationId);
                } else {
                    // 创建新对话
                    createNewConversation();
                }
            }
            renderChatList();
        }
    }
    
    function updateChatTitle() {
        const el = getElements();
        if (el.currentChatTitle && currentConversationId) {
            const conv = conversations.find(c => c.id === currentConversationId);
            if (conv) {
                el.currentChatTitle.textContent = conv.title || '🤖 AI助手';
            }
        }
    }
    
    function renderChatList() {
        const el = getElements();
        if (!el.chatList) return;
        
        el.chatList.innerHTML = '';
        
        // 按更新时间倒序排列
        const sortedConvs = [...conversations].sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        
        sortedConvs.forEach(conv => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (conv.id === currentConversationId) {
                chatItem.classList.add('active');
            }
            
            const title = document.createElement('div');
            title.className = 'chat-item-title';
            title.textContent = conv.title || '新对话';
            title.title = conv.title || '新对话';
            
            const actions = document.createElement('div');
            actions.className = 'chat-item-actions';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-chat';
            deleteBtn.textContent = '×';
            deleteBtn.title = '删除对话';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('确定要删除这个对话吗？')) {
                    deleteConversation(conv.id);
                }
            };
            
            actions.appendChild(deleteBtn);
            
            chatItem.appendChild(title);
            chatItem.appendChild(actions);
            
            chatItem.onclick = () => {
                loadConversation(conv.id);
                renderChatList();
            };
            
            el.chatList.appendChild(chatItem);
        });
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
        
        // 新对话按钮
        if (el.newChatBtn) {
            el.newChatBtn.addEventListener('click', () => {
                createNewConversation();
                showToast('已创建新对话');
            });
        }
        
        // 切换对话列表显示
        if (el.toggleChatList) {
            el.toggleChatList.addEventListener('click', () => {
                const sidebar = el.chatListSidebar;
                if (sidebar) {
                    sidebar.classList.toggle('collapsed');
                    const btn = el.toggleChatList;
                    btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
                }
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
            saveConversations();
            renderChatList(); // 更新对话列表（可能更新标题）
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
        
        // 根据选择的模型动态生成系统提示词
        let systemPrompt;
        if (apiConfig.model.startsWith('deepseek')) {
            if (apiConfig.model === 'deepseek-coder') {
                systemPrompt = '你是 DeepSeek Coder，一个专门用于代码相关任务的AI助手。你可以帮助用户编写代码、调试程序、解释代码逻辑、优化代码性能等。请用简洁清晰的中文回答。';
            } else {
                systemPrompt = '你是 DeepSeek，一个友好的AI助手。你可以帮助用户整理想法、回答问题、提供建议。请用简洁清晰的中文回答。';
            }
        } else {
            // 通义千问模型
            systemPrompt = '你是阿里云的通义千问AI助手。你可以帮助用户整理想法、回答问题、提供建议。请用简洁清晰的中文回答。';
        }
        
        const messages = [
            {
                role: 'system',
                content: systemPrompt
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
        
        // 清空消息区域
        el.aiMessages.innerHTML = '';
        
        // 如果没有历史记录，显示欢迎消息
        if (chatHistory.length === 0) {
            let welcomeText = '';
            if (apiConfig.model.startsWith('deepseek')) {
                if (apiConfig.model === 'deepseek-coder') {
                    welcomeText = '<p>你好！我是 DeepSeek Coder，专门用于代码相关任务。</p><p>我可以帮你编写代码、调试程序、解释代码逻辑等。</p>';
                } else {
                    welcomeText = '<p>你好！我是 DeepSeek AI助手。</p><p>你可以问我任何问题，或者让我帮你整理日志内容。</p>';
                }
            } else {
                welcomeText = '<p>你好！我是阿里云的通义千问AI助手。</p><p>你可以问我任何问题，或者让我帮你整理日志内容。</p>';
            }
            
            el.aiMessages.innerHTML = `<div class="ai-welcome">${welcomeText}</div>`;
            return;
        }
        
        // 渲染历史消息
        chatHistory.forEach(msg => {
            addMessage(msg.role, msg.content);
        });
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
    
    // ==================== 工具函数 ====================
    
    
    // ==================== 启动 ====================
    
    // 立即初始化
    init();
    
})();
