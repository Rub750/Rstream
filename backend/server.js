const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const db = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
const contentRoutes = require('./routes/content');
const categoryRoutes = require('./routes/category');
const settingsRoutes = require('./routes/settings');

app.use('/api/content', contentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/settings', settingsRoutes);

// Serve frontend files
app.use('/streaming', express.static(path.join(__dirname, '../frontend/streaming')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/streaming');
});

// API root
app.get('/api', (req, res) => {
  res.json({ message: 'Rstream API', version: '1.0.0' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
db.initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Streaming site: http://localhost:${PORT}/streaming`);
    console.log(`Admin site: http://localhost:${PORT}/admin`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
