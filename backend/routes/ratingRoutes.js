import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import isAdmin from "../middlewares/isAdmin.js";
import {
  createRating,
  getRatingSummary,
  getReviews,
  getDonationRatingStatus,
  getLowestRatedNgos,
  getMySubmittedRatings,
} from "../controllers/ratingController.js";

const router = express.Router();

// Admin lowest rated NGOs
router.get("/admin/lowest-rated-ngos", protect, isAdmin, getLowestRatedNgos);

// Submit rating
router.post("/", protect, createRating);

// Current user rating history
router.get("/me", protect, getMySubmittedRatings);

// Public rating summary & reviews
router.get("/summary/:targetId", getRatingSummary);
router.get("/reviews/:targetId", getReviews);

// Check rating eligibility and status for a specific donation
router.get("/donation/:donationId/status", protect, getDonationRatingStatus);

export default router;
