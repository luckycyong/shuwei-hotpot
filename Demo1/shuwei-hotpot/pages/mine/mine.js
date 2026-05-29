const api = require('../../utils/api.js');

Page({
  data: {
    tableNo: '',
    isGuest: false,
    totalOrders: 0,
    reviewedCount: 0,
    reviewCount: 0,
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    const tableNo = wx.getStorageSync('tableNo') || '';
    const isGuest = wx.getStorageSync('isGuest') || false;

    this.setData({
      tableNo: isGuest ? '游客' : (tableNo || '未设置'),
      isGuest,
    });

    // 从后端获取统计数据
    try {
      const [orderStatsRes, reviewStatsRes] = await Promise.all([
        api.getOrderStats(),
        api.getReviewStats(),
      ]);

      if (orderStatsRes.success && orderStatsRes.data) {
        this.setData({
          totalOrders: orderStatsRes.data.totalOrders || 0,
        });
      }
      if (reviewStatsRes.success && reviewStatsRes.data) {
        this.setData({
          reviewedCount: reviewStatsRes.data.total || 0,
          reviewCount: reviewStatsRes.data.total || 0,
        });
      }
      return;
    } catch (err) {
      console.log('[我的] API加载失败，使用本地数据:', err);
    }

    // 降级：从本地存储读取
    const orders = wx.getStorageSync('orders') || [];
    const reviewedCount = orders.filter(o => o.status === 'reviewed').length;
    this.setData({
      totalOrders: orders.length,
      reviewedCount,
      reviewCount: reviewedCount,
    });
  },

  viewReviews() {
    wx.navigateTo({ url: '/pages/reviews/reviews' });
  },

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
          wx.setStorageSync('isGuest', false);
          this.setData({ tableNo: res.content.trim(), isGuest: false });
          wx.showToast({ title: '桌号已更新', icon: 'success' });
        }
      }
    });
  },

  clearAllData() {
    wx.showModal({
      title: '⚠️ 清除所有数据',
      content: '将清除购物车记录，确定继续？',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('cart', {});
          wx.setStorageSync('orders', []);
          this.setData({ totalOrders: 0, reviewedCount: 0, reviewCount: 0 });
          wx.removeTabBarBadge({ index: 1 });
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  contactShop() {
    wx.showModal({
      title: '蜀味火锅',
      content: '📞 电话: 028-8888-6666\n📍 地址: 成都市锦江区火锅路88号\n🕐 营业: 11:00-23:00',
      showCancel: false,
      confirmText: '好的',
      confirmColor: '#d4380d',
    });
  },
});
