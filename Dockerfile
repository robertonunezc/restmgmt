FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S restaurant -u 1001

# Change ownership of the app directory
RUN chown -R restaurant:nodejs /app
USER restaurant

EXPOSE 3000

CMD ["npm", "start"]