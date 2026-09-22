/**
 * Rstream - Main Application JavaScript
 * Gère toute la logique frontend du site de streaming
 */

// ===== Configuration =====
const API_BASE = window.location.origin + '/api';
const ASSETS_BASE = window.location.origin + '/public/uploads';

// ===== State Management =====
const state = {
    currentSection: 'home',
    currentCategory: null,
    searchQuery: '',
    theme: localStorage.getItem('theme') || 'dark',
    settings: {},
    content: [],
    categories: [],
    featuredContent: [],
    recentContent: [],
    popularContent: []
};

// ===== DOM Elements =====
const elements = {
    app: document.getElementById('app'),
    siteName: document.getElementById('site-name'),
    heroTitle: document.getElementById('hero-title'),
    heroDescription: document.getElementById('hero-description'),
    totalContent: document.getElementById('total-content'),
    totalViews: document.getElementById('total-views'),
    totalCategories: document.getElementById('total-categories'),
    featuredContent: document.getElementById('featured-content'),
    categoriesGrid: document.getElementById('categories-grid'),
    recentContent: document.getElementById('recent-content'),
    popularContent: document.getElementById('popular-content'),
    allFeaturedContent: document.getElementById('all-featured-content'),
    allRecentContent: document.getElementById('all-recent-content'),
    allPopularContent: document.getElementById('all-popular-content'),
    categoryContentGrid: document.getElementById('category-content-grid'),
    categoryTitle: document.getElementById('category-title'),
    searchResultsGrid: document.getElementById('search-results-grid'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    videoModal: document.getElementById('video-modal'),
    videoPlayer: document.getElementById('video-player'),
    videoSource: document.getElementById('video-source'),
    videoTitle: document.getElementById('video-title'),
    videoDescription: document.getElementById('video-description'),
    videoCategory: document.getElementById('video-category'),
    videoViews: document.getElementById('video-views'),
    videoDate: document.getElementById('video-date'),
    modalClose: document.getElementById('modal-close'),
    maintenanceModal: document.getElementById('maintenance-modal'),
    maintenanceMessage: document.getElementById('maintenance-message'),
    refreshBtn: document.getElementById('refresh-btn'),
    footerSiteName: document.getElementById('footer-site-name'),
    footerDescription: document.getElementById('footer-description'),
    currentYear: document.getElementById('current-year')
};

// ===== Section Elements =====
const sections = {
    home: document.getElementById('home'),
    categories: document.getElementById('categories-section'),
    recent: document.getElementById('recent'),
    popular: document.getElementById('popular'),
    allFeatured: document.getElementById('all-featured'),
    allRecent: document.getElementById('all-recent'),
    allPopular: document.getElementById('all-popular'),
    categoryContent: document.getElementById('category-content'),
    searchResults: document.getElementById('search-results')
};

// ===== Utility Functions =====
const utils = {
    // Format date
    formatDate: (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format views
    formatViews: (count) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    },

    // Format duration
    formatDuration: (duration) => {
        if (!duration) return '';
        if (duration.includes(':')) {
            const parts = duration.split(':');
            if (parts.length === 3) {
                return `${parts[0]}h ${parts[1]}m ${parts[2]}s`;
            }
            if (parts.length === 2) {
                return `${parts[0]}m ${parts[1]}s`;
            }
        }
        return duration;
    },

    // Truncate text
    truncate: (text, length) => {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    },

    // Capitalize first letter
    capitalize: (text) => {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Get category color
    getCategoryColor: (category) => {
        if (!category) return '#FF5733';
        return category.color || '#FF5733';
    },

    // Get category icon
    getCategoryIcon: (category) => {
        if (!category) return 'film';
        return category.icon || 'film';
    },

    // Create category badge HTML
    createCategoryBadge: (category) => {
        const color = utils.getCategoryColor(category);
        const icon = utils.getCategoryIcon(category);
        const name = category?.name || 'Non classé';
        return `<span class="content-card-category" style="color: ${color}">
            <i class="fas fa-${icon}"></i>
            ${name}
        </span>`;
    },

    // Create skeleton loading card
    createSkeletonCard: () => {
        return `
            <div class="content-card skeleton">
                <div class="content-card-thumbnail skeleton-thumbnail"></div>
                <div class="content-card-info">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text" style="width: 80%;"></div>
                    <div class="skeleton skeleton-text" style="width: 60%; margin-top: 8px;"></div>
                </div>
            </div>
        `;
    },

    // Create skeleton category card
    createSkeletonCategoryCard: () => {
        return `
            <div class="category-card skeleton">
                <div class="category-icon skeleton" style="width: 60px; height: 60px; margin: 0 auto 12px;"></div>
                <div class="skeleton skeleton-title" style="margin-bottom: 8px;"></div>
                <div class="skeleton skeleton-text" style="width: 50%; margin: 0 auto;"></div>
            </div>
        `;
    }
};

// ===== API Functions =====
const api = {
    // Base fetch function
    async fetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Une erreur est survenue');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Get settings
    async getSettings() {
        return this.fetch('/settings');
    },

    // Get maintenance status
    async getMaintenanceStatus() {
        return this.fetch('/settings/maintenance');
    },

    // Get all content
    async getAllContent() {
        return this.fetch('/content');
    },

    // Get featured content
    async getFeaturedContent() {
        return this.fetch('/content/featured');
    },

    // Get recent content
    async getRecentContent(limit = 12) {
        return this.fetch(`/content/recent?limit=${limit}`);
    },

    // Get popular content
    async getPopularContent(limit = 12) {
        return this.fetch(`/content/popular?limit=${limit}`);
    },

    // Get content by category
    async getContentByCategory(categoryId) {
        return this.fetch(`/content/category/${categoryId}`);
    },

    // Get all categories
    async getAllCategories() {
        return this.fetch('/categories');
    },

    // Get content by ID
    async getContentById(id) {
        return this.fetch(`/content/${id}`);
    },

    // Search content
    async searchContent(query) {
        return this.fetch(`/content/search/${encodeURIComponent(query)}`);
    },

    // Get content stats
    async getContentStats() {
        return this.fetch('/content/stats');
    },

    // Increment views
    async incrementViews(id) {
        return this.fetch(`/content/${id}/views`, { method: 'POST' });
    }
};

// ===== Render Functions =====
const renderer = {
    // Render featured content
    renderFeaturedContent(contentList) {
        const container = elements.featuredContent;
        
        if (!contentList || contentList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <h3>Aucun contenu en vedette</h3>
                    <p>Ajoutez du contenu depuis le panneau d'administration</p>
                </div>
            `;
            return;
        }

        container.innerHTML = contentList.map(content => this.createContentCard(content)).join('');
    },

    // Render recent content
    renderRecentContent(contentList) {
        const container = elements.recentContent;
        
        if (!contentList || contentList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>Aucun contenu récent</h3>
                    <p>Ajoutez du contenu depuis le panneau d'administration</p>
                </div>
            `;
            return;
        }

        container.innerHTML = contentList.map(content => this.createContentCard(content)).join('');
    },

    // Render popular content
    renderPopularContent(contentList) {
        const container = elements.popularContent;
        
        if (!contentList || contentList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-fire"></i>
                    <h3>Aucun contenu populaire</h3>
                    <p>Les contenus les plus vus apparaîtront ici</p>
                </div>
            `;
            return;
        }

        container.innerHTML = contentList.map(content => this.createContentCard(content)).join('');
    },

    // Render all content for a section
    renderAllContent(contentList, container) {
        if (!contentList || contentList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-video"></i>
                    <h3>Aucun contenu disponible</h3>
                    <p>Ajoutez du contenu depuis le panneau d'administration</p>
                </div>
            `;
            return;
        }

        container.innerHTML = contentList.map(content => this.createContentCard(content)).join('');
    },

    // Render categories
    renderCategories(categories) {
        const container = elements.categoriesGrid;
        
        if (!categories || categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>Aucune catégorie disponible</h3>
                    <p>Ajoutez des catégories depuis le panneau d'administration</p>
                </div>
            `;
            return;
        }

        container.innerHTML = categories.map(category => this.createCategoryCard(category)).join('');
    },

    // Render category content
    renderCategoryContent(contentList, category) {
        const container = elements.categoryContentGrid;
        const title = elements.categoryTitle;
        
        title.innerHTML = `
            <i class="fas fa-${category.icon || 'film'}"></i>
            <span>${category.name}</span>
        `;
        title.style.color = category.color || '#FF5733';

        if (!contentList || contentList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-video-slash"></i>
                    <h3>Aucun contenu dans cette catégorie</h3>
                    <p>Ajoutez du contenu depuis le panneau d'administration</p>
                </div>
            `;
            return;
        }

        container.innerHTML = contentList.map(content => this.createContentCard(content)).join('');
    },

    // Render search results
    renderSearchResults(contentList) {
        const container = elements.searchResultsGrid;
        
        if (!contentList || contentList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Aucun résultat trouvé</h3>
                    <p>Essayez une autre recherche</p>
                </div>
            `;
            return;
        }

        container.innerHTML = contentList.map(content => this.createContentCard(content)).join('');
    },

    // Create content card HTML
    createContentCard(content) {
        const category = content.category_name ? {
            name: content.category_name,
            color: content.category_color || '#FF5733',
            icon: content.icon || 'film'
        } : null;

        const thumbnailUrl = content.thumbnail_url ? 
            (content.thumbnail_url.startsWith('http') ? content.thumbnail_url : `${window.location.origin}${content.thumbnail_url}`) :
            `${ASSETS_BASE}/placeholder-thumbnail.jpg`;

        return `
            <div class="content-card" data-id="${content.id}" data-category="${content.category_id || ''}">
                <div class="content-card-thumbnail" style="background-image: url('${thumbnailUrl}');">
                    ${!content.thumbnail_url ? '<i class="fas fa-film"></i>' : ''}
                    ${content.duration ? `<span class="content-card-duration">${utils.formatDuration(content.duration)}</span>` : ''}
                </div>
                <div class="content-card-info">
                    <h3 class="content-card-title">${utils.truncate(content.title, 50)}</h3>
                    <div class="content-card-meta">
                        ${utils.createCategoryBadge(category)}
                        <span class="content-card-views">
                            <i class="fas fa-eye"></i> ${utils.formatViews(content.views || 0)}
                        </span>
                    </div>
                    ${content.release_date ? `<p class="content-card-release">${utils.formatDate(content.release_date)}</p>` : ''}
                </div>
            </div>
        `;
    },

    // Create category card HTML
    createCategoryCard(category) {
        return `
            <div class="category-card" data-id="${category.id}" style="border-top: 3px solid ${category.color || '#FF5733'}">
                <div class="category-icon" style="background: ${category.color || '#FF5733'}20; color: ${category.color || '#FF5733'}">
                    <i class="fas fa-${category.icon || 'film'}"></i>
                </div>
                <h3 class="category-name">${category.name}</h3>
                <p class="category-count">${category.content_count || 0} contenu${(category.content_count || 0) > 1 ? 's' : ''}</p>
            </div>
        `;
    },

    // Update hero section
    updateHero(settings) {
        elements.heroTitle.textContent = settings.site_description || 'Bienvenue sur Rstream';
        elements.heroDescription.textContent = settings.site_description || 'Découvrez des milliers de contenus de qualité';
    },

    // Update footer
    updateFooter(settings) {
        elements.footerSiteName.textContent = settings.site_name || 'Rstream';
        elements.footerDescription.textContent = settings.site_description || 'Votre plateforme de streaming préférée';
    },

    // Update site name
    updateSiteName(settings) {
        elements.siteName.textContent = settings.site_name || 'Rstream';
        document.title = `${settings.site_name || 'Rstream'} - Streaming de qualité`;
    },

    // Update current year
    updateCurrentYear() {
        elements.currentYear.textContent = new Date().getFullYear();
    },

    // Update stats
    updateStats(stats) {
        elements.totalContent.textContent = stats.total_content || 0;
        elements.totalViews.textContent = utils.formatViews(stats.total_views || 0);
        elements.totalCategories.textContent = stats.total_categories || 0;
    }
};

// ===== Navigation Functions =====
const navigation = {
    // Show section
    showSection(sectionName) {
        // Hide all sections
        Object.values(sections).forEach(section => {
            if (section) section.classList.add('hidden');
        });

        // Show target section
        const targetSection = sections[sectionName];
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });

        state.currentSection = sectionName;

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Initialize navigation
    init() {
        // Nav link clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(link.dataset.section);
            });
        });

        // See all buttons
        document.querySelectorAll('.see-all').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(btn.dataset.section);
                
                // Load content based on section
                const section = btn.dataset.section;
                if (section === 'all-featured') {
                    this.loadAllFeatured();
                } else if (section === 'all-recent') {
                    this.loadAllRecent();
                } else if (section === 'all-popular') {
                    this.loadAllPopular();
                }
            });
        });

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(btn.dataset.back);
            });
        });

        // Category card clicks
        elements.categoriesGrid.addEventListener('click', (e) => {
            const categoryCard = e.target.closest('.category-card');
            if (categoryCard) {
                const categoryId = categoryCard.dataset.id;
                this.showCategory(categoryId);
            }
        });

        // Content card clicks
        document.addEventListener('click', (e) => {
            const contentCard = e.target.closest('.content-card');
            if (contentCard) {
                const contentId = contentCard.dataset.id;
                this.showContent(contentId);
            }
        });
    },

    // Load all featured content
    async loadAllFeatured() {
        try {
            const content = await api.getAllContent();
            const featured = content.filter(c => c.is_featured === 1);
            renderer.renderAllContent(featured, elements.allFeaturedContent);
        } catch (error) {
            console.error('Error loading all featured:', error);
        }
    },

    // Load all recent content
    async loadAllRecent() {
        try {
            const content = await api.getRecentContent(50);
            renderer.renderAllContent(content, elements.allRecentContent);
        } catch (error) {
            console.error('Error loading all recent:', error);
        }
    },

    // Load all popular content
    async loadAllPopular() {
        try {
            const content = await api.getPopularContent(50);
            renderer.renderAllContent(content, elements.allPopularContent);
        } catch (error) {
            console.error('Error loading all popular:', error);
        }
    },

    // Show category content
    async showCategory(categoryId) {
        try {
            const category = state.categories.find(c => c.id == categoryId);
            if (!category) return;

            const content = await api.getContentByCategory(categoryId);
            state.currentCategory = category;
            renderer.renderCategoryContent(content, category);
            this.showSection('categoryContent');
        } catch (error) {
            console.error('Error loading category content:', error);
        }
    },

    // Show content in modal
    async showContent(contentId) {
        try {
            const content = await api.getContentById(contentId);
            if (!content) return;

            // Increment views
            await api.incrementViews(contentId);

            // Update content views locally
            const updatedContent = { ...content, views: (content.views || 0) + 1 };
            
            // Find and update in state
            state.content = state.content.map(c => c.id === contentId ? updatedContent : c);
            state.featuredContent = state.featuredContent.map(c => c.id === contentId ? updatedContent : c);
            state.recentContent = state.recentContent.map(c => c.id === contentId ? updatedContent : c);
            state.popularContent = state.popularContent.map(c => c.id === contentId ? updatedContent : c);

            // Update the displayed content
            this.updateContentInDOM(contentId, updatedContent);

            // Show modal
            this.showContentModal(updatedContent);
        } catch (error) {
            console.error('Error loading content:', error);
        }
    },

    // Update content in DOM
    updateContentInDOM(contentId, updatedContent) {
        const contentCards = document.querySelectorAll(`.content-card[data-id="${contentId}"]`);
        contentCards.forEach(card => {
            const viewsSpan = card.querySelector('.content-card-views span:last-child');
            if (viewsSpan) {
                viewsSpan.textContent = ` ${utils.formatViews(updatedContent.views || 0)}`;
            }
        });
    },

    // Show content in modal
    showContentModal(content) {
        const category = content.category_name ? {
            name: content.category_name,
            color: content.category_color || '#FF5733'
        } : null;

        const videoUrl = content.video_url ? 
            (content.video_url.startsWith('http') ? content.video_url : `${window.location.origin}${content.video_url}`) :
            '';

        elements.videoSource.src = videoUrl;
        elements.videoPlayer.load();
        elements.videoTitle.textContent = content.title;
        elements.videoDescription.textContent = content.description || 'Aucune description disponible';
        
        elements.videoCategory.innerHTML = category ? `
            <i class="fas fa-folder"></i> ${category.name}
        ` : '<i class="fas fa-folder"></i> Non classé';
        
        if (category) {
            elements.videoCategory.style.color = category.color;
        }

        elements.videoViews.innerHTML = `<i class="fas fa-eye"></i> ${utils.formatViews(content.views || 0)} vues`;
        elements.videoDate.textContent = content.release_date ? utils.formatDate(content.release_date) : 'N/A';

        elements.videoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

// ===== Search Functions =====
const search = {
    // Initialize search
    init() {
        elements.searchBtn.addEventListener('click', () => this.performSearch());
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Debounced search for better performance
        const debouncedSearch = utils.debounce(() => this.performSearch(), 500);
        elements.searchInput.addEventListener('input', debouncedSearch);
    },

    // Perform search
    async performSearch() {
        const query = elements.searchInput.value.trim();
        state.searchQuery = query;

        if (!query) {
            navigation.showSection('home');
            return;
        }

        try {
            const results = await api.searchContent(query);
            renderer.renderSearchResults(results);
            navigation.showSection('searchResults');
        } catch (error) {
            console.error('Error searching:', error);
        }
    }
};

// ===== Theme Functions =====
const theme = {
    // Initialize theme
    init() {
        // Apply saved theme
        this.applyTheme(state.theme);

        // Theme toggle button
        elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    },

    // Toggle theme
    toggleTheme() {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', state.theme);
        this.applyTheme(state.theme);
    },

    // Apply theme
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update theme toggle icon
        const icon = elements.themeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }
};

// ===== Maintenance Functions =====
const maintenance = {
    // Check maintenance status
    async checkStatus() {
        try {
            const status = await api.getMaintenanceStatus();
            if (status.maintenance_mode === 1) {
                this.showModal(status.maintenance_message || 'Site en maintenance, merci de revenir plus tard.');
            }
        } catch (error) {
            console.error('Error checking maintenance:', error);
        }
    },

    // Show maintenance modal
    showModal(message) {
        elements.maintenanceMessage.textContent = message;
        elements.maintenanceModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    // Hide maintenance modal
    hideModal() {
        elements.maintenanceModal.classList.remove('active');
        document.body.style.overflow = '';
    },

    // Initialize maintenance
    init() {
        elements.refreshBtn.addEventListener('click', () => {
            window.location.reload();
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                navigation.videoModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Close modal on backdrop click
        elements.maintenanceModal.addEventListener('click', (e) => {
            if (e.target === elements.maintenanceModal) {
                this.hideModal();
            }
        });
    }
};

// ===== Video Modal Functions =====
const videoModal = {
    // Initialize video modal
    init() {
        elements.modalClose.addEventListener('click', () => this.close());

        // Close modal on backdrop click
        elements.videoModal.addEventListener('click', (e) => {
            if (e.target === elements.videoModal) {
                this.close();
            }
        });

        // Handle video errors
        elements.videoPlayer.addEventListener('error', () => {
            console.error('Video error');
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'video-error';
            errorMessage.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Impossible de lire cette vidéo';
            elements.videoContainer.appendChild(errorMessage);
        });

        // Clean up error message when new video loads
        elements.videoPlayer.addEventListener('loadstart', () => {
            const errorMessage = elements.videoContainer.querySelector('.video-error');
            if (errorMessage) {
                errorMessage.remove();
            }
        });
    },

    // Close modal
    close() {
        elements.videoModal.classList.remove('active');
        document.body.style.overflow = '';
        elements.videoPlayer.pause();
        elements.videoSource.src = '';
    }
};

// ===== Initialization =====
const init = async () => {
    try {
        // Check maintenance status first
        await maintenance.checkStatus();
        
        // Load settings
        const settings = await api.getSettings();
        state.settings = settings;

        // Update UI with settings
        renderer.updateSiteName(settings);
        renderer.updateHero(settings);
        renderer.updateFooter(settings);
        renderer.updateCurrentYear();

        // Load content and categories
        const [content, categories, featured, recent, popular, stats] = await Promise.all([
            api.getAllContent(),
            api.getAllCategories(),
            api.getFeaturedContent(),
            api.getRecentContent(12),
            api.getPopularContent(12),
            api.getContentStats()
        ]);

        state.content = content;
        state.categories = categories;
        state.featuredContent = featured;
        state.recentContent = recent;
        state.popularContent = popular;

        // Render content
        renderer.renderFeaturedContent(featured);
        renderer.renderRecentContent(recent);
        renderer.renderPopularContent(popular);
        renderer.renderCategories(categories);
        renderer.updateStats(stats);

        // Initialize all modules
        theme.init();
        navigation.init();
        search.init();
        maintenance.init();
        videoModal.init();

        console.log('Rstream initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        // Show error to user
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <p>Impossible de charger le site. Veuillez rafraîchir la page.</p>
            <button onclick="window.location.reload()">
                <i class="fas fa-sync-alt"></i> Rafraîchir
            </button>
        `;
        document.body.prepend(errorElement);
    }
};

// ===== Start Application =====
document.addEventListener('DOMContentLoaded', init);

// Handle window resize
window.addEventListener('resize', () => {
    // Can be used for responsive adjustments
});

// Handle before unload
window.addEventListener('beforeunload', () => {
    // Clean up if needed
});
