from flask import Flask, jsonify
from flask_cors import CORS
import subprocess
import threading
import os
import time
import requests
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Server config
PORT = 3006

# Supabase config
SUPABASE_URL = os.getenv("https://anrdbdndxykqexfgrzjo.supabase.co")
SUPABASE_API_KEY = os.getenv("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucmRiZG5keHlrcWV4ZmdyempvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MTYyMzAsImV4cCI6MjA1Njk5MjIzMH0.VOnAog9yM0Gokc4WStxhXvwLAMIrsh7mxyZMg6ETNwkY")
SUPABASE_TABLE = os.getenv("rx_power", "messages")

# File & script paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON_EXE = r"C:\Users\Tiffa\radioconda\python.exe"
PKT_RCV_SCRIPT = os.path.join(BASE_DIR, "..", "CACI-GUI", "testin", "gr-control", "Receivers", "pkt_rcv.py")
STRIP_PREAMBLE_SCRIPT = os.path.join(BASE_DIR, "..", "CACI-GUI", "testin", "gr-control", "Receivers", "strip_preamble.py")
TMP_OUTPUT = os.path.join(BASE_DIR, "output.tmp")
FINAL_OUTPUT = os.path.join(BASE_DIR, "output.txt")

# Upload message to Supabase
def upload_to_supabase(message_text):
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        print("❌ Supabase credentials not set.")
        return

    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}"
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    payload = {
        "content": message_text
    }

    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 201:
        print("✅ Message uploaded to Supabase:", response.json())
    else:
        print("❌ Failed to upload to Supabase:", response.status_code, response.text)

# Runs the full pipeline: pkt_rcv.py → strip_preamble.py → upload
def run_receive_and_process():
    try:
        # Run the receiver
        rec_process = subprocess.run(
            [PYTHON_EXE, "-u", PKT_RCV_SCRIPT],
            capture_output=True,
            text=True,
            check=True
        )
        print("📡 pkt_rcv.py output:", rec_process.stdout)

        # Run the preamble stripper
        strip_process = subprocess.run(
            [PYTHON_EXE, STRIP_PREAMBLE_SCRIPT, TMP_OUTPUT, FINAL_OUTPUT],
            capture_output=True,
            text=True,
            check=True
        )
        print("🧹 strip_preamble.py output:", strip_process.stdout)

        # Upload result if file exists
        if os.path.exists(FINAL_OUTPUT):
            with open(FINAL_OUTPUT, "r") as f:
                message = f.read().strip()
                if message:
                    upload_to_supabase(message)
                else:
                    print("⚠️ output.txt is empty.")
        else:
            print("❌ output.txt not found.")

    except subprocess.CalledProcessError as e:
        print("❌ Error running script:", e.stderr)

# Background thread to run the receive script in a loop
def background_receive_loop():
    while True:
        run_receive_and_process()
        time.sleep(100000000 / 1000)  # Adjust interval as needed

# Start background thread
def start_background_thread():
    thread = threading.Thread(target=background_receive_loop, daemon=True)
    thread.start()

# Manual trigger endpoint
@app.route("/run-receive-script", methods=["GET"])
def run_receive_script_once():
    try:
        run_receive_and_process()

        if os.path.exists(FINAL_OUTPUT):
            with open(FINAL_OUTPUT, "r") as f:
                content = f.read().strip()
                return jsonify({
                    "message": "Script executed successfully",
                    "output": content
                })
        else:
            return jsonify({"error": "output.txt not found"}), 500

    except Exception as e:
        return jsonify({"error": "Unexpected error", "details": str(e)}), 500

# Start background receiver on launch
start_background_thread()

# Start Flask server
if __name__ == "__main__":
    app.run(port=PORT)
