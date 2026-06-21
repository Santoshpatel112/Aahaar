import { 
  isDeployed, 
  NGORegistryContract, 
  DonationRequestContract, 
  DonationContract 
} from "./contracts.js";
import Ngo from "../models/ngoModel.js";
import User from "../models/userModel.js";
import NgoFoodRequest from "../models/ngoFoodRequestModel.js";
import FoodInfo from "../models/foodInfoModel.js";
import { notify } from "../services/notification.service.js";

export const startBlockchainListeners = () => {
  if (!isDeployed) {
    console.warn("⚠️ Blockchain contracts not deployed. Event listeners will not start.");
    return;
  }

  console.log("📡 Starting smart contract event listeners...");

  // 1. NGORegistered Listener
  NGORegistryContract.on("NGORegistered", async (ngoId, wallet, ngoName, ipfsDocumentCID) => {
    console.log(`⛓️ [Event] NGORegistered: id=${ngoId}, wallet=${wallet}, name=${ngoName}`);
    try {
      // Find NGO by name or document CID to link the wallet address
      let ngo = await Ngo.findOne({ ngoName: { $regex: new RegExp(`^${ngoName}$`, "i") } });
      if (!ngo) {
        ngo = await Ngo.findOne({ "ngoDocuments.certificationOfRegistration": ipfsDocumentCID });
      }

      if (ngo) {
        ngo.walletAddress = wallet.toLowerCase();
        await ngo.save();
        console.log(`✅ Cached NGO wallet link in DB for: ${ngoName}`);
      }
    } catch (err) {
      console.error("❌ Error processing NGORegistered event:", err.message);
    }
  });

  // 2. NGOVerified Listener
  NGORegistryContract.on("NGOVerified", async (wallet) => {
    console.log(`⛓️ [Event] NGOVerified: wallet=${wallet}`);
    try {
      const ngo = await Ngo.findOne({ walletAddress: wallet.toLowerCase() });
      if (ngo) {
        ngo.isApproved = true;
        ngo.approvedAt = new Date();
        await ngo.save();
        console.log(`✅ Approved NGO in DB cache: ${ngo.ngoName}`);

        if (ngo.registeredBy) {
          await notify({
            receiverId: ngo.registeredBy,
            receiverRole: 'ngo',
            title: 'NGO Onboarded via DAO',
            message: `Congratulations! Your NGO "${ngo.ngoName}" has been verified and onboarded via DAO voting.`,
            type: 'NGO_VERIFIED',
            entityType: 'Ngo',
            entityId: ngo._id,
            priority: 'high'
          });
        }
      }
    } catch (err) {
      console.error("❌ Error processing NGOVerified event:", err.message);
    }
  });

  // 3. NGORejected Listener
  NGORegistryContract.on("NGORejected", async (wallet) => {
    console.log(`⛓️ [Event] NGORejected: wallet=${wallet}`);
    try {
      const ngo = await Ngo.findOne({ walletAddress: wallet.toLowerCase() });
      if (ngo) {
        ngo.isApproved = false;
        await ngo.save();
        console.log(`✅ De-authorized NGO in DB cache: ${ngo.ngoName}`);
      }
    } catch (err) {
      console.error("❌ Error processing NGORejected event:", err.message);
    }
  });

  // 4. DonationRequestCreated Listener
  DonationRequestContract.on("DonationRequestCreated", async (requestId, ngoAddress, foodType, quantity, city) => {
    console.log(`⛓️ [Event] DonationRequestCreated: reqId=${requestId}, ngo=${ngoAddress}, food=${foodType}`);
    try {
      const ngo = await Ngo.findOne({ walletAddress: ngoAddress.toLowerCase() });
      if (ngo) {
        // Check if cached request already exists, if not, save it
        const exists = await NgoFoodRequest.findOne({ purpose: `Blockchain Request #${requestId}` });
        if (!exists) {
          await NgoFoodRequest.create({
            ngoId: ngo._id,
            requestedBy: ngo.registeredBy,
            foodItemsNeeded: [{
              foodName: foodType,
              quantity: Number(quantity),
              quantityType: "pcs",
              category: "Others"
            }],
            contactDetails: {
              contactPersonName: ngo.ngoName,
              phoneNumber: ngo.ngoPhone || "N/A",
              email: ngo.ngoEmail || "N/A",
              deliveryAddress: ngo.ngoAddress || "N/A",
              city: city
            },
            purpose: `Blockchain Request #${requestId}`,
            status: "pending",
            verificationToken: `TX-${requestId}`
          });
          console.log(`✅ Synced new request #${requestId} to MongoDB`);
        }
      }
    } catch (err) {
      console.error("❌ Error syncing RequestCreated event:", err.message);
    }
  });

  // 5. DonationAccepted Listener
  DonationContract.on("DonationAccepted", async (donationId, requestId, donorAddress, ngoAddress) => {
    console.log(`⛓️ [Event] DonationAccepted: donId=${donationId}, reqId=${requestId}, donor=${donorAddress}`);
    try {
      // Find request by ID cache
      const request = await NgoFoodRequest.findOne({ verificationToken: `TX-${requestId}` });
      const donor = await User.findOne({ walletAddress: donorAddress.toLowerCase() });

      if (request) {
        request.status = "REQUEST_ACCEPTED";
        if (donor) {
          request.acceptedBy = donor._id;
          request.acceptedAt = new Date();
        }
        await request.save();

        // Sync or Create FoodInfo donation representation
        let donation = await FoodInfo.findOne({ verificationToken: `TX-${requestId}` });
        if (!donation) {
          await FoodInfo.create({
            foodItemDetails: (request.foodItemsNeeded || []).map(item => ({
              foodName: item.foodName,
              quantity: item.quantity,
              quantityType: item.quantityType,
              expiryDate: new Date(Date.now() + 86400000), // default 24h
              donorId: donor ? donor._id : request.requestedBy,
              category: item.category
            })),
            contactDetails: request.contactDetails,
            ngoPreference: request.ngoId,
            verificationToken: `TX-${requestId}`,
            status: "REQUEST_ACCEPTED",
            isApproved: true
          });
        }
        console.log(`✅ Synced donation accept #${donationId} (requestId=${requestId}) to MongoDB`);
      }
    } catch (err) {
      console.error("❌ Error syncing DonationAccepted event:", err.message);
    }
  });

  // 6. DonationDelivered Listener
  DonationContract.on("DonationDelivered", async (donationId, deliveryProofCID) => {
    console.log(`⛓️ [Event] DonationDelivered: donId=${donationId}, proof=${deliveryProofCID}`);
    try {
      // Get the donation from the contract to see the requestId
      const rawDonation = await DonationContract.getDonation(donationId);
      const requestId = Number(rawDonation.requestId);

      const request = await NgoFoodRequest.findOne({ verificationToken: `TX-${requestId}` });
      if (request) {
        request.status = "PICKUP_IN_PROGRESS";
        await request.save();
      }

      const donation = await FoodInfo.findOne({ verificationToken: `TX-${requestId}` });
      if (donation) {
        donation.status = "PICKUP_IN_PROGRESS";
        donation.imageUrl = [deliveryProofCID]; // Save IPFS Cid as proof image
        await donation.save();
        console.log(`✅ Synced delivery proof for donation #${donationId} in DB`);
      }
    } catch (err) {
      console.error("❌ Error syncing DonationDelivered event:", err.message);
    }
  });

  // 7. DonationVerified Listener
  DonationContract.on("DonationVerified", async (donationId) => {
    console.log(`⛓️ [Event] DonationVerified: donId=${donationId}`);
    try {
      const rawDonation = await DonationContract.getDonation(donationId);
      const requestId = Number(rawDonation.requestId);

      const request = await NgoFoodRequest.findOne({ verificationToken: `TX-${requestId}` });
      if (request) {
        request.status = "COMPLETED";
        request.fulfilledAt = new Date();
        await request.save();
      }

      const donation = await FoodInfo.findOne({ verificationToken: `TX-${requestId}` });
      if (donation) {
        donation.status = "COMPLETED";
        donation.completedAt = new Date();
        await donation.save();
        console.log(`✅ Synced completion verify for donation #${donationId} in DB`);
      }
    } catch (err) {
      console.error("❌ Error syncing DonationVerified event:", err.message);
    }
  });
};
