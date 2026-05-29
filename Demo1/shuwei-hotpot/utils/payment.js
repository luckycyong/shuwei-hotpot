/**
 * 微信支付服务模块
 *
 * 提供完整的微信支付流程：
 * 1. 模拟后端统一下单（生成 prepay_id）
 * 2. 参数签名
 * 3. 调用 wx.requestPayment 跳转微信支付
 *
 * ⚠️ 当前为演示模式（DEMO_MODE = true）
 * 接入真实微信支付时只需：
 * - 将 DEMO_MODE 设为 false
 * - 实现 requestBackendPayment(orderInfo) 调用你的后端接口
 * - 后端需调用微信支付统一下单API并返回 JSAPI 调起支付参数
 * - 配置 notify_url 接收微信支付结果通知
 */

// ============================================================
// 配置项
// ============================================================

const CONFIG = {
  // 演示模式：true=使用模拟支付（不实际调起微信支付）
  //            false=使用真实微信支付（需后端配合）
  DEMO_MODE: true,

  // 模拟支付延时（毫秒）
  DEMO_DELAY: 1500,

  // 真实微信支付的商户号（接入正式时填写）
  MERCHANT_ID: 'your_merchant_id',

  // 支付结果通知地址（需后端部署）
  NOTIFY_URL: 'https://your-domain.com/api/wxpay/notify',

  // 支付超时时间（分钟）
  PAY_TIMEOUT: 30,
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 生成随机字符串（模拟微信支付的 nonce_str）
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成商户订单号
 * 格式: SH{年月日时分秒}{6位随机数}
 */
function generateOrderNo() {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return 'SH' + dateStr + random;
}

// ============================================================
// 后端接口模拟（演示用）
// ============================================================

/**
 * 模拟后端统一下单接口
 *
 * 【真实接入时替换此函数】
 * 应调用你的后端 API，后端再调用微信支付统一下单 API：
 * POST https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi
 *
 * 返回参数说明：
 * - prepayId: 微信支付预支付ID
 * - 调起支付参数：appId, timeStamp, nonceStr, package, signType, paySign
 *
 * @param {Object} orderInfo - 订单信息 { description, amount, tableNo }
 * @returns {Promise<Object>} 调起支付参数
 */
function mockBackendUnifiedOrder(orderInfo) {
  return new Promise((resolve) => {
    // 模拟后端处理延时
    setTimeout(() => {
      // 模拟生成的 prepay_id
      const prepayId = 'wx' + Date.now().toString() + generateNonceStr(10);

      // 模拟微信支付调起参数
      const paymentParams = {
        appId: 'wx786468acd938bef3',         // 小程序appid（从project.config.json获取）
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: generateNonceStr(),
        package: 'prepay_id=' + prepayId,
        signType: 'RSA',                      // 微信支付v3使用RSA，v2使用MD5
        paySign: 'MOCK_SIGN_' + generateNonceStr(40), // 模拟签名
        // 扩展字段（内部使用）
        prepayId: prepayId,
        merchantOrderNo: generateOrderNo(),
      };

      resolve(paymentParams);
    }, 500);
  });
}

/**
 * 真实后端统一下单接口（骨架代码）
 * 【接入真实支付时实现此函数】
 *
 * @param {Object} orderInfo - 订单信息 { description, amount, tableNo }
 * @returns {Promise<Object>} 调起支付参数
 */
async function requestBackendUnifiedOrder(orderInfo) {
  // 替换为你的后端接口地址
  const API_URL = 'https://your-domain.com/api/wxpay/unified-order';

  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: API_URL,
        method: 'POST',
        data: {
          description: orderInfo.description,
          amount: orderInfo.amount,
          tableNo: orderInfo.tableNo,
          outTradeNo: generateOrderNo(),
          notifyUrl: CONFIG.NOTIFY_URL,
        },
        success: resolve,
        fail: reject,
      });
    });

    if (response.data && response.data.success) {
      return response.data.paymentParams;
    } else {
      throw new Error(response.data.message || '统一下单失败');
    }
  } catch (err) {
    console.error('[支付] 统一下单失败:', err);
    throw err;
  }
}

// ============================================================
// 支付流程核心
// ============================================================

/**
 * 调起微信支付
 *
 * 流程：
 * 1. 调用后端统一下单 → 获取 prepay_id 和调起参数
 * 2. 调用 wx.requestPayment → 打开微信支付密码/指纹页面
 * 3. 用户完成支付 → 处理结果
 *
 * @param {Object} orderInfo - 订单信息
 * @param {string} orderInfo.description - 订单描述（如"蜀味火锅 - 订单"）
 * @param {number} orderInfo.amount - 支付金额（元）
 * @param {string} orderInfo.tableNo - 桌号
 * @returns {Promise<Object>} 支付结果 { success, data }
 */
function requestPayment(orderInfo) {
  return new Promise(async (resolve, reject) => {
    try {
      // ---- 第1步：统一下单 ----
      console.log('[支付] 开始统一下单', orderInfo);

      let paymentParams;
      if (CONFIG.DEMO_MODE) {
        // 演示模式：模拟后端返回
        paymentParams = await mockBackendUnifiedOrder(orderInfo);
      } else {
        // 生产模式：调用真实后端
        paymentParams = await requestBackendUnifiedOrder(orderInfo);
      }

      console.log('[支付] 统一下单成功，调起参数:', paymentParams);

      // ---- 第2步：调起微信支付 ----
      if (CONFIG.DEMO_MODE) {
        // 演示模式：显示模拟支付弹窗
        // 因为 wx.requestPayment 需要真实的 prepay_id 才能成功，
        // 演示模式下使用自定义UI模拟支付流程
        await simulateWeChatPay(orderInfo);
        resolve({
          success: true,
          data: {
            ...paymentParams,
            paidAmount: orderInfo.amount,
            paidTime: new Date().toLocaleString(),
          }
        });
      } else {
        // 生产模式：调起真实微信支付
        await callRealWeChatPay(paymentParams);
        resolve({
          success: true,
          data: {
            ...paymentParams,
            paidAmount: orderInfo.amount,
            paidTime: new Date().toLocaleString(),
          }
        });
      }
    } catch (err) {
      console.error('[支付] 支付失败:', err);
      reject(err);
    }
  });
}

/**
 * 调起真实微信支付（wx.requestPayment）
 *
 * @param {Object} params - 调起支付参数
 * @returns {Promise<void>}
 */
function callRealWeChatPay(params) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      appId: params.appId,
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType,
      paySign: params.paySign,
      success: (res) => {
        console.log('[支付] wx.requestPayment 成功', res);
        resolve();
      },
      fail: (err) => {
        console.error('[支付] wx.requestPayment 失败', err);
        // err.errMsg 可能包含 "cancel"（用户取消支付）
        reject(new Error(err.errMsg || '支付失败'));
      },
    });
  });
}

/**
 * 模拟微信支付（演示用）
 * 显示一个带支付倒计时和金额确认的模拟流程
 *
 * @param {Object} orderInfo - 订单信息
 * @returns {Promise<void>}
 */
function simulateWeChatPay(orderInfo) {
  return new Promise((resolve, reject) => {
    // 用 wx.showModal 模拟微信支付确认弹窗
    wx.showModal({
      title: '🧧 微信支付',
      content: `确认支付 ¥${orderInfo.amount.toFixed(2)}\n${orderInfo.description}`,
      confirmText: '确认支付',
      confirmColor: '#07c160',   // 微信支付绿色
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户确认支付 → 显示支付处理中
          wx.showLoading({
            title: '支付处理中...',
            mask: true,
          });

          // 模拟支付处理延时
          setTimeout(() => {
            wx.hideLoading();

            // 支付成功
            wx.showToast({
              title: '支付成功',
              icon: 'success',
              duration: 1500,
            });

            resolve();
          }, CONFIG.DEMO_DELAY);
        } else {
          // 用户取消支付
          reject(new Error('cancel')); // 统一用 'cancel' 表示用户取消
        }
      }
    });
  });
}

// ============================================================
// 支付结果查询（骨架）
// ============================================================

/**
 * 查询支付结果
 * 【真实接入时实现：调用后端查询微信支付订单状态】
 *
 * @param {string} outTradeNo - 商户订单号
 * @returns {Promise<Object>} 支付结果
 */
async function queryPaymentResult(outTradeNo) {
  if (CONFIG.DEMO_MODE) {
    // 演示模式：默认返回成功
    return {
      tradeState: 'SUCCESS',
      outTradeNo,
    };
  }

  // 真实接入时调用后端接口查询
  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: 'https://your-domain.com/api/wxpay/query',
        method: 'POST',
        data: { outTradeNo },
        success: resolve,
        fail: reject,
      });
    });
    return response.data;
  } catch (err) {
    console.error('[支付] 查询支付结果失败:', err);
    throw err;
  }
}

// ============================================================
// 模块导出
// ============================================================

module.exports = {
  CONFIG,
  requestPayment,
  queryPaymentResult,
  generateOrderNo,
};
