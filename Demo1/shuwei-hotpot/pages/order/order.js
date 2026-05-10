Page({
        data: {
                orders: [],
                isEmpty: true,
                activeTab: 'all', // all, paid, completed, reviewed
                filteredOrders: [],
        },

        onShow() {
                this.loadOrders();
        },

        loadOrders() {
                const orders = wx.getStorageSync('orders') || [];
                // 给每个订单加上格式化后的总价字段
                orders.forEach(order => {
                        order.totalPriceStr = order.totalPrice.toFixed(2);
                });
                this.setData({ orders, isEmpty: orders.length === 0 });
                this.filterOrders();
        },

        switchTab(e) {
                const tab = e.currentTarget.dataset.tab;
                this.setData({ activeTab: tab });
                this.filterOrders();
        },

        filterOrders() {
                const { orders, activeTab } = this.data;
                let filtered = orders;
                if (activeTab === 'paid') filtered = orders.filter(o => o.status === 'paid');
                if (activeTab === 'completed') filtered = orders.filter(o => o.status === 'completed');
                if (activeTab === 'reviewed') filtered = orders.filter(o => o.status === 'reviewed');
                this.setData({ filteredOrders: filtered });
        },

        // 确认完成（模拟后厨出餐完成）
        completeOrder(e) {
                const orderId = e.currentTarget.dataset.id;
                let orders = wx.getStorageSync('orders') || [];
                const idx = orders.findIndex(o => o.id === orderId);
                if (idx > -1 && orders[idx].status === 'paid') {
                        orders[idx].status = 'completed';
                        wx.setStorageSync('orders', orders);
                        this.loadOrders();
                        wx.showToast({ title: '订单已完成', icon: 'success' });
                }
        },

        // 去评价
        goReview(e) {
                const orderId = e.currentTarget.dataset.id;
                wx.navigateTo({ url: '/pages/review/review?orderId=' + orderId });
        },

        // 查看订单详情
        showDetail(e) {
                const order = e.currentTarget.dataset.order;
                const itemsStr = order.items.map(i => i.name + ' ×' + i.quantity + ' ¥' + (i.price * i.quantity).toFixed(2)).join('\\n');
                wx.showModal({
                        title: '订单详情 - ' + order.id,
                        content: '桌号: ' + order.tableNo +
                                '\\n时间: ' + order.createTime +
                                '\\n状态: ' + this.getStatusText(order.status) +
                                '\\n---\\n' + itemsStr +
                                '\\n---\\n合计: ¥' + order.totalPrice.toFixed(2),
                        showCancel: false,
                        confirmText: '知道了',
                        confirmColor: '#d4380d',
                });
        },

        getStatusText(status) {
                const map = { paid: '已支付·制作中', completed: '已完成·待评价', reviewed: '已评价' };
                return map[status] || status;
        },
});