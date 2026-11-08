# Vallée d'Ax · à voir, à faire, à goûter

Carte touristique de la vallée d'Ax-les-Thermes (Haute-Ariège), dans l'esprit d'un office de tourisme, qui met en avant les commerçants et producteurs locaux : activités (randonnée, canyoning, spéléo…), producteurs, commerces, marchés et événements.

## Fonctionnalités

**Visiteurs**
- **Carte façon Google Maps** à gauche (fonds Plan, Relief, Satellite ; épingles par type regroupées quand elles sont proches ; « me localiser » ; « voir toute la vallée »), **résultats** à droite. Sur mobile : la liste, et un bouton pour basculer sur la carte.
- **Recherche** plein texte et onglets par type (Événements, Activités, Producteurs, Commerces, Marchés & dépôts) avec leurs compteurs.
- **Filtres** repliés derrière un bouton : catégories, commune et rayon (2 à 20 km), dates (aujourd'hui, week-end, 7 ou 30 jours, dates précises), « ouvert maintenant ». Les filtres actifs restent visibles en pastilles.
- **À chaque recherche, la carte n'affiche que les résultats et se recadre dessus.** La recherche est dans l'adresse de la page : on peut la partager par lien.
- Les dates agissent sur les événements, les jours d'ouverture et la **saison** des activités (le canyoning disparaît en hiver, avec un lien pour l'afficher quand même).
- Les **marchés hebdomadaires** apparaissent aussi dans l'agenda, calculés à partir de leurs jours de tenue.
- **Une page par lieu** (mini-site) : présentation, produits et stock, horaires, infos pratiques des activités, marchés où trouver un producteur, producteurs présents sur un marché, prochaines dates, contact, itinéraire, lien à partager. **Une page par événement** : programme, tarif, organisateur, producteurs présents.

**Pros** (`/inscription`, puis `/espace`) — producteurs, commerçants, prestataires d'activités
- Fiche complète : accroche, présentation, horaires (éditeur jour par jour), saison, infos pratiques, labels, position sur la carte, fermeture temporaire.
- Producteurs : **visibilité** (public, discret, anonyme), produits et **stock** en un geste, marchés où ils vendent.
- **Événements** : portes ouvertes, dégustations… publiés dans l'agenda et sur la carte.
- Messages reçus via le formulaire de contact (prévenus par e-mail).

**Administration** (`/admin`) : validation des fiches, masquage des événements, **création de fiches sans compte** (sites de randonnée, marchés, commerces…) et d'événements (fêtes de village, concerts…).

### Confidentialité
Tout ce qui part vers le navigateur passe par `src/lib/privacy.ts`. Seuls les producteurs peuvent être discrets ou anonymes : leurs coordonnées masquées ne quittent jamais le serveur, et leur position est floutée par un décalage **déterministe et secret** (`LOCATION_SECRET`). Les tests (`tests/privacy.test.ts`) le vérifient.

## Stack
Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL · Leaflet (+ regroupement d'épingles).
La recherche tourne dans le navigateur (`src/lib/search.ts`, testée) : la vallée compte quelques centaines de fiches, le résultat est instantané.

## Démarrer en local
```bash
cp .env.example .env          # puis renseigner DATABASE_URL et SESSION_SECRET
npm install
npx prisma migrate deploy
npm run db:seed               # données de démonstration
npm run dev
```
Comptes de démo : `admin@demo.local` / `demo-admin-123` ; pros `rucher@demo.local`, `fromage@demo.local`, `boulangerie@demo.local`, `canyon@demo.local`… / `demo-producteur`.
Les commerces, prestataires et événements de démo sont **fictifs** ; les sites naturels (Dent d'Orlu, étang de Naguilhes, bassin des Ladres…) sont réels. Ne pas lancer le seed en production.

## Variables d'environnement
| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Base PostgreSQL |
| `SESSION_SECRET` | Signature des sessions (≥ 32 caractères aléatoires) |
| `LOCATION_SECRET` | Secret du floutage des positions (par défaut : `SESSION_SECRET`). Ne pas le changer une fois en ligne. |
| `NEXT_PUBLIC_MAPTILER_KEY` | Fonds de carte MapTiler (recommandé en production). Sans clé : CARTO Voyager, OpenTopoMap et Esri, gratuits mais limités à un usage modéré et non commercial. |
| `APP_URL` | Adresse publique du site (liens dans les e-mails) |
| `RESEND_API_KEY`, `MAIL_FROM` | E-mails via [Resend](https://resend.com) ; sans eux, les e-mails sont écrits dans les logs |

## Mise en ligne (service payant simple)
- **Application** : Vercel, ou Scalingo / Clever Cloud (hébergement en France).
- **Base de données** : Supabase, Neon ou la base PostgreSQL de l'hébergeur.
- **Fonds de carte** : un compte [MapTiler](https://www.maptiler.com) (offre gratuite puis payante) et `NEXT_PUBLIC_MAPTILER_KEY`.
- **E-mails** : Resend.

## Alimenter la carte
Le plus long est de recenser les lieux. Pistes :
- **Apidae**, la base d'informations touristiques des offices de tourisme d'Occitanie : activités, commerces, hébergements et événements, avec une API d'export. Un partenariat avec l'office de tourisme des Pyrénées ariégeoises permettrait d'importer ces données.
- Le **Carnet gourmand** de la Communauté de communes de la Haute-Ariège pour les producteurs en vente directe.
- **OpenStreetMap** pour compléter les commerces.

## Scripts
`npm run dev` · `npm run build` · `npm test` · `npm run typecheck`

## Prochaines étapes
- Traductions anglais / espagnol / catalan (déjà prototypées dans la maquette).
- Photos des lieux (stockage d'images).
- Import automatique depuis Apidae.
