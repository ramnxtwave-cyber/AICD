.PHONY: dev backend frontend install install-backend install-frontend download-data

# Run both frontend and backend together
dev: backend frontend

# Start the Python backend (downloads models on first run)
backend:
	cd backend && uvicorn main:app --reload --port 8000

# Start the Vite dev server
frontend:
	npm run dev

# Install all dependencies
install: install-backend install-frontend download-data

install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	npm install

# Download word frequency data for Tier 2 (610K words, ~13MB)
download-data:
	mkdir -p backend/data
	@if [ ! -f backend/data/wordsFreq.csv ]; then \
		echo "Downloading word frequency data…"; \
		curl -L -o backend/data/wordsFreq.csv \
			"https://raw.githubusercontent.com/harshnative/words-dataset/master/wordsFreq.csv"; \
	else \
		echo "Word frequency data already exists."; \
	fi
