const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { insertPhoto, getAllPhotos, deletePhoto } = require('../db');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpeg|jpg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// GET /api/photos — list all photos
router.get('/', (req, res) => {
  res.json(getAllPhotos.all());
});

// POST /api/photos — upload a photo
router.post('/', upload.single('photo'), (req, res) => {
  const { uploader, caption } = req.body;
  if (!uploader || !uploader.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'La foto es requerida.' });
  }
  const info = insertPhoto.run(req.file.filename, uploader.trim(), (caption || '').trim());
  res.json({ id: info.lastInsertRowid, filename: req.file.filename });
});

// DELETE /api/photos/:id — delete a photo
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const photo = getAllPhotos.all().find(p => p.id === id);
  if (!photo) return res.status(404).json({ error: 'Foto no encontrada.' });

  const filePath = path.join(uploadDir, photo.filename);
  deletePhoto.run(id);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  res.json({ success: true });
});

// Error handler for multer
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

module.exports = router;
