import Tax from "../models/taxModel.js";
import User from "../models/userModel.js";
import { generateDonationReceipt } from "../utils/pdfGenerator.js";
import { sendDonationReceiptEmail } from "../utils/emailHelper.js";
import { notify } from "./notification.service.js";

const foodRates = {
    'Fruits': 0.50,
    'Vegetables': 0.50,
    'Bakery': 0.50,
    'Dairy': 0.50,
    'Cooked Meals': 0.50,
    'Beverages': 0.50,
    'Packaged Food': 0.50,
    'Grains': 0.50,
    'Others': 0.50
};

const categoryBaseValues = {
    'Fruits': 50,      
    'Vegetables': 40,  
    'Bakery': 60,      
    'Dairy': 70,       
    'Cooked Meals': 80, 
    'Beverages': 30,    
    'Packaged Food': 65, 
    'Grains': 45,       
    'Others': 35      
};

/**
 * Calculates tax exemption values for a food donation and saves the Tax record.
 * @param {Object} donation - The FoodInfo donation document
 * @param {string} donorId - The donor ID
 * @returns {Promise<Object>} Created or existing Tax document
 */
export const calculateAndCreateTaxExemption = async (donation, donorId) => {
  const existingTax = await Tax.findOne({ donationId: donation._id });
  if (existingTax) {
    return existingTax;
  }

  const currentDate = new Date();
  const taxYear = currentDate.getMonth() >= 3 ? currentDate.getFullYear() : currentDate.getFullYear() - 1;

  let totalExemptionAmount = 0;
  let totalDonationValue = 0;
  const itemizedExemptions = [];

  for (const foodItem of (donation.foodItemDetails || [])) {
    const taxRate = foodRates[foodItem.category] || 0.15;
    const baseValue = categoryBaseValues[foodItem.category] || 35;
    let itemValue = baseValue * foodItem.quantity;

    if (foodItem.quantityType === 'g') {
      itemValue = itemValue * 0.001; // Convert g to kg
    } else if (foodItem.quantityType === 'ml') {
      itemValue = itemValue * 0.001; // Convert ml to l
    }

    const itemExemption = itemValue * taxRate;
    totalDonationValue += itemValue;
    totalExemptionAmount += itemExemption;

    itemizedExemptions.push({
      foodName: foodItem.foodName,
      category: foodItem.category,
      quantity: foodItem.quantity,
      quantityType: foodItem.quantityType,
      itemValue: Math.round(itemValue * 100) / 100,
      taxRate: taxRate,
      exemptionAmount: Math.round(itemExemption * 100) / 100
    });
  }

  totalDonationValue = Math.round(totalDonationValue * 100) / 100;
  totalExemptionAmount = Math.round(totalExemptionAmount * 100) / 100;

  const receiptNo = `AHR-${donation._id.toString().slice(-6).toUpperCase()}`;

  const taxExemption = await Tax.create({
    totalExemption: totalExemptionAmount,
    userReceivingTax: donorId,
    donationId: donation._id,
    donationValue: totalDonationValue,
    exemptionDate: currentDate,
    taxYear: taxYear,
    certificateIssued: false,
    certificateNumber: receiptNo,
    itemizedExemptions: itemizedExemptions
  });

  return taxExemption;
};

/**
 * Automatically generates a PDF receipt and emails it to the donor.
 * @param {Object} donation - The FoodInfo donation document
 */
export const generateAndEmailReceipt = async (donation) => {
  try {
    const donorId = donation.foodItemDetails?.[0]?.donorId;
    if (!donorId) {
      console.warn(`[TAX SERVICE] No donorId found for donation ${donation._id}. Skipping receipt generation.`);
      return;
    }

    const donor = await User.findById(donorId);
    if (!donor) {
      console.warn(`[TAX SERVICE] Donor user not found for ID ${donorId}. Skipping receipt generation.`);
      return;
    }

    // Calculate tax exemption and save
    const taxExemption = await calculateAndCreateTaxExemption(donation, donorId);

    // Generate PDF
    const pdfBuffer = await generateDonationReceipt(donation, donor, taxExemption);
    const receiptNo = taxExemption.certificateNumber || `AHR-${donation._id.toString().slice(-6).toUpperCase()}`;

    // Send Email
    const emailSent = await sendDonationReceiptEmail(donor.email, pdfBuffer, receiptNo);

    if (emailSent) {
      taxExemption.certificateIssued = true;
      await taxExemption.save();
    }

    // Send platform notification
    await notify({
      receiverId: donorId,
      receiverRole: 'donor',
      title: 'Tax Receipt Generated 📄',
      message: `Your Section 80G tax exemption receipt of ₹${taxExemption.totalExemption} for donation #${receiptNo} is now ready.`,
      type: 'TAX_CERTIFICATE_GENERATED',
      entityType: 'Tax',
      entityId: taxExemption._id,
      priority: 'medium'
    });

    console.log(`[TAX SERVICE] Successfully processed receipt and exemption for donation ${donation._id}`);
  } catch (error) {
    console.error(`[TAX SERVICE ERROR] Failed to generate/email receipt for donation ${donation._id}:`, error);
  }
};
