# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8182 STATIC_ROOT=/app/browser
COPY server.mjs ./
COPY --from=build /app/dist/json-transformer/browser ./browser
USER node
EXPOSE 8182
CMD ["node", "server.mjs"]
