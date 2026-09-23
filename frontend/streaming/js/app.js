/**
 * Rstream - Public streaming application
 * Navigation, API, player, theme and public interactions.
 */

const DEV_FRONTEND_PORTS = new Set(['3000', '3001']);
const API_ORIGIN = window.RSTREAM_API_ORIGIN || (
  DEV_FRONTEND_PORTS.has(window.location.port)
    ? `${window.location.protocol}//${window.location.hostname}:3002`
    : window.location.origin
);
const API_BASE = `${API_ORIGIN}/api`;

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

const elements = {
  siteName: document.getElementById('site-name'),
  logo: document.querySelector('.logo'),
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
  videoContainer: document.querySelector('#video-modal .video-container'),
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
  currentYear: document.getElementById('current-year'),
  infoModal: document.getElementById('info-modal'),
  infoTitle: document.getElementById('info-title'),
  infoMessage: document.getElementById('info-message'),
  infoClose: document.getElementById('info-modal-close')
};

const sectionElements = {
  home: ['hero', 'featured', 'categories-section', 'recent', 'popular'].map(id => document.getElementById(id)).filter(Boolean),
  categories: [document.getElementById('categories-section')].filter(Boolean),
  recent: [document.getElementById('recent')].filter(Boolean),
  popular: [document.getElementById('popular')].filter(Boolean),
  allFeatured: [document.getElementById('all-featured')].filter(Boolean),
  allRecent: [document.getElementById('all-recent')].filter(Boolean),
  allPopular: [document.getElementById('all-popular')].filter(Boolean),
  categoryContent: [document.getElementById('category-content')].filter(Boolean),
  searchResults: [document.getElementById('search-results')].filter(Boolean)
};

const homeOnlySections = ['hero', 'featured', 'categories-section', 'recent', 'popular'];
const specialSections = ['all-featured', 'all-recent', 'all-popular', 'category-content', 'search-results'];

const utils = {
  formatDate(value) {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  formatViews(value) {
    const count = Number(value) || 0;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  },
  formatDuration(value) {
    if (!value) return '';
    const text = String(value);
    if (!text.includes(':')) return text;
    const parts = text.split(':');
    if (parts.length === 3) return `${parts[0]}h ${parts[1]}m ${parts[2]}s`;
    if (parts.length === 2) return `${parts[0]}m ${parts[1]}s`;
    return text;
  },
  truncate(value, length) {
    const text = String(value || '');
    return text.length <= length ? text : `${text.slice(0, length)}...`;
  },
  escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  },
  debounce(fn, wait = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  },
  absoluteUrl(value) {
    if (!value) return '';
    return /^https?:\/\//i.test(value) ? value : `${API_ORIGIN}${String(value).startsWith('/') ? value : `/${value}`}`;
  }
};

const api = {
  async fetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      headers: { Accept: 'application/json', ...options.headers },
      ...options
    });
    const text = await response.text();
    let payload = {};
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = { message: text }; }
    }
    if (!response.ok) throw new Error(payload.error || payload.message || `Erreur API (${response.status})`);
    return payload;
  },
  getSettings() { return this.fetch('/settings'); },
  getMaintenanceStatus() { return this.fetch('/settings/maintenance'); },
  getAllContent() { return this.fetch('/content'); },
  getFeaturedContent(limit = 6) { return this.fetch(`/content/featured?limit=${encodeURIComponent(limit)}`); },
  getRecentContent(limit = 12) { return this.fetch(`/content/recent?limit=${encodeURIComponent(limit)}`); },
  getPopularContent(limit = 12) { return this.fetch(`/content/popular?limit=${encodeURIComponent(limit)}`); },
  getContentByCategory(id) { return this.fetch(`/content/category/${encodeURIComponent(id)}`); },
  getAllCategories() { return this.fetch('/categories'); },
  getContentById(id) { return this.fetch(`/content/${encodeURIComponent(id)}`); },
  searchContent(query) { return this.fetch(`/content/search?q=${encodeURIComponent(query)}`); },
  getContentStats() { return this.fetch('/content/stats'); },
  incrementViews(id) { return this.fetch(`/content/${encodeURIComponent(id)}/views`, { method: 'POST' }); }
};

const renderer = {
  createCategoryBadge(content) {
    if (!content?.category_name) return '<span class="content-card-category">Non classé</span>';
    const color = content.category_color || '#FF5733';
    const icon = content.category_icon || 'film';
    return `<span class="content-card-category" style="color:${utils.escapeHtml(color)}"><i class="fas fa-${utils.escapeHtml(icon)}"></i>${utils.escapeHtml(content.category_name)}</span>`;
  },
  createContentCard(content) {
    const thumb = content.thumbnail_url ? utils.absoluteUrl(content.thumbnail_url) : '';
    const background = thumb ? `background-image:url('${utils.escapeHtml(thumb)}')` : '';
    return `
      <article class="content-card" data-id="${content.id}" tabindex="0" role="button" aria-label="Lire ${utils.escapeHtml(content.title)}">
        <div class="content-card-thumbnail" style="${background}">
          ${!thumb ? '<i class="fas fa-film"></i>' : ''}
          ${content.duration ? `<span class="content-card-duration">${utils.escapeHtml(utils.formatDuration(content.duration))}</span>` : ''}
        </div>
        <div class="content-card-info">
          <h3 class="content-card-title">${utils.escapeHtml(utils.truncate(content.title, 50))}</h3>
          <div class="content-card-meta">
            ${this.createCategoryBadge(content)}
            <span class="content-card-views"><i class="fas fa-eye"></i><span>${utils.formatViews(content.views)}</span></span>
          </div>
          ${content.release_date ? `<p class="content-card-release">${utils.escapeHtml(utils.formatDate(content.release_date))}</p>` : ''}
        </div>
      </article>`;
  },
  renderContentList(list, container, emptyIcon, emptyTitle, emptyText) {
    if (!list?.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas ${emptyIcon}"></i><h3>${emptyTitle}</h3><p>${emptyText}</p></div>`;
      return;
    }
    container.innerHTML = list.map(item => this.createContentCard(item)).join('');
  },
  renderFeatured(list) { this.renderContentList(list, elements.featuredContent, 'fa-star', 'Aucun contenu en vedette', 'Ajoutez du contenu depuis le panneau d’administration'); },
  renderRecent(list) { this.renderContentList(list, elements.recentContent, 'fa-clock', 'Aucun contenu récent', 'Ajoutez du contenu depuis le panneau d’administration'); },
  renderPopular(list) { this.renderContentList(list, elements.popularContent, 'fa-fire', 'Aucun contenu populaire', 'Les contenus les plus vus apparaîtront ici'); },
  renderCategories(list) {
    elements.categoriesGrid.innerHTML = list?.length ? list.map(category => `
      <article class="category-card" data-id="${category.id}" tabindex="0" role="button" style="border-top:3px solid ${utils.escapeHtml(category.color || '#FF5733')}">
        <div class="category-icon" style="background:${utils.escapeHtml(category.color || '#FF5733')}20;color:${utils.escapeHtml(category.color || '#FF5733')}">
          <i class="fas fa-${utils.escapeHtml(category.icon || 'film')}"></i>
        </div>
        <h3 class="category-name">${utils.escapeHtml(category.name)}</h3>
        <p class="category-count">${Number(category.content_count) || 0} contenu${Number(category.content_count) > 1 ? 's' : ''}</p>
      </article>`).join('') : `<div class="empty-state"><i class="fas fa-folder-open"></i><h3>Aucune catégorie disponible</h3><p>Ajoutez des catégories depuis le panneau d’administration</p></div>`;
  },
  renderAllFeatured(list) { this.renderContentList(list, elements.allFeaturedContent, 'fa-star', 'Aucun contenu en vedette', 'Ajoutez du contenu depuis le panneau d’administration'); },
  renderAllRecent(list) { this.renderContentList(list, elements.allRecentContent, 'fa-clock', 'Aucun contenu récent', 'Ajoutez du contenu depuis le panneau d’administration'); },
  renderAllPopular(list) { this.renderContentList(list, elements.allPopularContent, 'fa-fire', 'Aucun contenu populaire', 'Ajoutez du contenu depuis le panneau d’administration'); },
  renderCategory(list, category) {
    elements.categoryTitle.innerHTML = `<i class="fas fa-${utils.escapeHtml(category.icon || 'film')}"></i><span>${utils.escapeHtml(category.name)}</span>`;
    elements.categoryTitle.style.color = category.color || '#FF5733';
    this.renderContentList(list, elements.categoryContentGrid, 'fa-video-slash', 'Aucun contenu dans cette catégorie', 'Ajoutez du contenu depuis le panneau d’administration');
  },
  renderSearch(list) { this.renderContentList(list, elements.searchResultsGrid, 'fa-search', 'Aucun résultat trouvé', 'Essayez une autre recherche'); },
  applySettings(settings) {
    const root = document.documentElement;
    if (settings.primary_color) root.style.setProperty('--primary-color', settings.primary_color);
    if (settings.secondary_color) root.style.setProperty('--secondary-color', settings.secondary_color);
    if (settings.background_color) root.style.setProperty('--configured-bg-primary', settings.background_color);
    if (settings.text_color) root.style.setProperty('--configured-text-primary', settings.text_color);

    elements.siteName.textContent = settings.site_name || 'Rstream';
    elements.footerSiteName.textContent = settings.site_name || 'Rstream';
    elements.footerDescription.textContent = settings.site_description || 'Votre plateforme de streaming préférée';
    elements.heroTitle.textContent = `Bienvenue sur ${settings.site_name || 'Rstream'}`;
    elements.heroDescription.textContent = settings.site_description || 'Découvrez des contenus de qualité';
    document.title = `${settings.site_name || 'Rstream'} - Streaming de qualité`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', settings.site_description || 'Votre plateforme de streaming préférée');
    document.querySelector('link[rel="icon"]')?.remove();
    if (settings.favicon_url) {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = utils.absoluteUrl(settings.favicon_url);
      document.head.appendChild(link);
    }
    if (settings.logo_url && elements.logo) {
      const icon = elements.logo.querySelector('i');
      if (icon) icon.style.display = 'none';
      let image = elements.logo.querySelector('img');
      if (!image) {
        image = document.createElement('img');
        image.alt = settings.site_name || 'Logo';
        image.style.maxHeight = '34px';
        image.style.maxWidth = '160px';
        elements.logo.prepend(image);
      }
      image.src = utils.absoluteUrl(settings.logo_url);
    }
  },
  updateStats(stats) {
    elements.totalContent.textContent = stats.total_content || 0;
    elements.totalViews.textContent = utils.formatViews(stats.total_views || 0);
    elements.totalCategories.textContent = state.categories.length || stats.total_categories || 0;
  },
  updateCurrentYear() { elements.currentYear.textContent = String(new Date().getFullYear()); }
};

const navigation = {
  showSection(sectionName) {
    Object.values(sectionElements).flat().forEach(section => section.classList.add('hidden'));
    if (sectionName === 'home') {
      sectionElements.home.forEach(section => section.classList.remove('hidden'));
    } else {
      (sectionElements[sectionName] || []).forEach(section => section.classList.remove('hidden'));
    }
    document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === sectionName));
    state.currentSection = sectionName;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  init() {
    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      this.showSection(link.dataset.section);
    }));
    document.querySelectorAll('.see-all').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      const key = link.dataset.section;
      this.showSection(key);
      if (key === 'all-featured') this.loadAllFeatured();
      if (key === 'all-recent') this.loadAllRecent();
      if (key === 'all-popular') this.loadAllPopular();
    }));
    document.querySelectorAll('.back-btn').forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      this.showSection(button.dataset.back || 'home');
    }));
    elements.categoriesGrid.addEventListener('click', event => {
      const card = event.target.closest('.category-card');
      if (card) this.showCategory(card.dataset.id);
    });
    elements.categoriesGrid.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('.category-card');
      if (!card) return;
      event.preventDefault();
      this.showCategory(card.dataset.id);
    });
    document.addEventListener('click', event => {
      const card = event.target.closest('.content-card');
      if (card) this.showContent(card.dataset.id);
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('.content-card');
      if (!card) return;
      if (document.activeElement === card) {
        event.preventDefault();
        this.showContent(card.dataset.id);
      }
    });
    this.showSection('home');
  },
  async loadAllFeatured() {
    const list = state.content.filter(item => Boolean(item.is_featured));
    renderer.renderAllFeatured(list);
  },
  async loadAllRecent() {
    try { renderer.renderAllRecent(await api.getRecentContent(50)); } catch (error) { console.error(error); }
  },
  async loadAllPopular() {
    try { renderer.renderAllPopular(await api.getPopularContent(50)); } catch (error) { console.error(error); }
  },
  async showCategory(id) {
    const category = state.categories.find(item => String(item.id) === String(id));
    if (!category) return;
    try {
      const list = await api.getContentByCategory(id);
      state.currentCategory = category;
      renderer.renderCategory(list, category);
      this.showSection('categoryContent');
    } catch (error) {
      console.error('Category error:', error);
    }
  },
  async showContent(id) {
    try {
      const content = await api.getContentById(id);
      await api.incrementViews(id);
      const updated = { ...content, views: (Number(content.views) || 0) + 1 };
      state.content = state.content.map(item => String(item.id) === String(id) ? updated : item);
      state.featuredContent = state.featuredContent.map(item => String(item.id) === String(id) ? updated : item);
      state.recentContent = state.recentContent.map(item => String(item.id) === String(id) ? updated : item);
      state.popularContent = state.popularContent.map(item => String(item.id) === String(id) ? updated : item);
      this.updateContentInDOM(id, updated);
      videoModal.show(updated);
    } catch (error) {
      console.error('Content error:', error);
    }
  },
  updateContentInDOM(id, content) {
    document.querySelectorAll(`.content-card[data-id="${CSS.escape(String(id))}"] .content-card-views`).forEach(node => {
      node.innerHTML = `<i class="fas fa-eye"></i><span>${utils.formatViews(content.views)}</span>`;
    });
  }
};

const search = {
  init() {
    elements.searchBtn?.addEventListener('click', () => this.perform());
    elements.searchInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter') this.perform();
    });
    elements.searchInput?.addEventListener('input', utils.debounce(() => {
      const query = elements.searchInput.value.trim();
      if (query.length >= 2) this.perform();
      if (!query) navigation.showSection('home');
    }));
  },
  async perform() {
    const query = elements.searchInput.value.trim();
    state.searchQuery = query;
    if (!query) return navigation.showSection('home');
    try {
      const results = await api.searchContent(query);
      renderer.renderSearch(results);
      navigation.showSection('searchResults');
    } catch (error) {
      console.error('Search error:', error);
    }
  }
};

const theme = {
  init() {
    this.apply(state.theme);
    elements.themeToggle?.addEventListener('click', () => this.toggle());
  },
  toggle() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    this.apply(state.theme);
  },
  apply(value) {
    document.documentElement.setAttribute('data-theme', value);
    const icon = elements.themeToggle?.querySelector('i');
    if (icon) icon.className = value === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
};

const maintenance = {
  async checkStatus() {
    try {
      const status = await api.getMaintenanceStatus();
      if (Number(status.maintenance_mode) === 1) this.show(status.maintenance_message || 'Site en maintenance, merci de revenir plus tard.');
    } catch (error) {
      console.error('Maintenance check error:', error);
    }
  },
  show(message) {
    elements.maintenanceMessage.textContent = message;
    elements.maintenanceModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },
  hide() {
    elements.maintenanceModal.classList.remove('active');
    if (!elements.videoModal.classList.contains('active')) document.body.style.overflow = '';
  },
  init() {
    elements.refreshBtn?.addEventListener('click', () => window.location.reload());
    elements.maintenanceModal?.addEventListener('click', event => { if (event.target === elements.maintenanceModal) this.hide(); });
  }
};

const videoModal = {
  init() {
    elements.modalClose?.addEventListener('click', () => this.close());
    elements.videoModal?.addEventListener('click', event => { if (event.target === elements.videoModal) this.close(); });
    elements.videoPlayer?.addEventListener('error', () => {
      elements.videoContainer?.querySelector('.video-error')?.remove();
      const error = document.createElement('div');
      error.className = 'video-error';
      error.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Impossible de lire cette vidéo';
      elements.videoContainer?.appendChild(error);
    });
    elements.videoPlayer?.addEventListener('loadstart', () => elements.videoContainer?.querySelector('.video-error')?.remove());
  },
  show(content) {
    const url = utils.absoluteUrl(content.video_url);
    elements.videoSource.src = url;
    elements.videoPlayer.autoplay = Boolean(state.settings.auto_play);
    elements.videoPlayer.load();
    elements.videoTitle.textContent = content.title || '';
    elements.videoDescription.textContent = content.description || 'Aucune description disponible';
    elements.videoCategory.innerHTML = content.category_name ? `<i class="fas fa-folder"></i> ${utils.escapeHtml(content.category_name)}` : '<i class="fas fa-folder"></i> Non classé';
    elements.videoCategory.style.color = content.category_color || '';
    elements.videoViews.innerHTML = `<i class="fas fa-eye"></i> ${utils.formatViews(content.views)} vues`;
    elements.videoDate.textContent = content.release_date ? utils.formatDate(content.release_date) : 'N/A';
    elements.videoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },
  close() {
    elements.videoModal.classList.remove('active');
    elements.videoPlayer.pause();
    elements.videoSource.src = '';
    elements.videoPlayer.load();
    elements.videoContainer?.querySelector('.video-error')?.remove();
    if (!elements.maintenanceModal.classList.contains('active')) document.body.style.overflow = '';
  }
};

const info = {
  init() {
    document.querySelectorAll('[data-info]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      const data = info.copy(link.dataset.info);
      elements.infoTitle.textContent = data.title;
      elements.infoMessage.textContent = data.message;
      elements.infoModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }));
    elements.infoClose?.addEventListener('click', () => this.close());
    elements.infoModal?.addEventListener('click', event => { if (event.target === elements.infoModal) this.close(); });
  },
  copy(key) {
    return {
      about: { title: 'À propos de Rstream', message: 'Rstream est une interface de démonstration de plateforme de streaming reliée à son panneau d’administration.' },
      terms: { title: "Conditions d'utilisation", message: 'Cette version locale fournit les fonctions de navigation, de lecture et de gestion de contenu prévues par le projet. Adaptez les conditions avant toute mise en production.' },
      privacy: { title: 'Politique de confidentialité', message: 'Cette version ne met pas en place de compte utilisateur. Les données de gestion sont stockées dans la base SQLite du projet.' },
      contact: { title: 'Contact', message: 'Pour cette version locale, utilisez le panneau d’administration ou ajoutez votre adresse de contact dans le pied de page avant publication.' }
    }[key] || { title: 'Rstream', message: 'Informations indisponibles.' };
  },
  close() {
    elements.infoModal.classList.remove('active');
    if (!elements.videoModal.classList.contains('active') && !elements.maintenanceModal.classList.contains('active')) document.body.style.overflow = '';
  }
};

async function init() {
  theme.init();
  navigation.init();
  search.init();
  maintenance.init();
  videoModal.init();
  info.init();

  try {
    await maintenance.checkStatus();
    const settings = await api.getSettings();
    state.settings = settings;
    renderer.applySettings(settings);
    renderer.updateCurrentYear();

    const featuredLimit = Number(settings.featured_content_limit) || 6;
    const recentLimit = Number(settings.recent_content_limit) || 12;
    const [content, categories, featured, recent, popular, stats] = await Promise.all([
      api.getAllContent(),
      api.getAllCategories(),
      api.getFeaturedContent(featuredLimit),
      api.getRecentContent(recentLimit),
      api.getPopularContent(12),
      api.getContentStats()
    ]);

    state.content = content;
    state.categories = categories;
    state.featuredContent = featured;
    state.recentContent = recent;
    state.popularContent = popular;

    renderer.renderFeatured(featured);
    renderer.renderRecent(recent);
    renderer.renderPopular(popular);
    renderer.renderCategories(categories);
    renderer.updateStats(stats);
  } catch (error) {
    console.error('Initialization error:', error);
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>Impossible de charger le site. Vérifiez le serveur puis réessayez.</p><button type="button" id="public-retry"><i class="fas fa-sync-alt"></i> Réessayer</button>`;
    document.body.prepend(errorElement);
    document.getElementById('public-retry')?.addEventListener('click', () => window.location.reload());
  }
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  videoModal.close();
  info.close();
  if (elements.maintenanceModal.classList.contains('active')) maintenance.hide();
});

document.addEventListener('DOMContentLoaded', init);
