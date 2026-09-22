const db = require('./database').getDb();

class Content {
  static getAll() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, cat.name as category_name, cat.color as category_color 
        FROM content c 
        LEFT JOIN categories cat ON c.category_id = cat.id 
        WHERE c.is_active = 1 
        ORDER BY c.created_at DESC
      `, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getFeatured() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, cat.name as category_name, cat.color as category_color 
        FROM content c 
        LEFT JOIN categories cat ON c.category_id = cat.id 
        WHERE c.is_active = 1 AND c.is_featured = 1 
        ORDER BY c.created_at DESC 
        LIMIT 6
      `, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getByCategory(categoryId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, cat.name as category_name, cat.color as category_color 
        FROM content c 
        LEFT JOIN categories cat ON c.category_id = cat.id 
        WHERE c.is_active = 1 AND c.category_id = ? 
        ORDER BY c.created_at DESC
      `, [categoryId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT c.*, cat.name as category_name, cat.color as category_color 
        FROM content c 
        LEFT JOIN categories cat ON c.category_id = cat.id 
        WHERE c.id = ? AND c.is_active = 1
      `, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static getRecent(limit = 12) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, cat.name as category_name, cat.color as category_color 
        FROM content c 
        LEFT JOIN categories cat ON c.category_id = cat.id 
        WHERE c.is_active = 1 
        ORDER BY c.created_at DESC 
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getPopular(limit = 12) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, cat.name as category_name, cat.color as category_color 
        FROM content c 
        LEFT JOIN categories cat ON c.category_id = cat.id 
        WHERE c.is_active = 1 
        ORDER BY c.views DESC 
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static create(content) {
    return new Promise((resolve, reject) => {
      const { title, description, category_id, video_url, thumbnail_url, duration, quality, tags, release_date } = content;
      
      db.run(`
        INSERT INTO content (title, description, category_id, video_url, thumbnail_url, duration, quality, tags, release_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [title, description, category_id, video_url, thumbnail_url, duration, quality, tags, release_date], function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...content });
      });
    });
  }

  static update(id, content) {
    return new Promise((resolve, reject) => {
      const { title, description, category_id, video_url, thumbnail_url, duration, quality, is_featured, is_active, tags, release_date } = content;
      
      db.run(`
        UPDATE content 
        SET title = ?, description = ?, category_id = ?, video_url = ?, thumbnail_url = ?, 
            duration = ?, quality = ?, is_featured = ?, is_active = ?, tags = ?, release_date = ?
        WHERE id = ?
      `, [title, description, category_id, video_url, thumbnail_url, duration, quality, is_featured, is_active, tags, release_date, id], function(err) {
        if (err) return reject(err);
        resolve({ id, ...content });
      });
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE content SET is_active = 0 WHERE id = ?`, [id], function(err) {
        if (err) return reject(err);
        resolve({ id, deleted: true });
      });
    });
  }

  static incrementViews(id) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE content SET views = views + 1 WHERE id = ?`, [id], function(err) {
        if (err) return reject(err);
        resolve({ id, views_incremented: true });
      });
    });
  }

  static search(query) {
    return new Promise((resolve, reject) => {
      const searchTerm = `%${query}%`;
      db.all(`
        SELECT c.*, cat.name as category_name, cat.color as category_color 
        FROM content c 
        LEFT JOIN categories cat ON c.category_id = cat.id 
        WHERE c.is_active = 1 AND (c.title LIKE ? OR c.description LIKE ? OR c.tags LIKE ?)
        ORDER BY c.created_at DESC
      `, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getStats() {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total_content,
          SUM(views) as total_views,
          SUM(likes) as total_likes,
          COUNT(DISTINCT category_id) as total_categories
        FROM content WHERE is_active = 1
      `, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }
}

module.exports = Content;
