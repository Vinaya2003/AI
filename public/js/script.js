// PWA Installation
let deferredPrompt;
const installButton = document.createElement('button');
installButton.style.display = 'none';
installButton.textContent = 'Install App';
document.body.appendChild(installButton);

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.style.display = 'block';
});

installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
        installButton.style.display = 'none';
    }
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/public/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const messageScreen = document.getElementById('message-screen');
const adminScreen = document.getElementById('admin-screen');
const sosScreen = document.getElementById('sos-screen');
const assistiveOverlay = document.getElementById('assistive-overlay');
const assistiveFeedback = document.getElementById('assistive-feedback');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const userTypeSelect = document.getElementById('user-type');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const backBtn = document.getElementById('back-btn');
const screenTitle = document.getElementById('screen-title');
const userInfo = document.getElementById('user-info');
const gestureContainer = document.getElementById('gesture-container');
const messagesContainer = document.getElementById('messages-container');
const adminMessagesContainer = document.getElementById('admin-messages-container');
const messageText = document.getElementById('message-text');
const adminMessageText = document.getElementById('admin-message-text');
const voiceInputBtn = document.getElementById('voice-input-btn');
const sendBtn = document.getElementById('send-btn');
const adminSendBtn = document.getElementById('admin-send-btn');
const cancelSosBtn = document.getElementById('cancel-sos-btn');

// Admin password modal elements
const adminPasswordModal = document.getElementById('admin-password-modal');
const adminPasswordInput = document.getElementById('admin-password');
const adminPasswordSubmit = document.getElementById('admin-password-submit');
const adminPasswordCancel = document.getElementById('admin-password-cancel');
const adminPasswordError = document.getElementById('admin-password-error');

// Admin password (in a real app, this would be securely stored)
const ADMIN_PASSWORD = 'test';

// Sample users for demo
const users = {
    admin: { username: 'admin', password: 'admin123', type: 'admin' },
    client: { username: 'user', password: 'user123', type: 'client' }
};

// Current user and app state
let currentUser = null;
let currentScreen = 'login';
let isRecording = false;
let messagePollingInterval = null; // For real-time message polling

// Sample messages for demo
const messages = [
    {
        sender: 'admin',
        content: 'Welcome to Vision Voice! How can I help you today?',
        timestamp: new Date()
    },
    {
        sender: 'client',
        content: 'Hello, I need assistance with navigation.',
        timestamp: new Date()
    }
];

// Make messages array globally accessible
window.messages = messages;

// Initialize the application
function initApp() {
    // Load saved messages from localStorage
    const savedMessages = localStorage.getItem('visionVoiceMessages');
    if (savedMessages) {
        try {
            const parsedMessages = JSON.parse(savedMessages);
            if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                // Convert string timestamps back to Date objects
                parsedMessages.forEach(msg => {
                    msg.timestamp = new Date(msg.timestamp);
                });
                // Replace the messages array with saved messages
                while (messages.length) messages.pop(); // Clear array
                parsedMessages.forEach(msg => messages.push(msg)); // Add saved messages
                console.log("Loaded saved messages:", messages.length);
            }
        } catch (e) {
            console.error("Error loading saved messages:", e);
        }
    }

    // Add event listeners for direct access buttons
    const clientBtn = document.getElementById('client-btn');
    const adminBtn = document.getElementById('admin-btn');
    
    if (clientBtn) {
        clientBtn.addEventListener('click', () => directAccess('client'));
    }
    
    if (adminBtn) {
        adminBtn.addEventListener('click', showAdminPasswordModal);
    }
    
    // Handle back button - need to select all instances since they share the same ID
    const backButtons = document.querySelectorAll('#back-btn');
    backButtons.forEach(btn => {
        btn.addEventListener('click', navigateBack);
    });
    
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    
    // Add admin send button listener
    const adminSendButton = document.getElementById('admin-send-btn');
    if (adminSendButton) {
        adminSendButton.addEventListener('click', sendAdminMessage);
        console.log('Admin send button listener added');
    } else {
        console.warn('Admin send button not found');
    }
    
    if (voiceInputBtn) voiceInputBtn.addEventListener('click', toggleVoiceInput);
    if (cancelSosBtn) cancelSosBtn.addEventListener('click', cancelSOS);
    
    // Add tap event to the entire document for client accessibility
    document.addEventListener('click', handleScreenTap);
    
    // Initialize speech synthesis and recognition for client users
    initSpeechSynthesis();
    initSpeechRecognition();
    
    // Initialize gesture detection for client users
    initGestureDetection();
    
    // Initialize camera functionality
    if (typeof initCameraFunctionality === 'function') {
        initCameraFunctionality();
    }
    
    // Log initialization status
    console.log('App initialized with', messages.length, 'messages');
    
    // Announce app loaded only for screen readers
    speakText("Vision Voice app loaded. Select client or admin to continue.");
    
    // Initialize admin dashboard buttons
    initAdminDashboard();
}

// Function for direct access (no login required)
function directAccess(userType) {
    // Set the current user based on type
    if (userType === 'admin') {
        currentUser = { ...users.admin, username: 'Admin' };
        userInfo.textContent = 'Admin';
        navigateTo('admin');
        
        // Get device information for admin dashboard
        updateClientDeviceInfo();
    } else if (userType === 'client') {
        currentUser = { ...users.client, username: 'Client' };
        userInfo.textContent = 'Client';
        navigateTo('main');
        speakText(`Welcome. Swipe up to send message, swipe down to read the last message from admin.`);
        
        // Store client device info in localStorage
        storeClientDeviceInfo();
    }
    
    // Start real-time message polling
    startMessagePolling();
}

// Store client device information when a client logs in
function storeClientDeviceInfo() {
    // Gather comprehensive device information
    const deviceInfo = {
        userAgent: navigator.userAgent,
        deviceName: getDeviceName(),
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        colorDepth: window.screen.colorDepth,
        connection: getConnectionInfo(),
        lastActive: new Date().toISOString(),
        // Try to get more detailed device info from client hints if available
        brandInfo: getBrandModel()
    };
    
    localStorage.setItem('clientDeviceInfo', JSON.stringify(deviceInfo));
    
    // Update activity status periodically while client is active
    const updateActivity = () => {
        const stored = localStorage.getItem('clientDeviceInfo');
        if (stored) {
            try {
                const info = JSON.parse(stored);
                info.lastActive = new Date().toISOString();
                // Also update connection info in case it changed
                info.connection = getConnectionInfo();
                localStorage.setItem('clientDeviceInfo', JSON.stringify(info));
            } catch (e) {
                console.error('Error updating client activity:', e);
            }
        }
    };
    
    // Update activity every 5 seconds while client is active
    if (currentUser && currentUser.type === 'client') {
        setInterval(updateActivity, 5000);
    }
    
    console.log('Real-time client device info stored:', deviceInfo);
}

// Try to get device brand and model from client hints API
function getBrandModel() {
    // Check if User-Agent Client Hints are supported
    if (navigator.userAgentData) {
        return new Promise((resolve) => {
            navigator.userAgentData.getHighEntropyValues([
                "platform", "platformVersion", "model", "brand"
            ]).then(ua => {
                resolve({
                    brand: ua.brand,
                    model: ua.model,
                    platform: ua.platform,
                    platformVersion: ua.platformVersion
                });
            }).catch(error => {
                console.log('Error getting client hints:', error);
                resolve(null);
            });
        });
    }
    return null;
}

// Get connection information if available
function getConnectionInfo() {
    // Check if Network Information API is available
    if (navigator.connection) {
        return {
            type: navigator.connection.effectiveType || 'unknown',
            downlink: navigator.connection.downlink || 'unknown',
            rtt: navigator.connection.rtt || 'unknown',
            saveData: navigator.connection.saveData || false
        };
    }
    return 'unknown';
}

// Update client device information in the admin dashboard
function updateClientDeviceInfo() {
    const clientInfoSection = document.querySelector('.client-info-section');
    const deviceNameElement = document.querySelector('.client-device .device-name');
    const deviceInfoElement = document.querySelector('.client-device .device-info');
    
    if (!deviceNameElement || !deviceInfoElement || !clientInfoSection) return;
    
    // Try to get actual client device info from localStorage
    const storedInfo = localStorage.getItem('clientDeviceInfo');
    
    if (storedInfo) {
        try {
            const deviceInfo = JSON.parse(storedInfo);
            
            // Try to get the most accurate device name
            let deviceName = "Unknown Device";
            
            // Check for client hints API info first (most accurate)
            if (deviceInfo.brandInfo && deviceInfo.brandInfo.model) {
                deviceName = `${deviceInfo.brandInfo.brand} ${deviceInfo.brandInfo.model}`;
            } else {
                // Fall back to user agent detection
                deviceName = deviceInfo.deviceName || getDeviceNameFromUserAgent(deviceInfo.userAgent);
            }
            
            // Check if the client info is recent (less than 30 seconds old for real-time status)
            const lastActive = new Date(deviceInfo.lastActive || 0);
            const timeSinceActive = new Date() - lastActive;
            const isActive = timeSinceActive < 30 * 1000; // 30 seconds
            const isRecent = timeSinceActive < 2 * 60 * 1000; // 2 minutes
            
            // Set appropriate status text with timing
            let statusText = "";
            if (isActive) {
                statusText = "Active Now";
                clientInfoSection.classList.add('active-client');
                clientInfoSection.classList.remove('recent-client', 'inactive-client');
            } else if (isRecent) {
                const secondsAgo = Math.floor(timeSinceActive / 1000);
                statusText = `Active ${secondsAgo}s ago`;
                clientInfoSection.classList.remove('active-client', 'inactive-client');
                clientInfoSection.classList.add('recent-client');
            } else {
                const minutesAgo = Math.floor(timeSinceActive / (60 * 1000));
                statusText = minutesAgo < 60 
                    ? `Inactive (${minutesAgo}m ago)` 
                    : `Inactive (${Math.floor(minutesAgo / 60)}h ago)`;
                clientInfoSection.classList.remove('active-client', 'recent-client');
                clientInfoSection.classList.add('inactive-client');
            }
            
            // Build complete HTML for the device info
            let htmlContent = '';
            
            // First, create the name and status
            htmlContent += `<div class="device-name">
                <strong>${deviceName}</strong> 
                <span class="status-indicator ${isActive ? 'active' : isRecent ? 'recent' : 'inactive'}">
                    ${isActive ? '<span class="pulse-indicator"></span>' : ''}
                    (${statusText})
                </span>
            </div>`;
            
            // Create a more detailed device description
            let connectionText = '';
            if (deviceInfo.connection && deviceInfo.connection !== 'unknown') {
                if (typeof deviceInfo.connection === 'object' && deviceInfo.connection.type) {
                    connectionText = deviceInfo.connection.type.toUpperCase();
                    // Add connection speed if available
                    if (deviceInfo.connection.downlink) {
                        connectionText += ` (${deviceInfo.connection.downlink} Mbps)`;
                    }
                } else if (typeof deviceInfo.connection === 'string') {
                    connectionText = deviceInfo.connection;
                }
            }
            
            // Get OS version if available
            let osInfo = '';
            if (deviceInfo.brandInfo && deviceInfo.brandInfo.platform && deviceInfo.brandInfo.platformVersion) {
                osInfo = `${deviceInfo.brandInfo.platform} ${deviceInfo.brandInfo.platformVersion}`;
            } else if (deviceInfo.userAgent) {
                // Extract OS info from user agent
                if (deviceInfo.userAgent.match(/Android\s+([\d\.]+)/i)) {
                    osInfo = `Android ${deviceInfo.userAgent.match(/Android\s+([\d\.]+)/i)[1]}`;
                } else if (deviceInfo.userAgent.match(/iPhone\s+OS\s+([\d_]+)/i)) {
                    osInfo = `iOS ${deviceInfo.userAgent.match(/iPhone\s+OS\s+([\d_]+)/i)[1].replace(/_/g, '.')}`;
                } else if (deviceInfo.userAgent.match(/Windows NT\s+([\d\.]+)/i)) {
                    const winVer = deviceInfo.userAgent.match(/Windows NT\s+([\d\.]+)/i)[1];
                    if (winVer === '10.0') osInfo = 'Windows 10/11';
                    else if (winVer === '6.3') osInfo = 'Windows 8.1';
                    else if (winVer === '6.2') osInfo = 'Windows 8';
                    else if (winVer === '6.1') osInfo = 'Windows 7';
                    else osInfo = `Windows (${winVer})`;
                }
            }
            
            // Display additional device details
            const resolutionText = deviceInfo.screenWidth && deviceInfo.screenHeight 
                ? `${deviceInfo.screenWidth}×${deviceInfo.screenHeight}` 
                : '';
                
            // Add detailed info section
            let detailsContent = '';
            
            if (osInfo) {
                detailsContent += `<span class="os-info">${osInfo}</span>`;
            }
            
            if (connectionText) {
                if (detailsContent) detailsContent += ' • ';
                detailsContent += `<span class="connection-type">${connectionText}</span>`;
            }
            
            if (resolutionText) {
                if (detailsContent) detailsContent += ' • ';
                detailsContent += `<span class="resolution">${resolutionText}</span>`;
            }
            
            // Add a last active timestamp
            const lastActiveTime = new Date(deviceInfo.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            if (detailsContent) detailsContent += ' • ';
            detailsContent += `<span class="last-seen">Last seen: ${lastActiveTime}</span>`;
            
            // Add the device details to the main HTML content
            if (detailsContent) {
                htmlContent += `<div class="device-details">${detailsContent}</div>`;
            }
            
            // Update the DOM with all the info
            deviceInfoElement.innerHTML = htmlContent;
        } catch (e) {
            console.error('Error parsing client device info:', e);
            // Fall back to default device name if stored data is invalid
            setDefaultDeviceName(deviceInfoElement);
        }
    } else {
        // No stored client info, use default
        setDefaultDeviceName(deviceInfoElement);
        // Remove active classes
        clientInfoSection.classList.remove('active-client', 'recent-client');
        clientInfoSection.classList.add('inactive-client');
    }
}

// Set default device name when no client info is available
function setDefaultDeviceName(deviceInfoElement) {
    deviceInfoElement.innerHTML = `
        <div class="device-name">
            <strong>Waiting for device...</strong> 
            <span class="status-indicator inactive">(No Data)</span>
        </div>
        <div class="device-details">
            <span class="no-client-data">No client connection data available</span>
        </div>`;
}

// Get device name based on user agent and platform
function getDeviceName() {
    try {
        const ua = navigator.userAgent;
        const platform = navigator.platform;
        
        // Try to get more accurate device info using client hints if available
        if (navigator.userAgentData) {
            try {
                // Request high-entropy values which may include the device model
                return navigator.userAgentData.getHighEntropyValues(["platform", "platformVersion", "model", "architecture"])
                    .then(data => {
                        if (data.model) {
                            return `${data.model} (${data.platform})`;
                        }
                        return getDeviceNameFromUserAgent(ua, platform);
                    })
                    .catch(err => {
                        console.log('Error getting detailed device info:', err);
                        return getDeviceNameFromUserAgent(ua, platform);
                    });
            } catch (e) {
                console.log('Error with client hints API:', e);
                return getDeviceNameFromUserAgent(ua, platform);
            }
        }
        
        return getDeviceNameFromUserAgent(ua, platform);
    } catch (e) {
        console.error('Error detecting device:', e);
        return "Unknown Device";
    }
}

// Extract device name from user agent string
function getDeviceNameFromUserAgent(ua, platform) {
    if (!ua) return "Unknown Device";
    
    let deviceName = "Unknown Device";
    
    // More comprehensive device detection
    // Mobile devices first
    if (ua.match(/iPhone/i)) {
        // Try to identify iPhone models more precisely
        if (ua.match(/iPhone.*OS 17/i)) deviceName = "iPhone 15 Series";
        else if (ua.match(/iPhone.*OS 16/i)) deviceName = "iPhone 14 Series";
        else if (ua.match(/iPhone.*OS 15/i)) deviceName = "iPhone 13 Series";
        else if (ua.match(/iPhone.*OS 14/i)) deviceName = "iPhone 12 Series";
        else {
            // Map common iPhone identifiers to names
            const match = ua.match(/iPhone(?:\d+,\d+)?/i);
            const model = match ? match[0] : "iPhone";
            if (model.match(/iPhone15,\d+/)) deviceName = "iPhone 15";
            else if (model.match(/iPhone14,\d+/)) deviceName = "iPhone 14";
            else if (model.match(/iPhone13,\d+/)) deviceName = "iPhone 13";
            else if (model.match(/iPhone12,\d+/)) deviceName = "iPhone 12";
            else deviceName = "iPhone";
        }
    } 
    // Samsung devices
    else if (ua.match(/SAMSUNG|SM-|Galaxy/i)) {
        if (ua.match(/SAMSUNG SM-S9|SM-S9\d+/i)) deviceName = "Samsung Galaxy S24";
        else if (ua.match(/SAMSUNG SM-S9|SM-S91/i)) deviceName = "Samsung Galaxy S23";
        else if (ua.match(/SAMSUNG SM-S9|SM-S90/i)) deviceName = "Samsung Galaxy S22";
        else if (ua.match(/SAMSUNG SM-G99|SM-G99/i)) deviceName = "Samsung Galaxy S21";
        else if (ua.match(/SAMSUNG SM-G98|SM-G98/i)) deviceName = "Samsung Galaxy S20";
        else if (ua.match(/SAMSUNG SM-G97|SM-G97/i)) deviceName = "Samsung Galaxy S10";
        else if (ua.match(/SAMSUNG SM-G96|SM-G96/i)) deviceName = "Samsung Galaxy S9";
        else if (ua.match(/SAMSUNG SM-G95|SM-G95/i)) deviceName = "Samsung Galaxy S8";
        else if (ua.match(/Galaxy Note/i)) {
            const noteMatch = ua.match(/Galaxy Note\s*(\d+)/i);
            deviceName = noteMatch ? `Samsung ${noteMatch[0]}` : "Samsung Galaxy Note";
        }
        else if (ua.match(/Galaxy A/i)) {
            const aMatch = ua.match(/Galaxy A\d+/i);
            deviceName = aMatch ? `Samsung ${aMatch[0]}` : "Samsung Galaxy A Series";
        }
        // Extract SM-XXXX model
        else if (ua.match(/SM-[A-Z0-9]+/i)) {
            const modelMatch = ua.match(/SM-[A-Z0-9]+/i);
            deviceName = `Samsung ${modelMatch[0]}`;
        }
        else deviceName = "Samsung Galaxy Device";
    }
    // Google Pixel
    else if (ua.match(/Pixel/i)) {
        if (ua.match(/Pixel 8 Pro/i)) deviceName = "Google Pixel 8 Pro";
        else if (ua.match(/Pixel 8/i)) deviceName = "Google Pixel 8";
        else if (ua.match(/Pixel 7a/i)) deviceName = "Google Pixel 7a";
        else if (ua.match(/Pixel 7 Pro/i)) deviceName = "Google Pixel 7 Pro";
        else if (ua.match(/Pixel 7/i)) deviceName = "Google Pixel 7";
        else if (ua.match(/Pixel 6a/i)) deviceName = "Google Pixel 6a";
        else if (ua.match(/Pixel 6 Pro/i)) deviceName = "Google Pixel 6 Pro";
        else if (ua.match(/Pixel 6/i)) deviceName = "Google Pixel 6";
        else {
            const pixelMatch = ua.match(/Pixel\s+\d+[a-z]*/i);
            deviceName = pixelMatch ? `Google ${pixelMatch[0]}` : "Google Pixel";
        }
    }
    // Motorola devices
    else if (ua.match(/motorola|moto/i)) {
        if (ua.match(/edge\s+50\s+pro/i)) deviceName = "Motorola Edge 50 Pro";
        else if (ua.match(/edge\s+50\s+ultra/i)) deviceName = "Motorola Edge 50 Ultra";
        else if (ua.match(/edge\s+50\s+fusion/i)) deviceName = "Motorola Edge 50 Fusion";
        else if (ua.match(/edge\s+50/i)) deviceName = "Motorola Edge 50";
        else if (ua.match(/edge\s+40\s+pro/i)) deviceName = "Motorola Edge 40 Pro";
        else if (ua.match(/edge\s+40/i)) deviceName = "Motorola Edge 40";
        else if (ua.match(/edge\s+\d+/i)) {
            const edgeMatch = ua.match(/edge\s+\d+[a-z\s]*/i);
            deviceName = edgeMatch ? `Motorola ${edgeMatch[0]}` : "Motorola Edge";
        }
        else if (ua.match(/razr/i)) deviceName = "Motorola Razr";
        else if (ua.match(/moto\s+g/i)) {
            const gMatch = ua.match(/moto\s+g[^\s;)]+/i);
            deviceName = gMatch ? `Motorola ${gMatch[0]}` : "Motorola Moto G";
        }
        else {
            // Try to extract the model name from user agent
            const motoMatch = ua.match(/moto\s+[a-z0-9]+/i);
            deviceName = motoMatch ? `Motorola ${motoMatch[0]}` : "Motorola Device";
        }
    }
    // OnePlus devices
    else if (ua.match(/OnePlus/i)) {
        const oneplus = ua.match(/OnePlus\s+\d+\s*(?:Pro|T|R|Nord)?/i);
        deviceName = oneplus ? oneplus[0] : "OnePlus Device";
    }
    // Xiaomi/Redmi devices
    else if (ua.match(/Mi\s+\d+/i)) {
        const mi = ua.match(/Mi\s+\d+[^\s;)]+/i);
        deviceName = mi ? `Xiaomi ${mi[0]}` : "Xiaomi Device";
    }
    else if (ua.match(/Redmi/i)) {
        const redmi = ua.match(/Redmi[^\s;)]+/i);
        deviceName = redmi ? `Xiaomi ${redmi[0]}` : "Redmi Device";
    }
    else if (ua.match(/POCO/i)) {
        const poco = ua.match(/POCO[^\s;)]+/i);
        deviceName = poco ? `Xiaomi ${poco[0]}` : "POCO Device";
    }
    else if (ua.match(/Xiaomi/i)) deviceName = "Xiaomi Device";
    // Other common brands
    else if (ua.match(/OPPO/i)) {
        const oppo = ua.match(/OPPO[^\s;)]+/i);
        deviceName = oppo ? oppo[0] : "OPPO Device";
    }
    else if (ua.match(/vivo/i)) {
        const vivo = ua.match(/vivo[^\s;)]+/i);
        deviceName = vivo ? vivo[0] : "Vivo Device";
    }
    else if (ua.match(/Huawei/i)) {
        const huawei = ua.match(/Huawei[^\s;)]+/i);
        deviceName = huawei ? huawei[0] : "Huawei Device";
    }
    else if (ua.match(/Nokia/i)) {
        const nokia = ua.match(/Nokia[^\s;)]+/i);
        deviceName = nokia ? nokia[0] : "Nokia Device";
    }
    else if (ua.match(/LG/i)) {
        const lg = ua.match(/LG[^\s;)]+/i);
        deviceName = lg ? lg[0] : "LG Device";
    }
    else if (ua.match(/Sony/i)) {
        const sony = ua.match(/Sony[^\s;)]+/i);
        deviceName = sony ? sony[0] : "Sony Device";
    }
    else if (ua.match(/HTC/i)) {
        const htc = ua.match(/HTC[^\s;)]+/i);
        deviceName = htc ? htc[0] : "HTC Device";
    }
    // More general Android detection
    else if (ua.match(/Android/i)) {
        // Try to extract Android device model
        const modelMatch = ua.match(/Android[\s\/][\d\.]+;\s*([^;)]+)/i);
        const model = modelMatch ? modelMatch[1].trim() : "Android Device";
        
        // Clean up common patterns in model names
        deviceName = model
            .replace(/Build\/[^\s]+/, '')
            .replace(/SAMSUNG\s*/i, 'Samsung ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }
    // Tablets and other devices
    else if (ua.match(/iPad/i)) {
        if (ua.match(/iPad.*OS 17/i)) deviceName = "iPad (iPadOS 17)";
        else if (ua.match(/iPad.*OS 16/i)) deviceName = "iPad (iPadOS 16)";
        else if (ua.match(/iPad.*OS 15/i)) deviceName = "iPad (iPadOS 15)";
        else deviceName = "iPad";
    }
    else if (ua.match(/Windows Phone/i)) deviceName = "Windows Phone";
    // Desktop systems
    else if (ua.match(/Macintosh/i)) {
        // Try to get Mac model
        if (ua.match(/Mac OS X 14/i)) deviceName = "Mac (Sonoma)";
        else if (ua.match(/Mac OS X 13/i)) deviceName = "Mac (Ventura)";
        else if (ua.match(/Mac OS X 12/i)) deviceName = "Mac (Monterey)";
        else if (ua.match(/Mac OS X 11/i)) deviceName = "Mac (Big Sur)";
        else deviceName = "Mac Device";
    }
    else if (ua.match(/Windows/i)) {
        // Get computer name if available or Windows version
        let computerName = "";
        try {
            // This is a privacy-sensitive operation and may not work in all browsers
            if (window.navigator && window.navigator.mediaDevices) {
                window.navigator.mediaDevices.enumerateDevices()
                    .then(devices => {
                        for (const device of devices) {
                            if (device.label && device.label.includes('(')) {
                                const parts = device.label.split('(');
                                if (parts.length > 1) {
                                    computerName = parts[1].replace(')', '').trim();
                                    break;
                                }
                            }
                        }
                    })
                    .catch(error => console.log('Error getting device names:', error));
            }
        } catch (e) {
            console.log('Error trying to get computer name:', e);
        }
        
        if (computerName) {
            deviceName = `PC (${computerName})`;
        } else {
            if (ua.match(/Windows NT 10\.0/i)) deviceName = "Windows 11/10 PC";
            else if (ua.match(/Windows NT 6\.3/i)) deviceName = "Windows 8.1 PC";
            else if (ua.match(/Windows NT 6\.2/i)) deviceName = "Windows 8 PC";
            else if (ua.match(/Windows NT 6\.1/i)) deviceName = "Windows 7 PC";
            else deviceName = "Windows PC";
        }
    }
    else if (ua.match(/Linux/i)) {
        if (ua.match(/Ubuntu/i)) deviceName = "Ubuntu Linux";
        else if (ua.match(/Fedora/i)) deviceName = "Fedora Linux";
        else if (ua.match(/Debian/i)) deviceName = "Debian Linux";
        else if (ua.match(/CentOS/i)) deviceName = "CentOS Linux";
        else deviceName = "Linux Device";
    }
    
    // If all detection methods failed, use navigator.platform as fallback
    if (deviceName === "Unknown Device" && platform) {
        if (platform.match(/Win/i)) deviceName = "Windows PC";
        else if (platform.match(/Mac/i)) deviceName = "Mac Device";
        else if (platform.match(/Linux/i)) deviceName = "Linux Device";
        else if (platform.match(/iPhone/i)) deviceName = "iPhone";
        else if (platform.match(/iPad/i)) deviceName = "iPad";
        else if (platform.match(/Android/i)) deviceName = "Android Device";
        else deviceName = platform; // Just use the platform string as device name
    }
    
    return deviceName;
}

// Show admin password modal
function showAdminPasswordModal() {
    if (adminPasswordModal) {
        adminPasswordModal.classList.add('active');
        
        // Clear any previous input
        if (adminPasswordInput) {
            adminPasswordInput.value = '';
            adminPasswordInput.focus();
        }
        
        // Clear error message
        if (adminPasswordError) {
            adminPasswordError.textContent = '';
        }
        
        // Announce for screen readers
        speakText('Admin authentication required. Please enter password.');
    }
}

// Hide admin password modal
function hideAdminPasswordModal() {
    if (adminPasswordModal) {
        adminPasswordModal.classList.remove('active');
    }
}

// Verify admin password
function verifyAdminPassword() {
    const password = adminPasswordInput.value.trim();
    
    if (!password) {
        adminPasswordError.textContent = 'Please enter a password';
        speakText('Please enter a password');
        return;
    }
    
    if (password === ADMIN_PASSWORD) {
        // Password correct, grant access
        hideAdminPasswordModal();
        directAccess('admin');
    } else {
        // Password incorrect
        adminPasswordError.textContent = 'Incorrect password';
        speakText('Incorrect password. Please try again.');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
    }
}

// Handle tap anywhere on the screen (for client only)
function handleScreenTap(event) {
    // Only process taps when on the message screen AND the user is a client
    if (currentScreen !== 'messages' || (currentUser && currentUser.type !== 'client')) return;
    
    // Ignore taps on specific buttons to prevent double actions
    if (event.target === sendBtn || 
        event.target === voiceInputBtn || 
        event.target === backBtn) {
        return;
    }
    
    // Toggle recording state
    if (!isRecording) {
        // Start recording
        startRecognition();
        isRecording = true;
        showAssistiveFeedback('Recording started. Tap anywhere to stop and send.');
        speakText('Recording started. Tap anywhere to stop and send.');
    } else {
        // Stop recording and send if there's content
        stopRecognition();
        isRecording = false;
        
        if (messageText.value.trim()) {
            sendMessage();
        } else {
            showAssistiveFeedback('No message recorded. Tap again to try.');
            speakText('No message recorded. Tap again to try.');
        }
    }
}

// Handle login functionality
function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const userType = userTypeSelect.value;
    
    if (!username || !password) {
        loginError.textContent = 'Please enter username and password';
        speakText('Please enter username and password');
        return;
    }
    
    // Check if user exists (in a real app, this would be an API call)
    let isValidUser = false;
    
    if (userType === 'admin' && username === users.admin.username && password === users.admin.password) {
        currentUser = { ...users.admin, username };
        isValidUser = true;
    } else if (userType === 'client' && username === users.client.username && password === users.client.password) {
        currentUser = { ...users.client, username };
        isValidUser = true;
    }
    
    if (isValidUser) {
        userInfo.textContent = `${username} (${userType})`;
        
        // Navigate to different screens based on user type
        if (currentUser.type === 'admin') {
            navigateTo('admin');
        } else {
            navigateTo('main');
            speakText(`Welcome ${username}. Swipe up to send message, swipe down to read the last message from admin.`);
        }
        
        // Start real-time message polling
        startMessagePolling();
    } else {
        loginError.textContent = 'Invalid username or password';
        speakText('Invalid username or password. Please try again.');
    }
}

// Navigation functions
function navigateTo(screen, skipAnnouncement = false) {
    // Hide all screens
    loginScreen.classList.remove('active');
    mainScreen.classList.remove('active');
    messageScreen.classList.remove('active');
    sosScreen.classList.remove('active');
    if (adminScreen) adminScreen.classList.remove('active');
    
    // Show selected screen
    switch (screen) {
        case 'login':
            loginScreen.classList.add('active');
            currentScreen = 'login';
            screenTitle.textContent = 'Vision Voice';
            break;
        case 'main':
            // Only for client users
            mainScreen.classList.add('active');
            gestureContainer.style.display = 'flex';
            messageScreen.style.display = 'none';
            currentScreen = 'main';
            screenTitle.textContent = 'Gesture Controls';
            
            // Announce gesture controls guidance for client - skip if requested
            if (currentUser && currentUser.type === 'client' && !skipAnnouncement) {
                setTimeout(() => {
                    speakText('Swipe up to send a message. Swipe down to read the last message from admin.');
                }, 1000);
            }
            break;
        case 'messages':
            // Only for client users
            mainScreen.classList.add('active');
            gestureContainer.style.display = 'none';
            messageScreen.style.display = 'block';
            currentScreen = 'messages';
            screenTitle.textContent = 'Messages';
            loadMessages(messagesContainer);
            
            // Only announce for client users - skip if requested
            if (currentUser && currentUser.type === 'client' && !skipAnnouncement) {
                speakText("Tap once to start voice input. Tap again to stop and send your message.");
            }
            break;
        case 'admin':
            // Only for admin users
            if (adminScreen) {
                adminScreen.classList.add('active');
                currentScreen = 'admin';
                screenTitle.textContent = 'Admin Dashboard';
                loadMessages(adminMessagesContainer);
            }
            break;
        case 'sos':
            sosScreen.classList.add('active');
            currentScreen = 'sos';
            screenTitle.textContent = 'SOS Emergency';
            if (currentUser && currentUser.type === 'client' && !skipAnnouncement) {
                speakText('SOS activated. Emergency contacts are being notified.');
            }
            break;
    }
}

function navigateBack() {
    if (currentScreen === 'messages') {
        navigateTo('main');
    } else if (currentScreen === 'main' || currentScreen === 'admin') {
        // Confirm before logout
        if (confirm('Do you want to logout?')) {
            // Store user type before clearing currentUser
            const wasClient = currentUser && currentUser.type === 'client';
            
            // Stop polling when logging out
            stopMessagePolling();
            
            currentUser = null;
            navigateTo('login');
            
            if (wasClient) {
                speakText('You have been logged out. Select client or admin to continue.');
            } else {
                speakText('You have been logged out.');
            }
        }
    }
}

// Message functions
function loadMessages(container) {
    if (!container) {
        console.error("Message container not found");
        return;
    }
    
    console.log("Loading messages into container:", container.id);
    
    container.innerHTML = '';
    
    if (messages.length === 0) {
        const noMessagesElement = document.createElement('div');
        noMessagesElement.classList.add('no-messages');
        noMessagesElement.textContent = 'No messages yet';
        container.appendChild(noMessagesElement);
        return;
    }
    
    messages.forEach((message, index) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.dataset.index = index;
        
        if (message.sender === 'client') {
            messageElement.classList.add('client');
        } else if (message.sender === 'admin') {
            messageElement.classList.add('admin');
        }
        
        const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-content">${message.content}</div>
            <div class="message-time">${time}</div>
        `;
        
        container.appendChild(messageElement);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
    
    console.log(`Loaded ${messages.length} messages into ${container.id}`);
}

// Real-time message polling functions
function startMessagePolling() {
    // Clear any existing interval first
    stopMessagePolling();
    
    // Check for new messages every 2 seconds
    messagePollingInterval = setInterval(() => {
        checkForNewMessages();
    }, 2000);
    
    console.log("Started real-time message polling");
}

function stopMessagePolling() {
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
        messagePollingInterval = null;
        console.log("Stopped message polling");
    }
}

// Mock implementation of checking for new messages
// In a real app, this would be an API call to a server
function checkForNewMessages() {
    // For this demo, we'll just reload messages from localStorage
    // to simulate receiving new messages from another user
    const savedMessages = localStorage.getItem('visionVoiceMessages');
    if (savedMessages) {
        try {
            const parsedMessages = JSON.parse(savedMessages);
            
            // Check if there are new messages
            if (parsedMessages.length > messages.length) {
                console.log("New messages detected:", parsedMessages.length - messages.length);
                
                // Get the last message for notification
                const lastMessage = parsedMessages[parsedMessages.length - 1];
                const isNewMessageFromOther = 
                    (currentUser && currentUser.type === 'client' && lastMessage.sender === 'admin') ||
                    (currentUser && currentUser.type === 'admin' && lastMessage.sender === 'client');
                
                // Update local messages array
                while (messages.length) messages.pop(); // Clear array
                parsedMessages.forEach(msg => {
                    // Convert string timestamps back to Date objects
                    msg.timestamp = new Date(msg.timestamp);
                    messages.push(msg);
                });
                
                // Refresh message displays
                updateMessageDisplays();
                
                // Notify of new messages if relevant
                if (isNewMessageFromOther) {
                    if (currentUser.type === 'client') {
                        showAssistiveFeedback('New message from admin');
                        speakText(`New message from admin: ${lastMessage.content}`);
                    } else {
                        showAssistiveFeedback('New message from client');
                        playNotificationSound();
                    }
                }
            }
        } catch (e) {
            console.error("Error checking for new messages:", e);
        }
    }
}

// Play notification sound
function playNotificationSound() {
    const notification = document.getElementById('message-notification');
    if (notification) {
        notification.currentTime = 0;
        notification.play().catch(e => console.error("Error playing notification sound:", e));
    }
}

// Update all active message displays
function updateMessageDisplays() {
    if (currentScreen === 'admin' && adminMessagesContainer) {
        loadMessages(adminMessagesContainer);
    } else if (currentScreen === 'messages' && messagesContainer) {
        loadMessages(messagesContainer);
    }
}

// Send message from client
function sendMessage() {
    const content = messageText.value.trim();
    
    if (!content) {
        if (currentUser && currentUser.type === 'client') {
            speakText('Please enter a message before sending.');
        }
        return;
    }
    
    const newMessage = {
        sender: 'client',
        content,
        timestamp: new Date()
    };
    
    console.log("Client sending message:", newMessage);
    messages.push(newMessage);
    messageText.value = '';
    
    // Update UI immediately
    updateMessageDisplays();
    
    // Store messages in localStorage for persistence and real-time sharing
    localStorage.setItem('visionVoiceMessages', JSON.stringify(messages));
    
    // Confirm message sent with voice for client only
    if (currentUser && currentUser.type === 'client') {
        speakText(`Message sent: ${content}`);
    }
}

// Send message from admin
function sendAdminMessage() {
    if (!adminMessageText) {
        console.error("Admin message text area not found");
        return;
    }
    
    const content = adminMessageText.value.trim();
    
    if (!content) return;
    
    const newMessage = {
        sender: 'admin',
        content,
        timestamp: new Date()
    };
    
    console.log("Admin sending message:", newMessage);
    messages.push(newMessage);
    adminMessageText.value = '';
    
    // Update UI immediately
    updateMessageDisplays();
    
    // Store messages in localStorage for persistence and real-time sharing
    localStorage.setItem('visionVoiceMessages', JSON.stringify(messages));
}

// Read the last message from admin
function readLastAdminMessage() {
    console.log("Reading last admin message, total messages:", messages.length);
    
    // Find the last admin message
    let foundMessage = false;
    
    for (let i = messages.length - 1; i >= 0; i--) {
        console.log("Checking message:", messages[i]);
        if (messages[i].sender === 'admin') {
            console.log("Found admin message:", messages[i].content);
            speakText(`Message from admin: ${messages[i].content}`);
            foundMessage = true;
            break;
        }
    }
    
    // If no messages found
    if (!foundMessage) {
        console.log("No admin messages found");
        speakText("No messages from admin yet.");
    }
}

// SOS functions
function activateSOS() {
    navigateTo('sos');
    
    // In a real app, this would contact emergency services or trusted contacts
    console.log('SOS activated!');
}

function cancelSOS() {
    navigateTo('main');
    if (currentUser && currentUser.type === 'client') {
        speakText('SOS canceled.');
    }
}

// Helper function for client speech
function speakText(text) {
    // Only speak if the current user is a client (blind user)
    if (currentUser && currentUser.type === 'client') {
        if (window.speechSynthesis && typeof window.speechSynthesis.speak === 'function') {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    } else if (!currentUser) {
        // On login screen, speak for everyone
        if (window.speechSynthesis && typeof window.speechSynthesis.speak === 'function') {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Make function globally accessible for gesture handling
window.readLastAdminMessage = readLastAdminMessage;

// Add event listeners for admin password modal
if (adminPasswordSubmit) {
    adminPasswordSubmit.addEventListener('click', verifyAdminPassword);
    
    // Also allow Enter key to submit
    adminPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyAdminPassword();
        }
    });
}

if (adminPasswordCancel) {
    adminPasswordCancel.addEventListener('click', hideAdminPasswordModal);
}

// Add new function for admin dashboard initialization
function initAdminDashboard() {
    // Update greeting based on time of day
    updateGreeting();
    
    // Update current time
    updateCurrentTime();
    
    // Update client device information
    updateClientDeviceInfo();
    
    // Update time, greeting and client info periodically
    setInterval(() => {
        updateCurrentTime();
        updateGreeting();
    }, 60000); // Update time/greeting every minute
    
    // Update client device info more frequently to ensure real-time data
    setInterval(() => {
        updateClientDeviceInfo();
    }, 5000); // Update client info every 5 seconds for more real-time display
    
    // Add event listeners to admin dashboard buttons
    const handsignPredictionBtn = document.getElementById('handsign-prediction-btn');
    const changeRoleBtn = document.getElementById('change-role-btn');
    const inboxBtn = document.getElementById('inbox-btn');
    const sendMessageBtn = document.getElementById('send-message-btn');
    const trackClientsBtn = document.getElementById('track-clients-btn');
    const sosInfoBtn = document.getElementById('sos-info-btn');
    
    if (handsignPredictionBtn) {
        handsignPredictionBtn.addEventListener('click', handleHandsignPrediction);
    }
    
    if (changeRoleBtn) {
        changeRoleBtn.addEventListener('click', handleChangeRole);
    }
    
    if (inboxBtn) {
        inboxBtn.addEventListener('click', handleInbox);
    }
    
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', handleSendMessage);
    }
    
    if (trackClientsBtn) {
        trackClientsBtn.addEventListener('click', handleTrackClients);
    }
    
    if (sosInfoBtn) {
        sosInfoBtn.addEventListener('click', handleSOSInfo);
    }
}

// Update greeting based on time of day
function updateGreeting() {
    const greetingElement = document.querySelector('.greeting-header h2');
    if (!greetingElement) return;
    
    const currentHour = new Date().getHours();
    let greeting = '';
    
    if (currentHour >= 5 && currentHour < 12) {
        greeting = 'Good Morning';
    } else if (currentHour >= 12 && currentHour < 18) {
        greeting = 'Good Afternoon';
    } else {
        greeting = 'Good Evening';
    }
    
    greetingElement.textContent = greeting;
}

// Update current time display
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('current-time');
    if (currentTimeElement) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        currentTimeElement.textContent = `${hours}:${minutes}`;
    }
}

// Handler functions for admin dashboard buttons
function handleChangeRole() {
    console.log('Change Role clicked');
    
    // Ask for confirmation before changing role
    if (confirm('Are you sure you want to change roles? This will log you out of the admin account.')) {
        // Reset current user
        currentUser = null;
        
        // Stop polling when changing roles
        stopMessagePolling();
        
        // Navigate to login screen
        navigateTo('login');
        
        // Provide feedback (optional, since we're leaving this page)
        speakText('Please select a role to continue.');
    }
}

function handleInbox() {
    console.log('Inbox clicked');
    // Implementation for inbox functionality
}

function handleSendMessage() {
    console.log('Send Message clicked');
    
    // Create a modal or container for the messaging interface
    const messagingInterface = document.createElement('div');
    messagingInterface.className = 'messaging-interface';
    
    // Create the messaging interface UI based on the current interface
    messagingInterface.innerHTML = `
        <div class="messaging-header">
            <button id="back-to-admin" class="back-btn">Back</button>
            <h2>Message to Client</h2>
        </div>
        
        <div class="client-info-banner">
            <span class="client-device-info">iPhone SE (3rd generation) - Simulator iOS</span>
        </div>
        
        <div id="message-history" class="message-history">
            <!-- Message history will be loaded here -->
        </div>
        
        <div class="message-compose">
            <textarea id="new-message" placeholder="Type your message..."></textarea>
            <button id="send-new-message" class="send-btn">Send</button>
        </div>
    `;
    
    // Add the interface to the document
    document.body.appendChild(messagingInterface);
    
    // Load message history
    const messageHistory = messagingInterface.querySelector('#message-history');
    if (messageHistory) {
        loadMessagesIntoContainer(messageHistory);
    }
    
    // Add event listeners for the interface
    const backToAdminBtn = messagingInterface.querySelector('#back-to-admin');
    if (backToAdminBtn) {
        backToAdminBtn.addEventListener('click', () => {
            document.body.removeChild(messagingInterface);
        });
    }
    
    const sendNewMessageBtn = messagingInterface.querySelector('#send-new-message');
    if (sendNewMessageBtn) {
        sendNewMessageBtn.addEventListener('click', () => {
            const newMessageTextarea = messagingInterface.querySelector('#new-message');
            if (newMessageTextarea && newMessageTextarea.value.trim()) {
                sendAdminMessageFromInterface(newMessageTextarea.value.trim());
                newMessageTextarea.value = '';
                
                // Update message history
                if (messageHistory) {
                    loadMessagesIntoContainer(messageHistory);
                }
            }
        });
    }
}

function handleTrackClients() {
    console.log('Track Clients clicked');
    // Implementation for tracking clients
}

// Helper function to load messages into a specific container
function loadMessagesIntoContainer(container) {
    // Clear container
    container.innerHTML = '';
    
    if (messages.length === 0) {
        const noMessagesDiv = document.createElement('div');
        noMessagesDiv.className = 'no-messages';
        noMessagesDiv.textContent = 'No messages yet';
        container.appendChild(noMessagesDiv);
        return;
    }
    
    // Sort messages by timestamp
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    
    // Add each message to the container
    sortedMessages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.sender}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = msg.content;
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = formatMessageTime(msg.timestamp);
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        container.appendChild(messageDiv);
    });
    
    // Scroll to the bottom
    container.scrollTop = container.scrollHeight;
}

// Function to send a message from the new interface
function sendAdminMessageFromInterface(text) {
    if (!text.trim()) return;
    
    const newMessage = {
        sender: 'admin',
        content: text,
        timestamp: new Date()
    };
    
    // Add to messages array
    messages.push(newMessage);
    
    // Save to localStorage
    localStorage.setItem('visionVoiceMessages', JSON.stringify(messages));
    
    console.log('Admin message sent:', text);
}

// Helper function to format message time
function formatMessageTime(timestamp) {
    const now = new Date();
    const msgDate = new Date(timestamp);
    
    // Check if message is from today
    if (now.toDateString() === msgDate.toDateString()) {
        return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
               ' ' + msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Add handler for HandSign Prediction button
function handleHandsignPrediction() {
    console.log('HandSign Prediction clicked');
    // Implementation for HandSign Prediction mode
    alert('HandSign Prediction feature is coming soon!');
}

// Add handler for SOS Info button
function handleSOSInfo() {
    console.log('SOS Info clicked');
    // Show SOS information dialog
    alert('SOS Mode: In an emergency, the client can hold their finger on the screen to activate SOS mode, which will notify emergency contacts.');
} 