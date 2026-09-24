/**
 * Rstream Admin - Main Application
 * All admin controls are wired here so the page remains usable without inline handlers.
 */

const DEV_FRONTEND_PORTS = new Set(['3000', '3001']);
const API_ORIGIN = window.RSTREAM_API_ORIGIN || (
  DEV_FRONTEND_PORTS.has(window.location.port)
    ? `${window.location.protocol}//${window.location.hostname}:3002`
    : window.location.origin
);
const API_BASE = `${API_ORIGIN}/api`;
const CONTENT_PAGE_SIZE = 10;

const CATEGORY_ICONS = [
  ['film', 'Film'], ['tv', 'Télévision'], ['video', 'Vidéo'], ['clapperboard', 'Cinéma'],
  ['book', 'Livre'], ['music', 'Musique'], ['gamepad', 'Jeux vidéo'], ['futbol', 'Sport'],
  ['heart', 'Favoris'], ['star', 'Star'], ['fire', 'Tendance'], ['ghost', 'Fantastique'],
  ['rocket', 'Science-fiction'], ['car', 'Action'], ['plane', 'Voyage'], ['camera', 'Photo'],
  ['image', 'Images'], ['folder', 'Collection'], ['trophy', 'Compétition'], ['microphone', 'Audio'],
  ['headphones', 'Concerts'], ['podcast', 'Podcast']
];

const state = {
  currentSection: 'dashboard',
  theme: localStorage.getItem('admin-theme') || 'dark',
  settings: {},
  content: [],
  filteredContent: [],
  categories: [],
  stats: {},
  contentPage: 1,
  deleteItem: null,
  deleteType: null,
  charts: {},
  notifications: []
};

const $ = (id) => document.getElementById(id);

const elements = {
  app: $('admin-app'),
  sidebar: $('sidebar'),
  mainContent: $('main-content'),
  mobileMenuBtn: $('mobile-menu-btn'),
  sidebarToggle: $('sidebar-toggle'),
  themeToggle: $('admin-theme-toggle'),
  refreshBtn: $('refresh-btn'),
  notificationsBtn: $('notifications-btn'),
  notificationBadge: $('notification-badge'),
  userBtn: $('user-btn'),
  breadcrumbText: $('breadcrumb-text'),
  contentTableBody: $('content-table-body'),
  contentCount: $('content-count'),
  contentPage: $('content-page'),
  prevPageBtn: $('prev-page-btn'),
  nextPageBtn: $('next-page-btn'),
  categoriesGrid: $('categories-grid'),
  contentModal: $('content-modal'),
  categoryModal: $('category-modal'),
  deleteModal: $('delete-modal'),
  successModal: $('success-modal'),
  errorModal: $('error-modal'),
  reorderModal: $('reorder-modal'),
  reorderList: $('reorder-list'),
  errorMessage: $('error-message'),
  successMessage: $('success-message')
};

const sections = {
  dashboard: $('dashboard-section'),
  content: $('content-section'),
  categories: $('categories-section'),
  settings: $('settings-section'),
  stats: $('stats-section')
};

const utils = {
  formatDate(value) {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('fr-FR');
  },
  formatViews(value) {
    const count = Number(value) || 0;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  },
  truncate(text, length) {
    const value = String(text || '');
    return value.length <= length ? value : `${value.substring(0, length)}...`;
  },
  escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  },
  debounce(fn, wait = 250) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  },
  download(filename, content, type = 'application/octet-stream') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
  csvEscape(value) {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  }
};

const api = {
  async fetch(endpoint, options = {}) {
    const headers = { ...options.headers };
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include', ...options, headers });
    const text = await response.text();
    let payload = {};
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = { message: text }; }
    }

    if (!response.ok) {
      if (response.status === 401 && !endpoint.startsWith('/auth/')) {
        window.location.replace('/admin');
        throw new Error('Session administrateur expirée.');
      }
      const message = payload.error || payload.message || `Erreur API (${response.status})`;
      throw new Error(message);
    }
    return payload;
  },
  getSettings() { return this.fetch('/settings'); },
  updateSettings(body) { return this.fetch('/settings', { method: 'PUT', body }); },
  getAllContent() { return this.fetch('/content?includeInactive=1'); },
  createContent(body) { return this.fetch('/content', { method: 'POST', body }); },
  updateContent(id, body) { return this.fetch(`/content/${id}`, { method: 'PUT', body }); },
  deleteContent(id) { return this.fetch(`/content/${id}`, { method: 'DELETE' }); },
  getAllCategories() { return this.fetch('/categories?includeInactive=1'); },
  createCategory(category) { return this.fetch('/categories', { method: 'POST', body: JSON.stringify(category) }); },
  updateCategory(id, category) { return this.fetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(category) }); },
  deleteCategory(id) { return this.fetch(`/categories/${id}`, { method: 'DELETE' }); },
  reorderCategories(categories) { return this.fetch('/categories/reorder', { method: 'POST', body: JSON.stringify({ categories }) }); },
  getContentStats() { return this.fetch('/content/stats'); }
};

function getPublicSiteUrl() {
  const port = window.location.port;
  if (port === '3001') return `${window.location.protocol}//${window.location.hostname}:3000/`;
  if (port === '3000') return `${window.location.origin}/`;
  return `${window.location.origin}/streaming/`;
}

const navigation = {
  showSection(sectionName) {
    Object.entries(sections).forEach(([name, section]) => {
      section?.classList.toggle('active', name === sectionName);
    });
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionName);
    });
    elements.breadcrumbText.textContent = this.getSectionTitle(sectionName);
    state.currentSection = sectionName;
    elements.sidebar?.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (sectionName === 'content') contentManager.loadContent();
    if (sectionName === 'categories') categoryManager.loadCategories();
    if (sectionName === 'settings') settingsManager.loadSettings();
    if (sectionName === 'stats') statsManager.render();
  },
  getSectionTitle(sectionName) {
    return ({ dashboard: 'Tableau de bord', content: 'Gestion des contenus', categories: 'Gestion des catégories', settings: 'Paramètres', stats: 'Statistiques' })[sectionName] || sectionName;
  },
  init() {
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        this.showSection(item.dataset.section);
      });
    });
    elements.mobileMenuBtn?.addEventListener('click', () => elements.sidebar.classList.toggle('active'));
    elements.sidebarToggle?.addEventListener('click', () => elements.sidebar.classList.toggle('collapsed'));
    const viewSiteLink = $('view-site-link');
    if (viewSiteLink) viewSiteLink.href = getPublicSiteUrl();

    $('logout-link')?.addEventListener('click', (event) => {
      event.preventDefault();
      api.fetch('/auth/logout', { method: 'POST' }).catch(() => {}).finally(() => { window.location.replace('/admin'); });
    });
  }
};

const modal = {
  close(id) { $(id)?.classList.remove('active'); },
  open(id) { $(id)?.classList.add('active'); },
  closeOnBackdrop(id) {
    $(id)?.addEventListener('click', event => {
      if (event.target.id === id) this.close(id);
    });
  }
};

const notifications = {
  init() {
    elements.notificationsBtn?.addEventListener('click', () => {
      if (!state.notifications.length) {
        contentManager.showSuccess('Aucune nouvelle notification.');
        return;
      }
      contentManager.showSuccess(state.notifications.join(' '));
      state.notifications = [];
      this.updateBadge();
    });
    elements.userBtn?.addEventListener('click', () => contentManager.showSuccess('Session administrateur locale active.'));
  },
  push(message) {
    state.notifications.push(message);
    this.updateBadge();
  },
  updateBadge() {
    if (!elements.notificationBadge) return;
    elements.notificationBadge.textContent = state.notifications.length;
    elements.notificationBadge.style.display = state.notifications.length ? '' : 'none';
  }
};

const contentManager = {
  async loadContent() {
    try {
      state.content = await api.getAllContent();
      state.contentPage = 1;
      this.refreshFilteredContent();
      populateCategoryControls();
      $('content-loading')?.style.setProperty('display', 'none');
    } catch (error) {
      this.showError(`Impossible de charger les contenus : ${error.message}`);
    }
  },
  refreshFilteredContent() {
    const search = ($('content-search')?.value || '').trim().toLocaleLowerCase();
    const category = $('content-category-filter')?.value || '';
    const quality = $('content-quality-filter')?.value || '';
    const featured = $('content-featured-filter')?.value || '';
    const active = $('content-active-filter')?.value || '';

    state.filteredContent = state.content.filter(content => {
      const haystack = `${content.title || ''} ${content.description || ''} ${content.tags || ''}`.toLocaleLowerCase();
      return (!search || haystack.includes(search))
        && (!category || String(content.category_id || '') === String(category))
        && (!quality || content.quality === quality)
        && (!featured || String(Number(Boolean(content.is_featured))) === featured)
        && (!active || String(Number(Boolean(content.is_active))) === active);
    });

    const maxPage = Math.max(1, Math.ceil(state.filteredContent.length / CONTENT_PAGE_SIZE));
    state.contentPage = Math.min(state.contentPage, maxPage);
    this.renderContent();
  },
  renderContent() {
    const all = state.filteredContent;
    const start = (state.contentPage - 1) * CONTENT_PAGE_SIZE;
    const pageItems = all.slice(start, start + CONTENT_PAGE_SIZE);
    elements.contentTableBody.innerHTML = pageItems.length ? pageItems.map(content => {
      const thumbnail = content.thumbnail_url ? (content.thumbnail_url.startsWith('http') ? content.thumbnail_url : `${API_ORIGIN}${content.thumbnail_url.startsWith('/') ? content.thumbnail_url : `/${content.thumbnail_url}`}`) : '';
      return `
        <tr data-id="${content.id}">
          <td>${content.id}</td>
          <td>${thumbnail ? `<img src="${utils.escapeHtml(thumbnail)}" alt="" style="width:40px;height:30px;object-fit:cover;border-radius:4px">` : '-'}</td>
          <td title="${utils.escapeHtml(content.title)}">${utils.escapeHtml(utils.truncate(content.title, 40))}</td>
          <td>${utils.escapeHtml(content.category_name || 'Aucune')}</td>
          <td>${utils.escapeHtml(content.quality || 'HD')}</td>
          <td>${utils.formatViews(content.views)}</td>
          <td><i class="fas ${content.is_featured ? 'fa-star' : 'fa-star-o'}"></i></td>
          <td><i class="fas ${content.is_active ? 'fa-check' : 'fa-times'}"></i></td>
          <td>${utils.formatDate(content.created_at)}</td>
          <td>
            <button type="button" class="action-btn" data-content-action="edit" data-id="${content.id}" title="Modifier"><i class="fas fa-edit"></i></button>
            <button type="button" class="action-btn" data-content-action="delete" data-id="${content.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
    }).join('') : '<tr><td colspan="10">Aucun contenu trouvé</td></tr>';

    elements.contentCount.textContent = `${all.length} contenu${all.length > 1 ? 's' : ''}`;
    elements.contentPage.textContent = `Page ${state.contentPage} / ${Math.max(1, Math.ceil(all.length / CONTENT_PAGE_SIZE))}`;
    elements.prevPageBtn.disabled = state.contentPage <= 1;
    elements.nextPageBtn.disabled = state.contentPage >= Math.max(1, Math.ceil(all.length / CONTENT_PAGE_SIZE));
  },
  showContentModal(content = null) {
    const form = $('content-form');
    form.reset();
    $('content-id').value = content?.id || '';
    $('modal-title').textContent = content ? 'Modifier le contenu' : 'Ajouter un contenu';
    $('content-title').value = content?.title || '';
    $('content-category').value = content?.category_id || '';
    $('content-description').value = content?.description || '';
    $('content-video-url').value = content?.video_url || '';
    $('content-thumbnail-url').value = content?.thumbnail_url || '';
    $('content-duration').value = content?.duration || '';
    $('content-quality').value = content?.quality || 'HD';
    $('content-tags').value = content?.tags || '';
    $('content-release-date').value = content?.release_date ? String(content.release_date).slice(0, 10) : '';
    $('content-featured').checked = Boolean(content?.is_featured);
    $('content-active').checked = content ? Boolean(content.is_active) : true;
    $('content-video-file').value = '';
    $('content-thumbnail-file').value = '';
    $('video-file-name').textContent = 'Aucun fichier sélectionné';
    $('thumbnail-file-name').textContent = 'Aucun fichier sélectionné';
    modal.open('content-modal');
  },
  async saveContent() {
    try {
      const form = $('content-form');
      if (!form.reportValidity()) return;
      const body = new FormData();
      body.append('title', $('content-title').value.trim());
      body.append('category_id', $('content-category').value);
      body.append('description', $('content-description').value);
      body.append('video_url', $('content-video-url').value.trim());
      body.append('thumbnail_url', $('content-thumbnail-url').value.trim());
      body.append('duration', $('content-duration').value.trim());
      body.append('quality', $('content-quality').value);
      body.append('tags', $('content-tags').value.trim());
      body.append('release_date', $('content-release-date').value);
      body.append('is_featured', $('content-featured').checked ? '1' : '0');
      body.append('is_active', $('content-active').checked ? '1' : '0');
      const videoFile = $('content-video-file').files[0];
      const thumbnailFile = $('content-thumbnail-file').files[0];
      if (videoFile) body.append('video', videoFile);
      if (thumbnailFile) body.append('thumbnail', thumbnailFile);

      const id = $('content-id').value;
      if (id) await api.updateContent(id, body); else await api.createContent(body);
      modal.close('content-modal');
      this.showSuccess(id ? 'Contenu mis à jour avec succès.' : 'Contenu créé avec succès.');
      await this.loadContent();
      await statsManager.load();
      notifications.push('Le contenu a été modifié.');
    } catch (error) {
      this.showError(`Erreur : ${error.message}`);
    }
  },
  showDeleteModal(id, type = 'content') {
    state.deleteItem = id;
    state.deleteType = type;
    $('delete-message').textContent = type === 'category' ? 'Supprimer cette catégorie ?' : 'Supprimer ce contenu ?';
    modal.open('delete-modal');
  },
  async confirmDelete() {
    try {
      if (state.deleteType === 'category') {
        await api.deleteCategory(state.deleteItem);
        await Promise.all([
          categoryManager.loadCategories(),
          this.loadContent()
        ]);
      } else {
        await api.deleteContent(state.deleteItem);
        await this.loadContent();
      }
      modal.close('delete-modal');
      this.showSuccess('Élément supprimé avec succès.');
      await statsManager.load();
    } catch (error) {
      modal.close('delete-modal');
      this.showError(`Suppression impossible : ${error.message}`);
    } finally {
      state.deleteItem = null;
      state.deleteType = null;
    }
  },
  showSuccess(message) {
    elements.successMessage.textContent = message;
    modal.open('success-modal');
    clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => modal.close('success-modal'), 3200);
  },
  showError(message) {
    elements.errorMessage.textContent = message;
    modal.open('error-modal');
  },
  init() {
    $('add-content-btn')?.addEventListener('click', () => this.showContentModal());
    $('quick-add-content')?.addEventListener('click', () => { navigation.showSection('content'); this.showContentModal(); });
    $('content-modal-close')?.addEventListener('click', () => modal.close('content-modal'));
    $('save-content-btn')?.addEventListener('click', () => this.saveContent());
    $('cancel-content-btn')?.addEventListener('click', () => modal.close('content-modal'));

    elements.contentTableBody?.addEventListener('click', event => {
      const button = event.target.closest('[data-content-action]');
      if (!button) return;
      const content = state.content.find(item => String(item.id) === String(button.dataset.id));
      if (button.dataset.contentAction === 'edit' && content) this.showContentModal(content);
      if (button.dataset.contentAction === 'delete') this.showDeleteModal(button.dataset.id, 'content');
    });

    $('apply-filters-btn')?.addEventListener('click', () => { state.contentPage = 1; this.refreshFilteredContent(); });
    $('reset-filters-btn')?.addEventListener('click', () => {
      ['content-search', 'content-category-filter', 'content-quality-filter', 'content-featured-filter', 'content-active-filter'].forEach(id => { if ($(id)) $(id).value = ''; });
      state.contentPage = 1;
      this.refreshFilteredContent();
    });
    const search = $('content-search');
    search?.addEventListener('input', utils.debounce(() => { state.contentPage = 1; this.refreshFilteredContent(); }));
    ['content-category-filter', 'content-quality-filter', 'content-featured-filter', 'content-active-filter'].forEach(id => $(id)?.addEventListener('change', () => { state.contentPage = 1; this.refreshFilteredContent(); }));
    elements.prevPageBtn?.addEventListener('click', () => { if (state.contentPage > 1) { state.contentPage--; this.renderContent(); } });
    elements.nextPageBtn?.addEventListener('click', () => { state.contentPage++; this.refreshFilteredContent(); });
    $('content-video-file')?.addEventListener('change', e => { $('video-file-name').textContent = e.target.files[0]?.name || 'Aucun fichier sélectionné'; if (e.target.files[0]) $('content-video-url').value = ''; });
    $('content-thumbnail-file')?.addEventListener('change', e => { $('thumbnail-file-name').textContent = e.target.files[0]?.name || 'Aucun fichier sélectionné'; if (e.target.files[0]) $('content-thumbnail-url').value = ''; });
  }
};

const categoryManager = {
  async loadCategories() {
    try {
      state.categories = await api.getAllCategories();
      this.renderCategories();
      populateCategoryControls();
    } catch (error) {
      contentManager.showError(`Impossible de charger les catégories : ${error.message}`);
    }
  },
  renderCategories() {
    elements.categoriesGrid.innerHTML = state.categories.length ? state.categories.map(category => `
      <div class="category-card" data-id="${category.id}" style="border-top: 3px solid ${utils.escapeHtml(category.color || '#FF5733')};opacity:${category.is_active ? 1 : .55}">
        <div class="category-header">
          <div class="category-icon" style="background:${utils.escapeHtml(category.color || '#FF5733')}">
            <i class="fas fa-${utils.escapeHtml(category.icon || 'film')}"></i>
          </div>
          <div class="category-info">
            <h3>${utils.escapeHtml(category.name)}</h3>
            <p>${utils.escapeHtml(category.description || 'Aucune description')}</p>
            <small>${category.is_active ? 'Active' : 'Inactive'} · ${category.content_count || 0} contenu${Number(category.content_count) > 1 ? 's' : ''}</small>
          </div>
        </div>
        <div class="category-actions">
          <button type="button" class="action-btn" data-category-action="edit" data-id="${category.id}"><i class="fas fa-edit"></i> Modifier</button>
          <button type="button" class="action-btn" data-category-action="delete" data-id="${category.id}"><i class="fas fa-trash"></i> Supprimer</button>
        </div>
      </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-folder-open"></i><h3>Aucune catégorie</h3></div>';
  },
  showCategoryModal(category = null) {
    $('category-form').reset();
    $('category-id').value = category?.id || '';
    $('category-modal-title').textContent = category ? 'Modifier la catégorie' : 'Ajouter une catégorie';
    $('category-name').value = category?.name || '';
    $('category-description').value = category?.description || '';
    $('category-color').value = category?.color || '#FF5733';
    $('category-icon').value = category?.icon || 'film';
    $('category-active').checked = category ? Boolean(category.is_active) : true;
    updateColorValue('category-color', 'category-color-value');
    renderCategoryIconPicker($('category-icon').value);
    modal.open('category-modal');
  },
  async saveCategory() {
    try {
      if (!$('category-form').reportValidity()) return;
      const category = {
        name: $('category-name').value.trim(),
        description: $('category-description').value,
        color: $('category-color').value,
        icon: $('category-icon').value,
        is_active: $('category-active').checked ? 1 : 0
      };
      const id = $('category-id').value;
      if (id) await api.updateCategory(id, category); else await api.createCategory(category);
      modal.close('category-modal');
      contentManager.showSuccess(id ? 'Catégorie mise à jour avec succès.' : 'Catégorie créée avec succès.');
      await this.loadCategories();
    } catch (error) {
      contentManager.showError(`Erreur : ${error.message}`);
    }
  },
  openReorder() {
    elements.reorderList.innerHTML = state.categories.filter(c => c.is_active).map(category => `
      <div class="reorder-item" draggable="true" data-id="${category.id}">
        <span class="reorder-handle"><i class="fas fa-grip-vertical"></i></span>
        <span class="reorder-icon" style="color:${utils.escapeHtml(category.color || '#FF5733')}"><i class="fas fa-${utils.escapeHtml(category.icon || 'film')}"></i></span>
        <span class="reorder-name">${utils.escapeHtml(category.name)}</span>
      </div>`).join('');
    enableDragSort(elements.reorderList);
    modal.open('reorder-modal');
  },
  async saveReorder() {
    try {
      const ids = [...elements.reorderList.querySelectorAll('.reorder-item')].map(item => ({ id: Number(item.dataset.id) }));
      await api.reorderCategories(ids);
      modal.close('reorder-modal');
      contentManager.showSuccess('Ordre des catégories enregistré.');
      await this.loadCategories();
    } catch (error) {
      contentManager.showError(`Réorganisation impossible : ${error.message}`);
    }
  },
  init() {
    $('add-category-btn')?.addEventListener('click', () => this.showCategoryModal());
    $('quick-add-category')?.addEventListener('click', () => { navigation.showSection('categories'); this.showCategoryModal(); });
    $('category-modal-close')?.addEventListener('click', () => modal.close('category-modal'));
    $('cancel-category-btn')?.addEventListener('click', () => modal.close('category-modal'));
    $('save-category-btn')?.addEventListener('click', () => this.saveCategory());
    $('reorder-categories-btn')?.addEventListener('click', () => this.openReorder());
    $('reorder-modal-close')?.addEventListener('click', () => modal.close('reorder-modal'));
    $('cancel-reorder-btn')?.addEventListener('click', () => modal.close('reorder-modal'));
    $('save-reorder-btn')?.addEventListener('click', () => this.saveReorder());
    elements.categoriesGrid?.addEventListener('click', event => {
      const button = event.target.closest('[data-category-action]');
      if (!button) return;
      const category = state.categories.find(item => String(item.id) === String(button.dataset.id));
      if (button.dataset.categoryAction === 'edit' && category) this.showCategoryModal(category);
      if (button.dataset.categoryAction === 'delete') contentManager.showDeleteModal(button.dataset.id, 'category');
    });
  }
};

const settingsManager = {
  loaded: false,
  async loadSettings() {
    try {
      const settings = await api.getSettings();
      state.settings = settings;
      this.fill(settings);
      this.loaded = true;
    } catch (error) {
      contentManager.showError(`Impossible de charger les paramètres : ${error.message}`);
    }
  },
  fill(settings) {
    $('site-name').value = settings.site_name || '';
    $('site-description').value = settings.site_description || '';
    $('primary-color').value = settings.primary_color || '#FF5733';
    $('secondary-color').value = settings.secondary_color || '#33FF57';
    $('background-color').value = settings.background_color || '#1a1a1a';
    $('text-color').value = settings.text_color || '#ffffff';
    $('featured-limit').value = settings.featured_content_limit || 6;
    $('recent-limit').value = settings.recent_content_limit || 12;
    $('auto-play').checked = Boolean(settings.auto_play);
    $('show-related').checked = Boolean(settings.show_related);
    $('maintenance-mode').checked = Boolean(settings.maintenance_mode);
    $('maintenance-message').value = settings.maintenance_message || '';
    updateColorValue('primary-color', 'primary-color-value');
    updateColorValue('secondary-color', 'secondary-color-value');
    updateColorValue('background-color', 'background-color-value');
    updateColorValue('text-color', 'text-color-value');
    this.applyPreview();
    if (settings.logo_url) {
      $('logo-preview-img').src = absoluteUrl(settings.logo_url);
      $('logo-preview-img').style.display = '';
    }
    if (settings.favicon_url) {
      $('favicon-preview-img').src = absoluteUrl(settings.favicon_url);
      $('favicon-preview-img').style.display = '';
    }
  },
  applyPreview() {
    const root = document.documentElement;
    root.style.setProperty('--admin-primary-color', $('primary-color').value);
    root.style.setProperty('--admin-secondary-color', $('secondary-color').value);
    root.style.setProperty('--admin-configured-bg-primary', $('background-color').value);
    root.style.setProperty('--admin-configured-text-primary', $('text-color').value);
    $('primary-color-value').textContent = $('primary-color').value.toUpperCase();
    $('secondary-color-value').textContent = $('secondary-color').value.toUpperCase();
    $('background-color-value').textContent = $('background-color').value.toUpperCase();
    $('text-color-value').textContent = $('text-color').value.toUpperCase();
    const preview = $('appearance-preview');
    if (preview) {
      preview.style.background = $('background-color').value;
      preview.style.color = $('text-color').value;
      preview.querySelector('.preview-logo')?.style.setProperty('background', $('primary-color').value);
      preview.querySelector('.preview-nav')?.style.setProperty('background', $('secondary-color').value);
    }
  },
  async save() {
    try {
      const body = new FormData();
      body.append('site_name', $('site-name').value.trim());
      body.append('site_description', $('site-description').value);
      body.append('primary_color', $('primary-color').value);
      body.append('secondary_color', $('secondary-color').value);
      body.append('background_color', $('background-color').value);
      body.append('text_color', $('text-color').value);
      body.append('featured_content_limit', $('featured-limit').value);
      body.append('recent_content_limit', $('recent-limit').value);
      body.append('auto_play', $('auto-play').checked ? '1' : '0');
      body.append('show_related', $('show-related').checked ? '1' : '0');
      body.append('maintenance_mode', $('maintenance-mode').checked ? '1' : '0');
      body.append('maintenance_message', $('maintenance-message').value);
      const logo = $('site-logo').files[0];
      const favicon = $('site-favicon').files[0];
      if (logo) body.append('logo', logo);
      if (favicon) body.append('favicon', favicon);

      const settings = await api.updateSettings(body);
      state.settings = settings;
      this.fill(settings);
      contentManager.showSuccess('Paramètres enregistrés avec succès.');
      notifications.push('Les paramètres du site ont été mis à jour.');
    } catch (error) {
      contentManager.showError(`Impossible d'enregistrer les paramètres : ${error.message}`);
    }
  },
  init() {
    $('save-settings-btn')?.addEventListener('click', () => this.save());
    ['primary-color', 'secondary-color', 'background-color', 'text-color'].forEach(id => $(id)?.addEventListener('input', () => this.applyPreview()));
    $('site-logo')?.addEventListener('change', event => previewFile(event.target, 'logo-preview-img', 'logo-file-name'));
    $('site-favicon')?.addEventListener('change', event => previewFile(event.target, 'favicon-preview-img', 'favicon-file-name'));
    document.querySelectorAll('.settings-tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.toggle('active', panel.id === `${tab.dataset.tab}-settings`));
    }));
  }
};

const statsManager = {
  async load() {
    try {
      state.stats = await api.getContentStats();
      this.render();
    } catch (error) {
      contentManager.showError(`Impossible de charger les statistiques : ${error.message}`);
    }
  },
  render() {
    const allActive = state.content.filter(item => Boolean(item.is_active));
    const totalViews = allActive.reduce((sum, item) => sum + (Number(item.views) || 0), 0);
    const featured = allActive.filter(item => Boolean(item.is_featured)).length;
    const categoryCount = state.categories.filter(c => Boolean(c.is_active)).length;
    const periodDays = Number($('stats-period')?.value || 0);
    const cutoff = periodDays > 0 ? Date.now() - periodDays * 86400000 : 0;
    const active = (state.currentSection === 'stats' && cutoff)
      ? allActive.filter(item => {
          const date = new Date(item.created_at || item.release_date || 0).getTime();
          return !date || date >= cutoff;
        })
      : allActive;
    const scopedViews = active.reduce((sum, item) => sum + (Number(item.views) || 0), 0);
    const scopedFeatured = active.filter(item => Boolean(item.is_featured)).length;
    state.stats = { ...state.stats, total_content: allActive.length, total_views: totalViews, total_categories: categoryCount, featured_content: featured };

    $('dashboard-total-content').textContent = allActive.length;
    $('dashboard-total-views').textContent = utils.formatViews(totalViews);
    $('dashboard-total-categories').textContent = categoryCount;
    $('dashboard-featured-content').textContent = featured;
    $('stats-total-views').textContent = utils.formatViews(scopedViews);
    $('stats-total-plays').textContent = active.length;
    $('stats-unique-visitors').textContent = scopedFeatured;

    const byQuality = {};
    active.forEach(item => { byQuality[item.quality || 'HD'] = (byQuality[item.quality || 'HD'] || 0) + 1; });
    const byCategory = state.categories.filter(c => Boolean(c.is_active)).map(category => ({
      label: category.name,
      count: active.filter(item => String(item.category_id) === String(category.id)).length
    })).filter(item => item.count > 0);

    this.renderChart('category-chart', 'bar', byCategory.map(x => x.label), byCategory.map(x => x.count), 'Contenus');
    this.renderChart('quality-chart', 'doughnut', Object.keys(byQuality), Object.values(byQuality), 'Qualité');
    const sortedByViews = active.slice().sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
    this.renderChart('views-chart', 'bar', sortedByViews.slice(0, 10).map(x => utils.truncate(x.title, 22)), sortedByViews.slice(0, 10).map(x => Number(x.views) || 0), 'Vues');
    this.renderChart('popular-content-chart', 'bar', sortedByViews.slice(0, 8).map(x => utils.truncate(x.title, 18)), sortedByViews.slice(0, 8).map(x => Number(x.views) || 0), 'Vues');
    this.renderTables(active);
  },
  renderChart(id, type, labels, data, label) {
    const canvas = $(id);
    if (!canvas || typeof Chart === 'undefined') return;

    const palette = [
      '#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D', '#B983FF',
      '#FF8E72', '#00C2A8', '#FF6FB5', '#845EC2', '#2C73D2',
      '#008F7A', '#F9F871', '#D65DB1', '#FF9671', '#00B8A9',
      '#C34A36', '#4B4453', '#FFC75F', '#9BDE7E', '#0081CF'
    ];
    const colors = data.map((_, index) => palette[index % palette.length]);

    state.charts[id]?.destroy();
    state.charts[id] = new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        resizeDelay: 50,
        plugins: { legend: { display: type === 'doughnut' } }
      }
    });
  },
  renderTables(active) {
    const topContent = active.slice().sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0)).slice(0, 10);
    $('top-content-table').innerHTML = topContent.length ? topContent.map((item, index) => `
      <tr><td>${index + 1}</td><td>${utils.escapeHtml(item.title)}</td><td>${utils.escapeHtml(item.category_name || 'Aucune')}</td><td>${utils.formatViews(item.views)}</td><td>${Number(item.likes) || 0}</td></tr>
    `).join('') : '<tr><td colspan="5">Aucune donnée.</td></tr>';

    const categoryRows = state.categories.filter(c => c.is_active).map(category => ({
      name: category.name,
      count: active.filter(item => String(item.category_id) === String(category.id)).length,
      views: active.filter(item => String(item.category_id) === String(category.id)).reduce((sum, item) => sum + (Number(item.views) || 0), 0)
    })).sort((a, b) => b.views - a.views || b.count - a.count);
    $('top-categories-table').innerHTML = categoryRows.length ? categoryRows.map((item, index) => `
      <tr><td>${index + 1}</td><td>${utils.escapeHtml(item.name)}</td><td>${item.count}</td><td>${utils.formatViews(item.views)}</td></tr>
    `).join('') : '<tr><td colspan="4">Aucune donnée.</td></tr>';
  }
};

function absoluteUrl(value) {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `${API_ORIGIN}${String(value).startsWith('/') ? value : `/${value}`}`;
}

function updateColorValue(inputId, outputId) {
  const input = $(inputId);
  const output = $(outputId);
  if (input && output) output.textContent = input.value.toUpperCase();
}

function previewFile(input, imageId, labelId) {
  const file = input.files[0];
  $(labelId).textContent = file?.name || 'Aucun fichier sélectionné';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    $(imageId).src = reader.result;
    $(imageId).style.display = '';
  };
  reader.readAsDataURL(file);
}

function renderCategoryIconPicker(selectedIcon = 'film') {
  const picker = $('category-icon-picker');
  const input = $('category-icon');
  if (!picker || !input) return;

  const available = new Set(CATEGORY_ICONS.map(([name]) => name));
  const selected = available.has(selectedIcon) ? selectedIcon : 'film';
  input.value = selected;

  picker.innerHTML = CATEGORY_ICONS.map(([name, label]) => {
    const isSelected = name === selected;
    return '<button type="button" class="icon-option' + (isSelected ? ' selected' : '') + '"' +
      ' data-icon="' + name + '" title="' + utils.escapeHtml(label) + '"' +
      ' aria-label="' + utils.escapeHtml(label) + '" aria-pressed="' + (isSelected ? 'true' : 'false') + '">' +
      '<i class="fas fa-' + name + '" aria-hidden="true"></i>' +
      '<span>' + utils.escapeHtml(label) + '</span></button>';
  }).join('');

  picker.querySelectorAll('.icon-option').forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.dataset.icon || 'film';
      picker.querySelectorAll('.icon-option').forEach(option => {
        const isSelected = option === button;
        option.classList.toggle('selected', isSelected);
        option.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });
    });
  });
}

function populateCategoryControls() {
  const select = $('content-category');
  const filter = $('content-category-filter');
  const activeValue = select?.value || '';
  const filterValue = filter?.value || '';
  const options = state.categories.map(category => `<option value="${category.id}">${utils.escapeHtml(category.name)}${category.is_active ? '' : ' (inactive)'}</option>`).join('');
  if (select) select.innerHTML = `<option value="">Aucune catégorie</option>${options}`;
  if (filter) filter.innerHTML = `<option value="">Toutes les catégories</option>${options}`;
  if (select) select.value = activeValue;
  if (filter) filter.value = filterValue;
}

function enableDragSort(container) {
  let dragging = null;
  container.querySelectorAll('.reorder-item').forEach(item => {
    item.addEventListener('dragstart', () => { dragging = item; item.classList.add('dragging'); });
    item.addEventListener('dragend', () => { item.classList.remove('dragging'); dragging = null; });
    item.addEventListener('dragover', event => {
      event.preventDefault();
      if (!dragging || dragging === item) return;
      const rect = item.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      container.insertBefore(dragging, after ? item.nextSibling : item);
    });
  });
}

function bindToggleControls() {
  document.querySelectorAll('.toggle-switch').forEach(toggle => {
    const input = toggle.querySelector('input[type="checkbox"]');
    const slider = toggle.querySelector('.toggle-slider');
    if (!input || !slider || slider.dataset.bound === '1') return;

    slider.dataset.bound = '1';
    slider.setAttribute('role', 'switch');
    slider.setAttribute('tabindex', '0');

    const syncState = () => {
      slider.setAttribute('aria-checked', input.checked ? 'true' : 'false');
    };

    const toggleValue = (event) => {
      event.preventDefault();
      input.checked = !input.checked;
      syncState();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    slider.addEventListener('click', toggleValue);
    slider.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') toggleValue(event);
    });
    input.addEventListener('change', syncState);
    syncState();
  });
}

function bindModalControls() {
  modal.closeOnBackdrop('content-modal');
  modal.closeOnBackdrop('category-modal');
  modal.closeOnBackdrop('delete-modal');
  modal.closeOnBackdrop('success-modal');
  modal.closeOnBackdrop('error-modal');
  modal.closeOnBackdrop('reorder-modal');
  $('delete-modal-close')?.addEventListener('click', () => modal.close('delete-modal'));
  $('cancel-delete-btn')?.addEventListener('click', () => modal.close('delete-modal'));
  $('confirm-delete-btn')?.addEventListener('click', () => contentManager.confirmDelete());
  $('success-close-btn')?.addEventListener('click', () => modal.close('success-modal'));
  $('error-modal-close')?.addEventListener('click', () => modal.close('error-modal'));
  $('error-close-btn')?.addEventListener('click', () => modal.close('error-modal'));
}

const theme = {
  init() {
    this.applyTheme(state.theme);
    elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
  },
  toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('admin-theme', state.theme);
    this.applyTheme(state.theme);
  },
  applyTheme(value) {
    document.documentElement.setAttribute('data-theme', value);
    const icon = elements.themeToggle?.querySelector('i');
    if (icon) icon.className = value === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
};

async function init() {
  theme.init();
  navigation.init();
  notifications.init();
  bindModalControls();
  bindToggleControls();
  contentManager.init();
  categoryManager.init();
  settingsManager.init();
  renderCategoryIconPicker($('category-icon')?.value || 'film');
  statsManager.load();

  elements.refreshBtn?.addEventListener('click', () => window.location.reload());
  $('quick-refresh-cache')?.addEventListener('click', async () => {
    await contentManager.loadContent();
    await categoryManager.loadCategories();
    await statsManager.load();
    contentManager.showSuccess('Données rechargées.');
  });
  $('quick-export-data')?.addEventListener('click', () => {
    const payload = JSON.stringify({ exported_at: new Date().toISOString(), content: state.content, categories: state.categories, settings: state.settings }, null, 2);
    utils.download('rstream-export.json', payload, 'application/json');
  });
  $('export-stats-btn')?.addEventListener('click', () => statsExport());
  $('import-content-btn')?.addEventListener('click', () => importContent());
  $('stats-period')?.addEventListener('change', () => statsManager.render());

  try {
    const [settings, categories, content] = await Promise.all([
      api.getSettings(),
      api.getAllCategories(),
      api.getAllContent()
    ]);
    state.settings = settings;
    state.categories = categories;
    state.content = content;
    settingsManager.fill(settings);
    categoryManager.renderCategories();
    populateCategoryControls();
    contentManager.refreshFilteredContent();
    statsManager.render();
  } catch (error) {
    console.error('Initialization error:', error);
    contentManager.showError(`Impossible d'initialiser le panneau : ${error.message}`);
  }
}

function statsExport() {
  const active = state.content.filter(item => item.is_active);
  const rows = [['Titre', 'Catégorie', 'Vues', 'Likes', 'Qualité', 'Actif', 'Vedette']];
  active.forEach(item => rows.push([
    item.title,
    item.category_name || 'Aucune',
    item.views || 0,
    item.likes || 0,
    item.quality || 'HD',
    item.is_active ? 'Oui' : 'Non',
    item.is_featured ? 'Oui' : 'Non'
  ]));
  const csv = rows.map(row => row.map(utils.csvEscape).join(';')).join('\n');
  utils.download('rstream-statistiques.csv', `\ufeff${csv}`, 'text/csv;charset=utf-8');
}

function importContent() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw.content) ? raw.content : []);
      if (!list.length) throw new Error('Le fichier ne contient aucun contenu.');
      let imported = 0;
      for (const item of list) {
        if (!item.title || !item.video_url) continue;
        const body = new FormData();
        for (const [key, value] of Object.entries(item)) {
          if (['id', 'created_at', 'views', 'likes'].includes(key)) continue;
          body.append(key, value == null ? '' : String(value));
        }
        await api.createContent(body);
        imported += 1;
      }
      await contentManager.loadContent();
      await statsManager.load();
      contentManager.showSuccess(`${imported} contenu${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''}.`);
    } catch (error) {
      contentManager.showError(`Import impossible : ${error.message}`);
    }
  });
  input.click();
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  ['content-modal', 'category-modal', 'delete-modal', 'success-modal', 'error-modal', 'reorder-modal'].forEach(modalId => modal.close(modalId));
});

document.addEventListener('DOMContentLoaded', init);
