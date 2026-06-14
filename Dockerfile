FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json .
RUN npm install

COPY server.js .
COPY db.js .
COPY routes/ routes/
COPY public/ public/

RUN mkdir -p data assets/video assets/pdf assets/images

EXPOSE 3000

CMD ["node", "server.js"]