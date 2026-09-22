const db = require('./database').getDb();

class Category {
  static getAll() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM categories 
        WHERE is_active = 1 
        ORDER BY order_index ASC, name ASC
      `, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM categories 
        WHERE id = ? AND is_active = 1
      `, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static getByName(name) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM categories 
        WHERE name = ? AND is_active = 1
      `, [name], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static create(category) {
    return new Promise((resolve, reject) => {
      const { name, description, color, icon, order_index } = category;
      
      db.run(`
        INSERT INTO categories (name, description, color, icon, order_index) 
        VALUES (?, ?, ?, ?, ?)
      `, [name, description, color, icon, order_index || 0], function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...category });
      });
    });
  }

  static update(id, category) {
    return new Promise((resolve, reject) => {
      const { name, description, color, icon, order_index, is_active } = category;
      
      db.run(`
        UPDATE categories 
        SET name = ?, description = ?, color = ?, icon = ?, order_index = ?, is_active = ?
        WHERE id = ?
      `, [name, description, color, icon, order_index, is_active, id], function(err) {
        if (err) return reject(err);
        resolve({ id, ...category });
      });
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE categories SET is_active = 0 WHERE id = ?`, [id], function(err) {
        if (err) return reject(err);
        resolve({ id, deleted: true });
      });
    });
  }

  static reorder(categories) {
    return new Promise((resolve, reject) => {
      const transactions = categories.map((cat, index) => {
        return new Promise((resolve, reject) => {
          db.run(`UPDATE categories SET order_index = ? WHERE id = ?`, [index, cat.id], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      });
      
      Promise.all(transactions)
        .then(() => resolve({ success: true, message: 'Categories reordered' }))
        .catch(reject);
    });
  }

  static getContentCount(categoryId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM content 
        WHERE category_id = ? AND is_active = 1
      `, [categoryId], (err, row) => {
        if (err) return reject(err);
        resolve(row.count);
      });
    });
  }
}

module.exports = Category;
