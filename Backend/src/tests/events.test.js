const request = require('supertest');
const app = require('../app');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require('./testHelper');

describe('Event Search & Filtering Suite', () => {
  let eventTech, eventMusic, eventWorkshop;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    const now = new Date();

    // 1. Tech Event (7 days in future)
    const dateTech = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    eventTech = await Event.create({
      title: 'DevOps & Cloud Global Summit',
      category: 'Technology',
      description: 'Microservices and Kubernetes deep-dive',
      venue: 'San Francisco Tech Center',
      startTime: dateTech,
      endTime: new Date(dateTech.getTime() + 4 * 60 * 60 * 1000),
      pricePerSeat: 1500,
      totalSeats: 2
    });
    await Seat.create([
      { eventId: eventTech._id, seatNumber: 'A1', row: 'A', status: 'AVAILABLE' },
      { eventId: eventTech._id, seatNumber: 'A2', row: 'A', status: 'AVAILABLE' }
    ]);

    // 2. Music Event (14 days in future)
    const dateMusic = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    eventMusic = await Event.create({
      title: 'Acoustic Jazz & Rock Night',
      category: 'Concert',
      description: 'Live acoustic melodies and jazz ensemble',
      venue: 'Blue Note Lounge',
      startTime: dateMusic,
      endTime: new Date(dateMusic.getTime() + 3 * 60 * 60 * 1000),
      pricePerSeat: 800,
      totalSeats: 2
    });
    await Seat.create([
      { eventId: eventMusic._id, seatNumber: 'A1', row: 'A', status: 'AVAILABLE' },
      { eventId: eventMusic._id, seatNumber: 'A2', row: 'A', status: 'AVAILABLE' }
    ]);

    // 3. Workshop Event (21 days in future)
    const dateWorkshop = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
    eventWorkshop = await Event.create({
      title: 'NextGen AI Fullstack Workshop',
      category: 'Workshop',
      description: 'Hands-on training with LLMs and agents',
      venue: 'Metropolitan Lab 4',
      startTime: dateWorkshop,
      endTime: new Date(dateWorkshop.getTime() + 6 * 60 * 60 * 1000),
      pricePerSeat: 2500,
      totalSeats: 2
    });
    await Seat.create([
      { eventId: eventWorkshop._id, seatNumber: 'A1', row: 'A', status: 'AVAILABLE' },
      { eventId: eventWorkshop._id, seatNumber: 'A2', row: 'A', status: 'AVAILABLE' }
    ]);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should return all events and distinct categories without query parameters', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.categories).toContain('Technology');
    expect(res.body.categories).toContain('Concert');
    expect(res.body.categories).toContain('Workshop');
  });

  it('should filter events by name/keyword search (case-insensitive)', async () => {
    const res = await request(app).get('/api/events?search=DevOps');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('DevOps & Cloud Global Summit');
    expect(res.body.data[0].category).toBe('Technology');
    expect(res.body.data[0].availableSeats).toBe(2);
  });

  it('should filter events by category', async () => {
    const res = await request(app).get('/api/events?category=Concert');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Acoustic Jazz & Rock Night');
  });

  it('should filter events by date', async () => {
    const dateStr = eventMusic.startTime.toISOString().split('T')[0];
    const res = await request(app).get(`/api/events?date=${dateStr}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Acoustic Jazz & Rock Night');
  });

  it('should support combined search, category, and date filtering', async () => {
    const dateStr = eventWorkshop.startTime.toISOString().split('T')[0];
    const res = await request(app).get(`/api/events?search=Workshop&category=Workshop&date=${dateStr}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('NextGen AI Fullstack Workshop');
  });

  it('should return empty array when no events match filters without 500 error', async () => {
    const res = await request(app).get('/api/events?search=NonExistentKeyword');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
    expect(res.body.totalEvents).toBe(0);
  });

  it('should handle invalid date parameter gracefully', async () => {
    const res = await request(app).get('/api/events?date=invalid-date-string');
    expect(res.status).toBe(200);
    // Invalid date should be ignored and not crash
    expect(res.body.data.length).toBe(3);
  });

  it('should return slug and categorySlug in event list', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('slug');
    expect(res.body.data[0]).toHaveProperty('categorySlug');
  });

  it('should retrieve event details and seats using /api/events/:category/:slug', async () => {
    const res = await request(app).get(`/api/events/${eventMusic.categorySlug}/${eventMusic.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.event.title).toBe(eventMusic.title);
    expect(res.body.event.slug).toBe(eventMusic.slug);
    expect(res.body.seats.length).toBe(2);
  });

  it('should return 404 when event slug does not exist', async () => {
    const res = await request(app).get('/api/events/music/non-existent-event-slug');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 when category does not match event category', async () => {
    const res = await request(app).get(`/api/events/technology/${eventMusic.slug}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should generate unique slugs with incremental suffix for duplicate event titles', async () => {
    const now = new Date();
    const event1 = await Event.create({
      title: 'Arijit Singh Concert',
      category: 'Music',
      description: 'First concert',
      venue: 'Arena 1',
      startTime: new Date(now.getTime() + 1000000),
      endTime: new Date(now.getTime() + 2000000),
      pricePerSeat: 1000,
      totalSeats: 1
    });

    const event2 = await Event.create({
      title: 'Arijit Singh Concert',
      category: 'Music',
      description: 'Second concert with same name',
      venue: 'Arena 2',
      startTime: new Date(now.getTime() + 3000000),
      endTime: new Date(now.getTime() + 4000000),
      pricePerSeat: 1000,
      totalSeats: 1
    });

    expect(event1.slug).toBe('arijit-singh-concert');
    expect(event2.slug).toBe('arijit-singh-concert-2');
  });

  it('should find events by category name (e.g. "Concert") when searching', async () => {
    // Acoustic Jazz & Rock Night has category: 'Concert'
    const res = await request(app).get('/api/events?search=concert');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some(e => e.title === 'Acoustic Jazz & Rock Night')).toBe(true);
  });

  it('should find events matching multiple comma-separated terms e.g. "Summit, Concert"', async () => {
    const res = await request(app).get('/api/events?search=Summit,%20Concert');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    const titles = res.body.data.map(e => e.title);
    expect(titles).toContain('DevOps & Cloud Global Summit');
    expect(titles).toContain('Acoustic Jazz & Rock Night');
  });

  it('should return all matching events when date parameter is omitted (date optional)', async () => {
    // Search "Acoustic" without date
    const res = await request(app).get('/api/events?search=Acoustic');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Acoustic Jazz & Rock Night');
  });

  it('should narrow search results when optional date filter is provided', async () => {
    const dateStr = eventMusic.startTime.toISOString().split('T')[0];
    const matchRes = await request(app).get(`/api/events?search=Acoustic&date=${dateStr}`);
    expect(matchRes.status).toBe(200);
    expect(matchRes.body.data.length).toBe(1);

    const nonMatchRes = await request(app).get('/api/events?search=Acoustic&date=2026-01-01');
    expect(nonMatchRes.status).toBe(200);
    expect(nonMatchRes.body.data.length).toBe(0);
  });
});
