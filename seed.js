import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'altru_db';

const seedEvents = [
  {
    title: 'Winter Clothes Distribution for Underprivileged Families',
    description: 'Join hands with local community volunteers to distribute warm jackets, sweaters, woolen caps, and thermal wear to over 500 low-income families and street dwellers in Mirpur 10. We will organize sorting, packing, and respectful door-to-door distribution.',
    eventType: 'Donation',
    thumbnail: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80',
    location: 'Mirpur 10 Community Center Grounds, Dhaka',
    eventDate: '2026-11-15T09:00:00.000Z',
    expectedAttendees: 60,
    userEmail: 'organizer.tanvir@gmail.com',
    userName: 'Tanvir Hossain',
    userPhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Emergency Blanket Distribution for the Needy',
    description: 'As winter winds sweep through the capital, hundreds of rickshaw pullers and pavement dwellers spend freezing nights without shelter. Altru volunteers will distribute heavy-duty fleece blankets and hot soup packs across Mohammadpur town hall and surrounding areas.',
    eventType: 'Donation',
    thumbnail: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80',
    location: 'Mohammadpur Town Hall Area, Dhaka',
    eventDate: '2026-11-20T21:00:00.000Z',
    expectedAttendees: 45,
    userEmail: 'nusrat.social@altru.org',
    userName: 'Nusrat Jahan',
    userPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Dhanmondi Lake Clean & Green Community Drive',
    description: 'Help restore the natural beauty of Dhanmondi Lake! Volunteers will gather to collect plastic waste, clear walking pathways, install eco-friendly trash bins, and conduct on-ground environmental awareness among morning walkers and local food cart vendors.',
    eventType: 'Cleanup',
    thumbnail: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    location: 'Dhanmondi Lake Rabindra Sarobar, Dhaka',
    eventDate: '2026-11-28T07:30:00.000Z',
    expectedAttendees: 80,
    userEmail: 'organizer.tanvir@gmail.com',
    userName: 'Tanvir Hossain',
    userPhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Urban Tree Plantation & Rooftop Greenery Initiative',
    description: 'Let us combat urban heat in Dhaka by planting 1,000 indigenous trees, neem saplings, and fruit-bearing plants across public parks and schools in Ramna and Shahbagh. Gardening gloves, saplings, and organic compost will be provided to all attendees.',
    eventType: 'Plantation',
    thumbnail: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    location: 'Ramna Park Green Belt, Dhaka',
    eventDate: '2026-12-05T08:00:00.000Z',
    expectedAttendees: 100,
    userEmail: 'farhan.nature@gmail.com',
    userName: 'Farhan Kabir',
    userPhoto: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=256&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Free Health Screening & Pediatric Medicine Camp',
    description: 'Providing free doctor consultations, basic diagnostics (blood sugar, blood pressure, ECG), and essential prescription medications for elderly residents and working children in Old Dhaka. Volunteer doctors, nurses, and medical students will lead the camp.',
    eventType: 'Healthcare',
    thumbnail: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    location: 'Armanitola Community Hall, Old Dhaka',
    eventDate: '2026-12-12T09:30:00.000Z',
    expectedAttendees: 50,
    userEmail: 'dr.samira@altru.org',
    userName: 'Dr. Samira Rahman',
    userPhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Hot Meals & Nutrition Drive for Street Children',
    description: 'Providing nutritious hot meals, fresh milk, and fruits to 400 underprivileged street children and orphan youths around Kamalapur Railway Station. Volunteers will help prepare food boxes, distribute drinking water, and spend quality time reading stories with the kids.',
    eventType: 'Food Drive',
    thumbnail: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=800&q=80',
    location: 'Kamalapur Railway Area, Dhaka',
    eventDate: '2026-12-19T12:00:00.000Z',
    expectedAttendees: 40,
    userEmail: 'nusrat.social@altru.org',
    userName: 'Nusrat Jahan',
    userPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Back-to-School Stationery & Backpacks Distribution',
    description: 'Empowering 300 slum school children in Korail with educational backpacks containing notebooks, pens, geometry sets, and storybooks. Our goal is to prevent school dropouts and encourage young minds to dream big and stay enrolled.',
    eventType: 'Education',
    thumbnail: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    location: 'Korail Basti Community Learning Center, Banani, Dhaka',
    eventDate: '2026-12-26T10:00:00.000Z',
    expectedAttendees: 35,
    userEmail: 'organizer.tanvir@gmail.com',
    userName: 'Tanvir Hossain',
    userPhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Emergency Blood Donation & Thalassemia Support Camp',
    description: 'Join Altru and voluntary blood donor clubs to collect 100+ bags of fresh blood for pediatric Thalassemia patients and emergency trauma units at Dhaka Medical College Hospital. Free blood grouping test and certificate provided for all heroic donors.',
    eventType: 'Healthcare',
    thumbnail: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&q=80',
    location: 'TSC Pavilion, University of Dhaka Campus',
    eventDate: '2027-01-08T09:00:00.000Z',
    expectedAttendees: 90,
    userEmail: 'dr.samira@altru.org',
    userName: 'Dr. Samira Rahman',
    userPhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seed() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('[Seed] Seeding database:', dbName);

    // 1. Seed demo users
    const usersCollection = db.collection('users');
    const existingUsers = await usersCollection.countDocuments();
    if (existingUsers === 0) {
      const salt = await bcrypt.genSalt(10);
      const defaultPassword = await bcrypt.hash('AltruVolunteer2026!', salt);

      const demoUsers = [
        {
          name: 'Tanvir Hossain',
          email: 'organizer.tanvir@gmail.com',
          photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
          password: defaultPassword,
          role: 'organizer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          name: 'Nusrat Jahan',
          email: 'nusrat.social@altru.org',
          photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
          password: defaultPassword,
          role: 'organizer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          name: 'Demo Volunteer',
          email: 'volunteer@altru.org',
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
          password: defaultPassword,
          role: 'volunteer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await usersCollection.insertMany(demoUsers);
      console.log(`[Seed] Seeded ${demoUsers.length} initial users.`);
    }

    // 2. Seed events
    const eventsCollection = db.collection('events');
    const existingEvents = await eventsCollection.countDocuments();
    if (existingEvents === 0) {
      await eventsCollection.insertMany(seedEvents);
      console.log(`[Seed] Seeded ${seedEvents.length} upcoming social development events.`);
    } else {
      console.log(`[Seed] Events collection already contains ${existingEvents} events.`);
    }

    console.log('[Seed] Database initialization complete!');
  } catch (error) {
    console.error('[Seed Error]:', error);
  } finally {
    await client.close();
  }
}

seed();
