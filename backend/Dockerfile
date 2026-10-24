FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Create uploads directory
RUN mkdir -p uploads && chown -R node:node uploads

USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
