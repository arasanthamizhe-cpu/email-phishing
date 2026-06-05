from backend.model import spam_model
import os

print("Starting training with enhanced dataset...")
if os.path.exists('backend/data/spam_merged.csv'):
    spam_model.train('backend/data/spam_merged.csv')
else:
    print("Error: merged dataset not found")
