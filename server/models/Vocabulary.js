import mongoose from 'mongoose';

const vocabularySchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  meaning: {
    type: String,
    required: true,
    trim: true
  },
  pronunciation: {
    type: String,
    trim: true
  },
  example: {
    type: String,
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  category: {
    type: String,
    trim: true,
    default: 'general'
  }
}, {
  timestamps: true
});

// Index for better search performance
vocabularySchema.index({ word: 1 });
vocabularySchema.index({ level: 1 });

export default mongoose.model('Vocabulary', vocabularySchema);
