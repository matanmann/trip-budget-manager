import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Helper: get member role for current user on a trip
async function getMemberRole(tripId, userId) {
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } }
  });
  return member?.role || null;
}

// Helper: format trip for response
function formatTrip(trip, userId) {
  const member = trip.members?.find(m => m.userId === userId);
  return {
    id: trip.id,
    name: trip.name,
    destinations: trip.destinations,
    startDate: trip.startDate,
    endDate: trip.endDate,
    totalBudget: parseFloat(trip.totalBudget),
    currency: trip.currency,
    isActive: trip.isActive,
    spent: trip.expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0,
    categoryBudgets: trip.categoryBudgets || {},
    travelers: trip.travelers || 1,
    role: member?.role || 'owner',
    members: trip.members?.map(m => ({
      id: m.userId,
      name: m.user?.name,
      picture: m.user?.picture,
      email: m.user?.email,
      role: m.role,
      joinedAt: m.joinedAt,
    })) || [],
    createdAt: trip.createdAt,
  };
}

/**
 * GET /api/trips
 * Get all trips where user is owner OR collaborator
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const memberships = await prisma.tripMember.findMany({
      where: { userId: req.user.id },
      include: {
        trip: {
          include: {
            expenses: { select: { amount: true } },
            members: { include: { user: { select: { id: true, name: true, picture: true, email: true } } } }
          }
        }
      },
      orderBy: { trip: { createdAt: 'desc' } }
    });

    const trips = memberships.map(m => formatTrip(m.trip, req.user.id));
    res.json(trips);
  } catch (err) {
    console.error('Get trips error:', err);
    res.status(500).json({ error: 'Failed to get trips' });
  }
});

/**
 * GET /api/trips/:id
 * Get a single trip (must be a member)
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const role = await getMemberRole(req.params.id, req.user.id);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        expenses: { select: { amount: true } },
        members: { include: { user: { select: { id: true, name: true, picture: true, email: true } } } }
      }
    });

    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(formatTrip(trip, req.user.id));
  } catch (err) {
    console.error('Get trip error:', err);
    res.status(500).json({ error: 'Failed to get trip' });
  }
});

/**
 * POST /api/trips
 * Create a new trip (creator becomes owner)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, destinations, startDate, endDate, totalBudget, currency, categoryBudgets, travelers } = req.body;

    if (!name || !startDate || !endDate || !totalBudget || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const trip = await prisma.trip.create({
      data: {
        userId: req.user.id,
        name,
        destinations: destinations || [],
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalBudget,
        currency,
        categoryBudgets: categoryBudgets || {},
        travelers: travelers || 1,
        members: {
          create: { userId: req.user.id, role: 'owner' }
        }
      },
      include: {
        expenses: { select: { amount: true } },
        members: { include: { user: { select: { id: true, name: true, picture: true, email: true } } } }
      }
    });

    res.status(201).json(formatTrip(trip, req.user.id));
  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

/**
 * PUT /api/trips/:id
 * Update a trip (owner only)
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const role = await getMemberRole(req.params.id, req.user.id);
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can edit trip details' });

    const { name, destinations, startDate, endDate, totalBudget, currency, categoryBudgets, travelers } = req.body;

    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        name, destinations,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalBudget, currency,
        categoryBudgets: categoryBudgets || {},
        travelers: travelers || 1,
      },
      include: {
        expenses: { select: { amount: true } },
        members: { include: { user: { select: { id: true, name: true, picture: true, email: true } } } }
      }
    });

    res.json(formatTrip(trip, req.user.id));
  } catch (err) {
    console.error('Update trip error:', err);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete a trip (owner only)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const role = await getMemberRole(req.params.id, req.user.id);
    if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can delete a trip' });

    await prisma.trip.delete({ where: { id: req.params.id } });
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    console.error('Delete trip error:', err);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

/**
 * POST /api/trips/:id/activate
 * Set a trip as active for current user
 */
router.post('/:id/activate', requireAuth, async (req, res) => {
  try {
    const role = await getMemberRole(req.params.id, req.user.id);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    // Deactivate all user's trips
    await prisma.trip.updateMany({
      where: { userId: req.user.id },
      data: { isActive: false }
    });

    await prisma.trip.update({
      where: { id: req.params.id },
      data: { isActive: true }
    });

    res.json({ message: 'Trip activated' });
  } catch (err) {
    console.error('Activate trip error:', err);
    res.status(500).json({ error: 'Failed to activate trip' });
  }
});

export default router;
