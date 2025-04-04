from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import subprocess
import getpass
import uhd

print("Running as user:", getpass.getuser())
print("PATH:", os.environ.get("PATH"))
print("LD_LIBRARY_PATH:", os.environ.get("LD_LIBRARY_PATH"))

# Try to detect the USRP
try:
    usrp = uhd.usrp.MultiUSRP()
    print("USRP Detected:", usrp.get_pp_string())
except Exception as e:
    print("Error detecting USRP:", e)

app = Flask(__name__)
CORS(app)

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
PYTHON_SCRIPT_PATH = os.path.join(BASE_DIR, "..", "cacigui", "SDR-GUI", "pkt_xmt_psk.py")
REPEAT_COUNT = 100

# Ensure the uploads directory exists
os.makedirs(UPLOADS_DIR, exist_ok=True)

@app.route("/save-message", methods=["POST"])
def save_message():
    data = request.get_json()
    file_name = data.get("fileName")
    file_content = data.get("fileContent", "").strip()

    if not file_name or not file_content:
        return jsonify({"error": "Invalid input. Filename and content are required."}), 400

    modified_content = (file_content + ";") * REPEAT_COUNT
    file_path = os.path.join(UPLOADS_DIR, file_name)

    try:
        with open(file_path, "w") as f:
            f.write(modified_content)
        print("Message saved:", file_path)
        return jsonify({"message": "Message saved successfully", "filePath": file_path})
    except Exception as e:
        print("Error saving message:", e)
        return jsonify({"error": "Failed to save message."}), 500

@app.route("/run-script", methods=["GET"])
def run_script():
    file_name = request.args.get("fileName")
    if not file_name:
        return jsonify({"error": "Filename is required to run the script."}), 400

    file_path = os.path.join(UPLOADS_DIR, file_name)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found."}), 404

    python_command = f'/Users/ivinbiju/radioconda/bin/python3 "{PYTHON_SCRIPT_PATH}" --InFile="{file_path}"'

    try:
        result = subprocess.run(python_command, capture_output=True, text=True, shell=True, check=True)
        print("Script output:", result.stdout)
        return jsonify({
            "message": "Script executed successfully",
            "output": result.stdout
        })
    except subprocess.CalledProcessError as e:
        print("Script execution failed:", e.stderr)
        return jsonify({
            "error": "Failed to execute pkt_xmt_psk.py",
            "details": e.stderr
        }), 500

if __name__ == "__main__":
    app.run(port=3005)

