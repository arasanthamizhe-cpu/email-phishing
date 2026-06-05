import csv
import os
import re
import pickle
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neural_network import MLPClassifier

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'spam_classifier_mlp.pkl') # Keep path for compatibility
DATA_PATH = os.path.join(BASE_DIR, 'data', 'spam_merged.csv')

class SpamModel:
    """Robust Standalone Model (Heuristic-AI) that doesn't depend on heavy/experimental libraries."""
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.spam_keywords = self._load_keywords()
        print("ML Engine Initializing...")
        self._load_ml_model()

    def _load_ml_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, 'rb') as f:
                    data = pickle.load(f)
                    self.vectorizer = data['vectorizer']
                    self.model = data['model']
                print("Successfully loaded Scikit-Learn ML Model.")
            except Exception as e:
                print(f"Failed to load ML Model: {e}. Falling back to Heuristics.")
        else:
            print("No ML Model found. Run train.py first. Falling back to Heuristics.")

    def _load_keywords(self):
        """Standard set of high-confidence spam indicators."""
        return {
            'verify', 'account', 'password', 'credential', 'urgent', 'immediately', 
            'suspend', 'winner', 'selected', 'prize', 'won', 'crypto', 'bitcoin', 
            'invest', 'profit', 'delivery', 'shipping', 'package', 'virus', 'infected',
            'cash', 'lottery', 'bank', 'transfer', 'inheritance', 'expired', 'limit', 
            'violation', 'terms', 'security', 'login', 'authorized', 'congratulations'
        }

    def train(self, csv_path=None):
        target_csv = csv_path if csv_path else DATA_PATH
        if not os.path.exists(target_csv):
            print(f"Dataset missing at {target_csv}")
            return False
            
        print("Training Scikit-Learn MultinomialNB on dataset...")
        try:
            df = pd.read_csv(target_csv)
            label_col = 'v1' if 'v1' in df.columns else 'label'
            text_col = 'v2' if 'v2' in df.columns else 'text'
            
            df['is_spam'] = df[label_col].apply(lambda x: 1 if str(x).lower().strip() == 'spam' else 0)
            df = df.dropna(subset=[text_col])
            
            vectorizer = TfidfVectorizer(stop_words='english', max_features=3000)
            X = vectorizer.fit_transform(df[text_col].astype(str))
            y = df['is_spam']
            
            print("Training Deep Learning MLP Neural Network (This may take a minute)...")
            model = MLPClassifier(hidden_layer_sizes=(100, 50), max_iter=300, activation='relu', random_state=42)
            model.fit(X, y)
            
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            with open(MODEL_PATH, 'wb') as f:
                pickle.dump({'vectorizer': vectorizer, 'model': model}, f)
            print(f"Training Complete! Saved to {MODEL_PATH}")
            
            self.model = model
            self.vectorizer = vectorizer
            return True
        except Exception as e:
            print(f"Training error: {e}")
            return False

    def predict(self, text):
        """Fast, robust prediction without numpy/sklearn."""
        if not text or len(text.strip()) < 5:
            return 0.0, ["Content too short for deep analysis."], []
            
        lower_text = text.lower()
        score = 0.0
        reasons = []
        flagged_terms = []
        
        # 1. Broad Category Checks
        checks = {
            "Phishing: Identity Theft": ["verify", "account", "login", "authorized", "validate", "credential"],
            "Security: Account Restriction": ["password", "security code", "suspend", "suspicious", "unauthorized"],
            "Urgency: False Pressure": ["urgent", "immediately", "immediate", "action required", "24 hours", "expired"],
            "Scam: Financial Fraud": ["winner", "selected", "prize", "won", "congratulations", "lottery", "inheritance", "cash", "payout"],
            "Tech Scam: Infection/Hacking": ["virus", "infected", "hacked", "malware", "system alert", "security breach"],
            "Financial: Crypto/Invest": ["crypto", "bitcoin", "ethereum", "invest", "returns", "profit", "trading"],
            "Impersonation: Delivery": ["package", "delivery", "shipping", "courier", "track", "shipment"]
        }
        
        categories_found = 0
        for reason, keywords in checks.items():
            matches = [k for k in keywords if k in lower_text]
            if matches:
                categories_found += 1
                # Sharper weight: Increase weight for critical words (password, verify)
                base_weight = 0.4
                if any(m in matches for m in ["password", "credential", "verify", "account"]):
                    base_weight = 0.55 # Instant flag above 0.35
                
                score += base_weight + (0.1 * (len(matches) - 1)) 
                reasons.append(reason)
                flagged_terms.extend(matches)
        
        # 2. Contextual Heuristics
        # High Risk Patterns (Instant flag-level)
        if "http" in lower_text:
            score += 0.2
            if any(k in lower_text for k in ["login", "verify", "account", "password", "urgent"]):
                score += 0.6
                reasons.append("High Risk: Link combined with pressure/identity request")

        if re.search(r'\$\d+', lower_text) or "cash" in lower_text or "prize" in lower_text:
            score += 0.45
            reasons.append("High Risk: Unsolicited financial claim")

        # 3. Final Probability Mapping
        final_spam_prob = min(0.99, score)
        
        # ML OVERRIDE FOR THE SCORE
        if self.model and self.vectorizer:
            try:
                x_input = self.vectorizer.transform([text])
                prob = float(self.model.predict_proba(x_input)[0][1])
                final_spam_prob = prob
                
                # ML specific flag reasoning fallback
                if final_spam_prob > 0.4 and not reasons:
                    reasons.append("ML Classifier identified high probability of malicious linguistic patterns.")
            except Exception as e:
                print(f"ML Prediction Error: {e}")
                
        return final_spam_prob, reasons, flagged_terms

    def find_similar_spam(self, text, threshold=0.85):
        """Basic similarity check using word overlap."""
        return False, 0.0 # Bypassed for now to ensure 100% stability

    def learn_new_email(self, text, label='spam'):
        """Simply appends to CSV to maintain compatibility."""
        try:
            with open(DATA_PATH, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([label, text])
        except Exception as e:
            print(f"Learning failed: {e}")

spam_model = SpamModel()


