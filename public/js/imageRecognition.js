// Variables for camera access and image recognition
let stream = null;
let imageCapture = null;
let isProcessingImage = false;

// Initialize camera functionality
function initCameraFunctionality() {
    console.log('Camera functionality initialized');
}

// Open camera view and start video stream
async function openCamera() {
    try {
        // Check if camera is already open
        if (stream) {
            console.log('Camera is already open');
            return;
        }

        // Show camera UI
        showCameraUI();
        
        // Get access to camera
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' },
            audio: false 
        });
        
        // Set video stream to video element
        const videoElement = document.getElementById('camera-view');
        if (videoElement) {
            videoElement.srcObject = stream;
            
            // Setup image capture
            const track = stream.getVideoTracks()[0];
            imageCapture = new ImageCapture(track);
            
            videoElement.play();
            
            // Announce to user
            showAssistiveFeedback('Camera opened. Taking photo in 3 seconds...');
            speakText('Camera opened. Taking photo in 3 seconds...');
            
            // Automatically take photo after 3 seconds
            setTimeout(takePhoto, 3000);
        } else {
            console.error('Video element not found');
            closeCameraView();
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        speakText('Could not access camera. Please make sure camera permissions are granted.');
        closeCameraView();
    }
}

// Take photo from camera
async function takePhoto() {
    if (!imageCapture) {
        console.error('Image capture not initialized');
        speakText('Camera not ready. Please try again.');
        return;
    }
    
    try {
        // Try to play shutter sound if available
        try {
            const shutterSound = document.getElementById('camera-shutter');
            if (shutterSound) {
                shutterSound.play().catch(e => console.log('Error playing shutter sound:', e));
            }
        } catch (soundError) {
            console.log('Shutter sound not available:', soundError);
        }
        
        // Take picture
        const blob = await imageCapture.takePhoto();
        const imageUrl = URL.createObjectURL(blob);
        
        // Show captured image
        const capturedImage = document.getElementById('captured-image');
        if (capturedImage) {
            capturedImage.src = imageUrl;
            capturedImage.style.display = 'block';
            
            // Feedback
            showAssistiveFeedback('Photo taken. Processing image...');
            speakText('Photo taken. Processing image...');
            
            // Send image for analysis
            analyzeImage(blob);
        }
    } catch (error) {
        console.error('Error taking photo:', error);
        speakText('Error taking photo. Please try again.');
        closeCameraView();
    }
}

// Send image to Google AI Vision API for analysis
async function analyzeImage(imageBlob) {
    if (isProcessingImage) return;
    isProcessingImage = true;
    
    try {
        // Validate the blob
        if (!imageBlob || !(imageBlob instanceof Blob)) {
            throw new Error("Invalid image data");
        }
        
        // Create form data for API request
        const formData = new FormData();
        formData.append('image', imageBlob);
        
        // Show processing indicator
        showAssistiveFeedback('Sending image to AI for analysis...');
        speakText('Analyzing what is around you. This might take a few seconds.');
        
        // Check if server is available
        let serverAvailable = true;
        try {
            const serverCheck = await fetch('http://localhost:3000', { 
                method: 'HEAD',
                timeout: 2000
            });
            serverAvailable = serverCheck.ok;
        } catch (e) {
            console.error("Server connection check failed:", e);
            serverAvailable = false;
        }
        
        if (!serverAvailable) {
            throw new Error("Server is not available");
        }
        
        // Send to our server endpoint
        console.log("Sending image to server for analysis...");
        const response = await fetch('http://localhost:3000/api/analyze-image', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Server returned error:", errorData);
            throw new Error(errorData.error || 'Failed to analyze image');
        }
        
        const data = await response.json();
        console.log("Server response received:", data);
        
        if (!data || !data.description) {
            throw new Error("No description received from server");
        }
        
        const description = data.description;
        
        // Display and speak the description from Gemini AI
        displayImageDescription(description);
        
        isProcessingImage = false;
    } catch (error) {
        console.error('Error analyzing image:', error);
        
        // Determine appropriate message based on error
        let errorMessage = 'Error analyzing image. Please try again.';
        
        if (error.message.includes('Server is not available')) {
            errorMessage = 'Unable to connect to image analysis server. Please check your connection.';
        } else if (error.message.includes('API key')) {
            errorMessage = 'API configuration error. Please check the Gemini API key.';
        } else if (error.message.includes('Invalid image')) {
            errorMessage = 'Unable to process the image. Please try again in better lighting.';
        }
        
        speakText(errorMessage);
        isProcessingImage = false;
        
        // For development purposes, fall back to simulated response if server fails
        const useSimulation = confirm('Server connection failed. Use simulated AI response for testing?');
        if (useSimulation) {
            simulateApiCall();
        } else {
            closeCameraView();
        }
    }
}

// Simulate API call (used as fallback when server is not available)
function simulateApiCall() {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Detailed sample description that would come from the Gemini API
            const description = `You are in an indoor room with bright natural lighting. The main light source is coming from a large window about 8 feet away on the left wall, with sunlight streaming through, creating a warm atmosphere. The room appears to be a home office or study space.

Directly in front of you, approximately 3 feet away, is a rectangular wooden desk with a medium brown finish. The desk is about 5 feet wide and 2.5 feet deep. On the desk, centered, sits an open silver laptop computer. To the right of the laptop, about 10 inches away, is a white ceramic coffee mug with steam rising from it. There are several sheets of white paper scattered across the left side of the desk, some with what appears to be handwritten notes.

The floor beneath you is hardwood with a light oak finish, and there's a small area rug with a geometric pattern in blue and beige tones under the desk area.

Behind the desk, against the far wall approximately 7 feet away, stands a tall wooden bookshelf reaching almost to the ceiling. The bookshelf is dark brown and contains approximately 30-40 books arranged in both vertical and horizontal stacks. The books vary in size and color, with red, blue, green, and black spines visible. The top shelf has several decorative items including what appears to be a small globe and a decorative plant.

To your right, about 4 feet away in the corner, is a floor lamp with a slender metal stand and a cream-colored shade. It's currently not illuminated.

The walls are painted an off-white color. On the wall to the right, there's a framed print of a landscape scene with mountains and trees. The ceiling is white with a simple ceiling light fixture in the center.

The room has a comfortable temperature and the air smells faintly of coffee. There's a subtle echo when sounds are made, suggesting the room has few soft furnishings to absorb sound. No people are present in the space, and the only movement is the slight flutter of papers from air circulation.`;
            
            // Display and speak the result
            displayImageDescription(description);
            resolve();
        }, 2000); // Simulate 2-second API call
    });
}

// Display and speak the image description
function displayImageDescription(description) {
    console.log("Received description:", description);
    
    // Check if description is empty or undefined
    if (!description || description.trim() === '') {
        console.error("Empty description received from API");
        speakText("I couldn't analyze what's around you. Please try again in better lighting.");
        closeCameraView();
        return;
    }
    
    // Create a message with the description
    const newMessage = {
        sender: 'system',
        content: `Image Description: ${description}`,
        timestamp: new Date()
    };
    
    // Add to messages array
    if (typeof window.messages !== 'undefined') {
        window.messages.push(newMessage);
        
        // Store messages in localStorage for persistence and real-time sharing
        localStorage.setItem('visionVoiceMessages', JSON.stringify(window.messages));
        
        // Update message display if on messages screen
        if (typeof updateMessageDisplays === 'function') {
            updateMessageDisplays();
        }
    }
    
    // Show on screen
    showAssistiveFeedback('Image analyzed! Speaking detailed description.');
    
    // Handle longer descriptions by breaking them into sentences
    speakDetailedDescription(description);
    
    // Calculate appropriate delay based on text length before closing camera view
    const estimatedSpeakingTime = calculateSpeakingTime(description);
    const minimumDelay = 5000; // At least 5 seconds 
    const closeDelay = Math.max(minimumDelay, estimatedSpeakingTime);
    
    console.log(`Will close camera view after ${closeDelay/1000} seconds`);
    
    // Set a flag to indicate we're already planning to close the camera view
    window.scheduledCameraClose = true;
    
    // Close camera after delay to allow description to be spoken
    setTimeout(() => {
        window.scheduledCameraClose = false;
        closeCameraView();
    }, closeDelay);
}

// Split and speak longer descriptions in a more natural way
function speakDetailedDescription(description) {
    // First, provide a brief introduction
    speakText("Here's what's around you:");
    
    // Small delay before starting the detailed description
    setTimeout(() => {
        // Split into sentences for better pacing and clarity
        const sentences = description.split(/(?<=[.!?])\s+/);
        
        // Check if we have too many sentences (very long description)
        if (sentences.length > 15) {
            // For very long descriptions, speak a summarized version first
            const firstFewSentences = sentences.slice(0, 5).join(' ');
            speakText(firstFewSentences);
            
            // Then ask if user wants to hear more details
            setTimeout(() => {
                if (confirm("Would you like to hear more detailed description?")) {
                    // Continue with the rest of the description
                    speakText(sentences.slice(5).join(' '));
                }
            }, calculateSpeakingTime(firstFewSentences) + 500);
        } else {
            // For shorter descriptions, just speak it all
            speakText(description);
        }
    }, 1500);
}

// Estimate how long it takes to speak a text
function calculateSpeakingTime(text) {
    // Average speaking rate is about 150 words per minute
    // So about 2.5 words per second
    const words = text.split(/\s+/).length;
    return (words / 2.5) * 1000; // in milliseconds
}

// Show camera UI
function showCameraUI() {
    // Create camera UI elements if they don't exist
    if (!document.getElementById('camera-screen')) {
        createCameraUI();
    }
    
    // Show camera screen
    const cameraScreen = document.getElementById('camera-screen');
    if (cameraScreen) {
        cameraScreen.classList.add('active');
    }
}

// Create camera UI elements
function createCameraUI() {
    const cameraScreen = document.createElement('div');
    cameraScreen.id = 'camera-screen';
    cameraScreen.className = 'screen';
    
    cameraScreen.innerHTML = `
        <header>
            <button id="camera-back-btn" aria-label="Close camera">Close</button>
            <h2>Vision Mode</h2>
        </header>
        <div class="camera-container">
            <video id="camera-view" autoplay playsinline></video>
            <img id="captured-image" style="display: none; width: 100%;" />
            <div id="camera-controls">
                <button id="capture-btn" aria-label="Take photo">📷</button>
            </div>
        </div>
    `;
    
    // Add camera screen to app
    const app = document.getElementById('app');
    if (app) {
        app.appendChild(cameraScreen);
        
        // Add event listener to back button
        const backBtn = document.getElementById('camera-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Cancel any ongoing speech to prevent overlap
                if (typeof stopSpeaking === 'function') {
                    stopSpeaking();
                } else if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
                
                // Then close camera view
                closeCameraView();
            });
        }
        
        // Add event listener to capture button
        const captureBtn = document.getElementById('capture-btn');
        if (captureBtn) {
            captureBtn.addEventListener('click', takePhoto);
        }
    }
}

// Close camera view
function closeCameraView() {
    // If this is a manual close (from button press) while a scheduled close is pending,
    // cancel the scheduled close to avoid double-closing
    if (window.scheduledCameraClose) {
        console.log('Canceling scheduled camera close');
        window.scheduledCameraClose = false;
    }
    
    // Hide camera screen
    const cameraScreen = document.getElementById('camera-screen');
    if (cameraScreen) {
        cameraScreen.classList.remove('active');
    }
    
    // Stop camera stream
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        imageCapture = null;
    }
    
    // Return to main screen but skip the announcement to prevent speech overlap
    navigateTo('main', true);
} 