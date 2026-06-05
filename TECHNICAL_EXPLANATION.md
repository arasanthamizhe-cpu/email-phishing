# System Architecture & Technical Explanation

This document explains exactly how the Gmail Security Extension functions, breaking down every file, program, machine learning model, and library.

---

## 1. The Chrome Extension (Frontend)
This is the part that lives inside your Google Chrome browser. It acts as the "eyes and hands" of the system.

*   **`manifest.json`**: The core configuration file required by Chrome. It tells Chrome what permissions the extension needs (like reading the current tab) and links all the frontend files together.
*   **`content.js`**: The most critical frontend script. It physically injects itself into the Gmail webpage.
    *   *Functioning:* It uses DOM (Document Object Model) selectors to scrape the email sender, subject, body, and attachment names. 
    *   *Processing:* It sends this scraped data to the Python backend via an HTTP request. When the backend replies "Spam!", `content.js` forcefully applies CSS classes to blur the screen (`.sec-blocked`), injects the red warning banner, and uses Javascript to physically simulate mouse clicks on Gmail's "Report Spam" button.
*   **`script.js` & `index.html`**: These power the small popup window that appears when you click the extension icon in the top right of Chrome. They simply ask `content.js` for the latest analysis results and display a visual dashboard.
*   **`styles.css`**: Contains the visual styling for the popup dashboard.

---

## 2. The Python API Server (Backend Gateway)
This is the traffic cop that connects the browser to the artificial intelligence.

*   **`START_SERVER.bat` / `start_hidden.vbs`**: Simple Windows execution scripts that launch the Python server automatically in the background so you don't have to type commands every time you boot your PC.
*   **`backend/app.py`**: The core web server.
    *   *Libraries Used:* `Flask` (to create the web server), `Flask-CORS` (to allow Chrome to talk to the server), and `deep-translator` (to provide multilingual support).
    *   *Processing:* When `content.js` sends an email here, `app.py` intercepts it. It runs the Translation Layer to convert foreign text to English. It then scans for dangerous `.exe` or `.zip` attachments. Finally, it passes the clean, translated text to the ML Model and returns a structured JSON response (Safe/Spam, Score, Reasons) back to Chrome.
*   **`backend/requirements.txt`**: A simple list of all the third-party Python libraries the project needs to run.

---

## 3. The AI & Machine Learning Engine (The Brain)
This is where the actual intelligence lives. It uses complex mathematics to detect threats.

*   **`backend/model.py`**: The Artificial Intelligence interface. 
    *   *Libraries Used:* `pandas` (for dataset manipulation), `scikit-learn` (for machine learning mathematics), and `pickle` (for saving/loading the brain).
    *   *Functioning:* It loads the pre-trained ML model. When `app.py` asks for a prediction, `model.py` converts the text into numbers using the Vectorizer, calculates the mathematical probability of it being spam, and combines that with a Heuristic Ruleset to generate human-readable reasons (like "Credential Request detected").
*   **`backend/train.py` & `train_model_now.py`**: The scripts used to teach the AI.
    *   *Processing:* When you run this, it reads the `spam_merged.csv` file. It maps out the frequency of every word in over 6,400 emails. It trains the `Multinomial Naive Bayes` algorithm on these patterns and compiles the final "brain" into a file.
*   **`backend/models/spam_classifier_mlp.pkl`**: The compiled "Brain". This is a binary file that stores the massive mathematical matrices the AI learned during training. 

---

## 4. The Data (The Experience)
The AI is completely useless without experience to learn from.

*   **`backend/data/spam_merged.csv`**: A massive spreadsheet containing thousands of rows of emails. 
    *   Column `v1` contains the answer key ("spam" or "ham"/safe). 
    *   Column `v2` contains the raw text of the email.
    *   *Functioning:* This file is strictly used during the *training* phase to teach the AI what a bad email looks like versus a good email.

---

## The Complete Workflow (Step-by-Step)
1. You click on a new email in Gmail.
2. `content.js` notices the URL changed and scrapes the email text and attachments.
3. `content.js` sends a POST request with the text to `http://localhost:5001/analyze`.
4. `app.py` receives the text. It uses `deep-translator` to translate it to English.
5. `app.py` checks the attachments. If it sees `virus.exe`, it immediately flags it. If not, it hands the text to `model.py`.
6. `model.py` uses `scikit-learn` to vectorize the text and asks the `.pkl` brain for a probability score.
7. `model.py` returns a score of `0.92` (92% Spam) to `app.py`.
8. `app.py` packages this score into a JSON response and sends it back to `content.js`.
9. `content.js` sees the `is_spam: true` flag. It instantly applies CSS to blur the screen, injects a red warning banner, and triggers a simulated click on the Gmail "Report Spam" button to move it out of your inbox. 
*(Total time: ~1.5 seconds).*
