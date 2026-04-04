FROM node:22-alpine AS runtime

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY onec-configs.example.yml ./onec-configs.example.yml

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
