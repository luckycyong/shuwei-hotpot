App({
  onLaunch() {
    // 初始化本地存储中的订单数据
    if (!wx.getStorageSync('orders')) {
      wx.setStorageSync('orders', []);
    }
    // 初始化购物车
    if (!wx.getStorageSync('cart')) {
      wx.setStorageSync('cart', {});
    }
    console.log('🍲 蜀味火锅小程序启动');
  },

  globalData: {
    tableNo: '',       // 当前桌号
    userInfo: null,    // 用户信息
    shopName: '蜀味火锅',
    shopPhone: '028-8888-6666'
  }
});