const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Helper Functions ---

const recalculatePlantState = async (plantId) => {
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    include: { room: { include: { user: true } }, events: { orderBy: { timestamp: 'asc' } }, archetype: true }
  });

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
      
      // Calculate normal next check
      let interval = currentEma;
      
      // If soil was dry, reduce the next interval by 20% to check sooner
      if (event.soilCondition === 'DRY') {
        interval = interval * 0.8;
      }
      
      nextCheckDate = new Date(eventTime.getTime() + interval * 24 * 60 * 60 * 1000);
    } else if (event.type === 'SNOOZE') {
      // For snoozes, we just push the next check date from the timestamp of the snooze
      const snoozeDays = event.snoozeExtraDays || Math.max(2, Math.floor(currentEma * settings.snooze_factor));
      nextCheckDate = new Date(eventTime.getTime() + snoozeDays * 24 * 60 * 60 * 1000);
    } else if (event.type === 'REPOT') {
      currentEma = plant.archetype.defaultInterval;
      nextCheckDate = eventTime;
    }
  }

  // If no events, nextCheckDate stays at plant creation or now
  if (events.length === 0) {
    nextCheckDate = new Date();
  }

  return prisma.plant.update({
    where: { id: plantId },
    data: { currentEma, lastWateredDate, nextCheckDate }
  });
};

const getGraveyardRoom = async (userId) => {
  let user_id = userId;
  if (!user_id) {
    const user = await prisma.user.findFirst();
    user_id = user?.id;
  }
  return prisma.room.upsert({
    where: { id: `graveyard-${user_id}` }, // Fixed ID for graveyard per user
    update: {},
    create: {
      id: `graveyard-${user_id}`,
      name: 'Graveyard',
      userId: user_id,
      sortOrder: 999
    }
  });
};

// --- Routes ---

// Image Upload
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
}, (error, req, res, next) => {
  console.error('Multer error:', error);
  res.status(500).json({ error: error.message });
});

// Rooms
app.get('/api/rooms', async (req, res) => {
  const rooms = await prisma.room.findMany({
    include: { plants: { include: { archetype: true } } },
    orderBy: { sortOrder: 'asc' }
  });
  res.json(rooms);
});

app.post('/api/rooms', async (req, res) => {
  let { name, userId } = req.body;
  
  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) {
      userId = user.id;
    } else {
      // Create a default user if none exists
      const newUser = await prisma.user.create({
        data: {
          email: 'default@example.com',
          passwordHash: 'default',
          settings: { ema_alpha: 0.35, snooze_factor: 0.2 }
        }
      });
      userId = newUser.id;
    }
  }

  const room = await prisma.room.create({
    data: { name, userId }
  });
  res.json(room);
});

// Archetypes
app.get('/api/archetypes', async (req, res) => {
  const archetypes = await prisma.plantArchetype.findMany();
  res.json(archetypes);
});

// Plants
app.get('/api/plants/:id', async (req, res) => {
  const plant = await prisma.plant.findUnique({
    where: { id: req.params.id },
    include: { room: true, archetype: true, events: { orderBy: { timestamp: 'desc' } } }
  });
  res.json(plant);
});

app.post('/api/plants', async (req, res) => {
  const { name, roomId, archetypeId, imageUrl } = req.body;
  const archetype = await prisma.plantArchetype.findUnique({ where: { id: archetypeId } });
  
  const plant = await prisma.plant.create({
    data: {
      name,
      roomId,
      archetypeId,
      imageUrl,
      currentEma: archetype.defaultInterval,
      nextCheckDate: new Date()
    }
  });
  res.json(plant);
});

app.patch('/api/plants/:id', async (req, res) => {
  const { name, roomId, archetypeId, imageUrl, currentEma } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (roomId !== undefined) data.roomId = roomId;
  if (archetypeId !== undefined) data.archetypeId = archetypeId;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  
  if (currentEma !== undefined) {
    data.currentEma = parseFloat(currentEma);
    
    // If we manually adjust the EMA, we should also shift the nextCheckDate
    // based on the new EMA from the last watered date
    const plant = await prisma.plant.findUnique({ where: { id: req.params.id } });
    const lastWatered = plant.lastWateredDate ? new Date(plant.lastWateredDate) : new Date(plant.createdAt);
    data.nextCheckDate = new Date(lastWatered.getTime() + data.currentEma * 24 * 60 * 60 * 1000);
  }

  const plant = await prisma.plant.update({
    where: { id: req.params.id },
    include: { room: true, archetype: true },
    data
  });
  res.json(plant);
});

// Soft Delete (Move to Graveyard)
app.delete('/api/plants/:id', async (req, res) => {
  const plant = await prisma.plant.findUnique({
    where: { id: req.params.id },
    include: { room: true }
  });
  
  if (!plant) return res.status(404).send();
  
  const graveyard = await getGraveyardRoom(plant.room.userId);
  
  const updatedPlant = await prisma.plant.update({
    where: { id: req.params.id },
    data: { roomId: graveyard.id }
  });
  
  res.json(updatedPlant);
});

// Restore from Graveyard
app.post('/api/plants/:id/restore', async (req, res) => {
  const { roomId } = req.body; // User must pick a room to restore to
  const updatedPlant = await prisma.plant.update({
    where: { id: req.params.id },
    data: { roomId }
  });
  res.json(updatedPlant);
});

// Dashboard Triage View (Exclude Graveyard)
app.get('/api/dashboard', async (req, res) => {
  const rooms = await prisma.room.findMany({
    where: {
      NOT: { name: 'Graveyard' }
    },
    include: {
      plants: {
        include: { archetype: true },
        orderBy: { nextCheckDate: 'asc' }
      }
    },
    orderBy: { sortOrder: 'asc' }
  });
  res.json(rooms);
});

// Get Graveyard Plants
app.get('/api/graveyard', async (req, res) => {
  const user = await prisma.user.findFirst();
  if (!user) return res.json([]);
  
  const graveyard = await prisma.room.findFirst({
    where: { name: 'Graveyard', userId: user.id },
    include: { plants: { include: { archetype: true } } }
  });
  
  res.json(graveyard?.plants || []);
});

// Events & Logic
app.post('/api/plants/:id/event', async (req, res) => {
  const { type, isAnomaly, note, snoozeExtraDays, soilCondition } = req.body;
  const plantId = req.params.id;

  await prisma.event.create({
    data: { 
      plantId, 
      type, 
      isAnomaly: isAnomaly || false, 
      note,
      snoozeExtraDays: snoozeExtraDays ? parseInt(snoozeExtraDays) : null,
      soilCondition: soilCondition || null
    }
  });

  const updatedPlant = await recalculatePlantState(plantId);
  res.json({ plant: updatedPlant });
});

app.delete('/api/events/:id', async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).send();
  
  const plantId = event.plantId;
  await prisma.event.delete({ where: { id: req.params.id } });
  
  const updatedPlant = await recalculatePlantState(plantId);
  res.json(updatedPlant);
});

// Settings Update
app.patch('/api/user/settings', async (req, res) => {
  const { userId, settings } = req.body;
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { settings }
  });
  res.json(updatedUser);
});

// Room CRUD
app.patch('/api/rooms/:id', async (req, res) => {
  const { name, sortOrder } = req.body;
  const room = await prisma.room.update({
    where: { id: req.params.id },
    data: { name, sortOrder }
  });
  res.json(room);
});

app.delete('/api/rooms/:id', async (req, res) => {
  const roomId = req.params.id;
  
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { plants: true }
  });

  if (!room) return res.status(404).send();
  if (room.name === 'Graveyard') return res.status(400).json({ error: "Cannot delete the Graveyard" });
  if (room.name === 'Default' && room.plants.length > 0) {
    return res.status(400).json({ error: "Cannot delete the Default room while it has plants. Move them to another room first." });
  }

  if (room.plants.length > 0) {
    // Find or create a Default room only if there are plants to move
    let defaultRoom = await prisma.room.findFirst({
      where: { name: 'Default', userId: room.userId, NOT: { id: roomId } }
    });

    if (!defaultRoom) {
      defaultRoom = await prisma.room.create({
        data: {
          name: 'Default',
          userId: room.userId,
          sortOrder: 0
        }
      });
    }

    // Move plants to Default room
    await prisma.plant.updateMany({
      where: { roomId: roomId },
      data: { roomId: defaultRoom.id }
    });
  }

  await prisma.room.delete({ where: { id: roomId } });
  res.status(204).send();
});

// Plant History
app.get('/api/plants/:id/history', async (req, res) => {
  const events = await prisma.event.findMany({
    where: { plantId: req.params.id },
    orderBy: { timestamp: 'asc' }
  });
  res.json(events);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
