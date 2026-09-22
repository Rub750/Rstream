# Rstream - Plateforme de Streaming

## 📌 Description

**Rstream** est une plateforme de streaming complète avec un panneau d'administration intégré. Elle permet de gérer et diffuser du contenu vidéo de manière professionnelle et attrayante.

## ✨ Fonctionnalités

### Site Principal de Streaming
- **Interface moderne et intuitive** avec une charte graphique professionnelle
- **Navigation fluide** entre les différentes sections (Accueil, Catégories, Récents, Populaires)
- **Recherche avancée** pour trouver facilement du contenu
- **Lecture vidéo optimisée** avec prise en charge de différentes qualités
- **Système de catégories** pour organiser le contenu
- **Contenus mis en avant** pour promouvoir les meilleures vidéos
- **Statistiques en temps réel** (vues, likes, etc.)
- **Mode sombre/clair** pour une meilleure expérience utilisateur
- **Responsive design** pour tous les appareils (mobile, tablette, desktop)

### Panneau d'Administration
- **Tableau de bord** avec statistiques globales
- **Gestion des contenus** :
  - Ajout, modification et suppression de vidéos
  - Upload de fichiers vidéo et miniatures
  - Gestion des métadonnées (titre, description, durée, qualité, etc.)
  - Catégorisation et balisage du contenu
  - Activation/désactivation des contenus
  - Mise en avant des contenus
- **Gestion des catégories** :
  - Création, modification et suppression de catégories
  - Personnalisation des couleurs et icônes
  - Réorganisation par glisser-déposer
  - Activation/désactivation des catégories
- **Paramètres du site** :
  - Configuration générale (nom, description)
  - Personnalisation des couleurs (primaire, secondaire, fond, texte)
  - Upload du logo et favicon
  - Configuration des limites (nombre de contenus en vedette, récents, etc.)
  - Options de lecture (lecture automatique, contenus similaires)
  - Mode maintenance
- **Statistiques avancées** :
  - Vues totales et par jour
  - Contenus les plus populaires
  - Catégories les plus consultées
  - Export des données

## 🛠 Technologie

### Backend
- **Node.js** avec **Express** pour le serveur
- **SQLite** pour la base de données
- **express-fileupload** pour la gestion des uploads
- **CORS** pour la communication entre les sites

### Frontend
- **HTML5** sémantique
- **CSS3** moderne avec variables CSS
- **Vanilla JavaScript** (ES6+)
- **Font Awesome** pour les icônes
- **Google Fonts** (Poppins)
- **Chart.js** pour les graphiques (admin)

### Architecture
```
Rstream/
├── backend/
│   ├── server.js              # Point d'entrée du serveur
│   ├── models/                # Modèles de données
│   │   ├── database.js        # Configuration de la base de données
│   │   ├── Content.js         # Modèle pour les contenus
│   │   ├── Category.js        # Modèle pour les catégories
│   │   └── Settings.js        # Modèle pour les paramètres
│   ├── routes/                # Routes API
│   │   ├── content.js         # Routes pour les contenus
│   │   ├── category.js        # Routes pour les catégories
│   │   └── settings.js        # Routes pour les paramètres
│   └── public/                # Fichiers statiques
│       └── uploads/           # Fichiers uploadés
├── frontend/
│   ├── streaming/             # Site principal
│   │   ├── index.html        # Page principale
│   │   ├── css/
│   │   │   └── styles.css    # Styles du site
│   │   └── js/
│   │       └── app.js        # Logique du site
│   └── admin/                # Panneau d'administration
│       ├── index.html        # Page admin
│       ├── css/
│       │   └── styles.css    # Styles admin
│       └── js/
│           └── app.js        # Logique admin
└── shared/
    └── config.js             # Configuration partagée
```

## 🚀 Installation

### Prérequis
- Node.js 18+ installé
- npm ou yarn

### Étapes d'installation

1. **Cloner le dépôt**
```bash
git clone https://github.com/Rub750/Rstream.git
cd Rstream
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Démarrer le serveur**
```bash
npm start
```

Le serveur démarrera sur le port 3002 par défaut.

### Accès aux sites
- **Site de streaming** : http://localhost:3002/streaming
- **Panneau d'administration** : http://localhost:3002/admin

## 📦 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm start` | Démarre le serveur backend |
| `npm run start:backend` | Démarre uniquement le backend |
| `npm run start:streaming` | Démarre le serveur du site de streaming |
| `npm run start:admin` | Démarre le serveur du panneau d'administration |
| `npm run start:all` | Démarre tous les serveurs |
| `npm run dev` | Démarre le backend avec nodemon (développement) |

## 🔧 Configuration

### Variables d'environnement
Créez un fichier `.env` à la racine du projet pour personnaliser la configuration :

```env
PORT=3002
NODE_ENV=development
```

### Configuration de la base de données
La base de données SQLite est automatiquement créée au premier démarrage dans le fichier `rstream.db`.

## 🎨 Personnalisation

### Changer le thème
- **Site de streaming** : Cliquez sur l'icône de lune/moon dans le header
- **Panneau d'administration** : Cliquez sur l'icône de thème dans le header

### Personnaliser les paramètres
1. Allez dans le panneau d'administration
2. Naviguez vers **Paramètres**
3. Modifiez les paramètres souhaités
4. Cliquez sur **Enregistrer les modifications**

## 📊 API Endpoints

### Contenus
- `GET /api/content` - Liste tous les contenus
- `GET /api/content/featured` - Contenus en vedette
- `GET /api/content/recent` - Contenus récents
- `GET /api/content/popular` - Contenus populaires
- `GET /api/content/category/:id` - Contenus par catégorie
- `GET /api/content/:id` - Contenu spécifique
- `POST /api/content` - Créer un contenu
- `PUT /api/content/:id` - Mettre à jour un contenu
- `DELETE /api/content/:id` - Supprimer un contenu
- `POST /api/content/:id/views` - Incrémenter les vues
- `GET /api/content/search/:query` - Rechercher des contenus
- `GET /api/content/stats` - Statistiques des contenus

### Catégories
- `GET /api/categories` - Liste toutes les catégories
- `GET /api/categories/:id` - Catégorie spécifique
- `POST /api/categories` - Créer une catégorie
- `PUT /api/categories/:id` - Mettre à jour une catégorie
- `DELETE /api/categories/:id` - Supprimer une catégorie
- `POST /api/categories/reorder` - Réorganiser les catégories
- `GET /api/categories/:id/content` - Contenus d'une catégorie

### Paramètres
- `GET /api/settings` - Obtenir les paramètres
- `PUT /api/settings` - Mettre à jour les paramètres
- `GET /api/settings/maintenance` - Statut de maintenance
- `PUT /api/settings/maintenance` - Basculer le mode maintenance

## 📁 Structure des données

### Contenu (Content)
```javascript
{
  id: Number,
  title: String,
  description: String,
  category_id: Number | null,
  video_url: String,
  thumbnail_url: String | null,
  duration: String | null,
  quality: String,
  views: Number,
  likes: Number,
  is_featured: Boolean,
  is_active: Boolean,
  tags: String | null,
  release_date: Date | null,
  created_at: Date
}
```

### Catégorie (Category)
```javascript
{
  id: Number,
  name: String,
  description: String | null,
  color: String,
  icon: String,
  order_index: Number,
  is_active: Boolean,
  created_at: Date
}
```

### Paramètres (Settings)
```javascript
{
  id: Number,
  site_name: String,
  site_description: String,
  logo_url: String | null,
  favicon_url: String | null,
  primary_color: String,
  secondary_color: String,
  background_color: String,
  text_color: String,
  featured_content_limit: Number,
  recent_content_limit: Number,
  auto_play: Boolean,
  show_related: Boolean,
  maintenance_mode: Boolean,
  maintenance_message: String
}
```

## 🔒 Sécurité

- **Pas d'authentification** : Pour l'instant, le panneau d'administration est accessible sans authentification. Pour une utilisation en production, il est fortement recommandé d'ajouter un système d'authentification.
- **CORS** : Le backend est configuré pour accepter les requêtes CORS depuis les origines configurées.
- **Validation des entrées** : Toutes les entrées utilisateur sont validées côté serveur.

## 📈 Performances

- **Cache** : Les requêtes API sont optimisées pour minimiser les accès à la base de données
- **Lazy loading** : Les images et vidéos sont chargées de manière différée
- **Pagination** : Les listes de contenus sont paginées pour améliorer les performances

## 🌐 SEO

- **Meta tags** : Le site inclut les balises meta appropriées pour le référencement
- **Structure sémantique** : HTML5 sémantique pour une meilleure accessibilité
- **URLs propres** : Structure d'URL optimisée pour le SEO

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. Forker le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commiter vos modifications (`git commit -m 'Add some AmazingFeature'`)
4. Pousser vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- [Express.js](https://expressjs.com/) - Framework web pour Node.js
- [SQLite](https://www.sqlite.org/) - Base de données légère
- [Font Awesome](https://fontawesome.com/) - Icônes
- [Google Fonts](https://fonts.google.com/) - Polices
- [Chart.js](https://www.chartjs.org/) - Graphiques

---

**Rstream** - Votre plateforme de streaming préférée

*Créé avec ❤️ par Rub750*
