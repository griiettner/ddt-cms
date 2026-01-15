FROM node:22-slim

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Only copy package files first for caching
COPY package*.json ./

# Install dependencies including devDeps for Tailwind
RUN npm install

# Copy everything else
COPY . .

EXPOSE 3030

# Start dev server
CMD ["npm", "run", "dev"]
