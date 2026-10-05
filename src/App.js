import React, { useEffect, useRef, useState } from "react"; // React hooks used to store data and set up the code

//  TensorFlow.js model
import * as mobilenet from "@tensorflow-models/mobilenet"; //MobileNet is being called and used here for recognition of the uploaded image

const PROGRESS_KEY = "nutritionRecognitionProgress"; //Variable name used to save gamification progress bar

const getToday = () => new Date().toISOString().split("T")[0]; //It will return the present date so daily streak can be calculated

// Sorts out how many days there are between the previous day and today.
const getDayDifference = (previousDate, currentDate) => {
  const previous = new Date(`${previousDate}T00:00:00`);
  const current = new Date(`${currentDate}T00:00:00`);
  return Math.round((current - previous) / 86400000);
};

// Approximate nutrition reference values used by this prototype.
// Values are shown per 100 g because the app cannot estimate portion size from an image.
const nutritionReference = [
  { keywords: ["banana"], name: "Banana", calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  { keywords: ["apple"], name: "Apple", calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
  { keywords: ["orange"], name: "Orange", calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
  { keywords: ["strawberry"], name: "Strawberry", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { keywords: ["broccoli"], name: "Broccoli", calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
  { keywords: ["cauliflower"], name: "Cauliflower", calories: 25, protein: 1.9, carbs: 5.0, fat: 0.3 },
  { keywords: ["cucumber", "cuke"], name: "Cucumber", calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
  { keywords: ["zucchini", "courgette"], name: "Courgette", calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  { keywords: ["bell pepper", "sweet pepper"], name: "Bell pepper", calories: 31, protein: 1.0, carbs: 6.0, fat: 0.3 },
  { keywords: ["mushroom"], name: "Mushroom", calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  { keywords: ["pizza"], name: "Pizza", calories: 266, protein: 11.4, carbs: 33.3, fat: 10.4 },
  { keywords: ["cheeseburger", "hamburger"], name: "Burger", calories: 295, protein: 17.0, carbs: 24.0, fat: 14.0 },
  { keywords: ["hotdog", "hot dog"], name: "Hot dog", calories: 290, protein: 10.0, carbs: 4.2, fat: 26.0 },
  { keywords: ["bagel"], name: "Bagel", calories: 250, protein: 10.0, carbs: 49.0, fat: 1.5 },
  { keywords: ["pretzel"], name: "Pretzel", calories: 380, protein: 10.0, carbs: 80.0, fat: 3.0 },
  { keywords: ["ice cream", "ice lolly"], name: "Ice cream", calories: 207, protein: 3.5, carbs: 23.6, fat: 11.0 },
  { keywords: ["bread", "loaf", "french loaf"], name: "Bread", calories: 265, protein: 9.0, carbs: 49.0, fat: 3.2 },
  { keywords: ["burrito"], name: "Burrito", calories: 206, protein: 8.0, carbs: 24.0, fat: 9.0 },
  { keywords: ["guacamole"], name: "Guacamole", calories: 150, protein: 2.0, carbs: 8.0, fat: 13.0 },
  { keywords: ["carbonara"], name: "Pasta", calories: 191, protein: 7.0, carbs: 23.0, fat: 8.0 },
  { keywords: ["meat loaf", "meatloaf"], name: "Meatloaf", calories: 212, protein: 14.0, carbs: 9.0, fat: 13.0 },
  { keywords: ["mashed potato", "potato"], name: "Potato", calories: 87, protein: 1.9, carbs: 20.1, fat: 0.1 },
  { keywords: ["trifle"], name: "Trifle", calories: 186, protein: 3.0, carbs: 29.0, fat: 6.5 },
];


const foodCategoryEstimates = [
  { keywords: ["fruit", "berry"], name: "Estimated fruit", calories: 60, protein: 0.8, carbs: 15.0, fat: 0.3 },
  { keywords: ["vegetable", "salad", "greens"], name: "Estimated vegetable", calories: 35, protein: 2.0, carbs: 7.0, fat: 0.4 },
  { keywords: ["cake", "pie", "dessert", "pudding", "pastry", "cookie", "biscuit"], name: "Estimated dessert", calories: 330, protein: 5.0, carbs: 45.0, fat: 15.0 },
  { keywords: ["sandwich", "wrap"], name: "Estimated sandwich", calories: 240, protein: 10.0, carbs: 28.0, fat: 10.0 },
  { keywords: ["pasta", "noodle", "spaghetti"], name: "Estimated pasta dish", calories: 180, protein: 6.0, carbs: 30.0, fat: 4.0 },
  { keywords: ["rice"], name: "Estimated rice dish", calories: 150, protein: 3.0, carbs: 30.0, fat: 2.0 },
  { keywords: ["chicken", "hen", "drumstick"], name: "Estimated chicken", calories: 215, protein: 27.0, carbs: 0.0, fat: 11.0 },
  { keywords: ["steak", "beef", "meat"], name: "Estimated meat", calories: 250, protein: 26.0, carbs: 0.0, fat: 16.0 },
  { keywords: ["fish", "salmon", "tuna"], name: "Estimated fish", calories: 180, protein: 22.0, carbs: 0.0, fat: 10.0 },
  { keywords: ["soup", "stew"], name: "Estimated soup/stew", calories: 90, protein: 5.0, carbs: 10.0, fat: 3.5 },
];

const nonFoodKeywords = [
  "plate", "bowl", "cup", "mug", "fork", "spoon", "knife", "bottle", "can",
  "table", "chair", "phone", "computer", "keyboard", "mouse", "car", "bus", "train",
  "dog", "cat", "bird", "person", "shoe", "bag", "book", "clock", "camera", "screen"
];

const findNutritionEstimate = (predictionName) => {
  if (!predictionName) return null;

  const normalisedPrediction = predictionName.toLowerCase();

  if (nonFoodKeywords.some((keyword) => normalisedPrediction.includes(keyword))) {
    return null;
  }

  const exactFood = nutritionReference.find((food) =>
    food.keywords.some((keyword) => normalisedPrediction.includes(keyword))
  );
  if (exactFood) return { ...exactFood, estimated: false };

  const categoryFood = foodCategoryEstimates.find((food) =>
    food.keywords.some((keyword) => normalisedPrediction.includes(keyword))
  );
  if (categoryFood) return { ...categoryFood, estimated: true };

  return null;
};

// Milestones is implemented here and achievement system. A badge unlocks when total logs reaches its target.
const achievementLevels = [
  { target: 1, title: "First Step", description: "Complete your first successful food log." },
  { target: 5, title: "Consistent Logger", description: "Complete 5 successful food logs." },
  { target: 10, title: "Nutrition Explorer", description: "Complete 10 successful food logs." },
];

function App() {
  const [loadingModel, setLoadingModel] = useState(false);
  const [classifier, setClassifier] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [recentImages, setRecentImages] = useState([]);

  // The values track the daily streak, total successful logs and user feedback.
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const [lastLogDate, setLastLogDate] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [newAchievement, setNewAchievement] = useState("");
  const [classificationError, setClassificationError] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [nutritionEstimate, setNutritionEstimate] = useState(null);

  // useRef allows me to use to React access the image and URL file
  const previewRef = useRef(null);
  const urlInputRef = useRef(null);
  const hiddenFileInputRef = useRef(null);

  // Loads MobileNet once when the application starts.
  const initializeModel = async () => {
    setLoadingModel(true);
    try {
      const loadedClassifier = await mobilenet.load();
      setClassifier(loadedClassifier);
    } catch (error) {
      console.error("Error loading model:", error);
      setClassificationError("The recognition model could not be loaded. Please refresh and try again.");
    } finally {
      setLoadingModel(false);
    }
  };

  // Runs when the user chooses an image file from their laptop/device.
  const handleFileSelect = (event) => {
    const chosenFiles = event.target.files;

    if (chosenFiles && chosenFiles.length > 0) {
      const localImageUrl = URL.createObjectURL(chosenFiles[0]);
      setSelectedImage(localImageUrl);
      setPredictions([]);
      setFeedbackMessage("");
      setNewAchievement("");
      setClassificationError("");
      setNutritionEstimate(null);
    } else {
      setSelectedImage(null);
    }
  };

  // Runs when the user pastes or types an image URL.
  const handleUrlInput = (event) => {
    setSelectedImage(event.target.value);
    setPredictions([]);
    setFeedbackMessage("");
    setNewAchievement("");
    setClassificationError("");
    setNutritionEstimate(null);
  };

  const openFilePicker = () => {
    hiddenFileInputRef.current.click();
  };


  const updateProgressAfterSuccessfulLog = () => {
    const today = getToday();
    let nextStreak = currentStreak;

    if (!lastLogDate) {
      nextStreak = 1;
    } else if (lastLogDate !== today) {
      const dayDifference = getDayDifference(lastLogDate, today);
      nextStreak = dayDifference === 1 ? currentStreak + 1 : 1;
    }

    // Every successful classification counts as one food log.
    const nextTotalLogs = totalLogs + 1;
    // Check whether this exact log total has reached a new milestone.
    const unlockedAchievement = achievementLevels.find(
      (achievement) => achievement.target === nextTotalLogs
    );

    setCurrentStreak(nextStreak);
    setTotalLogs(nextTotalLogs);
    setLastLogDate(today);
    setFeedbackMessage("Great job — your food log has been recorded successfully.");
    setNewAchievement(unlockedAchievement ? unlockedAchievement.title : "");

    // Save progress in the browser so refreshing the page does not erase it.
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        currentStreak: nextStreak,
        totalLogs: nextTotalLogs,
        lastLogDate: today,
      })
    );
  };

  // Sends the displayed image to MobileNet and receives its prediction results.
  const runClassification = async () => {
    if (!classifier || !previewRef.current || classifying) return;

    setClassifying(true);
    setClassificationError("");
    setFeedbackMessage("");
    setNewAchievement("");

    try {
      const identifiedResults = await classifier.classify(previewRef.current);
      setPredictions(identifiedResults);

      // Uses only the best prediction to look up an approximate nutrition reference.
      const bestPrediction = identifiedResults.length > 0 ? identifiedResults[0] : null;
      setNutritionEstimate(
        bestPrediction ? findNutritionEstimate(bestPrediction.className) : null
      );

      if (identifiedResults.length > 0) {
        updateProgressAfterSuccessfulLog();
      }

      if (urlInputRef.current) {
        urlInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error classifying image:", error);
      setClassificationError(
        "This image could not be classified. Try uploading another image or use a different image URL."
      );
    } finally {
      setClassifying(false);
    }
  };

  // Runs once when the app first opens: load MobileNet and restore saved progress.
  useEffect(() => {
    initializeModel();

    // It will reads any streak/log data that was saved during an earlier browser session.
    const savedProgress = localStorage.getItem(PROGRESS_KEY);
    if (savedProgress) {
      try {
        const parsedProgress = JSON.parse(savedProgress);
        setCurrentStreak(parsedProgress.currentStreak || 0);
        setTotalLogs(parsedProgress.totalLogs || 0);
        setLastLogDate(parsedProgress.lastLogDate || null);
      } catch (error) {
        console.error("Error reading saved progress:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedImage) {
      setRecentImages((previousImages) => [selectedImage, ...previousImages].slice(0, 8));
    }
  }, [selectedImage]);

  // Allows the user to clear their saved gamification progress and start again.
  const resetProgress = () => {
    const confirmed = window.confirm(
      "Reset your progress? This will clear your food logs, daily streak and achievements. This action cannot be undone."
    );

    if (!confirmed) return;

    setCurrentStreak(0);
    setTotalLogs(0);
    setLastLogDate(null);
    setFeedbackMessage("");
    setNewAchievement("");
    localStorage.removeItem(PROGRESS_KEY);
  };

  const nextAchievement = achievementLevels.find(
    (achievement) => totalLogs < achievement.target
  );
  const previousTarget = nextAchievement
    ? achievementLevels
        .filter((achievement) => achievement.target < nextAchievement.target)
        .reduce((highest, achievement) => Math.max(highest, achievement.target), 0)
    : 10;
  const progressPercent = nextAchievement
    ? Math.min(
        100,
        ((totalLogs - previousTarget) / (nextAchievement.target - previousTarget)) * 100
      )
    : 100;

  return (
    <div className="appShell">
      <header className="appHeader">
        <div>
          <span className="eyebrow">AI-powered nutrition prototype</span>
          <h1 className="pageTitle">NutriLens AI</h1>
          <p className="pageSubtitle">
            Upload a food image, run browser-based recognition and build a consistent logging habit.
          </p>
        </div>
        <div className={`modelStatus ${classifier ? "ready" : "waiting"}`}>
          <span className="statusDot" />
          {loadingModel ? "Loading AI model" : classifier ? "AI model ready" : "Model unavailable"}
        </div>
      </header>

      <main className="mainLayout">
        {/* Main area where the user uploads an image and runs AI recognition. */}
        <section className="workspaceCard">
          <div className="sectionHeading">
            <div>
              <span className="sectionNumber">01</span>
              <h2>Food recognition</h2>
            </div>
            <p>Choose an image from your device or provide an image URL.</p>
          </div>

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
            {!selectedImage && (
              <div className="emptyState">
                <div className="emptyIcon">+</div>
                <h3>Add a food image to begin</h3>
                <p>Your image is processed in the browser by the TensorFlow.js MobileNet model.</p>
              </div>
            )}

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
                  <span className="resultLabel">Recognition results</span>
                  {predictions.map((item, position) => (
                    <div className="predictionCard" key={item.className}>
                      <div>
                        <span className="predictionName">{item.className}</span>
                        {position === 0 && <span className="topMatchBadge">Best Guess</span>}
                      </div>
                      <span className="predictionScore">
                        Confidence {(item.probability * 100).toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {predictions.length > 0 && (
              <div className="nutritionPanel">
                <div className="nutritionHeader">
                  <div>
                    <span className="resultLabel">Estimated nutrition</span>
                    <h3>{nutritionEstimate ? nutritionEstimate.name : "Nutritional information not found"}</h3>
                  </div>
                  <span className="estimateBadge">per 100 g</span>
                </div>

                {nutritionEstimate ? (
                  <>
                    <div className="nutritionGrid">
                      <div><strong>{nutritionEstimate.calories}</strong><span>kcal</span></div>
                      <div><strong>{nutritionEstimate.protein} g</strong><span>protein</span></div>
                      <div><strong>{nutritionEstimate.carbs} g</strong><span>carbohydrate</span></div>
                      <div><strong>{nutritionEstimate.fat} g</strong><span>fat</span></div>
                    </div>
                    <p className="nutritionDisclaimer">
                      Estimated values per 100 g. Actual nutrition varies by ingredients, preparation and portion size.
                    </p>
                  </>
                ) : (
                  <p className="nutritionDisclaimer">
                    Nutritional information was not found for this item.
                  </p>
                )}
              </div>
            )}

            {classificationError && <div className="errorMessage">{classificationError}</div>}

            {selectedImage && (
              <button
                className="identifyButton"
                onClick={runClassification}
                disabled={!classifier || classifying}
              >
                {classifying ? "Identifying..." : "Identify Image"}
              </button>
            )}
          </div>
        </section>

        {/* Gamification dashboard: streak, logs, progress and achievements. */}
        <aside className="progressCard">
          <div className="sectionHeading compact">
            <div>
              <span className="sectionNumber">02</span>
              <h2>Your progress</h2>
            </div>
          </div>

          <div className="statsGrid">
            <div className="statCard">
              <span className="statValue">{currentStreak}</span>
              <span className="statLabel">day streak</span>
            </div>
            <div className="statCard">
              <span className="statValue">{totalLogs}</span>
              <span className="statLabel">food logs</span>
            </div>
          </div>

          <div className="milestoneBlock">
            <div className="milestoneHeader">
              <span>Next milestone</span>
              <strong>{nextAchievement ? `${nextAchievement.target} logs` : "Completed"}</strong>
            </div>
            <div className="progressTrack" aria-label="Milestone progress">
              <div className="progressFill" style={{ width: `${progressPercent}%` }} />
            </div>
            <p>
              {nextAchievement
                ? `${Math.max(0, nextAchievement.target - totalLogs)} more successful ${
                    nextAchievement.target - totalLogs === 1 ? "log" : "logs"
                  } to unlock ${nextAchievement.title}.`
                : "You have unlocked every prototype milestone."}
            </p>
          </div>

          {feedbackMessage && <div className="feedbackMessage">{feedbackMessage}</div>}
          {newAchievement && (
            <div className="achievementMessage">
              <span>Achievement unlocked</span>
              <strong>{newAchievement}</strong>
            </div>
          )}

          <div className="achievementList">
            <h3>Achievements</h3>
            {achievementLevels.map((achievement) => {
              const unlocked = totalLogs >= achievement.target;
              return (
                <div
                  className={`achievementItem ${unlocked ? "unlocked" : "locked"}`}
                  key={achievement.title}
                >
                  <div className="achievementMark">{unlocked ? "✓" : achievement.target}</div>
                  <div>
                    <strong>{achievement.title}</strong>
                    <span>{achievement.description}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="streakNote">
            The streak increases once per consecutive calendar day. Multiple successful logs on the same day increase total logs but do not inflate the daily streak.
          </p>

          <button type="button" className="resetProgressButton" onClick={resetProgress}>
            Reset Progress
          </button>
        </aside>
      </main>

      {recentImages.length > 0 && (
        <section className="historySection">
          <div className="sectionHeading">
            <div>
              <span className="sectionNumber">03</span>
              <h2>Recent Images</h2>
            </div>
            <p>Select an image to classify it again.</p>
          </div>
          <div className="historyGrid">
            {recentImages.map((imageItem, index) => (
              <button
                type="button"
                className="historyCard"
                key={`${imageItem}-${index}`}
                onClick={() => {
                  setSelectedImage(imageItem);
                  setPredictions([]);
                  setFeedbackMessage("");
                  setNewAchievement("");
                }}
              >
                <img src={imageItem} alt={`Recent item ${index + 1}`} />
              </button>
            ))}
          </div>
        </section>
      )}

      
      <footer className="researchNotice">
        <strong>Research prototype:</strong> recognition results are generated by a general-purpose MobileNet model and should not be interpreted as clinical or dietary advice.
      </footer>
    </div>
  );
}

export default App;
