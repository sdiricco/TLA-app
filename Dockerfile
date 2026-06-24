FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate --schema server/prisma/schema.prisma

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "run", "start:server"]
