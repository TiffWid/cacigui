from flask import Flask, request, jsonify
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

data_log = []  # Store received messages for debugging or display



@app.route('/')
def home():
    return "Flask Server Running!", 200

@app.route('/data', methods=['POST'])
def receive_data():
    try:
        data = request.json.get("message", "")
        if data:
            print(f"Received Data: {data}")
            data_log.append(data)
            socketio.emit("update", {"message": data})  # Send data to frontend via WebSocket
        return jsonify({"status": "success", "message": "Data received"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/get_data', methods=['GET'])
def get_data():
    return jsonify({"data": data_log})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
