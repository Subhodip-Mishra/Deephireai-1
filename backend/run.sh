venv\Scripts\activate

uvicorn app.main:app --reload

docker compose -f .\docker-compose.yml up
