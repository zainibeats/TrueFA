# Use Python 3.8 slim base image
FROM python:3.8-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and cryptography
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a dedicated directory for QR code images with proper permissions
RUN mkdir -p /app/images && chmod 755 /app/images

# Create secure storage directory
RUN mkdir -p /app/.truefa && chmod 700 /app/.truefa

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV QR_IMAGES_DIR=/app/images
# Override the default storage path to use container path
ENV TRUEFA_STORAGE_PATH=/app/.truefa

# Set Python to not write bytecode files
ENV PYTHONDONTWRITEBYTECODE=1
# Set Python to unbuffer stdout and stderr
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["python", "src/truefa.py"] 