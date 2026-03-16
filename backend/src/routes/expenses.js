
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(requireAuth);

/**
 * Helper: Verify trip belongs to user
 */
async function verifyTripOwnership(tripId, userId) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId }
  });
  return trip;
}

/**
 * GET /api/expenses/trip/:tripId
 * Get all expenses for a specific trip
 */
router.get('/trip/:tripId', async (req, res) => {
  try {
    const trip = await verifyTripOwnership(req.params.tripId, req.user.id);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const expenses = await prisma.expense.findMany({
      where: { tripId: req.params.tripId },
      orderBy: { date: 'desc' }
    });

    res.json(expenses.map(exp => ({
      ...exp,
      amount: parseFloat(exp.amount)
    })));
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

/**
 * GET /api/expenses/:id
 * Get a single expense
 */
router.get('/:id', async (req, res) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: { id: req.params.id },
      include: { trip: true }
    });

    if (!expense || expense.trip.userId !== req.user.id) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({
      ...expense,
      amount: parseFloat(expense.amount)
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

/**
 * POST /api/expenses
 * Create a new expense
 */
router.post('/', async (req, res) => {
  try {
    const { 
      tripId, amount, currency, category, date, 
      description, paymentMethod, location, 
      isSplit, splitCategories 
    } = req.body;

    // Validation
    if (!tripId || !amount || !currency || !date) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tripId', 'amount', 'currency', 'date']
      });
    }

    // Verify trip ownership
    const trip = await verifyTripOwnership(tripId, req.user.id);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const expense = await prisma.expense.create({
      data: {
        tripId,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        category: category || null,
        date: new Date(date),
        description: description || null,
        paymentMethod: paymentMethod || null,
        location: location || null,
        isSplit: isSplit || false,
        splitCategories: splitCategories || null
      }
    });

    console.log(`✅ Expense created: ${expense.amount} ${expense.currency}`);
    res.status(201).json({
      ...expense,
      amount: parseFloat(expense.amount)
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

/**
 * PUT /api/expenses/:id
 * Update an existing expense
 */
router.put('/:id', async (req, res) => {
  try {
    // Verify ownership through trip
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id },
      include: { trip: true }
    });

    if (!existing || existing.trip.userId !== req.user.id) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const { 
      amount, currency, category, date, 
      description, paymentMethod, location, 
      isSplit, splitCategories 
    } = req.body;

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(currency && { currency: currency.toUpperCase() }),
        ...(category !== undefined && { category }),
        ...(date && { date: new Date(date) }),
        ...(description !== undefined && { description }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(location !== undefined && { location }),
        ...(typeof isSplit === 'boolean' && { isSplit }),
        ...(splitCategories !== undefined && { splitCategories })
      }
    });

    res.json({
      ...expense,
      amount: parseFloat(expense.amount)
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

/**
 * DELETE /api/expenses/:id
 * Delete an expense
 */
router.delete('/:id', async (req, res) => {
  try {
    // Verify ownership through trip
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id },
      include: { trip: true }
    });

    if (!existing || existing.trip.userId !== req.user.id) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await prisma.expense.delete({
      where: { id: req.params.id }
    });

    console.log(`🗑️ Expense deleted: ${existing.amount} ${existing.currency}`);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;