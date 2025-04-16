// server.js - Express server for Vision Voice app with Gemini AI integration
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Set up CORS for client access
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Set up file upload with multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Initialize Gemini AI
function initGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in environment variables');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

// Helper function to convert file to base64
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
}

// Endpoint to analyze image using Gemini AI
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    console.log('Image analysis request received');
    
    const genAI = initGeminiAI();
    if (!genAI) {
      console.error('Gemini AI initialization failed - API key may be invalid');
      return res.status(500).json({ 
        error: 'Gemini AI not initialized. Check API key configuration.' 
      });
    }

    if (!req.file) {
      console.error('No image file received in request');
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    
    console.log(`Processing image: ${filePath}, type: ${mimeType}`);

    // Create prompt specifically for blind users
    const prompt = `Describe this image in complete detail for a blind person who needs to understand their surroundings. 

IMPORTANT GUIDELINES:
1. Start with the most important elements and overall context (indoor/outdoor, day/night)
2. THOROUGHLY describe the background and all surroundings - include ALL visible elements regardless of size or perceived importance
3. Describe spatial relationships with precise directions (left, right, behind, in front, above, below, 10 feet away, etc.)
4. Mention specific colors, textures, materials, lighting conditions, and dimensions where possible
5. Include ALL details about people, objects, text, signs, potential hazards, and paths for navigation
6. Use spatial language that would help with orientation and navigation (e.g., "to your left is a doorway approximately 5 feet away")
7. Describe the entire environment including floors, walls, ceilings, and distant objects
8. Include ambient details like lighting, shadows, weather conditions, and atmosphere
9. Prioritize information that would help someone navigate the space safely
10. Use detailed, descriptive language without technical jargon
11. DO NOT mention that this is a photo - describe it as if you're explaining what's physically around them

Respond ONLY with the detailed description, without any introduction, conclusion or explanations.`;

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        generationConfig: {
            temperature: 0.2,  // Lower temperature for more detailed, factual descriptions
            maxOutputTokens: 1024,  // Allow for longer descriptions
            topP: 0.95,
            topK: 64
        }
    });

    // Convert image to inline data
    const imagePart = fileToGenerativePart(filePath, mimeType);
    console.log('Image converted to base64 for API');

    // Generate content from the model
    console.log('Sending request to Gemini API...');
    const result = await model.generateContent([prompt, imagePart]);
    
    if (!result || !result.response) {
      throw new Error('Empty response received from Gemini API');
    }
    
    const description = result.response.text();
    console.log('Received description from Gemini:', description.substring(0, 100) + '...');
    
    if (!description || description.trim() === '') {
      throw new Error('Empty description received from Gemini API');
    }

    // Clean up uploaded file after processing
    fs.unlinkSync(filePath);
    console.log('Temporary image file deleted');

    res.json({ description });
    console.log('Response sent successfully');
  } catch (error) {
    console.error('Error analyzing image:', error);
    
    // Check for specific Gemini API errors
    let errorMessage = 'Error analyzing image';
    let details = error.message;
    
    if (error.message && error.message.includes('API key')) {
      errorMessage = 'Invalid API key or authentication error';
    } else if (error.message && error.message.includes('quota')) {
      errorMessage = 'API quota exceeded';
    } else if (error.message && error.message.includes('network')) {
      errorMessage = 'Network error connecting to Gemini API';
    }
    
    // Clean up file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up temporary file after error');
      } catch (unlinkError) {
        console.error('Error deleting temporary file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: details 
    });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser`);
}); 