-- ============================================================
-- 蜀味火锅 数据库初始化脚本
-- 数据库: hotpot
-- 密码: 123456
-- ============================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS hotpot DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotpot;
SET NAMES utf8mb4;

-- ============================================================
-- 1. 管理员表
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE COMMENT '管理员用户名',
  password    VARCHAR(255) NOT NULL COMMENT '密码(sha256)',
  nickname    VARCHAR(100) DEFAULT '' COMMENT '昵称',
  avatar      VARCHAR(255) DEFAULT '' COMMENT '头像',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- 默认管理员: admin / admin123 (SHA256)
INSERT IGNORE INTO admins (username, password, nickname) VALUES
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '超级管理员');

-- ============================================================
-- 2. 菜品分类表
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL COMMENT '分类名称，如"招牌锅底"',
  icon        VARCHAR(20)  DEFAULT '' COMMENT '图标emoji',
  sort_order  INT          DEFAULT 0 COMMENT '排序权重，越大越靠前',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜品分类表';

INSERT IGNORE INTO categories (id, name, icon, sort_order) VALUES
(1, '招牌锅底',   '🍲', 7),
(2, '精品荤菜',   '🥩', 6),
(3, '海鲜河鲜',   '🦐', 5),
(4, '时蔬菌菇',   '🥬', 4),
(5, '丸滑豆制品', '🍡', 3),
(6, '小吃主食',   '🍜', 2),
(7, '酒水饮品',   '🥤', 1);

-- ============================================================
-- 3. 菜品表
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  cat_id      INT          NOT NULL COMMENT '所属分类ID',
  name        VARCHAR(100) NOT NULL COMMENT '菜品名称',
  description VARCHAR(255) DEFAULT '' COMMENT '菜品描述',
  price       DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '价格',
  discount_price DECIMAL(10,2) DEFAULT NULL COMMENT '折扣价，NULL=无折扣',
  unit        VARCHAR(20)  DEFAULT '份' COMMENT '单位',
  image       VARCHAR(20)  DEFAULT '🍽' COMMENT '菜品图标emoji',
  image_url   VARCHAR(500) DEFAULT '' COMMENT '菜品真实图片URL',
  spicy       TINYINT      DEFAULT 0 COMMENT '辣度 0-5',
  tags        VARCHAR(100) DEFAULT '' COMMENT '标签，逗号分隔',
  sales       INT          DEFAULT 0 COMMENT '销量',
  status      TINYINT      DEFAULT 1 COMMENT '状态: 1=上架 0=下架',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cat_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜品表';

INSERT IGNORE INTO menu_items (id, cat_id, name, description, price, unit, image, spicy, tags, sales) VALUES
-- 招牌锅底 (cat_id=1)
(1, 1, '牛油麻辣锅底', '四川汉源花椒+二荆条辣椒，麻辣鲜香', 68, '份', '🍲', 5, '招牌,麻辣', 9999),
(2, 1, '番茄牛腩锅底', '新鲜番茄慢熬6小时，酸甜浓郁', 58, '份', '🍅', 0, '人气', 8500),
(3, 1, '菌汤锅底', '云南野生菌菇熬制，鲜美滋补', 48, '份', '🍄', 0, '养生', 6200),
(4, 1, '鸳鸯锅底', '麻辣+清汤双拼，一锅两吃', 78, '份', '☯️', 3, '经典', 7800),
-- 精品荤菜 (cat_id=2)
(5, 2, '雪花肥牛', '澳洲谷饲肥牛，大理石花纹', 88, '盘', '🥩', 0, '必点', 9500),
(6, 2, '手切鲜羊肉', '内蒙古草原羔羊，鲜嫩无膻', 78, '盘', '🐑', 0, '', 7200),
(7, 2, '极品毛肚', '新鲜牛百叶，七上八下15秒', 68, '盘', '🫘', 0, '爆款', 8800),
(8, 2, '鸭肠', '脆嫩弹牙，涮8秒最佳', 38, '盘', '🦆', 0, '', 6500),
(9, 2, '猪脑花', '细腻嫩滑，蘸干碟绝配', 28, '份', '🧠', 0, '特色', 4100),
(10, 2, '嫩牛肉', '蛋液包裹，滑嫩多汁', 48, '盘', '🥓', 0, '', 7600),
-- 海鲜河鲜 (cat_id=3)
(11, 3, '鲜活基围虾', '当日到货，鲜甜弹嫩', 68, '份', '🦐', 0, '鲜活', 5800),
(12, 3, '鲜切鱼片', '黑鱼薄切，晶莹剔透', 48, '盘', '🐟', 0, '', 4900),
(13, 3, '蟹棒', '进口蟹味棒，丝丝分明', 28, '份', '🦀', 0, '', 5500),
-- 时蔬菌菇 (cat_id=4)
(14, 4, '蔬菜拼盘', '当日时令蔬菜组合', 28, '份', '🥬', 0, '清爽', 7000),
(15, 4, '菌菇拼盘', '香菇、金针菇、杏鲍菇', 38, '份', '🍄', 0, '', 6200),
(16, 4, '土豆片', '新鲜土豆，软糯香甜', 12, '份', '🥔', 0, '', 8000),
(17, 4, '藕片', '脆嫩清甜，久煮不烂', 16, '份', '🪷', 0, '', 6800),
-- 丸滑豆制品 (cat_id=5)
(18, 5, '手工虾滑', '大颗虾肉手工打制', 48, '份', '🍤', 0, '手工', 7500),
(19, 5, '牛肉丸', '潮汕手打，弹牙爆汁', 38, '份', '🧆', 0, '', 6800),
(20, 5, '老豆腐', '卤水豆腐，越煮越香', 12, '份', '🫘', 0, '', 5200),
-- 小吃主食 (cat_id=6)
(21, 6, '红糖糍粑', '外酥里糯，红糖浇汁', 22, '份', '🍡', 0, '甜品', 9000),
(22, 6, '蛋炒饭', '粒粒分明，锅气十足', 18, '碗', '🍚', 0, '', 5500),
(23, 6, '小酥肉', '现炸酥肉，外酥里嫩', 32, '份', '🍖', 1, '人气', 8200),
-- 酒水饮品 (cat_id=7)
(24, 7, '酸梅汤', '冰镇酸梅汤，解辣神器', 12, '杯', '🥤', 0, '解辣', 9500),
(25, 7, '唯怡豆奶', '火锅标配，冰镇更佳', 10, '瓶', '🥛', 0, '', 8800),
(26, 7, '雪花啤酒', '冰爽啤酒，大口畅饮', 15, '瓶', '🍺', 0, '', 7000);

-- ============================================================
-- 4. 订单表
-- ============================================================
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

-- ============================================================
-- 5. 订单明细表
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT          NOT NULL COMMENT '订单ID',
  item_name   VARCHAR(100) NOT NULL COMMENT '菜品名称',
  item_price  DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '单价',
  quantity    INT          NOT NULL DEFAULT 1 COMMENT '数量',
  subtotal    DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '小计',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

-- ============================================================
-- 6. 评价表
-- ============================================================
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
