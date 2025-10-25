# syntax=docker/dockerfile:1.5
ARG NODE_VERSION=20.15.1

FROM node:${NODE_VERSION}-alpine AS build
ARG SERVICE_NAME
ARG SERVICE_DIR
WORKDIR /workspace

RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@10.19.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY services ./services

RUN pnpm install --filter ${SERVICE_NAME}...
RUN pnpm --filter ${SERVICE_NAME} build
RUN pnpm --filter ${SERVICE_NAME} deploy --prod --legacy /workspace/deploy

FROM node:${NODE_VERSION}-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /workspace/deploy/ ./

CMD ["node", "dist/index.js"]
