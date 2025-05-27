FROM python:latest

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl gnupg portaudio19-dev build-essential && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

WORKDIR /app

COPY backend ./backend
COPY frontend ./frontend
COPY requirements.txt ./

RUN pip install -r requirements.txt

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

RUN npm install -g concurrently

EXPOSE 8000 3000

CMD ["bash", "-c", "concurrently \"uvicorn backend.app.main:app --host 0.0.0.0 --port 8000\" \"npm run dev --prefix frontend\" -k"]
