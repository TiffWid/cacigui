from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from pymongo import MongoClient
import os

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Connect to MongoDB Atlas
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://nehabijoy:12345678!@caci.7qkhv.mongodb.net/") 
client = MongoClient(MONGO_URI)
# Database name
db = client["backend"]  
# Collection name
collection = db["backend_data"]  

@app.route('/')
def home():
    return "Flask Server Running!", 200

@app.route('/data', methods=['POST'])
def receive_data():
    try:
        data = request.json.get("message", "")
        if data:
            print(f"Received Data: {data}")
            collection.insert_one({"message": data})  # Store in MongoDB
            socketio.emit("update", {"message": data})  # Send data to frontend via WebSocket
        return jsonify({"status": "success", "message": "Data received"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/get_data', methods=['GET'])
def get_data():
    messages = list(collection.find({}, {"_id": 0, "message": 1}))  # Fetch messages without _id
    return jsonify({"data": messages})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
# prompt
#  Invoke-RestMethod -Uri "http://127.0.0.1:5000/data" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"message": "Test from MongoDB"}'
