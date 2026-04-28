# Docker Deployment Configuration

## 目的

添加 Docker 和 docker-compose 配置，支持本地开发和生产部署。

## 当前状态

- 没有 Dockerfile
- 没有 docker-compose.yml
- 没有 .env.example

## 实现方案

### 1. Dockerfile (Multi-stage)

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy backend source
COPY backend/src/ ./src/
COPY frontend/dist/ ./dist/

# Environment
ENV PYTHONPATH=/app/src
ENV FABLEMAP_ENV=production

EXPOSE 8000
CMD ["uvicorn", "fablemap_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - FABLEMAP_ENV=development
      - DATABASE_URL=${DATABASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./backend/src:/app/src:ro
      - ./frontend/dist:/app/dist:ro
    depends_on:
      - redis

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 4. .env.example

```bash
# FableMap Environment Variables

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fablemap

# API Keys (optional for development)
OPENAI_API_KEY=
CLAUDE_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

# Redis
REDIS_URL=redis://localhost:6379

# Feature Flags
FABLEMAP_SEED_DEFAULT_TAVERNS=true
FABLEMAP_DEBUG=false

# Security
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000
```

### 5. Nginx 配置

```nginx
# frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 实现步骤

1. [ ] 创建 `backend/Dockerfile`
2. [ ] 创建 `frontend/Dockerfile`
3. [ ] 创建 `frontend/nginx.conf`
4. [ ] 创建 `docker-compose.yml`
5. [ ] 创建 `.env.example`
6. [ ] 创建 `.dockerignore` 文件
7. [ ] 测试 docker-compose up
8. [ ] 更新 README

## 验收标准

- [ ] `docker-compose up` 成功启动
- [ ] 前端可访问 localhost:3000
- [ ] API 可访问 localhost:8000
- [ ] 环境变量正确加载
- [ ] README 更新部署说明
