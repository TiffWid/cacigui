# RECIEVER FEATHER
# Updated 2.28.2025

import board
import digitalio
import adafruit_rfm9x

# Define LED for feedback
led = digitalio.DigitalInOut(board.LED)
led.direction = digitalio.Direction.OUTPUT

# Define radio frequency in MHz. Must match the sender!
RADIO_FREQ_MHZ = 915.0

# Define Chip Select and Reset pins for the radio module.
CS = digitalio.DigitalInOut(board.RFM_CS)
RESET = digitalio.DigitalInOut(board.RFM_RST)

# Initialise RFM95 radio
rfm95 = adafruit_rfm9x.RFM9x(board.SPI(), CS, RESET, RADIO_FREQ_MHZ)

print("LoRa Receiver Ready")

while True:
    packet = rfm95.receive()  # Wait for a packet
    
    if packet is not None:
        message = packet.decode("utf-8")  # Decode the message
        print(f"Received: {message}")  # Print it to the serial monitor
        
        # Blink LED to show reception
        led.value = True  
