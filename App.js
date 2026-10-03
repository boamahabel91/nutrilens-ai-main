import React, { useEffect, useRef, useState } from "react";
import * as mobilenet from "@tensorflow-models/mobilenet";


function App() {
  const [loadingModel, setLoadingModel] = useState(false);
  const [classifier, setClassifier] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [recentImages, setRecentImages] = useState([]);

  const previewRef = useRef(null);
  const urlInputRef = useRef(null);
  const hiddenFileInputRef = useRef(null);

  const initializeModel = async () => {
    setLoadingModel(true);
    try {
      const loadedClassifier = await mobilenet.load();
      setClassifier(loadedClassifier);
    } catch (error) {
      console.error("Error loading model:", error);
    } finally {
      setLoadingModel(false);
    }
  };

  const handleFileSelect = (event) => {
    const chosenFiles = event.target.files;

    if (chosenFiles && chosenFiles.length > 0) {
      const localImageUrl = URL.createObjectURL(chosenFiles[0]);
      setSelectedImage(localImageUrl);
      setPredictions([]);
    } else {
      setSelectedImage(null);
    }
  };

  const handleUrlInput = (event) => {
    setSelectedImage(event.target.value);
    setPredictions([]);
  };

  const openFilePicker = () => {
    hiddenFileInputRef.current.click();
  };

  const runClassification = async () => {
    if (!classifier || !previewRef.current) return;

    const identifiedResults = await classifier.classify(previewRef.current);
    setPredictions(identifiedResults);

    if (urlInputRef.current) {
      urlInputRef.current.value = "";
    }
  };

  useEffect(() => {
    initializeModel();
  }, []);

  useEffect(() => {
    if (selectedImage) {
      setRecentImages((previousImages) => [selectedImage, ...previousImages]);
    }
  }, [selectedImage]);

  if (loadingModel) {
    return <h2>Model Loading...</h2>;
  }

  return (
    <div className="appShell">
      <h1 className="pageTitle">Nutrition Recognition</h1>

      <div className="controlsBar">
        <input
          type="file"
          accept="image/*"
          capture="camera"
          className="hiddenFileField"
          onChange={handleFileSelect}
          ref={hiddenFileInputRef}
        />

        <button className="uploadButton" onClick={openFilePicker}>
          Upload Image
        </button>

        <span className="dividerText">OR</span>

        <input
          type="text"
          placeholder="Paste image URL"
          ref={urlInputRef}
          onChange={handleUrlInput}
        />
      </div>

      <div className="contentWrap">
        <div className="displaySection">
          <div className="previewPanel">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                crossOrigin="anonymous"
                ref={previewRef}
              />
            )}
          </div>

          {predictions.length > 0 && (
            <div className="predictionPanel">
              {predictions.map((item, position) => (
                <div className="predictionCard" key={item.className}>
                  <span className="predictionName">{item.className}</span>
                  <span className="predictionScore">
                    Confidence level: {(item.probability * 100).toFixed(2)}%
                    {position === 0 && (
                      <span className="topMatchBadge">Best Guess</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedImage && (
          <button className="identifyButton" onClick={runClassification}>
            Identify Image
          </button>
        )}
      </div>

      {recentImages.length > 0 && (
        <div className="historySection">
          <h2>Recent Images</h2>
          <div className="historyGrid">
            {recentImages.map((imageItem, index) => (
              <div
                className="historyCard"
                key={`${imageItem}-${index}`}
                onClick={() => setSelectedImage(imageItem)}
              >
                <img src={imageItem} alt="Recent item" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;