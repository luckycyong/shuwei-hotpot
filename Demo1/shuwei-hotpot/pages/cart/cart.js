const { requestPayment, generateOrderNo } = require('../../utils/payment.js');
const api = require('../../utils/api.js');

Page({
  data: {
    cartItems: [],
    totalPrice: 0,
    totalCount: 0,
    tableNo: '',
    isEmpty: true,
    isPaying: false,
  },

  onShow() {
    this.loadCart();
    // 与数据库同步最新价格（管理员修改价格后购物车实时更新）
    this.syncCartPrices();
  },

  loadCart() {
    const cart = wx.getStorageSync('cart') || {};
    const tableNo = wx.getStorageSync('tableNo') || '未设置';
    const items = Object.values(cart);
    let totalPrice = 0;
    let totalCount = 0;
    items.forEach(item => {
      totalPrice += item.price * item.quantity;
      totalCount += item.quantity;
      item.subtotal = (item.price * item.quantity).toFixed(2);
    });
    this.setData({
      cartItems: items,
      totalPrice: totalPrice.toFixed(2),
      totalCount,
      tableNo,
      isEmpty: items.length === 0,
      isPaying: false,
    });
    if (totalCount > 0) {
      wx.setTabBarBadge({ index: 1, text: totalCount > 99 ? '99+' : String(totalCount) });
    } else {
      wx.removeTabBarBadge({ index: 1 });
    }
  },

  /** 从数据库同步购物车商品最新价格和折扣 */
  async syncCartPrices() {
    try {
      const res = await api.getItems();
      if (!res.success || !Array.isArray(res.data)) return;

      // 建立 id → { effectivePrice, originalPrice, discountPrice } 映射
      const dbMap = {};
      res.data.forEach(item => {
        const hasDiscount = item.discountPrice && parseFloat(item.discountPrice) > 0 && parseFloat(item.discountPrice) < parseFloat(item.price);
        dbMap[String(item.id)] = {
          price: hasDiscount ? parseFloat(item.discountPrice) : parseFloat(item.price),
          originalPrice: hasDiscount ? parseFloat(item.price) : undefined,
          discountPrice: hasDiscount ? parseFloat(item.discountPrice) : null,
        };
      });

      let cart = wx.getStorageSync('cart') || {};
      let changed = false;

      Object.keys(cart).forEach(key => {
        if (dbMap[key]) {
          const newPrice = dbMap[key].price;
          if (newPrice !== cart[key].price) {
            const oldPrice = cart[key].price;
            cart[key].price = newPrice;
            cart[key].originalPrice = dbMap[key].originalPrice;
            cart[key].subtotal = (cart[key].price * cart[key].quantity).toFixed(2);
            changed = true;
            console.log(`[价格同步] ${cart[key].name}: ¥${oldPrice} → ¥${newPrice}`);
          }
        }
      });

      if (changed) {
        wx.setStorageSync('cart', cart);
        this.loadCart();
        wx.showToast({ title: '部分菜品价格已更新', icon: 'none', duration: 1500 });
      }
    } catch (err) {
      console.log('[价格同步] 失败:', err);
    }
  },

  increase(e) {
    const id = e.currentTarget.dataset.id;
    let cart = wx.getStorageSync('cart') || {};
    if (cart[id]) {
      cart[id].quantity += 1;
      wx.setStorageSync('cart', cart);
      this.loadCart();
    }
  },

  decrease(e) {
    const id = e.currentTarget.dataset.id;
    let cart = wx.getStorageSync('cart') || {};
    if (cart[id]) {
      cart[id].quantity -= 1;
      if (cart[id].quantity <= 0) delete cart[id];
      wx.setStorageSync('cart', cart);
      this.loadCart();
    }
  },

  removeItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认移除',
      content: '确定要从购物车移除此菜品吗？',
      confirmColor: '#d4380d',
      success: (res) => {
        if (res.confirm) {
          let cart = wx.getStorageSync('cart') || {};
          delete cart[id];
          wx.setStorageSync('cart', cart);
          this.loadCart();
          wx.showToast({ title: '已移除', icon: 'success' });
        }
      }
    });
  },

  clearCart() {
    if (this.data.isEmpty) return;
    wx.showModal({
      title: '清空购物车',
      content: '确定要清空所有菜品吗？',
      confirmColor: '#d4380d',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('cart', {});
          this.loadCart();
          wx.showToast({ title: '购物车已清空', icon: 'success' });
        }
      }
    });
  },

  // ============================================================
  // 结算 & 支付流程
  // ============================================================

  checkout() {
    if (this.data.isEmpty) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    if (!wx.getStorageSync('tableNo')) {
      wx.showToast({ title: '请先绑定桌号', icon: 'none' });
      return;
    }
    if (this.data.isPaying) return;

    wx.showModal({
      title: '订单确认',
      content: '桌号: ' + this.data.tableNo +
        '\n共' + this.data.totalCount + '件商品' +
        '\n合计: ¥' + this.data.totalPrice +
        '\n\n即将跳转微信支付',
      confirmText: '去支付',
      confirmColor: '#07c160',
      cancelText: '再想想',
      success: (res) => {
        if (res.confirm) this.startWeChatPay();
      }
    });
  },

  startWeChatPay() {
    const { cartItems, totalPrice, totalCount, tableNo } = this.data;
    const priceNum = parseFloat(totalPrice);

    const itemNames = cartItems.slice(0, 3).map(i => i.name).join('、');
    const description = cartItems.length > 3
      ? '蜀味火锅 - ' + itemNames + ' 等' + totalCount + '件商品'
      : '蜀味火锅 - ' + itemNames;

    this.setData({ isPaying: true });
    wx.showLoading({ title: '订单处理中...', mask: true });

    requestPayment({ description, amount: priceNum, tableNo })
      .then((paymentResult) => {
        wx.hideLoading();
        // 支付成功 → 先提交到后端数据库，再跳转
        this.submitOrderToDB(paymentResult);
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ isPaying: false });
        if (err.message === 'cancel') {
          console.log('[支付] 用户取消支付');
        } else {
          wx.showModal({
            title: '支付失败',
            content: err.message || '支付出现异常，请稍后重试',
            confirmText: '知道了',
            confirmColor: '#d4380d',
            showCancel: false,
          });
        }
      });
  },

  /** 支付成功 → 先保存到本地，再提交到后端数据库 */
  async submitOrderToDB(paymentResult) {
    const { cartItems, totalPrice, totalCount, tableNo } = this.data;
    const priceNum = parseFloat(totalPrice);
    const now = new Date().toLocaleString();

    // ===== 先保存到本地（确保100%能看见订单）=====
    const nowTs = Date.now();
    const localOrder = {
      id: 'ORD' + nowTs,
      items: [...cartItems],
      totalPrice: priceNum,
      totalCount,
      tableNo: tableNo || wx.getStorageSync('tableNo'),
      status: 'paid',
      createTime: now,
      payMethod: '微信支付',
      paidTime: paymentResult.data.paidTime || now,
      _sortTime: nowTs,  // 用于订单列表精确排序
    };
    let orders = wx.getStorageSync('orders') || [];
    orders.unshift(localOrder);
    wx.setStorageSync('orders', orders);
    wx.setStorageSync('cart', {});
    this.loadCart();

    // ===== 再提交到后端数据库（后台管理用）=====
    try {
      const orderData = {
        tableNo: localOrder.tableNo,
        items: cartItems.map(item => ({
          id: item.id, name: item.name, price: item.price,
          unit: item.unit, quantity: item.quantity,
        })),
        totalPrice: priceNum,
        totalCount: totalCount,
        payMethod: '微信支付',
        paidTime: paymentResult.data.paidTime || now,
      };
      await api.createOrder(orderData);
      console.log('[下单] 后端保存成功');
    } catch (err) {
      console.log('[下单] 后端保存失败（本地已保存，不影响使用）:', err);
    }

    wx.showToast({ title: '支付成功！', icon: 'success', duration: 2000 });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/order/order' });
    }, 2000);
  },
});
