import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodInfo",
      required: true,
      index: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientModel",
      index: true,
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ["User", "Ngo"],
    },
    // User who receives the notification (donor user or NGO representative user)
    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    reviewerRole: {
      type: String,
      required: true,
      enum: ["donor", "ngo"],
    },
    rating: {
      type: Number,
      required: [true, "Rating score is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: function (v) {
          return Number.isInteger(v);
        },
        message: "Rating score must be an integer between 1 and 5",
      },
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
      default: "",
    },
  },
  { timestamps: true }
);

// Compound unique index ensuring one rating per reviewer per donation
ratingSchema.index({ donation: 1, reviewer: 1 }, { unique: true });

// Performance indexes for summaries and reviews
ratingSchema.index({ recipient: 1, reviewerRole: 1, createdAt: -1 });
ratingSchema.index({ recipientUser: 1, createdAt: -1 });
ratingSchema.index({ reviewer: 1, createdAt: -1 });

const Rating = mongoose.model("Rating", ratingSchema);

export default Rating;
