/**
 * Rstream - Configuration partagée
 * Configuration commune entre le site de streaming et le panneau d'administration
 */

// Configuration de l'API
const API_CONFIG = {
    BASE_URL: window.location.origin + '/api',
    TIMEOUT: 10000, // 10 secondes
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000 // 1 seconde
};

// Configuration du site
const SITE_CONFIG = {
    NAME: 'Rstream',
    DESCRIPTION: 'Votre plateforme de streaming préférée',
    VERSION: '1.0.0',
    AUTHOR: 'Rub750'
};

// Configuration de la pagination
const PAGINATION_CONFIG = {
    ITEMS_PER_PAGE: 12,
    MAX_PAGES: 10,
    CONTENT_PER_PAGE: 12,
    CATEGORIES_PER_PAGE: 20
};

// Configuration des médias
const MEDIA_CONFIG = {
    VIDEO_FORMATS: ['mp4', 'webm', 'ogg'],
    IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    MAX_VIDEO_SIZE: 500 * 1024 * 1024, // 500 Mo
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10 Mo
    THUMBNAIL_WIDTH: 300,
    THUMBNAIL_HEIGHT: 200
};

// Configuration des couleurs par défaut
const DEFAULT_COLORS = {
    PRIMARY: '#FF5733',
    SECONDARY: '#33FF57',
    BACKGROUND: '#1a1a1a',
    TEXT: '#ffffff',
    ACCENT_SUCCESS: '#4CAF50',
    ACCENT_WARNING: '#FFC107',
    ACCENT_DANGER: '#F44336',
    ACCENT_INFO: '#2196F3'
};

// Configuration des catégories par défaut
const DEFAULT_CATEGORIES = [
    { name: 'Films', description: 'Longs métrages et films', color: '#FF5733', icon: 'film', order_index: 1 },
    { name: 'Séries', description: 'Séries télévisées', color: '#33FF57', icon: 'tv', order_index: 2 },
    { name: 'Documentaires', description: 'Documentaires éducatifs', color: '#3357FF', icon: 'book', order_index: 3 },
    { name: 'Animations', description: 'Dessins animés et anime', color: '#F3FF33', icon: 'animation', order_index: 4 },
    { name: 'Musique', description: 'Clips musicaux et concerts', color: '#FF33F3', icon: 'music', order_index: 5 }
];

// Configuration des qualités vidéo
const VIDEO_QUALITIES = [
    { value: 'SD', label: 'SD (480p)' },
    { value: 'HD', label: 'HD (720p)' },
    { value: 'Full HD', label: 'Full HD (1080p)' },
    { value: '4K', label: '4K (2160p)' }
];

// Messages d'erreur
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Erreur de connexion. Veuillez vérifier votre connexion internet.',
    API_ERROR: 'Une erreur est survenue avec le serveur. Veuillez réessayer plus tard.',
    NOT_FOUND: 'La ressource demandée n\'existe pas.',
    UNAUTHORIZED: 'Vous n\'êtes pas autorisé à effectuer cette action.',
    VALIDATION_ERROR: 'Veuillez remplir tous les champs obligatoires.',
    FILE_TOO_LARGE: 'Le fichier est trop volumineux.',
    INVALID_FILE_TYPE: 'Type de fichier non valide.',
    UNKNOWN_ERROR: 'Une erreur inconnue est survenue.'
};

// Messages de succès
const SUCCESS_MESSAGES = {
    CONTENT_CREATED: 'Contenu créé avec succès !',
    CONTENT_UPDATED: 'Contenu mis à jour avec succès !',
    CONTENT_DELETED: 'Contenu supprimé avec succès !',
    CATEGORY_CREATED: 'Catégorie créée avec succès !',
    CATEGORY_UPDATED: 'Catégorie mise à jour avec succès !',
    CATEGORY_DELETED: 'Catégorie supprimée avec succès !',
    SETTINGS_UPDATED: 'Paramètres mis à jour avec succès !',
    FILE_UPLOADED: 'Fichier téléchargé avec succès !'
};

// Exportation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_CONFIG,
        SITE_CONFIG,
        PAGINATION_CONFIG,
        MEDIA_CONFIG,
        DEFAULT_COLORS,
        DEFAULT_CATEGORIES,
        VIDEO_QUALITIES,
        ERROR_MESSAGES,
        SUCCESS_MESSAGES
    };
}
