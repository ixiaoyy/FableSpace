FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY apps/web/ ./

ARG VITE_MEDIA_BASE_URL=/game-media/v1
ARG VITE_FORUM_URL=https://pingxingxian.space
ENV VITE_MEDIA_BASE_URL=${VITE_MEDIA_BASE_URL}
ENV VITE_FORUM_URL=${VITE_FORUM_URL}

RUN npm run build

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS mirror-builder

WORKDIR /app

COPY apps/mirror-island/package.json apps/mirror-island/package-lock.json ./
RUN npm ci --ignore-scripts

COPY apps/mirror-island/ ./

ARG VITE_KEYCLOAK_URL=https://fable.pingxingxian.space/identity
ARG VITE_KEYCLOAK_REALM=mirror-island
ARG VITE_KEYCLOAK_CLIENT_ID=mirror-island-web
ARG VITE_MIRROR_BASE_PATH=/mirror-island/
ENV VITE_KEYCLOAK_URL=${VITE_KEYCLOAK_URL}
ENV VITE_KEYCLOAK_REALM=${VITE_KEYCLOAK_REALM}
ENV VITE_KEYCLOAK_CLIENT_ID=${VITE_KEYCLOAK_CLIENT_ID}
ENV VITE_MIRROR_BASE_PATH=${VITE_MIRROR_BASE_PATH}

RUN npm run build:mmorpg

FROM nginx:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build/client /usr/share/nginx/html
COPY --from=mirror-builder /app/dist/client /usr/share/nginx/html/mirror-island

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
