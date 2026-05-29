const api = require('../../utils/api.js');

Page({
  data: {
    orderId: '',
    order: null,
    rating: 0,
    comment: '',
    images: [],
    imageUrls: [],
    stars: [1, 2, 3, 4, 5],
    isSubmitting: false,
    isEditMode: false,      // 是否为修改评价
    existingReview: null,
  },

  onLoad(options) {
    const orderId = options.orderId;
    this.setData({ orderId });
    this.loadOrderInfo(orderId);
    this.loadExistingReview(orderId);
  },

  /** 加载订单信息 */
  async loadOrderInfo(orderId) {
    try {
      const res = await api.getOrders();
      if (res.success && res.data) {
        const order = res.data.find(o => o.id === orderId);
        if (order) {
          order.totalPriceStr = order.totalPrice.toFixed(2);
          this.setData({ order });
          return;
        }
      }
    } catch (err) {
      console.log('[评价] API获取订单失败，尝试本地:', err);
    }
    const orders = wx.getStorageSync('orders') || [];
    const order = orders.find(o => o.id === orderId);
    if (order) { order.totalPriceStr = order.totalPrice.toFixed(2); }
    this.setData({ order });
  },

  /** 加载已有评价（用于修改模式） */
  async loadExistingReview(orderId) {
    try {
      const res = await api.getReviewDetail(orderId);
      if (res.success && res.data) {
        this.setData({
          isEditMode: true,
          existingReview: res.data,
          rating: res.data.rating,
          comment: res.data.comment || '',
          imageUrls: res.data.images || [],
          images: res.data.images || [],
        });
      }
    } catch (err) {
      // 本地兜底
      const orders = wx.getStorageSync('orders') || [];
      const order = orders.find(o => o.id === orderId);
      if (order && order.review) {
        this.setData({
          isEditMode: true,
          existingReview: order.review,
          rating: order.review.rating || 0,
          comment: order.review.comment || '',
        });
      }
    }
  },

  setRating(e) {
    this.setData({ rating: e.currentTarget.dataset.rating });
    wx.vibrateShort({ type: 'light' });
  },

  onCommentInput(e) {
    this.setData({ comment: e.detail.value });
  },

  /** 选择图片 */
  chooseImages() {
    const remaining = 9 - (this.data.imageUrls.length + this.data.images.length);
    if (remaining <= 0) {
      wx.showToast({ title: '最多9张图片', icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newUrls = res.tempFilePaths || [];
        this.setData({
          imageUrls: [...this.data.imageUrls, ...newUrls],
        });
      },
    });
  },

  /** 移除已选图片 */
  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const urls = [...this.data.imageUrls];
    urls.splice(idx, 1);
    this.setData({ imageUrls: urls });
  },

  /** 提交/修改评价 */
  async submitReview() {
    if (this.data.rating === 0) {
      wx.showToast({ title: '请先评分', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...', mask: true });

    // 如果有本地图片需要上传，先上传到服务器
    let uploadedImages = [...this.data.images];
    const localImages = this.data.imageUrls.filter(u => u.startsWith('http') || u.startsWith('/'));
    const pendingUpload = this.data.imageUrls.filter(u => u.startsWith('wxfile://') || u.startsWith('http://tmp/'));

    for (const path of pendingUpload) {
      try {
        const uploadRes = await this.uploadImage(path);
        if (uploadRes) uploadedImages.push(uploadRes);
      } catch (e) {
        console.log('[评价] 图片上传失败:', e);
      }
    }
    // 合并已有图片URL
    localImages.forEach(u => { if (!uploadedImages.includes(u)) uploadedImages.push(u); });

    const reviewData = {
      orderNo: this.data.orderId,
      rating: this.data.rating,
      comment: this.data.comment,
      images: uploadedImages,
    };

    try {
      let res;
      if (this.data.isEditMode) {
        res = await api.updateReview(reviewData);
      } else {
        res = await api.createReview(reviewData);
      }
      if (res.success) {
        // 同步到本地
        let orders = wx.getStorageSync('orders') || [];
        const idx = orders.findIndex(o => o.id === this.data.orderId);
        if (idx > -1) {
          orders[idx].status = 'reviewed';
          orders[idx].review = {
            rating: this.data.rating,
            comment: this.data.comment,
            images: uploadedImages,
            time: new Date().toLocaleString(),
          };
          wx.setStorageSync('orders', orders);
        }
        wx.hideLoading();
        this.setData({ isSubmitting: false });
        wx.showToast({ title: this.data.isEditMode ? '评价已修改！' : '评价成功！感谢反馈 ❤️', icon: 'success', duration: 1500 });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }
    } catch (err) {
      console.log('[评价] API失败，保存到本地:', err);
    }

    // 本地降级
    let orders = wx.getStorageSync('orders') || [];
    const idx = orders.findIndex(o => o.id === this.data.orderId);
    if (idx > -1) {
      orders[idx].status = 'reviewed';
      orders[idx].review = {
        rating: this.data.rating,
        comment: this.data.comment,
        images: uploadedImages,
        time: new Date().toLocaleString(),
      };
      wx.setStorageSync('orders', orders);
    }
    wx.hideLoading();
    this.setData({ isSubmitting: false });
    wx.showToast({ title: '评价成功！', icon: 'success', duration: 1500 });
    setTimeout(() => wx.navigateBack(), 1500);
  },

  /** 上传单张图片到服务器 */
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('admin_token') || '';
      wx.uploadFile({
        url: 'http://localhost:3001/api/upload/image',
        filePath,
        name: 'file',
        header: { Authorization: 'Bearer ' + token },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success) resolve(data.data.url);
            else reject(data.message);
          } catch (e) { reject(e); }
        },
        fail: reject,
      });
    });
  },
});
