FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY node_modules ./node_modules
COPY server.js .
EXPOSE 4001
CMD ["node", "server.js"]