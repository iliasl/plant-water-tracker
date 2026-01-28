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
    },
  });

  // Create rooms
  const livingRoom = await prisma.room.upsert({
    where: { id: 'living-room' },
    update: {},
    create: {
      id: 'living-room',
      name: 'Living Room',
      sortOrder: 0,
      userId: user.id,
    },
  });

  const bedroom = await prisma.room.upsert({
    where: { id: 'bedroom' },
    update: {},
    create: {
      id: 'bedroom',
      name: 'Bedroom',
      sortOrder: 1,
      userId: user.id,
    },
  });


  // Get archetypes
  const fernArchetype = await prisma.plantArchetype.findFirst({
    where: { name: 'Fern' },
  });
  const tropicalArchetype = await prisma.plantArchetype.findFirst({
    where: { name: 'Tropical' },
  });
  const aroidArchetype = await prisma.plantArchetype.findFirst({
    where: { name: 'Aroid' },
  });

  const seedDemoPlants = process.argv.includes('--demo');

  if (seedDemoPlants) {
    const demoPlants = [
      {
        name: 'Boston Fern',
        imageUrl: 'https://images.unsplash.com/photo-1597092953338-c38f4a4c42fe?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80',
        room: livingRoom,
        archetype: fernArchetype,
        waterAmount: 0.5,
        wateringInterval: 5,
      },
      {
        name: 'Bird of Paradise',
        imageUrl: 'https://images.unsplash.com/photo-1628042774315-9f5b211d0f3c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80',
        room: livingRoom,
        archetype: tropicalArchetype,
        waterAmount: 1.0,
        wateringInterval: 10,
      },
      {
        name: 'Monstera Deliciosa',
        imageUrl: 'https://images.unsplash.com/photo-1614526344510-14f828a1e2a5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80',
        room: livingRoom,
        archetype: aroidArchetype,
        waterAmount: 0.75,
        wateringInterval: 7,
      },
      {
        name: 'Maidenhair Fern',
        imageUrl: 'https://images.unsplash.com/photo-1557989936-39a473434b95?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80',
        room: bedroom,
        archetype: fernArchetype,
        waterAmount: 0.25,
        wateringInterval: 6,
      },
    ];

    for (const plantData of demoPlants) {
      const plantExists = await prisma.plant.findFirst({ where: { name: plantData.name } });
      if (!plantExists) {
        const newPlant = await prisma.plant.create({
          data: {
            name: plantData.name,
            imageUrl: plantData.imageUrl,
            room: { connect: { id: plantData.room.id } },
            archetype: { connect: { id: plantData.archetype.id } },
            currentEma: plantData.archetype.defaultInterval,
            waterAmount: plantData.waterAmount,
          },
        });

        // Create watering events
        let currentDate = new Date();
        currentDate.setMonth(currentDate.getMonth() - 3);
        const history = [];
        while (currentDate < new Date()) {
          history.push({
            plantId: newPlant.id,
            timestamp: new Date(currentDate),
            type: 'WATER',
          });
          currentDate.setDate(currentDate.getDate() + plantData.wateringInterval + Math.floor(Math.random() * 3) - 1); // Add some randomness
        }
        await prisma.event.createMany({
          data: history,
        });

        // Recalculate plant state
        await recalculatePlantState(newPlant.id);
      }
    }
  }

  console.log('Seed data checked and created if necessary.');
}

async function recalculatePlantState(plantId) {
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    include: { room: { include: { user: true } }, events: { orderBy: { timestamp: 'asc' } }, archetype: true }
  });

  if (!plant) return;

  const settings = plant.room.user?.settings || { ema_alpha: 0.35, snooze_factor: 0.2 };
  const events = plant.events;

  let currentEma = plant.archetype.defaultInterval;
  let lastWateredDate = null;
  let nextCheckDate = new Date(plant.createdAt);

  for (const event of events) {
    const eventTime = new Date(event.timestamp);

    if (event.type === 'WATER') {
      if (!event.isAnomaly && lastWateredDate) {
        const observedInterval = (eventTime - lastWateredDate) / (1000 * 60 * 60 * 24);
        currentEma = (settings.ema_alpha * observedInterval) + ((1 - settings.ema_alpha) * currentEma);
      }
      lastWateredDate = eventTime;

      let interval = currentEma;
      if (event.soilCondition === 'DRY') {
        interval = interval * 0.8;
      }
      nextCheckDate = new Date(eventTime.getTime() + interval * 24 * 60 * 60 * 1000);
    } else if (event.type === 'SNOOZE') {
      const snoozeDays = event.snoozeExtraDays || Math.max(2, Math.floor(currentEma * settings.snooze_factor));
      nextCheckDate = new Date(eventTime.getTime() + snoozeDays * 24 * 60 * 60 * 1000);
    } else if (event.type === 'REPOT') {
      currentEma = plant.archetype.defaultInterval;
      nextCheckDate = eventTime;
    }
  }

  if (events.length === 0) {
    nextCheckDate = new Date();
  }

  return prisma.plant.update({
    where: { id: plantId },
    data: { currentEma, lastWateredDate, nextCheckDate }
  });
};


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
