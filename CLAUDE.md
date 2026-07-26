# Homebridge Tuya Plugin

## Dev loop
เขียนโค้ดบน MacBook → push → deploy ไป Mac mini → อ่าน log

```bash
git push
ssh mini "~/hb-dev/deploy.sh"
ssh mini "docker logs --tail 60 homebridge-dev"
```

## เครื่องทดสอบ (Mac mini)
- macOS Catalina 10.15, Node 20.20.2, Docker 20.10.21
- SSH alias: `mini`
- dev sandbox: container `homebridge-dev` (image `homebridge/homebridge:latest`, ตอนที่ verify คือ Homebridge v2.2.1 / Ubuntu 24.04 base, release 2026-07-20), UI `http://172.25.50.65:8582`
- compose: `~/hb-dev/docker-compose.yml`
  - `~/hb-dev/storage` → `/homebridge`
  - `~/hb-dev/plugin` → `/plugin`
- ⚠️ **`/homebridge` ไม่ใช่ storage path จริงที่ Homebridge ใช้ในรุ่นนี้** — Homebridge อ่าน config/plugin จาก `/var/lib/homebridge` (`readlink -f /homebridge` ยืนยันแล้วว่าไม่ใช่ symlink เชื่อมกัน คนละที่กันจริง) และ `/var/lib/homebridge` **ไม่ได้ bind mount จาก host เลย** (`mount` ใน container ไม่มี entry นี้) → อยู่ได้แค่ตอน `docker restart` เท่านั้น ถ้า `docker compose down && up` หรือ `docker rm` container นี้ config/plugin ที่ไม่ได้ประกาศผ่าน `package.json` จะหายหมด (verified 2026-07-26)
- **วิธีติดตั้งปลั๊กอินที่ใช้งานได้จริง**: ต้อง `docker exec homebridge-dev sh -c "cd /var/lib/homebridge && npm install /plugin --save"` (ประกาศเป็น dependency ใน `package.json`) — ห้ามใช้ `ln -sfn` ธรรมดาเข้า node_modules เพราะ container มี startup step ที่รัน `npm install` แบบ prune ทุกครั้งที่ boot จะลบ symlink ที่ไม่ได้ประกาศไว้ทิ้งทันที (`~/hb-dev/deploy.sh` ใช้วิธีนี้อยู่แล้ว)
- รัน npm / build **ข้างใน container** เสมอ (Node ใหม่กว่า host)

## ⛔ ห้ามแตะ production
Mac mini มี Homebridge ตัวจริงรันคู่กันอยู่ pair กับ HomeKit จริง ถ้าพังต้อง re-pair ใหม่หมด
- ห้ามแก้ `~/.homebridge`
- ห้าม stop/restart service `com.homebridge.server`
- ห้ามยุ่งกับพอร์ต 8581

## ข้อจำกัดของ container (ไม่ใช่บั๊ก อย่าพยายามแก้)
Docker บน macOS รันใน Linux VM ที่ถูก NAT:
- ❌ mDNS/Bonjour ออก LAN ไม่ได้ → Home.app จะไม่เห็น dev instance
- ❌ UDP broadcast discovery ของ Tuya (6666/6667) ใช้ไม่ได้
- ✅ outbound TCP ไป `<device-ip>:6668` ใช้ได้
- ✅ Tuya Cloud API ใช้ได้

→ เวลาเทส ระบุ device IP + local key ตรง ๆ ใน config อย่าพึ่ง auto-discovery

## กติกา
- ก่อนรันคำสั่งที่แก้/ลบไฟล์บน Mac mini ให้บอกก่อน
- เจอ error ให้เอา log มาให้ดูก่อน อย่าเดาแล้วแก้
