FROM node:20-slim

# Install openssl and clean up to save space
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create uploads dir inside the workdir
RUN mkdir -p uploads && chmod 777 uploads

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

RUN chmod +x start.sh

EXPOSE 3001

CMD ["./start.sh"]
