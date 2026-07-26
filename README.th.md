# homebridge-tuya-unified

ปลั๊กอิน [Homebridge](https://homebridge.io) แบบรวมสำหรับอุปกรณ์สมาร์ทโฮมของ Tuya สร้างบนสถาปัตยกรรม Cloud API + MQTT ของ [homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) ที่รองรับ Homebridge เวอร์ชันปัจจุบัน (v1.8 LTS และ v2) ส่วนช่องทางค้นหาอุปกรณ์ทางที่สอง (สำหรับอุปกรณ์ที่ Cloud API ทางการมองไม่เห็น) ยังอยู่ใน roadmap ยังไม่ได้สร้าง — ดู [สถานะโปรเจกต์](#สถานะโปรเจกต์)

> **ไฟล์นี้เป็นคำแปลภาษาไทย** ต้นฉบับที่เป็น source of truth ของคำอธิบายโปรเจกต์และวิธีติดตั้งคือ [README.md](./README.md) (ภาษาอังกฤษ) — หากเนื้อหาสองไฟล์นี้ขัดแย้งกัน ให้ยึดตาม README.md เป็นหลัก ส่วนความคืบหน้าของงานแบบ task-by-task ข้ามเซสชัน ดูที่ [NOTES.md](./NOTES.md) ซึ่งเป็นแหล่งอ้างอิงหลักที่อัปเดตต่อเนื่อง

> **สถานะ: เริ่มพัฒนา** เชื่อมต่อ Tuya Cloud authentication, ค้นหาอุปกรณ์ และ MQTT push ทำงานได้แล้ว แต่ยังไม่ลงทะเบียน HomeKit accessory ใดๆ ดูรายละเอียดที่หัวข้อ [สถานะโปรเจกต์](#สถานะโปรเจกต์) ด้านล่าง

## ทำไมถึงมีโปรเจกต์นี้

[homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) (0x5e) คือแกนหลักที่ยังพัฒนาต่อเนื่องอยู่ และเป็นฐานที่โปรเจกต์นี้สร้างต่อ — สถาปัตยกรรม Cloud API + MQTT push ถูกพอร์ตและตรวจสอบกับ source ต้นทางโดยตรงแล้ว ส่วนปลั๊กอินทางการ [tuya-homebridge](https://github.com/tuya/tuya-homebridge) ใช้แนวทางเดียวกันทางสถาปัตยกรรม แต่ ณ ปี 2026 ดูเหมือนถูก superseded ไปแล้ว — README ของมันเองระบุว่า 0x5e คือคนดูแลเวอร์ชันที่พัฒนาต่อเนื่องอยู่ และไม่มีการ push โค้ดมา 2 ปีแล้ว ให้เครดิตไว้ใน [NOTICE](./NOTICE) ด้วยเหตุผลทางประวัติศาสตร์ ไม่ใช่เพราะ copy โค้ดมา

ในทางปฏิบัติ Cloud API ทางการของ Tuya จะเห็นเฉพาะอุปกรณ์ที่ link เข้ากับ Tuya Cloud Project แล้วเท่านั้น — บาง setup จริงมีอุปกรณ์ที่ไม่เคย link และโผล่มาได้แค่ผ่าน "Web API" ที่ไม่เป็นทางการของ Tuya เท่านั้น (ตัวเดียวกับที่ Home Assistant's legacy Tuya integration และ [homebridge-tuya-web](https://github.com/milo526/homebridge-tuya-web) ใช้) การปิดช่องว่างนี้อยู่ใน roadmap แล้วแต่**ยังไม่ได้สร้าง** — ดู [สถานะโปรเจกต์](#สถานะโปรเจกต์) และ [NOTES.md](./NOTES.md) สำหรับสถานะการออกแบบตอนนี้

**ทั้งสองปลั๊กอินต้นทางไม่มีการควบคุมผ่าน Local LAN เลย** — แม้ชื่อแพ็กเกจจะสื่อถึง "local" ก็ตาม ตอนนี้ยังเป็นแค่ roadmap ยังไม่ใช่ฟีเจอร์ที่ใช้งานได้จริง ดู [NOTES.md](./NOTES.md) สำหรับสิ่งที่ตรวจสอบแล้วและเหตุผล

## ความต้องการของระบบ

- Homebridge `>=1.8.0` (v1.8 LTS หรือ v2)
- Node.js 18.20+, 20.18+ หรือ 22.10+
- Tuya IoT Platform Cloud Project ที่มีอยู่แล้ว ([iot.tuya.com](https://iot.tuya.com/)) (Access ID/Secret) ที่เชื่อมกับบัญชีแอป Tuya Smart / Smart Life ของคุณ — ใช้ credential ชุดเดียวกับที่ใช้กับปลั๊กอินด้านบนได้เลย

## การติดตั้ง

```
npm install -g homebridge-tuya-unified
```

จากนั้นตั้งค่า platform `TuyaUnified` ผ่าน Homebridge Config UI X หรือแก้ไข `config.json` ด้วยตนเอง — ดูตัวเลือกทั้งหมดได้ที่ [config.schema.json](./config.schema.json)

## อุปกรณ์ที่รองรับ

ดูที่ [SUPPORTED_DEVICES.md](./SUPPORTED_DEVICES.md)

## สถานะโปรเจกต์

รายละเอียดเต็มและ task checklist ที่อัปเดตต่อเนื่องอยู่ใน [NOTES.md](./NOTES.md) สรุปคร่าวๆ:

- **Scaffolding** — ตั้งค่า package/build/lint/CI, สัญญาอนุญาต MIT และไฟล์ [NOTICE](./NOTICE) ที่ให้เครดิต เสร็จแล้ว
- **Cloud/local core** — `TuyaOpenAPI` (signed REST client, login ทั้งแบบ Custom และ Smart Home project), `TuyaOpenMQ` (MQTT push) และ device layer (`TuyaDevice`/`TuyaDeviceManager`) พอร์ตมาจาก [homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) (0x5e) และตรวจสอบกับ source ต้นทางโดยตรงแล้ว `src/platform.ts` authenticate, เริ่ม MQTT, และดึง device/scene list ได้แล้ว เสร็จแล้ว — Cloud + MQTT เท่านั้น การควบคุมผ่าน Local LAN ไม่มีอยู่ในปลั๊กอินต้นทางทั้งสองตัว จึงยังเป็นแค่ roadmap (`options.enableLocal` ใน [config.schema.json](./config.schema.json) อธิบายฟีเจอร์ที่ยังไม่ได้สร้าง)
- **DP mapping + device services** — แปลง Tuya data point เป็น HomeKit characteristic และลงทะเบียน accessory จริงสำหรับหมวด MVP (`Switch`/`Outlet`, `Lightbulb`/`Dimmer`, `WindowCovering`/`GarageDoorOpener`) เสร็จแล้วและทดสอบกับอุปกรณ์จริงแล้ว หมวดอื่นนอกเหนือจากนี้จะได้ accessory เปล่า (แค่ข้อมูลอุปกรณ์) พร้อม warning ใน log แทนที่จะถูกข้ามไปเงียบๆ
- **ช่องทางค้นหาอุปกรณ์ทางที่สอง (Tuya Web API ไม่เป็นทางการ)** — ครอบคลุมอุปกรณ์ที่ไม่เคย link เข้า Tuya Cloud Project จึง Cloud API ทางการมองไม่เห็น ยังไม่เริ่ม — ยังไม่มี config หรือโค้ดใดๆ สำหรับส่วนนี้เลย ดู [NOTES.md](./NOTES.md) สำหรับสถานะการออกแบบ
- **Test** — ตั้งค่า Jest/ts-jest ไว้แล้ว แต่ยังไม่มีไฟล์ทดสอบ

ดู [NOTES.md](./NOTES.md) สำหรับ task checklist แบบเต็มและเหตุผลเบื้องหลังการตัดสินใจด้านสถาปัตยกรรมแต่ละข้อ

## เครดิต

- [homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) โดย 0x5e (MIT)
- [tuya-homebridge](https://github.com/tuya/tuya-homebridge) โดย Tuya Inc. (MIT)

## สัญญาอนุญาต

MIT © tomzt — ดู [LICENSE](./LICENSE) และ [NOTICE](./NOTICE)
