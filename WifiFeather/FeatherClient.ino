#include <SPI.h>
#include <WiFi101.h>
#define VBATPIN A7

const int analogP_in = A1; // Connect the output of the power detector to A0 (change if needed)
const int analogP_out = A3; // Connect the output of the power detector to A0 (change if needed)
const float slope = -0.025; // Slope in V/dBm for power detector
const float intercept = 1.03; // Intercept at 0 dBm for power detector

char ssid[] = "VT Open WiFi";  // Your WiFi SSID
char pass[] = "";  // Your WiFi password

int status = WL_IDLE_STATUS;
IPAddress server(3,22,66,215);
int serverPort = 5000;          // Must match the Python web server port

WiFiClient client;

void setup() {
  WiFi.setPins(8, 7, 4, 2);

  Serial.begin(115200);
  while (!Serial);

  // Check if the WiFi shield is present
  if (WiFi.status() == WL_NO_SHIELD) {
    Serial.println("WiFi shield not present");
    while (true);
  }

  // Connect to WiFi
  while (status != WL_CONNECTED) {
    Serial.print("Attempting to connect to SSID: ");
    Serial.println(ssid);
    status = WiFi.begin(ssid);
    delay(5000);
  }

  Serial.println("Connected to WiFi!");
  printWiFiStatus();

  // Display startup message
  Serial.println("RF Power Measurement Initialized");
}

void loop() {
  // Convert power in ADC to voltage
  float Pin_voltage = (analogRead(analogP_in) * 3.3) / 1024; 
  float Pout_voltage = (analogRead(analogP_out) * 3.3) / 1024; 
  float Vbat = (analogRead(VBATPIN) * 3.3 * 2) / 1024;
  
  // Convert power in voltage to power in dBm
  float power_in_dBm = ((Pin_voltage - intercept) / slope) + 18.5;
  float power_out_dBm = ((Pin_voltage - intercept) / slope) + 18.5;

  Serial.println("\nAttempting to connect to server...");

  if (client.connect(server, serverPort)) {
    Serial.println("Connected to server");

    String jsonData = "{\"RL1\":\"" + String(power_in_dBm) + "," + String(power_out_dBm) + "," + String(Vbat) + "\"}";
    
    // Send HTTP POST request
    client.println("POST /send HTTP/1.1");
    client.println("Host: 3.22.66.215");  // Replace with server's IP
    client.println("Content-Type: application/json");
    client.println("Content-Length: " + String(jsonData.length()));
    client.println();  // Blank line to end headers
    client.println(jsonData);
    delay(1000);

    Serial.println("Message sent!");

    // Wait for response
    while (client.available()) {
      char c = client.read();
      Serial.write(c);
    }

    Serial.println("\nClosing connection...");
    client.stop();
  } else {
    Serial.println("Connection failed!");
  }
  delay(4000);
}

void printWiFiStatus() {
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());

  IPAddress ip = WiFi.localIP();
  Serial.print("IP Address: ");
  Serial.println(ip);

  long rssi = WiFi.RSSI();
  Serial.print("Signal strength (RSSI): ");
  Serial.print(rssi);
  Serial.println(" dBm");
}
