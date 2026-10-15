const request = require('supertest');
const app = require('../app');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const SeatHold = require('../models/SeatHold');
const Booking = require('../models/Booking');
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require('./testHelper');

describe('Booking Confirmation & Idempotency Suite', () => {
  let userAToken, userA;
  let userBToken, userB;
  let event;
  let seat1, seat2;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Alpha',
        email: 'alpha@example.com',
        password: 'password123'
      });
    userAToken = resA.body.token;
    userA = resA.body.user;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Beta',
        email: 'beta@example.com',
        password: 'password123'
      });
    userBToken = resB.body.token;
    userB = resB.body.user;

    const now = new Date();
    event = await Event.create({
      title: 'Grand Symphony Concert',
      description: 'Classical concert',
      venue: 'National Concert Hall',
      startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      pricePerSeat: 1200,
      totalSeats: 2
    });

    seat1 = await Seat.create({
      eventId: event._id,
      seatNumber: 'A1',
      row: 'A',
      status: 'AVAILABLE'
    });

    seat2 = await Seat.create({
      eventId: event._id,
      seatNumber: 'A2',
      row: 'A',
      status: 'AVAILABLE'
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Test 12: Idempotency: Confirm twice and verify exactly one booking exists
  it('should confirm hold idempotently and return existing booking on retry without duplicate bookings', async () => {
    // 1. User A holds seat1
    const holdRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ seatIds: [seat1._id.toString()] });

    const holdId = holdRes.body.data.holdId;

    // 2. First confirmation
    const confirmRes1 = await request(app)
      .post(`/api/holds/${holdId}/confirm`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(confirmRes1.status).toBe(201);
    expect(confirmRes1.body.success).toBe(true);
    expect(confirmRes1.body.data.bookingReference).toBeDefined();
    expect(confirmRes1.body.data.amount).toBe(1200);

    const firstRef = confirmRes1.body.data.bookingReference;

    // 3. Second confirmation (simulate double-click or network retry)
    const confirmRes2 = await request(app)
      .post(`/api/holds/${holdId}/confirm`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(confirmRes2.status).toBe(200); // 200 OK for idempotent return
    expect(confirmRes2.body.success).toBe(true);
    expect(confirmRes2.body.data.bookingReference).toBe(firstRef);

    // Verify exactly ONE booking exists in the database
    const bookingCount = await Booking.countDocuments({ holdId });
    expect(bookingCount).toBe(1);

    // Verify seat is BOOKED
    const updatedSeat = await Seat.findById(seat1._id);
    expect(updatedSeat.status).toBe('BOOKED');
  });

  // Test 13: Authorization: User B cannot confirm or release User A's hold
  it('should prevent User B from confirming User A hold with HTTP 403', async () => {
    const holdRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ seatIds: [seat1._id.toString()] });

    const holdId = holdRes.body.data.holdId;

    // User B attempts to confirm User A's hold
    const confirmRes = await request(app)
      .post(`/api/holds/${holdId}/confirm`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(confirmRes.status).toBe(403);
    expect(confirmRes.body.success).toBe(false);
  });

  it('should prevent User B from releasing User A hold with HTTP 403', async () => {
    const holdRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ seatIds: [seat1._id.toString()] });

    const holdId = holdRes.body.data.holdId;

    // User B attempts to release User A's hold
    const releaseRes = await request(app)
      .delete(`/api/holds/${holdId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(releaseRes.status).toBe(403);
    expect(releaseRes.body.success).toBe(false);
  });

  // Test 11: Expiry: Create a hold, advance clock > 120s, verify confirmation fails, seat can be held again
  it('should reject confirmation of an expired hold with HTTP 409 and allow seat to be held again', async () => {
    const startTime = new Date('2026-10-14T10:00:00Z');

    // 1. User A creates hold at startTime
    const holdRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        seatIds: [seat1._id.toString()],
        testClockNow: startTime.toISOString()
      });

    const holdId = holdRes.body.data.holdId;

    // 2. Advance clock 125 seconds (beyond 120s expiration)
    const lateTime = new Date(startTime.getTime() + 125 * 1000);

    // 3. User A attempts late confirmation
    const confirmRes = await request(app)
      .post(`/api/holds/${holdId}/confirm`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        testClockNow: lateTime.toISOString()
      });

    expect(confirmRes.status).toBe(409);
    expect(confirmRes.body.success).toBe(false);
    expect(confirmRes.body.message).toMatch(/expired/i);

    // 4. Verify User B can now hold the same seat at lateTime
    const newHoldRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        seatIds: [seat1._id.toString()],
        testClockNow: lateTime.toISOString()
      });

    expect(newHoldRes.status).toBe(201);
    expect(newHoldRes.body.success).toBe(true);
    expect(newHoldRes.body.data.holdId).not.toBe(holdId);
  });

  // Test 16: Concurrent confirmations: Only one booking is created
  it('should handle concurrent confirmation requests and create exactly one booking', async () => {
    const holdRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ seatIds: [seat1._id.toString()] });

    const holdId = holdRes.body.data.holdId;

    // Trigger two simultaneous confirmations
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/holds/${holdId}/confirm`)
        .set('Authorization', `Bearer ${userAToken}`),
      request(app)
        .post(`/api/holds/${holdId}/confirm`)
        .set('Authorization', `Bearer ${userAToken}`)
    ]);

    // Both should be successful (one 201 created, one 200 idempotent result)
    expect([200, 201]).toContain(res1.status);
    expect([200, 201]).toContain(res2.status);

    const bookingCount = await Booking.countDocuments({ holdId });
    expect(bookingCount).toBe(1);
  });

  // Test 17: Expired cleanup safety: Cleanup of old hold cannot free a newer hold's seats
  it('should ensure expired cleanup of an old hold never frees seats claimed by a newer hold', async () => {
    const t0 = new Date('2026-10-14T10:00:00Z');
    const t1 = new Date(t0.getTime() + 130 * 1000); // 130s later (Hold A expired)

    // User A holds seat1 at t0
    const holdARes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ seatIds: [seat1._id.toString()], testClockNow: t0.toISOString() });
    const holdAId = holdARes.body.data.holdId;

    // User B claims seat1 at t1 (since Hold A is expired)
    const holdBRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ seatIds: [seat1._id.toString()], testClockNow: t1.toISOString() });
    const holdBId = holdBRes.body.data.holdId;

    // Verify seat is currently held by Hold B
    let seat = await Seat.findById(seat1._id);
    expect(seat.holdId.toString()).toBe(holdBId);

    // Delayed cleanup or late confirmation attempt for Hold A
    await request(app)
      .post(`/api/holds/${holdAId}/confirm`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ testClockNow: t1.toISOString() });

    // Verify seat is STILL held by Hold B and NOT cleared or freed!
    seat = await Seat.findById(seat1._id);
    expect(seat.status).toBe('HELD');
    expect(seat.holdId.toString()).toBe(holdBId);
  });

  // Test 18: Booked seats remain unavailable after original hold expiry
  it('should keep booked seats unavailable even after original hold expiry time has passed', async () => {
    const t0 = new Date('2026-10-14T10:00:00Z');

    // User A holds and confirms seat1
    const holdRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ seatIds: [seat1._id.toString()], testClockNow: t0.toISOString() });
    const holdId = holdRes.body.data.holdId;

    await request(app)
      .post(`/api/holds/${holdId}/confirm`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ testClockNow: t0.toISOString() });

    // Verify seat is BOOKED
    let seat = await Seat.findById(seat1._id);
    expect(seat.status).toBe('BOOKED');

    // Advance clock 1 hour past original hold expiry
    const futureTime = new Date(t0.getTime() + 3600 * 1000);

    // User B attempts to hold the booked seat
    const conflictRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ seatIds: [seat1._id.toString()], testClockNow: futureTime.toISOString() });

    expect(conflictRes.status).toBe(409);

    // Seat must still be BOOKED
    seat = await Seat.findById(seat1._id);
    expect(seat.status).toBe('BOOKED');
  });

  // Booking history: GET /api/bookings/me
  it('should return only the authenticated user bookings in booking history', async () => {
    // User A books seat1
    const holdRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ seatIds: [seat1._id.toString()] });
    await request(app)
      .post(`/api/holds/${holdRes.body.data.holdId}/confirm`)
      .set('Authorization', `Bearer ${userAToken}`);

    // User B requests their bookings
    const bookingsBRes = await request(app)
      .get('/api/bookings/me')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(bookingsBRes.status).toBe(200);
    expect(bookingsBRes.body.data.length).toBe(0);

    // User A requests their bookings
    const bookingsARes = await request(app)
      .get('/api/bookings/me')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(bookingsARes.status).toBe(200);
    expect(bookingsARes.body.data.length).toBe(1);
    expect(bookingsARes.body.data[0].amount).toBe(1200);
    expect(bookingsARes.body.data[0].event.title).toBe('Grand Symphony Concert');
    expect(bookingsARes.body.data[0].seats[0].seatNumber).toBe('A1');
  });
});
