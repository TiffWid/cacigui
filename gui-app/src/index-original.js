import React, { useState, createRef, useEffect } from "react";
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import Draggable from "react-draggable";

const DraggableBlocks = () => {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [relayCount, setRelayCount] = useState(0);
  const [savedConfigs, setSavedConfigs] = useState({});
  const [configName, setConfigName] = useState("");

  const addBlock = (type) => {
    let blockName = type;

    if (type === "Relay") {
      const newRelayNumber = relayCount + 1;
      blockName = `Relay ${newRelayNumber}`;
      setRelayCount(newRelayNumber);
    }

    const newBlock = {
      id: Date.now(),
      type: blockName,
      nodeRef: createRef(),
      x: 100, // initial x position
      y: 100, // initial y position
      arrows: type === "Object" ? {} : { top: false, right: false, bottom: false, left: false },
      settings: type === "TX Antenna"
        ? { power: 10, rfOn: true, message: "", file: null }
        : type === "RX Antenna"
        ? { receivedMessage: "", powerLevel: 0 }
        : type.includes("Relay")
        ? { powerIn: 0, powerOut: 0 }
        : {},
    };

    setBlocks([...blocks, newBlock]);
  };

  const handleClick = (block) => {
    setSelectedBlock(block);
  };

  const toggleArrow = (direction) => {
    if (selectedBlock) {
      setSelectedBlock((prev) => ({
        ...prev,
        arrows: { ...prev.arrows, [direction]: !prev.arrows[direction] },
      }));

      setBlocks((prevBlocks) =>
        prevBlocks.map((block) =>
          block.id === selectedBlock.id
            ? { ...block, arrows: { ...block.arrows, [direction]: !block.arrows[direction] } }
            : block
        )
      );
    }
  };

  const handleFileChange = (e) => {
    if (selectedBlock) {
      const file = e.target.files[0];
      setSelectedBlock({
        ...selectedBlock,
        settings: { ...selectedBlock.settings, file },
      });
    }
  };

  const handleDrag = (e, data, block) => {
    const newBlocks = blocks.map(b =>
      b.id === block.id
        ? { ...b, x: data.x, y: data.y }
        : b
    );
    setBlocks(newBlocks);
  };

  const saveConfiguration = () => {
    if (configName.trim()) {
      setSavedConfigs({ ...savedConfigs, [configName]: blocks });
      setConfigName("");
    }
  };

  const loadConfiguration = (name) => {
    if (savedConfigs[name]) {
      setBlocks(savedConfigs[name]);
    }
  };

  //Connecting backend and frontend
  const updateBlockFromBackend = async (blockId) => {
    try {
      // Simulating a backend API call - replace with actual fetch request
      const response = await fetch(`https://your-backend-api.com/block/${blockId}`);
      const data = await response.json();
  
      setBlocks((prevBlocks) =>
        prevBlocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                settings: {
                  ...block.settings,
                  power: data.power || block.settings.power,
                  battery: data.battery || block.settings.battery,
                  message: data.message || block.settings.message,
                  bandwidth: data.bandwidth || block.settings.bandwidth,
                },
              }
            : block
        )
      );
  
      if (selectedBlock && selectedBlock.id === blockId) {
        setSelectedBlock((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            power: data.power || prev.settings.power,
            battery: data.battery || prev.settings.battery,
            message: data.message || prev.settings.message,
            bandwidth: data.bandwidth || prev.settings.bandwidth,
          },
        }));
      }
    } catch (error) {
      console.error("Error fetching block data:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      blocks.forEach((block) => updateBlockFromBackend(block.id));
    }, 5000); // Fetch updates every 5 seconds
  
    return () => clearInterval(interval);
  }, [blocks]);

  return (
    <div className="container">
      <div className="draggable-container">
        <div className="button-container">
          <button className="button" onClick={() => addBlock("RX Antenna")}>
            Add RX Antenna
          </button>
          <button className="button" onClick={() => addBlock("TX Antenna")}>
            Add TX Antenna
          </button>
          <button className="button" onClick={() => addBlock("Relay")}>
            Add Relay
          </button>
          <button className="button" onClick={() => addBlock("Object")}>
            Add Object
          </button>
        </div>

        <div className="block-container">
          {blocks.map((block) => (
            <Draggable
              key={block.id}
              nodeRef={block.nodeRef}
              bounds="parent"
              position={{ x: block.x, y: block.y }}
              onStop={(e, data) => handleDrag(e, data, block)}
            >
              <div ref={block.nodeRef} className="block" onClick={() => handleClick(block)}>
                <div className="block-image">
                  {block.type}
                  {block.type !== "Object" && (
                    <div className="arrows">
                      {block.arrows.top && <div className="arrow arrow-up">↑</div>}
                      {block.arrows.right && <div className="arrow arrow-right">→</div>}
                      {block.arrows.bottom && <div className="arrow arrow-down">↓</div>}
                      {block.arrows.left && <div className="arrow arrow-left">←</div>}
                    </div>
                  )}
                </div>
              </div>
            </Draggable>
          ))}
        </div>
      </div>

      <div className="info-panel">
        <div className="info-box">
          {selectedBlock ? (
            <>
              <h3>{selectedBlock.type} Settings</h3>

              {selectedBlock.type === "TX Antenna" && (
                <>
                <div className="setting-style">
                <div className ="setting-item"> 
                  <label>Power Level:</label>
                  <input
                    type="number"
                    value={selectedBlock.settings.power}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, power: e.target.value } })
                    }
                  />
                  </div>
                  <div className ="setting-item"> 
                  <label>Bandwidth:</label>
                  <input
                    type="number"
                    value={selectedBlock.settings.bandwidth}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerLevel: e.target.value } })
                    }
                  />
                  </div>
                  <div className ="setting-item"> 
                  <label>
                    Transmit On/Off:
                    <input
                      type="checkbox"
                      checked={selectedBlock.settings.rfOn}
                      onChange={() =>
                        setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, rfOn: !selectedBlock.settings.rfOn } })
                      }
                    />
                  </label>
                  </div>
                  <div className ="setting-item"> 
                  <label>Message:</label>
                  <input
                    type="text"
                    value={selectedBlock.settings.message}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, message: e.target.value } })
                    }
                  />
                  </div>
                  <label>Upload Message File:</label>
                  <input type="file" onChange={handleFileChange} />
                  {selectedBlock.settings.file && <p>Selected File: {selectedBlock.settings.file.name}</p>}

                  <label>Battery Level:</label>
                  <input
                    type="number"
                    value={selectedBlock.settings.battery}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, power: e.target.value } })
                    }
                  />
                </div>
                </>
              )}

              {selectedBlock.type === "RX Antenna" && (
                <>
                <div className="setting-style">
                  <div className ="setting-item">
                  <label>Received Message:</label>
                  <input
                    type="text"
                    value={selectedBlock.settings.receivedMessage}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, receivedMessage: e.target.value } })
                    }
                  />
                  </div>
                  <div className ="setting-item">
                  <label>Power Level:</label>
                  <input
                    type="number"
                    value={selectedBlock.settings.powerLevel}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerLevel: e.target.value } })
                    }
                  />
                  </div>
                  <div className ="setting-item">
                  <label>Bandwidth:</label>
                  <input
                    type="number"
                    value={selectedBlock.settings.bandwidth}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerLevel: e.target.value } })
                    }
                  />
                  </div>
                  <div className ="setting-item">
                  <label>Battery Level:</label>
                  <input
                    type="number"
                    value={selectedBlock.settings.battery}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, power: e.target.value } })
                    }
                  />
                  </div>
                </div>
                </>
              )}

              {selectedBlock.type.includes("Relay") && (
                <>
                  <div className="setting-style">
                  <div className ="setting-item">
                  <label>Power In:</label>
                  <input
                    type="number"
                    value={selectedBlock.settings.powerIn}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerIn: e.target.value } })
                    }
                  />
                  </div>
                  <div className ="setting-item">
                  <label>Power Out:</label>
                  <input
                    type="number"
                    value={selectedBlock.settings.powerOut}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerOut: e.target.value } })
                    }
                  />
                  </div>
                  <div className ="setting-item">
                  <label>Battery Level:</label>
                  <input
                    type="number"
                    value={selectedBlock.settings.battery}
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, power: e.target.value } })
                    }
                  />
                  </div>
                  </div>
                </>
              )}

              {selectedBlock.type !== "Object" && (
                <div className="checkbox-group">
                  <label><input type="checkbox" checked={selectedBlock.arrows.top} onChange={() => toggleArrow("top")} /> Top Arrow</label>
                  <label><input type="checkbox" checked={selectedBlock.arrows.right} onChange={() => toggleArrow("right")} /> Right Arrow</label>
                  <label><input type="checkbox" checked={selectedBlock.arrows.bottom} onChange={() => toggleArrow("bottom")} /> Bottom Arrow</label>
                  <label><input type="checkbox" checked={selectedBlock.arrows.left} onChange={() => toggleArrow("left")} /> Left Arrow</label>
                </div>
              )}
            </>
          ) : (
            <div>
              <h3>Select a Block</h3>
              <p>Click on a block to configure settings.</p>
            </div>
          )}
        </div>

        <div className="info-box">
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Enter configuration name"
          />
          <button className="button" onClick={saveConfiguration}>Save Configuration</button>
          <div className="saved-configs">
            <h4>Saved Configurations:</h4>
            {Object.keys(savedConfigs).map((name) => (
              <button key={name} onClick={() => loadConfiguration(name)}>{name}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggableBlocks;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <DraggableBlocks />
  </React.StrictMode>
);

reportWebVitals();
