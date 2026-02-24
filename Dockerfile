FROM node:20-slim

WORKDIR /app

# 1. Dependencias
COPY package*.json ./
RUN npm install

# 2. Código y Build
COPY . .
# Creamos el build de producción en la imagen
RUN npm run build

# 3. Ejecución
EXPOSE 3000
# CAMBIO CLAVE: Por defecto, esta imagen corre en modo PROD.
# El docker-compose.override.yml cambiará esto a "npm run dev"
CMD ["npm", "run", "start"]