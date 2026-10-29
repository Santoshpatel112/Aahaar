import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { resolveDonationParticipants, isCompletedStatus } from '../controllers/ratingController.js';

test('Rating Controller - Status Completion Checker', async (t) => {
  assert.equal(isCompletedStatus('COMPLETED'), true);
  assert.equal(isCompletedStatus('completed'), true);
  assert.equal(isCompletedStatus('DONE'), true);
  assert.equal(isCompletedStatus('fulfilled'), true);
  assert.equal(isCompletedStatus('PENDING'), false);
  assert.equal(isCompletedStatus('IN_PROGRESS'), false);
  assert.equal(isCompletedStatus(null), false);
  assert.equal(isCompletedStatus(undefined), false);
});

test('Rating Controller - Participant Resolution', async (t) => {
  const donorId = new mongoose.Types.ObjectId();
  const ngoId = new mongoose.Types.ObjectId();
  const ngoUserId = new mongoose.Types.ObjectId();

  await t.test('resolves FoodInfo direct donation correctly with populated NGO', async () => {
    const donation = {
      _id: new mongoose.Types.ObjectId(),
      status: 'COMPLETED',
      foodItemDetails: [{ 
        donorId: {
          _id: donorId,
          firstName: 'Rahul',
          surname: 'Verma'
        }
      }],
      pickedUpByNgo: { 
        _id: ngoId, 
        ngoName: 'Feeding Hope Foundation',
        registeredBy: ngoUserId 
      },
    };

    const res = await resolveDonationParticipants(donation);

    assert.equal(res.donorId, donorId.toString());
    assert.equal(res.donorName, 'Rahul Verma');
    assert.equal(res.ngoId, ngoId.toString());
    assert.equal(res.ngoName, 'Feeding Hope Foundation');
    assert.equal(res.ngoRegisteredBy, ngoUserId.toString());
  });

  await t.test('resolves NgoFoodRequest correctly with populated fields', async () => {
    const donation = {
      _id: new mongoose.Types.ObjectId(),
      status: 'fulfilled',
      foodItemsNeeded: [{ foodName: 'Rice', quantity: 50 }],
      acceptedBy: {
        _id: donorId,
        firstName: 'Ananya',
        surname: 'Singh'
      },
      ngoId: { 
        _id: ngoId, 
        ngoName: 'Seva Trust',
        registeredBy: { _id: ngoUserId } 
      },
    };

    const res = await resolveDonationParticipants(donation);

    assert.equal(res.donorId, donorId.toString());
    assert.equal(res.donorName, 'Ananya Singh');
    assert.equal(res.ngoId, ngoId.toString());
    assert.equal(res.ngoName, 'Seva Trust');
    assert.equal(res.ngoRegisteredBy, ngoUserId.toString());
  });
});
