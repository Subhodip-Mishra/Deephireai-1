# Use official Python image for backend
FROM python:latest

# Install Node.js (for frontend) and other dependencies
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

# Set working directory
WORKDIR /app

# Copy backend and frontend code
COPY backend ./backend
COPY frontend ./frontend

# Install Python dependencies
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

# Install frontend dependencies
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

# Install concurrently globally to run backend and frontend together
RUN npm install -g concurrently

# Expose FastAPI and Next.js ports
EXPOSE 8000 3000

# Run backend and frontend concurrently
CMD ["bash", "-c", "concurrently \"uvicorn backend.app.main:app --host 0.0.0.0 --port 8000\" \"npm run dev\" -k"]
