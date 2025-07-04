FROM alpine:latest AS build

RUN apk add --update hugo

WORKDIR /app
COPY . .

RUN hugo -s src

FROM nginx:1.29-alpine

WORKDIR /usr/share/nginx/html
COPY --from=build /app/release .

EXPOSE 80/tcp
