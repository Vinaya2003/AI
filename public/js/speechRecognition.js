// Speech recognition variables
let recognition = null;
let isRecognizing = false;
let recognitionTimeout = null;
let recognitionMaxDuration = 30000; // 30 seconds maximum for recognition

// Initialize speech recognition
function initSpeechRecognition() {
    try {
        // Check if browser supports speech recognition
        if ('SpeechRecognition' in window) {
            recognition = new window.SpeechRecognition();
        } else if ('webkitSpeechRecognition' in window) {
            recognition = new window.webkitSpeechRecognition();
        } else {
            console.warn('Speech recognition not supported in this browser');
            return;
        }
        
        // Set recognition properties
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Add event listeners
        recognition.onstart = handleRecognitionStart;
        recognition.onresult = handleRecognitionResult;
        recognition.onerror = handleRecognitionError;
        recognition.onend = handleRecognitionEnd;
        
        console.log('Speech recognition initialized');
    } catch (error) {
        console.error('Error initializing speech recognition:', error);
    }
}

// Handle voice input button click
function toggleVoiceInput() {
    if (isRecognizing) {
        stopRecognition();
        isRecording = false; // Update global state
    } else {
        startRecognition();
        isRecording = true; // Update global state
    }
}

// Start speech recognition
function startRecognition() {
    if (!recognition) {
        speakText('Speech recognition is not available in your browser.');
        return;
    }
    
    try {
        recognition.start();
        // Visual feedback - change background color of message area
        messageText.classList.add('recording');
        // Change button appearance to indicate recording
        voiceInputBtn.textContent = '🛑';
        voiceInputBtn.classList.add('recording');
        
        // Set a timeout to stop recognition after a while
        clearTimeout(recognitionTimeout); // Clear existing timeout if any
        recognitionTimeout = setTimeout(() => {
            stopRecognition();
            isRecording = false; // Update global state
            speakText('Recording stopped automatically. Tap to send your message or tap again to record.');
        }, recognitionMaxDuration);
    } catch (error) {
        console.error('Error starting speech recognition:', error);
    }
}

// Stop speech recognition
function stopRecognition() {
    if (!recognition) return;
    
    try {
        recognition.stop();
        clearTimeout(recognitionTimeout);
        
        // Visual feedback - remove recording styles
        messageText.classList.remove('recording');
        voiceInputBtn.textContent = '🎤';
        voiceInputBtn.classList.remove('recording');
    } catch (error) {
        console.error('Error stopping speech recognition:', error);
    }
}

// Handle recognition events
function handleRecognitionStart() {
    isRecognizing = true;
    console.log('Recognition started');
}

function handleRecognitionResult(event) {
    const messageText = document.getElementById('message-text');
    let finalTranscript = '';
    let interimTranscript = '';
    
    // Process each result
    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript += transcript;
        }
    }
    
    // Update message input with recognized text
    if (finalTranscript) {
        messageText.value = finalTranscript;
        // Provide visual feedback
        messageText.classList.add('highlight');
        setTimeout(() => {
            messageText.classList.remove('highlight');
        }, 1000);
    } else if (interimTranscript) {
        messageText.value = interimTranscript;
    }
}

function handleRecognitionError(event) {
    console.error('Recognition error:', event.error);
    
    let errorMessage = 'Error with speech recognition.';
    
    switch (event.error) {
        case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
        case 'aborted':
            errorMessage = 'Speech recognition aborted.';
            break;
        case 'audio-capture':
            errorMessage = 'No microphone detected.';
            break;
        case 'not-allowed':
            errorMessage = 'Microphone access denied.';
            break;
        case 'network':
            errorMessage = 'Network error. Please check your connection.';
            break;
        case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed.';
            break;
    }
    
    showAssistiveFeedback(errorMessage);
    speakText(errorMessage);
    
    // Reset state
    isRecognizing = false;
    isRecording = false; // Update global state
}

function handleRecognitionEnd() {
    isRecognizing = false;
    console.log('Recognition ended');
}

// Enhance accessibility for blind users
function enhanceAccessibility() {
    // Add role and aria attributes
    document.querySelectorAll('button').forEach(button => {
        if (!button.getAttribute('aria-label')) {
            button.setAttribute('aria-label', button.textContent);
        }
    });
    
    // Make input fields announce their purpose
    document.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('focus', () => {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) {
                speakText(`${label.textContent} field. ${input.placeholder || ''}`);
            }
        });
    });
    
    // Announce screen changes
    document.querySelectorAll('.screen').forEach(screen => {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'class' && 
                    screen.classList.contains('active')) {
                    const heading = screen.querySelector('h1, h2');
                    if (heading) {
                        speakText(`Screen changed to ${heading.textContent}`);
                    }
                }
            });
        });
        
        observer.observe(screen, { attributes: true });
    });
} 