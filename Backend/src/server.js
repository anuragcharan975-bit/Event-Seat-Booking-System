const app = require('./app');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('./config/db');
const Event = require('./models/Event');
const Seat = require('./models/Seat');
const User = require('./models/User');
const { slugify, generateUniqueEventSlug } = require('./utils/slugify');

const PORT = process.env.PORT || 5000;

/**
 * Seeds default demonstration events and seats if database has no events
 */
const seedInitialDataIfNeeded = async () => {
  try {
    const now = new Date();
    const demoEvents = [
      {
        title: 'Indie Rock & Jazz Fest Live',
        category: 'Music',
        imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
        description: 'An electrifying evening of live acoustic performances, jazz ensembles, and progressive indie rock bands.',
        venue: 'Starlight Arena, Stage North',
        startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days ahead
        endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        pricePerSeat: 850,
        totalSeats: 40
      },
      {
        title: 'Contemporary Ballet & Fusion Gala',
        category: 'Dance',
        imageUrl: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=80',
        description: 'A breathtaking showcase of contemporary ballet, hip-hop fusion, and traditional choreographies by world-renowned troupes.',
        venue: 'Royal Opera House, Grand Stage',
        startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days ahead
        endTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        pricePerSeat: 1200,
        totalSeats: 40
      },
      {
        title: 'Stand-Up Comedy All-Stars Special',
        category: 'Comedy',
        imageUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=800&q=80',
        description: 'A riotous night of comedy featuring top headline stand-up comedians and improvisational comedy artists.',
        venue: 'Laugh Lounge, Main Theater',
        startTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days ahead
        endTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        pricePerSeat: 600,
        totalSeats: 40
      },
      {
        title: 'The Phantom Drama Showcase',
        category: 'Theatre',
        imageUrl: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=800&q=80',
        description: 'A captivating theatrical production exploring timeless drama, dynamic stage craft, and acclaimed performances.',
        venue: 'Civic Center Playhouse, Stage 2',
        startTime: new Date(now.getTime() + 17 * 24 * 60 * 60 * 1000), // 17 days ahead
        endTime: new Date(now.getTime() + 17 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        pricePerSeat: 1100,
        totalSeats: 40
      },
      {
        title: 'National Badminton Championship Finals',
        category: 'Sports',
        imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
        description: 'Witness intense clashes between top seeded national athletes in singles and doubles championship matches.',
        venue: 'Indoor Sports Complex, Court 1',
        startTime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), // 21 days ahead
        endTime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        pricePerSeat: 750,
        totalSeats: 40
      },
      {
        title: 'Full-Stack Architecture & Cloud Workshop',
        category: 'Workshops',
        imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
        description: 'Hands-on intensive masterclass on microservices, concurrent database transactions, and scalable reactive web apps.',
        venue: 'Silicon Innovation Hub, Lab 3',
        startTime: new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000), // 24 days ahead
        endTime: new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        pricePerSeat: 1800,
        totalSeats: 40
      },
      {
        title: 'Artisan Coffee & Culinary World Expo',
        category: 'Other',
        imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
        description: 'Explore gourmet roast tastings, barista masterclasses, and international artisan culinary exhibitions.',
        venue: 'City Exhibition Pavilion, Hall A',
        startTime: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000), // 28 days ahead
        endTime: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        pricePerSeat: 500,
        totalSeats: 40
      },
      {
        title: 'Serenity Luxury Spa & Wellness Retreat',
        category: 'Spa',
        imageUrl: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
        description: 'Immerse yourself in a full-day holistic wellness experience featuring therapeutic aromatherapy, Swedish massage sessions, thermal hydrotherapy baths, and guided mindfulness meditation.',
        venue: 'Serenity Mountain Spa Pavilion, Zen Suite',
        startTime: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), // 12 days ahead
        endTime: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        pricePerSeat: 1600,
        totalSeats: 40
      },
      {
        title: 'Himalayan Herbal Spa & Detox Weekend',
        category: 'Spa',
        imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
        description: 'Rejuvenate your senses with pure Himalayan herbal remedies, hot stone therapies, organic detox drinks, and serene wellness therapy sessions.',
        venue: 'Himalayan Wellness Sanctuary, Hall B',
        startTime: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        pricePerSeat: 1800,
        totalSeats: 40
      },
      {
        title: 'Ayurvedic Herbal Spa & Rejuvenation Retreat',
        category: 'Spa',
        imageUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80',
        description: 'Experience traditional Ayurvedic wellness therapy, authentic herbal steam baths, hot stone massages, and holistic rejuvenation therapies with certified master practitioners.',
        venue: 'Ayur Wellness Sanctuary, Green Valley Pavilion',
        startTime: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        pricePerSeat: 1400,
        totalSeats: 40
      },
      {
        title: 'Symphony Under the Stars Orchestra',
        category: 'Music',
        imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
        description: 'An enchanting open-air classical symphony featuring world-class violinists, grand piano concertos, and timeless orchestral masterpieces.',
        venue: 'Open Sky Amphitheatre, Garden Arena',
        startTime: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        pricePerSeat: 950,
        totalSeats: 40
      },
      {
        title: 'International Salsa & Bachata Night',
        category: 'Dance',
        imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
        description: 'Feel the rhythm of Latin beats with sensational salsa and bachata showcases, live percussion, and interactive social dancing.',
        venue: 'Rhythm Ballroom & Lounge, Stage 1',
        startTime: new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        pricePerSeat: 800,
        totalSeats: 40
      },
      {
        title: 'Midnight Improv & Roast Battles',
        category: 'Comedy',
        imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80',
        description: 'Non-stop laughter with unscripted audience-driven improv sketches, witty roasts, and top viral stand-up comedians.',
        venue: 'The Underground Comedy Cellar, Room 4',
        startTime: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        pricePerSeat: 650,
        totalSeats: 40
      },
      {
        title: 'Pro Boxing & MMA Championship Fight Night',
        category: 'Sports',
        imageUrl: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80',
        description: 'High-octane boxing title bouts and MMA lightweight clashes featuring champion fighters, live ringside action, and heavyweight thrill.',
        venue: 'Metro Stadium Arena, Ring Center',
        startTime: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        pricePerSeat: 1500,
        totalSeats: 40
      },
      {
        title: 'Broadway Musical: Echoes of Eternity',
        category: 'Theatre',
        imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
        description: 'An awe-inspiring Broadway-style musical drama filled with breathtaking live vocals, dazzling stage costumes, and orchestral storytelling.',
        venue: 'Grand Majestic Theatre, Main Stage',
        startTime: new Date(now.getTime() + 26 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 26 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        pricePerSeat: 1350,
        totalSeats: 40
      },
      {
        title: 'PUBG Battlegrounds India Championship 2026',
        category: 'Game',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
        description: 'Witness India\'s top PUBG squads battle across Erangel and Miramar for the grand trophy. High-octane survival firefights, pro caster analysis, and live fan arena cheering.',
        venue: 'Apex Esports Arena, Main Stage',
        startTime: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        pricePerSeat: 499,
        totalSeats: 40
      },
      {
        title: 'Clash of Clans (CoC) World Clan War Finals',
        category: 'Game',
        imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
        description: 'The ultimate Clash of Clans championship! Elite Clans clash in live 5v5 Town Hall 16 war attacks, 3-star strategies, trophy pushes, and exclusive spectator giveaways.',
        venue: 'CyberHub Gaming Dome, Hall B',
        startTime: new Date(now.getTime() + 19 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 19 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        pricePerSeat: 450,
        totalSeats: 40
      },
      {
        title: 'Formula 1 Grand Prix & Supercar Showcase 2026',
        category: 'Car',
        imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
        description: 'Experience the thunderous roar of Formula 1 machinery and elite hypercars. Featuring live high-speed hot laps, Ferrari and Lamborghini paddock showcases, pit lane walks, and precision drift demonstrations.',
        venue: 'Buddh International Circuit, Main Grandstand Track, Greater Noida',
        startTime: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        pricePerSeat: 1999,
        totalSeats: 40
      },
      {
        title: 'Auto Expo & Supercar Drifting Championship',
        category: 'Car',
        imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
        description: 'Witness high-speed drift battles, customized tuner car showcases, electric supercar debuts, and live burnout arena challenges with international stunt drivers.',
        venue: 'India Expo Mart, Auto Arena Hall 5, Greater Noida',
        startTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        pricePerSeat: 899,
        totalSeats: 40
      },
      {
        title: 'Vintage & Exotic Classic Car Concourse',
        category: 'Car',
        imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
        description: 'Step into automotive history featuring over 100 immaculate vintage classics, royal Rolls-Royce and Jaguar roadsters, restoration workshops, and exclusive collector parades.',
        venue: 'Heritage Palace Grounds, Royal Automobile Pavilion, New Delhi',
        startTime: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        pricePerSeat: 650,
        totalSeats: 40
      }
    ];

    const rows = ['A', 'B', 'C', 'D'];
    const seatsPerRow = 10;

    // Synchronize images and categories on existing events
    for (const demoEvent of demoEvents) {
      await Event.updateMany(
        { title: demoEvent.title },
        {
          $set: {
            category: demoEvent.category,
            imageUrl: demoEvent.imageUrl
          }
        }
      );
    }

    // Update any events without imageUrl or with legacy titles
    await Event.updateMany(
      { title: 'Tech Innovators Summit 2026' },
      {
        $set: {
          category: 'Workshops',
          imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
        }
      }
    );
    await Event.updateMany(
      { title: 'Global AI & Cloud Conclave' },
      {
        $set: {
          category: 'Workshops',
          imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80'
        }
      }
    );
    await Event.updateMany(
      { title: 'Himalayan Herbal Spa & Detox Weekend' },
      {
        $set: {
          category: 'Spa',
          imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80'
        }
      }
    );
    await Event.updateMany(
      { title: 'Serenity Luxury Spa & Wellness Retreat' },
      {
        $set: {
          category: 'Spa',
          imageUrl: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80'
        }
      }
    );
    await Event.updateMany(
      { title: 'Ayurvedic Herbal Spa & Rejuvenation Retreat' },
      {
        $set: {
          category: 'Spa',
          imageUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80'
        }
      }
    );

    // Seed any missing event from our demo catalog
    for (const eventData of demoEvents) {
      const existing = await Event.findOne({ title: eventData.title });

      if (!existing) {
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
        console.log(`[Seed] Created event "${createdEvent.title}" [${createdEvent.category}] with 40 seats`);
      }
    }

    // Ensure every existing event has a valid slug and categorySlug
    const allDbEvents = await Event.find({});
    for (const ev of allDbEvents) {
      let changed = false;
      if (!ev.categorySlug) {
        ev.categorySlug = slugify(ev.category || 'Other') || 'other';
        changed = true;
      }
      if (!ev.slug) {
        ev.slug = await generateUniqueEventSlug(Event, ev.title, ev._id);
        changed = true;
      }
      if (changed) {
        await ev.save();
        console.log(`[Seed] Generated readable slug for "${ev.title}": /${ev.categorySlug}/${ev.slug}`);
      }
    }

    // Ensure all events have Group Booking enabled with 10% discount for 10+ tickets
    await Event.updateMany(
      {
        $or: [
          { isGroupBookingEnabled: { $exists: false } },
          { groupMinSeats: { $exists: false } },
          { groupDiscountPercentage: { $exists: false } }
        ]
      },
      {
        $set: {
          isGroupBookingEnabled: true,
          groupMinSeats: 10,
          groupDiscountPercentage: 10
        }
      }
    );

    // Ensure Booking collection indexes are healthy (holdId_1 with partialFilterExpression)
    try {
      const bookingCollection = mongoose.connection.db.collection('bookings');
      const bIndexes = await bookingCollection.indexes();
      const faultyHoldIndex = bIndexes.find(i => i.name === 'holdId_1' && !i.partialFilterExpression);
      if (faultyHoldIndex) {
        await bookingCollection.dropIndex('holdId_1');
        await bookingCollection.createIndex(
          { holdId: 1 },
          {
            name: 'holdId_1',
            unique: true,
            partialFilterExpression: { holdId: { $type: 'objectId' } },
            background: true
          }
        );
        console.log('[Seed] Rebuilt holdId_1 index with partialFilterExpression');
      }
    } catch (idxErr) {
      console.warn('[Seed Index Warning]:', idxErr.message);
    }

    // Seed primary administrator user (anuragcharan975@gmail.com)
    const primaryAdminEmail = 'anuragcharan975@gmail.com';
    const primaryAdminPassHash = await bcrypt.hash('Anu@2000', 10);
    const existingPrimaryAdmin = await User.findOne({ email: primaryAdminEmail });
    if (!existingPrimaryAdmin) {
      await User.create({
        name: 'Anurag Charan',
        email: primaryAdminEmail,
        passwordHash: primaryAdminPassHash,
        role: 'admin'
      });
      console.log(`[Seed] Created admin account: ${primaryAdminEmail}`);
    } else {
      existingPrimaryAdmin.role = 'admin';
      existingPrimaryAdmin.passwordHash = primaryAdminPassHash;
      await existingPrimaryAdmin.save();
      console.log(`[Seed] Verified admin account: ${primaryAdminEmail}`);
    }

    // Seed default administrator user if missing
    const adminEmail = 'admin909@gmail.com';
    const adminPasswordHash = await bcrypt.hash('ADMIN90@9', 10);
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: 'Administrator',
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: 'admin'
      });
      console.log(`[Seed] Created admin account: ${adminEmail}`);
    } else {
      existingAdmin.role = 'admin';
      existingAdmin.passwordHash = adminPasswordHash;
      await existingAdmin.save();
      console.log(`[Seed] Verified admin account: ${adminEmail}`);
    }

    // Ensure all admin and team accounts carry role 'admin'
    await User.updateMany(
      {
        $or: [
          { email: 'admin909@gmail.com' },
          { email: 'admin@shopnest.com' },
          { email: /^admin/i },
          { email: /anurag/i }
        ]
      },
      { $set: { role: 'admin' } }
    );

    console.log('[Seed] Event category catalog, SEO slugs, and images synchronized.');
  } catch (seedErr) {
    console.error('[Seed Error] Failed to seed/synchronize demonstration data:', seedErr.message);
  }
};

const { syncCompletedEvents } = require('./services/eventLifecycleService');

const startServer = async () => {
  try {
    await connectDB();
    await seedInitialDataIfNeeded();
    await syncCompletedEvents();

    // Periodically sync completed events every 30 seconds
    setInterval(syncCompletedEvents, 30 * 1000);

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

