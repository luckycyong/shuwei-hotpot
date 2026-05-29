/**
 * 蜀味火锅 - 后台管理服务
 * Express + MySQL RESTful API
 *
 * 启动方式:
 *   cd server && npm install && node app.js
 *
 * 默认监听端口: 3001
 * 管理员默认账号: admin / admin123
 *
 * ✨ 启动时自动初始化数据库（建库、建表、填充默认数据）
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./init-db');

const menuRouter = require('./routes/menu');
const adminRouter = require('./routes/admin');
const uploadRouter = require('./routes/upload');
const orderRouter = require('./routes/order');
const reviewRouter = require('./routes/review');

const app = express();
const PORT = process.env.PORT || 3001;

// ---- 中间件 ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- 路由 ----
app.use('/api/admin', adminRouter);   // 管理员登录/验证
app.use('/api/menu', menuRouter);     // 菜品管理
app.use('/api/upload', uploadRouter); // 图片上传
app.use('/api/order', orderRouter);   // 订单（小程序端）
app.use('/api/review', reviewRouter); // 评价（小程序端）

// ---- 健康检查（含数据库状态）----
const { query } = require('./db');
app.get('/api/health', async (req, res) => {
  try {
    const tables = await query('SHOW TABLES');
    const adminCount = await query('SELECT COUNT(*) AS cnt FROM admins');
    const itemCount = await query('SELECT COUNT(*) AS cnt FROM menu_items');
    res.json({
      success: true,
      message: '蜀味火锅服务运行中',
      time: new Date().toLocaleString(),
      database: 'hotpot',
      tables: tables.map(t => Object.values(t)[0]),
      stats: {
        admins: adminCount[0].cnt,
        menuItems: itemCount[0].cnt,
      },
    });
  } catch (err) {
    res.json({
      success: true,
      message: '蜀味火锅服务运行中（数据库未就绪）',
      time: new Date().toLocaleString(),
      dbError: err.message,
    });
  }
});

// ---- 全局错误处理 ----
app.use((err, req, res, next) => {
  console.error('[❌ 服务器错误]', err.message);
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

// ---- 启动（先初始化数据库，再启动服务）----
async function start() {
  console.log('');
  console.log('🍲 蜀味火锅 后台服务启动中...');
  console.log('');

  try {
    await initDatabase();
  } catch (err) {
    console.error('');
    console.error('❌ 数据库初始化失败:', err.message);
    console.error('   请确认 MySQL 服务已启动，账号密码正确');
    console.error('   默认连接: root / 123456 @ 127.0.0.1:3306');
    console.error('   可通过环境变量 DB_HOST / DB_USER / DB_PASS / DB_PORT 覆盖');
    console.error('');
    // 数据库初始化失败依然启动服务，方便前端调试时能看到错误
  }

  app.listen(PORT, () => {
    console.log(`🌐 服务已启动 → http://localhost:${PORT}`);
    console.log('');
    console.log('📋 API 接口列表:');
    console.log(`   GET  /api/health              健康检查+数据库状态`);
    console.log(`   POST /api/admin/login         管理员登录`);
    console.log(`   GET  /api/admin/me            获取当前管理员信息`);
    console.log(`   GET  /api/menu/categories     获取所有分类`);
    console.log(`   GET  /api/menu/items          获取在售菜品（小程序用）`);
    console.log(`   GET  /api/menu/item/:id       获取单个菜品`);
    console.log(`   GET  /api/menu/admin/items    获取全部菜品（管理后台用）`);
    console.log(`   POST /api/menu/item           新增菜品`);
    console.log(`   PUT  /api/menu/item/:id       修改菜品`);
    console.log(`   DELETE /api/menu/item/:id     删除菜品`);
    console.log(`   PUT  /api/menu/item/:id/status 上架/下架`);
    console.log(`   POST /api/upload/image        上传菜品图片`);
    console.log(`   POST /api/order/create        创建订单`);
    console.log(`   GET  /api/order/list          订单列表`);
    console.log(`   PUT  /api/order/:orderNo/status 更新订单状态`);
    console.log(`   GET  /api/order/stats         订单统计`);
    console.log(`   POST /api/review/create       提交评价`);
    console.log(`   GET  /api/review/list         评价列表`);
    console.log(`   GET  /api/review/stats        评价统计`);
    console.log('');
  });
}

start();
