import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import User from './models/User.js';
import Note from './models/Note.js';
import Vocabulary from './models/Vocabulary.js';
import LearnedWord from './models/LearnedWord.js';
import Bill from './models/Bill.js';
import Participant from './models/Participant.js';

dotenv.config();

const app = express();

// Allow JSON bodies with larger payloads for images (QR data URLs)
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// CORS (adjust origin in production)
app.use(cors({
  origin: '*', // For demo; change to your frontend URL for production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}
await mongoose.connect(MONGODB_URI);

// JWT helpers
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
function createToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Missing Authorization header' });
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Invalid Authorization header' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });
  return res.json({ message: 'Registered', id: user._id });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = createToken(user);
  return res.json({ token });
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('_id email createdAt');
  return res.json({ user });
});

// Note Routes
app.get('/api/notes', auth, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ updatedAt: -1 });
    return res.json(notes);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching notes' });
  }
});

app.post('/api/notes', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const note = await Note.create({
      user: req.user.id,
      title,
      content
    });

    return res.status(201).json(note);
  } catch (error) {
    return res.status(500).json({ message: 'Error creating note' });
  }
});

app.put('/api/notes/:id', auth, async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { title, content },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    return res.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    return res.status(500).json({ message: 'Error updating note' });
  }
});

app.delete('/api/notes/:id', auth, async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    return res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    return res.status(500).json({ message: 'Error deleting note' });
  }
});

// Vocabulary Routes
app.get('/api/vocabulary/daily', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Get random seed based on today's date for consistent daily words
    const seed = startOfDay.getTime();
    
    // Get words user hasn't learned yet
    const learnedWords = await LearnedWord.find({ user: req.user.id }).select('vocabulary');
    const learnedVocabIds = learnedWords.map(lw => lw.vocabulary);
    
    // Get 5 random words that user hasn't learned
    const dailyWords = await Vocabulary.aggregate([
      { $match: { _id: { $nin: learnedVocabIds } } },
      { $sample: { size: 5 } }
    ]);
    
    return res.json(dailyWords);
  } catch (error) {
    console.error('Error getting daily vocabulary:', error);
    return res.status(500).json({ message: 'Error fetching daily vocabulary' });
  }
});

app.post('/api/vocabulary/learn', auth, async (req, res) => {
  try {
    const { vocabularyId } = req.body;
    
    if (!vocabularyId || !mongoose.Types.ObjectId.isValid(vocabularyId)) {
      return res.status(400).json({ message: 'Valid vocabulary ID required' });
    }
    
    // Check if vocabulary exists
    const vocabulary = await Vocabulary.findById(vocabularyId);
    if (!vocabulary) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }
    
    // Check if already learned
    const existingLearned = await LearnedWord.findOne({
      user: req.user.id,
      vocabulary: vocabularyId
    });
    
    if (existingLearned) {
      return res.status(400).json({ message: 'Word already learned' });
    }
    
    // Create learned word record
    const learnedWord = await LearnedWord.create({
      user: req.user.id,
      vocabulary: vocabularyId
    });
    
    return res.status(201).json({ message: 'Word marked as learned', learnedWord });
  } catch (error) {
    console.error('Error marking word as learned:', error);
    return res.status(500).json({ message: 'Error marking word as learned' });
  }
});

app.get('/api/vocabulary/reviews', auth, async (req, res) => {
  try {
    // Get learned words for review (random order)
    const learnedWords = await LearnedWord.find({ user: req.user.id })
      .populate('vocabulary')
      .sort({ lastReviewedAt: 1 }); // Show least recently reviewed first
    
    // Randomize for variety
    const shuffledWords = learnedWords.sort(() => Math.random() - 0.5);
    
    return res.json(shuffledWords.slice(0, 10)); // Return up to 10 words for review
  } catch (error) {
    console.error('Error getting reviews:', error);
    return res.status(500).json({ message: 'Error fetching review words' });
  }
});

app.post('/api/vocabulary/review', auth, async (req, res) => {
  try {
    const { vocabularyId, correct } = req.body;
    
    if (!vocabularyId || !mongoose.Types.ObjectId.isValid(vocabularyId)) {
      return res.status(400).json({ message: 'Valid vocabulary ID required' });
    }
    
    // Update learned word stats
    const learnedWord = await LearnedWord.findOneAndUpdate(
      { user: req.user.id, vocabulary: vocabularyId },
      {
        $inc: { reviewCount: 1 },
        $set: { 
          lastReviewedAt: new Date(),
          proficiency: correct ? 'familiar' : 'learning'
        }
      },
      { new: true }
    );
    
    if (!learnedWord) {
      return res.status(404).json({ message: 'Learned word not found' });
    }
    
    return res.json({ message: 'Review recorded', learnedWord });
  } catch (error) {
    console.error('Error recording review:', error);
    return res.status(500).json({ message: 'Error recording review' });
  }
});

// Multiple API sources configuration
const API_SOURCES = {
  'free-dictionary': {
    name: 'Free Dictionary API',
    url: (word) => `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`,
    requiresKey: false,
    description: 'Best quality with pronunciation, examples, and multiple definitions'
  },
  'wordnik': {
    name: 'Wordnik API',
    url: (word) => `https://api.wordnik.com/v4/word.json/${word.toLowerCase()}/definitions?limit=1&includeRelated=false&sourceDictionaries=wiktionary&useCanonical=false&includeTags=false&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5`,
    requiresKey: true,
    description: 'Large vocabulary database with part-of-speech information'
  },
  // Future APIs can be added here
  'dictionary-api': {
    name: 'Dictionary API (Merriam-Webster)',
    url: (word) => `https://www.dictionaryapi.com/api/v3/references/learners/json/${word.toLowerCase()}?key=your-api-key-here`,
    requiresKey: true,
    disabled: true,
    description: 'Professional Merriam-Webster dictionary (requires API key)'
  },
  'words-api': {
    name: 'Words API (RapidAPI)',
    url: (word) => `https://wordsapiv1.p.rapidapi.com/words/${word.toLowerCase()}`,
    requiresKey: true,
    headers: {
      'X-RapidAPI-Key': 'demo-key',
      'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com'
    },
    disabled: true,
    description: 'Comprehensive word API with syllables, rhymes, and more (requires RapidAPI key)'
  }
};

// Import word from multiple API sources
app.post('/api/vocabulary/import', auth, async (req, res) => {
  try {
    const { word, apiSource = 'auto' } = req.body;
    
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ message: 'Word parameter is required' });
    }
    
    // Check if word already exists
    const existingWord = await Vocabulary.findOne({ word: word.toLowerCase() });
    if (existingWord) {
      return res.status(409).json({ message: 'Word already exists in database' });
    }
    
    let vocabularyData = null;
    let usedSource = '';
    let errors = [];
    
    // Determine which APIs to try (only enabled ones)
    const sourcesToTry = apiSource === 'auto' 
      ? Object.keys(API_SOURCES).filter(key => !API_SOURCES[key].disabled) 
      : [apiSource];
    
    // Try each API source until one succeeds
    for (const source of sourcesToTry) {
      try {
        console.log(`Trying ${API_SOURCES[source].name} for word: ${word}`);
        vocabularyData = await fetchWordFromAPI(word, source);
        usedSource = source;
        break;
      } catch (error) {
        console.error(`${API_SOURCES[source].name} failed:`, error.message);
        errors.push(`${API_SOURCES[source].name}: ${error.message}`);
      }
    }
    
    if (!vocabularyData) {
      return res.status(404).json({ 
        message: 'Word not found in any dictionary API',
        errors: errors
      });
    }
    
    // Create vocabulary entry
    const vocabularyEntry = await Vocabulary.create(vocabularyData);
    
    return res.status(201).json({
      message: 'Word imported successfully',
      vocabulary: vocabularyEntry,
      source: API_SOURCES[usedSource].name
    });
    
  } catch (error) {
    console.error('Error importing word:', error);
    return res.status(500).json({ message: 'Error importing word from dictionary APIs' });
  }
});

// Fetch word data from specific API
async function fetchWordFromAPI(word, apiSource) {
  try {
    const api = API_SOURCES[apiSource];
    if (!api) {
      throw new Error(`Unknown API source: ${apiSource}`);
    }
    
    if (api.disabled) {
      throw new Error(`API source ${apiSource} is disabled`);
    }
    
    // Prepare fetch options with timeout
    const fetchOptions = {
      method: 'GET',
      timeout: 10000 // 10 seconds timeout
    };
    
    // Add headers if specified
    if (api.headers) {
      fetchOptions.headers = api.headers;
    }
    
    console.log(`Fetching from ${api.name}: ${api.url(word)}`);
    
    // Create fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(api.url(word), {
        ...fetchOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const apiData = await response.json();
      console.log(`Raw API data for "${word}":`, JSON.stringify(apiData).substring(0, 200) + '...');
      
      // Parse data based on API source
      switch (apiSource) {
        case 'free-dictionary':
          return parseFreeDictionaryAPI(apiData, word);
        case 'wordnik':
          return parseWordnikAPI(apiData, word);
        case 'dictionary-api':
          return parseDictionaryAPI(apiData, word);
        case 'words-api':
          return parseWordsAPI(apiData, word);
        default:
          throw new Error(`Parser not implemented for API: ${apiSource}`);
      }
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error(`Request timeout after 10 seconds`);
      }
      throw fetchError;
    }
    
  } catch (error) {
    console.error(`Error in fetchWordFromAPI for "${word}" from ${apiSource}:`, error);
    throw error;
  }
}

// Parse Free Dictionary API response
function parseFreeDictionaryAPI(apiData, word) {
  try {
    console.log(`Parsing Free Dictionary API data for "${word}"`);
    
    if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
      throw new Error('No word data found - invalid response format');
    }
    
    const wordData = apiData[0];
    if (!wordData || typeof wordData !== 'object') {
      throw new Error('No word data found - invalid word object');
    }
    
    // Extract pronunciation
    let pronunciation = '';
    try {
      if (wordData.phonetics && Array.isArray(wordData.phonetics) && wordData.phonetics.length > 0) {
        for (const phonetic of wordData.phonetics) {
          if (phonetic && phonetic.text) {
            pronunciation = phonetic.text;
            break;
          }
        }
      }
    } catch (phoneticError) {
      console.log(`Warning: Could not extract pronunciation for "${word}":`, phoneticError.message);
    }
    
    // Extract meaning and category
    let meaning = '';
    let category = 'general';
    let example = '';
    
    try {
      if (wordData.meanings && Array.isArray(wordData.meanings) && wordData.meanings.length > 0) {
        for (const meaningObj of wordData.meanings) {
          if (meaningObj && meaningObj.definitions && Array.isArray(meaningObj.definitions)) {
            for (const definition of meaningObj.definitions) {
              if (definition && definition.definition) {
                meaning = definition.definition;
                example = definition.example || '';
                
                // Get part of speech for category mapping
                if (meaningObj.partOfSpeech) {
                  category = mapPartOfSpeechToCategory(meaningObj.partOfSpeech);
                }
                break;
              }
            }
            if (meaning) break;
          }
        }
      }
    } catch (meaningError) {
      console.log(`Warning: Could not extract meaning for "${word}":`, meaningError.message);
    }
    
    if (!meaning || meaning.trim().length === 0) {
      throw new Error('No valid definition found');
    }
    
    const result = {
      word: word.toLowerCase().trim(),
      meaning: meaning.trim(),
      pronunciation: pronunciation.trim(),
      example: example.trim(),
      level: determineDifficultyLevel(word, meaning),
      category: category
    };
    
    console.log(`Successfully parsed Free Dictionary data for "${word}":`, {
      word: result.word,
      meaningLength: result.meaning.length,
      hasExample: !!result.example,
      hasPronunciation: !!result.pronunciation,
      category: result.category,
      level: result.level
    });
    
    return result;
    
  } catch (error) {
    console.error(`Error parsing Free Dictionary API data for "${word}":`, error);
    throw error;
  }
}

// Parse Wordnik API response
function parseWordnikAPI(apiData, word) {
  try {
    console.log(`Parsing Wordnik API data for "${word}"`);
    
    if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
      throw new Error('No definitions found - invalid response format');
    }
    
    const definition = apiData[0];
    if (!definition || typeof definition !== 'object') {
      throw new Error('No definition found - invalid definition object');
    }
    
    const meaning = definition.text || definition.definition || '';
    const partOfSpeech = definition.partOfSpeech || '';
    
    if (!meaning || meaning.trim().length === 0) {
      throw new Error('No valid definition text found');
    }
    
    const result = {
      word: word.toLowerCase().trim(),
      meaning: meaning.trim(),
      pronunciation: '', // Wordnik definitions don't include pronunciation
      example: '', // Would need separate API call for examples
      level: determineDifficultyLevel(word, meaning),
      category: mapPartOfSpeechToCategory(partOfSpeech)
    };
    
    console.log(`Successfully parsed Wordnik data for "${word}":`, {
      word: result.word,
      meaningLength: result.meaning.length,
      partOfSpeech: partOfSpeech,
      category: result.category,
      level: result.level
    });
    
    return result;
    
  } catch (error) {
    console.error(`Error parsing Wordnik API data for "${word}":`, error);
    throw error;
  }
}

// Parse Dictionary API (Merriam-Webster style) response - Placeholder
function parseDictionaryAPI(apiData, word) {
  // This would need implementation if API key is available
  throw new Error('Dictionary API requires API key registration');
}

// Parse Words API (RapidAPI) response - Placeholder  
function parseWordsAPI(apiData, word) {
  // This would need implementation if RapidAPI key is available
  throw new Error('Words API requires RapidAPI key');
}

// Determine difficulty level
function determineDifficultyLevel(word, meaning) {
  if (word.length > 8 || meaning.split(' ').length > 10) {
    return 'advanced';
  } else if (word.length > 5) {
    return 'intermediate';
  }
  return 'beginner';
}

// Helper function to map part of speech to category
function mapPartOfSpeechToCategory(partOfSpeech) {
  const mapping = {
    'noun': 'general',
    'verb': 'behavior',
    'adjective': 'description',
    'adverb': 'description',
    'pronoun': 'general',
    'preposition': 'general',
    'conjunction': 'general',
    'interjection': 'emotions'
  };
  
  return mapping[partOfSpeech] || 'general';
}

// Get available API sources
app.get('/api/vocabulary/sources', auth, async (req, res) => {
  try {
    const sources = Object.keys(API_SOURCES)
      .filter(key => !API_SOURCES[key].disabled) // Only return enabled sources
      .map(key => ({
        id: key,
        name: API_SOURCES[key].name,
        requiresKey: API_SOURCES[key].requiresKey,
        disabled: API_SOURCES[key].disabled || false
      }));
    
    return res.json({
      sources: sources,
      default: 'auto',
      totalSources: Object.keys(API_SOURCES).length,
      availableSources: sources.length
    });
  } catch (error) {
    console.error('Error getting API sources:', error);
    return res.status(500).json({ message: 'Error getting API sources' });
  }
});

// Batch import multiple words
app.post('/api/vocabulary/batch-import', auth, async (req, res) => {
  try {
    const { words, apiSource = 'auto' } = req.body;
    
    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ message: 'Words array is required' });
    }
    
    if (words.length > 20) {
      return res.status(400).json({ message: 'Maximum 20 words per batch' });
    }
    
    const results = {
      imported: [],
      failed: [],
      existing: []
    };
    
    // Determine which APIs to try for batch (only enabled ones)
    const sourcesToTry = apiSource === 'auto' 
      ? Object.keys(API_SOURCES).filter(key => !API_SOURCES[key].disabled) 
      : [apiSource];
    
    for (const word of words) {
      try {
        // Check if word already exists
        const existingWord = await Vocabulary.findOne({ word: word.toLowerCase() });
        if (existingWord) {
          results.existing.push(word);
          continue;
        }
        
        let vocabularyData = null;
        let usedSource = '';
        let wordErrors = [];
        
        // Try each API source until one succeeds
        for (const source of sourcesToTry) {
          try {
            vocabularyData = await fetchWordFromAPI(word, source);
            usedSource = source;
            break;
          } catch (error) {
            wordErrors.push(`${API_SOURCES[source].name}: ${error.message}`);
          }
        }
        
        if (!vocabularyData) {
          results.failed.push({ 
            word, 
            reason: 'Not found in any API',
            errors: wordErrors 
          });
          continue;
        }
        
        // Create vocabulary entry
        const vocabularyEntry = await Vocabulary.create(vocabularyData);
        
        // Add source info to result
        vocabularyEntry.source = API_SOURCES[usedSource].name;
        results.imported.push(vocabularyEntry);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error importing word ${word}:`, error);
        results.failed.push({ word, reason: 'Import error: ' + error.message });
      }
    }
    
    return res.json({
      message: 'Batch import completed',
      summary: {
        total: words.length,
        imported: results.imported.length,
        existing: results.existing.length,
        failed: results.failed.length
      },
      results: results
    });
    
  } catch (error) {
    console.error('Error in batch import:', error);
    return res.status(500).json({ message: 'Error in batch import' });
  }
});

// Auto-populate vocabulary database from APIs
app.post('/api/vocabulary/auto-populate', auth, async (req, res) => {
  try {
    const { count = 100, categories = ['all'], difficulty = ['all'] } = req.body;
    
    console.log(`Starting auto-population: ${count} words, categories: ${categories.join(', ')}`);
    
    // Validate input
    if (count <= 0 || count > 1000) {
      return res.status(400).json({ message: 'Count must be between 1 and 1000' });
    }
    
    const results = {
      total: 0,
      imported: 0,
      existing: 0,
      failed: 0,
      words: [],
      errors: []
    };
    
    try {
      // Get word lists based on categories and difficulty
      const wordLists = getWordListsForPopulation(categories, difficulty);
      console.log(`Generated word list with ${wordLists.length} words`);
      
      if (wordLists.length === 0) {
        return res.status(400).json({ message: 'No words found for the selected categories' });
      }
      
      const wordsToProcess = selectRandomWords(wordLists, count);
      console.log(`Selected ${wordsToProcess.length} words for processing`);
      
      results.total = wordsToProcess.length;
      
      // Check available APIs
      const availableAPIs = Object.keys(API_SOURCES).filter(key => !API_SOURCES[key].disabled);
      console.log(`Available APIs: ${availableAPIs.join(', ')}`);
      
      if (availableAPIs.length === 0) {
        return res.status(500).json({ message: 'No APIs available for importing words' });
      }
      
      for (let i = 0; i < wordsToProcess.length; i++) {
        const word = wordsToProcess[i];
        console.log(`Processing word ${i + 1}/${wordsToProcess.length}: ${word}`);
        
        try {
          // Check if word already exists
          const existingWord = await Vocabulary.findOne({ word: word.toLowerCase() });
          if (existingWord) {
            results.existing++;
            console.log(`Word "${word}" already exists in database`);
            continue;
          }
          
          // Try to import from APIs
          let vocabularyData = null;
          let usedSource = '';
          let wordErrors = [];
          
          // Try each API until one succeeds
          for (const source of availableAPIs) {
            try {
              console.log(`Trying ${API_SOURCES[source].name} for "${word}"`);
              vocabularyData = await fetchWordFromAPI(word, source);
              usedSource = source;
              console.log(`✓ Success with ${API_SOURCES[source].name} for "${word}"`);
              break;
            } catch (error) {
              const errorMsg = `${API_SOURCES[source].name}: ${error.message}`;
              wordErrors.push(errorMsg);
              console.log(`✗ ${errorMsg}`);
            }
          }
          
          if (vocabularyData) {
            try {
              const vocabularyEntry = await Vocabulary.create(vocabularyData);
              results.imported++;
              results.words.push({
                word: vocabularyEntry.word,
                meaning: vocabularyEntry.meaning.length > 80 
                  ? vocabularyEntry.meaning.substring(0, 80) + '...' 
                  : vocabularyEntry.meaning,
                source: API_SOURCES[usedSource].name
              });
              console.log(`✓ Successfully imported: ${word} from ${API_SOURCES[usedSource].name}`);
            } catch (dbError) {
              results.failed++;
              results.errors.push(`Database error for "${word}": ${dbError.message}`);
              console.error(`Database error for "${word}":`, dbError);
            }
          } else {
            results.failed++;
            results.errors.push(`No API could find "${word}": ${wordErrors.join(', ')}`);
            console.log(`✗ Failed: ${word} - not found in any API`);
          }
          
          // Add delay to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`Error processing word ${word}:`, error);
          results.failed++;
          results.errors.push(`Processing error for "${word}": ${error.message}`);
        }
      }
      
      console.log(`Auto-population completed: ${results.imported}/${results.total} imported`);
      
      return res.json({
        message: 'Auto-population completed',
        results: results,
        summary: `Imported ${results.imported}/${results.total} words successfully`
      });
      
    } catch (listError) {
      console.error('Error generating word lists:', listError);
      return res.status(500).json({ 
        message: 'Error generating word lists',
        error: listError.message 
      });
    }
    
  } catch (error) {
    console.error('Error in auto-population:', error);
    return res.status(500).json({ 
      message: 'Error in auto-population',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get comprehensive word lists for population
function getWordListsForPopulation(categories, difficulty) {
  const wordLists = {
    // Common English words by category
    general: [
      'amazing', 'beautiful', 'creative', 'delicious', 'excellent', 'fantastic', 'gorgeous', 'incredible',
      'wonderful', 'spectacular', 'magnificent', 'brilliant', 'outstanding', 'remarkable', 'extraordinary',
      'adventure', 'journey', 'discovery', 'exploration', 'experience', 'opportunity', 'challenge', 'success',
      'achievement', 'progress', 'development', 'improvement', 'innovation', 'solution', 'strategy', 'method'
    ],
    
    emotions: [
      'happiness', 'joy', 'excitement', 'enthusiasm', 'optimism', 'gratitude', 'satisfaction', 'contentment',
      'sadness', 'disappointment', 'frustration', 'anxiety', 'worry', 'fear', 'anger', 'jealousy',
      'love', 'affection', 'compassion', 'empathy', 'sympathy', 'kindness', 'generosity', 'patience',
      'confidence', 'courage', 'determination', 'persistence', 'resilience', 'hope', 'faith', 'trust'
    ],
    
    personality: [
      'ambitious', 'confident', 'creative', 'determined', 'enthusiastic', 'friendly', 'generous', 'honest',
      'intelligent', 'kind', 'loyal', 'optimistic', 'patient', 'reliable', 'responsible', 'sincere',
      'arrogant', 'selfish', 'impatient', 'dishonest', 'lazy', 'stubborn', 'pessimistic', 'unreliable',
      'charismatic', 'diplomatic', 'empathetic', 'innovative', 'intuitive', 'methodical', 'pragmatic', 'versatile'
    ],
    
    business: [
      'management', 'leadership', 'strategy', 'marketing', 'finance', 'investment', 'profit', 'revenue',
      'customer', 'client', 'service', 'quality', 'efficiency', 'productivity', 'innovation', 'competition',
      'negotiation', 'partnership', 'collaboration', 'teamwork', 'communication', 'presentation', 'meeting', 'conference',
      'analysis', 'research', 'development', 'planning', 'execution', 'evaluation', 'feedback', 'improvement'
    ],
    
    technology: [
      'computer', 'software', 'hardware', 'internet', 'website', 'application', 'database', 'network',
      'programming', 'coding', 'algorithm', 'artificial', 'intelligence', 'machine', 'learning', 'automation',
      'digital', 'virtual', 'online', 'wireless', 'mobile', 'smartphone', 'tablet', 'laptop',
      'security', 'privacy', 'encryption', 'cloud', 'storage', 'backup', 'update', 'upgrade'
    ],
    
    science: [
      'research', 'experiment', 'hypothesis', 'theory', 'evidence', 'analysis', 'conclusion', 'discovery',
      'biology', 'chemistry', 'physics', 'mathematics', 'statistics', 'probability', 'calculation', 'equation',
      'environment', 'climate', 'ecosystem', 'biodiversity', 'conservation', 'sustainability', 'renewable', 'pollution',
      'evolution', 'genetics', 'molecular', 'cellular', 'organism', 'species', 'population', 'habitat'
    ],
    
    education: [
      'learning', 'teaching', 'education', 'knowledge', 'understanding', 'comprehension', 'skill', 'ability',
      'student', 'teacher', 'professor', 'instructor', 'curriculum', 'syllabus', 'assignment', 'homework',
      'examination', 'assessment', 'evaluation', 'grade', 'achievement', 'performance', 'progress', 'development',
      'scholarship', 'graduation', 'degree', 'diploma', 'certificate', 'qualification', 'expertise', 'mastery'
    ],
    
    health: [
      'healthy', 'fitness', 'exercise', 'nutrition', 'diet', 'wellness', 'medical', 'treatment',
      'doctor', 'nurse', 'hospital', 'clinic', 'medicine', 'therapy', 'recovery', 'healing',
      'disease', 'illness', 'infection', 'symptom', 'diagnosis', 'prevention', 'vaccination', 'immunity',
      'mental', 'physical', 'emotional', 'psychological', 'stress', 'relaxation', 'meditation', 'balance'
    ]
  };
  
  // Advanced/Academic words
  const advancedWords = [
    'serendipity', 'ephemeral', 'quintessential', 'ubiquitous', 'meticulous', 'prolific', 'pragmatic', 'indigenous',
    'sophisticated', 'contemporary', 'fundamental', 'comprehensive', 'inevitable', 'substantial', 'considerable', 'significant',
    'predominant', 'paramount', 'crucial', 'essential', 'vital', 'indispensable', 'irreplaceable', 'invaluable',
    'unprecedented', 'extraordinary', 'remarkable', 'exceptional', 'outstanding', 'magnificent', 'spectacular', 'phenomenal'
  ];
  
  // Combine lists based on requested categories
  let selectedWords = [];
  
  if (categories.includes('all')) {
    selectedWords = Object.values(wordLists).flat().concat(advancedWords);
  } else {
    for (const category of categories) {
      if (wordLists[category]) {
        selectedWords = selectedWords.concat(wordLists[category]);
      }
    }
    
    if (difficulty.includes('all') || difficulty.includes('advanced')) {
      selectedWords = selectedWords.concat(advancedWords);
    }
  }
  
  // Remove duplicates
  return [...new Set(selectedWords)];
}

// Select random words from the list
function selectRandomWords(wordList, count) {
  const shuffled = wordList.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Test API endpoint for debugging
app.post('/api/vocabulary/test-api', auth, async (req, res) => {
  try {
    const { word = 'test', apiSource = 'free-dictionary' } = req.body;
    
    console.log(`Testing API: ${apiSource} with word: ${word}`);
    
    const api = API_SOURCES[apiSource];
    if (!api) {
      return res.status(400).json({ error: `Unknown API source: ${apiSource}` });
    }
    
    if (api.disabled) {
      return res.status(400).json({ error: `API source ${apiSource} is disabled` });
    }
    
    try {
      const vocabularyData = await fetchWordFromAPI(word, apiSource);
      
      return res.json({
        success: true,
        word: word,
        apiSource: apiSource,
        apiName: api.name,
        data: vocabularyData,
        message: 'API test successful'
      });
      
    } catch (apiError) {
      return res.json({
        success: false,
        word: word,
        apiSource: apiSource,
        apiName: api.name,
        error: apiError.message,
        message: 'API test failed'
      });
    }
    
  } catch (error) {
    console.error('Error in API test:', error);
    return res.status(500).json({ 
      error: error.message,
      message: 'Test endpoint error' 
    });
  }
});

// Get database statistics
app.get('/api/vocabulary/stats', auth, async (req, res) => {
  try {
    const totalWords = await Vocabulary.countDocuments();
    const categoryCounts = await Vocabulary.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const levelCounts = await Vocabulary.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const userLearnedCount = await LearnedWord.countDocuments({ user: req.user.id });
    
    return res.json({
      totalWords,
      userLearnedCount,
      availableWords: totalWords - userLearnedCount,
      categoryCounts,
      levelCounts,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error getting vocabulary stats:', error);
    return res.status(500).json({ message: 'Error getting vocabulary statistics' });
  }
});

// Seed vocabulary (for development/initial setup)
app.post('/api/vocabulary/seed', auth, async (req, res) => {
  try {
    const sampleVocabulary = [
      {
        word: "serendipity",
        meaning: "sự tình cờ may mắn, khám phá ngẫu nhiên những điều tốt đẹp",
        pronunciation: "/ˌserənˈdɪpəti/",
        example: "It was pure serendipity that I met my best friend at the coffee shop.",
        level: "advanced",
        category: "emotions"
      },
      {
        word: "resilient",
        meaning: "có khả năng phục hồi nhanh, bền bỉ",
        pronunciation: "/rɪˈzɪljənt/",
        example: "She remained resilient despite all the challenges.",
        level: "intermediate",
        category: "personality"
      },
      {
        word: "ambitious",
        meaning: "tham vọng, có nhiều hoài bão",
        pronunciation: "/æmˈbɪʃəs/",
        example: "He is an ambitious young man who wants to start his own business.",
        level: "intermediate",
        category: "personality"
      },
      {
        word: "procrastinate",
        meaning: "trì hoãn, làm việc chậm chạp",
        pronunciation: "/prəˈkræstɪneɪt/",
        example: "I tend to procrastinate when I have difficult tasks to complete.",
        level: "advanced",
        category: "behavior"
      },
      {
        word: "gratitude",
        meaning: "lòng biết ơn",
        pronunciation: "/ˈɡrætɪtuːd/",
        example: "I expressed my gratitude to everyone who helped me.",
        level: "intermediate",
        category: "emotions"
      },
      {
        word: "perseverance",
        meaning: "sự bền bỉ, kiên trì",
        pronunciation: "/ˌpɜːrsəˈvɪrəns/",
        example: "Success requires perseverance and hard work.",
        level: "advanced",
        category: "character"
      },
      {
        word: "innovative",
        meaning: "sáng tạo, đổi mới",
        pronunciation: "/ˈɪnəveɪtɪv/",
        example: "The company is known for its innovative products.",
        level: "intermediate",
        category: "business"
      },
      {
        word: "collaborate",
        meaning: "hợp tác, cộng tác",
        pronunciation: "/kəˈlæbəreɪt/",
        example: "We need to collaborate to finish this project on time.",
        level: "intermediate",
        category: "work"
      },
      {
        word: "tremendous",
        meaning: "to lớn, khổng lồ",
        pronunciation: "/trɪˈmendəs/",
        example: "She made a tremendous effort to help us.",
        level: "intermediate",
        category: "general"
      },
      {
        word: "magnificent",
        meaning: "tráng lệ, hoành tráng",
        pronunciation: "/mæɡˈnɪfɪsənt/",
        example: "The view from the mountain top was magnificent.",
        level: "intermediate",
        category: "description"
      }
    ];
    
    // Only add if doesn't exist
    for (const vocab of sampleVocabulary) {
      const existing = await Vocabulary.findOne({ word: vocab.word });
      if (!existing) {
        await Vocabulary.create(vocab);
      }
    }
    
    return res.json({ message: `Seeded ${sampleVocabulary.length} vocabulary words` });
  } catch (error) {
    console.error('Error seeding vocabulary:', error);
    return res.status(500).json({ message: 'Error seeding vocabulary' });
  }
});

// Bill Routes
app.get('/api/bills', auth, async (req, res) => {
  try {
    const bills = await Bill.find({ user: req.user.id }).sort({ updatedAt: -1 });
    return res.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    return res.status(500).json({ message: 'Error fetching bills' });
  }
});

app.post('/api/bills', auth, async (req, res) => {
  try {
    const { title, description, startDate, endDate, participants = [] } = req.body;
    
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ message: 'Title, start date, and end date are required' });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    const bill = await Bill.create({
      user: req.user.id,
      title,
      description,
      startDate: start,
      endDate: end,
      participants
    });
    
    return res.status(201).json(bill);
  } catch (error) {
    console.error('Error creating bill:', error);
    return res.status(500).json({ message: 'Error creating bill' });
  }
});

app.get('/api/bills/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid bill ID' });
    }
    
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    return res.json(bill);
  } catch (error) {
    console.error('Error fetching bill:', error);
    return res.status(500).json({ message: 'Error fetching bill' });
  }
});

app.put('/api/bills/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid bill ID' });
    }
    
    const { title, description, startDate, endDate, status, qrImage } = req.body;
    const updateData = {};
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (qrImage !== undefined) updateData.qrImage = qrImage;
    if (status) updateData.status = status;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
      
      updateData.startDate = start;
      updateData.endDate = end;
    }
    
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    return res.json(bill);
  } catch (error) {
    console.error('Error updating bill:', error);
    return res.status(500).json({ message: 'Error updating bill' });
  }
});

app.delete('/api/bills/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid bill ID' });
    }
    
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    return res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return res.status(500).json({ message: 'Error deleting bill' });
  }
});

// Create or rotate public share link for a bill
app.post('/api/bills/:id/share', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid bill ID' });
    }
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user.id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    // Generate random share key
    const key = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    bill.shareKey = key;
    await bill.save();
    return res.json({ shareUrl: `${process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:5501'}/share/${key}` });
  } catch (error) {
    console.error('Error creating share link:', error);
    return res.status(500).json({ message: 'Error creating share link' });
  }
});

// Public endpoint to view single bill (no auth)
app.get('/api/public/bills/:shareKey', async (req, res) => {
  try {
    const bill = await Bill.findOne({ shareKey: req.params.shareKey });
    if (!bill) return res.status(404).json({ message: 'Not found' });
    return res.json(bill);
  } catch (error) {
    console.error('Error fetching shared bill:', error);
    return res.status(500).json({ message: 'Error fetching shared bill' });
  }
});

// Participant management
app.post('/api/bills/:id/participants', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid bill ID' });
    }
    
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Participant name is required' });
    }
    
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    try {
      await bill.addParticipant({ name: name.trim() });
      return res.status(201).json(bill);
    } catch (addError) {
      return res.status(400).json({ message: addError.message });
    }
  } catch (error) {
    console.error('Error adding participant:', error);
    return res.status(500).json({ message: 'Error adding participant' });
  }
});

app.delete('/api/bills/:id/participants/:participantId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.participantId)) {
      return res.status(400).json({ message: 'Invalid bill ID or participant ID' });
    }
    
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    try {
      await bill.removeParticipant(req.params.participantId);
      return res.json(bill);
    } catch (removeError) {
      return res.status(400).json({ message: removeError.message });
    }
  } catch (error) {
    console.error('Error removing participant:', error);
    return res.status(500).json({ message: 'Error removing participant' });
  }
});

// Global Participants management
app.get('/api/participants', auth, async (req, res) => {
  try {
    const participants = await Participant.findByUser(req.user.id);
    return res.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    return res.status(500).json({ message: 'Error fetching participants' });
  }
});

app.post('/api/participants', auth, async (req, res) => {
  try {
    console.log('Creating participant with data:', req.body);
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Participant name is required' });
    }
    
    const participant = new Participant({
      name: name.trim(),
      user: req.user.id
    });
    
    console.log('Saving participant:', participant);
    await participant.save();
    console.log('Participant saved successfully:', participant);
    return res.status(201).json(participant);
  } catch (error) {
    console.error('Error creating participant:', error);
    return res.status(500).json({ message: 'Error creating participant: ' + error.message });
  }
});

app.delete('/api/participants/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid participant ID' });
    }
    
    const participant = await Participant.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Remove participant from all bills
    await Bill.updateMany(
      { user: req.user.id },
      { $pull: { participants: { _id: req.params.id } } }
    );
    
    return res.json({ message: 'Participant deleted successfully' });
  } catch (error) {
    console.error('Error deleting participant:', error);
    return res.status(500).json({ message: 'Error deleting participant' });
  }
});

// Daily details management
app.post('/api/bills/:id/daily-details', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid bill ID' });
    }
    
    const { date, amount, splitCount, selectedParticipants, description } = req.body;
    
    if (!date || amount === undefined || !splitCount) {
      return res.status(400).json({ message: 'Date, amount, and split count are required' });
    }
    
    if (amount < 0) {
      return res.status(400).json({ message: 'Amount must be non-negative' });
    }
    
    if (splitCount < 1) {
      return res.status(400).json({ message: 'Split count must be at least 1' });
    }
    
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    try {
      await bill.addDailyDetail({
        date: new Date(date),
        amount: parseFloat(amount),
        splitCount: parseInt(splitCount),
        selectedParticipants: selectedParticipants || [],
        description: description ? description.trim() : ''
      });
      return res.status(201).json(bill);
    } catch (addError) {
      return res.status(400).json({ message: addError.message });
    }
  } catch (error) {
    console.error('Error adding daily detail:', error);
    return res.status(500).json({ message: 'Error adding daily detail' });
  }
});

app.put('/api/bills/:id/daily-details/:detailId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.detailId)) {
      return res.status(400).json({ message: 'Invalid bill ID or detail ID' });
    }
    
    const { date, amount, splitCount, selectedParticipants, description } = req.body;
    const updateData = {};
    
    if (date) updateData.date = new Date(date);
    if (amount !== undefined) {
      if (amount < 0) {
        return res.status(400).json({ message: 'Amount must be non-negative' });
      }
      updateData.amount = parseFloat(amount);
    }
    if (splitCount !== undefined) {
      if (splitCount < 1) {
        return res.status(400).json({ message: 'Split count must be at least 1' });
      }
      updateData.splitCount = parseInt(splitCount);
    }
    if (selectedParticipants !== undefined) updateData.selectedParticipants = selectedParticipants || [];
    if (description !== undefined) updateData.description = description ? description.trim() : '';
    
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    try {
      await bill.updateDailyDetail(req.params.detailId, updateData);
      return res.json(bill);
    } catch (updateError) {
      return res.status(400).json({ message: updateError.message });
    }
  } catch (error) {
    console.error('Error updating daily detail:', error);
    return res.status(500).json({ message: 'Error updating daily detail' });
  }
});

app.delete('/api/bills/:id/daily-details/:detailId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.detailId)) {
      return res.status(400).json({ message: 'Invalid bill ID or detail ID' });
    }
    
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    try {
      await bill.removeDailyDetail(req.params.detailId);
      return res.json(bill);
    } catch (removeError) {
      return res.status(400).json({ message: removeError.message });
    }
  } catch (error) {
    console.error('Error removing daily detail:', error);
    return res.status(500).json({ message: 'Error removing daily detail' });
  }
});

// Bill statistics
app.get('/api/bills/stats', auth, async (req, res) => {
  try {
    const totalBills = await Bill.countDocuments({ user: req.user.id });
    const activeBills = await Bill.countDocuments({ user: req.user.id, status: 'active' });
    const completedBills = await Bill.countDocuments({ user: req.user.id, status: 'completed' });
    
    // Total amount across all bills
    const billsWithAmount = await Bill.find({ user: req.user.id, totalAmount: { $gt: 0 } });
    const totalAmount = billsWithAmount.reduce((sum, bill) => sum + bill.totalAmount, 0);
    
    return res.json({
      totalBills,
      activeBills,
      completedBills,
      totalAmount: Math.round(totalAmount * 100) / 100,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error getting bill stats:', error);
    return res.status(500).json({ message: 'Error getting bill statistics' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
