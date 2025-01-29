import React, { useState } from "react";
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const AntennaManager = () => {
  const [antennas, setAntennas] = useState([]);
  const [selectedAntenna, setSelectedAntenna] = useState(null);

  const [newAntennaName, setNewAntennaName] = useState(""); // New name input state
  const [newAntennaInfo, setNewAntennaInfo] = useState(""); // New info input state

  const addAntenna = () => {
    if (!newAntennaName || !newAntennaInfo) {
      alert("Please provide both name and info for the antenna.");
      return;
    }

    const newAntenna = {
      id: Date.now(),
      label: newAntennaName,
      health: Math.floor(Math.random() * 100) + 1, // Random health value
      info: newAntennaInfo,
      signalsReceived: 0, // Count of signals received
      signalsSent: 0, // Count of signals sent
      location: 0, // Initial slider value
    };

    setAntennas((prev) => [...prev, newAntenna]);
    setNewAntennaName(""); // Clear name input
    setNewAntennaInfo(""); // Clear info input
  };

  const removeAntenna = (id) => {
    setAntennas((prev) => prev.filter((antenna) => antenna.id !== id));
    if (selectedAntenna?.id === id) {
      setSelectedAntenna(null);
    }
  };

  const handleAntennaClick = (antenna) => {
    setSelectedAntenna(antenna);
  };

  const handleNameChange = (e) => {
    const updatedName = e.target.value;
    setSelectedAntenna((prev) => ({ ...prev, label: updatedName }));
    setAntennas((prev) =>
      prev.map((antenna) =>
        antenna.id === selectedAntenna.id
          ? { ...antenna, label: updatedName }
          : antenna
      )
    );
  };

  const handleSignalReceived = () => {
    setSelectedAntenna((prev) => ({
      ...prev,
      signalsReceived: prev.signalsReceived + 1,
    }));
    setAntennas((prev) =>
      prev.map((antenna) =>
        antenna.id === selectedAntenna.id
          ? { ...antenna, signalsReceived: antenna.signalsReceived + 1 }
          : antenna
      )
    );
  };

  const handleSignalSent = () => {
    setSelectedAntenna((prev) => ({
      ...prev,
      signalsSent: prev.signalsSent + 1,
    }));
    setAntennas((prev) =>
      prev.map((antenna) =>
        antenna.id === selectedAntenna.id
          ? { ...antenna, signalsSent: antenna.signalsSent + 1 }
          : antenna
      )
    );
  };

  const handleLocationChange = (e) => {
    const newLocation = parseInt(e.target.value, 10);
    setSelectedAntenna((prev) => ({ ...prev, location: newLocation }));
    setAntennas((prev) =>
      prev.map((antenna) =>
        antenna.id === selectedAntenna.id
          ? { ...antenna, location: newLocation }
          : antenna
      )
    );
  };

  return (
    <section className="antenna-manager">
      <div className="styling">
      <div className="antennas">
        {antennas.map((antenna) => (
          <div
            className="antenna"
            key={antenna.id}
            onClick={() => handleAntennaClick(antenna)}
          >
            <div className="info">
              <p>{antenna.label}</p>
              <div className="health-bar">
                <div
                  className="health-bar-fill"
                  style={{ width: `${antenna.health}%` }}
                ></div>
              </div>
            </div>
            <div className="remove">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAntenna(antenna.id);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="add-antenna">
        <h3>Add New Antenna</h3>
        <div>
          <label>
            <strong>Name:</strong>
            <input
              type="text"
              value={newAntennaName}
              onChange={(e) => setNewAntennaName(e.target.value)}
              placeholder="Enter antenna name"
            />
          </label>
        </div>
        <div>
          <label>
            <strong>Info:</strong>
            <textarea
              value={newAntennaInfo}
              onChange={(e) => setNewAntennaInfo(e.target.value)}
              placeholder="Enter antenna info"
            />
          </label>
        </div>
        <button type="button" onClick={addAntenna}>
          Add
        </button>
      </div>
      </div>
      <div className="content">
        {selectedAntenna ? (
          <div className="antenna-details">
            <h2>Edit Antenna</h2>
            <label>
              <strong>Name:</strong>
              <input
                type="text"
                value={selectedAntenna.label}
                onChange={handleNameChange}
              />
            </label>
            <p>
              <strong>Health:</strong> {selectedAntenna.health}%
            </p>
            <p>
              <strong>Info:</strong> {selectedAntenna.info}
            </p>
            <p>
              <strong>Signals Received:</strong>{" "}
              {selectedAntenna.signalsReceived}
            </p>
            <p>
              <strong>Signals Sent:</strong> {selectedAntenna.signalsSent}
            </p>
            <div>
              <button onClick={handleSignalReceived}>Signal Received</button>
              <button onClick={handleSignalSent}>Signal Sent</button>
            </div>
            <div>
              <label>
                <strong>Angle:</strong>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={selectedAntenna.location}
                  onChange={handleLocationChange}
                />
              </label>
              <p>{selectedAntenna.location}°</p>
            </div>
          </div>
        ) : (
          <p>Select an antenna to see its details.</p>
        )}
      </div>
    </section>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AntennaManager />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
