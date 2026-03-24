.PHONY: dev backend frontend install install-backend install-frontend

# Run both frontend and backend together
dev: backend frontend

# Start the Python backend (downloads models on first run)
backend:
	cd backend && uvicorn main:app --reload --port 8000

# Start the Vite dev server
frontend:
	npm run dev

# Install all dependencies
install: install-backend install-frontend

install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	npm install
