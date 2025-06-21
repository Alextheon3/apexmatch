# backend/Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies and create user in single layer
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash app

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/home/app/.local/bin:$PATH"

# Copy requirements file and change ownership
COPY requirements.txt .
RUN chown app:app requirements.txt

# Switch to non-root user for dependency installation
USER app

# Install Python dependencies to user directory
RUN pip install --user --no-cache-dir -r requirements.txt

# Copy application code (as app user to avoid permission issues)
COPY --chown=app:app . .

# Expose port
EXPOSE 8000

# Health check - fixed to work with non-root user
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]