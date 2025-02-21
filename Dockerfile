# Use Python 3.8 slim base image
FROM python:3.8-slim-buster

# Create non-root user first
RUN useradd -u 1000 -m truefa

# Set up directories with correct permissions
RUN mkdir -p /app/images /app/.truefa && \
    chown -R truefa:truefa /app && \
    chmod 755 /app && \
    chmod 755 /app/images && \
    chmod 700 /app/.truefa

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libzbar0 \
    zbar-tools \
    libjpeg62-turbo \
    gnupg2 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements as root for better security
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip cache purge

# Copy application code
COPY src/ ./src/

# Set ownership of all files
RUN chown -R truefa:truefa /app

# Switch to non-root user
USER truefa

# Set environment
ENV PYTHONUNBUFFERED=1 \
    QR_IMAGES_DIR=/app/images \
    TRUEFA_STORAGE_PATH=/app/.truefa \
    PYTHONDONTWRITEBYTECODE=1

CMD ["python", "src/truefa.py"] 