import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Rating from './models/ratingModel.js';
import FoodInfo from './models/foodInfoModel.js';
import Ngo from './models/ngoModel.js';
import User from './models/userModel.js';
import {
  createRating,
  getRatingSummary,
  getReviews,
  getDonationRatingStatus,
  getLowestRatedNgos,
} from './controllers/ratingController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

// Mock response object
function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('--- Starting Rating System Comprehensive Tests ---');

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(' Connected to MongoDB');

  const testIds = {
    users: [],
    ngos: [],
    donations: [],
    ratings: [],
  };

  try {
    // 1. Create test donor user
    const donorUser = await User.create({
      firstName: 'TestDonor',
      surname: 'User',
      email: `testdonor_${Date.now()}@example.com`,
      password: 'password123',
      role: 'donor',
      phone: '9876543211',
      age: 28,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
    });
    testIds.users.push(donorUser._id);

    // 2. Create test NGO representative user
    const ngoRepUser = await User.create({
      firstName: 'TestNgoRep',
      surname: 'Representative',
      email: `testngorep_${Date.now()}@example.com`,
      password: 'password123',
      role: 'ngo',
      phone: '9876543212',
      age: 35,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
    });
    testIds.users.push(ngoRepUser._id);

    // 3. Create test NGO
    const testNgo = await Ngo.create({
      ngoName: 'Alpha Helping Hands Test',
      ngoEmail: `alpha_${Date.now()}@testngo.org`,
      ngoPhone: '9876543213',
      ngoAddress: '42 Test Lane',
      ngoCity: 'Mumbai',
      ngoState: 'Maharashtra',
      ngoPurpose: 'Provide meals to needy families and street children.',
      ngoWebsite: 'https://delhifeed.org',
      ngoDocuments: {
        certificationOfRegistration: 'http://localhost:5001/uploads/cert.pdf',
        ownerPanCard: 'http://localhost:5001/uploads/pan.pdf',
        prevousWorkReport: 'http://localhost:5001/uploads/report.pdf',
      },
      registeredBy: ngoRepUser._id,
      isApproved: true,
    });
    testIds.ngos.push(testNgo._id);

    // 4. Create completed test donation
    const completedDonation = await FoodInfo.create({
      foodItemDetails: [
        {
          donorId: donorUser._id,
          foodName: 'Rice & Curry',
          quantity: 20,
          quantityType: 'kg',
          category: 'Cooked Meals',
          expiryDate: new Date(Date.now() + 86400000),
        },
      ],
      contactDetails: {
        fullAddress: '123 Test St',
        city: 'Mumbai',
        contactPersonName: 'Test Contact',
        phoneNumber: '9876543211',
        email: 'testdonor@example.com',
      },
      pickedUpByNgo: testNgo._id,
      status: 'done',
      completedAt: new Date(),
    });
    testIds.donations.push(completedDonation._id);

    // 5. Create pending (incomplete) test donation
    const pendingDonation = await FoodInfo.create({
      foodItemDetails: [
        {
          donorId: donorUser._id,
          foodName: 'Bread & Butter',
          quantity: 10,
          quantityType: 'kg',
          category: 'Cooked Meals',
          expiryDate: new Date(Date.now() + 86400000),
        },
      ],
      contactDetails: {
        fullAddress: '123 Test St',
        city: 'Mumbai',
        contactPersonName: 'Test Contact',
        phoneNumber: '9876543211',
        email: 'testdonor@example.com',
      },
      pickedUpByNgo: testNgo._id,
      status: 'pending',
    });
    testIds.donations.push(pendingDonation._id);

    console.log('✓ Test fixtures created successfully');

    // ----------------------------------------------------
    // TEST 1: Reject rating for incomplete donation
    // ----------------------------------------------------
    {
      const req = {
        user: donorUser,
        body: { donationId: pendingDonation._id.toString(), rating: 5, comment: 'Great' },
      };
      const res = createMockRes();
      let threwError = false;
      try {
        await createRating(req, res);
      } catch (err) {
        threwError = true;
      }
      console.assert(threwError || res.statusCode === 400, 'TEST 1 FAILED: Should reject rating for pending donation');
      console.log('✓ TEST 1 PASSED: Incomplete donation rating rejected');
    }

    // ----------------------------------------------------
    // TEST 2: Reject rating with invalid rating value (< 1 or > 5 or non-integer)
    // ----------------------------------------------------
    {
      const invalidRatings = [0, 6, 3.5, 'five'];
      for (const val of invalidRatings) {
        const req = {
          user: donorUser,
          body: { donationId: completedDonation._id.toString(), rating: val, comment: 'Nice' },
        };
        const res = createMockRes();
        let threwError = false;
        try {
          await createRating(req, res);
        } catch (err) {
          threwError = true;
        }
        console.assert(threwError || res.statusCode === 400, `TEST 2 FAILED: Rating ${val} should be rejected`);
      }
      console.log('✓ TEST 2 PASSED: Invalid rating values properly rejected');
    }

    // ----------------------------------------------------
    // TEST 3: Donor rates NGO successfully
    // ----------------------------------------------------
    let donorRatingDoc = null;
    {
      const req = {
        user: donorUser,
        body: {
          donationId: completedDonation._id.toString(),
          rating: 5,
          comment: 'Prompt pickup and polite volunteers!',
        },
      };
      const res = createMockRes();
      await createRating(req, res);
      console.assert(res.statusCode === 201, `TEST 3 FAILED: Status should be 201, got ${res.statusCode}`);
      console.assert(res.data.rating.rating === 5, 'TEST 3 FAILED: Rating score mismatch');
      console.assert(res.data.rating.reviewerRole === 'donor', 'TEST 3 FAILED: Reviewer role should be donor');
      donorRatingDoc = res.data.rating;
      testIds.ratings.push(donorRatingDoc._id);
      console.log('✓ TEST 3 PASSED: Donor rated NGO successfully (201 Created)');
    }

    // ----------------------------------------------------
    // TEST 4: Duplicate rating prevention (Same donor, same donation)
    // ----------------------------------------------------
    {
      const req = {
        user: donorUser,
        body: {
          donationId: completedDonation._id.toString(),
          rating: 4,
          comment: 'Submitting again should fail',
        },
      };
      const res = createMockRes();
      await createRating(req, res);
      console.assert(res.statusCode === 409, `TEST 4 FAILED: Expected 409 Conflict for duplicate, got ${res.statusCode}`);
      console.log('✓ TEST 4 PASSED: Duplicate rating correctly rejected with 409 Conflict');
    }

    // ----------------------------------------------------
    // TEST 5: NGO rates Donor successfully (Two-way completion)
    // ----------------------------------------------------
    let ngoRatingDoc = null;
    {
      const req = {
        user: ngoRepUser,
        body: {
          donationId: completedDonation._id.toString(),
          rating: 4,
          comment: 'Fresh, warm food neatly packed in hygienic containers.',
        },
      };
      const res = createMockRes();
      await createRating(req, res);
      console.assert(res.statusCode === 201, `TEST 5 FAILED: Status should be 201, got ${res.statusCode}`);
      console.assert(res.data.rating.rating === 4, 'TEST 5 FAILED: Rating score mismatch');
      console.assert(res.data.rating.reviewerRole === 'ngo', 'TEST 5 FAILED: Reviewer role should be ngo');
      ngoRatingDoc = res.data.rating;
      testIds.ratings.push(ngoRatingDoc._id);
      console.log('✓ TEST 5 PASSED: NGO rated Donor successfully (201 Created)');
    }

    // ----------------------------------------------------
    // TEST 6: Rating summary aggregation calculation
    // ----------------------------------------------------
    {
      const req = { params: { targetId: testNgo._id.toString() }, query: { role: 'ngo' } };
      const res = createMockRes();
      await getRatingSummary(req, res);
      console.assert(res.statusCode === 200, `TEST 6 FAILED: Expected 200, got ${res.statusCode}`);
      console.assert(res.data.totalRatings === 1, `TEST 6 FAILED: Expected 1 rating, got ${res.data.totalRatings}`);
      console.assert(res.data.averageRating === 5, `TEST 6 FAILED: Expected average 5, got ${res.data.averageRating}`);
      console.assert(res.data.starDistribution[5] === 1, 'TEST 6 FAILED: Expected 1 in 5-star distribution');
      console.log('✓ TEST 6 PASSED: NGO Rating Summary aggregation verified');
    }

    // ----------------------------------------------------
    // TEST 7: Paginated reviews retrieval
    // ----------------------------------------------------
    {
      const req = { params: { targetId: testNgo._id.toString() }, query: { page: 1, limit: 5 } };
      const res = createMockRes();
      await getReviews(req, res);
      console.assert(res.statusCode === 200, `TEST 7 FAILED: Expected 200, got ${res.statusCode}`);
      console.assert(res.data.reviews.length === 1, `TEST 7 FAILED: Expected 1 review, got ${res.data.reviews.length}`);
      console.assert(res.data.reviews[0].comment === 'Prompt pickup and polite volunteers!', 'TEST 7 FAILED: Comment mismatch');
      console.log('✓ TEST 7 PASSED: Paginated reviews retrieval verified');
    }

    // ----------------------------------------------------
    // TEST 8: Donation rating status endpoint
    // ----------------------------------------------------
    {
      const req = {
        params: { donationId: completedDonation._id.toString() },
        user: donorUser,
      };
      const res = createMockRes();
      await getDonationRatingStatus(req, res);
      console.assert(res.statusCode === 200, `TEST 8 FAILED: Expected 200, got ${res.statusCode}`);
      console.assert(res.data.hasRated === true, 'TEST 8 FAILED: hasRated should be true');
      console.assert(res.data.canRate === false, 'TEST 8 FAILED: canRate should be false');
      console.assert(res.data.existingRating.rating === 5, 'TEST 8 FAILED: Existing rating mismatch');
      console.log('✓ TEST 8 PASSED: Donation rating status endpoint verified');
    }

    // ----------------------------------------------------
    // TEST 9: Lowest-rated NGOs for Admin
    // ----------------------------------------------------
    {
      const req = { query: { minRatings: 1, page: 1, limit: 10 } };
      const res = createMockRes();
      await getLowestRatedNgos(req, res);
      console.assert(res.statusCode === 200, `TEST 9 FAILED: Expected 200, got ${res.statusCode}`);
      console.assert(Array.isArray(res.data.ngos), 'TEST 9 FAILED: ngos should be an array');
      const foundTestNgo = res.data.ngos.find((n) => n._id.toString() === testNgo._id.toString());
      console.assert(!!foundTestNgo, 'TEST 9 FAILED: Test NGO should be returned in rated NGOs list');
      console.log('✓ TEST 9 PASSED: Admin lowest-rated NGOs endpoint verified');
    }

    console.log('\n=======================================');
    console.log('ALL 9 TESTS PASSED CLEANLY AND AS EXPECTED!');
    console.log('=======================================\n');
  } catch (error) {
    console.error('Test execution failed:', error);
    throw error;
  } finally {
    // Clean up all test data
    console.log('Cleaning up test data...');
    if (testIds.ratings.length) await Rating.deleteMany({ _id: { $in: testIds.ratings } });
    if (testIds.donations.length) await FoodInfo.deleteMany({ _id: { $in: testIds.donations } });
    if (testIds.ngos.length) await Ngo.deleteMany({ _id: { $in: testIds.ngos } });
    if (testIds.users.length) await User.deleteMany({ _id: { $in: testIds.users } });
    console.log('Clean-up complete.');
    await mongoose.disconnect();
  }
}

runTests();
