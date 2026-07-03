# Image minimale pour héberger l'API gratuitement (Fly.io, Render, Railway, VPS…).
FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src

# Les données persistent dans /data (monter un volume pour les conserver).
ENV DB_PATH=/data/db.json
ENV PORT=8787
EXPOSE 8787

CMD ["node", "src/server.js"]
