Page({
        data: {
                orderId: '',
                order: null,
                rating: 0,       // 1-5星
                comment: '',
                stars: [1, 2, 3, 4, 5],
        },

        onLoad(options) {
                const orderId = options.orderId;
                const orders = wx.getStorageSync('orders') || [];
                const order = orders.find(o => o.id === orderId);
                if (order) {
                        order.totalPriceStr = order.totalPrice.toFixed(2);
                }
                this.setData({ orderId, order });
        },

        // 点击星星评分
        setRating(e) {
                const rating = e.currentTarget.dataset.rating;
                this.setData({ rating });
                wx.vibrateShort({ type: 'light' });
        },

        // 输入评价
        onCommentInput(e) {
                this.setData({ comment: e.detail.value });
        },

        // 提交评价
        submitReview() {
                if (this.data.rating === 0) {
                        wx.showToast({ title: '请先评分', icon: 'none' });
                        return;
                }
                let orders = wx.getStorageSync('orders') || [];
                const idx = orders.findIndex(o => o.id === this.data.orderId);
                if (idx > -1) {
                        orders[idx].status = 'reviewed';
                        orders[idx].review = {
                                rating: this.data.rating,
                                comment: this.data.comment,
                                time: new Date().toLocaleString(),
                        };
                        wx.setStorageSync('orders', orders);
                }
                wx.showToast({ title: '评价成功！感谢反馈 ❤️', icon: 'success', duration: 1500 });
                setTimeout(() => {
                        wx.navigateBack();
                }, 1500);
        },
});