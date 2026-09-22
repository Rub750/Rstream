/**
 * Rstream Admin - Main Application
 * Complete admin panel for Rstream platform
 */

// Configuration
const API_BASE = window.location.origin + '/api';

// State
const state = {
    currentSection: 'dashboard',
    theme: localStorage.getItem('admin-theme') || 'dark',
    settings: {},
    content: [],
    categories: [],
    stats: {}
};

// DOM Elements
const elements = {
    app: document.getElementById('admin-app'),
    sidebar: document.getElementById('sidebar'),
    mainContent: document.getElementById('main-content'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    themeToggle: document.getElementById('admin-theme-toggle'),
    breadcrumbText: document.getElementById('breadcrumb-text'),
    contentTableBody: document.getElementById('content-table-body'),
    categoriesGrid: document.getElementById('categories-grid'),
    contentModal: document.getElementById('content-modal'),
    categoryModal: document.getElementById('category-modal'),
    deleteModal: document.getElementById('delete-modal'),
    successModal: document.getElementById('success-modal'),
    errorModal: document.getElementById('error-modal')
};

// Sections
const sections = {
    dashboard: document.getElementById('dashboard-section'),
    content: document.getElementById('content-section'),
    categories: document.getElementById('categories-section'),
    settings: document.getElementById('settings-section'),
    stats: document.getElementById('stats-section')
};

// Utility Functions
const utils = {
    formatDate: (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('fr-FR');
    },
    formatViews: (count) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    },
    truncate: (text, length) => {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }
};

// API Functions
const api = {
    async fetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options
            });
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    async getSettings() { return this.fetch('/settings'); },
    async updateSettings(settings) { return this.fetch('/settings', { method: 'PUT', body: JSON.stringify(settings) }); },
    async getAllContent() { return this.fetch('/content'); },
    async createContent(content) { return this.fetch('/content', { method: 'POST', body: JSON.stringify(content) }); },
    async updateContent(id, content) { return this.fetch(`/content/${id}`, { method: 'PUT', body: JSON.stringify(content) }); },
    async deleteContent(id) { return this.fetch(`/content/${id}`, { method: 'DELETE' }); },
    async getAllCategories() { return this.fetch('/categories'); },
    async createCategory(category) { return this.fetch('/categories', { method: 'POST', body: JSON.stringify(category) }); },
    async updateCategory(id, category) { return this.fetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(category) }); },
    async deleteCategory(id) { return this.fetch(`/categories/${id}`, { method: 'DELETE' }); },
    async getContentStats() { return this.fetch('/content/stats'); }
};

// Navigation
const navigation = {
    showSection(sectionName) {
        Object.values(sections).forEach(s => s.classList.remove('active'));
        if (sections[sectionName]) sections[sectionName].classList.add('active');
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) item.classList.add('active');
        });
        elements.breadcrumbText.textContent = this.getSectionTitle(sectionName);
        state.currentSection = sectionName;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    getSectionTitle(sectionName) {
        const titles = {
            'dashboard': 'Tableau de bord',
            'content': 'Gestion des contenus',
            'categories': 'Gestion des catégories',
            'settings': 'Paramètres',
            'stats': 'Statistiques'
        };
        return titles[sectionName] || sectionName;
    },
    init() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(item.dataset.section);
            });
        });
        elements.mobileMenuBtn.addEventListener('click', () => {
            elements.sidebar.classList.toggle('active');
        });
    }
};

// Content Manager
const contentManager = {
    async loadContent() {
        try {
            state.content = await api.getAllContent();
            this.renderContent();
        } catch (error) {
            this.showError('Impossible de charger les contenus');
        }
    },
    renderContent() {
        const container = elements.contentTableBody;
        if (!state.content || state.content.length === 0) {
            container.innerHTML = '<tr><td colspan="10">Aucun contenu trouvé</td></tr>';
            return;
        }
        container.innerHTML = state.content.map(content => `
            <tr data-id="${content.id}">
                <td>${content.id}</td>
                <td>${content.thumbnail_url ? '<img src="' + content.thumbnail_url + '" style="width:40px;height:30px;object-fit:cover">' : '-'}</td>
                <td>${utils.truncate(content.title, 40)}</td>
                <td>${content.category_name || 'Aucune'}</td>
                <td>${content.quality || 'HD'}</td>
                <td>${utils.formatViews(content.views || 0)}</td>
                <td><i class="fas fa-${content.is_featured === 1 ? 'star' : 'star-o'}"></i></td>
                <td><i class="fas fa-${content.is_active === 1 ? 'check' : 'times'}"></i></td>
                <td>${utils.formatDate(content.created_at)}</td>
                <td>
                    <button class="action-btn" onclick="contentManager.editContent(${content.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn" onclick="contentManager.deleteContent(${content.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },
    showContentModal(content = null) {
        const modal = elements.contentModal;
        modal.querySelector('#modal-title').textContent = content ? 'Modifier le contenu' : 'Ajouter un contenu';
        if (content) {
            modal.querySelector('#content-id').value = content.id;
            modal.querySelector('#content-title').value = content.title;
            modal.querySelector('#content-description').value = content.description || '';
            modal.querySelector('#content-video-url').value = content.video_url || '';
            modal.querySelector('#content-thumbnail-url').value = content.thumbnail_url || '';
            modal.querySelector('#content-featured').checked = content.is_featured === 1;
            modal.querySelector('#content-active').checked = content.is_active === 1;
        } else {
            modal.querySelector('#content-form').reset();
        }
        modal.classList.add('active');
    },
    async saveContent() {
        try {
            const form = elements.contentModal.querySelector('#content-form');
            const formData = new FormData(form);
            const content = Object.fromEntries(formData);
            content.is_featured = formData.get('is_featured') ? 1 : 0;
            content.is_active = formData.get('is_active') ? 1 : 0;
            
            if (content.id) {
                await api.updateContent(content.id, content);
            } else {
                await api.createContent(content);
            }
            this.hideContentModal();
            this.showSuccess('Contenu enregistré avec succès !');
            await this.loadContent();
        } catch (error) {
            this.showError('Erreur: ' + error.message);
        }
    },
    async deleteContent(id) {
        try {
            await api.deleteContent(id);
            this.hideDeleteModal();
            this.showSuccess('Contenu supprimé avec succès !');
            await this.loadContent();
        } catch (error) {
            this.showError('Erreur: ' + error.message);
        }
    },
    editContent(id) {
        const content = state.content.find(c => c.id == id);
        if (content) this.showContentModal(content);
    },
    hideContentModal() { elements.contentModal.classList.remove('active'); },
    showDeleteModal(id) {
        state.deleteItem = id;
        elements.deleteModal.querySelector('#delete-message').textContent = 'Supprimer ce contenu?';
        elements.deleteModal.classList.add('active');
    },
    hideDeleteModal() { elements.deleteModal.classList.remove('active'); },
    showSuccess(message) {
        elements.successModal.querySelector('#success-message').textContent = message;
        elements.successModal.classList.add('active');
        setTimeout(() => elements.successModal.classList.remove('active'), 3000);
    },
    showError(message) {
        elements.errorModal.querySelector('#error-message').textContent = message;
        elements.errorModal.classList.add('active');
    },
    hideErrorModal() { elements.errorModal.classList.remove('active'); },
    init() {
        document.getElementById('add-content-btn').addEventListener('click', () => this.showContentModal());
        elements.contentModal.querySelector('.modal-close').addEventListener('click', () => this.hideContentModal());
        elements.contentModal.querySelector('#save-content-btn').addEventListener('click', () => this.saveContent());
        elements.contentModal.querySelector('#cancel-content-btn').addEventListener('click', () => this.hideContentModal());
        elements.deleteModal.querySelector('.modal-close').addEventListener('click', () => this.hideDeleteModal());
        elements.deleteModal.querySelector('#cancel-delete-btn').addEventListener('click', () => this.hideDeleteModal());
        elements.deleteModal.querySelector('#confirm-delete-btn').addEventListener('click', () => this.deleteContent(state.deleteItem));
        elements.successModal.querySelector('.modal-close').addEventListener('click', () => elements.successModal.classList.remove('active'));
        elements.errorModal.querySelector('.modal-close').addEventListener('click', () => this.hideErrorModal());
    }
};

// Category Manager
const categoryManager = {
    async loadCategories() {
        try {
            state.categories = await api.getAllCategories();
            this.renderCategories();
        } catch (error) {
            contentManager.showError('Impossible de charger les catégories');
        }
    },
    renderCategories() {
        const container = elements.categoriesGrid;
        if (!state.categories || state.categories.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><h3>Aucune catégorie</h3></div>';
            return;
        }
        container.innerHTML = state.categories.map(category => `
            <div class="category-card" data-id="${category.id}" style="border-top: 3px solid ${category.color || '#FF5733'}">
                <div class="category-header">
                    <div class="category-icon" style="background: ${category.color || '#FF5733'}">
                        <i class="fas fa-${category.icon || 'film'}"></i>
                    </div>
                    <div class="category-info">
                        <h3>${category.name}</h3>
                        <p>${category.description || 'Aucune description'}</p>
                    </div>
                </div>
                <div class="category-actions">
                    <button class="action-btn" onclick="categoryManager.editCategory(${category.id})"><i class="fas fa-edit"></i> Modifier</button>
                    <button class="action-btn" onclick="categoryManager.deleteCategory(${category.id})"><i class="fas fa-trash"></i> Supprimer</button>
                </div>
            </div>
        `).join('');
    },
    showCategoryModal(category = null) {
        const modal = elements.categoryModal;
        modal.querySelector('#category-modal-title').textContent = category ? 'Modifier la catégorie' : 'Ajouter une catégorie';
        if (category) {
            modal.querySelector('#category-id').value = category.id;
            modal.querySelector('#category-name').value = category.name;
            modal.querySelector('#category-description').value = category.description || '';
            modal.querySelector('#category-color').value = category.color || '#FF5733';
            modal.querySelector('#category-icon').value = category.icon || 'film';
            modal.querySelector('#category-active').checked = category.is_active === 1;
        } else {
            modal.querySelector('#category-form').reset();
        }
        modal.classList.add('active');
    },
    async saveCategory() {
        try {
            const form = elements.categoryModal.querySelector('#category-form');
            const formData = new FormData(form);
            const category = Object.fromEntries(formData);
            category.is_active = formData.get('is_active') ? 1 : 0;
            
            if (category.id) {
                await api.updateCategory(category.id, category);
            } else {
                await api.createCategory(category);
            }
            this.hideCategoryModal();
            contentManager.showSuccess('Catégorie enregistrée avec succès !');
            await this.loadCategories();
        } catch (error) {
            contentManager.showError('Erreur: ' + error.message);
        }
    },
    async deleteCategory(id) {
        try {
            await api.deleteCategory(id);
            contentManager.hideDeleteModal();
            contentManager.showSuccess('Catégorie supprimée avec succès !');
            await this.loadCategories();
        } catch (error) {
            contentManager.showError('Erreur: ' + error.message);
        }
    },
    editCategory(id) {
        const category = state.categories.find(c => c.id == id);
        if (category) this.showCategoryModal(category);
    },
    hideCategoryModal() { elements.categoryModal.classList.remove('active'); },
    showDeleteModal(id) {
        state.deleteItem = id;
        state.deleteType = 'category';
        elements.deleteModal.querySelector('#delete-message').textContent = 'Supprimer cette catégorie?';
        elements.deleteModal.classList.add('active');
    },
    init() {
        document.getElementById('add-category-btn').addEventListener('click', () => this.showCategoryModal());
        elements.categoryModal.querySelector('.modal-close').addEventListener('click', () => this.hideCategoryModal());
        elements.categoryModal.querySelector('#save-category-btn').addEventListener('click', () => this.saveCategory());
        elements.categoryModal.querySelector('#cancel-category-btn').addEventListener('click', () => this.hideCategoryModal());
    }
};

// Theme
const theme = {
    init() {
        this.applyTheme(state.theme);
        elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    },
    toggleTheme() {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('admin-theme', state.theme);
        this.applyTheme(state.theme);
    },
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = elements.themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
};

// Initialize
const init = async () => {
    theme.init();
    navigation.init();
    contentManager.init();
    categoryManager.init();
    
    // Load initial data
    try {
        const [settings, stats] = await Promise.all([
            api.getSettings(),
            api.getContentStats()
        ]);
        state.settings = settings;
        state.stats = stats;
        
        // Update dashboard
        document.getElementById('dashboard-total-content').textContent = stats.total_content || 0;
        document.getElementById('dashboard-total-views').textContent = utils.formatViews(stats.total_views || 0);
        document.getElementById('dashboard-total-categories').textContent = stats.total_categories || 0;
        document.getElementById('dashboard-featured-content').textContent = stats.featured_content || 0;
        
        // Load categories
        await categoryManager.loadCategories();
    } catch (error) {
        console.error('Initialization error:', error);
    }
};

// Start Application
document.addEventListener('DOMContentLoaded', init);
