FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (ci is faster and uses lockfile exactly)
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 8010

# Start development server
CMD ["npm", "run", "dev"]
