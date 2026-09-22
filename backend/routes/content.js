const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const Category = require('../models/Category');
const path = require('path');
const fs = require('fs');

// Upload directory
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// GET all content
router.get('/', async (req, res) => {
  try {
    const content = await Content.getAll();
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET featured content
router.get('/featured', async (req, res) => {
  try {
    const content = await Content.getFeatured();
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET recent content
router.get('/recent', async (req, res) => {
  try {
    const limit = req.query.limit || 12;
    const content = await Content.getRecent(limit);
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET popular content
router.get('/popular', async (req, res) => {
  try {
    const limit = req.query.limit || 12;
    const content = await Content.getPopular(limit);
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET content by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const content = await Content.getByCategory(req.params.categoryId);
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET content by ID
router.get('/:id', async (req, res) => {
  try {
    const content = await Content.getById(req.params.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new content
router.post('/', async (req, res) => {
  try {
    const { title, description, category_id, video_url, thumbnail_url, 
            duration, quality, is_featured, is_active, tags, release_date } = req.body;
    
    // Validate required fields
    if (!title || !video_url) {
      return res.status(400).json({ error: 'Title and video URL are required' });
    }
    
    // Handle file upload
    let uploadedThumbnail = thumbnail_url;
    if (req.files && req.files.thumbnail) {
      const thumbnail = req.files.thumbnail;
      const thumbnailName = `thumbnail_${Date.now()}${path.extname(thumbnail.name)}`;
      const thumbnailPath = path.join(UPLOAD_DIR, thumbnailName);
      
      await thumbnail.mv(thumbnailPath);
      uploadedThumbnail = `/uploads/${thumbnailName}`;
    }
    
    // Handle video upload
    let uploadedVideo = video_url;
    if (req.files && req.files.video) {
      const video = req.files.video;
      const videoName = `video_${Date.now()}${path.extname(video.name)}`;
      const videoPath = path.join(UPLOAD_DIR, videoName);
      
      await video.mv(videoPath);
      uploadedVideo = `/uploads/${videoName}`;
    }
    
    const content = {
      title,
      description: description || '',
      category_id: category_id || null,
      video_url: uploadedVideo,
      thumbnail_url: uploadedThumbnail,
      duration: duration || null,
      quality: quality || 'HD',
      is_featured: is_featured === true || is_featured === 'true' || false,
      is_active: is_active !== false && is_active !== 'false',
      tags: tags || '',
      release_date: release_date || null
    };
    
    const newContent = await Content.create(content);
    res.status(201).json(newContent);
  } catch (err) {
    console.error('Content creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create content' });
  }
});

// PUT update content
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const content = await Content.getById(id);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    const { title, description, category_id, video_url, thumbnail_url, 
            duration, quality, is_featured, is_active, tags, release_date } = req.body;
    
    // Validate required fields
    if (!title || !video_url) {
      return res.status(400).json({ error: 'Title and video URL are required' });
    }
    
    // Handle file upload
    let uploadedThumbnail = thumbnail_url || content.thumbnail_url;
    if (req.files && req.files.thumbnail) {
      const thumbnail = req.files.thumbnail;
      const thumbnailName = `thumbnail_${Date.now()}${path.extname(thumbnail.name)}`;
      const thumbnailPath = path.join(UPLOAD_DIR, thumbnailName);
      
      await thumbnail.mv(thumbnailPath);
      uploadedThumbnail = `/uploads/${thumbnailName}`;
    }
    
    // Handle video upload
    let uploadedVideo = video_url || content.video_url;
    if (req.files && req.files.video) {
      const video = req.files.video;
      const videoName = `video_${Date.now()}${path.extname(video.name)}`;
      const videoPath = path.join(UPLOAD_DIR, videoName);
      
      await video.mv(videoPath);
      uploadedVideo = `/uploads/${videoName}`;
    }
    
    const updatedContent = {
      title,
      description: description || content.description || '',
      category_id: category_id || content.category_id,
      video_url: uploadedVideo,
      thumbnail_url: uploadedThumbnail,
      duration: duration || content.duration,
      quality: quality || content.quality || 'HD',
      is_featured: is_featured !== undefined ? (is_featured === true || is_featured === 'true') : content.is_featured,
      is_active: is_active !== undefined ? (is_active !== false && is_active !== 'false') : content.is_active,
      tags: tags || content.tags || '',
      release_date: release_date || content.release_date
    };
    
    const result = await Content.update(id, updatedContent);
    res.json(result);
  } catch (err) {
    console.error('Content update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update content' });
  }
});

// DELETE content
router.delete('/:id', async (req, res) => {
  try {
    const content = await Content.getById(req.params.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    const result = await Content.delete(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST increment views
router.post('/:id/views', async (req, res) => {
  try {
    const content = await Content.getById(req.params.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    const result = await Content.incrementViews(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET search content
router.get('/search/:query', async (req, res) => {
  try {
    const content = await Content.search(req.params.query);
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET content stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await Content.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
