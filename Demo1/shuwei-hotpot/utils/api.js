/**
 * 小程序前端 API 模块
 *
 * 所有数据统一从后端 MySQL 数据库获取
 * 不再使用本地 mock-data.js
 *
 * 使用方式：
 *   const api = require('../../utils/api.js');
 *   api.getCategories().then(...)
 *
 * ⚠️ 小程序开发工具需开启"不校验合法域名"
 */

const BASE_URL = 'http://localhost:3001/api';

/**
 * 通用请求
 */
function request(method, path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('请求失败 (HTTP ' + res.statusCode + ')'));
        }
      },
      fail: (err) => {
        console.error('[API] 网络请求失败:', err);
        reject(new Error('无法连接服务器，请确认后端服务已启动 (http://localhost:3001)'));
      },
    });
  });
}

// ============================================================
// 菜品 & 分类
// ============================================================

/** 获取所有分类 */
function getCategories() {
  return request('GET', '/menu/categories');
}

/** 获取在售菜品（可传分类ID筛选） */
function getItems(catId) {
  let path = '/menu/items';
  if (catId) path += '?catId=' + catId;
  return request('GET', path);
}

/** 获取单个菜品 */
function getItem(id) {
  return request('GET', '/menu/item/' + id);
}

// ============================================================
// 订单
// ============================================================

/** 创建订单 */
function createOrder(orderData) {
  return request('POST', '/order/create', orderData);
}

/** 获取订单列表（可选按桌号筛选） */
function getOrders(tableNo) {
  let path = '/order/list';
  if (tableNo) path += '?tableNo=' + encodeURIComponent(tableNo);
  return request('GET', path);
}

/** 更新订单状态 */
function updateOrderStatus(orderNo, status) {
  return request('PUT', '/order/' + orderNo + '/status', { status });
}

/** 获取订单统计 */
function getOrderStats() {
  return request('GET', '/order/stats');
}

// ============================================================
// 评价
// ============================================================

/** 提交评价 */
function createReview(reviewData) {
  return request('POST', '/review/create', reviewData);
}

/** 修改评价 */
function updateReview(reviewData) {
  return request('PUT', '/review/update', reviewData);
}

/** 获取某订单的评价明细 */
function getReviewDetail(orderNo) {
  return request('GET', '/review/detail?orderNo=' + encodeURIComponent(orderNo));
}

/** 获取所有评价列表 */
function getReviews() {
  return request('GET', '/review/list');
}

/** 获取评价统计 */
function getReviewStats() {
  return request('GET', '/review/stats');
}

module.exports = {
  getCategories,
  getItems,
  getItem,
  createOrder,
  getOrders,
  updateOrderStatus,
  getOrderStats,
  createReview,
  updateReview,
  getReviewDetail,
  getReviews,
  getReviewStats,
};
