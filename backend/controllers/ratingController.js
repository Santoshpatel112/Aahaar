import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import Rating from "../models/ratingModel.js";
import FoodInfo from "../models/foodInfoModel.js";
import Ngo from "../models/ngoModel.js";
import User from "../models/userModel.js";
import NgoFoodRequest from "../models/ngoFoodRequestModel.js";
import { notify } from "../services/notification.service.js";

/**
 * Helper to determine if a status string signifies donation completion
 */
export const isCompletedStatus = (status) => {
  if (!status) return false;
  const s = String(status).trim().toUpperCase();
  return ["COMPLETED", "DONE", "FULFILLED"].includes(s);
};

/**
 * Resolve participant identities from a donation document
 */
export const resolveDonationParticipants = async (donation) => {
  let donorId = null;
  let ngoId = null;
  let ngoRegisteredBy = null;
  let ngoName = "NGO";
  let donorName = "Donor";

  if (donation.foodItemDetails) {
    // FoodInfo document
    donorId = donation.foodItemDetails?.[0]?.donorId;
    ngoId = donation.pickedUpByNgo || (donation.ngoPreference !== "random" ? donation.ngoPreference : null);
  } else if (donation.foodItemsNeeded) {
    // NgoFoodRequest document
    ngoId = donation.ngoId;
    donorId = donation.acceptedBy;
  }

  if (ngoId) {
    if (ngoId.ngoName) {
      // Already populated document
      ngoName = ngoId.ngoName;
      ngoRegisteredBy = ngoId.registeredBy?._id || ngoId.registeredBy || null;
      ngoId = ngoId._id;
    } else {
      const ngoDoc = await Ngo.findById(ngoId);
      if (ngoDoc) {
        ngoName = ngoDoc.ngoName;
        ngoRegisteredBy = ngoDoc.registeredBy;
        ngoId = ngoDoc._id;
      }
    }
  }

  if (donorId) {
    if (donorId.firstName) {
      // Already populated document
      donorName = `${donorId.firstName || ""} ${donorId.surname || ""}`.trim() || donorName;
      donorId = donorId._id;
    } else {
      const donorDoc = await User.findById(donorId);
      if (donorDoc) {
        donorName = `${donorDoc.firstName || ""} ${donorDoc.surname || ""}`.trim() || donorName;
        donorId = donorDoc._id;
      }
    }
  }

  return {
    donorId: donorId ? donorId.toString() : null,
    donorName,
    ngoId: ngoId ? ngoId.toString() : null,
    ngoRegisteredBy: ngoRegisteredBy ? ngoRegisteredBy.toString() : null,
    ngoName,
  };
};

/**
 * @desc    Submit a two-way rating for a completed donation
 * @route   POST /aahar/ratings
 * @access  Private
 */
export const createRating = asyncHandler(async (req, res) => {
  const { donationId, rating, comment } = req.body;

  if (!donationId) {
    res.status(400);
    throw new Error("donationId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(donationId)) {
    res.status(400);
    throw new Error("Invalid donationId format");
  }

  const numericRating = Number(rating);
  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    res.status(400);
    throw new Error("Rating score must be an integer between 1 and 5");
  }

  const trimmedComment = typeof comment === "string" ? comment.trim() : "";
  if (trimmedComment.length > 1000) {
    res.status(400);
    throw new Error("Comment cannot exceed 1000 characters");
  }

  // Find donation in FoodInfo or NgoFoodRequest
  let donation = await FoodInfo.findById(donationId);
  let isNgoFoodRequest = false;

  if (!donation) {
    donation = await NgoFoodRequest.findById(donationId);
    if (donation) {
      isNgoFoodRequest = true;
    }
  }

  if (!donation) {
    res.status(404);
    throw new Error("Donation not found");
  }

  // Check completion status
  if (!isCompletedStatus(donation.status)) {
    res.status(400);
    throw new Error("Cannot rate an incomplete or unverified donation");
  }

  const participants = await resolveDonationParticipants(donation);

  if (!participants.donorId || !participants.ngoId) {
    res.status(400);
    throw new Error("Donation does not have both an assigned donor and NGO");
  }

  const currentUserId = req.user._id.toString();

  // Determine reviewer role and recipient
  let reviewerRole = null;
  let recipient = null;
  let recipientModel = null;
  let recipientUser = null;
  let recipientName = "";

  if (currentUserId === participants.donorId) {
    // Current user is the donor rating the NGO
    reviewerRole = "donor";
    recipient = new mongoose.Types.ObjectId(participants.ngoId);
    recipientModel = "Ngo";
    recipientUser = participants.ngoRegisteredBy
      ? new mongoose.Types.ObjectId(participants.ngoRegisteredBy)
      : null;
    recipientName = participants.ngoName;

    // Self-rating check
    if (participants.ngoRegisteredBy && currentUserId === participants.ngoRegisteredBy) {
      res.status(400);
      throw new Error("You cannot rate yourself");
    }
  } else {
    // Check if current user is the NGO representative
    const userNgo = await Ngo.findOne({ registeredBy: req.user._id });
    if (
      userNgo &&
      (userNgo._id.toString() === participants.ngoId ||
        (participants.ngoRegisteredBy && currentUserId === participants.ngoRegisteredBy))
    ) {
      reviewerRole = "ngo";
      recipient = new mongoose.Types.ObjectId(participants.donorId);
      recipientModel = "User";
      recipientUser = new mongoose.Types.ObjectId(participants.donorId);
      recipientName = participants.donorName;

      // Self-rating check
      if (currentUserId === participants.donorId) {
        res.status(400);
        throw new Error("You cannot rate yourself");
      }
    }
  }

  if (!reviewerRole || !recipient) {
    res.status(403);
    throw new Error("You are not an authorized participant for this donation");
  }

  // Early duplicate check
  const existingRating = await Rating.findOne({
    donation: donationId,
    reviewer: req.user._id,
  });

  if (existingRating) {
    return res.status(409).json({
      message: "You have already submitted a rating for this donation",
      existingRating,
    });
  }

  let createdRating;
  try {
    createdRating = await Rating.create({
      donation: donation._id,
      reviewer: req.user._id,
      recipient,
      recipientModel,
      recipientUser,
      reviewerRole,
      rating: numericRating,
      comment: trimmedComment,
    });
  } catch (err) {
    // Handle MongoDB compound unique index collision (E11000)
    if (err.code === 11000 || (err.message && err.message.includes("E11000"))) {
      return res.status(409).json({
        message: "You have already submitted a rating for this donation",
      });
    }
    throw err;
  }

  // Non-blocking notification dispatch
  if (recipientUser) {
    try {
      const reviewerDisplayName = `${req.user.firstName || ""} ${req.user.surname || ""}`.trim() || (reviewerRole === "donor" ? "A Donor" : "An NGO Partner");
      const previewComment = trimmedComment
        ? `"${trimmedComment.length > 50 ? trimmedComment.slice(0, 50) + "..." : trimmedComment}"`
        : "";

      await notify({
        receiverId: recipientUser,
        receiverRole: reviewerRole === "donor" ? "ngo" : "donor",
        senderId: req.user._id,
        title: "New Rating & Review Received ⭐",
        message: `${reviewerDisplayName} submitted a ${numericRating}-star review for your completed donation. ${previewComment}`.trim(),
        type: "NEW_RATING_RECEIVED",
        entityType: "Rating",
        entityId: createdRating._id,
        priority: "medium",
      });
    } catch (notifErr) {
      console.error("Non-blocking notification delivery failed after saving rating:", notifErr);
    }
  }

  return res.status(201).json({
    message: "Rating submitted successfully",
    rating: createdRating,
  });
});

/**
 * @desc    Get aggregated rating summary for an NGO or Donor
 * @route   GET /aahar/ratings/summary/:targetId
 * @access  Public
 */
export const getRatingSummary = asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  const { role } = req.query; // optional 'donor' or 'ngo'

  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ message: "Invalid target ID" });
  }

  const targetObjectId = new mongoose.Types.ObjectId(targetId);

  // Determine whether the target is an NGO or a Donor user
  let targetType = role;
  if (!targetType) {
    const isNgo = await Ngo.findById(targetObjectId);
    if (isNgo) {
      targetType = "ngo";
    } else {
      // Check if user has an NGO registered
      const userNgo = await Ngo.findOne({ registeredBy: targetObjectId });
      if (userNgo && role === "ngo") {
        targetType = "ngo";
      } else {
        targetType = "donor";
      }
    }
  }

  // Match condition:
  // For NGO reputation: ratings submitted by donors (reviewerRole = 'donor')
  // For Donor reputation: ratings submitted by NGOs (reviewerRole = 'ngo')
  const reviewerRoleToMatch = targetType === "ngo" ? "donor" : "ngo";

  const matchQuery = {
    $or: [{ recipient: targetObjectId }, { recipientUser: targetObjectId }],
    reviewerRole: reviewerRoleToMatch,
  };

  const aggregateResult = await Rating.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalRatings: { $sum: 1 },
        star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
      },
    },
  ]);

  if (!aggregateResult || aggregateResult.length === 0) {
    return res.status(200).json({
      targetId,
      targetType,
      averageRating: 0,
      totalRatings: 0,
      starDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
      percentages: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    });
  }

  const data = aggregateResult[0];
  const total = data.totalRatings || 0;
  const rawAverage = data.averageRating || 0;
  const roundedAverage = Math.round(rawAverage * 10) / 10;

  const starDistribution = {
    1: data.star1 || 0,
    2: data.star2 || 0,
    3: data.star3 || 0,
    4: data.star4 || 0,
    5: data.star5 || 0,
  };

  const percentages = {
    1: total > 0 ? Math.round((starDistribution[1] / total) * 100) : 0,
    2: total > 0 ? Math.round((starDistribution[2] / total) * 100) : 0,
    3: total > 0 ? Math.round((starDistribution[3] / total) * 100) : 0,
    4: total > 0 ? Math.round((starDistribution[4] / total) * 100) : 0,
    5: total > 0 ? Math.round((starDistribution[5] / total) * 100) : 0,
  };

  return res.status(200).json({
    targetId,
    targetType,
    averageRating: roundedAverage,
    totalRatings: total,
    starDistribution,
    percentages,
  });
});

/**
 * @desc    Get paginated comments/reviews for an NGO or Donor
 * @route   GET /aahar/ratings/reviews/:targetId
 * @access  Public
 */
export const getReviews = asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  const { role, page = 1, limit = 5 } = req.query;

  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ message: "Invalid target ID" });
  }

  const targetObjectId = new mongoose.Types.ObjectId(targetId);

  let targetType = role;
  if (!targetType) {
    const isNgo = await Ngo.findById(targetObjectId);
    targetType = isNgo ? "ngo" : "donor";
  }

  const reviewerRoleToMatch = targetType === "ngo" ? "donor" : "ngo";

  const filter = {
    $or: [{ recipient: targetObjectId }, { recipientUser: targetObjectId }],
    reviewerRole: reviewerRoleToMatch,
    comment: { $exists: true, $ne: "" },
  };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 5));
  const skip = (pageNum - 1) * limitNum;

  const [reviews, total] = await Promise.all([
    Rating.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("reviewer", "firstName surname profileImage")
      .select("rating comment reviewer reviewerRole createdAt")
      .lean(),
    Rating.countDocuments(filter),
  ]);

  const sanitizedReviews = reviews.map((r) => {
    const reviewerObj = r.reviewer || {};
    const displayName = `${reviewerObj.firstName || ""} ${reviewerObj.surname ? reviewerObj.surname.charAt(0) + "." : ""}`.trim() || (r.reviewerRole === "donor" ? "Donor" : "NGO Partner");

    return {
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      reviewerName: displayName,
      reviewerRole: r.reviewerRole,
      createdAt: r.createdAt,
    };
  });

  return res.status(200).json({
    reviews: sanitizedReviews,
    totalReviews: total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    hasMore: pageNum * limitNum < total,
  });
});

/**
 * @desc    Get rating status for a specific donation for authenticated user
 * @route   GET /aahar/ratings/donation/:donationId/status
 * @access  Private
 */
export const getDonationRatingStatus = asyncHandler(async (req, res) => {
  const { donationId } = req.params;

  if (!donationId || !mongoose.Types.ObjectId.isValid(donationId)) {
    return res.status(400).json({ message: "Invalid donation ID format" });
  }

  let donation = await FoodInfo.findById(donationId);
  if (!donation) {
    donation = await NgoFoodRequest.findById(donationId);
  }

  if (!donation) {
    return res.status(404).json({ message: "Donation not found" });
  }

  const participants = await resolveDonationParticipants(donation);
  const isCompleted = isCompletedStatus(donation.status);
  const currentUserId = req.user._id.toString();

  let userRole = null;
  let recipientName = "";
  let recipientId = null;

  if (currentUserId === participants.donorId) {
    userRole = "donor";
    recipientName = participants.ngoName;
    recipientId = participants.ngoId;
  } else if (
    participants.ngoRegisteredBy &&
    currentUserId === participants.ngoRegisteredBy
  ) {
    userRole = "ngo";
    recipientName = participants.donorName;
    recipientId = participants.donorId;
  } else {
    // Check if user is associated with the NGO
    const userNgo = await Ngo.findOne({ registeredBy: req.user._id });
    if (userNgo && userNgo._id.toString() === participants.ngoId) {
      userRole = "ngo";
      recipientName = participants.donorName;
      recipientId = participants.donorId;
    }
  }

  const isEligibleParticipant = !!userRole;

  const existingRating = isEligibleParticipant
    ? await Rating.findOne({ donation: donationId, reviewer: req.user._id }).lean()
    : null;

  return res.status(200).json({
    donationId,
    isCompleted,
    isEligible: isEligibleParticipant,
    userRole,
    recipientName,
    recipientId,
    hasRated: !!existingRating,
    canRate: isCompleted && isEligibleParticipant && !existingRating,
    existingRating: existingRating
      ? {
          _id: existingRating._id,
          rating: existingRating.rating,
          comment: existingRating.comment,
          createdAt: existingRating.createdAt,
        }
      : null,
  });
});

/**
 * @desc    Get the lowest-rated NGOs for Admin Dashboard
 * @route   GET /aahar/ratings/admin/lowest-rated-ngos
 * @access  Private/Admin
 */
export const getLowestRatedNgos = asyncHandler(async (req, res) => {
  const { minRatings = 1, page = 1, limit = 10 } = req.query;

  const minCount = Math.max(1, parseInt(minRatings, 10) || 1);
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Aggregation on ratings submitted by donors for NGOs
  const pipeline = [
    {
      $match: {
        reviewerRole: "donor",
        recipientModel: "Ngo",
      },
    },
    {
      $group: {
        _id: "$recipient",
        averageRating: { $avg: "$rating" },
        totalRatings: { $sum: 1 },
      },
    },
    {
      $match: {
        totalRatings: { $gte: minCount },
      },
    },
    {
      $sort: {
        averageRating: 1, // lowest rated first
        totalRatings: -1,
      },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limitNum },
          {
            $lookup: {
              from: "ngos",
              localField: "_id",
              foreignField: "_id",
              as: "ngoDetails",
            },
          },
          { $unwind: "$ngoDetails" },
          {
            $project: {
              _id: 1,
              ngoName: "$ngoDetails.ngoName",
              ngoEmail: "$ngoDetails.ngoEmail",
              ngoPhone: "$ngoDetails.ngoPhone",
              ngoCity: "$ngoDetails.ngoCity",
              ngoState: "$ngoDetails.ngoState",
              ngoWebsite: "$ngoDetails.ngoWebsite",
              isApproved: "$ngoDetails.isApproved",
              averageRating: { $round: ["$averageRating", 2] },
              totalRatings: 1,
            },
          },
        ],
      },
    },
  ];

  const results = await Rating.aggregate(pipeline);
  const total = results[0]?.metadata[0]?.total || 0;
  const ngos = results[0]?.data || [];

  // Count NGOs with zero ratings separately
  const allRatedNgoIds = await Rating.distinct("recipient", {
    reviewerRole: "donor",
    recipientModel: "Ngo",
  });
  const unratedNgosCount = await Ngo.countDocuments({
    _id: { $nin: allRatedNgoIds },
    isApproved: true,
  });

  return res.status(200).json({
    ngos,
    totalNgos: total,
    unratedNgosCount,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    minRatingsThreshold: minCount,
  });
});

/**
 * @desc    Get current user's submitted ratings
 * @route   GET /aahar/ratings/me
 * @access  Private
 */
export const getMySubmittedRatings = asyncHandler(async (req, res) => {
  const ratings = await Rating.find({ reviewer: req.user._id })
    .sort({ createdAt: -1 })
    .populate("donation", "status completedAt createdAt")
    .lean();

  return res.status(200).json({ ratings });
});
