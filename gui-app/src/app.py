from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime
import uuid
import json

# Load environment variables
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path)

# Connect to Supabase via API (REST)n
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("SUPABASE_URL:", SUPABASE_URL)
print("SUPABASE_KEY Loaded:", "Yes" if SUPABASE_KEY else "No")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Supabase URL or Key is missing! Check your .env file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__)
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "https://anrdbdndxykqexfgrzjo.supabase.co"]}})

socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def home():
    return "Flask Server Running with Supabase API!", 200

### USER SIGNUP
@app.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"status": "error", "message": "Email and password are required"}), 400

        response = supabase.auth.sign_up({"email": email, "password": password})

        if response.user:
            user_id = response.user.id  # Extract user ID from Supabase Auth

            # Insert user into "users" table in Supabase
            insert_response = supabase.table("users").insert({
                "id": user_id,
                "email": email
            }).execute()

            print("User inserted into Supabase:", insert_response)

            return jsonify({
                "status": "success",
                "user": {
                    "id": user_id,
                    "email": email
                }
            })
        else:
            return jsonify({"status": "error", "message": response.error.message}), 400

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"status": "error", "message": "Email and password are required"}), 400

        response = supabase.auth.sign_in_with_password({"email": email, "password": password})

        # Fix: Access `.user` and `.session`
        if response.user and response.session:
            return jsonify({
                "status": "success",
                "user": {
                    "id": response.user.id,
                    "email": response.user.email
                },
                "session": {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token
                }
            })
        else:
            return jsonify({"status": "error", "message": response.error.message}), 400

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

### PROTECTED ROUTE (Only Authenticated Users)
@app.route('/protected_data', methods=['GET'])
def protected_data():
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"status": "error", "message": "Authorization header missing"}), 401

        token = auth_header.split("Bearer ")[-1]
        user = supabase.auth.get_user(token)

        if "user" not in user:
            return jsonify({"status": "error", "message": "Invalid or expired token"}), 401

        return jsonify({"status": "success", "message": "Authenticated!", "user": user["user"]})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

### STORE JSON DATA (Only Authenticated Users)
@app.route('/data', methods=['POST'])
def receive_data():
    try:
        #Extract Authorization Token
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"status": "error", "message": "Authorization header missing"}), 401

        token = auth_header.split("Bearer ")[-1]  # Extract Bearer Token
        user = supabase.auth.get_user(token)

        # Ensure token is valid
        if not user or "user" not in user:
            return jsonify({"status": "error", "message": "Invalid or expired token"}), 401

        # Extract JSON Data
        json_data = request.get_json() or {}

        if not json_data:
            return jsonify({"status": "error", "message": "No valid JSON data received"}), 400

        record_id = str(uuid.uuid4())  # Generate UUID
        timestamp = datetime.utcnow().isoformat()  # Generate UTC timestamp

        print(f"Inserting JSON data: {json_data} | UUID: {record_id} | Timestamp: {timestamp}")  # Debugging

        #Insert into Supabase
        response = supabase.table("backend_data").insert({
            "id": record_id,
            "user_id": user["user"]["id"],  # Store user ID
            "json_data": json_data,
            "timestampz": timestamp
        }).execute()

        print(f"Supabase Response: {response}")  # Debugging

        if response.data:
            return jsonify({"status": "success", "data": response.data})
        else:
            return jsonify({"status": "error", "message": response.error.message}), 400

    except Exception as e:
        print(f"❌ Error inserting data: {str(e)}")  # Debugging
        return jsonify({"status": "error", "message": str(e)}), 500

    
@app.route('/resend_confirmation', methods=['POST'])
def resend_confirmation():
    try:
        data = request.json
        email = data.get("email")

        if not email:
            return jsonify({"status": "error", "message": "Email is required"}), 400

        response = supabase.auth.resend_email_confirmation(email=email)

        return jsonify({"status": "success", "message": "Confirmation email sent"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
