# Usa una imagen más robusta que ya trae Node y Puppeteer configurados
FROM node:18-slim

# Instala dependencias necesarias para Puppeteer (esenciales)
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Setea el directorio de trabajo
WORKDIR /app

# Copia package.json y lock
COPY package*.json ./

# Instala dependencias de Node sin lloriqueos
RUN npm install --legacy-peer-deps --unsafe-perm=true

# Copia todo lo demás
COPY . .

# Expone el puerto que usarás
ENV PORT=4000
EXPOSE 4000

# Comando final
CMD ["node", "bot.js"]
