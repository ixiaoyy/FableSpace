# syntax=docker/dockerfile:1

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/backend/src \
    FABLESPACE_OUTPUT_ROOT=/data \
    FABLESPACE_ENV=production

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/src ./backend/src
COPY tests/fixtures ./tests/fixtures

RUN useradd --create-home --shell /usr/sbin/nologin fablespace \
    && mkdir -p /data \
    && chown -R fablespace:fablespace /app /data

USER fablespace

EXPOSE 8000
VOLUME ["/data"]

CMD ["uvicorn", "fablespace_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
