const adminApi = require('../../utils/admin-api.js');

Page({
  data: {
    isLoggedIn: false,
    // 登录表单
    username: '',
    password: '',
    // 管理员信息
    adminInfo: null,
    // 统计数据
    stats: {
      totalItems: 0,
      activeItems: 0,
      totalOrders: 0,
      totalReviews: 0,
    },
    // 操作反馈
    loading: false,
  },

  onShow() {
    this.checkLogin();
  },

  /** 检查是否已登录 */
  checkLogin() {
    const token = wx.getStorageSync('admin_token');
    if (token) {
      this.setData({ isLoggedIn: true });
      this.loadDashboard();
    } else {
      this.setData({ isLoggedIn: false });
    }
  },

  /** 加载后台首页数据 */
  async loadDashboard() {
    try {
      // 获取管理员信息
      const infoRes = await adminApi.getAdminInfo();
      if (infoRes.success) {
        this.setData({ adminInfo: infoRes.data });
      }

      // 获取统计数据
      const itemsRes = await adminApi.getAllItems();
      if (itemsRes.success) {
        const items = itemsRes.data;
        this.setData({
          'stats.totalItems': items.length,
          'stats.activeItems': items.filter(i => i.status === 1).length,
        });
      }
    } catch (err) {
      console.error('加载后台数据失败', err);
      // token 过期时清除登录
      wx.removeStorageSync('admin_token');
      wx.removeStorageSync('admin_info');
      this.setData({ isLoggedIn: false });
    }
  },

  /** 输入用户名 */
  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  /** 输入密码 */
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  /** 登录 */
  async doLogin() {
    const { username, password } = this.data;
    if (!username || !password) {
      wx.showToast({ title: '请输入用户名和密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await adminApi.login(username, password);
      if (res.success) {
        wx.setStorageSync('admin_token', res.data.token);
        wx.setStorageSync('admin_info', res.data.admin);
        this.setData({
          isLoggedIn: true,
          adminInfo: res.data.admin,
          password: '',
          loading: false,
        });
        wx.showToast({ title: '登录成功', icon: 'success' });
        this.loadDashboard();
      } else {
        wx.showToast({ title: res.message || '登录失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (err) {
      wx.showToast({ title: err.message || '连接失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  /** 退出登录 */
  logout() {
    wx.showModal({
      title: '退出确认',
      content: '确定退出管理员登录？',
      confirmColor: '#d4380d',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('admin_token');
          wx.removeStorageSync('admin_info');
          this.setData({ isLoggedIn: false, adminInfo: null });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      },
    });
  },

  /** 跳转菜品管理 */
  goMenuManage() {
    wx.navigateTo({ url: '/pages/admin/menu-list/menu-list' });
  },
});
