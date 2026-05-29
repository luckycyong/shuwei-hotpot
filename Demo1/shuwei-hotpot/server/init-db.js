/**
 * 数据库自动初始化模块
 *
 * 每次服务器启动时自动执行：
 * 1. 创建 hotpot 数据库（如不存在）
 * 2. 创建所有数据表（如不存在）
 * 3. 插入默认管理员（如不存在）
 * 4. 插入默认分类和菜品数据（如为空）
 *
 * 这样用户无需手动执行 SQL 文件，启动即用。
 */

const mysql = require('mysql2');
const crypto = require('crypto');

// ============================================================
// SQL 定义
// ============================================================

const SQL_CREATE_DATABASE = `
  CREATE DATABASE IF NOT EXISTS hotpot
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`;

const SQL_USE_DATABASE = `USE hotpot`;

const SQL_CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS admins (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE COMMENT '管理员用户名',
    password    VARCHAR(255) NOT NULL COMMENT '密码(sha256)',
    nickname    VARCHAR(100) DEFAULT '' COMMENT '昵称',
    avatar      VARCHAR(255) DEFAULT '' COMMENT '头像',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

  CREATE TABLE IF NOT EXISTS categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL COMMENT '分类名称',
    icon        VARCHAR(20)  DEFAULT '' COMMENT '图标emoji',
    sort_order  INT          DEFAULT 0 COMMENT '排序权重',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜品分类表';

  CREATE TABLE IF NOT EXISTS menu_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    cat_id      INT          NOT NULL COMMENT '所属分类ID',
    name        VARCHAR(100) NOT NULL COMMENT '菜品名称',
    description VARCHAR(255) DEFAULT '' COMMENT '菜品描述',
    price       DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '价格',
    discount_price DECIMAL(10,2) DEFAULT NULL COMMENT '折扣价，NULL=无折扣',
    unit        VARCHAR(20)  DEFAULT '份' COMMENT '单位',
    image       VARCHAR(20)  DEFAULT '🍽' COMMENT '菜品图标',
    image_url   VARCHAR(500) DEFAULT '' COMMENT '菜品真实图片URL',
    spicy       TINYINT      DEFAULT 0 COMMENT '辣度 0-5',
    tags        VARCHAR(100) DEFAULT '' COMMENT '标签，逗号分隔',
    sales       INT          DEFAULT 0 COMMENT '销量',
    status      TINYINT      DEFAULT 1 COMMENT '1=上架 0=下架',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cat_id) REFERENCES categories(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜品表';

  CREATE TABLE IF NOT EXISTS orders (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    order_no      VARCHAR(50)  NOT NULL UNIQUE COMMENT '订单号',
    table_no      VARCHAR(20)  NOT NULL COMMENT '桌号',
    total_price   DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '总价',
    total_count   INT          DEFAULT 0 COMMENT '总数量',
    status        VARCHAR(20)  DEFAULT 'paid' COMMENT 'paid=已支付 completed=已完成 reviewed=已评价',
    pay_method    VARCHAR(50)  DEFAULT '微信支付' COMMENT '支付方式',
    paid_time     DATETIME     DEFAULT NULL COMMENT '支付时间',
    remark        VARCHAR(255) DEFAULT '' COMMENT '备注',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

  CREATE TABLE IF NOT EXISTS order_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT          NOT NULL COMMENT '订单ID',
    item_name   VARCHAR(100) NOT NULL COMMENT '菜品名称',
    item_price  DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '单价',
    quantity    INT          NOT NULL DEFAULT 1 COMMENT '数量',
    subtotal    DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '小计',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

  CREATE TABLE IF NOT EXISTS reviews (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT          NOT NULL COMMENT '订单ID',
    rating      TINYINT      NOT NULL DEFAULT 5 COMMENT '评分 1-5',
    comment     TEXT         COMMENT '评价内容',
    images      TEXT         COMMENT '评价图片URL列表，JSON数组',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评价表';
`;

const SQL_INSERT_ADMIN = `
  INSERT IGNORE INTO admins (username, password, nickname)
  VALUES (?, ?, ?)
`;

const SQL_INSERT_CATEGORIES = `
  INSERT IGNORE INTO categories (id, name, icon, sort_order) VALUES
  (1, '招牌锅底',   '🍲', 7),
  (2, '精品荤菜',   '🥩', 6),
  (3, '海鲜河鲜',   '🦐', 5),
  (4, '时蔬菌菇',   '🥬', 4),
  (5, '丸滑豆制品', '🍡', 3),
  (6, '小吃主食',   '🍜', 2),
  (7, '酒水饮品',   '🥤', 1)
`;

const SQL_INSERT_MENU_ITEMS = `
  INSERT IGNORE INTO menu_items (id, cat_id, name, description, price, unit, image, spicy, tags, sales) VALUES
  (1,  1, '牛油麻辣锅底', '四川汉源花椒+二荆条辣椒，麻辣鲜香', 68,  '份', '🍲', 5, '招牌,麻辣', 9999),
  (2,  1, '番茄牛腩锅底', '新鲜番茄慢熬6小时，酸甜浓郁',   58,  '份', '🍅', 0, '人气', 8500),
  (3,  1, '菌汤锅底',     '云南野生菌菇熬制，鲜美滋补',   48,  '份', '🍄', 0, '养生', 6200),
  (4,  1, '鸳鸯锅底',     '麻辣+清汤双拼，一锅两吃',     78,  '份', '☯️', 3, '经典', 7800),
  (5,  2, '雪花肥牛',     '澳洲谷饲肥牛，大理石花纹',     88,  '盘', '🥩', 0, '必点', 9500),
  (6,  2, '手切鲜羊肉',   '内蒙古草原羔羊，鲜嫩无膻',     78,  '盘', '🐑', 0, '', 7200),
  (7,  2, '极品毛肚',     '新鲜牛百叶，七上八下15秒',     68,  '盘', '🫘', 0, '爆款', 8800),
  (8,  2, '鸭肠',         '脆嫩弹牙，涮8秒最佳',         38,  '盘', '🦆', 0, '', 6500),
  (9,  2, '猪脑花',       '细腻嫩滑，蘸干碟绝配',         28,  '份', '🧠', 0, '特色', 4100),
  (10, 2, '嫩牛肉',       '蛋液包裹，滑嫩多汁',          48,  '盘', '🥓', 0, '', 7600),
  (11, 3, '鲜活基围虾',   '当日到货，鲜甜弹嫩',          68,  '份', '🦐', 0, '鲜活', 5800),
  (12, 3, '鲜切鱼片',     '黑鱼薄切，晶莹剔透',          48,  '盘', '🐟', 0, '', 4900),
  (13, 3, '蟹棒',         '进口蟹味棒，丝丝分明',         28,  '份', '🦀', 0, '', 5500),
  (14, 4, '蔬菜拼盘',     '当日时令蔬菜组合',            28,  '份', '🥬', 0, '清爽', 7000),
  (15, 4, '菌菇拼盘',     '香菇、金针菇、杏鲍菇',         38,  '份', '🍄', 0, '', 6200),
  (16, 4, '土豆片',       '新鲜土豆，软糯香甜',          12,  '份', '🥔', 0, '', 8000),
  (17, 4, '藕片',         '脆嫩清甜，久煮不烂',          16,  '份', '🪷', 0, '', 6800),
  (18, 5, '手工虾滑',     '大颗虾肉手工打制',            48,  '份', '🍤', 0, '手工', 7500),
  (19, 5, '牛肉丸',       '潮汕手打，弹牙爆汁',          38,  '份', '🧆', 0, '', 6800),
  (20, 5, '老豆腐',       '卤水豆腐，越煮越香',          12,  '份', '🫘', 0, '', 5200),
  (21, 6, '红糖糍粑',     '外酥里糯，红糖浇汁',          22,  '份', '🍡', 0, '甜品', 9000),
  (22, 6, '蛋炒饭',       '粒粒分明，锅气十足',          18,  '碗', '🍚', 0, '', 5500),
  (23, 6, '小酥肉',       '现炸酥肉，外酥里嫩',          32,  '份', '🍖', 1, '人气', 8200),
  (24, 7, '酸梅汤',       '冰镇酸梅汤，解辣神器',         12,  '杯', '🥤', 0, '解辣', 9500),
  (25, 7, '唯怡豆奶',     '火锅标配，冰镇更佳',          10,  '瓶', '🥛', 0, '', 8800),
  (26, 7, '雪花啤酒',     '冰爽啤酒，大口畅饮',          15,  '瓶', '🍺', 0, '', 7000)
`;

// ============================================================
// 初始化执行
// ============================================================

async function initDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '123456',
    charset: 'utf8mb4',
    multipleStatements: true,
  };

  const defaultPwdHash = crypto
    .createHash('sha256')
    .update('admin123')
    .digest('hex');

  // 第一步：连接 MySQL（不指定数据库）→ 创建数据库
  const conn1 = mysql.createConnection(dbConfig);

  try {
    await new Promise((resolve, reject) => {
      conn1.query(SQL_CREATE_DATABASE, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ 数据库 hotpot 已就绪');
    conn1.end();
  } catch (err) {
    console.error('❌ 创建数据库失败:', err.message);
    conn1.end();
    throw err;
  }

  // 第二步：连接 hotpot 数据库 → 创建表
  const conn2 = mysql.createConnection({ ...dbConfig, database: 'hotpot' });

  try {
    await new Promise((resolve, reject) => {
      conn2.query(SQL_CREATE_TABLES, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ 所有数据表已就绪');

    // 兼容处理：对已有数据库补充新增的 discount_price 字段
    try {
      await new Promise((resolve, reject) => {
        conn2.query(`ALTER TABLE menu_items ADD COLUMN discount_price DECIMAL(10,2) DEFAULT NULL COMMENT '折扣价，NULL=无折扣' AFTER price`, (err) => {
          resolve();
        });
      });
    } catch (_) { /* 忽略 */ }

    // 兼容处理：补充 image_url 字段
    try {
      await new Promise((resolve, reject) => {
        conn2.query(`ALTER TABLE menu_items ADD COLUMN image_url VARCHAR(500) DEFAULT '' COMMENT '菜品真实图片URL' AFTER image`, (err) => {
          resolve();
        });
      });
    } catch (_) { /* 忽略 */ }

    // 兼容处理：补充 reviews.images 和 updated_at 字段
    try {
      await new Promise((resolve, reject) => {
        conn2.query(`ALTER TABLE reviews ADD COLUMN images TEXT COMMENT '评价图片URL列表，JSON数组' AFTER comment`, (err) => {
          resolve();
        });
      });
    } catch (_) { /* 忽略 */ }
    try {
      await new Promise((resolve, reject) => {
        conn2.query(`ALTER TABLE reviews ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`, (err) => {
          resolve();
        });
      });
    } catch (_) { /* 忽略 */ }

    conn2.end();
  } catch (err) {
    console.error('❌ 创建数据表失败:', err.message);
    conn2.end();
    throw err;
  }

  // 第三步：插入默认数据
  const conn3 = mysql.createConnection({ ...dbConfig, database: 'hotpot' });

  try {
    // 插入管理员
    await new Promise((resolve, reject) => {
      conn3.query(SQL_INSERT_ADMIN, ['admin', defaultPwdHash, '超级管理员'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ 默认管理员已就绪 (admin / admin123)');

    // 插入分类
    await new Promise((resolve, reject) => {
      conn3.query(SQL_INSERT_CATEGORIES, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ 菜品分类已就绪 (7个分类)');

    // 清理因重复执行 database.sql 产生的重复分类数据
    try {
      await new Promise((resolve, reject) => {
        conn3.query(`
          DELETE FROM categories WHERE id NOT IN (
            SELECT cid FROM (SELECT MIN(id) AS cid FROM categories GROUP BY name) AS t
          )
        `, (err) => {
          if (err) reject(err); else resolve();
        });
      });
    } catch (e) { /* 清理失败不影响使用 */ }

    // 插入菜品
    await new Promise((resolve, reject) => {
      conn3.query(SQL_INSERT_MENU_ITEMS, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ 菜品数据已就绪 (26道菜)');

    // 清理因重复执行 database.sql 产生的重复菜品数据
    try {
      await new Promise((resolve, reject) => {
        conn3.query(`
          DELETE FROM menu_items WHERE id NOT IN (
            SELECT mid FROM (SELECT MIN(id) AS mid FROM menu_items GROUP BY name, cat_id) AS t
          )
        `, (err) => {
          if (err) reject(err); else resolve();
        });
      });
    } catch (e) {
      // 清理失败不影响使用，前端已有去重逻辑
    }

    conn3.end();
  } catch (err) {
    console.error('❌ 插入默认数据失败:', err.message);
    conn3.end();
    throw err;
  }

  console.log('');
  console.log('========================================');
  console.log('  🍲 蜀味火锅 数据库初始化完成');
  console.log('  管理员: admin / admin123');
  console.log('========================================');
  console.log('');
}

module.exports = { initDatabase };
