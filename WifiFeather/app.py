from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests (if needed)

# Variables to store data for each quadrant
RL1 = None
RL2 = None
RX = None
TX = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send', methods=['POST'])
def receive_data():
    global RL1, RL2, RX, TX
    data = request.json

    if data and 'RL1' in data:
        RL1 = data['RL1']  # Add the Relay 1 message
        return jsonify({"status": "success", "message": "RL1 data received successfully!"}), 200
    if data and 'RL2' in data:
        RL2 = data['RL2']  # Add the Relay 2 message
        return jsonify({"status": "success", "message": "RL2 data received successfully!"}), 200
    if data and 'RX' in data:
        RX = data['RX']  # Add the Receiving message
        return jsonify({"status": "success", "message": "RX data received successfully!"}), 200
        return jsonify({"status": "success", "message": "RX data received successfully!"}), 200
    if data and 'TX' in data:
        TX = data['TX']  # Add the Transmitting message
        return jsonify({"status": "success", "message": "TX data received successfully!"}), 200

    return jsonify({"status": "error", "message": "Invalid data! Must be RX, RL1, RL2, or TX"}), 400

@app.route('/messages', methods=['GET'])
def get_all_messages():
    return jsonify({
        "RX": [RX] if RX else [],
        "RL1": [RL1] if RL1 else [],
        "RL2": [RL2] if RL2 else []
    })

@app.route('/tx', methods=['GET'])
def get_transmit():
    return jsonify({
        "RX": [RX] if RX else [],
        "RL1": [RL1] if RL1 else [],
        "RL2": [RL2] if RL2 else []
    })

@app.route('/tx', methods=['GET'])
def get_transmit():
    return jsonify({"TX": TX if TX else "TX_off"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
