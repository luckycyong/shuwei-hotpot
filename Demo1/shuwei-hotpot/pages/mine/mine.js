Page({
        data: {
                tableNo: '',
                totalOrders: 0,
                reviewedCount: 0,
        },

        onShow() {
                const tableNo = wx.getStorageSync('tableNo') || '未设置';
                const orders = wx.getStorageSync('orders') || [];
                const reviewedCount = orders.filter(o => o.status === 'reviewed').length;
                this.setData({
                        tableNo,
                        totalOrders: orders.length,
                        reviewedCount,
                });
        },

        // 切换桌号
        changeTable() {
                wx.showModal({
                        title: '切换桌号',
                        content: '请输入新的桌号',
                        editable: true,
                        placeholderText: '例如: B08',
                        confirmColor: '#d4380d',
                        success: (res) => {
                                if (res.confirm && res.content.trim()) {
                                        wx.setStorageSync('tableNo', res.content.trim());
                                        this.setData({ tableNo: res.content.trim() });
                                        wx.showToast({ title: '桌号已更新', icon: 'success' });
                                }
                        }
                });
        },

        // 清除所有数据
        clearAllData() {
                wx.showModal({
                        title: '⚠️ 清除所有数据',
                        content: '将清除购物车和所有订单记录，确定继续？',
                        confirmColor: '#e74c3c',
                        success: (res) => {
                                if (res.confirm) {
                                        wx.setStorageSync('cart', {});
                                        wx.setStorageSync('orders', []);
                                        this.setData({ totalOrders: 0, reviewedCount: 0 });
                                        wx.removeTabBarBadge({ index: 1 });
                                        wx.showToast({ title: '已清除', icon: 'success' });
                                }
                        }
                });
        },

        // 联系客服
        contactShop() {
                wx.showModal({
                        title: '蜀味火锅',
                        content: '📞 电话: 028-8888-6666\\n📍 地址: 成都市锦江区火锅路88号\\n🕐 营业: 11:00-23:00',
                        showCancel: false,
                        confirmText: '好的',
                        confirmColor: '#d4380d',
                });
        },
});