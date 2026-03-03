FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/pyproject.toml apps/api/
COPY packages/ packages/

RUN pip install --no-cache-dir -e packages/scoring -e apps/api

COPY apps/api/ apps/api/

EXPOSE 8000

CMD ["uvicorn", "apps.api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
