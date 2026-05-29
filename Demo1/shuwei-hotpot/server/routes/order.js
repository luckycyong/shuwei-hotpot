/**
 * 订单 API 路由
 * 供小程序前端调用的订单接口
 */
const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * POST /api/order/create - 创建订单（支付成功后调用）
 * body: { tableNo, items, totalPrice, totalCount, payMethod, paidTime }
 */
router.post('/create', async (req, res, next) => {
  try {
    const { tableNo, items, totalPrice, totalCount, payMethod, paidTime } = req.body;

    if (!tableNo || !items || items.length === 0) {
      return res.json({ success: false, message: '订单参数不完整' });
    }

    // 生成订单号
    const orderNo = 'ORD' + Date.now();
    const now = new Date().toLocaleString('zh-CN', { hour12: false });

    // 插入订单
    const orderResult = await query(
      `INSERT INTO orders (order_no, table_no, total_price, total_count, status, pay_method, paid_time)
       VALUES (?, ?, ?, ?, 'paid', ?, ?)`,
      [orderNo, tableNo, parseFloat(totalPrice), parseInt(totalCount), payMethod || '微信支付', paidTime || now]
    );

    const orderId = orderResult.insertId;

    // 插入订单明细
    for (const item of items) {
      await query(
        `INSERT INTO order_items (order_id, item_name, item_price, quantity, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.name, parseFloat(item.price), parseInt(item.quantity), parseFloat(item.price) * parseInt(item.quantity)]
      );
    }

    // 返回完整订单数据
    const newOrder = await query(
      `SELECT * FROM orders WHERE id = ?`, [orderId]
    );
    const orderItems = await query(
      `SELECT * FROM order_items WHERE order_id = ?`, [orderId]
    );

    res.json({
      success: true,
      message: '下单成功',
      data: {
        ...newOrder[0],
        items: orderItems,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/order/list - 获取订单列表
 * query: ?tableNo=A12（按桌号筛选，不传则返回所有）
 */
router.get('/list', async (req, res, next) => {
  try {
    const { tableNo } = req.query;
    let orderList;

    if (tableNo) {
      orderList = await query(
        `SELECT * FROM orders WHERE table_no = ? ORDER BY created_at DESC`, [tableNo]
      );
    } else {
      orderList = await query(
        `SELECT * FROM orders ORDER BY created_at DESC`
      );
    }

    // 为每个订单加载明细
    const result = [];
    for (const order of orderList) {
      const items = await query(
        `SELECT * FROM order_items WHERE order_id = ?`, [order.id]
      );
      result.push({
        id: order.order_no,
        _dbId: order.id,
        tableNo: order.table_no,
        totalPrice: order.total_price,
        totalCount: order.total_count,
        status: order.status,
        payMethod: order.pay_method,
        createTime: order.created_at ? new Date(order.created_at).toLocaleString('zh-CN', { hour12: false }) : '',
        paidTime: order.paid_time ? new Date(order.paid_time).toLocaleString('zh-CN', { hour12: false }) : '',
        items: items.map(i => ({
          name: i.item_name,
          price: i.item_price,
          quantity: i.quantity,
          subtotal: i.subtotal,
        })),
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/order/:orderNo/status - 更新订单状态
 * body: { status: 'completed' | 'reviewed' }
 */
router.put('/:orderNo/status', async (req, res, next) => {
  try {
    const { orderNo } = req.params;
    const { status } = req.body;

    const validStatuses = ['paid', 'completed', 'reviewed'];
    if (!validStatuses.includes(status)) {
      return res.json({ success: false, message: '无效的状态值' });
    }

    await query('UPDATE orders SET status = ? WHERE order_no = ?', [status, orderNo]);

    res.json({ success: true, message: '状态更新成功' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/order/stats - 获取订单统计数据
 */
router.get('/stats', async (req, res, next) => {
  try {
    const totalResult = await query('SELECT COUNT(*) AS cnt FROM orders');
    const reviewedResult = await query("SELECT COUNT(*) AS cnt FROM orders WHERE status = 'reviewed'");

    res.json({
      success: true,
      data: {
        totalOrders: totalResult[0].cnt,
        reviewedCount: reviewedResult[0].cnt,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
