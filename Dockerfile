# Dockerfile

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]