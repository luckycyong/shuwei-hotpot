const api = require('../../utils/api.js');

Page({
  data: {
    reviews: [],
    isEmpty: true,
    loading: true,
    stats: {
      total: 0,
      averageRating: 0,
      ratingCounts: [0, 0, 0, 0, 0],
    },
  },

  onShow() {
    this.loadReviews();
  },

  async loadReviews() {
    this.setData({ loading: true });

    try {
      const [reviewRes, statsRes] = await Promise.all([
        api.getReviews(),
        api.getReviewStats(),
      ]);

      if (reviewRes.success) {
        this.setData({
          reviews: reviewRes.data || [],
          isEmpty: !reviewRes.data || reviewRes.data.length === 0,
          loading: false,
        });
      }
      if (statsRes.success && statsRes.data) {
        this.setData({ stats: statsRes.data });
      }
    } catch (err) {
      console.log('[评价展示] API加载失败，使用本地数据:', err);
      this.loadReviewsFromLocal();
    }
  },

  loadReviewsFromLocal() {
    const orders = wx.getStorageSync('orders') || [];
    const reviews = orders
      .filter(o => o.status === 'reviewed' && o.review)
      .map(o => ({
        orderId: o.id,
        tableNo: o.tableNo || '未知',
        items: o.items || [],
        totalPrice: o.totalPrice || 0,
        totalPriceStr: (o.totalPrice || 0).toFixed(2),
        rating: o.review.rating || 0,
        comment: o.review.comment || '',
        commentShort: o.review.comment && o.review.comment.length > 20
          ? o.review.comment.substring(0, 20) + '...' : (o.review.comment || ''),
        images: o.review.images || [],
        reviewTime: o.review.time || '',
      }));

    const total = reviews.length;
    const ratingCounts = [0, 0, 0, 0, 0];
    let ratingSum = 0;
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        ratingCounts[r.rating - 1]++;
        ratingSum += r.rating;
      }
    });

    this.setData({
      reviews,
      isEmpty: reviews.length === 0,
      loading: false,
      stats: { total, averageRating: total > 0 ? (ratingSum / total) : 0, ratingCounts },
    });
  },

  /** 查看评价详情 */
  showReviewDetail(e) {
    const review = e.currentTarget.dataset.review;
    const itemsStr = (review.items || []).map(i =>
      i.name + '×' + i.quantity
    ).join('、');

    let content = '⭐ ' + '⭐'.repeat(review.rating) + '\n';
    if (review.comment) content += '\n📝 ' + review.comment;
    content += '\n\n🪑 ' + review.tableNo;
    if (itemsStr) content += '\n🍽 ' + itemsStr;
    content += '\n💰 ¥' + review.totalPriceStr;

    wx.showModal({
      title: '评价详情',
      content,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#d4380d',
    });
  },
});
