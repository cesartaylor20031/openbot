# Usa una imagen base liviana compatible con Puppeteer
FROM node:18-slim

# Instala dependencias necesarias para Puppeteer y Chromium
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
    chromium \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Establece variable para que Puppeteer use el Chrome instalado
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Crea directorio de trabajo
WORKDIR /usr/src/app

# Copia los archivos del proyecto
COPY package*.json ./
RUN npm install

COPY . .

# Render usará esta variable para mapear el puerto
ENV PORT=4000
EXPOSE 4000

# Comando de inicio
CMD ["node", "bot.js"]
