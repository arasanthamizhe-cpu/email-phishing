import pandas as pd
import csv

# Load the large dataset (Tab separated)
try:
    df_large = pd.read_csv('backend/data/SMSSpamCollection', sep='\t', header=None, names=['v1', 'v2'], quoting=csv.QUOTE_NONE)
    print(f"Loaded {len(df_large)} rows from SMS Spam Collection")
except Exception as e:
    print(f"Error loading SMSSpamCollection: {e}")
    df_large = pd.DataFrame(columns=['v1', 'v2'])

# Load the existing manual dataset (CSV)
try:
    df_manual = pd.read_csv('backend/data/spam.csv')
    print(f"Loaded {len(df_manual)} rows from manual spam.csv")
except Exception as e:
    print(f"Error loading spam.csv: {e}")
    df_manual = pd.DataFrame(columns=['v1', 'v2'])

# Merge
df_final = pd.concat([df_large, df_manual], ignore_index=True)

# Shuffle
df_final = df_final.sample(frac=1, random_state=42).reset_index(drop=True)

# Save
df_final.to_csv('backend/data/spam_merged.csv', index=False)
print(f"Saved merged dataset with {len(df_final)} rows to backend/data/spam_merged.csv")
