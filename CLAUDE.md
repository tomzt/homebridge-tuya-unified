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
- dev sandbox: container `homebridge-dev`, UI `http://172.25.50.65:8582`
- compose: `~/hb-dev/docker-compose.yml`
  - `~/hb-dev/storage` → `/homebridge`
  - `~/hb-dev/plugin` → `/plugin`
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
