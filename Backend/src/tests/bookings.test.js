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

  // Booking Cancellation Suite
  describe('Booking Cancellation & Seat Reavailability', () => {
    let bookingId;

    beforeEach(async () => {
      // User A books seat1
      const holdRes = await request(app)
        .post(`/api/events/${event._id}/holds`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ seatIds: [seat1._id.toString()] });

      const confirmRes = await request(app)
        .post(`/api/holds/${holdRes.body.data.holdId}/confirm`)
        .set('Authorization', `Bearer ${userAToken}`);

      bookingId = confirmRes.body.data._id;
    });

    it('should successfully cancel a confirmed booking and make seats AVAILABLE again', async () => {
      const cancelRes = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.status).toBe('CANCELLED');

      // Verify seat in DB is now AVAILABLE
      const seat = await Seat.findById(seat1._id);
      expect(seat.status).toBe('AVAILABLE');
      expect(seat.holdId).toBeNull();
      expect(seat.holdExpiresAt).toBeNull();

      // Verify booking history preserves record as CANCELLED
      const historyRes = await request(app)
        .get('/api/bookings/me')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.length).toBe(1);
      expect(historyRes.body.data[0].status).toBe('CANCELLED');
    });

    it('should allow another user to hold and book the seat after cancellation', async () => {
      // 1. User A cancels
      await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);

      // 2. User B can now hold seat1
      const holdBRes = await request(app)
        .post(`/api/events/${event._id}/holds`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ seatIds: [seat1._id.toString()] });

      expect(holdBRes.status).toBe(201);
      expect(holdBRes.body.success).toBe(true);

      // 3. User B confirms booking for seat1
      const confirmBRes = await request(app)
        .post(`/api/holds/${holdBRes.body.data.holdId}/confirm`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(confirmBRes.status).toBe(201);
      expect(confirmBRes.body.success).toBe(true);

      // Seat is now booked by User B
      const seat = await Seat.findById(seat1._id);
      expect(seat.status).toBe('BOOKED');
    });

    it('should reject cancellation attempt by User B for User A booking with HTTP 403', async () => {
      const cancelRes = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(cancelRes.status).toBe(403);
      expect(cancelRes.body.success).toBe(false);

      // Seat remains BOOKED
      const seat = await Seat.findById(seat1._id);
      expect(seat.status).toBe('BOOKED');
    });

    it('should reject duplicate cancellation requests with HTTP 400', async () => {
      // First cancellation
      const cancelRes1 = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(cancelRes1.status).toBe(200);

      // Second cancellation
      const cancelRes2 = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(cancelRes2.status).toBe(400);
      expect(cancelRes2.body.success).toBe(false);
      expect(cancelRes2.body.message).toMatch(/already been cancelled/i);
    });

    it('should reject cancellation for invalid or non-existent booking ID', async () => {
      // Invalid format
      const invalidRes = await request(app)
        .post('/api/bookings/invalid-id/cancel')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(invalidRes.status).toBe(400);

      // Non-existent ID
      const notFoundRes = await request(app)
        .post(`/api/bookings/${event._id}/cancel`) // valid ObjectId but not a booking
        .set('Authorization', `Bearer ${userAToken}`);
      expect(notFoundRes.status).toBe(404);
    });

    it('should also allow cancellation via DELETE /api/bookings/:bookingId/cancel and DELETE /api/bookings/:bookingId', async () => {
      // User A books seat2
      const holdRes = await request(app)
        .post(`/api/events/${event._id}/holds`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ seatIds: [seat2._id.toString()] });

      const confirmRes = await request(app)
        .post(`/api/holds/${holdRes.body.data.holdId}/confirm`)
        .set('Authorization', `Bearer ${userAToken}`);

      const newBookingId = confirmRes.body.data._id;

      // Cancel via DELETE
      const deleteRes = await request(app)
        .delete(`/api/bookings/${newBookingId}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.data.status).toBe('CANCELLED');

      const seat2Check = await Seat.findById(seat2._id);
      expect(seat2Check.status).toBe('AVAILABLE');
    });

    it('should allow an admin to cancel any booking', async () => {
      const User = require('../models/User');
      const jwt = require('jsonwebtoken');

      // Create admin user
      const adminUser = await User.create({
        name: 'Admin Boss',
        email: 'admin_test@example.com',
        passwordHash: 'dummyHash123',
        role: 'admin'
      });

      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_event_seat_booking_system_2026_xyz';
      const adminToken = jwt.sign(
        { id: adminUser._id, email: adminUser.email, name: adminUser.name, role: 'admin' },
        secret
      );

      // Admin cancels User A's bookingId
      const cancelRes = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });

    it('should support GET /api/bookings/my and sort newest first', async () => {
      const myRes = await request(app)
        .get('/api/bookings/my')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(myRes.status).toBe(200);
      expect(myRes.body.success).toBe(true);
      expect(Array.isArray(myRes.body.data)).toBe(true);
      expect(myRes.body.data.length).toBeGreaterThan(0);
      expect(myRes.body.data[0].event).toBeDefined();
      expect(myRes.body.data[0].seats).toBeDefined();
    });

    it('should cancel booking via PATCH /api/bookings/:id/cancel', async () => {
      // User A books seat2
      const holdRes = await request(app)
        .post(`/api/events/${event._id}/holds`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ seatIds: [seat2._id.toString()] });

      const confirmRes = await request(app)
        .post(`/api/holds/${holdRes.body.data.holdId}/confirm`)
        .set('Authorization', `Bearer ${userAToken}`);

      const patchBookingId = confirmRes.body.data._id;

      const patchRes = await request(app)
        .patch(`/api/bookings/${patchBookingId}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.status).toBe('CANCELLED');

      const seat2Status = await Seat.findById(seat2._id);
      expect(seat2Status.status).toBe('AVAILABLE');
    });
  });

  describe('Direct Booking POST /api/bookings and Backend Validations', () => {
    it('should reject booking without authorization token (401)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({ eventId: event._id.toString(), seatIds: [seat1._id.toString()] });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject empty seat selections (400)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ eventId: event._id.toString(), seatIds: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/seat selection|at least 1 seat/i);
    });

    it('should reject duplicate seat selections in request (400)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          eventId: event._id.toString(),
          seatIds: [seat1._id.toString(), seat1._id.toString()]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/duplicate/i);
    });

    it('should reject booking for past events (400)', async () => {
      const pastEvent = await Event.create({
        title: 'Past Historical Concert',
        description: 'Concert in the past',
        venue: 'Historic Hall',
        startTime: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        endTime: new Date(Date.now() - 46 * 60 * 60 * 1000),
        pricePerSeat: 500,
        totalSeats: 1
      });

      const pastSeat = await Seat.create({
        eventId: pastEvent._id,
        seatNumber: 'P1',
        row: 'P',
        status: 'AVAILABLE'
      });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          eventId: pastEvent._id.toString(),
          seatIds: [pastSeat._id.toString()]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/past/i);
    });

    it('should reject seats that belong to another event (400)', async () => {
      const otherEvent = await Event.create({
        title: 'Other Event',
        description: 'Other event description',
        venue: 'Other Venue',
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        pricePerSeat: 300,
        totalSeats: 1
      });

      const otherSeat = await Seat.create({
        eventId: otherEvent._id,
        seatNumber: 'O1',
        row: 'O',
        status: 'AVAILABLE'
      });

      // Try booking otherSeat under first event._id
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          eventId: event._id.toString(),
          seatIds: [otherSeat._id.toString()]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not belong to this event/i);
    });

    it('should reject seats that are already booked (409)', async () => {
      // Mark seat1 as BOOKED directly
      await Seat.findByIdAndUpdate(seat1._id, { status: 'BOOKED' });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          eventId: event._id.toString(),
          seatIds: [seat1._id.toString()]
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already booked/i);
    });

    it('should successfully create a direct booking and return 201 with populated details and booking ID', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          eventId: event._id.toString(),
          seatIds: [seat1._id.toString(), seat2._id.toString()]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Booking confirmed successfully/i);
      expect(res.body.data.bookingReference).toMatch(/^BK-[A-Z0-9-]+$/);
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.amount).toBe(2400); // 1200 * 2
      expect(res.body.data.seatIds).toHaveLength(2);

      // Verify seats are now BOOKED in database
      const updatedSeat1 = await Seat.findById(seat1._id);
      const updatedSeat2 = await Seat.findById(seat2._id);
      expect(updatedSeat1.status).toBe('BOOKED');
      expect(updatedSeat2.status).toBe('BOOKED');
    });
  });
});

