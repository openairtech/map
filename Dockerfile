FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

ARG MAPBOX_TOKEN
ENV VITE_MAPBOX_TOKEN=$MAPBOX_TOKEN

COPY . .
RUN npm run build

FROM nginx:1.29-alpine

WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist .

EXPOSE 80/tcp
