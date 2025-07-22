// Chrome Desktop 彈出窗口功能
class ChromeDesktopPopup {
    constructor() {
        this.websites = this.loadWebsites();
        this.init();
        this.updateStats();
        this.loadRecentWebsites();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // 打開桌面
        document.getElementById('open-desktop').addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
            window.close();
        });

        // 添加當前網站
        document.getElementById('add-current-site').addEventListener('click', () => {
            this.addCurrentSite();
        });

        // 管理分類
        document.getElementById('manage-categories').addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
            window.close();
        });

        // 導出數據
        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });

        // 導入數據
        document.getElementById('import-data').addEventListener('click', () => {
            this.importData();
        });

        // 設置
        document.getElementById('settings').addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
            window.close();
        });
    }

    // 添加當前網站
    async addCurrentSite() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url && !tab.url.startsWith('chrome://')) {
                const website = {
                    type: 'website',
                    name: tab.title || this.getDomainFromUrl(tab.url),
                    url: tab.url,
                    icon: tab.favIconUrl || this.getDefaultIcon(tab.url),
                    addedDate: new Date().toISOString()
                };

                // 添加到Home分類
                if (!this.websites.home) {
                    this.websites.home = [];
                }
                
                // 檢查是否已存在
                const exists = this.websites.home.some(site => site.url === website.url);
                if (!exists) {
                    this.websites.home.push(website);
                    this.saveWebsites();
                    this.updateStats();
                    this.loadRecentWebsites();
                    this.showNotification('網站已添加到桌面！');
                } else {
                    this.showNotification('該網站已存在於桌面中');
                }
            } else {
                this.showNotification('無法添加此頁面');
            }
        } catch (error) {
            console.error('添加網站失敗:', error);
            this.showNotification('添加失敗，請重試');
        }
    }

    // 從URL獲取域名
    getDomainFromUrl(url) {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return 'Unknown Site';
        }
    }

    // 獲取默認圖標
    getDefaultIcon(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzM3NDE1MSIvPgo8cGF0aCBkPSJNMTAgMTBIMjJWMjJIMTBWMTBaIiBmaWxsPSIjNkI3Mjg0Ii8+Cjwvc3ZnPgo=';
        }
    }

    // 更新統計信息
    updateStats() {
        let totalWebsites = 0;
        let totalFolders = 0;
        const totalCategories = Object.keys(this.websites).length;

        Object.values(this.websites).forEach(category => {
            this.countItems(category, (websites, folders) => {
                totalWebsites += websites;
                totalFolders += folders;
            });
        });

        document.getElementById('total-websites').textContent = totalWebsites;
        document.getElementById('total-categories').textContent = totalCategories;
        document.getElementById('total-folders').textContent = totalFolders;
    }

    // 遞歸計算項目數量
    countItems(items, callback) {
        let websites = 0;
        let folders = 0;

        items.forEach(item => {
            if (item.type === 'website') {
                websites++;
            } else if (item.type === 'folder') {
                folders++;
                if (item.children) {
                    this.countItems(item.children, (childWebsites, childFolders) => {
                        websites += childWebsites;
                        folders += childFolders;
                    });
                }
            }
        });

        callback(websites, folders);
    }

    // 加載最近添加的網站
    loadRecentWebsites() {
        const recentContainer = document.getElementById('recent-websites');
        recentContainer.innerHTML = '';

        const allWebsites = [];
        Object.values(this.websites).forEach(category => {
            this.collectWebsites(category, allWebsites);
        });

        // 按添加日期排序，取最近5個
        const recentWebsites = allWebsites
            .filter(site => site.addedDate)
            .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate))
            .slice(0, 5);

        if (recentWebsites.length === 0) {
            recentContainer.innerHTML = '<div class="text-xs text-gray-400 text-center py-2">暫無最近添加的網站</div>';
            return;
        }

        recentWebsites.forEach(website => {
            const item = document.createElement('div');
            item.className = 'flex items-center p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors';
            item.innerHTML = `
                <img src="${website.icon}" alt="${website.name}" class="w-4 h-4 mr-2 rounded" 
                     onerror="this.src='${this.getDefaultIcon(website.url)}'">
                <span class="text-xs truncate flex-1">${website.name}</span>
            `;
            item.addEventListener('click', () => {
                chrome.tabs.create({ url: website.url });
                window.close();
            });
            recentContainer.appendChild(item);
        });
    }

    // 遞歸收集所有網站
    collectWebsites(items, collection) {
        items.forEach(item => {
            if (item.type === 'website') {
                collection.push(item);
            } else if (item.type === 'folder' && item.children) {
                this.collectWebsites(item.children, collection);
            }
        });
    }

    // 導出數據
    exportData() {
        const data = {
            websites: this.websites,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `chrome-desktop-${new Date().toISOString().split('T')[0]}.json`
        }, () => {
            URL.revokeObjectURL(url);
            this.showNotification('數據導出成功！');
        });
    }

    // 導入數據
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.websites) {
                            // 合併數據而不是覆蓋
                            Object.keys(data.websites).forEach(category => {
                                if (!this.websites[category]) {
                                    this.websites[category] = [];
                                }
                                // 避免重複添加
                                data.websites[category].forEach(item => {
                                    const exists = this.websites[category].some(existing => 
                                        existing.type === item.type && 
                                        (item.type === 'website' ? existing.url === item.url : existing.name === item.name)
                                    );
                                    if (!exists) {
                                        this.websites[category].push(item);
                                    }
                                });
                            });
                            
                            this.saveWebsites();
                            this.updateStats();
                            this.loadRecentWebsites();
                            this.showNotification('數據導入成功！');
                        } else {
                            this.showNotification('無效的文件格式！');
                        }
                    } catch (error) {
                        console.error('導入失敗:', error);
                        this.showNotification('文件解析失敗！');
                    }
                };
                reader.readAsText(file);
            }
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    }

    // 顯示通知
    showNotification(message) {
        // 創建臨時通知元素
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm z-50';
        notification.textContent = message;
        document.body.appendChild(notification);

        // 3秒後移除
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    // 加載網站數據
    loadWebsites() {
        const saved = localStorage.getItem('chrome-desktop-websites');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // 默認數據
        return {
            home: [],
            other: []
        };
    }

    // 保存網站數據
    saveWebsites() {
        localStorage.setItem('chrome-desktop-websites', JSON.stringify(this.websites));
    }
}

// 初始化彈出窗口
document.addEventListener('DOMContentLoaded', () => {
    new ChromeDesktopPopup();
});