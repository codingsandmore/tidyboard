# SPDX-License-Identifier: AGPL-3.0-or-later
# Tidyboard recipe scraper service
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed by lxml / beautifulsoup4
RUN apt-get update && apt-get install -y --no-install-recommends \
        libxml2 \
        libxslt1.1 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install frozen dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY src/ ./src/

# Set PYTHONPATH so the package is importable without pip install -e
ENV PYTHONPATH=/app/src

# Non-root user for security
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

EXPOSE 8002

# Health check — matches the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/health')"

CMD ["uvicorn", "recipe_scraper.main:app", "--host", "0.0.0.0", "--port", "8002"]
