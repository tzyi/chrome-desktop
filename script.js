// Chrome Desktop 主要功能實現
class ChromeDesktop {
    constructor() {
        this.currentCategory = 'home';
        this.currentPath = [];
        this.websites = this.loadWebsites();
        this.draggedElement = null;
        this.editingWebsite = null;
        
        this.init();
        this.loadDesktop();
    }

    init() {
        this.bindEvents();
        this.setupDragAndDrop();
        this.setupContextMenu();
    }

    // 綁定所有事件
    bindEvents() {    
        // 桌面分類切換
        document.querySelectorAll('.desktop-category').forEach(category => {
            category.addEventListener('click', (e) => this.switchCategory(e.target.closest('.desktop-category').dataset.category));
        });

        // 導入導出功能
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-btn').addEventListener('click', () => this.importData());

        // 搜索功能
        document.getElementById('search-input').addEventListener('input', (e) => this.searchWebsites(e.target.value));

        // 返回按鈕
        document.getElementById('back-btn').addEventListener('click', () => this.navigateBack());

        // 模態框事件
        this.bindModalEvents();

        // 桌面右鍵菜單
        document.getElementById('desktop-area').addEventListener('contextmenu', (e) => this.showContextMenu(e));
        
        // 點擊空白處隱藏菜單
        document.addEventListener('click', () => this.hideContextMenu());

        // 新增桌面分類
        document.getElementById('add-category-btn').addEventListener('click', () => this.addCategory());

        // 重新綁定拖拽事件
        this.bindDragEvents();
    };

    

    // 綁定模態框事件
    bindModalEvents() {
        // 新增網站
        document.getElementById('add-website-form').addEventListener('submit', (e) => this.addWebsite(e));
        document.getElementById('cancel-add-website').addEventListener('click', () => this.hideModal('add-website-modal'));

        // 編輯網站
        document.getElementById('edit-website-form').addEventListener('submit', (e) => this.editWebsite(e));
        document.getElementById('cancel-edit-website').addEventListener('click', () => this.hideModal('edit-website-modal'));

        // 新增資料夾
        document.getElementById('add-folder-form').addEventListener('submit', (e) => this.addFolder(e));
        document.getElementById('cancel-add-folder').addEventListener('click', () => this.hideModal('add-folder-modal'));

        // 點擊模態框背景關閉
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    // 設置拖拽功能
    setupDragAndDrop() {
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('desktop-icon')) {
                this.draggedElement = e.target;
                e.target.classList.add('dragging');
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('desktop-icon')) {
                e.target.classList.remove('dragging');
                this.draggedElement = null;
            }
        });

        document.getElementById('desktop-grid').addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.getElementById('desktop-grid').addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedElement) {
                // 計算新位置並更新
                this.updateIconPosition(this.draggedElement, e.clientX, e.clientY);
            }
        });
    }

    // 設置右鍵菜單
    setupContextMenu() {
        // 桌面右鍵菜單
        document.getElementById('context-menu').addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action === 'add-website') {
                this.showModal('add-website-modal');
            } else if (action === 'add-folder') {
                this.showModal('add-folder-modal');
            }
            this.hideContextMenu();
        });

        // 圖標右鍵菜單
        document.getElementById('icon-context-menu').addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action === 'edit' && this.editingWebsite) {
                this.showEditModal(this.editingWebsite);
            } else if (action === 'delete' && this.editingWebsite) {
                this.deleteWebsite(this.editingWebsite);
            }
            this.hideContextMenu();
        });
    }

    // 切換側邊欄
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const showBtn = document.getElementById('show-sidebar-btn');
        
        if (sidebar.classList.contains('sidebar-collapsed')) {
            sidebar.classList.remove('sidebar-collapsed');
            showBtn.classList.add('hidden');
        } else {
            sidebar.classList.add('sidebar-collapsed');
            showBtn.classList.remove('hidden');
        }
    }

    // 切換桌面分類
    switchCategory(category) {
        this.currentCategory = category;
        this.currentPath = [];
        
        // 更新UI
        document.querySelectorAll('.desktop-category').forEach(cat => {
            cat.classList.remove('active', 'bg-blue-600', 'text-white');
            cat.classList.add('bg-gray-700', 'hover:bg-gray-600');
        });
        
        document.querySelector(`[data-category="${category}"]`).classList.add('active', 'bg-blue-600', 'text-white');
        document.querySelector(`[data-category="${category}"]`).classList.remove('bg-gray-700', 'hover:bg-gray-600');
        
        this.updateBreadcrumb();
        this.loadDesktop();
    }

    // 加載桌面內容
    loadDesktop() {
        const grid = document.getElementById('desktop-grid');
        grid.innerHTML = '';
        grid.style.position = 'relative';
        
        const currentWebsites = this.getCurrentWebsites();
        
        currentWebsites.forEach((website, index) => {
            const icon = this.createIcon(website, index);
            grid.appendChild(icon);
        });
        
        // 重新綁定拖拽事件
        this.bindDragEvents();
    }

    // 獲取當前路徑下的網站
    getCurrentWebsites() {
        let current = this.websites[this.currentCategory] || [];
        
        for (const folder of this.currentPath) {
            current = current.find(item => item.type === 'folder' && item.name === folder)?.children || [];
        }
        
        return current;
    }

    // 創建圖標元素
    createIcon(website, index) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'desktop-icon flex flex-col items-center p-3 rounded-lg hover:bg-gray-700 transition-colors';
        iconDiv.draggable = true;
        iconDiv.dataset.index = index;
        iconDiv.dataset.type = website.type;
        iconDiv.style.position = 'absolute';
        iconDiv.style.cursor = 'grab';
        
        // 設置初始位置
        if (website.position) {
            iconDiv.style.left = website.position.x + 'px';
            iconDiv.style.top = website.position.y + 'px';
        } else {
            // 計算網格位置
            const gridSize = 80;
            const col = index % 8;
            const row = Math.floor(index / 8);
            iconDiv.style.left = (col * gridSize + 20) + 'px';
            iconDiv.style.top = (row * gridSize + 20) + 'px';
        }

        if (website.type === 'folder') {
            iconDiv.innerHTML = `
                <div class="w-8 h-8 mb-2 flex items-center justify-center">
                    <i class="fas fa-folder text-4xl text-yellow-500"></i>
                </div>
                <span class="text-sm text-center max-w-20 truncate">${website.name}</span>
            `;
            iconDiv.addEventListener('dblclick', () => this.openFolder(website.name));
        } else {
            const iconUrl = website.icon || this.getDefaultIcon(website.url);
            iconDiv.innerHTML = `
                <div class="w-8 h-8 mb-2 flex items-center justify-center">
                    <img src="${iconUrl}" alt="${website.name}" class="w-12 h-12 rounded-lg" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzM3NDE1MSIvPgo8cGF0aCBkPSJNMTYgMTZIMzJWMzJIMTZWMTZaIiBmaWxsPSIjNkI3Mjg0Ii8+Cjwvc3ZnPgo='">
                </div>
                <span class="text-sm text-center max-w-20 truncate">${website.name}</span>
            `;
            iconDiv.addEventListener('dblclick', () => this.openWebsite(website.url));
        }

        // 右鍵菜單
        iconDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.editingWebsite = website;
            this.showIconContextMenu(e);
        });

        return iconDiv;
    }

    // 獲取默認圖標
    getDefaultIcon(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzM3NDE1MSIvPgo8cGF0aCBkPSJNMTYgMTZIMzJWMzJIMTZWMTZaIiBmaWxsPSIjNkI3Mjg0Ii8+Cjwvc3ZnPgo=';
        }
    }

    // 打開網站
    openWebsite(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        window.open(url, '_blank');
    }

    // 打開資料夾
    openFolder(folderName) {
        this.currentPath.push(folderName);
        this.updateBreadcrumb();
        this.loadDesktop();
    }

    // 更新麵包屑導航
    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const backBtn = document.getElementById('back-btn');
        
        breadcrumb.innerHTML = '';
        
        // 根目錄
        const homeItem = document.createElement('span');
        homeItem.className = 'breadcrumb-item';
        homeItem.textContent = this.currentCategory.charAt(0).toUpperCase() + this.currentCategory.slice(1);
        homeItem.dataset.path = '/';
        homeItem.addEventListener('click', () => this.navigateToPath([]));
        breadcrumb.appendChild(homeItem);
        
        // 子路徑
        this.currentPath.forEach((folder, index) => {
            const separator = document.createElement('span');
            separator.textContent = ' / ';
            separator.className = 'text-gray-400';
            breadcrumb.appendChild(separator);
            
            const item = document.createElement('span');
            item.className = 'breadcrumb-item';
            item.textContent = folder;
            item.addEventListener('click', () => this.navigateToPath(this.currentPath.slice(0, index + 1)));
            breadcrumb.appendChild(item);
        });
        
        // 更新返回按鈕狀態
        backBtn.disabled = this.currentPath.length === 0;
        if (backBtn.disabled) {
            backBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            backBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    // 導航到指定路徑
    navigateToPath(path) {
        this.currentPath = path;
        this.updateBreadcrumb();
        this.loadDesktop();
    }

    // 返回上一級
    navigateBack() {
        if (this.currentPath.length > 0) {
            this.currentPath.pop();
            this.updateBreadcrumb();
            this.loadDesktop();
        }
    }

    // 顯示右鍵菜單
    showContextMenu(e) {
        e.preventDefault();
        const menu = document.getElementById('context-menu');
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        menu.classList.remove('hidden');
    }

    // 顯示圖標右鍵菜單
    showIconContextMenu(e) {
        const menu = document.getElementById('icon-context-menu');
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        menu.classList.remove('hidden');
    }

    // 隱藏右鍵菜單
    hideContextMenu() {
        document.getElementById('context-menu').classList.add('hidden');
        document.getElementById('icon-context-menu').classList.add('hidden');
    }

    // 顯示模態框
    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
        // 清空表單
        const form = document.querySelector(`#${modalId} form`);
        if (form) form.reset();
    }

    // 隱藏模態框
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    // 顯示編輯模態框
    showEditModal(website) {
        document.getElementById('edit-website-name').value = website.name;
        document.getElementById('edit-website-url').value = website.url || '';
        document.getElementById('edit-website-icon').value = website.icon || '';
        this.showModal('edit-website-modal');
    }

    // 新增網站
    addWebsite(e) {
        e.preventDefault();
        const name = document.getElementById('website-name').value;
        const url = document.getElementById('website-url').value;
        const icon = document.getElementById('website-icon').value;

        const website = {
            type: 'website',
            name,
            url,
            icon: icon || this.getDefaultIcon(url)
        };

        this.addToCurrentLocation(website);
        this.hideModal('add-website-modal');
        this.loadDesktop();
        this.saveWebsites();
    }

    // 編輯網站
    editWebsite(e) {
        e.preventDefault();
        const name = document.getElementById('edit-website-name').value;
        const url = document.getElementById('edit-website-url').value;
        const icon = document.getElementById('edit-website-icon').value;

        this.editingWebsite.name = name;
        this.editingWebsite.url = url;
        this.editingWebsite.icon = icon || this.getDefaultIcon(url);

        this.hideModal('edit-website-modal');
        this.loadDesktop();
        this.saveWebsites();
    }

    // 新增資料夾
    addFolder(e) {
        e.preventDefault();
        const name = document.getElementById('folder-name').value;

        const folder = {
            type: 'folder',
            name,
            children: []
        };

        this.addToCurrentLocation(folder);
        this.hideModal('add-folder-modal');
        this.loadDesktop();
        this.saveWebsites();
    }

    // 添加到當前位置
    addToCurrentLocation(item) {
        let current = this.websites[this.currentCategory] = this.websites[this.currentCategory] || [];
        
        for (const folder of this.currentPath) {
            current = current.find(item => item.type === 'folder' && item.name === folder).children;
        }
        
        current.push(item);
    }

    // 刪除網站
    deleteWebsite(website) {
        if (confirm(`確定要刪除 "${website.name}" 嗎？`)) {
            let current = this.websites[this.currentCategory];
            
            for (const folder of this.currentPath) {
                current = current.find(item => item.type === 'folder' && item.name === folder).children;
            }
            
            const index = current.indexOf(website);
            if (index > -1) {
                current.splice(index, 1);
                this.loadDesktop();
                this.saveWebsites();
            }
        }
    }

    // 搜索網站
    searchWebsites(query) {
        if (!query.trim()) {
            this.loadDesktop();
            return;
        }

        const grid = document.getElementById('desktop-grid');
        grid.innerHTML = '';
        
        const results = this.searchInWebsites(this.websites[this.currentCategory] || [], query.toLowerCase());
        
        results.forEach((website, index) => {
            const icon = this.createIcon(website, index);
            grid.appendChild(icon);
        });
    }

    // 遞歸搜索網站
    searchInWebsites(websites, query) {
        const results = [];
        
        websites.forEach(website => {
            if (website.name.toLowerCase().includes(query)) {
                results.push(website);
            }
            
            if (website.type === 'folder' && website.children) {
                results.push(...this.searchInWebsites(website.children, query));
            }
        });
        
        return results;
    }

    // 新增桌面分類
    addCategory() {
        const name = prompt('請輸入新桌面分類名稱：');
        if (name && name.trim()) {
            const categoryKey = name.toLowerCase().replace(/\s+/g, '-');
            this.websites[categoryKey] = [];
            
            const categoriesContainer = document.getElementById('desktop-categories');
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'desktop-category bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded cursor-pointer flex items-center';
            categoryDiv.dataset.category = categoryKey;
            categoryDiv.innerHTML = `
                <i class="fas fa-folder mr-2"></i>
                <span>${name}</span>
            `;
            categoryDiv.addEventListener('click', () => this.switchCategory(categoryKey));
            categoriesContainer.appendChild(categoryDiv);
            
            this.saveWebsites();
        }
    }

    // 導出數據
    exportData() {
        const data = {
            websites: this.websites,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chrome-desktop-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 導入數據
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.websites) {
                            this.websites = { ...this.websites, ...data.websites };
                            this.saveWebsites();
                            this.loadDesktop();
                            alert('導入成功！');
                        } else {
                            alert('無效的文件格式！');
                        }
                    } catch (error) {
                        alert('文件解析失敗！');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    // 綁定拖拽事件
    bindDragEvents() {
        const icons = document.querySelectorAll('.desktop-icon');
        
        icons.forEach(icon => {
            let offsetX, offsetY, isDragging = false;
            let initialMouseX, initialMouseY;
            
            const mouseDownHandler = (e) => {
                if (e.target.closest('.desktop-icon') !== icon) return;
                
                isDragging = true;
                initialMouseX = e.clientX;
                initialMouseY = e.clientY;
                
                const rect = icon.getBoundingClientRect();
                const parentRect = icon.parentElement.getBoundingClientRect();
                offsetX = e.clientX - (rect.left - parentRect.left);
                offsetY = e.clientY - (rect.top - parentRect.top);
                
                icon.style.zIndex = '1000';
                icon.style.cursor = 'grabbing';
                icon.classList.add('dragging');
                
                e.preventDefault();
            };
            
            const mouseMoveHandler = (e) => {
                if (!isDragging) return;
                
                const parentRect = icon.parentElement.getBoundingClientRect();
                let newX = e.clientX - parentRect.left - offsetX;
                let newY = e.clientY - parentRect.top - offsetY;
                
                // 限制在父容器內
                newX = Math.max(0, Math.min(newX, parentRect.width - icon.offsetWidth));
                newY = Math.max(0, Math.min(newY, parentRect.height - icon.offsetHeight));
                
                icon.style.left = newX + 'px';
                icon.style.top = newY + 'px';
                
                e.preventDefault();
            };
            
            const mouseUpHandler = (e) => {
                if (!isDragging) return;
                
                isDragging = false;
                icon.style.zIndex = '';
                icon.style.cursor = 'grab';
                icon.classList.remove('dragging');
                
                // 保存位置
                const index = parseInt(icon.dataset.index);
                const currentWebsites = this.getCurrentWebsites();
                if (currentWebsites[index]) {
                    currentWebsites[index].position = {
                        x: parseInt(icon.style.left),
                        y: parseInt(icon.style.top)
                    };
                    this.saveWebsites();
                }
                
                e.preventDefault();
            };
            
            // 移除舊的事件監聽器
            icon.removeEventListener('mousedown', mouseDownHandler);
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            
            // 添加新的事件監聽器
            icon.addEventListener('mousedown', mouseDownHandler);
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }
    
    // 更新圖標位置
    updateIconPosition(element, x, y) {
        // 這裡可以實現更複雜的位置計算邏輯
        // 目前簡單地重新加載桌面
        this.loadDesktop();
    }

    // 加載網站數據
    loadWebsites() {
        const saved = localStorage.getItem('chrome-desktop-websites');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // 默認數據
        return {
            home: [
                { type: 'website', name: 'Gmail', url: 'https://gmail.com', icon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico' },
                { type: 'website', name: 'YouTube', url: 'https://youtube.com', icon: 'https://www.youtube.com/favicon.ico' },
                { type: 'website', name: 'Google', url: 'https://google.com', icon: 'https://www.google.com/favicon.ico' },
                { type: 'folder', name: 'Social', children: [
                    { type: 'website', name: 'Facebook', url: 'https://facebook.com', icon: 'https://www.facebook.com/favicon.ico' },
                    { type: 'website', name: 'Twitter', url: 'https://twitter.com', icon: 'https://abs.twimg.com/favicons/twitter.ico' }
                ]}
            ],
            other: []
        };
    }

    // 保存網站數據
    saveWebsites() {
        localStorage.setItem('chrome-desktop-websites', JSON.stringify(this.websites));
    }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    new ChromeDesktop();
});