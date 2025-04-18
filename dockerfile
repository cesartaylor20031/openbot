# Imagen base de Node
FROM node:18-slim

# Creamos carpeta de trabajo
WORKDIR /app

# Copiamos solo los package.json primero (para cachear instalación de dependencias)
COPY package*.json ./

# Instalamos dependencias (sin mamadas)
RUN npm install --legacy-peer-deps

# Copiamos TODO el código y la carpeta FIEL para la firma digital
COPY . .
COPY ./FIEL /fiel

# Variable de entorno y puerto
ENV PORT=4000
EXPOSE 4000

# Arrancamos el bot
CMD ["node", "bot.js"]
