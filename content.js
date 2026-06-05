// --- 1. Configuration & Persistence ---
var HOSTS = ["http://127.0.0.1:5001", "http://localhost:5001", "http://0.0.0.0:5001"];
var latestAnalysisResult = null;

// Modern Gmail Selectors (2025/2026 Layout)
var SELECTORS = {
    SENDER_EMAIL: 'span[email], .gD, .go', 
    SUBJECT: 'h2.hP, .hP', 
    BODY: '.a3s, .adn.ads, .ii.gt, .nH.aHU .a3s',
    ATTACHMENT_LIST: '.hq, .aQH, .aZo'
};

function isExtensionValid() {
    try {
        return !!chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
        return false;
    }
}

function safeLog(msg) { console.log("[Gmail Security] " + msg); }

// --- 3. UI Manipulation ---
// --- 3. UI Manipulation ---
function injectSecurityStyles() {
    if (document.getElementById('security-core-styles')) return;
    var style = document.createElement('style');
    style.id = 'security-core-styles';
    style.textContent = `
        .sec-blocked { filter: blur(40px) grayscale(100%) brightness(0.5) !important; pointer-events: none !important; user-select: none !important; transition: all 0.3s; opacity: 0.1 !important; }
        .sec-overlay { background: #fce8e6; color: #c5221f; padding: 25px; border-radius: 8px; margin: 15px 0; border: 2px solid #d93025; font-family: 'Google Sans', Roboto, sans-serif; box-shadow: 0 4px 12px rgba(217, 48, 37, 0.15); z-index: 9999; display: block !important; }
        .sec-btn { background: #d93025; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 15px; font-size: 14px; text-transform: uppercase; }
        .sec-btn:hover { background: #b3261e; }
        .sec-safe { background: #e6f4ea; color: #1e8e3e; padding: 10px 15px; border-radius: 4px; margin: 10px 0; border: 1px solid #1e8e3e; display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 14px; width: fit-content; }
    `;
    document.head.appendChild(style);
}

function applySpamUI(reasons) {
    injectSecurityStyles();
    document.querySelectorAll(SELECTORS.BODY).forEach(el => el.classList.add('sec-blocked'));
    
    var anchor = document.querySelector(SELECTORS.SUBJECT);
    if (anchor && !document.getElementById('sec-warning')) {
        var banner = document.createElement('div');
        banner.id = 'sec-warning';
        banner.className = 'sec-overlay';
        banner.innerHTML = `
            <div style="display:flex; align-items:flex-start; gap:15px;">
                <span style="font-size:32px; line-height:1;">🚨</span>
                <div>
                    <div style="font-weight:900; font-size: 18px; margin-bottom: 5px; text-transform: uppercase;">DANGER: Malicious Email Blocked</div>
                    <div style="font-size:14px; font-weight: 500; opacity:0.9; margin-bottom: 8px;">The AI Security Engine has automatically blocked this content to protect your system.</div>
                    <div style="font-size:13px; opacity:0.8; background: rgba(0,0,0,0.05); padding: 5px 8px; border-radius: 4px;"><strong>Threat Types:</strong> ${reasons.join(" | ")}</div>
                </div>
            </div>
            <button class="sec-btn" id="sec-unlock">I accept the risk - Show Content</button>
        `;
        anchor.parentElement.insertBefore(banner, anchor.nextSibling);
        document.getElementById('sec-unlock').onclick = () => {
            if(confirm("WARNING: This content contains severe threats (Phishing/Malware). Proceed ONLY if you fully trust this sender!")) clearSecurityUI();
        };
    }
}

function applySafeUI() {
    injectSecurityStyles();
    var anchor = document.querySelector(SELECTORS.SUBJECT);
    if (anchor && !document.querySelector('.sec-safe')) {
        var banner = document.createElement('div');
        banner.className = 'sec-safe';
        banner.innerHTML = `<span>✅ Confirmed Safe: Zero threats detected by AI Engine</span>`;
        anchor.parentElement.insertBefore(banner, anchor.nextSibling);
    }
}

function applyAnalyzingUI() {
    injectSecurityStyles();
    document.querySelectorAll(SELECTORS.BODY).forEach(el => el.classList.add('sec-blocked'));
    
    var anchor = document.querySelector(SELECTORS.SUBJECT);
    if (anchor && !document.getElementById('sec-analyzing')) {
        var banner = document.createElement('div');
        banner.id = 'sec-analyzing';
        banner.className = 'sec-overlay';
        banner.style.borderColor = '#fbbc04';
        banner.style.background = '#fef7e0';
        banner.style.color = '#e65100';
        banner.innerHTML = `<div style="font-weight:bold; font-size:16px;">⏳ Analyzing Email... Please wait.</div>`;
        anchor.parentElement.insertBefore(banner, anchor.nextSibling);
    }
}

function clearSecurityUI() {
    document.querySelectorAll('.sec-blocked').forEach(el => el.classList.remove('sec-blocked'));
    document.querySelectorAll('#sec-warning, .sec-safe, #sec-analyzing').forEach(el => el.remove());
}

function triggerClick(el) {
    if (!el) return;
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
}

function moveToSpam() {
    // Look for all potential spam button elements using aria-label and tooltips
    var spamBtns = document.querySelectorAll('div[data-tooltip*="spam" i], div[aria-label*="spam" i], div[act="9"], .T-I.J-J5-Ji[act="9"]');
    var spamBtn = null;
    
    // Find the first visible spam button
    for (var i = 0; i < spamBtns.length; i++) {
        var rect = spamBtns[i].getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            spamBtn = spamBtns[i];
            break;
        }
    }
    // Fallback
    if (!spamBtn && spamBtns.length > 0) {
        spamBtn = spamBtns[0];
    }
    
    if (spamBtn) {
        safeLog("Moving to Spam via UI button...");
        triggerClick(spamBtn);
        // Also trigger on the inner div just in case it eats the click
        if (spamBtn.firstElementChild) {
            triggerClick(spamBtn.firstElementChild);
        }
    } else {
        safeLog("Spam button not found. Triggering fallback keyboard shortcut.");
        // Try fallback to standard Gmail shortcut "!" for spam if buttons fail
        var event = new KeyboardEvent('keydown', { key: '!', code: 'Digit1', shiftKey: true, bubbles: true });
        document.dispatchEvent(event);
    }
}

function moveToInbox() {
    var targetSelectors = 'button.bz1, .bz1, div[act="8"], div[data-tooltip*="Not spam"], div[aria-label*="Not spam"]';
    var possibleBtns = document.querySelectorAll(targetSelectors);
    var clicked = false;
    
    for (var i = 0; i < possibleBtns.length; i++) {
        var el = possibleBtns[i];
        var rect = el.getBoundingClientRect();
        
        // If it's visible on screen
        if (rect.width > 0 && rect.height > 0) {
            safeLog("Moving to Inbox via: " + (el.className || "Toolbar Button"));
            triggerClick(el);
            if (el.firstElementChild) {
                triggerClick(el.firstElementChild);
            }
            clicked = true;
        }
    }
    
    // Fallback to searching by text if selectors failed
    if (!clicked) {
        var allBtns = document.querySelectorAll('button, div[role="button"]');
        for (var j = 0; j < allBtns.length; j++) {
            var text = (allBtns[j].innerText || "").trim().toLowerCase();
            if (text === "not spam" || text === "report not spam") {
                if (allBtns[j].getBoundingClientRect().width > 0) {
                    safeLog("Moving to Inbox via text fallback...");
                    triggerClick(allBtns[j]);
                    clicked = true;
                }
            }
        }
    }
    
    if (!clicked) {
        safeLog("CRITICAL: Not Spam button completely hidden or missing.");
    }
}

async function analyzeCurrentEmail() {
    if (!isExtensionValid()) return;
    
    var bodyEls = document.querySelectorAll(SELECTORS.BODY);
    var senderEl = document.querySelector(SELECTORS.SENDER_EMAIL);
    var subjectEl = document.querySelector(SELECTORS.SUBJECT);

    if (bodyEls.length === 0 || !senderEl) {
        latestAnalysisResult = {
            verdict: "Safe",
            is_spam: false,
            score: 0,
            reasons: ["No email open. Please open an email to analyze."],
            details: null
        };
        chrome.runtime.sendMessage({ action: "UPDATE_STATUS", data: latestAnalysisResult }).catch(() => {});
        return;
    }

    // Deep Text Extraction
    let extractedBody = "";
    bodyEls.forEach(el => {
        extractedBody += el.innerText + "\n";
    });
    
    var emailData = {
        sender: senderEl.getAttribute('email') || senderEl.innerText,
        subject: subjectEl?.innerText || "No Subject",
        body: extractedBody.substring(0, 5000),
        attachments: Array.from(document.querySelectorAll(SELECTORS.ATTACHMENT_LIST)).map(el => el.innerText).filter(t => t.includes('.')),
        has_qr: extractedBody.toLowerCase().includes("scan qr")
    };

    safeLog("Extracting Live Content...");
    clearSecurityUI();
    applyAnalyzingUI();

    try {
        var resp = await fetch("http://127.0.0.1:5001/analyze", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData)
        });

        if (resp.ok) {
            var result = await resp.json();
            latestAnalysisResult = result;
            console.log("[Gmail Security] Verdict:", result.verdict);
            
            // Clear old UI before applying new one
            clearSecurityUI();

            if (result.is_spam) {
                applySpamUI(result.reasons);
                if (!location.href.includes("#spam/") && !location.href.includes("#trash/")) {
                    setTimeout(moveToSpam, 1500); // Give Gmail UI time to settle
                }
            } else {
                applySafeUI();
                if (location.href.includes("#spam/")) {
                    setTimeout(moveToInbox, 2500); // Spam folder banner takes longer to load
                }
            }
            
            chrome.runtime.sendMessage({ action: "UPDATE_STATUS", data: result }).catch(() => {});
        } else {
            safeLog(`Server error during analysis: HTTP ${resp.status}`);
            console.error("[Gmail Security] Server encountered an error. It might be broken.");
            latestAnalysisResult = {
                verdict: "Error",
                is_spam: false,
                score: 0,
                reasons: [`Server returned error code: ${resp.status}`],
                details: null
            };
            chrome.runtime.sendMessage({ action: "UPDATE_STATUS", data: latestAnalysisResult }).catch(() => {});
        }
    } catch (e) {
        safeLog("Server offline or connection refused.");
        latestAnalysisResult = {
            verdict: "Error",
            is_spam: false,
            score: 0,
            reasons: ["Cannot connect to server. Ensure app.py is running on port 5001."],
            details: null
        };
        chrome.runtime.sendMessage({ action: "UPDATE_STATUS", data: latestAnalysisResult }).catch(() => {});
    }
}

if (isExtensionValid()) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === "GET_STATUS") sendResponse(latestAnalysisResult);
        else if (msg.action === "REANALYZE") analyzeCurrentEmail();
    });
}

// SPAs like Gmail require URL polling for reliable automatic triggers.
var currentUrl = location.href;
setInterval(() => {
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        if (currentUrl.includes("mail.google.com/mail/u/") && !currentUrl.includes("#trash/") && !currentUrl.includes("#settings/")) {
            safeLog("New Email Opened - Analyzing Automatically...");
            setTimeout(analyzeCurrentEmail, 1500); // Wait for Gmail to render text
        }
    }
}, 500);

// Initial Trigger
setTimeout(analyzeCurrentEmail, 1500);

