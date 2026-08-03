FROM node:20-alpine

WORKDIR /app

# Prisma's query engine needs OpenSSL on Alpine
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and migrations
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY src ./src

EXPOSE 4000

CMD ["npm", "run", "dev"]
