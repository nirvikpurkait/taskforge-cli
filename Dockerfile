FROM node:22.21.1-alpine3.23

RUN apk update && apk add --no-cache git

RUN npm i -g pnpm