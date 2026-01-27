# PlantWise - Intelligent Plant Tracker

A self-correcting plant care assistant that learns from your watering habits.

## Features
- **Smart Triage Dashboard**: Sorted by urgency.
- **Adaptive Prediction Engine**: Uses Irregular EMA to learn watering intervals.
- **Smart Snooze**: Automatically delays checks for wet plants.
- **Anomaly Handling**: Ignores user forgetfulness in calculations.
- **Mobile-First UI**: One-handed operation design.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Recharts.
- **Backend**: Node.js, Express, Prisma.
- **Database**: PostgreSQL.
- **Infrastructure**: Docker & Docker Compose.

## Setup & Run
1. Ensure you have Docker and Docker Compose installed.
2. Run `docker-compose up --build`.
3. Open `http://localhost:8288` in your browser.

## Algorithm Details
- **Watering**: `New_EMA = (α * observed) + ((1 - α) * current_EMA)`.
- **Snoozing**: `next_check = Now + MAX(2, FLOOR(EMA * snooze_factor))`.
- **Anomalies**: Logged as `is_anomaly=true` and excluded from EMA updates.
