/**
 * ==================== 
 * 个人日志笔记应用 - 主逻辑
 * ====================
 * 
 * 功能：
 * - 日志的创建、编辑、删除
 * - 日志列表展示（按日期排序）
 * - 搜索功能
 * - 服务器端持久化存储
 * - 导入/导出功能
 */

// ==================== 全局变量 ====================

// 存储所有日志的数组
let entries = [];

// 当前正在编辑的日志ID
let currentEntryId = null;

// 自动检测 API 服务器地址（使用 window 对象避免重复声明）
if (!window.isLocalDev) {
    window.isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    window.API_BASE = window.isLocalDev ? 'http://localhost:8000' : '';
}
const isLocalDev = window.isLocalDev;
const API_BASE = window.API_BASE;

// 是否使用服务器存储（本地环境使用服务器存储，Vercel环境使用localStorage）
let useServerStorage = isLocalDev;

// ==================== DOM元素引用 ====================

const entriesList = document.getElementById('entriesList');
const editor = document.getElementById('editor');
const emptyState = document.getElementById('emptyState');
const entryDate = document.getElementById('entryDate');
const entryTitle = document.getElementById('entryTitle');
const entryContent = document.getElementById('entryContent');
const searchInput = document.getElementById('searchInput');
const newEntryBtn = document.getElementById('newEntry');
const saveEntryBtn = document.getElementById('saveEntry');
const deleteEntryBtn = document.getElementById('deleteEntry');

// ==================== 初始化函数 ====================

/**
 * 应用初始化
 * 从服务器或本地存储加载数据并渲染界面
 */
async function init() {
    // 绑定事件监听器
    bindEvents();
    
    // 设置今天的日期为默认值
    setTodayDate();
    
    // 从服务器加载数据（如果失败则从localStorage加载）
    await loadEntries();
    
    // 渲染日志列表
    renderEntriesList();
}

/**
 * 从服务器加载日志数据
 */
async function loadEntries() {
    try {
        const response = await fetch(`${API_BASE}/api/entries`);
        const data = await response.json();
        
        if (data.success) {
            entries = data.entries || [];
            useServerStorage = true;
            console.log('✅ 从服务器加载数据成功');
        } else {
            throw new Error('服务器返回错误');
        }
    } catch (error) {
        console.warn('⚠️ 无法连接服务器，使用本地存储:', error.message);
        useServerStorage = false;
        
        // 回退到localStorage
        const savedEntries = localStorage.getItem('journal_entries');
        if (savedEntries) {
            entries = JSON.parse(savedEntries);
        }
    }
}

/**
 * 保存日志数据
 */
async function saveEntriesToStorage() {
    // 同时保存到localStorage（作为备份）
    localStorage.setItem('journal_entries', JSON.stringify(entries));
    
    // 如果服务器可用，也保存到服务器
    if (useServerStorage) {
        try {
            const response = await fetch(`${API_BASE}/api/entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ entries: entries })
            });
            
            const data = await response.json();
            if (!data.success) {
                console.warn('服务器保存失败:', data.error);
            }
        } catch (error) {
            console.warn('无法保存到服务器:', error.message);
        }
    }
}

/**
 * 设置日期输入框为今天的日期
 */
function setTodayDate() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    entryDate.value = dateStr;
}

// ==================== 事件绑定 ====================

/**
 * 绑定所有事件监听器
 */
function bindEvents() {
    // 新建日志按钮
    newEntryBtn.addEventListener('click', createNewEntry);
    
    // 保存日志按钮
    saveEntryBtn.addEventListener('click', saveEntry);
    
    // 删除日志按钮
    deleteEntryBtn.addEventListener('click', deleteEntry);
    
    // 搜索框输入事件
    searchInput.addEventListener('input', handleSearch);
    
    // 自动保存（输入时）
    entryTitle.addEventListener('input', debounce(autoSave, 1000));
    entryContent.addEventListener('input', debounce(autoSave, 1000));
    
    // 导出按钮
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    // 导入按钮
    const importBtn = document.getElementById('importData');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
    }
    
    // 导入文件选择
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', importData);
    }
}

// ==================== 日志操作函数 ====================

/**
 * 创建新日志
 */
function createNewEntry() {
    const id = Date.now().toString();
    
    setTodayDate();
    
    const newEntry = {
        id: id,
        date: entryDate.value,
        title: '',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    entries.unshift(newEntry);
    saveEntriesToStorage();
    
    currentEntryId = id;
    showEditor(newEntry);
    renderEntriesList();
    
    entryTitle.focus();
    showToast('已创建新日志');
}

/**
 * 保存当前日志
 */
function saveEntry() {
    if (!currentEntryId) return;
    
    const entryIndex = entries.findIndex(e => e.id === currentEntryId);
    if (entryIndex === -1) return;
    
    entries[entryIndex].date = entryDate.value;
    entries[entryIndex].title = entryTitle.value || '无标题';
    entries[entryIndex].content = entryContent.value;
    entries[entryIndex].updatedAt = new Date().toISOString();
    
    saveEntriesToStorage();
    renderEntriesList();
    
    showToast('日志已保存');
}

/**
 * 自动保存（静默保存，不显示提示）
 */
function autoSave() {
    if (!currentEntryId) return;
    
    const entryIndex = entries.findIndex(e => e.id === currentEntryId);
    if (entryIndex === -1) return;
    
    entries[entryIndex].date = entryDate.value;
    entries[entryIndex].title = entryTitle.value || '无标题';
    entries[entryIndex].content = entryContent.value;
    entries[entryIndex].updatedAt = new Date().toISOString();
    
    saveEntriesToStorage();
    renderEntriesList();
}

/**
 * 删除当前日志
 */
function deleteEntry() {
    if (!currentEntryId) return;
    
    if (!confirm('确定要删除这篇日志吗？')) return;
    
    entries = entries.filter(e => e.id !== currentEntryId);
    saveEntriesToStorage();
    
    currentEntryId = null;
    hideEditor();
    renderEntriesList();
    
    showToast('日志已删除');
}

/**
 * 选择并编辑日志
 */
function selectEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    
    currentEntryId = id;
    showEditor(entry);
    renderEntriesList();
}

// ==================== 导入/导出功能 ====================

/**
 * 导出数据为JSON文件
 */
function exportData() {
    const exportObj = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        entries: entries
    };
    
    const dataStr = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `日志备份_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据已导出');
}

/**
 * 从JSON文件导入数据
 */
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.entries || !Array.isArray(data.entries)) {
                throw new Error('无效的数据格式');
            }
            
            // 确认导入
            const confirmMsg = `确定要导入 ${data.entries.length} 篇日志吗？\n\n选择"确定"将合并到现有日志中。`;
            if (!confirm(confirmMsg)) {
                event.target.value = '';
                return;
            }
            
            // 合并日志（避免重复）
            const existingIds = new Set(entries.map(e => e.id));
            let importCount = 0;
            
            data.entries.forEach(entry => {
                if (!existingIds.has(entry.id)) {
                    entries.push(entry);
                    importCount++;
                }
            });
            
            // 保存并刷新
            await saveEntriesToStorage();
            renderEntriesList();
            
            showToast(`成功导入 ${importCount} 篇日志`);
            
        } catch (error) {
            showToast('导入失败：文件格式错误');
            console.error('导入错误:', error);
        }
        
        // 清空文件选择
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// ==================== UI渲染函数 ====================

/**
 * 渲染日志列表
 */
function renderEntriesList(entriesToRender = null) {
    const listToRender = entriesToRender || entries;
    
    const sortedEntries = [...listToRender].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    entriesList.innerHTML = '';
    
    if (sortedEntries.length === 0) {
        entriesList.innerHTML = `
            <div class="empty-list">
                <p style="text-align: center; color: var(--text-secondary); padding: 20px;">
                    暂无日志
                </p>
            </div>
        `;
        return;
    }
    
    sortedEntries.forEach(entry => {
        const item = document.createElement('div');
        item.className = `entry-item${entry.id === currentEntryId ? ' active' : ''}`;
        item.onclick = () => selectEntry(entry.id);
        
        const dateDisplay = formatDate(entry.date);
        const preview = entry.content.substring(0, 100) || '暂无内容';
        
        item.innerHTML = `
            <div class="entry-date">${dateDisplay}</div>
            <div class="entry-title">${entry.title || '无标题'}</div>
            <div class="entry-preview">${preview}</div>
        `;
        
        entriesList.appendChild(item);
    });
}

/**
 * 显示编辑器并填充数据
 */
function showEditor(entry) {
    emptyState.style.display = 'none';
    editor.style.display = 'block';
    
    entryDate.value = entry.date;
    entryTitle.value = entry.title;
    entryContent.value = entry.content;
}

/**
 * 隐藏编辑器，显示空状态
 */
function hideEditor() {
    emptyState.style.display = 'block';
    editor.style.display = 'none';
    
    entryDate.value = '';
    entryTitle.value = '';
    entryContent.value = '';
}

// ==================== 搜索功能 ====================

/**
 * 处理搜索输入
 */
function handleSearch() {
    const keyword = searchInput.value.trim().toLowerCase();
    
    if (!keyword) {
        renderEntriesList();
        return;
    }
    
    const filtered = entries.filter(entry => {
        return entry.title.toLowerCase().includes(keyword) ||
               entry.content.toLowerCase().includes(keyword);
    });
    
    renderEntriesList(filtered);
}

// ==================== 工具函数 ====================

/**
 * 格式化日期显示
 */
function formatDate(dateStr) {
    if (!dateStr) return '未知日期';
    
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    
    return `${year}年${month}月${day}日 ${weekDay}`;
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 显示提示消息
 */
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

// ==================== 启动应用 ====================

// 如果 DOM 已经加载完成，直接初始化；否则等待 DOMContentLoaded 事件
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM 已经加载完成，直接初始化
    init();
}
