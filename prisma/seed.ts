/**
 * Données de démonstration : commerces, prestataires et événements FICTIFS ; les sites naturels
 * (Dent d'Orlu, étang de Naguilhes, bassin des Ladres…) sont réels.
 * À ne pas lancer en production (les comptes démo ont un mot de passe connu).
 */
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { addDays, parisNow, parisToUtc, parseHours } from "../src/lib/hours";

const db = new PrismaClient();
const DEMO_PASSWORD = "demo-producteur";

type Seed = Omit<Prisma.PlaceCreateInput, "hours" | "products" | "owner" | "sellsAt"> & {
  key: string;
  login?: string;
  hours?: string;
  products?: [string, string, number | null, Prisma.ProductCreateWithoutPlaceInput["stockStatus"]][];
  sellsAt?: string[];
};

const LOCAL: Seed[] = [
  { key: "marche-ax", kind: "LOCAL", subcategory: "marchelocal", name: "Marché d'Ax-les-Thermes", commune: "Ax-les-Thermes", latitude: 42.7196, longitude: 1.8362, tagline: "Le grand marché du samedi matin.", description: "Producteurs de la vallée, maraîchers et artisans autour du bassin des Ladres.", address: "Place du Breilh, 09110 Ax-les-Thermes", hours: "6 8:00-13:00" },
  { key: "marche-luz", kind: "LOCAL", subcategory: "marchelocal", name: "Marché de Luzenac", commune: "Luzenac", latitude: 42.765, longitude: 1.7568, tagline: "Petit marché du jeudi matin.", description: "Une dizaine d'étals : fromages, légumes, laine et pain.", address: "Place de la mairie, 09250 Luzenac", hours: "4 8:00-12:00" },
  { key: "depot-merens", kind: "LOCAL", subcategory: "depot", name: "Épicerie de Mérens", commune: "Mérens-les-Vals", latitude: 42.6575, longitude: 1.8372, tagline: "Dépôt de produits des fermes voisines.", description: "L'épicerie du village tient un rayon de produits fermiers : fromages, viande, miel.", address: "Route nationale, 09110 Mérens-les-Vals", hours: "2-7 8:00-12:30,16:00-19:00" },
  { key: "vitrine", kind: "LOCAL", subcategory: "depot", name: "Vitrine des producteurs (office de tourisme)", commune: "Ax-les-Thermes", latitude: 42.7222, longitude: 1.8401, tagline: "Les produits de la vallée à l'office de tourisme.", description: "Une vitrine où les producteurs déposent miel, laine et confitures, en vente à l'accueil.", address: "Avenue Théophile Delcassé, 09110 Ax-les-Thermes", hours: "1-7 9:00-12:30,14:00-18:00" },
];

const PRODUCERS: Seed[] = [
  { key: "rucher", login: "rucher@demo.local", kind: "PRODUCTEUR", subcategory: "miel", name: "Le Rucher des Estives", commune: "Orlu", latitude: 42.7041, longitude: 1.8822, visibility: "PUBLIC", labels: ["Agriculture biologique", "Estives"],
    tagline: "Miels de montagne récoltés entre 900 et 1 800 m.", description: "Nos ruches passent l'été dans les estives autour de la réserve d'Orlu. Rhododendron, bruyère, montagne : chaque miel raconte une altitude.", story: "Installés depuis 2012, nous travaillons avec l'abeille noire des Pyrénées, rustique et adaptée au climat de la vallée.",
    address: "Chemin de la Forge, 09110 Orlu", phone: "05 61 00 00 01", email: "contact@rucher-estives.fr", hours: "3,6 10:00-12:00", sellsAt: ["marche-ax", "vitrine"],
    products: [["Miel de montagne", "le pot de 500 g", 1100, "AVAILABLE"], ["Miel de bruyère", "le pot de 500 g", 1300, "LOW"], ["Miel de rhododendron", "le pot de 250 g", 950, "OUT_OF_STOCK"], ["Pain d'épices", "400 g", 750, "AVAILABLE"]] },
  { key: "fromage", login: "fromage@demo.local", kind: "PRODUCTEUR", subcategory: "fromage", name: "Fromagerie de l'Oriège", commune: "Ascou", latitude: 42.7262, longitude: 1.9011, visibility: "APPROXIMATE", labels: ["Bienvenue à la ferme", "Lait cru"],
    tagline: "Tommes de vache et de brebis au lait cru.", description: "Une trentaine de vaches et une centaine de brebis, en estive de juin à octobre. Les tommes sont affinées trois mois minimum dans notre cave en pierre.", story: "La ferme est dans la famille depuis quatre générations.",
    address: "Lieu-dit Le Pla, 09110 Ascou", phone: "05 61 00 00 02", hours: "1,3,5 17:00-19:00", sellsAt: ["marche-ax", "marche-luz", "depot-merens"],
    products: [["Tomme de vache", "le kg", 2200, "AVAILABLE"], ["Tomme de brebis", "le kg", 2800, "OUT_OF_SEASON"], ["Yaourts nature", "les 4", 400, "AVAILABLE"]] },
  { key: "viande", login: "viande@demo.local", kind: "PRODUCTEUR", subcategory: "viande", name: "Ferme Martin", commune: "Mérens-les-Vals", latitude: 42.6612, longitude: 1.8301, visibility: "ANONYMOUS", labels: ["Race locale", "Estives"],
    tagline: "Bœuf gascon et chevaux de Mérens élevés en estive.", description: "Colis de viande de vaches gasconnes, saucisses sèches et terrines. Les animaux passent l'été en estive au-dessus de Mérens.",
    address: "Hameau de l'Hospitalet, 09110 Mérens-les-Vals", phone: "05 61 00 00 03", hours: "5 16:00-19:00", sellsAt: ["depot-merens", "marche-ax"],
    products: [["Colis de bœuf gascon", "5 kg", 9500, "LOW"], ["Saucisses sèches", "les 2", 1200, "AVAILABLE"], ["Terrine de campagne", "180 g", 650, "AVAILABLE"]] },
  { key: "laine", login: "laine@demo.local", kind: "PRODUCTEUR", subcategory: "laine", name: "Atelier Laine & Montagne", commune: "Ax-les-Thermes", latitude: 42.7214, longitude: 1.8396, visibility: "PUBLIC", labels: ["Fait main"],
    tagline: "Laine de brebis filée et teinte à la main.", description: "Pulls, bonnets et chaussettes en laine de brebis tarasconnaises, teinte avec des plantes de la vallée.", story: "L'atelier propose aussi des initiations au filage le samedi après-midi.",
    address: "Rue de l'Horloge, 09110 Ax-les-Thermes", phone: "05 61 00 00 04", email: "atelier@laine-montagne.fr", hours: "4-6 14:00-18:00", sellsAt: ["vitrine", "marche-luz"],
    products: [["Bonnet en laine", "la pièce", 3500, "AVAILABLE"], ["Pelote filée main", "100 g", 1200, "AVAILABLE"], ["Chaussettes de montagne", "la paire", 2200, "OUT_OF_STOCK"]] },
  { key: "champi", login: "champi@demo.local", kind: "PRODUCTEUR", subcategory: "champignons", name: "Champignons des Bois", commune: "Sorgeat", latitude: 42.7355, longitude: 1.8571, visibility: "APPROXIMATE", labels: ["Agriculture biologique"],
    tagline: "Pleurotes et shiitakés cultivés sur bûches de hêtre.", description: "Culture de champignons sur bûches de hêtre des forêts de la vallée ; cèpes séchés quand la saison le permet.",
    address: "Le Moulin, 09110 Sorgeat", phone: "05 61 00 00 05", hours: "7 10:00-12:00", sellsAt: ["marche-ax"],
    products: [["Pleurotes frais", "250 g", 450, "AVAILABLE"], ["Cèpes séchés", "50 g", 900, "OUT_OF_SEASON"]] },
  { key: "attente", login: "attente@demo.local", kind: "PRODUCTEUR", subcategory: "fromage", name: "Chèvrerie en attente", commune: "Tignac", latitude: 42.7464, longitude: 1.8197, visibility: "APPROXIMATE", status: "PENDING", tagline: "Fromages de chèvre fermiers." },
];

const SHOPS: Seed[] = [
  { key: "boulangerie", login: "boulangerie@demo.local", kind: "COMMERCE", subcategory: "boulangerie", name: "Boulangerie du Breilh", commune: "Ax-les-Thermes", latitude: 42.7199, longitude: 1.8372, tagline: "Pain au levain, croustades et gâteau à la broche le week-end.", description: "Pains au levain cuits au feu de bois, viennoiseries, et le gâteau à la broche ariégeois sur commande.", phone: "05 61 00 01 01", address: "Place du Breilh, 09110 Ax-les-Thermes", hours: "2-7 7:00-13:00,15:30-19:00", labels: ["Farines locales"] },
  { key: "comptoir", kind: "COMMERCE", subcategory: "epicerie", name: "Le Comptoir de l'Oriège", commune: "Orgeix", latitude: 42.7078, longitude: 1.8638, tagline: "Épicerie de village, produits de la vallée.", description: "Épicerie, journaux, dépôt de pain et un rayon de produits des fermes voisines.", phone: "05 61 00 01 02", address: "Le Village, 09110 Orgeix", hours: "1-6 8:00-12:30,16:00-19:00" },
  { key: "estive", kind: "COMMERCE", subcategory: "restaurant", name: "Restaurant L'Estive", commune: "Ax-les-Thermes", latitude: 42.7221, longitude: 1.838, tagline: "Cuisine de montagne avec les producteurs du coin.", description: "Azinat, truite de l'Ariège, tommes de la vallée : la carte change avec les arrivages des fermes voisines.", phone: "05 61 00 01 03", address: "Avenue Delcassé, 09110 Ax-les-Thermes", hours: "3-7 12:00-14:00,19:00-21:30", labels: ["Produits locaux"] },
  { key: "auberge", kind: "COMMERCE", subcategory: "restaurant", name: "Auberge du Lac", commune: "Orlu", latitude: 42.6985, longitude: 1.8935, tagline: "Terrasse au bord de l'eau, au départ des randonnées.", description: "Omelettes aux cèpes, assiettes de charcuterie et tartes maison au départ des sentiers d'Orlu.", phone: "05 61 00 01 04", address: "Route du lac, 09110 Orlu", hours: "4-7 12:00-15:00", season: [4, 5, 6, 7, 8, 9, 10] },
  { key: "cafe", kind: "COMMERCE", subcategory: "bar", name: "Café des Thermes", commune: "Ax-les-Thermes", latitude: 42.721, longitude: 1.8391, tagline: "Le café de la place, en face du bassin des Ladres.", description: "Petit-déjeuner, chocolat chaud après le ski et terrasse au soleil.", phone: "05 61 00 01 05", address: "Place du Breilh, 09110 Ax-les-Thermes", hours: "1-7 7:30-20:00" },
  { key: "boutique", kind: "COMMERCE", subcategory: "boutique", name: "La Boutique Ariégeoise", commune: "Ax-les-Thermes", latitude: 42.7205, longitude: 1.8399, tagline: "Artisanat, couteaux, laine et produits du terroir.", description: "Une sélection d'artisans ariégeois : couteaux, poteries, laine et cartes de randonnée.", phone: "05 61 00 01 06", address: "Rue Rigal, 09110 Ax-les-Thermes", hours: "2-6 10:00-12:30,14:30-19:00" },
  { key: "location", kind: "COMMERCE", subcategory: "location", name: "Montagne Location", commune: "Ax-les-Thermes", latitude: 42.7192, longitude: 1.8358, tagline: "Skis, raquettes, VTT électriques selon la saison.", description: "Location de skis et raquettes en hiver, de VTT électriques et de matériel de randonnée en été.", phone: "05 61 00 01 07", address: "Avenue du Docteur Gomma, 09110 Ax-les-Thermes", hours: "1-7 8:30-12:30,14:00-19:00" },
];

const ACTIVITIES: Seed[] = [
  { key: "naguilhes", kind: "ACTIVITE", subcategory: "randonnee", name: "Randonnée de l'étang de Naguilhes", commune: "Orlu", latitude: 42.68, longitude: 1.915, tagline: "Une boucle accessible au cœur de la réserve d'Orlu.", description: "Montée tranquille le long de l'Oriège jusqu'à l'étang, avec de bonnes chances d'apercevoir isards et marmottes.", season: [5, 6, 7, 8, 9, 10], facts: { duration: "3 h", distance: "7 km", elevation: "+380 m", level: 1, audience: "Familles", price: "Gratuit", meetingPoint: "Parking des Forges d'Orlu" } },
  { key: "dent", kind: "ACTIVITE", subcategory: "randonnee", name: "Ascension de la Dent d'Orlu", commune: "Orlu", latitude: 42.69, longitude: 1.9, tagline: "Le sommet emblématique de la vallée, 2 222 m.", description: "Itinéraire sportif avec un dernier passage aérien. Vue sur toute la Haute-Ariège depuis le sommet.", season: [6, 7, 8, 9, 10], facts: { duration: "6 h 30", distance: "11 km", elevation: "+1 300 m", level: 3, audience: "Randonneurs entraînés", price: "Gratuit", meetingPoint: "Orlu, parking du village" } },
  { key: "canyon", login: "canyon@demo.local", kind: "ACTIVITE", subcategory: "canyoning", name: "Canyoning : initiation dans les gorges", commune: "Mérens-les-Vals", latitude: 42.668, longitude: 1.842, tagline: "Sauts, toboggans et rappels, encadrés par un moniteur.", description: "Demi-journée découverte dans un canyon adapté aux débutants. Combinaisons et casques fournis.", season: [6, 7, 8, 9], phone: "06 00 00 00 01", facts: { duration: "3 h 30", level: 2, audience: "Dès 10 ans, savoir nager", price: "45 €", meetingPoint: "Mérens-les-Vals, place de l'église", provider: "Pyrène Eaux Vives (fictif)" } },
  { key: "speleo", kind: "ACTIVITE", subcategory: "speleo", name: "Spéléologie : première sortie sous terre", commune: "Luzenac", latitude: 42.772, longitude: 1.762, tagline: "Ramper, grimper et découvrir les concrétions.", description: "Une sortie encadrée dans une grotte facile, toute l'année : la température y reste stable.", phone: "06 00 00 00 02", facts: { duration: "3 h", level: 1, audience: "Dès 8 ans", price: "40 €", meetingPoint: "Luzenac, parking de la mairie", provider: "Ariège Sous Terre (fictif)" } },
  { key: "escalade", kind: "ACTIVITE", subcategory: "escalade", name: "Initiation à l'escalade en falaise", commune: "Perles-et-Castelet", latitude: 42.752, longitude: 1.786, tagline: "Une falaise école ensoleillée, encadrée par un guide.", description: "Apprendre les nœuds, l'assurage et grimper ses premières voies en extérieur.", season: [4, 5, 6, 7, 8, 9, 10], phone: "06 00 00 00 03", facts: { duration: "3 h", level: 1, audience: "Dès 8 ans", price: "38 €", meetingPoint: "Perles-et-Castelet", provider: "Guides de Haute-Ariège (fictif)" } },
  { key: "vtt", kind: "ACTIVITE", subcategory: "vtt", name: "VTT : boucle du plateau de Sault", commune: "Prades", latitude: 42.792, longitude: 1.876, tagline: "Pistes larges et panoramas sur les Pyrénées.", description: "Grande boucle roulante entre Prades et Montaillou, sur les pistes du plateau.", season: [4, 5, 6, 7, 8, 9, 10], facts: { duration: "2 h 30", distance: "24 km", elevation: "+450 m", level: 2, audience: "Cyclistes à l'aise", price: "Gratuit", meetingPoint: "Prades, place du village" } },
  { key: "ski", kind: "ACTIVITE", subcategory: "neige", name: "Ski alpin à Ax 3 Domaines", commune: "Ax-les-Thermes", latitude: 42.705, longitude: 1.805, tagline: "La station de la vallée, reliée à Ax par télécabine.", description: "Pistes pour tous niveaux entre forêt et crêtes, accès direct depuis le centre d'Ax en télécabine.", season: [12, 1, 2, 3, 4], facts: { level: 2, audience: "Tous niveaux", price: "Forfait journée", meetingPoint: "Télécabine, centre d'Ax" } },
  { key: "raquettes", kind: "ACTIVITE", subcategory: "neige", name: "Sortie raquettes au clair de lune", commune: "Ascou", latitude: 42.735, longitude: 1.915, tagline: "Balade nocturne encadrée, suivie d'une soupe chaude.", description: "Deux heures de marche sur la neige avec un accompagnateur, lampes frontales fournies.", season: [12, 1, 2, 3], phone: "06 00 00 00 04", facts: { duration: "2 h 30", level: 1, audience: "Dès 8 ans", price: "28 €", meetingPoint: "Ascou, parking du col", provider: "Accompagnateurs du Pailhères (fictif)" } },
  { key: "thermes", kind: "ACTIVITE", subcategory: "bienetre", name: "Bains thermaux d'Ax", commune: "Ax-les-Thermes", latitude: 42.7203, longitude: 1.8404, tagline: "Bassins d'eau chaude naturelle en plein centre.", description: "Bassins intérieurs et extérieurs alimentés par les sources chaudes d'Ax, idéal après une journée de ski ou de randonnée.", hours: "1-7 10:00-20:00", facts: { duration: "2 h", level: 1, audience: "Tous publics", price: "18 €", meetingPoint: "Centre d'Ax" } },
  { key: "ladres", kind: "ACTIVITE", subcategory: "bienetre", name: "Bassin des Ladres", commune: "Ax-les-Thermes", latitude: 42.7207, longitude: 1.8388, tagline: "Le bain de pieds gratuit à 70 °C de la place du Breilh.", description: "Un bassin d'eau thermale où l'on trempe les pieds, au cœur d'Ax. Une tradition locale.", facts: { duration: "15 min", level: 1, audience: "Tous publics", price: "Gratuit", meetingPoint: "Place du Breilh" } },
  { key: "faune", kind: "ACTIVITE", subcategory: "nature", name: "À l'affût des isards", commune: "Orlu", latitude: 42.692, longitude: 1.925, tagline: "Sortie jumelles avec un guide naturaliste.", description: "Tôt le matin, observation des isards, mouflons et rapaces dans la réserve.", phone: "06 00 00 00 05", facts: { duration: "4 h", level: 1, audience: "Dès 7 ans", price: "25 €", meetingPoint: "Maison de la réserve, Orlu", provider: "Guides nature d'Orlu (fictif)" } },
];

type EventSeed = { title: string; subcategory: string; commune: string; lat: number; lng: number; day: number; start: string; end: string; price: string; organiser: string; tagline: string; description: string; programme: string[]; participants?: string[]; organiserKey?: string };
const EVENTS: EventSeed[] = [
  { title: "Fête de la châtaigne", subcategory: "fete", commune: "Mérens-les-Vals", lat: 42.6565, lng: 1.8345, day: 2, start: "11:00", end: "18:00", price: "Gratuit", organiser: "Comité des fêtes de Mérens (fictif)", tagline: "Châtaignes grillées, vin chaud et bal musette.", description: "Grillades de châtaignes au feu de bois, marché de producteurs et bal en fin d'après-midi.", programme: ["11 h : ouverture du marché", "12 h 30 : repas partagé", "15 h : concours de soupe", "17 h : bal musette"], participants: ["viande", "champi"] },
  { title: "Chants pyrénéens à l'église", subcategory: "concert", commune: "Luzenac", lat: 42.766, lng: 1.755, day: 4, start: "20:30", end: "22:00", price: "10 €", organiser: "Association Vòtz de la vath (fictif)", tagline: "Polyphonies occitanes a cappella.", description: "Un chœur d'hommes de la vallée interprète le répertoire pyrénéen traditionnel.", programme: ["20 h 30 : concert", "22 h : verre de l'amitié"] },
  { title: "Foire aux fromages et à la laine", subcategory: "foire", commune: "Ax-les-Thermes", lat: 42.7212, lng: 1.8372, day: 6, start: "09:00", end: "17:00", price: "Gratuit", organiser: "Ville d'Ax-les-Thermes (fictif)", tagline: "Une journée autour des fromages fermiers et de la laine.", description: "Dégustations, démonstrations de filage, concours de la meilleure tomme de la vallée.", programme: ["9 h : ouverture", "11 h : démonstration de filage", "14 h : concours de tommes", "16 h 30 : remise des prix"], participants: ["fromage", "laine", "rucher"] },
  { title: "Trail nocturne des lacs", subcategory: "course", commune: "Ascou", lat: 42.73, lng: 1.905, day: 13, start: "18:00", end: "23:00", price: "22 €", organiser: "Ascou Trail (fictif)", tagline: "12 ou 22 km à la frontale.", description: "Deux parcours nocturnes autour des lacs, ravitaillement aux produits locaux à l'arrivée.", programme: ["18 h : retrait des dossards", "19 h 30 : départ du 22 km", "20 h : départ du 12 km"] },
  { title: "Portes ouvertes de la miellerie", subcategory: "fete", commune: "Orlu", lat: 42.7041, lng: 1.8822, day: 9, start: "14:00", end: "18:00", price: "Gratuit", organiser: "", tagline: "Visite, extraction et dégustation de miels.", description: "Venez découvrir le travail de l'apiculteur et goûter les miels de l'année.", programme: ["14 h : visite du rucher", "16 h : dégustation"], organiserKey: "rucher" },
  { title: "Veillée contes au coin du feu", subcategory: "concert", commune: "Orgeix", lat: 42.7075, lng: 1.866, day: 20, start: "18:30", end: "20:30", price: "Gratuit", organiser: "Bibliothèque d'Orgeix (fictif)", tagline: "Légendes de la vallée racontées en famille.", description: "Contes et légendes de Haute-Ariège, suivis d'un goûter.", programme: ["18 h 30 : contes", "19 h 45 : goûter"] },
  { title: "Marché de Noël", subcategory: "marche", commune: "Ax-les-Thermes", lat: 42.7205, lng: 1.8385, day: 27, start: "10:00", end: "19:00", price: "Gratuit", organiser: "Office de tourisme (fictif)", tagline: "Artisans, producteurs et vin chaud.", description: "Une quarantaine d'exposants autour du bassin des Ladres : artisanat, produits fermiers, animations pour les enfants.", programme: ["10 h : ouverture", "15 h : arrivée du Père Noël", "17 h : chorale"], participants: ["rucher", "laine", "fromage"] },
];

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@demo.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "demo-admin-123";
  await db.user.upsert({ where: { email: adminEmail }, update: {}, create: { email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: "ADMIN" } });

  if (await db.place.count()) {
    console.log("Données déjà présentes : seed ignoré.");
    return;
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const ids = new Map<string, string>();
  // Les marchés d'abord : les producteurs y sont rattachés.
  for (const s of [...LOCAL, ...PRODUCERS, ...SHOPS, ...ACTIVITIES]) {
    const { key, login, hours, products, sellsAt, ...data } = s;
    const owner = login ? await db.user.create({ data: { email: login, passwordHash } }) : null;
    const place = await db.place.create({
      data: {
        ...data,
        status: data.status ?? "APPROVED",
        hours: hours ? parseHours(hours) : undefined,
        stockUpdatedAt: products ? new Date(Date.now() - Math.floor(Math.random() * 5) * 86_400_000) : undefined,
        owner: owner ? { connect: { id: owner.id } } : undefined,
        products: products ? { create: products.map(([name, unit, priceCents, stockStatus]) => ({ name, unit, priceCents, stockStatus })) } : undefined,
        sellsAt: sellsAt ? { connect: sellsAt.map((k) => ({ id: ids.get(k)! })) } : undefined,
      },
    });
    ids.set(key, place.id);
  }

  const today = parisNow().date;
  for (const e of EVENTS) {
    const date = addDays(today, e.day);
    await db.event.create({
      data: {
        title: e.title, subcategory: e.subcategory, commune: e.commune, latitude: e.lat, longitude: e.lng, price: e.price,
        organiser: e.organiser, tagline: e.tagline, description: e.description, programme: e.programme,
        startsAt: parisToUtc(date, toMinutes(e.start)), endsAt: parisToUtc(date, toMinutes(e.end)),
        organiserPlaceId: e.organiserKey ? ids.get(e.organiserKey) : null,
        participants: { connect: [...(e.participants ?? []), ...(e.organiserKey ? [e.organiserKey] : [])].map((k) => ({ id: ids.get(k)! })) },
      },
    });
  }

  console.log(`Admin : ${adminEmail} / ${adminPassword}`);
  console.log(`Comptes pros démo : rucher@demo.local, fromage@demo.local, boulangerie@demo.local, canyon@demo.local… / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
