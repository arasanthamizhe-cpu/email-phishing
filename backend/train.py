from model import spam_model
import os

# Training Script
dataset_path = 'backend/data/spam_merged.csv'

if os.path.exists(dataset_path):
    print(f"Found dataset at {dataset_path}")
    print("Starting training (Multinomial Naive Bayes Classifier)...")
    spam_model.train(dataset_path)
else:
    print(f"Dataset not found at {dataset_path}")
