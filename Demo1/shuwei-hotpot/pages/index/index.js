const api = require('../../utils/api.js');

Page({
  data: {
    categories: [],
    allItems: [],
    filteredItems: [],
    activeCatId: 0,
    cartCount: 0,
    tableNo: '',
    isGuest: false,
    showTableModal: false,
    tableInput: '',
    searchKeyword: '',
    loading: true,
    loadError: false,
    refreshing: false,   // 下拉刷新中
  },

  onLoad() {
    this.loadMenuData();
    this.updateCartCount();

    // 检查桌号
    const savedTable = wx.getStorageSync('tableNo');
    const savedGuest = wx.getStorageSync('isGuest');
    if (savedTable) {
      this.setData({ tableNo: savedTable });
    } else if (savedGuest) {
      this.setData({ isGuest: true, tableNo: '游客' });
    } else {
      this.setData({ showTableModal: true });
    }
  },

  onShow() {
    this.updateCartCount();
    // 每次切换到此页面时，后台静默刷新菜品数据（管理员新增/修改后立即可见）
    this.loadMenuData(true);
  },

  /** 从数据库加载菜单数据
   *  @param {boolean} silent - 静默刷新（不显示加载动画，用于 onShow 自动刷新）
   */
  async loadMenuData(silent) {
    if (!silent) {
      this.setData({ loading: true, loadError: false });
    }
    try {
      const [catRes, itemRes] = await Promise.all([
        api.getCategories(),
        api.getItems(),
      ]);

      // 加载分类（按名称去重，避免数据库重复数据）
      if (catRes.success && Array.isArray(catRes.data)) {
        const seen = new Set();
        const cats = [];
        catRes.data.forEach(c => {
          if (!seen.has(c.name)) { seen.add(c.name); cats.push(c); }
        });
        this.setData({ categories: cats });
      }

      // 加载菜品（按 name+catId 去重，防止重复数据源）
      if (itemRes.success && Array.isArray(itemRes.data)) {
        const seen = new Set();
        const items = [];
        itemRes.data.forEach(item => {
          const key = item.name + '|' + item.catId;
          if (!seen.has(key)) {
            seen.add(key);
            const hasDiscount = item.discountPrice && parseFloat(item.discountPrice) > 0 && parseFloat(item.discountPrice) < parseFloat(item.price);
            items.push({
              ...item,
              desc: item.description || '',
              spicyText: '🌶️'.repeat(item.spicy || 0),
              effectivePrice: hasDiscount ? parseFloat(item.discountPrice) : parseFloat(item.price),
              hasDiscount: hasDiscount,
              // 真实图片和 emoji 兼容
              displayImage: item.imageUrl || item.image,
            });
          }
        });
        this.setData({ allItems: items });

        // 默认选中第一个分类
        const cats = this.data.categories;
        if (cats.length > 0) {
          const firstCatId = cats[0].id;
          this.setData({ activeCatId: firstCatId });
          this.filterByCategory(firstCatId);
        }
      } else {
        this.setData({ filteredItems: [] });
      }

      this.setData({ loading: false });
    } catch (err) {
      console.error('加载菜单失败:', err);
      this.setData({ loading: false, loadError: true });
    }
  },

  /** 下拉刷新 */
  onRefresh() {
    this.setData({ refreshing: true });
    this.loadMenuData(false).then(() => {
      this.setData({ refreshing: false });
    }).catch(() => {
      this.setData({ refreshing: false });
    });
  },

  /** 按分类筛选 */
  switchCategory(e) {
    const catId = parseInt(e.currentTarget.dataset.catid);
    this.setData({ activeCatId: catId });
    this.filterByCategory(catId);
  },

  filterByCategory(catId) {
    const keyword = this.data.searchKeyword.toLowerCase();
    let items = this.data.allItems.filter(item => item.catId === catId);
    if (keyword) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(keyword) ||
        (item.description && item.description.toLowerCase().includes(keyword))
      );
    }
    this.setData({ filteredItems: items });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.filterByCategory(this.data.activeCatId);
  },

  /** 加入购物车 */
  addToCart(e) {
    const item = e.currentTarget.dataset.item;
    let cart = wx.getStorageSync('cart') || {};
    const key = String(item.id);
    if (cart[key]) {
      cart[key].quantity += 1;
    } else {
      // 统一转为字符串key，使用生效价（折扣价或原价）
      cart[key] = {
        id: key,
        catId: item.catId,
        name: item.name,
        price: item.effectivePrice,
        originalPrice: item.hasDiscount ? item.price : undefined,
        unit: item.unit,
        image: item.image || '🍽',
        description: item.description || '',
        tags: item.tags || [],
        quantity: 1,
      };
    }
    wx.setStorageSync('cart', cart);
    this.updateCartCount();
    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 800 });
    wx.vibrateShort({ type: 'light' });
  },

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

  openTableModal() {
    this.setData({ showTableModal: true });
  },

  hideTableModal() {
    const hasTable = wx.getStorageSync('tableNo');
    const isGuest = wx.getStorageSync('isGuest');
    if (hasTable || isGuest) {
      this.setData({ showTableModal: false });
    }
  },

  confirmTable() {
    const no = this.data.tableInput.trim();
    if (!no) {
      wx.showToast({ title: '请输入桌号', icon: 'none' });
      return;
    }
    wx.setStorageSync('tableNo', no);
    wx.setStorageSync('isGuest', false);
    this.setData({
      tableNo: no, isGuest: false,
      showTableModal: false, tableInput: '',
    });
    wx.showToast({ title: '桌号: ' + no, icon: 'success' });
  },

  enterGuestMode() {
    wx.setStorageSync('isGuest', true);
    this.setData({
      isGuest: true, tableNo: '游客',
      showTableModal: false, tableInput: '',
    });
    wx.showToast({ title: '欢迎浏览 👋', icon: 'none' });
  },

  onTableInput(e) {
    this.setData({ tableInput: e.detail.value });
  },

  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },
});
