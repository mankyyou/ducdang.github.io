import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
  // Liên kết với user
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Thông tin chung của bill
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Optional QR image (Data URL)
  qrImage: {
    type: String
  },
  
  // Thời gian
  startDate: {
    type: Date,
    required: true
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  // Danh sách những người tham gia
  participants: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Chi tiết từng ngày
  dailyDetails: [{
    date: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    splitCount: {
      type: Number,
      required: true,
      min: 1
    },
    selectedParticipants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant'
    }],
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    // Tính toán tự động
    amountPerPerson: {
      type: Number,
      default: 0
    }
  }],
  
  // Tổng kết
  totalAmount: {
    type: Number,
    default: 0
  },
  
  totalDays: {
    type: Number,
    default: 0
  },
  
  // Trạng thái
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
billSchema.index({ user: 1, createdAt: -1 });
billSchema.index({ user: 1, status: 1 });
billSchema.index({ startDate: 1, endDate: 1 });

// Virtual for calculating average per day
billSchema.virtual('averagePerDay').get(function() {
  if (this.totalDays > 0 && this.totalAmount > 0) {
    return Math.round((this.totalAmount / this.totalDays) * 100) / 100;
  }
  return 0;
});

// Virtual for calculating total participants
billSchema.virtual('totalParticipants').get(function() {
  return this.participants ? this.participants.length : 0;
});

// Pre-save middleware để tính toán các giá trị tự động
billSchema.pre('save', function(next) {
  // Tính tổng số tiền
  this.totalAmount = this.dailyDetails.reduce((sum, detail) => sum + detail.amount, 0);
  
  // Tính tổng số ngày
  this.totalDays = this.dailyDetails.length;
  
  // Tính số tiền mỗi người cho từng ngày
  this.dailyDetails.forEach(detail => {
    if (detail.splitCount > 0) {
      detail.amountPerPerson = Math.round((detail.amount / detail.splitCount) * 100) / 100;
    }
  });
  
  next();
});

// Static methods
billSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId }).sort({ updatedAt: -1 });
};

billSchema.statics.findActiveByUser = function(userId) {
  return this.find({ user: userId, status: 'active' }).sort({ updatedAt: -1 });
};

// Instance methods
billSchema.methods.addParticipant = function(participantData) {
  // Allow duplicate names - no validation needed
  this.participants.push(participantData);
  return this.save();
};

billSchema.methods.removeParticipant = function(participantId) {
  const participant = this.participants.id(participantId);
  if (!participant) {
    throw new Error('Participant not found');
  }
  this.participants.pull(participantId);
  return this.save();
};

billSchema.methods.addDailyDetail = function(detailData) {
  // Allow multiple daily details for the same date
  this.dailyDetails.push(detailData);
  return this.save();
};

billSchema.methods.updateDailyDetail = function(detailId, updateData) {
  const detail = this.dailyDetails.id(detailId);
  if (!detail) {
    throw new Error('Daily detail not found');
  }
  
  Object.assign(detail, updateData);
  return this.save();
};

billSchema.methods.removeDailyDetail = function(detailId) {
  const detail = this.dailyDetails.id(detailId);
  if (!detail) {
    throw new Error('Daily detail not found');
  }
  this.dailyDetails.pull(detailId);
  return this.save();
};

// Export model
export default mongoose.model('Bill', billSchema);
