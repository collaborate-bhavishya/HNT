FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port (Cloud providers like Render will assign a dynamic PORT)
EXPOSE 3000

# Start command
CMD ["npm", "run", "start:prod"]