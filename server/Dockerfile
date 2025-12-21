FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Expose Fastify port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

CMD ["npm", "start"]
