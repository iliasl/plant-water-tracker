# Project Overview: PlantWise - Intelligent Plant Watering Tracker

PlantWise is a mobile-first Progressive Web Application (PWA) designed to manage indoor plant watering using an adaptive learning algorithm. It prioritizes plants based on urgency rather than strict calendars.

## 1. Core Intelligence: The "Brain"
The system uses an **Irregular Exponential Moving Average (EMA)** to predict the next watering date.
- **Watering Event**: `New_EMA = (α * observed_interval) + ((1 - α) * current_EMA)`.
- **Soil Feedback**:
    - `Normal`: Uses calculated EMA for next date.
    - `Too Dry`: Reduces the next interval by **20%** to adjust to seasonal shifts or growth spurts.
- **Smart Snooze**: Calculates a delay based on a `snooze_factor` (default 20% of cycle, min 2 days). Supports manual +/- day adjustments via an inline popup.
- **Anomaly Handling**: Users can mark a watering as "Forgot/Late." The `last_watered_date` updates, but the `current_EMA` (the learned "brain") remains untouched.
- **State Recalculation**: Deleting any historical event triggers a full re-simulation of the plant's history to ensure the current EMA and next check date are perfectly accurate.

## 2. Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons.
- **Visualization**: Recharts (showing watering intervals + learned EMA as a reference line).
- **Backend**: Node.js (Express), Prisma ORM.
- **Database**: PostgreSQL 15.
- **Infrastructure**: Docker Compose (multistage builds), Nginx reverse proxy.

## 3. Database Schema Highlights
- **User**: Stores algorithm weights (`alpha`, `snooze_factor`).
- **Room**: Logical grouping. Includes a protected "Graveyard" room for soft-deleted plants.
- **Plant**: Stores `currentEma`, `lastWateredDate`, `nextCheckDate`, `imageUrl`, and `waterAmount`.
- **PlantArchetype**: Seed data for initial intervals (Fern, Succulent, etc.).
- **Event**: History log. Fields: `type` (WATER, SNOOZE, REPOT, etc.), `isAnomaly`, `soilCondition`, `snoozeExtraDays`.

## 4. Main Components & UI Logic
- **Triage Dashboard (`App.jsx`)**:
    - **To Water**: Grouped by Room. Plants due today or overdue.
    - **Upcoming**: Flat list sorted by time. Future check-ins.
- **Plant Card**: Large vertically centered photos, quick-action buttons (Water/Snooze), and high-level stats including the required water amount.
- **Details View (`PlantDetails.jsx`)**:
    - Header with photo, name, room, and archetype.
    - Stats grid: Current learned schedule and days since last watered.
    - **Interactive Chart**: Intervals over time vs. current EMA dotted line.
    - **Event Log**: Historical list with delete capability for corrections.
    - The ability to edit the plant's details, including the water amount, via the `PlantModal`.
- **Settings**: Algorithm tuning (sliders), room management (delete empty/move plants to Default), and access to the Plant Graveyard.

## 5. Deployment Context
The app is designed to run in a Docker environment (specifically optimized for Proxmox LXC/VM).
- **Port Mapping**: Frontend (8288), Backend API (8289).
- **Persistence**: Photos are stored in `./backend/uploads` and mounted as a Docker volume.
- **Nginx Config**: Handles `/api` and `/uploads` proxying and limits client body size to 20MB for mobile photo uploads.

## 6. Development Workflow
To sync changes from development to production:
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' ~/plant_tracker_project root@192.168.10.205:/root/
ssh root@<IP> 'cd ~/plant_tracker_project && docker compose up --build -d'
```
