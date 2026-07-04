#define RXD2 16 
#define TXD2 17 

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("--- بدء فحص عقل الليدار المستقل ---");

  // تشغيل السيريال الثاني
  Serial2.begin(115200, SERIAL_8N1, RXD2, TXD2);
}

void loop() {
  // لو الليدار بعت أي إشارة حتى لو غلط هتنزل هنا
  if (Serial2.available()) {
    byte b = Serial2.read();
    Serial.print(b, HEX);
    Serial.print(" ");
  }
}