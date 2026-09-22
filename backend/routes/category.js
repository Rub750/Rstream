const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Content = require('../models/Content');

// GET all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.getAll();
    
    // Add content count to each category
    const categoriesWithCount = await Promise.all(categories.map(async category => {
      const count = await Category.getContentCount(category.id);
      return { ...category, content_count: count };
    }));
    
    res.json(categoriesWithCount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.getById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const contentCount = await Category.getContentCount(req.params.id);
    res.json({ ...category, content_count: contentCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new category
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon, order_index } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const category = {
      name,
      description: description || '',
      color: color || '#FF5733',
      icon: icon || 'film',
      order_index: order_index || 0
    };
    
    const newCategory = await Category.create(category);
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Category creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create category' });
  }
});

// PUT update category
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const category = await Category.getById(id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const { name, description, color, icon, order_index, is_active } = req.body;
    
    const updatedCategory = {
      name: name || category.name,
      description: description || category.description,
      color: color || category.color,
      icon: icon || category.icon,
      order_index: order_index !== undefined ? order_index : category.order_index,
      is_active: is_active !== undefined ? is_active : category.is_active
    };
    
    const result = await Category.update(id, updatedCategory);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.getById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check if category has content
    const contentCount = await Category.getContentCount(req.params.id);
    if (contentCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with content. Move or delete content first.' 
      });
    }
    
    const result = await Category.delete(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reorder categories
router.post('/reorder', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories array is required' });
    }
    
    const result = await Category.reorder(categories);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET category with content
router.get('/:id/content', async (req, res) => {
  try {
    const category = await Category.getById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const content = await Content.getByCategory(req.params.id);
    res.json({ category, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
