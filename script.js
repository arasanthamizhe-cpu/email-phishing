// Gmail Security Extension - Popup Script (Version 1.2)

// --- 1. Global Utilities ---
function log(msg) {
    console.log("[Extension Popup] " + msg);
    const el = document.getElementById('status-msg');
    if (el) el.innerText = "Status: " + msg;
}

function showConnectionError(show, customMsg) {
    const el = document.getElementById('connection-error');
    if (!el) return;
    el.style.display = show ? 'block' : 'none';
    if (customMsg && show) {
        const p = el.querySelector('p');
        if (p) {
            p.innerHTML = `<span style="color:#d93025; font-size:14px; display:block; margin-bottom:10px;">🔴 <strong>Action Required:</strong> ${customMsg}</span>` +
                `<div style="border-top:1px solid #f28b82; padding-top:8px;">` +
                `1. Run <strong>python backend/app.py</strong><br>` +
                `2. <strong>Refresh your Gmail tab</strong></div>`;
        }
    }
}

// --- 2. Core Communication Functions ---
function fetchLiveStatus() {
    console.log("[Extension Popup] Polling for status...");
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes("mail.google.com")) return;

        chrome.tabs.sendMessage(tabs[0].id, { action: "GET_STATUS" }, function (response) {
            if (chrome.runtime.lastError) {
                const msg = chrome.runtime.lastError.message;
                if (msg.includes("Receiving end does not exist")) {
                    showConnectionError(true, "Extension Reconnected. Please <strong>Refresh Gmail</strong> to see protection on this page.");
                }
            } else if (response) {
                showConnectionError(false);
                updateUI(response);
            }
        });
    });
}

async function checkHealth() {
    const el = document.getElementById('server-status');
    if (!el) return;

    try {
        const resp = await fetch("http://127.0.0.1:5001/health", { mode: 'cors', cache: 'no-cache' });
        if (resp.ok) {
            el.textContent = "Server: Connected (5001)";
            el.style.color = "#1e8e3e";
            fetchLiveStatus();
        } else {
            throw new Error("HTTP " + resp.status);
        }
    } catch (e) {
        el.textContent = "Server: Offline (5001)";
        el.style.color = "#d93025";
        showConnectionError(true, "Backend server is offline. Run <strong>START_SERVER.bat</strong> to connect.");
    }
}

// --- 3. UI Update Logic ---
function updateUI(data) {
    if (!data) return;
    log("Updating UI with " + (data.is_spam ? "SPAM" : "SAFE") + " score: " + data.score + "%");

    try {
        const statusTextH1 = document.querySelector('.status-text h1');
        const statusIcon = document.querySelector('.status-icon');
        const confidenceScore = document.querySelector('.confidence-badge .score');
        const summaryText = document.querySelector('.analysis-summary');

        if (confidenceScore) {
            confidenceScore.textContent = Math.round(data.score || 0) + "%";
        }

        if (statusTextH1) {
            if (data.is_spam) {
                statusTextH1.innerHTML = `This email <br>appears to be <br><span style="color: #d93025; font-weight:700;">SPAM</span>`;
                if (statusIcon) {
                    statusIcon.style.color = '#d93025';
                    statusIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="3"/><line x1="12" y1="16" x2="12" y2="16" stroke-width="3"/></svg>`;
                }
            } else {
                statusTextH1.innerHTML = `This email <br>appears to be <br><span style="color: #1e8e3e; font-weight:700;">SAFE</span>`;
                if (statusIcon) {
                    statusIcon.style.color = '#1e8e3e';
                    statusIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke-width="3"/></svg>`;
                }
            }
        }

        if (summaryText) {
            const isSpam = !!data.is_spam;
            const bgColor = isSpam ? '#fff1f0' : '#f6ffed';
            const borderColor = isSpam ? '#ffa39e' : '#b7eb8f';
            const titleColor = isSpam ? '#cf1322' : '#389e0d';
            const title = isSpam ? '🚨 High Risk Detected' : '✅ Analysis: Content Safe';

            let reasonContent = "";
            if (data.reasons && Array.isArray(data.reasons) && data.reasons.length > 0) {
                reasonContent = `<ul style='margin:12px 0 0 18px; padding:0; list-style-type: disc; color: #333; font-size: 13px;'>` +
                    data.reasons.map(r => `<li style="margin-bottom:6px; line-height:1.4;"><strong>Reason:</strong> ${r}</li>`).join("") +
                    "</ul>";
            } else if (!isSpam) {
                reasonContent = `<div style="margin-top:8px; font-size:13px; color: #666;">This email structure and tone appear normal for business communication.</div>`;
            }

            summaryText.innerHTML = `
                <div style="background: ${bgColor}; border: 1.5px solid ${borderColor}; padding: 15px; border-radius: 10px;">
                    <strong style="color: ${titleColor}; font-size: 15px; display: block;">${title}</strong>
                    ${reasonContent}
                </div>`;
        }

        // Detailed Cards
        if (data.details) {
            updateCard(1, data.details.sender_legitimacy?.desc, data.details.sender_legitimacy?.score === 'Low' ? 'HIGH' : 'Low', data.is_spam);
            updateCard(2, data.details.tone_urgency?.desc, data.details.tone_urgency?.score === 'High' ? 'HIGH' : 'Low', data.details.tone_urgency?.score === 'High');
            updateCard(3, data.details.credential_requests?.desc, data.details.credential_requests?.score === 'Medium' ? 'MED' : 'Low', false);
            updateCard(4, data.details.links_attachments?.desc, data.details.links_attachments?.score === 'Review' ? 'MED' : 'Low', data.is_spam);
            updateCard(5, data.details.language_formatting?.desc, 'Low', false);
            updateCard(6, data.details.business_alignment?.desc, data.details.business_alignment?.score === 'Mismatch' ? 'HIGH' : 'Low', data.is_spam);
        }

        // Keywords
        const flaggedSection = document.getElementById('flagged-section');
        const flaggedList = document.getElementById('flagged-keywords-list');
        if (flaggedSection && flaggedList) {
            if (data.flagged_terms && data.flagged_terms.length > 0) {
                flaggedSection.style.display = 'block';
                flaggedList.innerHTML = data.flagged_terms.map(term => `<span class="keyword-tag">${term}</span>`).join('');
            } else {
                flaggedSection.style.display = 'none';
            }
        }
    } catch (err) {
        log("UI Update Error: " + err.message);
    }
}

function updateCard(index, text, riskLevel, isRed) {
    try {
        const card = document.querySelector(`.risk-item:nth-child(${index})`);
        if (!card) return;
        const desc = card.querySelector('.risk-desc');
        const impact = card.querySelector('.risk-impact');
        if (desc && text) desc.textContent = text;
        if (impact) {
            impact.textContent = "Impact: " + (riskLevel || "Low");
            if (isRed || riskLevel === 'HIGH') {
                impact.style.backgroundColor = "#fce8e6";
                impact.style.color = "#c5221f";
            } else {
                impact.style.backgroundColor = "#f1f3f4";
                impact.style.color = "#5f6368";
            }
        }
    } catch (e) { }
}

// --- 4. Initialization ---
document.addEventListener('DOMContentLoaded', function () {
    log("Popup script initialized.");

    // Initial Health and Status
    checkHealth();
    fetchLiveStatus();

    // Polling
    setInterval(checkHealth, 4000);

    // Message Listener for live updates from content script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function (message) {
            if (message.action === "UPDATE_STATUS") {
                log("Received background update.");
                updateUI(message.data);
            }
        });
    }

    // Button Listeners
    document.getElementById('retry-btn')?.addEventListener('click', function () {
        checkHealth();
        fetchLiveStatus();
    });

    document.getElementById('simulate-spam-btn')?.addEventListener('click', async function () {
        log("Simulating high-risk threat...");
        const payload = {
            subject: "Urgent: Account Suspended",
            body: "Your account has been suspended due to unauthorized access. Please verify your password immediately at this link.",
            sender: "security-alert@fake-update.com"
        };
        
        try {
            const resp = await fetch("http://127.0.0.1:5001/analyze", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                const result = await resp.json();
                updateUI(result);
                log("Simulation complete: Spam detected.");
            }
        } catch (e) {
            log("Simulation failed: " + e.message);
        }
    });

    document.getElementById('reanalyze-btn')?.addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes("mail.google.com")) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "REANALYZE" });
                log("Re-analysis requested...");
            }
        });
    });

    // Accordion Logic
    document.querySelectorAll('.risk-item').forEach(function (item) {
        item.addEventListener('click', function () {
            item.classList.toggle('active');
        });
    });

    // Storage Recovery
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['latestAnalysis'], function (result) {
                if (result.latestAnalysis) {
                    log("Restoring previous analysis from storage.");
                    updateUI(result.latestAnalysis);
                }
            });
        }
    } catch (e) {
        log("Storage access failed: " + e.message);
    }
});
