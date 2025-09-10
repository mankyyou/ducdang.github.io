import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Static methods
participantSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId }).sort({ createdAt: -1 });
};

// Instance methods
participantSchema.methods.toJSON = function() {
  const participant = this.toObject();
  delete participant.user;
  return participant;
};

// Export model
export default mongoose.model('Participant', participantSchema);
