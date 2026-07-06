# MétéoLigne — site météo statique

Site météo complet, responsive et gratuit, construit en HTML / CSS / JavaScript pur (aucun framework, aucune étape de build). Il utilise l'API gratuite **[Open-Meteo](https://open-meteo.com/)** (aucune clé requise) pour les prévisions, la qualité de l'air et le géocodage, ainsi que **Leaflet + OpenStreetMap** pour la carte.

## Pages du site

| Page | Contenu |
|---|---|
| `index.html` | Tableau de bord météo : recherche de ville, météo actuelle, prévisions horaires (24h) et journalières (7j), indicateurs détaillés (ressenti, vent, humidité, pression, UV, visibilité), graphique température/précipitations, résumé qualité de l'air, carte. |
| `qualite-air.html` | Indice de qualité de l'air européen en détail, polluants (PM2.5, PM10, O₃, NO₂, SO₂, CO), graphique sur 24h, conseils santé, contenu explicatif. |
| `villes.html` | Comparateur météo de 12 grandes villes françaises, tableau triable, faits marquants. |
| `guide.html` | Guide pédagogique complet : indice UV, échelle de Beaufort, pression, humidité, précipitations, visibilité, FAQ. |
| `a-propos.html` | Présentation du projet et de ses sources de données. |
| `contact.html` | Formulaire de contact (ouvre le client mail local, aucun serveur requis). |
| `confidentialite.html` | Politique de confidentialité (cookies, publicité, RGPD). |
| `mentions-legales.html` | Mentions légales (modèle à compléter). |
| `404.html` | Page d'erreur personnalisée. |

## Déploiement sur GitHub Pages

1. Créez un dépôt GitHub (public ou privé avec GitHub Pages activé), par exemple `meteo-site`.
2. Copiez-y l'ensemble des fichiers de ce dossier (en conservant l'arborescence `assets/`).
3. Poussez le tout sur la branche `main` :
   ```bash
   git init
   git add .
   git commit -m "Site météo MétéoLigne"
   git branch -M main
   git remote add origin https://github.com/VOTRE-COMPTE/meteo-site.git
   git push -u origin main
   ```
4. Dans les paramètres du dépôt GitHub → **Settings → Pages**, choisissez la branche `main` et le dossier `/ (root)`.
5. Votre site sera accessible à `https://VOTRE-COMPTE.github.io/meteo-site/` après quelques minutes.
6. Pensez à remplacer les URLs d'exemple dans `robots.txt` et `sitemap.xml` par votre véritable adresse.

Aucune étape de build, aucune dépendance serveur : tous les appels API se font directement depuis le navigateur du visiteur.

## Avant la mise en ligne — à personnaliser

- **`mentions-legales.html`** : remplacez les mentions entre crochets `[ ]` par votre identité réelle (obligatoire en France pour tout site publié — loi LCEN).
- **`confidentialite.html`** : remplacez `[Nom / raison sociale]` et `[e-mail de contact]`.
- **`contact.html`** : remplacez `contact@exemple-meteoligne.fr` par votre véritable adresse e-mail.
- **Nom du site** : le nom « MétéoLigne » apparaît dans l'en-tête et le pied de page de chaque fichier HTML ; remplacez-le si vous souhaitez un autre nom (recherche/remplacement global recommandé).

## Activer Google AdSense

Le fichier CSS définit des emplacements réservés `.ad-slot` (actuellement de simples encarts avec la mention « Emplacement publicitaire »), positionnés à des endroits pertinents sans nuire à la lisibilité.

Une fois votre compte AdSense approuvé :

1. Ajoutez le tag AdSense (`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossorigin="anonymous"></script>`) dans la balise `<head>` de chaque page.
2. Remplacez chaque `<div class="ad-slot">…</div>` par votre bloc `<ins class="adsbygoogle">…</ins>` fourni par AdSense.
3. Conservez le bandeau de consentement cookies déjà présent (`#consent-bar`) : il est nécessaire dans l'Union européenne pour respecter les exigences de consentement de Google.

### Conseils pour l'acceptation par AdSense

- Le site dispose déjà de pages **À propos**, **Contact**, **Politique de confidentialité** et **Mentions légales**, exigées par Google.
- Complétez d'abord les mentions légales et la politique de confidentialité avec vos informations réelles.
- Laissez le site en ligne quelques semaines avec du contenu original (le guide météo, en particulier) avant de soumettre votre demande : Google évalue aussi l'ancienneté et la richesse du contenu.
- Évitez de dupliquer du contenu d'autres sites météo ; le contenu déjà présent (guide, comparateur) est rédigé spécifiquement pour ce site.

## Attribution des données

- Météo, prévisions, qualité de l'air, géocodage : [Open-Meteo](https://open-meteo.com/) (CC BY 4.0 / sources publiques : Météo-France, NOAA, ECMWF, Copernicus CAMS).
- Fond de carte : © [contributeurs OpenStreetMap](https://www.openstreetmap.org/copyright), sous licence ODbL.
- Géocodage inverse (bouton de géolocalisation) : [BigDataCloud](https://www.bigdatacloud.com/) (API gratuite, sans clé).

## Structure des fichiers

```
meteo-site/
├── index.html
├── qualite-air.html
├── villes.html
├── guide.html
├── a-propos.html
├── contact.html
├── confidentialite.html
├── mentions-legales.html
├── 404.html
├── robots.txt
├── sitemap.xml
└── assets/
    ├── css/style.css
    ├── js/utils.js       (fonctions partagées : mapping météo, formats, stockage local)
    ├── js/home.js        (page d'accueil)
    ├── js/air.js         (page qualité de l'air)
    ├── js/villes.js      (comparateur de villes)
    └── img/icons.svg     (sprite d'icônes météo et d'interface)
```
