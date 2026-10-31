import express from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/joined-events - Protected (Join Event)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId || !ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid eventId is required.',
      });
    }

    const db = getDB();
    const eventsCollection = db.collection('events');
    const joinedCollection = db.collection('joined_events');

    // Find the target event
    const event = await eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'The requested event does not exist.',
      });
    }

    const userEmail = req.user.email.toLowerCase().trim();

    // Check if user already joined
    const alreadyJoined = await joinedCollection.findOne({
      eventId: eventId,
      userEmail: userEmail,
    });

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this event.',
      });
    }

    const joinedRecord = {
      eventId: eventId,
      eventTitle: event.title,
      eventDate: event.eventDate,
      eventLocation: event.location,
      eventThumbnail: event.thumbnail,
      eventType: event.eventType,
      userEmail: userEmail,
      userName: req.user.name || 'Volunteer',
      userPhoto:
        req.user.photoURL ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      joinedAt: new Date().toISOString(),
    };

    const result = await joinedCollection.insertOne(joinedRecord);
    joinedRecord._id = result.insertedId;
    joinedRecord.id = result.insertedId.toString();

    const totalJoined = await joinedCollection.countDocuments({
      eventId: eventId,
    });

    return res.status(201).json({
      success: true,
      message: 'You have successfully joined this event! Thank you for making a difference.',
      joinedRecord,
      totalJoined,
    });
  } catch (error) {
    console.error('[Join Event Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to join event due to server error.',
    });
  }
});

// GET /api/joined-events/my-joined - Protected (Joined Events Page)
// Shows all events joined by current user, sorted by eventDate
router.get('/my-joined', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const joinedCollection = db.collection('joined_events');

    const userEmail = req.user.email.toLowerCase().trim();

    // Sorted by eventDate ascending
    const joinedEvents = await joinedCollection
      .find({ userEmail })
      .sort({ eventDate: 1 })
      .toArray();

    const formattedEvents = joinedEvents.map((item) => ({
      ...item,
      id: item._id.toString(),
    }));

    return res.status(200).json({
      success: true,
      count: formattedEvents.length,
      joinedEvents: formattedEvents,
    });
  } catch (error) {
    console.error('[Get My Joined Events Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch joined events.',
    });
  }
});

// GET /api/joined-events/check/:eventId - Protected
router.get('/check/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const db = getDB();
    const joinedCollection = db.collection('joined_events');

    const userEmail = req.user.email.toLowerCase().trim();

    const record = await joinedCollection.findOne({
      eventId: eventId,
      userEmail: userEmail,
    });

    return res.status(200).json({
      success: true,
      hasJoined: !!record,
      joinId: record ? record._id.toString() : null,
    });
  } catch (error) {
    console.error('[Check Join Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check join status.',
    });
  }
});

// DELETE /api/joined-events/:id - Protected (Cancel RSVP / Leave Event)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid join record identifier.',
      });
    }

    const db = getDB();
    const joinedCollection = db.collection('joined_events');

    const userEmail = req.user.email.toLowerCase().trim();

    // Find record by _id or by eventId for this user
    const record = await joinedCollection.findOne({
      $or: [
        { _id: new ObjectId(id), userEmail },
        { eventId: id, userEmail },
      ],
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Joined event record not found or not owned by you.',
      });
    }

    await joinedCollection.deleteOne({ _id: record._id });

    return res.status(200).json({
      success: true,
      message: 'You have left the event.',
      eventId: record.eventId,
    });
  } catch (error) {
    console.error('[Cancel RSVP Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel RSVP.',
    });
  }
});

export default router;
