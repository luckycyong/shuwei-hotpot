/**
 * 管理员 API 工具模块
 * 封装与后端服务的所有 HTTP 请求
 */

// 后端服务地址（开发时使用本地地址）
// 小程序开发工具中需将"不校验合法域名"打开
const BASE_URL = 'http://localhost:3001/api';

/**
 * 通用请求方法
 */
function request(method, path, data, useToken = true) {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' };
    if (useToken) {
      const token = wx.getStorageSync('admin_token');
      if (token) {
        header['Authorization'] = 'Bearer ' + token;
      }
    }

    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header,
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('admin_token');
          wx.removeStorageSync('admin_info');
          reject(new Error('登录已过期，请重新登录'));
        } else if (res.statusCode === 500) {
          // 服务器内部错误，显示具体错误信息
          const msg = (res.data && res.data.message) || '服务器内部错误，请检查后端控制台输出';
          reject(new Error(msg));
        } else {
          reject(new Error('请求失败 (HTTP ' + res.statusCode + ')'));
        }
      },
      fail: (err) => {
        console.error('[API] 网络请求失败:', err);
        reject(new Error('无法连接服务器 (http://localhost:3001)，请确认：\n1. 后端服务已启动 (cd server && node app.js)\n2. 小程序开发工具已勾选"不校验合法域名"'));
      },
    });
  });
}

// ============================================================
// 管理员登录
// ============================================================

/**
 * 管理员登录
 */
function login(username, password) {
  return request('POST', '/admin/login', { username, password }, false);
}

/**
 * 获取当前管理员信息
 */
function getAdminInfo() {
  return request('GET', '/admin/me');
}

// ============================================================
// 菜品分类
// ============================================================

/**
 * 获取所有分类
 */
function getCategories() {
  return request('GET', '/menu/categories', {}, false);
}

// ============================================================
// 菜品管理
// ============================================================

/**
 * 获取所有菜品（管理后台，含下架）
 */
function getAllItems() {
  return request('GET', '/menu/admin/items');
}

/**
 * 获取单个菜品详情
 */
function getItem(id) {
  return request('GET', '/menu/item/' + id, {}, false);
}

/**
 * 新增菜品
 */
function addItem(data) {
  return request('POST', '/menu/item', data);
}

/**
 * 修改菜品
 */
function updateItem(id, data) {
  return request('PUT', '/menu/item/' + id, data);
}

/**
 * 删除菜品
 */
function deleteItem(id) {
  return request('DELETE', '/menu/item/' + id);
}

/**
 * 上架/下架
 */
function toggleStatus(id, status) {
  return request('PUT', '/menu/item/' + id + '/status', { status });
}

/**
 * 所有公开菜品（菜单页用）
 */
function getPublicItems(catId) {
  let path = '/menu/items';
  if (catId) path += '?catId=' + catId;
  return request('GET', path, {}, false);
}

module.exports = {
  login,
  getAdminInfo,
  getCategories,
  getAllItems,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  toggleStatus,
  getPublicItems,
};
