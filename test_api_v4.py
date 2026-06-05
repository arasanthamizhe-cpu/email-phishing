import urllib.request
import json

URL = "http://127.0.0.1:5000/analyze"

def test_api(sender, subject, body):
    payload = {
        "sender": sender,
        "subject": subject,
        "body": body,
        "attachments": [],
        "has_qr": False
    }
    try:
        req = urllib.request.Request(URL, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as f:
            data = json.loads(f.read().decode('utf-8'))
            print(f"SENDER: {sender}")
            print(f"VERDICT: {data['verdict']} | SCORE: {data['score']}%")
            print(f"REASONS: {data['reasons']}\n")
    except Exception as e:
        print(f"Error calling API: {e}")

print("--- STARTING END-TO-END TEST ---")
test_api("no-reply@google.com", "Security Alert", "Someone signed into your account. Verify it was you.")
test_api("scammer@prize.com", "YOU WON!", "Congratulations! You won $1,000,000. Send bank details now.")
test_api("friend@gmail.com", "Meeting later?", "Hey, are we still meeting for coffee at 5pm? Let me know.")
test_api("admin@g00gle-security.com", "Account Suspended", "Verify your password immediately or lose access forever.")
print("--- TEST COMPLETE ---")
