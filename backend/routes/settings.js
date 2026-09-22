const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

// Upload directory
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// GET all settings
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getAll();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET maintenance status
router.get('/maintenance', async (req, res) => {
  try {
    const maintenance = await Settings.getMaintenanceStatus();
    res.json(maintenance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update settings
router.put('/', async (req, res) => {
  try {
    const currentSettings = await Settings.getAll();
    
    const { site_name, site_description, primary_color, secondary_color, 
            background_color, text_color, featured_content_limit, 
            recent_content_limit, auto_play, show_related, 
            maintenance_mode, maintenance_message } = req.body;
    
    // Handle file uploads
    let logo_url = currentSettings.logo_url;
    let favicon_url = currentSettings.favicon_url;
    
    if (req.files && req.files.logo) {
      const logo = req.files.logo;
      const logoName = `logo_${Date.now()}${path.extname(logo.name)}`;
      const logoPath = path.join(UPLOAD_DIR, logoName);
      
      await logo.mv(logoPath);
      logo_url = `/public/uploads/${logoName}`;
    }
    
    if (req.files && req.files.favicon) {
      const favicon = req.files.favicon;
      const faviconName = `favicon_${Date.now()}${path.extname(favicon.name)}`;
      const faviconPath = path.join(UPLOAD_DIR, faviconName);
      
      await favicon.mv(faviconPath);
      favicon_url = `/public/uploads/${faviconName}`;
    }
    
    const settings = {
      site_name: site_name || currentSettings.site_name,
      site_description: site_description || currentSettings.site_description,
      logo_url,
      favicon_url,
      primary_color: primary_color || currentSettings.primary_color,
      secondary_color: secondary_color || currentSettings.secondary_color,
      background_color: background_color || currentSettings.background_color,
      text_color: text_color || currentSettings.text_color,
      featured_content_limit: featured_content_limit || currentSettings.featured_content_limit,
      recent_content_limit: recent_content_limit || currentSettings.recent_content_limit,
      auto_play: auto_play !== undefined ? auto_play : currentSettings.auto_play,
      show_related: show_related !== undefined ? show_related : currentSettings.show_related,
      maintenance_mode: maintenance_mode !== undefined ? maintenance_mode : currentSettings.maintenance_mode,
      maintenance_message: maintenance_message || currentSettings.maintenance_message
    };
    
    const result = await Settings.update(settings);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT toggle maintenance mode
router.put('/maintenance', async (req, res) => {
  try {
    const currentSettings = await Settings.getAll();
    const { maintenance_mode, maintenance_message } = req.body;
    
    const settings = {
      site_name: currentSettings.site_name,
      site_description: currentSettings.site_description,
      logo_url: currentSettings.logo_url,
      favicon_url: currentSettings.favicon_url,
      primary_color: currentSettings.primary_color,
      secondary_color: currentSettings.secondary_color,
      background_color: currentSettings.background_color,
      text_color: currentSettings.text_color,
      featured_content_limit: currentSettings.featured_content_limit,
      recent_content_limit: currentSettings.recent_content_limit,
      auto_play: currentSettings.auto_play,
      show_related: currentSettings.show_related,
      maintenance_mode: maintenance_mode !== undefined ? maintenance_mode : !currentSettings.maintenance_mode,
      maintenance_message: maintenance_message || currentSettings.maintenance_message
    };
    
    const result = await Settings.update(settings);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
