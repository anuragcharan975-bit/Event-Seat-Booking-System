const app = require('./app');
const { connectDB } = require('./config/db');
const Event = require('./models/Event');
const Seat = require('./models/Seat');

const PORT = process.env.PORT || 5000;

/**
 * Seeds default demonstration events and seats if database has no events
 */
const seedInitialDataIfNeeded = async () => {
  try {
    const existingEventsCount = await Event.countDocuments();
    if (existingEventsCount > 0) {
      return;
    }

    console.log('[Seed] No existing events found. Seeding initial demonstration events & seats...');

    const now = new Date();
    const demoEvents = [
      {
        title: 'Tech Innovators Summit 2026',
        description: 'The premier annual technology gathering featuring keynotes on AI architecture, distributed systems, and modern web engineering.',
        venue: 'Silicon Grand Auditorium, Hall 1',
        startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days ahead
        endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        pricePerSeat: 1500,
        totalSeats: 40
      },
      {
        title: 'Global AI & Cloud Conclave',
        description: 'Deep dive into LLMs, serverless infrastructure, concurrent backend patterns, and enterprise cloud operations.',
        venue: 'Convention Center, Main Theater',
        startTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days ahead
        endTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        pricePerSeat: 2200,
        totalSeats: 40
      },
      {
        title: 'Indie Rock & Jazz Fest Live',
        description: 'An electrifying evening of live acoustic performances, jazz ensembles, and progressive indie rock bands.',
        venue: 'Starlight Arena, Stage North',
        startTime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), // 21 days ahead
        endTime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        pricePerSeat: 850,
        totalSeats: 40
      }
    ];

    const rows = ['A', 'B', 'C', 'D'];
    const seatsPerRow = 10;

    for (const eventData of demoEvents) {
      const createdEvent = await Event.create(eventData);
      const seatsToInsert = [];

      for (const row of rows) {
        for (let num = 1; num <= seatsPerRow; num++) {
          seatsToInsert.push({
            eventId: createdEvent._id,
            seatNumber: `${row}${num}`,
            row: row,
            status: 'AVAILABLE',
            holdId: null,
            holdExpiresAt: null
          });
        }
      }

      await Seat.insertMany(seatsToInsert);
      console.log(`[Seed] Created event "${createdEvent.title}" with 40 seats (A1-D10)`);
    }

    console.log('[Seed] Demonstration data seeding completed.');
  } catch (seedErr) {
    console.error('[Seed Error] Failed to seed initial demonstration data:', seedErr.message);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    await seedInitialDataIfNeeded();

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` Event Seat Booking Backend running on port ${PORT}`);
      console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health: http://localhost:${PORT}/api/health`);
      console.log(` Events: http://localhost:${PORT}/api/events`);
      console.log(`=======================================================`);
    });

    return server;
  } catch (error) {
    console.error(`[Server Fatal] Startup error: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };

