# Imagen base oficial con Puppeteer preinstalado
FROM browserless/chrome:latest

# Crea y usa directorio de trabajo
WORKDIR /app

# Copia archivos del proyecto
COPY package*.json ./
RUN npm install --unsafe-perm=true

COPY . .

# Render usará esta variable para mapear el puerto
ENV PORT=4000
EXPOSE 4000

# Comando para correr tu bot
CMD ["node", "bot.js"]
