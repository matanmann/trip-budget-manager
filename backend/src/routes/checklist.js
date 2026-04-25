import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.get('/:tripId', requireAuth, async (req, res) => {
  const { tripId } = req.params;
  try {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: req.user.id },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const items = await prisma.checklistItem.findMany({
      where: { tripId },
      orderBy: [{ isUrgent: 'desc' }, { createdAt: 'asc' }],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:tripId/bulk', requireAuth, async (req, res) => {
  const { tripId } = req.params;
  const { items } = req.body;
  try {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: req.user.id },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    await prisma.checklistItem.deleteMany({
      where: { tripId, notes: { not: 'manual' } },
    });

    const created = await prisma.checklistItem.createMany({
      data: items.map((item) => ({
        tripId,
        text: item.text,
        category: item.category || 'General',
        isUrgent: item.isUrgent || false,
        notes: item.notes || null,
      })),
    });
    res.json({ count: created.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:itemId', requireAuth, async (req, res) => {
  const { itemId } = req.params;
  const { isDone, text, notes } = req.body;
  try {
    const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Not found' });

    const trip = await prisma.trip.findFirst({
      where: { id: item.tripId, userId: req.user.id },
    });
    if (!trip) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(isDone !== undefined && { isDone, doneAt: isDone ? new Date() : null }),
        ...(text !== undefined && { text }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:itemId', requireAuth, async (req, res) => {
  const { itemId } = req.params;
  try {
    const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Not found' });

    const trip = await prisma.trip.findFirst({
      where: { id: item.tripId, userId: req.user.id },
    });
    if (!trip) return res.status(403).json({ error: 'Forbidden' });

    await prisma.checklistItem.delete({ where: { id: itemId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
