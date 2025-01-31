import React, { useState, createRef } from "react";
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import Draggable from "react-draggable";

const DraggableBlocks = () => {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [relayCount, setRelayCount] = useState(0);

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
      x: 100,
      y: 100,
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

        {blocks.map((block) => (
          <Draggable key={block.id} nodeRef={block.nodeRef} bounds="parent" defaultPosition={{ x: block.x, y: block.y }}>
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

      <div className="info-panel">
        {selectedBlock ? (
          <div className="info-box">
            <h3>{selectedBlock.type} Settings</h3>

            {selectedBlock.type === "TX Antenna" && (
              <>
                <label>Power Level:</label>
                <input
                  type="number"
                  value={selectedBlock.settings.power}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, power: e.target.value } })
                  }
                />
                <label>
                  RF On/Off:
                  <input
                    type="checkbox"
                    checked={selectedBlock.settings.rfOn}
                    onChange={() =>
                      setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, rfOn: !selectedBlock.settings.rfOn } })
                    }
                  />
                </label>
                <label>Message:</label>
                <input
                  type="text"
                  value={selectedBlock.settings.message}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, message: e.target.value } })
                  }
                />
                <label>Upload Message File:</label>
                <input type="file" onChange={handleFileChange} />
                {selectedBlock.settings.file && <p>Selected File: {selectedBlock.settings.file.name}</p>}
              </>
            )}

            {selectedBlock.type === "RX Antenna" && (
              <>
                <label>Received Message:</label>
                <input
                  type="text"
                  value={selectedBlock.settings.receivedMessage}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, receivedMessage: e.target.value } })
                  }
                />
                <label>Power Level:</label>
                <input
                  type="number"
                  value={selectedBlock.settings.powerLevel}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerLevel: e.target.value } })
                  }
                />
              </>
            )}

            {selectedBlock.type.includes("Relay") && (
              <>
                <label>Power In:</label>
                <input
                  type="number"
                  value={selectedBlock.settings.powerIn}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerIn: e.target.value } })
                  }
                />
                <label>Power Out:</label>
                <input
                  type="number"
                  value={selectedBlock.settings.powerOut}
                  onChange={(e) =>
                    setSelectedBlock({ ...selectedBlock, settings: { ...selectedBlock.settings, powerOut: e.target.value } })
                  }
                />
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
          </div>
        ) : (
          <div className="info-box">
            <h3>Select a Block</h3>
            <p>Click on a block to configure settings.</p>
          </div>
        )}
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

