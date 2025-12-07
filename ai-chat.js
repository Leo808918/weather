/**
 * ==================== 
 * AI对话功能模块
 * ====================
 * 
 * 功能：
 * - 通过本地服务器调用通义千问API（安全方式）
 * - 管理对话历史
 * - 处理设置弹窗
 */

// ==================== 全局变量 ====================

// 对话历史记录
let chatHistory = [];

// API配置（现在只存储模型选择）
let apiConfig = {
    model: 'qwen-turbo'
};

// API Key 状态
let apiKeyConfigured = false;

// 本地服务器地址
const LOCAL_SERVER = 'http://localhost:8000';

// ==================== DOM元素引用 ====================

const aiSidebar = document.getElementById('aiSidebar');
const aiMessages = document.getElementById('aiMessages');
const aiInput = document.getElementById('aiInput');
const sendAIBtn = document.getElementById('sendAI');
const toggleAIBtn = document.getElementById('toggleAI');
const closeAIBtn = document.getElementById('closeAI');

const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettings');
const closeSettingsBtn = document.getElementById('closeSettings');
const saveSettingsBtn = document.getElementById('saveSettings');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const modelSelect = document.getElementById('modelSelect');
const overlay = document.getElementById('overlay');

// ==================== 初始化函数 ====================

/**
 * AI模块初始化
 */
function initAI() {
    // 加载保存的配置
    loadConfig();
    
    // 加载对话历史
    loadChatHistory();
    
    // 绑定事件
    bindAIEvents();
    
    // 检查 API Key 状态
    checkAPIStatus();
}

/**
 * 检查本地服务器和 API Key 状态
 */
async function checkAPIStatus() {
    try {
        const response = await fetch(`${LOCAL_SERVER}/api/check`);
        const data = await response.json();
        
        apiKeyConfigured = data.configured;
        updateAPIStatusUI(data.configured, data.message);
        
    } catch (error) {
        // 服务器未运行
        apiKeyConfigured = false;
        updateAPIStatusUI(false, '本地服务器未运行，请先启动 server.py');
    }
}

/**
 * 更新 API 状态显示
 * @param {boolean} configured - 是否已配置
 * @param {string} message - 状态消息
 */
function updateAPIStatusUI(configured, message) {
    if (apiKeyStatus) {
        if (configured) {
            apiKeyStatus.innerHTML = `<span class="status-ok">✅ ${message}</span>`;
        } else {
            apiKeyStatus.innerHTML = `<span class="status-error">❌ ${message}</span>`;
        }
    }
}

/**
 * 从本地存储加载配置
 */
function loadConfig() {
    const savedConfig = localStorage.getItem('ai_config');
    if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        apiConfig.model = parsed.model || 'qwen-turbo';
        if (modelSelect) {
            modelSelect.value = apiConfig.model;
        }
    }
}

/**
 * 保存配置到本地存储
 */
function saveConfig() {
    apiConfig.model = modelSelect.value;
    localStorage.setItem('ai_config', JSON.stringify(apiConfig));
}

/**
 * 加载对话历史
 */
function loadChatHistory() {
    const savedHistory = localStorage.getItem('chat_history');
    if (savedHistory) {
        chatHistory = JSON.parse(savedHistory);
        renderChatHistory();
    }
}

/**
 * 保存对话历史
 */
function saveChatHistory() {
    // 只保留最近50条消息
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
    }
    localStorage.setItem('chat_history', JSON.stringify(chatHistory));
}

// ==================== 事件绑定 ====================

/**
 * 绑定AI相关事件
 */
function bindAIEvents() {
    // 打开/关闭AI侧边栏
    toggleAIBtn.addEventListener('click', toggleAISidebar);
    closeAIBtn.addEventListener('click', closeAISidebar);
    
    // 发送消息
    sendAIBtn.addEventListener('click', sendMessage);
    
    // 回车发送（Shift+Enter换行）
    aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 设置弹窗
    openSettingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    saveSettingsBtn.addEventListener('click', () => {
        saveConfig();
        closeSettings();
        showToast('设置已保存');
    });
    
    // 刷新状态按钮
    const refreshBtn = document.getElementById('refreshStatus');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            checkAPIStatus();
            showToast('正在检查状态...');
        });
    }
    
    // 点击遮罩关闭弹窗
    overlay.addEventListener('click', () => {
        closeSettings();
        closeAISidebar();
    });
}

// ==================== UI控制函数 ====================

/**
 * 切换AI侧边栏显示状态
 */
function toggleAISidebar() {
    aiSidebar.classList.toggle('active');
    if (aiSidebar.classList.contains('active')) {
        aiInput.focus();
        // 打开时检查状态
        checkAPIStatus();
    }
}

/**
 * 关闭AI侧边栏
 */
function closeAISidebar() {
    aiSidebar.classList.remove('active');
}

/**
 * 打开设置弹窗
 */
function openSettings() {
    settingsModal.classList.add('active');
    overlay.classList.add('active');
    // 打开设置时刷新状态
    checkAPIStatus();
}

/**
 * 关闭设置弹窗
 */
function closeSettings() {
    settingsModal.classList.remove('active');
    overlay.classList.remove('active');
}

// ==================== 对话功能 ====================

/**
 * 发送消息
 */
async function sendMessage() {
    const message = aiInput.value.trim();
    if (!message) return;
    
    // 检查 API 状态
    if (!apiKeyConfigured) {
        showToast('请先启动本地服务器 (python server.py)');
        return;
    }
    
    // 清空输入框
    aiInput.value = '';
    
    // 添加用户消息到界面
    addMessageToUI('user', message);
    
    // 添加到历史记录
    chatHistory.push({ role: 'user', content: message });
    
    // 显示加载状态
    const loadingId = showLoading();
    
    // 禁用发送按钮
    sendAIBtn.disabled = true;
    
    try {
        // 通过本地服务器调用API
        const response = await callQwenAPI(message);
        
        // 移除加载状态
        removeLoading(loadingId);
        
        // 添加AI回复到界面
        addMessageToUI('assistant', response);
        
        // 添加到历史记录
        chatHistory.push({ role: 'assistant', content: response });
        
        // 保存对话历史
        saveChatHistory();
        
    } catch (error) {
        // 移除加载状态
        removeLoading(loadingId);
        
        // 显示错误信息
        addMessageToUI('assistant', `抱歉，发生错误：${error.message}`);
        console.error('API调用错误:', error);
    }
    
    // 重新启用发送按钮
    sendAIBtn.disabled = false;
}

/**
 * 通过本地服务器调用通义千问API
 * @param {string} userMessage - 用户消息
 * @returns {Promise<string>} AI回复
 */
async function callQwenAPI(userMessage) {
    // 构建消息历史（最近10轮对话）
    const recentHistory = chatHistory.slice(-20);
    
    // 构建请求消息
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
    
    // 通过本地服务器发送请求
    const response = await fetch(`${LOCAL_SERVER}/api/chat`, {
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
    
    // 解析响应
    const data = await response.json();
    
    // 检查错误
    if (data.error) {
        throw new Error(data.error.message || 'API请求失败');
    }
    
    // 提取AI回复
    if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
    } else {
        throw new Error('API响应格式异常');
    }
}

// ==================== UI渲染函数 ====================

/**
 * 添加消息到UI
 * @param {string} role - 角色 ('user' 或 'assistant')
 * @param {string} content - 消息内容
 */
function addMessageToUI(role, content) {
    // 移除欢迎消息（如果存在）
    const welcome = aiMessages.querySelector('.ai-welcome');
    if (welcome) {
        welcome.remove();
    }
    
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // 处理内容中的换行
    const formattedContent = content.replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = `
        <div class="bubble">${formattedContent}</div>
    `;
    
    aiMessages.appendChild(messageDiv);
    
    // 滚动到底部
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

/**
 * 显示加载动画
 * @returns {string} 加载元素的ID
 */
function showLoading() {
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
    
    aiMessages.appendChild(loadingDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    
    return loadingId;
}

/**
 * 移除加载动画
 * @param {string} loadingId - 加载元素的ID
 */
function removeLoading(loadingId) {
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) {
        loadingEl.remove();
    }
}

/**
 * 渲染对话历史
 */
function renderChatHistory() {
    // 清空现有消息（保留欢迎消息的容器）
    const welcome = aiMessages.querySelector('.ai-welcome');
    aiMessages.innerHTML = '';
    
    // 如果有历史记录，渲染它们
    if (chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            addMessageToUI(msg.role, msg.content);
        });
    } else if (welcome) {
        // 如果没有历史记录，恢复欢迎消息
        aiMessages.appendChild(welcome);
    }
}

// ==================== 启动AI模块 ====================

// 页面加载完成后初始化AI模块
document.addEventListener('DOMContentLoaded', initAI);
