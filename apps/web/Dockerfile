# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY apps/web/ ./

ARG VITE_API_BASE=
ARG VITE_AMAP_KEY=
ARG VITE_AMAP_SECURITY_CODE=
ARG VITE_MEDIA_BASE_URL=https://img.pingxingxian.space/fablespace/media/v1
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_AMAP_KEY=${VITE_AMAP_KEY}
ENV VITE_AMAP_SECURITY_CODE=${VITE_AMAP_SECURITY_CODE}
ENV VITE_MEDIA_BASE_URL=${VITE_MEDIA_BASE_URL}

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build/client /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
