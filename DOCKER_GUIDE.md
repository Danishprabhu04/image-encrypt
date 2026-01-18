# DNA Chaos Encryption - Docker Guide

## 🐳 Running with Docker

### Option 1: Using Docker Compose (Recommended)

Build and start all services:
```powershell
docker-compose up --build
```

Start in detached mode:
```powershell
docker-compose up -d
```

Stop services:
```powershell
docker-compose down
```

View logs:
```powershell
docker-compose logs -f
```

### Option 2: Build Individual Images

**Backend:**
```powershell
cd backend
docker build -t dna-encryption-backend .
docker run -p 8000:8000 dna-encryption-backend
```

**Frontend:**
```powershell
cd frontend
docker build -t dna-encryption-frontend .
docker run -p 80:80 dna-encryption-frontend
```

### Option 3: Production Build (Both Services)

```powershell
# Build both images
docker-compose build

# Start services
docker-compose up -d

# Access application at http://localhost
```

## 📋 Useful Commands

Check running containers:
```powershell
docker-compose ps
```

View backend logs:
```powershell
docker-compose logs backend
```

View frontend logs:
```powershell
docker-compose logs frontend
```

Restart services:
```powershell
docker-compose restart
```

Remove everything (including volumes):
```powershell
docker-compose down -v
```

## 🔍 Troubleshooting

**Port already in use?**
```powershell
# Stop existing containers
docker-compose down

# Or change ports in docker-compose.yml
```

**Images not updating?**
```powershell
# Rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

**Permission issues?**
```powershell
# Run as administrator or check Docker Desktop is running
```
