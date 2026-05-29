/**
 * 菜品管理路由 - CRUD
 *
 * 所有管理接口需要登录验证（token）
 * 菜品数据和分类数据同时也提供给小程序前端查询
 */
const express = require('express');
const { query } = require('../db');
const { authMiddleware } = require('./admin');

const router = express.Router();

// ============================================================
// 公开接口（小程序前端调用，不需登录）
// ============================================================

/**
 * GET /api/menu/categories - 获取所有分类
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await query(
      `SELECT id, name, icon, sort_order FROM categories
       WHERE id IN (SELECT cid FROM (SELECT MIN(id) AS cid FROM categories GROUP BY name) AS t)
       ORDER BY sort_order DESC`
    );
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/menu/items - 获取所有在售菜品（小程序用）
 * 支持按分类筛选 ?catId=1
 */
router.get('/items', async (req, res, next) => {
  try {
    const { catId } = req.query;
    let sql = `
      SELECT m.id, m.cat_id AS catId, m.name, m.description, m.price,
             m.discount_price AS discountPrice, m.unit, m.image, m.image_url AS imageUrl, m.spicy, m.tags, m.sales, m.status,
             c.name AS categoryName
      FROM menu_items m
      JOIN categories c ON m.cat_id = c.id
      WHERE m.status = 1
    `;
    const params = [];
    if (catId) {
      sql += ' AND m.cat_id = ?';
      params.push(parseInt(catId));
    }
    sql += ' ORDER BY m.sales DESC';

    const items = await query(sql, params);
    // tags 字段从逗号分隔转为数组
    const result = items.map(item => ({
      ...item,
      tags: item.tags ? item.tags.split(',').filter(Boolean) : [],
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/menu/item/:id - 获取单个菜品详情
 */
router.get('/item/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const items = await query(
      `SELECT m.id, m.cat_id AS catId, m.name, m.description, m.price,
              m.discount_price AS discountPrice, m.unit, m.image, m.image_url AS imageUrl,
              m.spicy, m.tags, m.sales, m.status, m.created_at, m.updated_at,
              c.name AS categoryName
       FROM menu_items m
       JOIN categories c ON m.cat_id = c.id
       WHERE m.id = ?`,
      [id]
    );
    if (items.length === 0) {
      return res.json({ success: false, message: '菜品不存在' });
    }
    const item = items[0];
    item.tags = item.tags ? item.tags.split(',').filter(Boolean) : [];
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 管理接口（需管理员登录）
// ============================================================

/**
 * GET /api/menu/admin/items - 管理后台获取所有菜品（含下架）
 */
router.get('/admin/items', authMiddleware, async (req, res, next) => {
  try {
    const items = await query(
      `SELECT m.*, c.name AS categoryName
       FROM menu_items m
       JOIN categories c ON m.cat_id = c.id
       ORDER BY m.cat_id ASC, m.id ASC`
    );
    const result = items.map(item => ({
      ...item,
      tags: item.tags ? item.tags.split(',').filter(Boolean) : [],
    }));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/menu/item - 新增菜品
 */
router.post('/item', authMiddleware, async (req, res, next) => {
  try {
    const { catId, name, description, price, discountPrice, imageUrl, unit, image, spicy, tags, status } = req.body;

    // 参数校验
    if (!name || !catId) {
      return res.json({ success: false, message: '菜品名称和分类不能为空' });
    }
    if (!price || price <= 0) {
      return res.json({ success: false, message: '请输入有效的价格' });
    }

    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

    const discountVal = discountPrice !== undefined && discountPrice !== null && discountPrice !== '' ? parseFloat(discountPrice) : null;

    const result = await query(
      `INSERT INTO menu_items (cat_id, name, description, price, discount_price, unit, image, image_url, spicy, tags, status, sales)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        parseInt(catId),
        name,
        description || '',
        parseFloat(price),
        discountVal,
        unit || '份',
        image || '🍽',
        imageUrl || '',
        parseInt(spicy || 0),
        tagsStr,
        status !== undefined ? parseInt(status) : 1,
      ]
    );

    res.json({
      success: true,
      message: '新增菜品成功',
      data: { id: result.insertId },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/menu/item/:id - 修改菜品
 */
router.put('/item/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { catId, name, description, price, discountPrice, imageUrl, unit, image, spicy, tags, status, sales } = req.body;

    // 检查菜品是否存在
    const existing = await query('SELECT id FROM menu_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.json({ success: false, message: '菜品不存在' });
    }

    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags !== undefined ? tags : undefined);

    // 动态构建 SET 子句
    const fields = {};
    if (catId !== undefined) fields.cat_id = parseInt(catId);
    if (name !== undefined) fields.name = name;
    if (description !== undefined) fields.description = description;
    if (price !== undefined) fields.price = parseFloat(price);
    if (unit !== undefined) fields.unit = unit;
    if (discountPrice !== undefined) fields.discount_price = discountPrice !== null && discountPrice !== '' ? parseFloat(discountPrice) : null;
    if (imageUrl !== undefined) fields.image_url = imageUrl;
    if (image !== undefined) fields.image = image;
    if (spicy !== undefined) fields.spicy = parseInt(spicy);
    if (tagsStr !== undefined) fields.tags = tagsStr;
    if (status !== undefined) fields.status = parseInt(status);
    if (sales !== undefined) fields.sales = parseInt(sales);

    const keys = Object.keys(fields);
    if (keys.length === 0) {
      return res.json({ success: false, message: '没有需要更新的字段' });
    }

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);

    await query(`UPDATE menu_items SET ${setClause} WHERE id = ?`, [...values, parseInt(id)]);

    res.json({ success: true, message: '修改菜品成功' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/menu/item/:id - 删除菜品
 */
router.delete('/item/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id FROM menu_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.json({ success: false, message: '菜品不存在' });
    }
    await query('DELETE FROM menu_items WHERE id = ?', [id]);
    res.json({ success: true, message: '删除菜品成功' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/menu/item/:id/status - 上架/下架菜品
 */
router.put('/item/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query('UPDATE menu_items SET status = ? WHERE id = ?', [parseInt(status), parseInt(id)]);
    res.json({ success: true, message: status === 1 ? '已上架' : '已下架' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
