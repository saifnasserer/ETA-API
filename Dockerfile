# Build Stage
FROM node:20-alpine AS build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Runtime Stage
FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend code
COPY . .

# Copy built frontend from build stage
COPY --from=build /app/client/dist ./client/dist

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Command to run the application
CMD ["node", "server/index.js"]
