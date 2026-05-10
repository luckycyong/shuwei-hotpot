const { menuData } = require('../../utils/mock-data.js');

Page({
        data: {
                categories: [],
                allItems: [],
                filteredItems: [],
                activeCatId: 'cat1',
                cartCount: 0,
                tableNo: '',
                showTableModal: false,
                tableInput: '',
                searchKeyword: '',
        },

        onLoad() {
                this.setData({
                        categories: menuData.categories,
                        allItems: menuData.items,
                });
                this.filterByCategory('cat1');
                this.updateCartCount();

                // 检查是否已绑定桌号
                const savedTable = wx.getStorageSync('tableNo');
                if (savedTable) {
                        this.setData({ tableNo: savedTable });
                } else {
                        // 首次进入提示输入桌号
                        this.setData({ showTableModal: true });
                }
        },

        onShow() {
                this.updateCartCount();
        },

        // 切换分类
        switchCategory(e) {
                const catId = e.currentTarget.dataset.catid;
                this.setData({ activeCatId: catId });
                this.filterByCategory(catId);
        },

        filterByCategory(catId) {
                const keyword = this.data.searchKeyword.toLowerCase();
                let items = this.data.allItems.filter(item => item.catId === catId);
                if (keyword) {
                        items = items.filter(item =>
                                item.name.toLowerCase().includes(keyword) ||
                                item.desc.toLowerCase().includes(keyword)
                        );
                }
                this.setData({ filteredItems: items });
        },

        // 搜索
        onSearchInput(e) {
                this.setData({ searchKeyword: e.detail.value });
                this.filterByCategory(this.data.activeCatId);
        },

        // 添加到购物车
        addToCart(e) {
                const item = e.currentTarget.dataset.item;
                let cart = wx.getStorageSync('cart') || {};
                if (cart[item.id]) {
                        cart[item.id].quantity += 1;
                } else {
                        cart[item.id] = { ...item, quantity: 1 };
                }
                wx.setStorageSync('cart', cart);
                this.updateCartCount();

                // 加菜动画反馈
                wx.showToast({ title: '已加入购物车', icon: 'success', duration: 800 });
                wx.vibrateShort({ type: 'light' });
        },

        // 更新购物车数量角标
        updateCartCount() {
                const cart = wx.getStorageSync('cart') || {};
                let count = 0;
                Object.values(cart).forEach(v => { count += v.quantity; });
                this.setData({ cartCount: count });
                if (count > 0) {
                        wx.setTabBarBadge({ index: 1, text: count > 99 ? '99+' : String(count) });
                } else {
                        wx.removeTabBarBadge({ index: 1 });
                }
        },

        // 桌号弹窗
        confirmTable() {
                const no = this.data.tableInput.trim();
                if (!no) {
                        wx.showToast({ title: '请输入桌号', icon: 'none' });
                        return;
                }
                wx.setStorageSync('tableNo', no);
                this.setData({ tableNo: no, showTableModal: false });
                wx.showToast({ title: '绑定桌号: ' + no, icon: 'success' });
        },

        hideTableModal() {
                if (wx.getStorageSync('tableNo')) {
                        this.setData({ showTableModal: false });
                }
        },

        onTableInput(e) {
                this.setData({ tableInput: e.detail.value });
        },

        // 跳转购物车
        goToCart() {
                wx.switchTab({ url: '/pages/cart/cart' });
        },
});