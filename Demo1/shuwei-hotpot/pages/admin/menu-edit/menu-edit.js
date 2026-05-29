const adminApi = require('../../../utils/admin-api.js');

Page({
  data: {
    mode: 'add',
    itemId: null,
    categories: [],
    catIndex: 0,
    isSubmitting: false,

    // 表单字段
    name: '',
    catId: 0,
    price: '',
    discountPrice: '',
    unit: '份',
    description: '',
    image: '🍽',
    imageUrl: '',           // 保存时最终提交的URL
    localImagePath: '',     // 本地临时路径（仅预览用）
    spicy: 0,
    tags: '',
    status: 1,

    spicyOptions: [
      { value: 0, label: '不辣' },
      { value: 1, label: '🌶️' },
      { value: 2, label: '🌶️🌶️' },
      { value: 3, label: '🌶️🌶️🌶️' },
      { value: 4, label: '🌶️🌶️🌶️🌶️' },
      { value: 5, label: '🌶️🌶️🌶️🌶️🌶️' },
    ],
    emojiList: [
      '🍽', '🍲', '🥩', '🦐', '🥬', '🍡', '🍜', '🥤',
      '🍅', '🍄', '🐑', '🫘', '🦆', '🧠', '🥓', '🐟',
      '🦀', '🥔', '🪷', '🍤', '🧆', '🍚', '🍖', '🍺', '🥛',
    ],
  },

  onLoad(options) {
    const mode = options.mode || 'add';
    const itemId = options.id || null;
    this.setData({ mode, itemId });
    this.loadCategories();
    if (mode === 'edit' && itemId) {
      wx.setNavigationBarTitle({ title: '编辑菜品' });
      this.loadItem(itemId);
    } else {
      wx.setNavigationBarTitle({ title: '新增菜品' });
    }
  },

  async loadCategories() {
    try {
      const res = await adminApi.getCategories();
      if (res.success && res.data.length > 0) {
        const seen = new Set();
        const cats = [];
        res.data.forEach(c => {
          if (!seen.has(c.name)) { seen.add(c.name); cats.push(c); }
        });
        this.setData({ categories: cats, catId: cats[0].id, catIndex: 0 });
      }
    } catch (err) {
      wx.showToast({ title: '加载分类失败', icon: 'none' });
    }
  },

  async loadItem(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await adminApi.getItem(id);
      wx.hideLoading();
      if (res.success) {
        const item = res.data;
        const catIndex = this.data.categories.findIndex(c => c.id === item.cat_id);
        this.setData({
          name: item.name || '',
          catId: item.cat_id,
          catIndex: catIndex >= 0 ? catIndex : 0,
          price: String(item.price || ''),
          discountPrice: item.discount_price ? String(item.discount_price) : '',
          unit: item.unit || '份',
          description: item.description || '',
          image: item.image || '🍽',
          imageUrl: item.image_url || item.imageUrl || '',
          spicy: item.spicy || 0,
          tags: (item.tags && Array.isArray(item.tags)) ? item.tags.join(',') : (item.tags || ''),
          status: item.status,
        });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onPriceInput(e) { this.setData({ price: e.detail.value }); },
  onDiscountInput(e) { this.setData({ discountPrice: e.detail.value }); },
  onUnitInput(e) { this.setData({ unit: e.detail.value }); },
  onDescInput(e) { this.setData({ description: e.detail.value }); },
  onImageInput(e) { this.setData({ image: e.detail.value }); },
  onImageUrlInput(e) { this.setData({ imageUrl: e.detail.value, localImagePath: '' }); },
  onTagsInput(e) { this.setData({ tags: e.detail.value }); },

  onSpicyInput(e) {
    const val = parseInt(e.currentTarget.dataset.value) || 0;
    this.setData({ spicy: val });
  },

  onCatChange(e) {
    const idx = parseInt(e.detail.value);
    const cat = this.data.categories[idx];
    if (cat) { this.setData({ catId: cat.id, catIndex: idx }); }
  },

  onStatusChange(e) {
    this.setData({ status: parseInt(e.detail.value) });
  },

  /** 选择图片 — 只保留本地预览，不触发任何上传或网络请求 */
  pickImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 只保存本地路径用于预览，不上传
        const path = res.tempFilePaths[0];
        this.setData({ localImagePath: path, imageUrl: '' });
        wx.showToast({ title: '图片已选择，保存时自动上传', icon: 'none', duration: 1500 });
      },
      fail: () => {
        // 用户取消或失败，什么也不做
      },
    });
  },

  /** 提交表单 — 如果有本地图片，先上传再保存 */
  async submitForm() {
    const { mode, name, catId, price, discountPrice, unit, description, image, imageUrl, localImagePath, spicy, tags, status } = this.data;

    if (!name.trim()) { wx.showToast({ title: '请输入菜品名称', icon: 'none' }); return; }
    if (!catId || catId === 0) { wx.showToast({ title: '请选择菜品分类', icon: 'none' }); return; }
    if (!price || parseFloat(price) <= 0) { wx.showToast({ title: '请输入有效价格', icon: 'none' }); return; }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '保存中...', mask: true });

    // 如果有本地图片，先上传
    let finalImageUrl = imageUrl || '';
    if (localImagePath) {
      try {
        const uploadRes = await this.uploadLocalImage(localImagePath);
        if (uploadRes) finalImageUrl = uploadRes;
      } catch (e) {
        console.log('[保存] 图片上传失败，继续保存:', e);
      }
    }

    const payload = {
      name: name.trim(),
      catId,
      price: parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : null,
      unit: unit || '份',
      description: description.trim(),
      image: image || '🍽',
      imageUrl: finalImageUrl,
      spicy: parseInt(spicy) || 0,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      status: parseInt(status),
    };

    try {
      let res;
      if (mode === 'add') res = await adminApi.addItem(payload);
      else res = await adminApi.updateItem(this.data.itemId, payload);

      wx.hideLoading();

      if (res.success) {
        if (mode === 'add') {
          this.setData({ isSubmitting: false });
          wx.showToast({ title: '✅ 新增成功，可继续添加', icon: 'none', duration: 1500 });
          this.resetForm();
        } else {
          this.setData({ isSubmitting: false });
          wx.showToast({ title: '✅ 保存成功', icon: 'none', duration: 1500 });
        }
      } else {
        this.setData({ isSubmitting: false });
        wx.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ isSubmitting: false });
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  },

  /** 重置表单（新增模式下清空字段） */
  resetForm() {
    const cats = this.data.categories;
    this.setData({
      name: '',
      price: '',
      discountPrice: '',
      unit: '份',
      description: '',
      image: '🍽',
      imageUrl: '',
      localImagePath: '',
      spicy: 0,
      tags: '',
      status: 1,
      catId: cats.length > 0 ? cats[0].id : 0,
      catIndex: 0,
    });
  },

  /** 返回菜品列表 */
  goBack() {
    wx.navigateBack();
  },

  /** 上传本地图片到服务器，返回URL */
  uploadLocalImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: 'http://localhost:3001/api/upload/image',
        filePath,
        name: 'file',
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success && data.data) resolve(data.data.url);
            else reject(data.message || '上传失败');
          } catch (e) { reject(e); }
        },
        fail: (err) => reject(err),
      });
    });
  },

  selectEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji;
    this.setData({ image: emoji });
  },
});
