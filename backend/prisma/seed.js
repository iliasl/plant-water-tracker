const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create archetypes
  const archetypes = [
    { name: 'Fern', defaultInterval: 5 },
    { name: 'Succulent', defaultInterval: 21 },
    { name: 'Aroid', defaultInterval: 7 },
    { name: 'Cactus', defaultInterval: 30 },
    { name: 'Tropical', defaultInterval: 10 },
  ];

  for (const archetype of archetypes) {
    await prisma.plantArchetype.upsert({
      where: { id: archetypes.indexOf(archetype) + 1 },
      update: {},
      create: {
        id: archetypes.indexOf(archetype) + 1,
        ...archetype,
      },
    });
  }

  // Create a default user
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: 'hashed_password', // In a real app, use bcrypt
      settings: { ema_alpha: 0.35, snooze_factor: 0.2 },
      rooms: {
        create: [
          { name: 'Living Room', sortOrder: 0 },
          { name: 'Bedroom', sortOrder: 1 },
        ],
      },
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
