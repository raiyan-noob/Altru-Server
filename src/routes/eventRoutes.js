import express from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if date is in the future
function isFutureDate(dateString) {
  const eventDate = new Date(dateString);
  const now = new Date();
  return !isNaN(eventDate.getTime()) && eventDate >= now;
}

// GET /api/events - Public
// Supports: ?upcoming=true, ?limit=6, ?search=..., ?type=..., ?sort=date
router.get('/', async (req, res) => {
  try {
    const { upcoming, limit, search, type, sort } = req.query;
    const db = getDB();
    const eventsCollection = db.collection('events');
    const joinedCollection = db.collection('joined_events');

    const filter = {};

    // Filter upcoming events only (past dates excluded)
    if (upcoming === 'true' || upcoming === true) {
      const nowIso = new Date().toISOString();
      // Match ISO date string or date part
      const todayDate = new Date().toISOString().split('T')[0];
      filter.$or = [
        { eventDate: { $gte: nowIso } },
        { eventDate: { $gte: todayDate } },
      ];
    }

    // Category / Event Type filter
    if (type && type !== 'All') {
      filter.eventType = { $regex: new RegExp(`^${type}$`, 'i') };
    }

    // Search filter across title or location
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ title: searchRegex }, { location: searchRegex }],
      });
    }

    let query = eventsCollection.find(filter);

    // Sort by eventDate ascending (earliest upcoming event first)
    query = query.sort({ eventDate: 1 });

    // Limit (e.g. limit=6 using MongoDB .limit())
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    const events = await query.toArray();

    // Attach attendee counts to each event
    const eventsWithCounts = await Promise.all(
      events.map(async (ev) => {
        const joinedCount = await joinedCollection.countDocuments({
          eventId: ev._id.toString(),
        });
        return {
          ...ev,
          id: ev._id.toString(),
          joinedCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: eventsWithCounts.length,
      events: eventsWithCounts,
    });
  } catch (error) {
    console.error('[Get Events Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve events.',
    });
  }
});

// GET /api/events/user/my-events - Protected (must be defined BEFORE /:id)
router.get('/user/my-events', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const eventsCollection = db.collection('events');
    const joinedCollection = db.collection('joined_events');

    const userEmail = req.user.email.toLowerCase();

    const myEvents = await eventsCollection
      .find({ userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    const eventsWithCounts = await Promise.all(
      myEvents.map(async (ev) => {
        const joinedCount = await joinedCollection.countDocuments({
          eventId: ev._id.toString(),
        });
        return {
          ...ev,
          id: ev._id.toString(),
          joinedCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: eventsWithCounts.length,
      events: eventsWithCounts,
    });
  } catch (error) {
    console.error('[Get My Events Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your created events.',
    });
  }
});

// GET /api/events/:id - Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event identifier.',
      });
    }

    const db = getDB();
    const eventsCollection = db.collection('events');
    const joinedCollection = db.collection('joined_events');

    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    const joinedCount = await joinedCollection.countDocuments({
      eventId: id,
    });

    // Recent attendees
    const attendees = await joinedCollection
      .find({ eventId: id })
      .project({ userName: 1, userPhoto: 1, userEmail: 1, joinedAt: 1 })
      .limit(10)
      .toArray();

    return res.status(200).json({
      success: true,
      event: {
        ...event,
        id: event._id.toString(),
        joinedCount,
        attendees,
      },
    });
  } catch (error) {
    console.error('[Get Event By ID Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve event details.',
    });
  }
});

// POST /api/events - Protected (Create Event)
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      thumbnail,
      location,
      eventDate,
      expectedAttendees,
    } = req.body;

    // Validation
    if (!title || !description || !eventType || !location || !eventDate) {
      return res.status(400).json({
        success: false,
        message:
          'Title, description, event type, location, and event date are required.',
      });
    }

    // Past date validation: Ensure no past date can be added
    if (!isFutureDate(eventDate)) {
      return res.status(400).json({
        success: false,
        message: 'Event date must be in the future. Past dates cannot be added.',
      });
    }

    const db = getDB();
    const eventsCollection = db.collection('events');

    const newEvent = {
      title: title.trim(),
      description: description.trim(),
      eventType: eventType.trim(),
      thumbnail:
        thumbnail?.trim() ||
        'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80',
      location: location.trim(),
      eventDate,
      expectedAttendees: Number(expectedAttendees) || 50,
      userEmail: req.user.email.toLowerCase().trim(),
      userName: req.user.name || 'Community Leader',
      userPhoto:
        req.user.photoURL ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await eventsCollection.insertOne(newEvent);
    newEvent._id = result.insertedId;
    newEvent.id = result.insertedId.toString();

    return res.status(201).json({
      success: true,
      message: 'Event created successfully!',
      event: newEvent,
    });
  } catch (error) {
    console.error('[Create Event Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create event due to server error.',
    });
  }
});

// PUT /api/events/:id - Protected (Update Event)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event identifier.',
      });
    }

    const db = getDB();
    const eventsCollection = db.collection('events');
    const joinedCollection = db.collection('joined_events');

    const existingEvent = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // Strict Authorization: User can only update their own created event
    if (existingEvent.userEmail !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only update your own events.',
      });
    }

    const {
      title,
      description,
      eventType,
      thumbnail,
      location,
      eventDate,
      expectedAttendees,
    } = req.body;

    const updateDoc = {
      $set: {
        updatedAt: new Date().toISOString(),
      },
    };

    if (title?.trim()) updateDoc.$set.title = title.trim();
    if (description?.trim()) updateDoc.$set.description = description.trim();
    if (eventType?.trim()) updateDoc.$set.eventType = eventType.trim();
    if (thumbnail?.trim()) updateDoc.$set.thumbnail = thumbnail.trim();
    if (location?.trim()) updateDoc.$set.location = location.trim();
    if (expectedAttendees !== undefined) {
      updateDoc.$set.expectedAttendees = Number(expectedAttendees);
    }

    if (eventDate) {
      if (!isFutureDate(eventDate)) {
        return res.status(400).json({
          success: false,
          message:
            'Event date must be in the future. Past dates cannot be added.',
        });
      }
      updateDoc.$set.eventDate = eventDate;
    }

    const result = await eventsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      updateDoc,
      { returnDocument: 'after' }
    );

    // Also update joined events if title, location, thumbnail, or date changed
    if (title || location || thumbnail || eventDate || eventType) {
      const syncUpdate = {};
      if (title) syncUpdate.eventTitle = title.trim();
      if (location) syncUpdate.eventLocation = location.trim();
      if (thumbnail) syncUpdate.eventThumbnail = thumbnail.trim();
      if (eventDate) syncUpdate.eventDate = eventDate;
      if (eventType) syncUpdate.eventType = eventType.trim();

      await joinedCollection.updateMany(
        { eventId: id },
        { $set: syncUpdate }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully!',
      event: {
        ...result,
        id: result._id.toString(),
      },
    });
  } catch (error) {
    console.error('[Update Event Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update event.',
    });
  }
});

// DELETE /api/events/:id - Protected (Delete Event)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event identifier.',
      });
    }

    const db = getDB();
    const eventsCollection = db.collection('events');
    const joinedCollection = db.collection('joined_events');

    const existingEvent = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // Strict Authorization: User can only delete their own created event
    if (existingEvent.userEmail !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only delete your own events.',
      });
    }

    // Delete event
    await eventsCollection.deleteOne({ _id: new ObjectId(id) });

    // Clean up associated join records
    await joinedCollection.deleteMany({ eventId: id });

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully!',
    });
  } catch (error) {
    console.error('[Delete Event Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete event.',
    });
  }
});

export default router;
