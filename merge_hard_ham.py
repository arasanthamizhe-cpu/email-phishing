import pandas as pd
import os

# Paths
merged_path = 'backend/data/spam_merged.csv'
hard_ham_path = 'backend/data/hard_ham.csv'

# Load
if os.path.exists(merged_path):
    df_main = pd.read_csv(merged_path)
    print(f"Main dataset: {len(df_main)} rows")
else:
    print("Main dataset missing!")
    exit()

if os.path.exists(hard_ham_path):
    df_hard = pd.read_csv(hard_ham_path)
    # Normalize headers to match main (v1, v2)
    if 'label' in df_hard.columns:
        df_hard = df_hard.rename(columns={'label': 'v1', 'text': 'v2'})
    
    # Duplicate these hard examples to give them more weight (oversampling)
    df_hard = pd.concat([df_hard] * 20, ignore_index=True) 
    
    # Normalize main too if seemingly wrong
    if 'label' in df_main.columns:
        df_main = df_main.rename(columns={'label': 'v1', 'text': 'v2'})

    print(f"Hard Ham dataset (oversampled): {len(df_hard)} rows")
    
    # Merge
    df_final = pd.concat([df_main, df_hard], ignore_index=True)
    df_final = df_final.sample(frac=1, random_state=42).reset_index(drop=True)
    
    df_final.to_csv(merged_path, index=False)
    print(f"Merged & Saved: {len(df_final)} rows")
else:
    print("Hard Ham dataset missing!")
