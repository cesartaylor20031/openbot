# Usa una imagen oficial de Node 18 como base
FROM node:18

# Instala dependencias necesarias para Puppeteer/Chromium
RUN apt-get update \
  && apt-get install -y wget gnupg \
  && apt-get install -y chromium

# Crea directorio de la app
WORKDIR /usr/src/app

# Copia package.json y package-lock.json (si lo tienes)
COPY package*.json ./

# Instala dependencias, forzando Puppeteer a no saltarse Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
RUN npm install

# Copia el resto del código
COPY . .

# Expone el puerto que uses (Render asigna la variable $PORT)
ENV PORT=4000
EXPOSE 4000

# Arranca la app
CMD ["npm", "start"]
