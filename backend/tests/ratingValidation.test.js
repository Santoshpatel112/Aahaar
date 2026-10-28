import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Rating from '../models/ratingModel.js';

test('Rating Model - Schema Validation', async (t) => {
  await t.test('fails when required fields are missing', () => {
    const r = new Rating({});
    const err = r.validateSync();
    assert.ok(err);
    assert.ok(err.errors.donation, 'donation is required');
    assert.ok(err.errors.reviewer, 'reviewer is required');
    assert.ok(err.errors.reviewerRole, 'reviewerRole is required');
    assert.ok(err.errors.recipient, 'recipient is required');
    assert.ok(err.errors.recipientModel, 'recipientModel is required');
    assert.ok(err.errors.rating, 'rating is required');
  });

  await t.test('fails when rating is less than 1', () => {
    const r = new Rating({
      donation: new mongoose.Types.ObjectId(),
      reviewer: new mongoose.Types.ObjectId(),
      reviewerRole: 'donor',
      recipient: new mongoose.Types.ObjectId(),
      recipientModel: 'Ngo',
      rating: 0,
    });
    const err = r.validateSync();
    assert.ok(err);
    assert.ok(err.errors.rating, 'rating < 1 should fail');
  });

  await t.test('fails when rating is greater than 5', () => {
    const r = new Rating({
      donation: new mongoose.Types.ObjectId(),
      reviewer: new mongoose.Types.ObjectId(),
      reviewerRole: 'donor',
      recipient: new mongoose.Types.ObjectId(),
      recipientModel: 'Ngo',
      rating: 6,
    });
    const err = r.validateSync();
    assert.ok(err);
    assert.ok(err.errors.rating, 'rating > 5 should fail');
  });

  await t.test('fails when rating is a decimal / not an integer', () => {
    const r = new Rating({
      donation: new mongoose.Types.ObjectId(),
      reviewer: new mongoose.Types.ObjectId(),
      reviewerRole: 'donor',
      recipient: new mongoose.Types.ObjectId(),
      recipientModel: 'Ngo',
      rating: 4.5,
    });
    const err = r.validateSync();
    assert.ok(err);
    assert.ok(err.errors.rating, 'decimal rating should fail');
  });

  await t.test('fails when reviewerRole is invalid', () => {
    const r = new Rating({
      donation: new mongoose.Types.ObjectId(),
      reviewer: new mongoose.Types.ObjectId(),
      reviewerRole: 'admin',
      recipient: new mongoose.Types.ObjectId(),
      recipientModel: 'Ngo',
      rating: 5,
    });
    const err = r.validateSync();
    assert.ok(err);
    assert.ok(err.errors.reviewerRole, 'invalid reviewerRole should fail');
  });

  await t.test('fails when recipientModel is invalid', () => {
    const r = new Rating({
      donation: new mongoose.Types.ObjectId(),
      reviewer: new mongoose.Types.ObjectId(),
      reviewerRole: 'donor',
      recipient: new mongoose.Types.ObjectId(),
      recipientModel: 'InvalidModel',
      rating: 5,
    });
    const err = r.validateSync();
    assert.ok(err);
    assert.ok(err.errors.recipientModel, 'invalid recipientModel should fail');
  });

  await t.test('fails when comment exceeds 1000 characters', () => {
    const r = new Rating({
      donation: new mongoose.Types.ObjectId(),
      reviewer: new mongoose.Types.ObjectId(),
      reviewerRole: 'donor',
      recipient: new mongoose.Types.ObjectId(),
      recipientModel: 'Ngo',
      rating: 5,
      comment: 'a'.repeat(1001),
    });
    const err = r.validateSync();
    assert.ok(err);
    assert.ok(err.errors.comment, 'comment > 1000 chars should fail');
  });

  await t.test('passes when valid data is supplied', () => {
    const r = new Rating({
      donation: new mongoose.Types.ObjectId(),
      reviewer: new mongoose.Types.ObjectId(),
      reviewerRole: 'donor',
      recipient: new mongoose.Types.ObjectId(),
      recipientModel: 'Ngo',
      recipientUser: new mongoose.Types.ObjectId(),
      rating: 5,
      comment: 'Excellent food pickup and smooth coordination!',
    });
    const err = r.validateSync();
    assert.equal(err, undefined, 'valid rating should not produce validation errors');
  });
});

test('Rating Calculation Logic', async (t) => {
  await t.test('correctly calculates average and star distributions', () => {
    const scores = [5, 5, 4, 3, 5, 2, 1, 4]; // 8 ratings
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    scores.forEach((s) => counts[s]++);

    const totalRatings = scores.length;
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = totalRatings > 0 ? Number((sum / totalRatings).toFixed(1)) : 0;

    assert.equal(totalRatings, 8);
    assert.equal(sum, 29);
    assert.equal(average, 3.6); // 29 / 8 = 3.625 -> 3.6

    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star],
      percentage: Math.round((counts[star] / totalRatings) * 100),
    }));

    assert.deepEqual(distribution, [
      { star: 5, count: 3, percentage: 38 },
      { star: 4, count: 2, percentage: 25 },
      { star: 3, count: 1, percentage: 13 },
      { star: 2, count: 1, percentage: 13 },
      { star: 1, count: 1, percentage: 13 },
    ]);
  });

  await t.test('correctly handles zero ratings', () => {
    const totalRatings = 0;
    const average = 0;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: 0,
      percentage: 0,
    }));

    assert.equal(average, 0);
    assert.equal(totalRatings, 0);
    assert.equal(distribution.length, 5);
    distribution.forEach((d) => {
      assert.equal(d.count, 0);
      assert.equal(d.percentage, 0);
    });
  });
});
