# Imagen base oficial con Puppeteer preinstalado
FROM browserless/chrome:latest

# Crea y usa directorio de trabajo
WORKDIR /app

# Copia solo los archivos de dependencias
COPY package*.json ./

# Instala las dependencias, forzando a ignorar peleas de versiones y mostrando logs detallados
RUN npm install --legacy-peer-deps --loglevel=verbose --unsafe-perm=true

# Copia todo el resto del código
COPY . .

# Define el puerto que usará tu bot (Render lo mapea a uno público)
ENV PORT=4000
EXPOSE 4000

# Comando que arranca tu bot
CMD ["node", "bot.js"]
