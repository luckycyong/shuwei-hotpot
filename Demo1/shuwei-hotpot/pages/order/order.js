const api = require('../../utils/api.js');

Page({
  data: {
    orders: [],
    isEmpty: true,
    activeTab: 'all',
    filteredOrders: [],
    loading: true,
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });

    const localOrders = (wx.getStorageSync('orders') || []).map(o => ({
      ...o,
      totalPriceStr: (o.totalPrice || 0).toFixed(2),
      _source: 'local',
      _sortTime: o._sortTime || Date.parse(o.createTime) || 0,
    }));

    let apiOrders = [];
    try {
      const tableNo = wx.getStorageSync('tableNo');
      const res = await api.getOrders(tableNo || '');
      if (res.success && Array.isArray(res.data)) {
        apiOrders = res.data.map(o => ({
          ...o,
          totalPriceStr: (o.totalPrice || 0).toFixed(2),
          _source: 'api',
          _sortTime: Date.parse(o.createTime) || 0,
        }));
      }
    } catch (err) {
      console.log('[订单] API加载失败:', err);
    }

    const mergedMap = new Map();
    localOrders.forEach(o => mergedMap.set(o.id, { ...o }));
    apiOrders.forEach(o => {
      if (mergedMap.has(o.id)) {
        const local = mergedMap.get(o.id);
        mergedMap.set(o.id, {
          ...local,
          totalPrice: o.totalPrice,
          items: o.items,
          totalPriceStr: o.totalPriceStr,
          createTime: o.createTime,
          _sortTime: o._sortTime,
          status: local.status || o.status,
        });
      } else {
        mergedMap.set(o.id, { ...o });
      }
    });

    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => b._sortTime - a._sortTime);

    // 给每个订单补充 reviewPreview（20字截断）
    merged.forEach(o => {
      if (o.review && o.review.comment) {
        o.reviewPreview = o.review.comment.length > 20
          ? o.review.comment.substring(0, 20) + '...'
          : o.review.comment;
      }
    });

    this.setData({ orders: merged, isEmpty: merged.length === 0, loading: false });
    this.filterOrders();
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
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

  completeOrder(e) {
    const orderId = e.currentTarget.dataset.id;
    let localOrders = wx.getStorageSync('orders') || [];
    const localIdx = localOrders.findIndex(o => o.id === orderId);
    if (localIdx > -1 && localOrders[localIdx].status === 'paid') {
      localOrders[localIdx].status = 'completed';
      wx.setStorageSync('orders', localOrders);
    } else if (localIdx === -1) {
      const order = this.data.orders.find(o => o.id === orderId);
      if (order) {
        localOrders.unshift({ ...order, status: 'completed', _source: 'local' });
        wx.setStorageSync('orders', localOrders);
      }
    }
    try { api.updateOrderStatus(orderId, 'completed'); } catch (_) {}
    wx.showToast({ title: '订单已完成', icon: 'success' });
    this.loadOrders();
  },

  goReview(e) {
    wx.navigateTo({ url: '/pages/review/review?orderId=' + e.currentTarget.dataset.id });
  },

  /** 查看订单详情（含评价内容） */
  showDetail(e) {
    const order = e.currentTarget.dataset.order;
    const items = order.items || [];
    const itemsStr = items.map(i =>
      i.name + ' ×' + i.quantity + ' ¥' + (i.price * i.quantity).toFixed(2)
    ).join('\n');

    let detailContent = '🪑 桌号: ' + (order.tableNo || '未知') +
      '\n🕐 时间: ' + (order.createTime || '') +
      '\n📋 状态: ' + this.getStatusText(order.status) +
      '\n💳 支付方式: ' + (order.payMethod || '微信支付') +
      (order.paidTime ? '\n💰 支付时间: ' + order.paidTime : '') +
      '\n───\n' + itemsStr +
      '\n───\n🧾 合计: ¥' + (order.totalPrice || 0).toFixed(2);

    // 如果有评价，补充完整评价内容
    if (order.review) {
      detailContent += '\n\n⭐ 评价: ' + '⭐'.repeat(order.review.rating || 0);
      if (order.review.comment) {
        detailContent += '\n📝 ' + order.review.comment;
      }
    }

    wx.showModal({
      title: '订单详情 #' + order.id.toString().slice(-8),
      content: detailContent,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#d4380d',
    });
  },

  getStatusText(status) {
    const map = { paid: '已支付 · 制作中', completed: '已完成 · 待评价', reviewed: '已评价' };
    return map[status] || status;
  },
});
