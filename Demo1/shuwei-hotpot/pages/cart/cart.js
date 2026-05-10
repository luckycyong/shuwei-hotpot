Page({
        data: {
                cartItems: [],
                totalPrice: 0,
                totalCount: 0,
                tableNo: '',
                isEmpty: true,
        },

        onShow() {
                this.loadCart();
        },

        loadCart() {
                const cart = wx.getStorageSync('cart') || {};
                const tableNo = wx.getStorageSync('tableNo') || '未设置';
                const items = Object.values(cart);
                let totalPrice = 0;
                let totalCount = 0;
                items.forEach(item => {
                        totalPrice += item.price * item.quantity;
                        totalCount += item.quantity;
                        // ✅ 新增：在数据层预先格式化小计
                        item.subtotal = (item.price * item.quantity).toFixed(2);
                });
                this.setData({
                        cartItems: items,
                        totalPrice: totalPrice.toFixed(2),
                        totalCount,
                        tableNo,
                        isEmpty: items.length === 0,
                });
                // 更新tabBar角标
                if (totalCount > 0) {
                        wx.setTabBarBadge({ index: 1, text: totalCount > 99 ? '99+' : String(totalCount) });
                } else {
                        wx.removeTabBarBadge({ index: 1 });
                }
        },

        // 增加数量
        increase(e) {
                const id = e.currentTarget.dataset.id;
                let cart = wx.getStorageSync('cart') || {};
                if (cart[id]) {
                        cart[id].quantity += 1;
                        wx.setStorageSync('cart', cart);
                        this.loadCart();
                }
        },

        // 减少数量
        decrease(e) {
                const id = e.currentTarget.dataset.id;
                let cart = wx.getStorageSync('cart') || {};
                if (cart[id]) {
                        cart[id].quantity -= 1;
                        if (cart[id].quantity <= 0) {
                                delete cart[id];
                        }
                        wx.setStorageSync('cart', cart);
                        this.loadCart();
                }
        },

        // 删除单项
        removeItem(e) {
                const id = e.currentTarget.dataset.id;
                wx.showModal({
                        title: '确认移除',
                        content: '确定要从购物车移除此菜品吗？',
                        confirmColor: '#d4380d',
                        success: (res) => {
                                if (res.confirm) {
                                        let cart = wx.getStorageSync('cart') || {};
                                        delete cart[id];
                                        wx.setStorageSync('cart', cart);
                                        this.loadCart();
                                        wx.showToast({ title: '已移除', icon: 'success' });
                                }
                        }
                });
        },

        // 清空购物车
        clearCart() {
                if (this.data.isEmpty) return;
                wx.showModal({
                        title: '清空购物车',
                        content: '确定要清空所有菜品吗？',
                        confirmColor: '#d4380d',
                        success: (res) => {
                                if (res.confirm) {
                                        wx.setStorageSync('cart', {});
                                        this.loadCart();
                                        wx.showToast({ title: '购物车已清空', icon: 'success' });
                                }
                        }
                });
        },

        // 去结算（模拟支付）
        checkout() {
                if (this.data.isEmpty) {
                        wx.showToast({ title: '购物车为空', icon: 'none' });
                        return;
                }
                if (!wx.getStorageSync('tableNo')) {
                        wx.showToast({ title: '请先绑定桌号', icon: 'none' });
                        return;
                }
                wx.showModal({
                        title: '确认下单',
                        content: '桌号: ' + this.data.tableNo +
                                '\\n共' + this.data.totalCount + '件商品\\n合计: ¥' + this.data.totalPrice,
                        confirmColor: '#d4380d',
                        confirmText: '确认支付',
                        success: (res) => {
                                if (res.confirm) {
                                        this.processPayment();
                                }
                        }
                });
        },

        // 模拟支付流程
        processPayment() {
                wx.showLoading({ title: '支付中...' });
                setTimeout(() => {
                        wx.hideLoading();
                        // 创建订单
                        const order = {
                                id: 'ORD' + Date.now(),
                                items: [...this.data.cartItems],
                                totalPrice: parseFloat(this.data.totalPrice),
                                totalCount: this.data.totalCount,
                                tableNo: this.data.tableNo || wx.getStorageSync('tableNo'),
                                status: 'paid', // paid, completed, reviewed
                                createTime: new Date().toLocaleString(),
                        };
                        let orders = wx.getStorageSync('orders') || [];
                        orders.unshift(order);
                        wx.setStorageSync('orders', orders);
                        // 清空购物车
                        wx.setStorageSync('cart', {});
                        this.loadCart();
                        wx.showToast({ title: '支付成功！', icon: 'success', duration: 1500 });
                        // 跳转订单页
                        setTimeout(() => {
                                wx.switchTab({ url: '/pages/order/order' });
                        }, 1500);
                }, 1200);
        },
});