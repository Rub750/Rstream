const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../rstream.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create tables
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          color TEXT DEFAULT '#FF5733',
          icon TEXT DEFAULT 'film',
          order_index INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating categories table:', err.message);
          return reject(err);
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS content (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          category_id INTEGER,
          video_url TEXT NOT NULL,
          thumbnail_url TEXT,
          duration TEXT,
          quality TEXT DEFAULT 'HD',
          views INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          is_featured BOOLEAN DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          tags TEXT,
          release_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating content table:', err.message);
          return reject(err);
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          site_name TEXT DEFAULT 'Rstream',
          site_description TEXT DEFAULT 'Plateforme de streaming de qualité',
          logo_url TEXT,
          favicon_url TEXT,
          primary_color TEXT DEFAULT '#FF5733',
          secondary_color TEXT DEFAULT '#33FF57',
          background_color TEXT DEFAULT '#1a1a1a',
          text_color TEXT DEFAULT '#ffffff',
          featured_content_limit INTEGER DEFAULT 6,
          recent_content_limit INTEGER DEFAULT 12,
          auto_play BOOLEAN DEFAULT 0,
          show_related BOOLEAN DEFAULT 1,
          maintenance_mode BOOLEAN DEFAULT 0,
          maintenance_message TEXT DEFAULT 'Site en maintenance, merci de revenir plus tard.'
        )
      `, (err) => {
        if (err) {
          console.error('Error creating settings table:', err.message);
          return reject(err);
        }
      });

      // Insert default settings if not exists
      db.get('SELECT COUNT(*) as count FROM settings', (err, row) => {
        if (err) {
          console.error('Error checking settings:', err.message);
          return reject(err);
        }
        
        if (row.count === 0) {
          db.run(`
            INSERT INTO settings (site_name, site_description, primary_color, secondary_color) 
            VALUES ('Rstream', 'Votre plateforme de streaming préférée', '#FF5733', '#33FF57')
          `, (err) => {
            if (err) {
              console.error('Error inserting default settings:', err.message);
              return reject(err);
            }
          });
        }
      });

      // Insert default categories if not exists
      db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
        if (err) {
          console.error('Error checking categories:', err.message);
          return reject(err);
        }
        
        if (row.count === 0) {
          const defaultCategories = [
            { name: 'Films', description: 'Longs métrages et films', color: '#FF5733', icon: 'film', order_index: 1 },
            { name: 'Séries', description: 'Séries télévisées', color: '#33FF57', icon: 'tv', order_index: 2 },
            { name: 'Documentaires', description: 'Documentaires éducatifs', color: '#3357FF', icon: 'book', order_index: 3 },
            { name: 'Animations', description: 'Dessins animés et anime', color: '#F3FF33', icon: 'animation', order_index: 4 },
            { name: 'Musique', description: 'Clips musicaux et concerts', color: '#FF33F3', icon: 'music', order_index: 5 }
          ];

          defaultCategories.forEach(category => {
            db.run(`
              INSERT INTO categories (name, description, color, icon, order_index) 
              VALUES (?, ?, ?, ?, ?)
            `, [category.name, category.description, category.color, category.icon, category.order_index], (err) => {
              if (err) {
                console.error('Error inserting default category:', err.message);
              }
            });
          });
        }
        resolve();
      });
    });
  });
};

const getDb = () => {
  return db;
};

module.exports = {
  initializeDatabase,
  getDb
};
