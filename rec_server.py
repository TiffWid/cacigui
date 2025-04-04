from flask import Flask, jsonify
from flask_cors import CORS
import subprocess
import threading
import os
import time
import requests
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# Paths and config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")
SUPABASE_TABLE = os.getenv("SUPABASE_TABLE", "messages")

PYTHON_EXE = "python3"  # Use "python" or full path if needed on Windows
PKT_RCV_SCRIPT = os.path.join("..", "CACI-GUI", "testin", "gr-control", "Receivers", "pkt_rcv.py")
STRIP_PREAMBLE_SCRIPT = os.path.join("..", "CACI-GUI", "testin", "gr-control", "Receivers", "strip_preamble.py")
TMP_OUTPUT = "output.tmp"
FINAL_OUTPUT = "output.txt"

# Upload to Supabase
def upload_to_supabase(message_text):
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
        print("✅ Uploaded to Supabase:", response.json())
    else:
        print("❌ Failed to upload:", response.status_code, response.text)

# Run strip_preamble.py and upload the result
def run_strip_script():
    try:
        result = subprocess.run(
            [PYTHON_EXE, STRIP_PREAMBLE_SCRIPT, TMP_OUTPUT, FINAL_OUTPUT],
            capture_output=True,
            text=True,
            check=True
        )
        print("✅ strip_preamble.py output:", result.stdout)

        if os.path.exists(FINAL_OUTPUT):
            with open(FINAL_OUTPUT, "r") as f:
                message = f.read().strip()
                if message:
                    upload_to_supabase(message)
                else:
                    print("⚠️ output.txt is empty")
        else:
            print("❌ output.txt not found")

    except subprocess.CalledProcessError as e:
        print("❌ strip_preamble.py error:", e.stderr)

# Monitor output.tmp for changes
def monitor_tmp_file(poll_interval=1):
    print("🔍 Monitoring output.tmp for changes...")
    last_mtime = None

    while True:
        if os.path.exists(TMP_OUTPUT):
            mtime = os.path.getmtime(TMP_OUTPUT)
            if last_mtime is None:
                last_mtime = mtime
            elif mtime != last_mtime:
                print("📄 Detected change in output.tmp")
                run_strip_script()
                last_mtime = mtime
        time.sleep(poll_interval)

# Optional: manual trigger for full process
@app.route("/run-receive-script", methods=["GET"])
def run_receive_script():
    try:
        subprocess.run(
            [PYTHON_EXE, "-u", PKT_RCV_SCRIPT],
            capture_output=True,
            text=True,
            check=True
        )
        print("✅ pkt_rcv.py executed")

        run_strip_script()

        if os.path.exists(FINAL_OUTPUT):
            with open(FINAL_OUTPUT, "r") as f:
                return jsonify({"message": "Success", "output": f.read().strip()})
        else:
            return jsonify({"error": "output.txt not found"}), 404

    except subprocess.CalledProcessError as e:
        return jsonify({"error": "Script execution failed", "details": e.stderr}), 500

# Start background thread to monitor output.tmp
def start_monitor_thread():
    thread = threading.Thread(target=monitor_tmp_file, daemon=True)
    thread.start()

start_monitor_thread()

if __name__ == "__main__":
    app.run(port=3006)

