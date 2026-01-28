# PlantWise Project Context

This document provides a summary of the PlantWise project, an intelligent plant watering tracker.

## Project Overview

PlantWise is a Progressive Web Application (PWA) designed to help users manage watering schedules for their indoor plants. It uses an adaptive learning algorithm based on an Irregular Exponential Moving Average (EMA) to predict the next optimal watering date for each plant, moving beyond rigid schedules to a more responsive system.

The application is architected as a full-stack monorepo with separate frontend and backend services, orchestrated by Docker Compose. **It is critical to note that the project is designed to be run within a Docker environment and not directly on the host machine.**

## Technology Stack

- **Containerization:** Docker & Docker Compose
- **Frontend:**
    - Framework: React (using Vite for bundling)
    - Styling: Tailwind CSS
    - UI Components: Radix UI, Lucide Icons
    - Charting: Recharts
- **Backend:**
    - Runtime: Node.js
    - Framework: Express.js
    - ORM: Prisma
- **Database:** PostgreSQL

## Core Functionality & Logic

- **Adaptive Algorithm:** The backend calculates the `nextCheckDate` for watering using an Irregular EMA. This adapts based on the actual intervals between waterings, and can be adjusted if the user reports the soil as "Too Dry", which shortens the next interval.
- **Triage Dashboard:** The main UI displays plants in two groups: "To Water" (plants due for watering today or overdue) and "Upcoming" (future waterings).
- **Smart Snooze:** Allows users to delay a watering check. The delay is calculated based on a percentage of the plant's current learned watering cycle.
- **Anomaly Handling:** Users can mark a watering as "Forgot/Late", which updates the last watered date without affecting the learned EMA, preventing single mistakes from skewing the schedule.
- **Data Persistence:**
    - Plant data, user settings, and event history are stored in a PostgreSQL database managed by Prisma.
    - Plant images are uploaded and stored in the `backend/uploads` directory, which is mounted as a Docker volume for persistence.
- **Graveyard:** A special "Room" that serves as a soft-delete location for plants, allowing them to be restored later.

## Project Structure

```
/
├── docker-compose.yml       # Defines the multi-container Docker setup
├── backend/
│   ├── Dockerfile           # Backend service container definition
│   ├── package.json         # Node.js dependencies (Express, Prisma)
│   ├── prisma/
│   │   └── schema.prisma    # Defines the database schema
│   └── src/index.js         # Main Express.js application entrypoint
└── frontend/
    ├── Dockerfile           # Frontend service container definition (serves with Nginx)
    ├── package.json         # React dependencies (React, Vite, Tailwind)
    ├── nginx.conf           # Nginx configuration for the frontend container
    └── src/
        ├── App.jsx          # Main React application component
        └── components/      # Reusable React components
```

## How to Run

The entire application is orchestrated using Docker Compose.

1.  Ensure Docker and Docker Compose are installed.
2.  Run the following command from the project root:
    ```bash
    docker-compose up --build -d
    ```
3.  The application will be accessible at `http://localhost:8288`.

The `docker-compose.yml` file defines three services:
-   `db`: The PostgreSQL database.
-   `backend`: The Node.js API server, accessible on the host at port `8289`.
-   `frontend`: The React application, served by Nginx and accessible on the host at port `8288`. Nginx also acts as a reverse proxy for API and image requests to the backend.
