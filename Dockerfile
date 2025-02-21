FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libzbar0 \
    gnupg2 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash truefa
USER truefa
WORKDIR /home/truefa/app

# Copy application files
COPY --chown=truefa:truefa . .

# Create necessary directories
RUN mkdir -p images .truefa/exports

# Create README.md if it doesn't exist
RUN if [ ! -f README.md ]; then echo "# TrueFA\n\nA secure two-factor authentication code generator." > README.md; fi

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -e .

# Make start script executable
RUN chmod +x start.sh

# Set environment variables
ENV QR_IMAGES_DIR=/home/truefa/app/images \
    HOME=/home/truefa \
    PYTHONPATH=/home/truefa/app \
    PYTHONUNBUFFERED=1 \
    TERM=xterm-256color

# Use our start script
ENTRYPOINT ["./start.sh"] 