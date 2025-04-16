// Gesture detection variables
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchStartTime = 0;
let touchEndTime = 0;
let longPressThreshold = 1000; // 1 second for long press
let longPressTimer;
let isLongPressed = false;

// Initialize gesture detection
function initGestureDetection() {
    const mainScreen = document.getElementById('main-screen');
    
    // Add touch event listeners
    mainScreen.addEventListener('touchstart', handleTouchStart, false);
    mainScreen.addEventListener('touchmove', handleTouchMove, false);
    mainScreen.addEventListener('touchend', handleTouchEnd, false);
    
    // Add mouse event listeners for desktop testing
    mainScreen.addEventListener('mousedown', handleMouseDown, false);
    mainScreen.addEventListener('mousemove', handleMouseMove, false);
    mainScreen.addEventListener('mouseup', handleMouseUp, false);
    
    console.log('Gesture detection initialized');
}

// Touch event handlers
function handleTouchStart(event) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchStartTime = new Date().getTime();
    
    // Start timer for long press detection
    longPressTimer = setTimeout(() => {
        isLongPressed = true;
        showAssistiveFeedback('Long press detected. Hold for SOS.');
    }, longPressThreshold);
}

function handleTouchMove(event) {
    // Cancel long press if user moves finger
    if (Math.abs(event.touches[0].clientX - touchStartX) > 10 || 
        Math.abs(event.touches[0].clientY - touchStartY) > 10) {
        clearTimeout(longPressTimer);
        isLongPressed = false;
    }
}

function handleTouchEnd(event) {
    touchEndX = event.changedTouches[0].clientX;
    touchEndY = event.changedTouches[0].clientY;
    touchEndTime = new Date().getTime();
    
    clearTimeout(longPressTimer);
    
    // Check if it's a long press (hold)
    const touchDuration = touchEndTime - touchStartTime;
    if (touchDuration >= longPressThreshold && isLongPressed) {
        handleHoldGesture();
        isLongPressed = false;
        return;
    }
    
    // Calculate swipe direction
    handleSwipe();
}

// Mouse event handlers (for desktop testing)
function handleMouseDown(event) {
    touchStartX = event.clientX;
    touchStartY = event.clientY;
    touchStartTime = new Date().getTime();
    
    // Start timer for long press detection
    longPressTimer = setTimeout(() => {
        isLongPressed = true;
        showAssistiveFeedback('Long press detected. Hold for SOS.');
    }, longPressThreshold);
}

function handleMouseMove(event) {
    // Only if mouse button is down
    if (event.buttons !== 1) return;
    
    // Cancel long press if user moves mouse
    if (Math.abs(event.clientX - touchStartX) > 10 || 
        Math.abs(event.clientY - touchStartY) > 10) {
        clearTimeout(longPressTimer);
        isLongPressed = false;
    }
}

function handleMouseUp(event) {
    touchEndX = event.clientX;
    touchEndY = event.clientY;
    touchEndTime = new Date().getTime();
    
    clearTimeout(longPressTimer);
    
    // Check if it's a long press (hold)
    const touchDuration = touchEndTime - touchStartTime;
    if (touchDuration >= longPressThreshold && isLongPressed) {
        handleHoldGesture();
        isLongPressed = false;
        return;
    }
    
    // Calculate swipe direction
    handleSwipe();
}

// Handle swipe gestures
function handleSwipe() {
    console.log("Handling swipe");
    const horizontalDistance = touchEndX - touchStartX;
    const verticalDistance = touchEndY - touchStartY;
    const minSwipeDistance = 50; // Minimum distance for a swipe
    
    console.log(`Swipe detected: horizontal=${horizontalDistance}, vertical=${verticalDistance}`);
    
    // Check if the swipe is horizontal or vertical
    if (Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
        // Horizontal swipe
        if (Math.abs(horizontalDistance) < minSwipeDistance) {
            showAssistiveFeedback('Swipe not detected. Please try again with a longer swipe.');
            return;
        }
        
        if (horizontalDistance > 0) {
            // Right swipe
            handleRightSwipe();
        } else {
            // Left swipe
            handleLeftSwipe();
        }
    } else {
        // Vertical swipe
        if (Math.abs(verticalDistance) < minSwipeDistance) {
            showAssistiveFeedback('Swipe not detected. Please try again with a longer swipe.');
            return;
        }
        
        if (verticalDistance > 0) {
            // Down swipe
            console.log("DOWN SWIPE DETECTED");
            handleDownSwipe();
        } else {
            // Up swipe
            console.log("UP SWIPE DETECTED");
            handleUpSwipe();
        }
    }
}

// Specific gesture handlers
function handleLeftSwipe() {
    showAssistiveFeedback('Left swipe detected.');
    // Only process for client users
    if (currentUser && currentUser.type === 'client') {
        speakText('Opening camera to describe what is around you.');
        
        // Open camera to take photo and analyze surroundings
        if (typeof openCamera === 'function') {
            openCamera();
        } else {
            console.error('Camera functionality not available');
            speakText('Camera functionality is not available.');
        }
    }
    console.log('Left swipe - Camera Vision mode');
}

function handleRightSwipe() {
    showAssistiveFeedback('Right swipe detected.');
    // Only provide feedback for client users
    if (currentUser && currentUser.type === 'client') {
        speakText('Navigating to Hand Sign mode.');
    }
    // In a real app, this would navigate to hand sign recognition mode
    console.log('Right swipe - Hand Sign mode');
}

function handleUpSwipe() {
    // Only process for client users
    if (!currentUser || currentUser.type !== 'client') return;
    
    showAssistiveFeedback('Up swipe detected. Send a message mode activated.');
    speakText('Send message mode activated. Tap anywhere to start recording your message.');
    
    // Check if we're already in message screen
    if (currentScreen !== 'messages') {
        // Prepare a blank message form
        navigateTo('messages');
        // Reset any previous message
        if (messageText) messageText.value = '';
        // Focus on message area for accessibility
        setTimeout(() => {
            if (messageText) messageText.focus();
        }, 500);
    }
    
    console.log('Up swipe - Send message');
}

function handleDownSwipe() {
    // Only process for client users
    if (!currentUser || currentUser.type !== 'client') {
        console.log("Ignoring down swipe - not a client user");
        return;
    }
    
    console.log('Down swipe detected - attempting to read message');
    showAssistiveFeedback('Down swipe detected. Reading last message from admin.');
    
    // Find the last admin message by accessing the global messages array
    let foundMessage = false;
    
    if (typeof window.messages !== 'undefined' && window.messages.length > 0) {
        // Use the global messages array
        for (let i = window.messages.length - 1; i >= 0; i--) {
            if (window.messages[i].sender === 'admin') {
                speakText(`Message from admin: ${window.messages[i].content}`);
                foundMessage = true;
                console.log("Read admin message:", window.messages[i].content);
                break;
            }
        }
    } else {
        console.error("Global messages array not available");
    }
    
    // If no messages found
    if (!foundMessage) {
        speakText("No messages from admin yet.");
        console.log("No admin messages found to read");
    }
}

function handleHoldGesture() {
    // Only process for client users
    if (!currentUser || currentUser.type !== 'client') return;
    
    showAssistiveFeedback('Hold gesture detected. SOS activated!');
    speakText('SOS mode activated. Hold again to cancel.');
    activateSOS();
    console.log('Hold gesture - SOS');
}

// Display assistive feedback
function showAssistiveFeedback(message) {
    const assistiveOverlay = document.getElementById('assistive-overlay');
    const assistiveFeedback = document.getElementById('assistive-feedback');
    
    assistiveFeedback.textContent = message;
    assistiveOverlay.classList.add('active');
    
    // Hide overlay after 3 seconds
    setTimeout(() => {
        assistiveOverlay.classList.remove('active');
    }, 3000);
} 