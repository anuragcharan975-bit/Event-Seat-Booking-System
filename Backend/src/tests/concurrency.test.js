const request = require('supertest');
const app = require('../app');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require('./testHelper');

describe('Critical Concurrency & Multi-Seat Atomicity Suite', () => {
  let userAToken;
  let userBToken;
  let event;
  let seat1, seat2, seat3;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Concurrency User A',
        email: 'userA_concurrency@example.com',
        password: 'password123'
      });
    userAToken = resA.body.token;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Concurrency User B',
        email: 'userB_concurrency@example.com',
        password: 'password123'
      });
    userBToken = resB.body.token;

    const now = new Date();
    event = await Event.create({
      title: 'High-Concurrency Championship Finals',
      description: 'Championship match',
      venue: 'Olympic Arena',
      startTime: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      pricePerSeat: 3000,
      totalSeats: 3
    });

    seat1 = await Seat.create({
      eventId: event._id,
      seatNumber: 'S1',
      row: 'S',
      status: 'AVAILABLE'
    });

    seat2 = await Seat.create({
      eventId: event._id,
      seatNumber: 'S2',
      row: 'S',
      status: 'AVAILABLE'
    });

    seat3 = await Seat.create({
      eventId: event._id,
      seatNumber: 'S3',
      row: 'S',
      status: 'AVAILABLE'
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Test 9: Concurrency: Send two simultaneous hold requests for the same seat; exactly one succeeds
  it('should guarantee that two simultaneous hold requests for the same seat result in exactly one success and one HTTP 409', async () => {
    // Both users fire hold requests concurrently for seat1
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/events/${event._id}/holds`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ seatIds: [seat1._id.toString()] }),
      request(app)
        .post(`/api/events/${event._id}/holds`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ seatIds: [seat1._id.toString()] })
    ]);

    const statuses = [resA.status, resB.status].sort();

    // Exactly one should succeed with 201 Created and the other should fail with 409 Conflict
    expect(statuses).toEqual([201, 409]);

    const winnerRes = resA.status === 201 ? resA : resB;
    const loserRes = resA.status === 409 ? resA : resB;

    expect(winnerRes.body.success).toBe(true);
    expect(loserRes.body.success).toBe(false);
    expect(loserRes.body.message).toMatch(/no longer available/i);

    // Verify seat is held by winner's hold ID only
    const updatedSeat = await Seat.findById(seat1._id);
    expect(updatedSeat.status).toBe('HELD');
    expect(updatedSeat.holdId.toString()).toBe(winnerRes.body.data.holdId);
  });

  // Test 10: Atomicity: Request one available seat and one unavailable seat; no newly requested seat remains held
  it('should enforce all-or-nothing atomicity: if one requested seat is unavailable, no seats remain held', async () => {
    // 1. User A successfully holds seat1
    await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ seatIds: [seat1._id.toString()] });

    // Verify seat1 is HELD and seat2 is AVAILABLE
    expect((await Seat.findById(seat1._id)).status).toBe('HELD');
    expect((await Seat.findById(seat2._id)).status).toBe('AVAILABLE');

    // 2. User B requests [seat2 (available), seat1 (already held)]
    const multiRes = await request(app)
      .post(`/api/events/${event._id}/holds`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ seatIds: [seat2._id.toString(), seat1._id.toString()] });

    // Request must fail completely with HTTP 409 Conflict
    expect(multiRes.status).toBe(409);
    expect(multiRes.body.success).toBe(false);

    // 3. CRITICAL CHECK: seat2 MUST NOT remain held! It must remain completely AVAILABLE
    const seat2AfterAttempt = await Seat.findById(seat2._id);
    expect(seat2AfterAttempt.status).toBe('AVAILABLE');
    expect(seat2AfterAttempt.holdId).toBeNull();
  });

  // Multi-seat concurrent race: User A requests [S1, S2], User B requests [S2, S3] simultaneously
  it('should handle overlapping multi-seat concurrent requests atomically without partial holds', async () => {
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/events/${event._id}/holds`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ seatIds: [seat1._id.toString(), seat2._id.toString()] }),
      request(app)
        .post(`/api/events/${event._id}/holds`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ seatIds: [seat2._id.toString(), seat3._id.toString()] })
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const winnerRes = resA.status === 201 ? resA : resB;
    const loserRes = resA.status === 409 ? resA : resB;

    // The losing request must have rolled back its non-conflicting seat!
    if (resA.status === 201) {
      // User A won: S1 & S2 held by A
      expect((await Seat.findById(seat1._id)).status).toBe('HELD');
      expect((await Seat.findById(seat2._id)).status).toBe('HELD');
      // S3 was requested by B, but B lost, so S3 must be AVAILABLE!
      expect((await Seat.findById(seat3._id)).status).toBe('AVAILABLE');
    } else {
      // User B won: S2 & S3 held by B
      expect((await Seat.findById(seat2._id)).status).toBe('HELD');
      expect((await Seat.findById(seat3._id)).status).toBe('HELD');
      // S1 was requested by A, but A lost, so S1 must be AVAILABLE!
      expect((await Seat.findById(seat1._id)).status).toBe('AVAILABLE');
    }
  });
});
