// Speech synthesis variables
let synth = window.speechSynthesis;
let speechRate = 1;
let speechPitch = 1;
let speechVolume = 1;
let selectedVoice = null;
let isSpeaking = false;

// Initialize speech synthesis
function initSpeechSynthesis() {
    // Get available voices
    synth = window.speechSynthesis;
    
    // Load voices when they're available
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }
    
    loadVoices();
    
    console.log('Speech synthesis initialized');
}

// Load available voices and select the best one
function loadVoices() {
    const voices = synth.getVoices();
    
    if (voices.length === 0) {
        console.warn('No speech synthesis voices available');
        return;
    }
    
    // Select a good voice for the application
    // Prefer a female voice in English
    const preferredVoice = voices.find(voice => 
        voice.name.includes('Female') && 
        (voice.lang.startsWith('en-') || voice.lang === 'en')
    );
    
    // Fallback to any English voice
    const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en-') || voice.lang === 'en'
    );
    
    // Fallback to the first available voice
    selectedVoice = preferredVoice || englishVoice || voices[0];
    
    console.log(`Selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
}

// Speak text using the speech synthesis API
function speakText(text) {
    // If already speaking, cancel it
    if (isSpeaking) {
        synth.cancel();
    }
    
    if (!text) return;
    
    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set speech properties
    utterance.voice = selectedVoice;
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = speechVolume;
    
    // Set event handlers
    utterance.onstart = () => {
        isSpeaking = true;
        console.log('Speech started');
    };
    
    utterance.onend = () => {
        isSpeaking = false;
        console.log('Speech ended');
    };
    
    utterance.onerror = (event) => {
        console.error('Speech error:', event.error);
        isSpeaking = false;
    };
    
    // Speak the text
    synth.speak(utterance);
}

// Adjust speech settings
function adjustSpeechRate(rate) {
    speechRate = Math.max(0.5, Math.min(2, rate));
}

function adjustSpeechPitch(pitch) {
    speechPitch = Math.max(0.5, Math.min(2, pitch));
}

function adjustSpeechVolume(volume) {
    speechVolume = Math.max(0, Math.min(1, volume));
}

// Stop speaking
function stopSpeaking() {
    if (synth) {
        synth.cancel();
        isSpeaking = false;
    }
} 