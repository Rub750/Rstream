const db = require('./database').getDb();

class Settings {
  static getAll() {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM settings LIMIT 1', (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static update(settings) {
    return new Promise((resolve, reject) => {
      const { site_name, site_description, logo_url, favicon_url, primary_color, 
              secondary_color, background_color, text_color, featured_content_limit, 
              recent_content_limit, auto_play, show_related, maintenance_mode, maintenance_message } = settings;
      
      db.run(`
        UPDATE settings 
        SET site_name = ?, site_description = ?, logo_url = ?, favicon_url = ?, 
            primary_color = ?, secondary_color = ?, background_color = ?, text_color = ?, 
            featured_content_limit = ?, recent_content_limit = ?, auto_play = ?, 
            show_related = ?, maintenance_mode = ?, maintenance_message = ?
        WHERE id = 1
      `, [site_name, site_description, logo_url, favicon_url, primary_color, 
          secondary_color, background_color, text_color, featured_content_limit, 
          recent_content_limit, auto_play, show_related, maintenance_mode, maintenance_message], function(err) {
        if (err) return reject(err);
        resolve({ id: 1, ...settings });
      });
    });
  }

  static getMaintenanceStatus() {
    return new Promise((resolve, reject) => {
      db.get('SELECT maintenance_mode, maintenance_message FROM settings LIMIT 1', (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }
}

module.exports = Settings;
