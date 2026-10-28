/**
 * Données de démonstration : producteurs FICTIFS pour tester le site.
 * À ne pas lancer en production (les comptes démo ont un mot de passe connu).
 */
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();

const DEMO_PASSWORD = "demo-producteur";

type DemoProducer = Omit<Prisma.ProducerCreateWithoutUserInput, "products" | "relayPoints"> & {
  login: string;
  products: Omit<Prisma.ProductCreateWithoutProducerInput, "producer">[];
  relays?: string[];
  /** [jour ISO, début, fin, point relais (nom) ou null = à la ferme] */
  slots?: [number, string, string, string | null][];
};

const relayPoints = [
  {
    name: "Marché d'Ax-les-Thermes",
    address: "Place du Breilh, 09110 Ax-les-Thermes",
    commune: "Ax-les-Thermes",
    latitude: 42.7203,
    longitude: 1.8379,
    openingHours: "Samedi 8 h – 13 h",
    description: "Le marché hebdomadaire au cœur de la ville thermale.",
  },
  {
    name: "Épicerie du village (démo)",
    address: "Route de Mérens, 09110 Mérens-les-Vals",
    commune: "Mérens-les-Vals",
    latitude: 42.656,
    longitude: 1.8352,
    openingHours: "Mardi – dimanche, 8 h – 12 h 30 / 16 h – 19 h",
    description: "Point de dépôt fictif pour la démonstration.",
  },
];

const producers: DemoProducer[] = [
  {
    login: "rucher@demo.local",
    slots: [[3, "10:00", "12:00", null], [6, "08:00", "13:00", "Marché d'Ax-les-Thermes"]],
    name: "Le Rucher des Estives (démo)",
    category: "MIEL",
    commune: "Orlu",
    description: "Miels de montagne récoltés entre 900 et 1 800 m dans la réserve d'Orlu.",
    address: "Chemin de la Forge, 09110 Orlu",
    latitude: 42.7041,
    longitude: 1.8822,
    phone: "05 00 00 00 01",
    email: "contact@rucher.demo",
    pickupInfo: "Vente à la miellerie le mercredi et le samedi, 10 h – 12 h.",
    visibility: "PUBLIC",
    status: "APPROVED",
    relays: ["Marché d'Ax-les-Thermes"],
    products: [
      { name: "Miel de montagne", unit: "le pot de 500 g", priceCents: 1100, stockStatus: "AVAILABLE" },
      { name: "Miel de bruyère", unit: "le pot de 500 g", priceCents: 1300, stockStatus: "LOW" },
      { name: "Miel de rhododendron", unit: "le pot de 250 g", priceCents: 950, stockStatus: "OUT_OF_STOCK" },
      { name: "Pain d'épices", unit: "la pièce", priceCents: 750, stockStatus: "AVAILABLE" },
    ],
  },
  {
    login: "fromage@demo.local",
    slots: [[1, "17:00", "19:00", null], [3, "17:00", "19:00", null], [5, "17:00", "19:00", null], [6, "08:00", "13:00", "Marché d'Ax-les-Thermes"]],
    name: "Fromagerie de l'Oriège (démo)",
    category: "FROMAGE",
    commune: "Ascou",
    description: "Tommes de vache et de brebis au lait cru, affinées en cave.",
    address: "Lieu-dit Le Pla, 09110 Ascou",
    latitude: 42.7262,
    longitude: 1.9011,
    phone: "05 00 00 00 02",
    pickupInfo: "Tous les jours sauf dimanche, 17 h – 19 h, après la traite.",
    visibility: "APPROXIMATE",
    status: "APPROVED",
    relays: ["Marché d'Ax-les-Thermes", "Épicerie du village (démo)"],
    products: [
      { name: "Tomme de vache", unit: "le kg", priceCents: 2200, stockStatus: "AVAILABLE" },
      { name: "Tomme de brebis", unit: "le kg", priceCents: 2800, stockStatus: "OUT_OF_SEASON" },
      { name: "Yaourts nature", unit: "les 4", priceCents: 400, stockStatus: "AVAILABLE" },
    ],
  },
  {
    login: "viande@demo.local",
    slots: [[5, "16:00", "19:00", null], [6, "09:00", "12:00", "Épicerie du village (démo)"]],
    name: "Ferme Martin (démo)",
    category: "VIANDE",
    commune: "Mérens-les-Vals",
    description: "Élevage de vaches gasconnes et de chevaux de Mérens en estive. Colis de viande sur commande.",
    address: "Hameau de l'Hospitalet, 09110 Mérens-les-Vals",
    latitude: 42.6612,
    longitude: 1.8301,
    phone: "05 00 00 00 03",
    pickupInfo: "Retrait des colis le premier vendredi du mois.",
    visibility: "ANONYMOUS",
    status: "APPROVED",
    relays: ["Épicerie du village (démo)"],
    products: [
      { name: "Colis de bœuf gascon", unit: "le colis de 5 kg", priceCents: 9500, stockStatus: "LOW" },
      { name: "Saucisses sèches", unit: "les 2", priceCents: 1200, stockStatus: "AVAILABLE" },
    ],
  },
  {
    login: "laine@demo.local",
    slots: [[4, "14:00", "18:00", null], [5, "14:00", "18:00", null], [6, "14:00", "18:00", null]],
    name: "Atelier Laine & Montagne (démo)",
    category: "TEXTILE",
    commune: "Ax-les-Thermes",
    description: "Laine de brebis tarasconnaises filée et teinte à la main. Pulls, bonnets, chaussettes.",
    address: "Rue de l'Horloge, 09110 Ax-les-Thermes",
    latitude: 42.7212,
    longitude: 1.8392,
    website: "https://example.org",
    pickupInfo: "Atelier ouvert du jeudi au samedi, 14 h – 18 h.",
    visibility: "PUBLIC",
    status: "APPROVED",
    products: [
      { name: "Bonnet en laine", unit: "la pièce", priceCents: 3500, stockStatus: "AVAILABLE" },
      { name: "Pelote filée main", unit: "100 g", priceCents: 1200, stockStatus: "AVAILABLE" },
      { name: "Chaussettes de montagne", unit: "la paire", priceCents: 2200, stockStatus: "OUT_OF_STOCK" },
    ],
  },
  {
    login: "champi@demo.local",
    slots: [[7, "10:00", "12:00", null]],
    name: "Champignons des Bois (démo)",
    category: "CHAMPIGNONS",
    commune: "Sorgeat",
    description: "Pleurotes et shiitakés cultivés sur bûches, cèpes séchés en saison.",
    latitude: 42.7355,
    longitude: 1.8571,
    pickupInfo: "Sur rendez-vous via le formulaire.",
    visibility: "APPROXIMATE",
    status: "APPROVED",
    products: [
      { name: "Pleurotes frais", unit: "la barquette de 250 g", priceCents: 450, stockStatus: "AVAILABLE" },
      { name: "Cèpes séchés", unit: "50 g", priceCents: 900, stockStatus: "OUT_OF_SEASON" },
    ],
  },
  {
    login: "attente@demo.local",
    name: "Chèvrerie en attente (démo)",
    category: "FROMAGE",
    commune: "Tignac",
    visibility: "APPROXIMATE",
    status: "PENDING",
    products: [{ name: "Crottins de chèvre", unit: "la pièce", priceCents: 250, stockStatus: "AVAILABLE" }],
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@demo.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "demo-admin-123";
  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: "ADMIN" },
  });

  for (const r of relayPoints) {
    if (!(await db.relayPoint.findFirst({ where: { name: r.name } }))) await db.relayPoint.create({ data: r });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  for (const { login, products, relays = [], slots = [], ...producer } of producers) {
    if (await db.user.findUnique({ where: { email: login } })) continue;
    const relayList = await db.relayPoint.findMany({ where: { name: { in: relays } }, select: { id: true, name: true } });
    const relayIds = relayList.map(({ id }) => ({ id }));
    const pickupSlots = slots.map(([weekday, start, end, relay]) => ({
      weekday,
      startMinutes: toMinutes(start),
      endMinutes: toMinutes(end),
      relayPointId: relay ? relayList.find((r) => r.name === relay)!.id : null,
    }));
    await db.user.create({
      data: {
        email: login,
        passwordHash,
        producer: {
          create: {
            ...producer,
            products: { create: products },
            relayPoints: { connect: relayIds },
            pickupSlots: { create: pickupSlots },
          },
        },
      },
    });
  }

  console.log(`Admin : ${adminEmail} / ${adminPassword}`);
  console.log(`Producteurs démo : rucher@demo.local (etc.) / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
