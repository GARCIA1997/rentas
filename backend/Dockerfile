FROM node:20-alpine

WORKDIR /app

# Prisma's query engine needs OpenSSL on Alpine
RUN apk add --no-cache openssl

# Puppeteer's bundled Chromium download doesn't work reliably on Alpine;
# use the system package instead.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

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
