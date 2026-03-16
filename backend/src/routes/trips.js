
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/trips
 * Get all trips for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { userId: req.user.id },
      include: {
        _count: { select: { expenses: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate spent amount for each trip
    const tripsWithStats = await Promise.all(
      trips.map(async (trip) => {
        const expenses = await prisma.expense.aggregate({
          where: { tripId: trip.id },
          _sum: { amount: true }
        });
        
        return {
          ...trip,
          totalBudget: parseFloat(trip.totalBudget),
          spent: parseFloat(expenses._sum.amount || 0),
          expenseCount: trip._count.expenses
        };
      })
    );

    res.json(tripsWithStats);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

/**
 * GET /api/trips/:id
 * Get a single trip with all expenses
 */
router.get('/:id', async (req, res) => {
  try {
    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: {
        expenses: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Calculate totals
    const spent = trip.expenses.reduce(
      (sum, exp) => sum + parseFloat(exp.amount), 
      0
    );

    res.json({
      ...trip,
      totalBudget: parseFloat(trip.totalBudget),
      spent,
      expenses: trip.expenses.map(exp => ({
        ...exp,
        amount: parseFloat(exp.amount)
      }))
    });
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

/**
 * POST /api/trips
 * Create a new trip
 */
router.post('/', async (req, res) => {
  try {
    const { name, destinations, startDate, endDate, totalBudget, currency } = req.body;

    // Validation
    if (!name || !startDate || !endDate || !totalBudget || !currency) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'startDate', 'endDate', 'totalBudget', 'currency']
      });
    }

    const trip = await prisma.trip.create({
      data: {
        userId: req.user.id,
        name,
        destinations: destinations || [],
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalBudget: parseFloat(totalBudget),
        currency: currency.toUpperCase(),
        isActive: true
      }
    });

    // Deactivate other trips
    await prisma.trip.updateMany({
      where: {
        userId: req.user.id,
        id: { not: trip.id }
      },
      data: { isActive: false }
    });

    console.log(`✅ Trip created: ${trip.name} by ${req.user.email}`);
    res.status(201).json({
      ...trip,
      totalBudget: parseFloat(trip.totalBudget),
      spent: 0,
      expenseCount: 0
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

/**
 * PUT /api/trips/:id
 * Update an existing trip
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, destinations, startDate, endDate, totalBudget, currency, isActive } = req.body;

    // Verify ownership
    const existing = await prisma.trip.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // If setting this trip as active, deactivate others
    if (isActive) {
      await prisma.trip.updateMany({
        where: {
          userId: req.user.id,
          id: { not: req.params.id }
        },
        data: { isActive: false }
      });
    }

    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(destinations && { destinations }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(totalBudget && { totalBudget: parseFloat(totalBudget) }),
        ...(currency && { currency: currency.toUpperCase() }),
        ...(typeof isActive === 'boolean' && { isActive })
      }
    });

    res.json({
      ...trip,
      totalBudget: parseFloat(trip.totalBudget)
    });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete a trip and all its expenses
 */
router.delete('/:id', async (req, res) => {
  try {
    // Verify ownership
    const existing = await prisma.trip.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    await prisma.trip.delete({
      where: { id: req.params.id }
    });

    console.log(`🗑️ Trip deleted: ${existing.name} by ${req.user.email}`);
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

/**
 * POST /api/trips/:id/activate
 * Set a trip as the active trip
 */
router.post('/:id/activate', async (req, res) => {
  try {
    // Verify ownership
    const existing = await prisma.trip.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Deactivate all trips
    await prisma.trip.updateMany({
      where: { userId: req.user.id },
      data: { isActive: false }
    });

    // Activate this trip
    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: { isActive: true }
    });

    res.json({
      ...trip,
      totalBudget: parseFloat(trip.totalBudget)
    });
  } catch (error) {
    console.error('Error activating trip:', error);
    res.status(500).json({ error: 'Failed to activate trip' });
  }
});

export default router;