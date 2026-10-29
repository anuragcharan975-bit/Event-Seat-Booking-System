const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Event = require('../models/Event');
const Review = require('../models/Review');

const REVIEWS_DATA = [
  // ==========================================
  // --- Couple-Related Event Reviews ---
  // ==========================================
  {
    eventSlug: 'indie-rock-and-jazz-fest-live',
    userName: 'Rohan Mehta',
    userEmail: 'rohan.mehta@example.com',
    rating: 5,
    comment: 'Booked this with the 40% Couple Ticket offer for our anniversary date night. The acoustic music and candlelit ambiance were mesmerizing! The seat reservation held our seats perfectly while we paid.'
  },
  {
    eventSlug: 'indie-rock-and-jazz-fest-live',
    userName: 'Sneha Roy',
    userEmail: 'sneha.roy@example.com',
    rating: 5,
    comment: 'Super romantic evening! Getting the couple pass was very smooth. The gate staff checked our ticket and QR code in seconds. We loved the jazz band performance.'
  },
  {
    eventSlug: 'international-salsa-and-bachata-night',
    userName: 'Kabir Malhotra',
    userEmail: 'kabir.malhotra@example.com',
    rating: 5,
    comment: "The best date night experience we've had in a long time! We booked the couple pass and saved 40%. The dance instructors were so welcoming and the vibe was energetic and romantic."
  },
  {
    eventSlug: 'international-salsa-and-bachata-night',
    userName: 'Ananya Sen',
    userEmail: 'ananya.sen@example.com',
    rating: 4,
    comment: 'Loved the salsa workshops and the couple dance floor. The romantic theme on the booking page was so cute! Just make sure both boy and girl arrive together at the gate as required.'
  },
  {
    eventSlug: 'contemporary-ballet-and-fusion-gala',
    userName: 'Divya & Arjun',
    userEmail: 'divya.arjun@example.com',
    rating: 5,
    comment: 'A truly graceful and magical performance! Sitting together in the center tier gave us an unobstructed view. Couple pass discount made it super affordable for a premium ballet show.'
  },
  {
    eventSlug: 'contemporary-ballet-and-fusion-gala',
    userName: 'Siddharth Nair',
    userEmail: 'siddharth.nair@example.com',
    rating: 5,
    comment: 'Took my partner here for her birthday. The choreography and orchestral music gave us goosebumps. Booking through SeatSpot was completely stress-free with the 120s timer.'
  },
  {
    eventSlug: 'serenity-luxury-spa-and-wellness-retreat',
    userName: 'Priya Sharma',
    userEmail: 'priya.sharma@example.com',
    rating: 5,
    comment: 'The couple spa package was pure bliss. Warm herbal therapy, peaceful zen music, and great hospitality. We both felt completely rejuvenated after a hectic week.'
  },
  {
    eventSlug: 'serenity-luxury-spa-and-wellness-retreat',
    userName: 'Kunal Verma',
    userEmail: 'kunal.verma@example.com',
    rating: 4,
    comment: 'Very relaxing ambiance. The couple session was private and very well arranged. Great value with the promotional couple discount.'
  },
  {
    eventSlug: 'symphony-under-the-stars-orchestra',
    userName: 'Meera Joshi',
    userEmail: 'meera.joshi@example.com',
    rating: 5,
    comment: 'An unforgettable evening under the open night sky. The violins and cello concert were breathtaking. Perfect romantic outing for couples!'
  },
  {
    eventSlug: 'the-phantom-drama-showcase',
    userName: 'Naveen & Shalini',
    userEmail: 'naveen.shalini@example.com',
    rating: 5,
    comment: 'Outstanding theatre performance and stage lighting. We thoroughly enjoyed our evening together. The couple pass discount is an amazing deal.'
  },

  // ==========================================
  // --- Normal / General Event Reviews ---
  // ==========================================
  {
    eventSlug: 'tech-innovators-summit-2026',
    userName: 'Amit Patel',
    userEmail: 'amit.patel@example.com',
    rating: 5,
    comment: 'The keynote on distributed systems and AI architecture was top tier! Excellent networking opportunities and well-organized breakout sessions. Highly recommended.'
  },
  {
    eventSlug: 'tech-innovators-summit-2026',
    userName: 'Neha Kulkarni',
    userEmail: 'neha.kulkarni@example.com',
    rating: 4,
    comment: 'Great speakers and insightful panel discussions on modern cloud stacks. The venue acoustics were crisp and entry via QR pass was instant.'
  },
  {
    eventSlug: 'full-stack-architecture-and-cloud-workshop',
    userName: 'Rahul Deshmukh',
    userEmail: 'rahul.deshmukh@example.com',
    rating: 5,
    comment: 'Hands-on masterclass with deep insights into database concurrency and transaction isolation. The practical coding demos were worth every rupee.'
  },
  {
    eventSlug: 'stand-up-comedy-all-stars-special',
    userName: 'Vikrant Saxena',
    userEmail: 'vikrant.saxena@example.com',
    rating: 5,
    comment: 'Laughed non-stop for two straight hours! The lineup of comics was phenomenal and the crowd interactions were hilarious. Will definitely come back for the next edition.'
  },
  {
    eventSlug: 'stand-up-comedy-all-stars-special',
    userName: 'Pooja Batra',
    userEmail: 'pooja.batra@example.com',
    rating: 4,
    comment: 'Super funny sets and great improv moments. Seating arrangement was spacious and comfortable. Booking our group tickets was quick.'
  },
  {
    eventSlug: 'formula-1-grand-prix-and-supercar-showcase-2026',
    userName: 'Karan Singhania',
    userEmail: 'karan.singhania@example.com',
    rating: 5,
    comment: 'The roaring V8 and V10 engines gave me chills! Up-close access to rare hypercars and pit stop demonstrations was phenomenal. A dream day for any car enthusiast.'
  },
  {
    eventSlug: 'formula-1-grand-prix-and-supercar-showcase-2026',
    userName: 'Aryan Mehta',
    userEmail: 'aryan.mehta@example.com',
    rating: 5,
    comment: 'Incredible automotive expo. The drift show in the afternoon was electrifying. Getting our tickets and scanning at the gate took under 10 seconds.'
  },
  {
    eventSlug: 'pubg-battlegrounds-india-championship-2026',
    userName: 'Devansh Gupta',
    userEmail: 'devansh.gupta@example.com',
    rating: 5,
    comment: 'The atmosphere inside the esports arena was electric! Watching the top squads battle live on the giant screens with high-energy casters was unreal.'
  },
  {
    eventSlug: 'national-badminton-championship-finals',
    userName: 'Ritu Phogat',
    userEmail: 'ritu.phogat@example.com',
    rating: 5,
    comment: "Intense 3-set thriller in the men's singles final! Great court views from the east stand. Excellent venue management and seamless ticket check-in."
  },
  {
    eventSlug: 'artisan-coffee-and-culinary-world-expo',
    userName: 'Tanvi Kapoor',
    userEmail: 'tanvi.kapoor@example.com',
    rating: 5,
    comment: 'Heaven for coffee lovers! Tasting specialty roasts from around the world and attending barista latte art demos was such a fun experience.'
  }
];

async function seedReviews() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully.');

    const defaultPasswordHash = await bcrypt.hash('User@123', 10);
    const affectedEventIds = new Set();
    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of REVIEWS_DATA) {
      // 1. Find or create User
      let user = await User.findOne({ email: item.userEmail.toLowerCase() });
      if (!user) {
        user = await User.create({
          name: item.userName,
          email: item.userEmail.toLowerCase(),
          passwordHash: defaultPasswordHash,
          role: 'user'
        });
        console.log(`Created user: ${user.name} (${user.email})`);
      }

      // 2. Find Event
      const event = await Event.findOne({
        $or: [
          { slug: item.eventSlug },
          { slug: item.eventSlug.toLowerCase().trim() }
        ]
      });

      if (!event) {
        console.warn(`Event not found for slug: ${item.eventSlug}, skipping.`);
        continue;
      }

      affectedEventIds.add(event._id.toString());

      // 3. Insert or update review (one per user per event)
      const existing = await Review.findOne({ eventId: event._id, userId: user._id });
      if (existing) {
        existing.userName = item.userName;
        existing.userEmail = item.userEmail;
        existing.rating = item.rating;
        existing.comment = item.comment;
        await existing.save();
        updatedCount++;
        console.log(`Updated review for "${event.title}" by ${user.name}`);
      } else {
        await Review.create({
          eventId: event._id,
          userId: user._id,
          userName: item.userName,
          userEmail: item.userEmail,
          rating: item.rating,
          comment: item.comment
        });
        insertedCount++;
        console.log(`Added review for "${event.title}" by ${user.name} (${item.rating} stars)`);
      }
    }

    // 4. Recalculate average rating & total reviews on all affected events
    console.log('\nRecalculating ratings for affected events...');
    for (const eventId of affectedEventIds) {
      await Review.calculateAverageRating(eventId);
      const ev = await Event.findById(eventId).select('title averageRating totalReviews');
      console.log(`★ "${ev.title}": Rating = ${ev.averageRating} (${ev.totalReviews} reviews)`);
    }

    console.log(`\nReview Seeding Complete!`);
    console.log(`Total Inserted: ${insertedCount}`);
    console.log(`Total Updated: ${updatedCount}`);
    console.log(`Total Events Updated: ${affectedEventIds.size}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedReviews();
