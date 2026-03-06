# Node.js Express Backend Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production || npm ci --production

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Default command
CMD ["npm", "start"]
