const adminApi = require('../../../utils/admin-api.js');

Page({
  data: {
    items: [],
    filteredItems: [],
    categories: [],
    isEmpty: false,
    loading: true,
    // 筛选
    filterCatId: 0,      // 0=全部
    filterStatus: -1,     // -1=全部 0=下架 1=上架
    searchKeyword: '',
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const [catRes, itemRes] = await Promise.all([
        adminApi.getCategories(),
        adminApi.getAllItems(),
      ]);

      const categories = catRes.success ? catRes.data : [];
      // 按 name 去重（防止数据库有重复分类）
      const seen = new Set();
      const uniqueCats = [];
      categories.forEach(c => {
        if (!seen.has(c.name)) { seen.add(c.name); uniqueCats.push(c); }
      });
      const items = itemRes.success ? itemRes.data : [];

      this.setData({
        categories: uniqueCats,
        items,
        isEmpty: items.length === 0,
        loading: false,
      });
      this.applyFilter();
    } catch (err) {
      wx.showToast({ title: '加载失败: ' + err.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  /** 按分类筛选 */
  onFilterCategory(e) {
    const catId = parseInt(e.currentTarget.dataset.id);
    this.setData({ filterCatId: catId });
    this.applyFilter();
  },

  /** 按状态筛选 */
  onFilterStatus(e) {
    const status = parseInt(e.currentTarget.dataset.status);
    this.setData({ filterStatus: status });
    this.applyFilter();
  },

  /** 搜索 */
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.applyFilter();
  },

  /** 综合筛选 */
  applyFilter() {
    const { items, filterCatId, filterStatus, searchKeyword } = this.data;
    let filtered = [...items];

    if (filterCatId > 0) {
      filtered = filtered.filter(i => i.cat_id === filterCatId);
    }
    if (filterStatus !== -1) {
      filtered = filtered.filter(i => i.status === filterStatus);
    }
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(kw) ||
        (i.description && i.description.toLowerCase().includes(kw))
      );
    }

    this.setData({ filteredItems: filtered });
  },

  /** 新增菜品 */
  goAdd() {
    wx.navigateTo({
      url: '/pages/admin/menu-edit/menu-edit?mode=add',
    });
  },

  /** 编辑菜品 */
  goEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/admin/menu-edit/menu-edit?mode=edit&id=' + id,
    });
  },

  /** 上架/下架切换 */
  async toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const newStatus = status === 1 ? 0 : 1;
    const action = newStatus === 1 ? '上架' : '下架';

    wx.showModal({
      title: '确认' + action,
      content: '确定将此菜品' + action + '吗？',
      confirmColor: '#d4380d',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await adminApi.toggleStatus(id, newStatus);
            if (result.success) {
              wx.showToast({ title: action + '成功', icon: 'success' });
              this.loadData();
            }
          } catch (err) {
            wx.showToast({ title: err.message, icon: 'none' });
          }
        }
      },
    });
  },

  /** 删除菜品 */
  async deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '⚠️ 确认删除',
      content: '删除后不可恢复，确定要删除此菜品吗？',
      confirmColor: '#e74c3c',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await adminApi.deleteItem(id);
            if (result.success) {
              wx.showToast({ title: '删除成功', icon: 'success' });
              this.loadData();
            }
          } catch (err) {
            wx.showToast({ title: err.message, icon: 'none' });
          }
        }
      },
    });
  },

  /** 获取分类名 */
  getCatName(catId) {
    const cat = this.data.categories.find(c => c.id === catId);
    return cat ? cat.name : '未分类';
  },

  getStatusText(status) {
    return status === 1 ? '上架中' : '已下架';
  },
});
