import User from "../models/userModel.js";
import OTP from "../models/otpModel.js";
import { sendOTPEmail } from "../utils/emailHelper.js";
import { OAuth2Client } from "google-auth-library";
import { ethers } from "ethers";
import generateToken from "../utils/token.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import { getFileUrl } from "../s3Config.js";
import { notify } from "../services/notification.service.js";

//authenticate User
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : "";
  const user = await User.findOne({ email: normalizedEmail });

  if (user && (await user.matchPassword(password))) {
    generateToken(res, user._id);

    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      age: user.age,
      city: user.city,
      state: user.state,
      country: user.country,
      phone: user.phone,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      adharVerificationDocument: user.adharVerificationDocument,
      profileImage: user.profileImage,
      token: generateToken(res, user._id),
    });
  } else {
    res.status(401);
      throw new Error("Invalid email or password");
  }
});

//register User
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, surname, email, password, age, city, state, country, phone } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : "";
  console.log("Register API requested with email:", normalizedEmail);

  const userExists = await User.findOne({ email: normalizedEmail });
  console.log("userExists query result:", userExists);
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  console.log("Attempting to create user in MongoDB...");
  let user;
  try {
    user = await User.create({
      firstName,
      surname,
      email: normalizedEmail,
      password,
      age,
      city,
      state,
      country,
      phone
    });
    console.log("User created successfully in DB:", user);
  } catch (err) {
    console.error("Database save failed during User.create:", err);
    res.status(500);
    throw new Error("Database save failed: " + err.message);
  }

  if (user) {
    // Notify user
    await notify({
      receiverId: user._id,
      receiverRole: 'donor',
      title: 'Verification Request',
      message: 'Your donor account verification is under review.',
      type: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
      priority: 'medium'
    });

    // Notify all Admins
    const admins = await User.find({ isAdmin: true });
    for (const admin of admins) {
      await notify({
        receiverId: admin._id,
        receiverRole: 'admin',
        title: 'New Donor Registration',
        message: 'New donor registration requires verification.',
        type: 'NEW_DONOR_REGISTRATION',
        entityType: 'User',
        entityId: user._id,
        priority: 'high'
      });
    }

    generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      age: user.age,
      city: user.city,
      state: user.state,  
      country: user.country,
      phone: user.phone,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      profileImage: user.profileImage,
      token: generateToken(res, user._id),
      message: "User registered successfully",
    });
  } else {
    res.status(404);
    throw new Error("Invalid user data");
  }
});

//logout User
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: process.env.NODE_ENV !== "development" ? "None" : "Lax",
    expires: new Date(0),
  });

  res.status(200).json({ message: "Logged Out successfully" });
});

//adhar verification Document upload
const uploadAdharDocument = asyncHandler(async (req, res) => {
  const files = req.files;
  if (files) {
    const filesUrls = {
      adharVerificationDocument: getFileUrl(files.adharVerificationDocument?.[0]),
    };
    
    // Save the document URL to the user record in database
    const user = await User.findById(req.user._id);
    if (user) {
      user.adharVerificationDocument = filesUrls.adharVerificationDocument;
      await user.save();

      // Notify user
      await notify({
        receiverId: user._id,
        receiverRole: 'donor',
        title: 'Document Uploaded',
        message: 'Your donor account verification is under review.',
        type: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user._id,
        priority: 'medium'
      });

      // Notify all Admins
      const admins = await User.find({ isAdmin: true });
      for (const admin of admins) {
        await notify({
          receiverId: admin._id,
          receiverRole: 'admin',
          title: 'Pending Verification',
          message: `${user.firstName} uploaded Aadhaar document. Pending verification.`,
          type: 'PENDING_VERIFICATION',
          entityType: 'User',
          entityId: user._id,
          priority: 'high'
        });
      }
    }

    res.status(200).json({
      message: "Files uploaded successfully",
      filesUrls,
    });
  } else {
    res.status(400).json({
      message: "No files uploaded",
    });
  }
});

// pan verification Document upload
const uploadPanDocument = asyncHandler(async (req, res) => {
  const files = req.files;
  const { panNumber } = req.body;

  if (!panNumber) {
    res.status(400);
    throw new Error("PAN number is required");
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(panNumber.trim().toUpperCase())) {
    res.status(400);
    throw new Error("Invalid PAN number format");
  }

  if (files && files.panVerificationDocument) {
    const fileUrl = getFileUrl(files.panVerificationDocument?.[0]);
    
    // Save to database
    const user = await User.findById(req.user._id);
    if (user) {
      user.panNumber = panNumber.trim().toUpperCase();
      user.panVerificationDocument = fileUrl;
      user.panVerificationStatus = 'pending';
      user.isPanVerified = false;
      user.panRejectedReason = null;
      await user.save();

      // Notify user
      await notify({
        receiverId: user._id,
        receiverRole: 'donor',
        title: 'PAN Details Submitted',
        message: 'Your PAN details and document verification are under review.',
        type: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user._id,
        priority: 'medium'
      });

      // Notify all Admins
      const admins = await User.find({ isAdmin: true });
      for (const admin of admins) {
        await notify({
          receiverId: admin._id,
          receiverRole: 'admin',
          title: 'Pending PAN Verification',
          message: `${user.firstName} uploaded PAN document. Pending verification.`,
          type: 'PENDING_VERIFICATION',
          entityType: 'User',
          entityId: user._id,
          priority: 'high'
        });
      }

      return res.status(200).json({
        message: "PAN document uploaded and details submitted successfully",
        panNumber: user.panNumber,
        panVerificationDocument: fileUrl,
        panVerificationStatus: 'pending',
        isPanVerified: false,
        panRejectedReason: null,
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } else {
    res.status(400);
    throw new Error("No PAN file uploaded");
  }
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      age: user.age,
      city: user.city,
      state: user.state,
      country: user.country,
      phone: user.phone,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      adharVerificationDocument: user.adharVerificationDocument,
      profileImage: user.profileImage,
      panNumber: user.panNumber,
      panVerificationDocument: user.panVerificationDocument,
      panVerificationStatus: user.panVerificationStatus,
      isPanVerified: user.isPanVerified,
      panRejectedReason: user.panRejectedReason,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

//update user profile (name, address, phone, age — NOT email or documents)
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { firstName, surname, age, city, state, country, phone, panNumber } = req.body;

  if (firstName !== undefined) user.firstName = firstName;
  if (surname !== undefined) user.surname = surname;
  if (age !== undefined) user.age = age;
  if (city !== undefined) user.city = city;
  if (state !== undefined) user.state = state;
  if (country !== undefined) user.country = country;
  if (phone !== undefined) user.phone = phone;
  if (panNumber !== undefined) user.panNumber = panNumber;

  // Handle profile image upload
  if (req.files?.profileImage?.[0]) {
    user.profileImage = getFileUrl(req.files.profileImage[0]);
  }

  const updatedUser = await user.save();

  res.status(200).json({
    _id: updatedUser._id,
    firstName: updatedUser.firstName,
    surname: updatedUser.surname,
    email: updatedUser.email,
    age: updatedUser.age,
    city: updatedUser.city,
    state: updatedUser.state,
    country: updatedUser.country,
    phone: updatedUser.phone,
    isVerified: updatedUser.isVerified,
    isAdmin: updatedUser.isAdmin,
    adharVerificationDocument: updatedUser.adharVerificationDocument,
    profileImage: updatedUser.profileImage,
    walletAddress: updatedUser.walletAddress,
    panNumber: updatedUser.panNumber,
    panVerificationDocument: updatedUser.panVerificationDocument,
    panVerificationStatus: updatedUser.panVerificationStatus,
    isPanVerified: updatedUser.isPanVerified,
    panRejectedReason: updatedUser.panRejectedReason,
    message: "Profile updated successfully"
  });
});

// Link user wallet with cryptographic signature verification
const linkUserWallet = asyncHandler(async (req, res) => {
  const { walletAddress, signature } = req.body;

  if (!walletAddress || !signature) {
    res.status(400);
    throw new Error("Wallet address and signature are required.");
  }

  // Verify the signature
  const message = `Sign this message to link your wallet to AAHAAR: ${req.user._id}`;
  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(message, signature);
  } catch (error) {
    res.status(400);
    throw new Error("Invalid signature formatting: " + error.message);
  }

  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    res.status(400);
    throw new Error("Signature verification failed. Address mismatch.");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.walletAddress = walletAddress.toLowerCase();
  await user.save();

  // Dynamically import Ngo model to avoid circular issues
  const Ngo = (await import("../models/ngoModel.js")).default;
  const ngo = await Ngo.findOne({ registeredBy: req.user._id });
  if (ngo) {
    ngo.walletAddress = walletAddress.toLowerCase();
    await ngo.save();
    console.log(`✅ Wallet Address auto-linked to NGO ${ngo.ngoName}`);
  }

  res.status(200).json({
    message: "Wallet linked successfully! 🔒",
    walletAddress: user.walletAddress
  });
});

// Send OTP for email verification during registration
const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : "";

  if (!normalizedEmail) {
    res.status(400);
    throw new Error("Email is required");
  }

  // Check if user already exists
  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in DB (delete any existing OTP for this email first)
  await OTP.deleteMany({ email: normalizedEmail });
  await OTP.create({ email: normalizedEmail, otp });

  // Send email
  const emailSent = await sendOTPEmail(normalizedEmail, otp);
  if (!emailSent) {
    res.status(500);
    throw new Error("Failed to send OTP email");
  }

  res.status(200).json({ message: "OTP sent successfully" });
});

// Verify OTP for email verification during registration
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : "";

  if (!normalizedEmail || !otp) {
    res.status(400);
    throw new Error("Email and OTP are required");
  }

  const otpRecord = await OTP.findOne({ email: normalizedEmail, otp });
  if (!otpRecord) {
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  // Delete the OTP once verified to prevent reuse
  await OTP.deleteMany({ email: normalizedEmail });

  res.status(200).json({ success: true, message: "OTP verified successfully" });
});

// Authenticate or check registration details via Google OAuth ID Token
const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    res.status(400);
    throw new Error("Google credential token is required");
  }

  // Verify ID Token
  const client = new OAuth2Client(process.env.GOOGLE_CLINT_ID);
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLINT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.error("Google ID Token verification failed:", err);
    res.status(400);
    throw new Error("Invalid Google credential: " + err.message);
  }

  const { email, given_name, family_name, picture } = payload;
  const normalizedEmail = email ? email.trim().toLowerCase() : "";

  // Check if user exists
  const user = await User.findOne({ email: normalizedEmail });

  if (user) {
    // User exists -> Log them in!
    generateToken(res, user._id);
    res.status(200).json({
      exists: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        surname: user.surname,
        email: user.email,
        age: user.age,
        city: user.city,
        state: user.state,
        country: user.country,
        phone: user.phone,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        adharVerificationDocument: user.adharVerificationDocument,
        profileImage: user.profileImage || picture,
        token: generateToken(res, user._id),
      }
    });
  } else {
    // User does not exist -> Return details so frontend can complete registration details
    res.status(200).json({
      exists: false,
      user: {
        email: normalizedEmail,
        firstName: given_name || "",
        surname: family_name || "",
        profileImage: picture || null,
      }
    });
  }
});

export {
  authUser,
  registerUser,
  logoutUser,
  uploadAdharDocument,
  uploadPanDocument,
  updateUserProfile,
  getUserProfile,
  linkUserWallet,
  sendOTP,
  verifyOTP,
  googleAuth
};


