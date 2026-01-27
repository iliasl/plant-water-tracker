#!/bin/sh
mkdir -p uploads
chmod 777 uploads
npx prisma db push
npx prisma db seed
npm start
