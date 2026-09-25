const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const path = require('path');
const fs = require('fs');
const githubStorage = require('../services/githubStorage');

const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DEFAULTS = {
  site_name: 'Rstream',
  site_description: 'Votre plateforme de streaming préférée',
  logo_url: null,
  favicon_url: null,
  primary_color: '#FF5733',
  secondary_color: '#33FF57',
  background_color: '#1a1a1a',
  text_color: '#ffffff',
  featured_content_limit: 6,
  recent_content_limit: 12,
  auto_play: 0,
  show_related: 1,
  maintenance_mode: 0,
  maintenance_message: 'Site en maintenance, merci de revenir plus tard.'
};

const asBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
};

const moveUpload = async (file, prefix) => {
  if (githubStorage.isConfigured()) return githubStorage.uploadMedia(file.data, file.name, prefix);
  if (!file) return null;
  const extension = path.extname(file.name || '').toLowerCase();
  const safeExtension = /^[.a-z0-9]+$/.test(extension) ? extension : '';
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExtension}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  await file.mv(filepath);
  return `/uploads/${filename}`;
};

const getOrDefault = async () => (await Settings.getAll()) || { id: 1, ...DEFAULTS };

router.get('/maintenance', async (req, res) => {
  try {
    const settings = await getOrDefault();
    res.json({ maintenance_mode: settings.maintenance_mode, maintenance_message: settings.maintenance_message });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get maintenance status' });
  }
});

router.get('/', async (req, res) => {
  try {
    res.json(await getOrDefault());
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get settings' });
  }
});

router.put('/maintenance', async (req, res) => {
  try {
    const current = await getOrDefault();
    const result = await Settings.update({
      ...current,
      maintenance_mode: req.body.maintenance_mode !== undefined ? (asBoolean(req.body.maintenance_mode) ? 1 : 0) : (current.maintenance_mode ? 0 : 1),
      maintenance_message: req.body.maintenance_message !== undefined ? req.body.maintenance_message : current.maintenance_message
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update maintenance mode' });
  }
});

router.put('/', async (req, res) => {
  try {
    const current = await getOrDefault();
    let logo_url = current.logo_url;
    let favicon_url = current.favicon_url;

    if (req.files?.logo) logo_url = await moveUpload(req.files.logo, 'logo');
    if (req.files?.favicon) favicon_url = await moveUpload(req.files.favicon, 'favicon');

    const settings = {
      site_name: req.body.site_name !== undefined ? req.body.site_name : current.site_name,
      site_description: req.body.site_description !== undefined ? req.body.site_description : current.site_description,
      logo_url,
      favicon_url,
      primary_color: req.body.primary_color || current.primary_color,
      secondary_color: req.body.secondary_color || current.secondary_color,
      background_color: req.body.background_color || current.background_color,
      text_color: req.body.text_color || current.text_color,
      featured_content_limit: Math.min(Math.max(Number(req.body.featured_content_limit ?? current.featured_content_limit) || 1, 1), 50),
      recent_content_limit: Math.min(Math.max(Number(req.body.recent_content_limit ?? current.recent_content_limit) || 1, 1), 100),
      auto_play: asBoolean(req.body.auto_play, Boolean(current.auto_play)) ? 1 : 0,
      show_related: asBoolean(req.body.show_related, Boolean(current.show_related)) ? 1 : 0,
      maintenance_mode: asBoolean(req.body.maintenance_mode, Boolean(current.maintenance_mode)) ? 1 : 0,
      maintenance_message: req.body.maintenance_message !== undefined ? req.body.maintenance_message : current.maintenance_message
    };

    res.json(await Settings.update(settings));
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

module.exports = router;
