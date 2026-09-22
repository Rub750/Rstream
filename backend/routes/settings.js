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
    let settings = await Settings.getAll();
    if (!settings) {
      // Return default settings if none exist
      settings = {
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
    }
    res.json(settings);
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: err.message || 'Failed to get settings' });
  }
});

// GET maintenance status
router.get('/maintenance', async (req, res) => {
  try {
    let maintenance = await Settings.getMaintenanceStatus();
    if (!maintenance) {
      maintenance = {
        maintenance_mode: 0,
        maintenance_message: 'Site en maintenance, merci de revenir plus tard.'
      };
    }
    res.json(maintenance);
  } catch (err) {
    console.error('Maintenance status error:', err);
    res.status(500).json({ error: err.message || 'Failed to get maintenance status' });
  }
});

// PUT update settings
router.put('/', async (req, res) => {
  try {
    let currentSettings = await Settings.getAll();
    
    if (!currentSettings) {
      currentSettings = {
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
    }
    
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
      logo_url = `/uploads/${logoName}`;
    }
    
    if (req.files && req.files.favicon) {
      const favicon = req.files.favicon;
      const faviconName = `favicon_${Date.now()}${path.extname(favicon.name)}`;
      const faviconPath = path.join(UPLOAD_DIR, faviconName);
      
      await favicon.mv(faviconPath);
      favicon_url = `/uploads/${faviconName}`;
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
    console.error('Settings update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update settings' });
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
