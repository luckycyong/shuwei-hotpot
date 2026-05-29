/**
 * 管理员路由 - 登录验证
 */
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'shuwei_hotpot_jwt_secret_2024';
const JWT_EXPIRES = '24h';

/**
 * POST /api/admin/login - 管理员登录
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log('[管理员登录] 收到登录请求:', username);

    if (!username || !password) {
      console.log('[管理员登录] 失败: 用户名或密码为空');
      return res.json({ success: false, message: '用户名和密码不能为空' });
    }

    // SHA256 加密密码（与数据库存储一致）
    const hashedPwd = crypto.createHash('sha256').update(password).digest('hex');
    console.log('[管理员登录] 密码哈希:', hashedPwd);

    let admins;
    try {
      admins = await query(
        'SELECT id, username, nickname, avatar FROM admins WHERE username = ? AND password = ?',
        [username, hashedPwd]
      );
    } catch (dbErr) {
      console.error('[管理员登录] 数据库查询失败:', dbErr.message);
      return res.json({
        success: false,
        message: '数据库查询失败，请确认数据库已初始化: ' + dbErr.message,
      });
    }

    if (admins.length === 0) {
      console.log('[管理员登录] 失败: 用户名或密码错误 (username=' + username + ')');
      return res.json({ success: false, message: '用户名或密码错误' });
    }

    const admin = admins[0];
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    console.log('[管理员登录] 成功:', admin.username);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          nickname: admin.nickname,
          avatar: admin.avatar,
        },
      },
    });
  } catch (err) {
    console.error('[管理员登录] 异常:', err);
    next(err);
  }
});

/**
 * 验证 token 中间件
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录或 token 已过期' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'token 无效或已过期' });
  }
}

/**
 * GET /api/admin/me - 获取当前管理员信息（需登录）
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const admins = await query(
      'SELECT id, username, nickname, avatar, created_at FROM admins WHERE id = ?',
      [req.admin.id]
    );
    if (admins.length === 0) {
      return res.json({ success: false, message: '管理员不存在' });
    }
    res.json({ success: true, data: admins[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
