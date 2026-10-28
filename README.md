# Producteurs de la vallée d'Ax

Annuaire et carte des petits producteurs de la vallée d'Ax-les-Thermes (miel, fromage, viande, tissus, champignons…).

## Fonctionnalités

**Visiteurs (habitants et touristes)**
- Carte interactive (Leaflet / OpenStreetMap) et liste des producteurs, filtres par catégorie, recherche (producteur, produit, commune), filtre « produits disponibles ».
- Fiche producteur : produits, prix, statut de stock (disponible, stock limité, rupture, hors saison), horaires de retrait, points relais, fermeture temporaire.
- Points relais : lieux où plusieurs producteurs déposent leurs produits.
- Formulaire de contact : permet de joindre un producteur sans que ses coordonnées soient publiques.

**Producteurs** (`/inscription`, puis `/espace`)
- Choix de la visibilité :
  - **Public** : nom, adresse exacte, téléphone, e-mail.
  - **Discret** (par défaut) : nom visible, position floutée (~1 km), adresse et contacts masqués.
  - **Anonyme** : pseudonyme (« Apiculteur·rice à Orlu »), seule la commune est indiquée.
- Mise à jour du stock en un geste (pensée pour le téléphone), gestion des produits, choix des points relais, messages reçus.

**Commande et retrait (V2)**
- Panier multi-producteurs, sans création de compte ; paiement **sur place**, sans commission.
- Chaque producteur définit ses **créneaux de retrait** hebdomadaires, chez lui ou en point relais ; le client choisit une date (jusqu'à 3 semaines, au moins 12 h à l'avance).
- Chaque producteur **confirme ou refuse** sa partie de la commande (avec un message), puis la marque prête / retirée.
- Le client suit sa commande via un **lien secret** (envoyé par e-mail). L'adresse, le téléphone et la position exacte d'un producteur ne lui sont révélés **qu'après confirmation** d'un retrait chez ce producteur.
- **Itinéraire optimisé** par jour de retrait, depuis la position du client ou Ax-les-Thermes : ordre de passage qui respecte les créneaux, heure de départ conseillée, carte et lien Google Maps.
- E-mails : nouvelle commande (producteur), confirmation / refus / commande prête / annulation.

**Administration** (`/admin`) : validation ou suspension des producteurs, gestion des points relais.

### Confidentialité
Toutes les données envoyées au navigateur passent par `src/lib/privacy.ts` (`toPublicProducer`) :
les champs masqués ne quittent jamais le serveur. Le floutage est un décalage **déterministe et secret**
(HMAC avec `LOCATION_SECRET`) : recharger la page ne permet pas de moyenner la vraie position, et le décalage
ne peut pas être recalculé sans le secret. Les tests (`tests/privacy.test.ts`) vérifient ces garanties.

## Stack
Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL · Leaflet.

## Démarrer en local
```bash
cp .env.example .env          # puis renseigner DATABASE_URL et SESSION_SECRET
npm install
npx prisma migrate deploy
npm run db:seed               # données de démonstration FICTIVES
npm run dev
```
Comptes de démo : `admin@demo.local` / `demo-admin-123`, producteurs `rucher@demo.local`, `fromage@demo.local`… / `demo-producteur`.
Ne pas lancer le seed en production (ou définir `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Variables d'environnement
| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Base PostgreSQL |
| `SESSION_SECRET` | Signature des sessions (≥ 32 caractères aléatoires) |
| `LOCATION_SECRET` | Secret du floutage des positions (par défaut : `SESSION_SECRET`). **Ne pas le changer** une fois en ligne, sinon les positions floutées bougent. |
| `NEXT_PUBLIC_TILE_URL`, `NEXT_PUBLIC_TILE_ATTRIBUTION` | Fournisseur de fonds de carte (optionnel) |
| `APP_URL` | Adresse publique du site (liens dans les e-mails) |
| `RESEND_API_KEY`, `MAIL_FROM` | Envoi des e-mails via [Resend](https://resend.com). Sans eux, les e-mails sont écrits dans les logs. |
| `ORS_API_KEY` | Temps de trajet et tracés réels via [OpenRouteService](https://openrouteservice.org) (clé gratuite). Sans clé : estimation (vol d'oiseau × 1,4 à 40 km/h). |

## Mise en ligne (service payant simple)
- **Application** : Vercel (offre Pro ~20 $/mois) ou Scalingo / Clever Cloud (hébergement en France).
- **Base de données** : Supabase, Neon, ou la base PostgreSQL du même hébergeur.
- **E-mails** : Resend (gratuit jusqu'à 3 000 e-mails/mois), avec un nom de domaine vérifié.
- **Fonds de carte** : les serveurs d'OpenStreetMap ne sont pas faits pour un usage en production ; prendre un compte MapTiler ou Stadia Maps (offres gratuites puis payantes) et renseigner `NEXT_PUBLIC_TILE_URL`.

Commande de build : `npm run build` ; migrations : `npm run db:deploy`.

## Scripts
`npm run dev` · `npm run build` · `npm test` · `npm run typecheck`

## Prochaines étapes
- **V3** : paiement en ligne (Stripe Connect, sans commission), puis éventuellement Bitcoin / Lightning (BTCPay Server).
- Version anglaise / espagnole pour les touristes, photos des produits, réinitialisation du mot de passe.
- Quantités en stock (décompte automatique), fermetures exceptionnelles d'un créneau, rappel e-mail la veille du retrait.
