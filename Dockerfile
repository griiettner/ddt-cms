# Development Dockerfile with hot reload
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including devDependencies for nodemon)
RUN npm install

# Copy application code
# Note: In development, these will be overridden by volume mounts
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Start with nodemon for hot reload
CMD ["npm", "run", "dev"]
