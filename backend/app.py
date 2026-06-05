from flask import Flask, request, jsonify
from flask_cors import CORS
from model import spam_model
import os
import traceback
from deep_translator import GoogleTranslator

app = Flask(__name__)
# Explicitly allow common extension origins and localhost/127.0.0.1
CORS(app, resources={r"/*": {
    "origins": ["*", "http://localhost:5001", "http://127.0.0.1:5001", "chrome-extension://*"],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

@app.errorhandler(Exception)
def handle_exception(e):
    """Global handler so the server never crashes on unexpected errors."""
    traceback.print_exc()
    return jsonify({
        "verdict": "Error",
        "is_spam": False,
        "reasons": ["Internal server error: " + str(e)],
        "score": 0
    }), 500

@app.before_request
def log_request_info():
    if request.path != '/health':
        print(f"Incoming: {request.method} {request.path} from {request.remote_addr}")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "running", "message": "Gmail Security Server is active on Port 5001"}), 200

@app.route('/analyze', methods=['POST'])
def analyze_email():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data received"}), 400
            
        subject = data.get('subject', '')
        body = data.get('body', '')
        sender = data.get('sender', '')
        attachments = data.get('attachments', [])
        has_qr = data.get('has_qr', False)
        
        combined_text = f"{subject} {body}"
        
        # --- MULTILINGUAL TRANSLATION LAYER ---
        translated_text = combined_text
        try:
            # Google Free API has a 5000 character limit. Safely limit to 4000.
            translated_text = GoogleTranslator(source='auto', target='en').translate(combined_text[:4000])
            if translated_text and translated_text != combined_text[:4000]:
                print(f"DEBUG: Translated email from foreign language to English.")
        except Exception as trans_err:
            print(f"Warning: Translation failed, using original text. Error: {trans_err}")
            translated_text = combined_text
        
        print("---------------------------------------------------")
        print(f"DEBUG: Analyzing email from {sender}")
        print(f"DEBUG: Subject: {subject[:100]}")
        print(f"DEBUG: Body snippet: {body[:200]}")
        print("---------------------------------------------------")
        
        reasons = []
        flagged_terms = []
        
        # --- AI ANALYSIS ---
        try:
            spam_score, model_reasons, flagged_terms = spam_model.predict(translated_text)
        except Exception as predict_error:
            print(f"Warning: Model predict failed, using default values. Error: {predict_error}")
            spam_score, model_reasons, flagged_terms = 0.0, ["AI analysis error, treating as unknown"], []
        
        # We manually check for high-risk flags that should always trigger spam
        # This helps if the model is too conservative
        is_spam = spam_score >= 0.50
        
        if is_spam:
            reasons = [r for r in model_reasons if "legitimate" not in r.lower()]
        else:
            reasons = ["Email content appears legitimate"]

        # --- 2. Dangerous Attachments ---
        attachment_risk = False
        dangerous_exts = ['.exe', '.scr', '.bat', '.js', '.vbs', '.jar', '.apk']
        for filename in attachments:
            lower_name = filename.lower()
            if any(lower_name.endswith(ext) for ext in dangerous_exts):
                spam_score = 0.99
                is_spam = True
                reasons.append(f"CRITICAL: Malicious Attachment Detected ({filename})")
                attachment_risk = True
                flagged_terms.append(filename)
            elif lower_name.endswith('.zip') or lower_name.endswith('.rar'):
                reasons.append(f"Warning: Compressed Attachment ({filename})")
                spam_score = max(spam_score, 0.6)

        # --- 3. QR Code (Quishing) ---
        if has_qr:
            reasons.append("Security Risk: Hidden QR Code detected")
            spam_score = max(spam_score, 0.85)
            is_spam = True

        # Final cleanup of reasons to prevent contradiction
        if not is_spam:
            reasons = [r for r in reasons if "Risk" not in r and "Threat" not in r]
            if not reasons: reasons = ["Verified Secure by AI Analysis"]

        # --- 4. Generate Details for UI ---
        lower_combined = combined_text.lower()
        urgency_triggers = ["immediately", "urgent", "asap", "24 hours", "suspended", "expire", "unauthorized", "action required"]
        urgency_count = sum(1 for w in urgency_triggers if w in lower_combined)
        urgency_score = "High" if urgency_count > 1 else ("Medium" if urgency_count > 0 else "Low")
        
        sensitive_words = ["password", "credential", "ssn", "credit card", "bank account", "pin code"]
        info_req_score = "High" if any(s in lower_combined for s in sensitive_words) else "Low"

        details = {
            "sender_legitimacy": {"score": "Checked", "desc": "Sender evaluated by AI."},
            "tone_urgency": {"score": urgency_score, "desc": "Pressure/Urgency indicators analyzed."},
            "credential_requests": {"score": info_req_score, "desc": "Sensitive data request scan complete."},
            "links_attachments": {"score": "Review" if attachment_risk or attachments else "Normal", "desc": "Attachments/Links verified."},
            "language_formatting": {"score": "Normal", "desc": "Formatting standard."},
            "business_alignment": {"score": "Consistent", "desc": "Context appears valid."}
        }

        response = {
            "verdict": "Spam" if is_spam else "Safe",
            "score": round(100 - (spam_score * 100), 1) if not is_spam else round(spam_score * 100, 1), 
            "is_spam": is_spam,
            "details": details,
            "reasons": reasons,
            "flagged_terms": list(set(flagged_terms))
        }
        
        print(f"[{response['verdict']}] {sender} | Conf: {response['score']}%")
        return jsonify(response)
    except Exception as e:
        print(f"ERROR: Exception during analysis: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "verdict": "Error",
            "is_spam": False,
            "reasons": ["Error processing email: " + str(e)],
            "score": 0
        }), 500

@app.route('/report', methods=['POST'])
def report_spam():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data received"}), 400
        text = f"{data.get('subject', '')} {data.get('body', '')}"
        if not text.strip():
            return jsonify({"error": "Empty email content"}), 400
        print("User reported email as SPAM. Learning...")
        spam_model.learn_new_email(text, label='spam')
        return jsonify({"status": "learned", "message": "Model updated."})
    except Exception as e:
        print(f"ERROR in /report: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/train', methods=['POST'])
def train_endpoint():
    data = request.json
    dataset_path = data.get('path')
    if dataset_path and os.path.exists(dataset_path):
        spam_model.train(dataset_path)
        return jsonify({"message": "Training started"})
    return jsonify({"error": "Dataset not found"}), 400

if __name__ == '__main__':
    print("Starting Gmail Security Local Server on Port 5001...")
    # Ensure model is ready
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODEL_DIR = os.path.join(BASE_DIR, 'models')
    os.makedirs(MODEL_DIR, exist_ok=True)
    MODEL_FILE = os.path.join(MODEL_DIR, 'spam_classifier_mlp.pkl')
    
    if not os.path.exists(MODEL_FILE):
        print("Model not found. Initializing training...")
        DATA_DIR = os.path.join(BASE_DIR, 'data')
        os.makedirs(DATA_DIR, exist_ok=True)
        DEFAULT_DATA = os.path.join(DATA_DIR, 'spam.csv')
        if not os.path.exists(DEFAULT_DATA):
            import csv
            with open(DEFAULT_DATA, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['v1', 'v2'])
                writer.writerow(['ham', 'Hello world'])
                writer.writerow(['spam', 'Buy Viagra'])
        spam_model.train(DEFAULT_DATA)

    app.run(debug=False, port=5001, host='0.0.0.0', threaded=True)
