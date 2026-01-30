const express = require('express');
const cors = require('cors');
const morgan = 'morgan';
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

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
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Auth Routes ---

app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    // Create a Graveyard room for the new user
    await getGraveyardRoom(user.id);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Auth Middleware ---
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, async (err, payload) => {
    if (err) {
      return res.sendStatus(403);
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        return res.sendStatus(404);
      }
      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.sendStatus(500);
    }
  });
};


// --- Helper Functions ---

const recalculatePlantState = async (plantId) => {
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    include: { room: { include: { user: true } }, events: { orderBy: { timestamp: 'asc' } }, archetype: true }
  });

  const defaults = { ema_alpha: 0.35, snooze_factor: 0.2 };
  const settings = { ...defaults, ...(plant.room?.user?.settings || {}) };
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
app.get('/api/rooms', authenticateToken, async (req, res) => {
  const rooms = await prisma.room.findMany({
    where: { userId: req.user.id },
    include: { plants: { include: { archetype: true } } },
    orderBy: { sortOrder: 'asc' }
  });
  res.json(rooms);
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
  const { name } = req.body;
  const room = await prisma.room.create({
    data: { name, userId: req.user.id }
  });
  res.json(room);
});

// Archetypes
app.get('/api/archetypes', async (req, res) => {
  const archetypes = await prisma.plantArchetype.findMany();
  res.json(archetypes);
});

// Plants
app.get('/api/plants/:id', authenticateToken, async (req, res) => {
  const plant = await prisma.plant.findFirst({
    where: { 
      id: req.params.id,
      room: { userId: req.user.id }
    },
    include: { room: true, archetype: true, events: { orderBy: { timestamp: 'desc' } } }
  });

  if (!plant) {
    return res.status(404).json({ error: 'Plant not found' });
  }

  res.json(plant);
});

app.post('/api/plants', authenticateToken, async (req, res) => {
  const { name, roomId, archetypeId, imageUrl, waterAmount } = req.body;
  const archetype = await prisma.plantArchetype.findUnique({ where: { id: archetypeId } });
  
  // Verify the room belongs to the user
  const room = await prisma.room.findFirst({
    where: { id: roomId, userId: req.user.id }
  });

  if (!room) {
    return res.status(403).json({ error: 'Room not found or access denied' });
  }

  const plant = await prisma.plant.create({
    data: {
      name,
      roomId,
      archetypeId,
      imageUrl,
      waterAmount: waterAmount ? parseFloat(waterAmount) : null,
      currentEma: archetype.defaultInterval,
      nextCheckDate: new Date()
    }
  });
  res.json(plant);
});

app.patch('/api/plants/:id', authenticateToken, async (req, res) => {
  const { name, roomId, archetypeId, imageUrl, currentEma, waterAmount } = req.body;
  
  const plantToUpdate = await prisma.plant.findFirst({
    where: { id: req.params.id, room: { userId: req.user.id } }
  });

  if (!plantToUpdate) {
    return res.status(404).json({ error: 'Plant not found' });
  }

  // If moving to a new room, verify it belongs to the user
  if (roomId && roomId !== plantToUpdate.roomId) {
    const newRoom = await prisma.room.findFirst({
      where: { id: roomId, userId: req.user.id }
    });
    if (!newRoom) {
      return res.status(403).json({ error: 'Target room not found or access denied' });
    }
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (roomId !== undefined) data.roomId = roomId;
  if (archetypeId !== undefined) data.archetypeId = archetypeId;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (waterAmount !== undefined) data.waterAmount = waterAmount ? parseFloat(waterAmount) : null;
  
  if (currentEma !== undefined) {
    data.currentEma = parseFloat(currentEma);
    const lastWatered = plantToUpdate.lastWateredDate ? new Date(plantToUpdate.lastWateredDate) : new Date(plantToUpdate.createdAt);
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
app.delete('/api/plants/:id', authenticateToken, async (req, res) => {
  const plant = await prisma.plant.findFirst({
    where: { 
      id: req.params.id,
      room: { userId: req.user.id }
     }
  });
  
  if (!plant) return res.status(404).send();
  
  const graveyard = await getGraveyardRoom(req.user.id);
  
  const updatedPlant = await prisma.plant.update({
    where: { id: req.params.id },
    data: { roomId: graveyard.id }
  });
  
  res.json(updatedPlant);
});

// Restore from Graveyard
app.post('/api/plants/:id/restore', authenticateToken, async (req, res) => {
  const { roomId } = req.body;

  // Verify plant is in graveyard and belongs to user
  const plantToRestore = await prisma.plant.findFirst({
    where: {
      id: req.params.id,
      room: {
        userId: req.user.id,
        name: 'Graveyard'
      }
    }
  });

  if (!plantToRestore) {
    return res.status(404).json({ error: 'Plant not found in Graveyard' });
  }

  // Verify the target room belongs to the user
  const targetRoom = await prisma.room.findFirst({
    where: { id: roomId, userId: req.user.id }
  });

  if (!targetRoom || targetRoom.name === 'Graveyard') {
    return res.status(400).json({ error: 'Invalid restore location' });
  }
  
  const updatedPlant = await prisma.plant.update({
    where: { id: req.params.id },
    data: { roomId }
  });
  res.json(updatedPlant);
});

// Dashboard Triage View (Exclude Graveyard)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  const rooms = await prisma.room.findMany({
    where: {
      userId: req.user.id,
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
app.get('/api/graveyard', authenticateToken, async (req, res) => {
  const graveyard = await prisma.room.findFirst({
    where: { name: 'Graveyard', userId: req.user.id },
    include: { plants: { include: { archetype: true } } }
  });
  
  res.json(graveyard?.plants || []);
});

// Events & Logic
app.post('/api/plants/:id/event', authenticateToken, async (req, res) => {
  const { type, isAnomaly, note, snoozeExtraDays, soilCondition } = req.body;
  const plantId = req.params.id;

  const plant = await prisma.plant.findFirst({
    where: { id: plantId, room: { userId: req.user.id } }
  });

  if (!plant) {
    return res.status(404).json({ error: 'Plant not found' });
  }

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

app.delete('/api/events/:id', authenticateToken, async (req, res) => {
  const event = await prisma.event.findFirst({
    where: { 
      id: req.params.id,
      plant: { room: { userId: req.user.id } }
    }
  });

  if (!event) return res.status(404).send();
  
  const plantId = event.plantId;
  await prisma.event.delete({ where: { id: req.params.id } });
  
  const updatedPlant = await recalculatePlantState(plantId);
  res.json(updatedPlant);
});

app.get('/api/user', authenticateToken, async (req, res) => {
  res.json({ email: req.user.email, settings: req.user.settings });
});

app.post('/api/user/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = req.user;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old and new passwords are required' });
  }

  try {
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Settings Update
app.patch('/api/user/settings', authenticateToken, async (req, res) => {
  const { settings } = req.body;
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: { settings }
  });
  res.json(updatedUser);
});

// Room CRUD
app.patch('/api/rooms/:id', authenticateToken, async (req, res) => {
  const { name, sortOrder } = req.body;

  const roomToUpdate = await prisma.room.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!roomToUpdate) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const room = await prisma.room.update({
    where: { id: req.params.id },
    data: { name, sortOrder }
  });
  res.json(room);
});

app.delete('/api/rooms/:id', authenticateToken, async (req, res) => {
  const roomId = req.params.id;
  
  const room = await prisma.room.findFirst({
    where: { id: roomId, userId: req.user.id },
    include: { plants: true }
  });

  if (!room) return res.status(404).send();
  if (room.name === 'Graveyard') return res.status(400).json({ error: "Cannot delete the Graveyard" });
  
  // Find or create a Default room to move plants if necessary
  if (room.plants.length > 0) {
    let defaultRoom = await prisma.room.findFirst({
      where: { name: 'Default', userId: req.user.id }
    });

    if (!defaultRoom) {
      defaultRoom = await prisma.room.create({
        data: { name: 'Default', userId: req.user.id, sortOrder: 0 }
      });
    }

    await prisma.plant.updateMany({
      where: { roomId: roomId },
      data: { roomId: defaultRoom.id }
    });
  }

  await prisma.room.delete({ where: { id: roomId } });
  res.status(204).send();
});

// Plant History
app.get('/api/plants/:id/history', authenticateToken, async (req, res) => {
  const plant = await prisma.plant.findFirst({
    where: { id: req.params.id, room: { userId: req.user.id } }
  });

  if (!plant) {
    return res.status(404).json({ error: 'Plant not found' });
  }

  const events = await prisma.event.findMany({
    where: { plantId: req.params.id },
    orderBy: { timestamp: 'asc' }
  });
  res.json(events);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
