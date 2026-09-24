const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });


const removeLocalUpload = async (value) => {
  if (!value || typeof value !== 'string') return;
  let pathname = value;

  try {
    pathname = new URL(value, 'http://localhost').pathname;
  } catch {
    return;
  }

  if (!pathname.startsWith('/uploads/')) return;
  const filename = path.basename(pathname);
  if (!filename || filename === '.' || filename === '..') return;

  const filepath = path.join(UPLOAD_DIR, filename);
  if (path.dirname(filepath) !== UPLOAD_DIR) return;

  try {
    await fs.promises.unlink(filepath);
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('Upload cleanup failed:', err.message);
  }
};

const asBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
};

const includeInactive = (req) => req.query.includeInactive === '1' || req.query.includeInactive === 'true';

const moveUpload = async (file, prefix) => {
  if (!file) return null;
  const extension = path.extname(file.name || '').toLowerCase();
  const safeExtension = /^[.a-z0-9]+$/.test(extension) ? extension : '';
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExtension}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  await file.mv(filepath);
  return `/uploads/${filename}`;
};

// Fixed/static routes must be declared before /:id.
router.get('/featured', async (req, res) => {
  try {
    const limit = req.query.limit || 6;
    res.json(await Content.getFeatured(limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent', async (req, res) => {
  try {
    res.json(await Content.getRecent(req.query.limit || 12));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/popular', async (req, res) => {
  try {
    res.json(await Content.getPopular(req.query.limit || 12));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/category/:categoryId', async (req, res) => {
  try {
    res.json(await Content.getByCategory(req.params.categoryId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    res.json(await Content.search(req.query.q || ''));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search/:query', async (req, res) => {
  try {
    res.json(await Content.search(req.params.query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    res.json(await Content.getStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    res.json(await Content.getAll(includeInactive(req)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const content = await Content.getById(req.params.id, includeInactive(req));
    if (!content) return res.status(404).json({ error: 'Content not found' });
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, category_id, video_url, thumbnail_url, duration, quality, is_featured, is_active, tags, release_date } = req.body;

    let uploadedThumbnail = thumbnail_url || null;
    let uploadedVideo = video_url || null;

    if (req.files?.thumbnail) uploadedThumbnail = await moveUpload(req.files.thumbnail, 'thumbnail');
    if (req.files?.video) uploadedVideo = await moveUpload(req.files.video, 'video');

    if (!title?.trim() || !uploadedVideo?.trim()) {
      return res.status(400).json({ error: 'Title and video URL are required' });
    }

    const newContent = await Content.create({
      title: title.trim(),
      description: description || '',
      category_id: category_id === '' ? null : category_id || null,
      video_url: uploadedVideo.trim(),
      thumbnail_url: uploadedThumbnail,
      duration: duration || null,
      quality: quality || 'HD',
      is_featured: asBoolean(is_featured),
      is_active: is_active === undefined ? true : asBoolean(is_active, true),
      tags: tags || '',
      release_date: release_date || null
    });

    res.status(201).json(newContent);
  } catch (err) {
    console.error('Content creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create content' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const current = await Content.getById(id, true);
    if (!current) return res.status(404).json({ error: 'Content not found' });

    let uploadedThumbnail = req.body.thumbnail_url !== undefined ? req.body.thumbnail_url : current.thumbnail_url;
    let uploadedVideo = req.body.video_url !== undefined ? req.body.video_url : current.video_url;

    if (req.files?.thumbnail) uploadedThumbnail = await moveUpload(req.files.thumbnail, 'thumbnail');
    if (req.files?.video) uploadedVideo = await moveUpload(req.files.video, 'video');

    if (!req.body.title?.trim() || !uploadedVideo?.trim()) {
      return res.status(400).json({ error: 'Title and video URL are required' });
    }

    const updatedContent = await Content.update(id, {
      title: req.body.title.trim(),
      description: req.body.description !== undefined ? req.body.description : current.description,
      category_id: req.body.category_id === '' ? null : (req.body.category_id !== undefined ? req.body.category_id : current.category_id),
      video_url: uploadedVideo.trim(),
      thumbnail_url: uploadedThumbnail || null,
      duration: req.body.duration !== undefined ? (req.body.duration || null) : current.duration,
      quality: req.body.quality || current.quality || 'HD',
      is_featured: req.body.is_featured !== undefined ? asBoolean(req.body.is_featured) : Boolean(current.is_featured),
      is_active: req.body.is_active !== undefined ? asBoolean(req.body.is_active) : Boolean(current.is_active),
      tags: req.body.tags !== undefined ? req.body.tags : current.tags,
      release_date: req.body.release_date !== undefined ? (req.body.release_date || null) : current.release_date
    });

    res.json(updatedContent);
  } catch (err) {
    console.error('Content update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update content' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const current = await Content.getById(req.params.id, true);
    if (!current) return res.status(404).json({ error: 'Content not found' });
    const deleted = await Content.delete(req.params.id);
    await Promise.all([
      removeLocalUpload(current.video_url),
      removeLocalUpload(current.thumbnail_url)
    ]);
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/views', async (req, res) => {
  try {
    const current = await Content.getById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Content not found' });
    res.json(await Content.incrementViews(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
