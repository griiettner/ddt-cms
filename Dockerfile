FROM node:22-slim

# Install Playwright dependencies for Chromium (no build tools needed - using pure JS @libsql/client)
RUN apt-get update && apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpango-1.0-0 \
  libcairo2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Only copy package files first for caching
COPY package*.json ./

# Install dependencies including devDeps for Tailwind
RUN npm install

# Install Playwright browsers (chromium only to save space)
RUN npx playwright install chromium

# Copy everything else
COPY . .

EXPOSE 3030 5173

# Start dev server
CMD ["npm", "run", "dev"]
