import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

/**
 * POST /api/invitations/:tripId
 * Generate an invite link for a trip (owner only)
 */
router.post('/:tripId', requireAuth, async (req, res) => {
  try {
    const { tripId } = req.params;

    // Check user is owner of this trip
    const member = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: req.user.id } },
    });

    if (!member || member.role !== 'owner') {
      return res.status(403).json({ error: 'Only the trip owner can create invite links' });
    }

    // Expire any previous unused invitations for this trip
    await prisma.invitation.updateMany({
      where: { tripId, usedAt: null },
      data: { expiresAt: new Date() }, // expire them now
    });

    // Create new invitation (expires in 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await prisma.invitation.create({
      data: { tripId, expiresAt },
    });

    const inviteUrl = `${process.env.FRONTEND_URL}/invite?token=${invitation.token}`;
    res.json({ inviteUrl, expiresAt: invitation.expiresAt });
  } catch (err) {
    console.error('Create invitation error:', err);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

/**
 * GET /api/invitations/:token/preview
 * Get trip info for an invite token (before accepting)
 */
router.get('/:token/preview', requireAuth, async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        trip: {
          select: { id: true, name: true, destinations: true, startDate: true, endDate: true, currency: true, totalBudget: true,
            members: { include: { user: { select: { name: true, picture: true } } } }
          }
        }
      }
    });

    if (!invitation) return res.status(404).json({ error: 'Invite link not found' });
    if (invitation.expiresAt < new Date()) return res.status(410).json({ error: 'Invite link has expired' });
    if (invitation.usedAt) return res.status(410).json({ error: 'Invite link has already been used' });

    // Check if already a member
    const alreadyMember = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId: invitation.tripId, userId: req.user.id } }
    });

    res.json({ trip: invitation.trip, alreadyMember: !!alreadyMember });
  } catch (err) {
    console.error('Preview invitation error:', err);
    res.status(500).json({ error: 'Failed to load invitation' });
  }
});

/**
 * POST /api/invitations/:token/accept
 * Accept an invite and join the trip
 */
router.post('/:token/accept', requireAuth, async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { trip: true }
    });

    if (!invitation) return res.status(404).json({ error: 'Invite link not found' });
    if (invitation.expiresAt < new Date()) return res.status(410).json({ error: 'Invite link has expired' });
    if (invitation.usedAt) return res.status(410).json({ error: 'Invite link has already been used' });

    // Check if already a member
    const existing = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId: invitation.tripId, userId: req.user.id } }
    });

    if (!existing) {
      await prisma.tripMember.create({
        data: { tripId: invitation.tripId, userId: req.user.id, role: 'collaborator' }
      });
    }

    // Mark invitation as used
    await prisma.invitation.update({
      where: { token },
      data: { usedAt: new Date() }
    });

    res.json({ trip: invitation.trip, message: 'Successfully joined trip!' });
  } catch (err) {
    console.error('Accept invitation error:', err);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

/**
 * GET /api/invitations/:tripId/members
 * Get all members of a trip
 */
router.get('/:tripId/members', requireAuth, async (req, res) => {
  try {
    const { tripId } = req.params;

    // Must be a member to view members
    const member = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: req.user.id } }
    });
    if (!member) return res.status(403).json({ error: 'Access denied' });

    const members = await prisma.tripMember.findMany({
      where: { tripId },
      include: { user: { select: { id: true, name: true, email: true, picture: true } } },
      orderBy: { joinedAt: 'asc' }
    });

    res.json(members);
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Failed to get members' });
  }
});

/**
 * DELETE /api/invitations/:tripId/members/:userId
 * Remove a member from a trip (owner only)
 */
router.delete('/:tripId/members/:userId', requireAuth, async (req, res) => {
  try {
    const { tripId, userId } = req.params;

    const requester = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: req.user.id } }
    });
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can remove members' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Owner cannot remove themselves' });
    }

    await prisma.tripMember.delete({
      where: { tripId_userId: { tripId, userId } }
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
