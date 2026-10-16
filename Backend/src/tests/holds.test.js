const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const SeatHold = require('../models/SeatHold');
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require('./testHelper');

describe('Seat Hold Management Suite', () => {
  let authToken;
  let testUser;
  let upcomingEvent;
  let pastEvent;
  let eventSeats = [];

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Register test user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Tester Hold',
        email: 'holdtester@example.com',
        password: 'password123'
      });
    authToken = userRes.body.token;
    testUser = userRes.body.user;

    const now = new Date();

    // Create upcoming event
    upcomingEvent = await Event.create({
      title: 'Upcoming Tech Expo',
      description: 'Future event description',
      venue: 'Main Hall',
      startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days ahead
      endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      pricePerSeat: 1000,
      totalSeats: 10
    });

    // Create past event
    pastEvent = await Event.create({
      title: 'Past Concert',
      description: 'Concert in the past',
      venue: 'Old Arena',
      startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      pricePerSeat: 500,
      totalSeats: 10
    });

    // Create seats for upcoming event
    eventSeats = [];
    for (let i = 1; i <= 6; i++) {
      const seat = await Seat.create({
        eventId: upcomingEvent._id,
        seatNumber: `A${i}`,
        row: 'A',
        status: 'AVAILABLE'
      });
      eventSeats.push(seat);
    }
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Test 4: Unauthenticated hold request
  it('should reject unauthenticated hold requests with HTTP 401', async () => {
    const res = await request(app)
      .post(`/api/events/${upcomingEvent._id}/holds`)
      .send({
        seatIds: [eventSeats[0]._id]
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Test 5 & 15: Successful hold and Price Integrity
  it('should successfully hold seats atomically and ignore client-manipulated prices', async () => {
    const requestedSeatIds = [eventSeats[0]._id.toString(), eventSeats[1]._id.toString()];

    const res = await request(app)
      .post(`/api/events/${upcomingEvent._id}/holds`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seatIds: requestedSeatIds,
        // Attempt to manipulate price from client
        pricePerSeat: 5,
        totalAmount: 10
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.holdId).toBeDefined();
    expect(res.body.data.expiresAt).toBeDefined();

    // Verify server authoritative price was used (1000 * 2 = 2000)
    expect(res.body.data.pricePerSeat).toBe(1000);
    expect(res.body.data.totalAmount).toBe(2000);

    // Verify seats in DB are marked HELD
    const updatedSeats = await Seat.find({ _id: { $in: requestedSeatIds } });
    for (const seat of updatedSeats) {
      expect(seat.status).toBe('HELD');
      expect(seat.holdId.toString()).toBe(res.body.data.holdId);
      expect(seat.holdExpiresAt).toBeDefined();
    }
  });

  // Test 6: Reject more than four seats
  it('should reject requests with more than four seats with HTTP 400', async () => {
    const fiveSeats = eventSeats.slice(0, 5).map((s) => s._id.toString());

    const res = await request(app)
      .post(`/api/events/${upcomingEvent._id}/holds`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seatIds: fiveSeats
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/between 1 and 4 seats/i);
  });

  // Test 7: Reject invalid event IDs and invalid seat IDs
  it('should return HTTP 400 for invalid event ID format', async () => {
    const res = await request(app)
      .post('/api/events/invalid-mongo-id/holds')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seatIds: [eventSeats[0]._id.toString()]
      });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for invalid seat ID format or non-existent event', async () => {
    const randomValidId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/events/${randomValidId}/holds`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seatIds: [eventSeats[0]._id.toString()]
      });

    expect(res.status).toBe(404);
  });

  // Test 8: Reject holds for past events
  it('should reject hold requests for past events with HTTP 400', async () => {
    const pastSeat = await Seat.create({
      eventId: pastEvent._id,
      seatNumber: 'P1',
      row: 'P',
      status: 'AVAILABLE'
    });

    const res = await request(app)
      .post(`/api/events/${pastEvent._id}/holds`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seatIds: [pastSeat._id.toString()]
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/past or ongoing/i);
  });

  // Test 14: Release seats and verify they become available
  it('should successfully release an active hold and return seats to AVAILABLE', async () => {
    // Hold seat A1
    const holdRes = await request(app)
      .post(`/api/events/${upcomingEvent._id}/holds`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seatIds: [eventSeats[0]._id.toString()]
      });

    const holdId = holdRes.body.data.holdId;

    // Verify seat is HELD
    let seat = await Seat.findById(eventSeats[0]._id);
    expect(seat.status).toBe('HELD');

    // Release hold
    const releaseRes = await request(app)
      .delete(`/api/holds/${holdId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.success).toBe(true);
    expect(releaseRes.body.data.status).toBe('RELEASED');

    // Verify seat is back to AVAILABLE
    seat = await Seat.findById(eventSeats[0]._id);
    expect(seat.status).toBe('AVAILABLE');
    expect(seat.holdId).toBeNull();
    expect(seat.holdExpiresAt).toBeNull();
  });

  // Test 20: Event seat availability correctly reflects available, held, booked, and expired states
  it('should correctly reflect seat status across available, held, booked, and expired states', async () => {
    const now = new Date();

    // Seat A1: Available
    // Seat A2: Held active
    await Seat.findByIdAndUpdate(eventSeats[1]._id, {
      status: 'HELD',
      holdExpiresAt: new Date(now.getTime() + 60000)
    });

    // Seat A3: Booked
    await Seat.findByIdAndUpdate(eventSeats[2]._id, {
      status: 'BOOKED'
    });

    // Seat A4: Expired hold (holdExpiresAt in the past)
    await Seat.findByIdAndUpdate(eventSeats[3]._id, {
      status: 'HELD',
      holdExpiresAt: new Date(now.getTime() - 5000)
    });

    const res = await request(app).get(`/api/events/${upcomingEvent._id}/seats`);

    expect(res.status).toBe(200);
    const seatsMap = {};
    res.body.seats.forEach((s) => {
      seatsMap[s.seatNumber] = s.status;
    });

    expect(seatsMap['A1']).toBe('AVAILABLE');
    expect(seatsMap['A2']).toBe('HELD');
    expect(seatsMap['A3']).toBe('BOOKED');
    // Expired hold should be treated as AVAILABLE
    expect(seatsMap['A4']).toBe('AVAILABLE');
  });

  // Category Filtering Suite
  describe('Event Category Filtering', () => {
    beforeEach(async () => {
      const now = new Date();
      await Event.create([
        {
          title: 'Jazz Night Live',
          category: 'Music',
          description: 'Live jazz music',
          venue: 'Jazz Bar',
          startTime: new Date(now.getTime() + 86400000),
          endTime: new Date(now.getTime() + 90000000),
          pricePerSeat: 500,
          totalSeats: 10
        },
        {
          title: 'Ballet Gala',
          category: 'Dance',
          description: 'Classical ballet performance',
          venue: 'Opera House',
          startTime: new Date(now.getTime() + 86400000 * 2),
          endTime: new Date(now.getTime() + 86400000 * 2 + 3600000),
          pricePerSeat: 800,
          totalSeats: 10
        },
        {
          title: 'Open Mic Standup',
          category: 'Comedy',
          description: 'Laugh out loud comedy',
          venue: 'Comedy Club',
          startTime: new Date(now.getTime() + 86400000 * 3),
          endTime: new Date(now.getTime() + 86400000 * 3 + 3600000),
          pricePerSeat: 400,
          totalSeats: 10
        }
      ]);
    });

    it('should filter events by exact category Music', async () => {
      const res = await request(app).get('/api/events?category=Music');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].category).toBe('Music');
      expect(res.body.data[0].title).toBe('Jazz Night Live');
    });

    it('should filter events by category Dance', async () => {
      const res = await request(app).get('/api/events?category=Dance');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].category).toBe('Dance');
      expect(res.body.data[0].title).toBe('Ballet Gala');
    });

    it('should match category case-insensitively and handle extra whitespace', async () => {
      const res = await request(app).get('/api/events?category=%20%20mUsIc%20%20');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].category).toBe('Music');
    });

    it('should return all events when category is "all" or "All Events"', async () => {
      const resAll = await request(app).get('/api/events?category=all');
      expect(resAll.status).toBe(200);
      expect(resAll.body.data.length).toBeGreaterThanOrEqual(4);

      const resAllEvents = await request(app).get('/api/events?category=All%20Events');
      expect(resAllEvents.status).toBe(200);
      expect(resAllEvents.body.data.length).toBeGreaterThanOrEqual(4);
    });

    it('should return empty list when no events exist in the requested category', async () => {
      const res = await request(app).get('/api/events?category=Sports');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });
});
