# คู่มือ Deploy TP-One

## ความต้องการของ Server

- Docker + Docker Compose
- RAM: 2GB ขึ้นไป
- Disk: 20GB ขึ้นไป

---

## ขั้นตอน Deploy ครั้งแรก

### 1. Clone โปรเจกต์

```bash
git clone <repo-url> tp-one
cd tp-one
```

### 2. สร้างไฟล์ .env

```bash
cp .env.example .env
```

แก้ไขค่าใน `.env` ให้ครบ:

```env
# Database — เปลี่ยน password ให้ปลอดภัย
DATABASE_URL=postgresql://tp_admin:CHANGE_PASSWORD@localhost:5432/tp_one

# JWT — ต้องเปลี่ยน secret ทุกครั้ง
JWT_SECRET=สร้าง-random-string-ที่นี่

# App URL
APP_URL=https://your-domain.ac.th
API_URL=https://your-domain.ac.th
```

สร้าง JWT_SECRET แบบ random:
```bash
openssl rand -hex 32
```

### 3. แก้ไข docker-compose.yml

เปลี่ยน password ใน `docker-compose.yml` ให้ตรงกับ `.env`:

```yaml
db:
  environment:
    POSTGRES_PASSWORD: CHANGE_PASSWORD  # ← ตรงกับ DATABASE_URL

server:
  environment:
    - DATABASE_URL=postgresql://tp_admin:CHANGE_PASSWORD@db:5432/tp_one
```

> **หมายเหตุ:** บน server จริงไม่ต้องเปิด port 5432/5433 ออก public — db service ใช้ internal network ของ Docker เท่านั้น ลบ `ports:` ของ db และ redis ออกได้

### 4. Build และ Start

```bash
docker compose up -d --build
```

### 5. รัน Migration

```bash
docker compose exec server bun run src/db/seed.ts
```

หรือถ้า migrate ก่อน seed:

```bash
# migration (ถ้ายังไม่เคยรัน)
docker compose exec server bun --env-file .env run /app/node_modules/.bin/drizzle-kit migrate

# seed ข้อมูลเริ่มต้น
docker compose exec server bun run src/db/seed.ts
```

### 6. ตรวจสอบ

```bash
docker compose ps          # ทุก service ต้อง healthy
curl http://localhost/api/health   # ควรได้ {"status":"ok",...}
```

---

## ตั้งค่า Nginx + HTTPS (แนะนำ)

ติดตั้ง Certbot บน host แล้วแก้ `nginx.conf` ให้รองรับ HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.ac.th;

    ssl_certificate     /etc/letsencrypt/live/your-domain.ac.th/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.ac.th/privkey.pem;

    # ... (เนื้อหา location เดิม)
}

server {
    listen 80;
    server_name your-domain.ac.th;
    return 301 https://$host$request_uri;
}
```

---

## อัปเดต (Deploy ครั้งถัดไป)

```bash
git pull

# Build image ใหม่และ restart
docker compose up -d --build server

# ถ้ามี migration ใหม่
docker compose exec server bun --env-file .env run /app/node_modules/.bin/drizzle-kit migrate
```

---

## Backup ฐานข้อมูล

### Backup

```bash
docker compose exec db pg_dump -U tp_admin tp_one > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
docker compose exec -T db psql -U tp_admin tp_one < backup_20260421.sql
```

แนะนำตั้ง cron backup อัตโนมัติทุกวัน:

```bash
# crontab -e
0 2 * * * cd /path/to/tp-one && docker compose exec -T db pg_dump -U tp_admin tp_one > /backups/tp_one_$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|--------|---------|
| `role "..." does not exist` | local postgres แย่ง port | ตรวจสอบ port ซ้ำ: `lsof -i :5432` |
| `database "..." does not exist` | DATABASE_URL ไม่มี username | ตรวจสอบ format `postgresql://user:pass@host:port/db` |
| Container unhealthy | DB ยังไม่พร้อม | รอสักครู่แล้ว `docker compose up -d` อีกครั้ง |
| 500 ตอน login | ยังไม่ได้ seed | รัน seed ตามขั้นตอนที่ 5 |

ดู log:
```bash
docker compose logs server -f      # server logs
docker compose logs db -f          # database logs
```
