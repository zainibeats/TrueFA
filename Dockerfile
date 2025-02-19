# Use Python 3.8 slim base image
FROM python:3.8-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create a dedicated directory for QR code images with proper permissions
RUN mkdir -p /app/images && chmod 755 /app/images

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and images directory
COPY src/ ./src/
COPY images/ ./images/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV QR_IMAGES_DIR=/app/images

# Run the application
CMD ["python", "src/truefa.py"] 