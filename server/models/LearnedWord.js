import mongoose from 'mongoose';

const learnedWordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vocabulary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vocabulary',
    required: true
  },
  learnedAt: {
    type: Date,
    default: Date.now
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  lastReviewedAt: {
    type: Date
  },
  proficiency: {
    type: String,
    enum: ['learning', 'familiar', 'mastered'],
    default: 'learning'
  }
}, {
  timestamps: true
});

// Compound index to ensure one vocabulary per user
learnedWordSchema.index({ user: 1, vocabulary: 1 }, { unique: true });
learnedWordSchema.index({ user: 1, learnedAt: -1 });

export default mongoose.model('LearnedWord', learnedWordSchema);
