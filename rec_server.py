from flask import Flask, jsonify
from flask_cors import CORS
import subprocess
import threading
import os
import time
import requests
import hashlib
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# Config & paths
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")
SUPABASE_TABLE = os.getenv("SUPABASE_TABLE", "messages")

PYTHON_EXE = "python3"  # Or full path to your Python if needed
PKT_RCV_SCRIPT = os.path.join("..", "CACI-GUI", "testin", "gr-control", "Receivers", "pkt_rcv.py")
STRIP_PREAMBLE_SCRIPT = os.path.join("..", "CACI-GUI", "testin", "gr-control", "Receivers", "strip_preamble.py")
TMP_OUTPUT = "output.tmp"
FINAL_OUTPUT = "output.txt"

# --- Supabase Upload ---
def upload_to_supabase(message_text):
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}"
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    payload = {"content": message_text}
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 201:
        print("✅ Uploaded to Supabase:", response.json(), flush=True)
    else:
        print("❌ Failed to upload:", response.status_code, response.text, flush=True)

# --- Run Strip Script ---
def run_strip_script():
    try:
        result = subprocess.run(
            [PYTHON_EXE, STRIP_PREAMBLE_SCRIPT, TMP_OUTPUT, FINAL_OUTPUT],
            capture_output=True,
            text=True,
            check=True
        )
        print("🧹 strip_preamble.py output:", result.stdout, flush=True)

        if os.path.exists(FINAL_OUTPUT):
            with open(FINAL_OUTPUT, "r") as f:
                message = f.read().strip()
                if message:
                    upload_to_supabase(message)
                else:
                    print("⚠️ output.txt is empty", flush=True)
        else:
            print("❌ output.txt not found", flush=True)

    except subprocess.CalledProcessError as e:
        print("❌ strip_preamble.py error:", e.stderr, flush=True)

# --- Hashing for Change Detection ---
def hash_file(filepath):
    try:
        with open(filepath, "rb") as f:
            return hashlib.md5(f.read()).hexdigest()
    except FileNotFoundError:
        return None

# --- Monitor output.tmp ---
def monitor_tmp_file():
    print("🔍 Monitoring output.tmp for changes...", flush=True)
    last_hash = None
    while True:
        current_hash = hash_file(TMP_OUTPUT)
        if current_hash and current_hash != last_hash:
            print("📄 Detected change in output.tmp", flush=True)
            last_hash = current_hash
            run_strip_script()
        time.sleep(1)

# --- Receiver Loop ---
def run_receiver_loop():
    print("📡 Starting pkt_rcv.py loop...", flush=True)
    while True:
        try:
            subprocess.run(
                [PYTHON_EXE, "-u", PKT_RCV_SCRIPT],
                check=True
            )
        except subprocess.CalledProcessError as e:
            print("❌ pkt_rcv.py error:", e.stderr, flush=True)
        time.sleep(1)

# --- Flask Manual Trigger ---
@app.route("/run-receive-script", methods=["GET"])
def run_receive_script():
    try:
        subprocess.run(
            [PYTHON_EXE, "-u", PKT_RCV_SCRIPT],
            capture_output=True,
            text=True,
            check=True
        )
        print("✅ pkt_rcv.py executed manually", flush=True)

        run_strip_script()

        if os.path.exists(FINAL_OUTPUT):
            with open(FINAL_OUTPUT, "r") as f:
                return jsonify({"message": "Success", "output": f.read().strip()})
        else:
            return jsonify({"error": "output.txt not found"}), 404

    except subprocess.CalledProcessError as e:
        return jsonify({"error": "Script execution failed", "details": e.stderr}), 500

# --- Start Threads ---
def start_background_threads():
    threading.Thread(target=run_receiver_loop, daemon=True).start()
    threading.Thread(target=monitor_tmp_file, daemon=True).start()

# Launch everything
start_background_threads()

if __name__ == "__main__":
    app.run(port=3006)
