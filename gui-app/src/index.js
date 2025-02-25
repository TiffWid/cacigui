import React, { useState, useEffect } from 'react';
import './gui.css';
import ReactDOM from 'react-dom/client';

export default function FeatherMessages() {
    const [messages, setMessages] = useState([]);
    const [relayPower, setRelayPower] = useState({ relay1: 0, relay2: 0 });
    const [transmitPower, setTransmitPower] = useState(0);
    const [transmitMessage, setTransmitMessage] = useState('');

    // Fetch messages and relay power settings from backend
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await fetch('/messages');
                const data = await response.json();
                setMessages(data.messages || []);
                setRelayPower(data.relayPower || { relay1: 0, relay2: 0 });
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };
        
        fetchMessages();
        const interval = setInterval(fetchMessages, 2000);
        return () => clearInterval(interval);
    }, []);

    // Handle transmit
    const handleTransmit = async () => {
        try {
            await fetch('/transmit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ power: transmitPower, message: transmitMessage })
            });
            setTransmitMessage('');
        } catch (error) {
            console.error('Error transmitting message:', error);
        }
    };

    return (
        <div className="container p-4">
            <h1 className="text-center mb-4">Feather Messages</h1>
            <div className="row g-4">
                {/* Relay 1 Block */}
                <div className="col-md-6">
                    <div className="card p-3 shadow-sm">
                        <h5>Relay 1</h5>
                        <p>Power: {relayPower.relay1}W</p>
                    </div>
                </div>
                
                {/* Relay 2 Block */}
                <div className="col-md-6">
                    <div className="card p-3 shadow-sm">
                        <h5>Relay 2</h5>
                        <p>Power: {relayPower.relay2}W</p>
                    </div>
                </div>
                
                {/* Transmit Block */}
                <div className="col-md-6">
                    <div className="card p-3 shadow-sm">
                        <h5>Tx Antenna</h5>
                        <input 
                            type="number" 
                            className="form-control mb-2" 
                            placeholder="Power (W)"
                            value={transmitPower}
                            onChange={e => setTransmitPower(e.target.value)}
                        />
                        <input 
                            type="text" 
                            className="form-control mb-2" 
                            placeholder="Message"
                            value={transmitMessage}
                            onChange={e => setTransmitMessage(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={handleTransmit}>Send</button>
                    </div>
                </div>
                
                {/* Receive Block */}
                <div className="col-md-6">
                    <div className="card p-3 shadow-sm">
                        <h5>Rx Antenna</h5>
                        <div>
                            {messages.length > 0 ? messages.map((msg, index) => (
                                <div key={index} className="alert alert-secondary p-2">{msg}</div>
                            )) : <p>No messages received</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

}


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <FeatherMessages />
  </React.StrictMode>
)