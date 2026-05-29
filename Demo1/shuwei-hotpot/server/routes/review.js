/**
 * 评价 API 路由
 * 支持图片上传、修改评价
 */
const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * POST /api/review/create - 提交评价
 * body: { orderNo, rating, comment, images }
 */
router.post('/create', async (req, res, next) => {
  try {
    const { orderNo, rating, comment, images } = req.body;

    if (!orderNo || !rating) {
      return res.json({ success: false, message: '订单号和评分不能为空' });
    }
    if (rating < 1 || rating > 5) {
      return res.json({ success: false, message: '评分范围为1-5' });
    }

    const orders = await query('SELECT id FROM orders WHERE order_no = ?', [orderNo]);
    if (orders.length === 0) {
      return res.json({ success: false, message: '订单不存在' });
    }

    const orderId = orders[0].id;
    const imagesStr = images && Array.isArray(images) ? JSON.stringify(images) : null;

    // 插入评价
    await query(
      'INSERT INTO reviews (order_id, rating, comment, images) VALUES (?, ?, ?, ?)',
      [orderId, parseInt(rating), comment || '', imagesStr]
    );

    // 更新订单状态
    await query("UPDATE orders SET status = 'reviewed' WHERE id = ?", [orderId]);

    res.json({ success: true, message: '评价成功' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/review/update - 修改评价
 * body: { orderNo, rating, comment, images }
 */
router.put('/update', async (req, res, next) => {
  try {
    const { orderNo, rating, comment, images } = req.body;

    if (!orderNo) {
      return res.json({ success: false, message: '订单号不能为空' });
    }

    const orders = await query('SELECT id FROM orders WHERE order_no = ?', [orderNo]);
    if (orders.length === 0) {
      return res.json({ success: false, message: '订单不存在' });
    }

    const orderId = orders[0].id;
    const imagesStr = images && Array.isArray(images) ? JSON.stringify(images) : null;

    // 检查是否已有评价
    const existing = await query('SELECT id FROM reviews WHERE order_id = ?', [orderId]);

    if (existing.length > 0) {
      // 更新
      const fields = [];
      const vals = [];
      if (rating !== undefined) { fields.push('rating = ?'); vals.push(parseInt(rating)); }
      if (comment !== undefined) { fields.push('comment = ?'); vals.push(comment); }
      if (imagesStr !== undefined) { fields.push('images = ?'); vals.push(imagesStr); }
      if (fields.length > 0) {
        vals.push(orderId);
        await query(`UPDATE reviews SET ${fields.join(', ')} WHERE order_id = ?`, vals);
      }
    } else {
      // 插入
      await query(
        'INSERT INTO reviews (order_id, rating, comment, images) VALUES (?, ?, ?, ?)',
        [orderId, parseInt(rating || 5), comment || '', imagesStr]
      );
      await query("UPDATE orders SET status = 'reviewed' WHERE id = ?", [orderId]);
    }

    res.json({ success: true, message: '评价已保存' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/review/detail - 获取某订单的评价
 * query: orderNo
 */
router.get('/detail', async (req, res, next) => {
  try {
    const { orderNo } = req.query;
    if (!orderNo) return res.json({ success: false, message: '订单号不能为空' });

    const orders = await query('SELECT id FROM orders WHERE order_no = ?', [orderNo]);
    if (orders.length === 0) return res.json({ success: false, data: null });

    const reviews = await query(
      'SELECT id, rating, comment, images, created_at, updated_at FROM reviews WHERE order_id = ? ORDER BY id DESC LIMIT 1',
      [orders[0].id]
    );

    if (reviews.length === 0) return res.json({ success: true, data: null });

    const r = reviews[0];
    res.json({
      success: true,
      data: {
        reviewId: r.id,
        rating: r.rating,
        comment: r.comment || '',
        images: r.images ? JSON.parse(r.images) : [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/review/list - 获取所有评价
 */
router.get('/list', async (req, res, next) => {
  try {
    const reviews = await query(`
      SELECT
        r.id AS reviewId,
        r.rating,
        r.comment AS reviewComment,
        r.images AS reviewImages,
        r.created_at AS reviewTime,
        o.order_no AS orderId,
        o.table_no AS tableNo,
        o.total_price AS totalPrice,
        o.created_at AS orderTime
      FROM reviews r
      JOIN orders o ON r.order_id = o.id
      ORDER BY r.created_at DESC
    `);

    const result = [];
    for (const r of reviews) {
      const orderDbId = await query(
        'SELECT id FROM orders WHERE order_no = ?', [r.orderId]
      );
      const items = orderDbId.length > 0 ? await query(
        'SELECT item_name, item_price, quantity, subtotal FROM order_items WHERE order_id = ?',
        [orderDbId[0].id]
      ) : [];

      const comment = r.reviewComment || '';
      result.push({
        orderId: r.orderId,
        tableNo: r.tableNo,
        rating: r.rating,
        comment,
        commentShort: comment.length > 20 ? comment.substring(0, 20) + '...' : comment,
        images: r.reviewImages ? JSON.parse(r.reviewImages) : [],
        reviewTime: r.reviewTime,
        totalPrice: r.totalPrice,
        totalPriceStr: parseFloat(r.totalPrice).toFixed(2),
        items: items.map(i => ({ name: i.item_name, price: i.item_price, quantity: i.quantity })),
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/review/stats - 评价统计
 */
router.get('/stats', async (req, res, next) => {
  try {
    const totalResult = await query('SELECT COUNT(*) AS cnt FROM reviews');
    const ratingStats = await query(
      'SELECT rating, COUNT(*) AS cnt FROM reviews GROUP BY rating ORDER BY rating DESC'
    );

    const ratingCounts = [0, 0, 0, 0, 0];
    let ratingSum = 0;
    let total = 0;

    ratingStats.forEach(r => {
      const idx = r.rating - 1;
      if (idx >= 0 && idx < 5) {
        ratingCounts[idx] = r.cnt;
        ratingSum += r.rating * r.cnt;
        total += r.cnt;
      }
    });

    const averageRating = total > 0 ? (ratingSum / total) : 0;

    res.json({
      success: true,
      data: { total, averageRating, ratingCounts },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
