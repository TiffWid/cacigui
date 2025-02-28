# SEND FEATHER
# last updated 2.28.25

import board
import digitalio
import keypad
import adafruit_rfm9x

import analogio # read analog input

led = digitalio.DigitalInOut(board.LED)
led.direction = digitalio.Direction.OUTPUT

# Set up button using keypad module.
button = keypad.Keys((board.BUTTON,), value_when_pressed=False)

# Define radio frequency in MHz. Must match your
# module. Can be a value like 915.0, 433.0, etc.
RADIO_FREQ_MHZ = 915.0

# Define Chip Select and Reset pins for the radio module.
CS = digitalio.DigitalInOut(board.RFM_CS)
RESET = digitalio.DigitalInOut(board.RFM_RST)

# Initialise RFM95 radio
rfm95 = adafruit_rfm9x.RFM9x(board.SPI(), CS, RESET, RADIO_FREQ_MHZ)

# Initialize the analog pin for power measurement
analogPin = analogio.AnalogIn(board.A0)

# Power detector parameters
SLOPE = -25.0  # mV/dBm
INTERCEPT = 0.6  # Intercept at 0 dBm

def read_power():
    """Reads voltage from the power detector and converts it to dBm."""
    rawADC = analogPin.value  # Get ADC value (16-bit)
    voltage = (rawADC * 3.3) / 65535  # Convert to voltage (Feather RP2040 ADC is 16-bit)
    power_dBm = (voltage - INTERCEPT) / SLOPE  # Convert to power in dBm
    return voltage, power_dBm

while True:
    button_press = button.events.get()
    if button_press:
        if button_press.pressed:
            led.value = True
            # Get power readings
            voltage, power_dBm = read_power()
            
            # Create message
            message = "Voltage: {:.3f}V, Power: {:.2f} dBm".format(voltage, power_dBm)
            
            # Send message over LoRa
            rfm95.send(bytes(message, "UTF-8"))
        elif button_press.released:  # Button is released
            led.value = False  # Turn LED off when button is released
