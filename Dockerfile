# Use Playwright's official image - has Node.js 22 + all browser dependencies pre-installed
FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /app

# Only copy package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy everything else
COPY . .

EXPOSE 3030 5173

# Start dev server
CMD ["npm", "run", "dev"]
