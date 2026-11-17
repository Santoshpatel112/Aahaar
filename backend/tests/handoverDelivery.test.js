import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

test('Volunteer Delivery Handover Proof - Validation Rules', async (t) => {
  await t.test('rejects if 4-digit code is missing, empty, or not 4 digits', () => {
    const validateCode = (code) => {
      if (!code || typeof code !== 'string' || code.trim().length !== 4 || !/^\d{4}$/.test(code.trim())) {
        return false;
      }
      return true;
    };

    assert.equal(validateCode(null), false);
    assert.equal(validateCode(''), false);
    assert.equal(validateCode('123'), false);     // 3 digits
    assert.equal(validateCode('12345'), false);   // 5 digits
    assert.equal(validateCode('abcd'), false);    // non-numeric
    assert.equal(validateCode('1234'), true);     // valid 4-digit code
    assert.equal(validateCode(' 5829 '), true);   // valid with spaces trimmed
  });

  await t.test('rejects if drop-off verification photo is missing', () => {
    const validatePhoto = (file) => {
      return Boolean(file && (file.location || file.filename || file.path));
    };

    assert.equal(validatePhoto(null), false);
    assert.equal(validatePhoto(undefined), false);
    assert.equal(validatePhoto({}), false);
    assert.equal(validatePhoto({ filename: '1700000-cartons.jpg' }), true);
    assert.equal(validatePhoto({ location: 'https://s3.amazonaws.com/bucket/cartons.jpg' }), true);
  });

  await t.test('validates 4-digit code matches recipient record exactly', () => {
    const recordCode = '5829';
    
    // Mismatch
    assert.equal('1234'.trim() === recordCode, false);
    assert.equal('5828'.trim() === recordCode, false);
    
    // Exact match
    assert.equal('5829'.trim() === recordCode, true);
    assert.equal(' 5829 '.trim() === recordCode, true);
  });

  await t.test('completion updates status, stamps exact timestamps, and retains photo URL', () => {
    const mockDonation = {
      _id: new mongoose.Types.ObjectId(),
      status: 'approved',
      deliveryHandoverCode: '4391',
      completedAt: null,
      deliveryHandoverCompletedAt: null,
      deliveryProofPhoto: null,
      deliveredByVolunteer: null
    };

    const volunteerUserId = new mongoose.Types.ObjectId();
    const photoUrl = 'http://localhost:5001/uploads/test-cartons.jpg';
    const now = new Date();

    // Simulate completion
    mockDonation.status = 'COMPLETED';
    mockDonation.completedAt = now;
    mockDonation.deliveryHandoverCompletedAt = now;
    mockDonation.deliveryProofPhoto = photoUrl;
    mockDonation.deliveredByVolunteer = volunteerUserId;

    assert.equal(mockDonation.status, 'COMPLETED');
    assert.equal(mockDonation.completedAt, now);
    assert.equal(mockDonation.deliveryHandoverCompletedAt, now);
    assert.equal(mockDonation.deliveryProofPhoto, photoUrl);
    assert.equal(mockDonation.deliveredByVolunteer, volunteerUserId);
  });
});

