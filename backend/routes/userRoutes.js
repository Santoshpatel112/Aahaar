import {
  authUser,
  logoutUser,
  registerUser,
  uploadAdharDocument,
  getUserProfile,
  updateUserProfile,
  linkUserWallet,
  sendOTP,
  verifyOTP,
  googleAuth,
  uploadPanDocument
} from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";
import express from "express";
import {uploadNgoDocuments as uploadDocumentsToS3 } from "../s3Config.js";

const router = express.Router();

router.route("/register").post(registerUser);
router.post("/auth", authUser);
router.post("/logout", logoutUser);
router.post("/google-auth", googleAuth);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);
router.put("/link-wallet", protect, linkUserWallet);

router.post("/user-adhar-document", uploadDocumentsToS3.fields([
    { name: 'adharVerificationDocument', maxCount: 1 }
]),protect, uploadAdharDocument)

router.post("/user-pan-document", uploadDocumentsToS3.fields([
    { name: 'panVerificationDocument', maxCount: 1 }
]), protect, uploadPanDocument)

export default router;

