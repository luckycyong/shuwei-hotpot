/**
 * 图片上传路由
 * 用于管理员上传菜品图片
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowTypes = /jpeg|jpg|png|gif|webp/;
    const extOk = allowTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowTypes.test(file.mimetype.split('/')[1] || '');
    cb(null, extOk || mimeOk);
  },
});

/**
 * POST /api/upload/image - 上传菜品图片
 */
router.post('/image', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.json({ success: false, message: '请选择图片文件' });
  }
  const url = `http://localhost:3001/uploads/${req.file.filename}`;
  res.json({ success: true, message: '上传成功', data: { url, filename: req.file.filename } });
});

module.exports = router;
