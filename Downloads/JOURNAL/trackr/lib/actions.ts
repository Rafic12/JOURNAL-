'use server';

import { prisma } from './prisma';
import { requireUserId } from './supabase/server';

// ==========================================
// ACCOUNTS
// ==========================================
export async function dbGetAccounts() {
  const userId = await requireUserId();
  return await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function dbCreateAccount(data: any) {
  const userId = await requireUserId();
  const { createdAt, userId: _u, ...rest } = data; void _u;
  return await prisma.account.create({
    data: {
      ...rest,
      userId,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    },
  });
}

export async function dbUpdateAccount(id: string, data: any) {
  const userId = await requireUserId();
  const { createdAt, userId: _u, ...rest } = data; void _u;
  const updateData: any = { ...rest };
  if (createdAt) updateData.createdAt = new Date(createdAt);
  return await prisma.account.updateMany({
    where: { id, userId },
    data: updateData,
  });
}

export async function dbDeleteAccount(id: string) {
  const userId = await requireUserId();
  return await prisma.account.deleteMany({ where: { id, userId } });
}

// ==========================================
// TRADES
// ==========================================
export async function dbGetTrades() {
  const userId = await requireUserId();
  const trades = await prisma.trade.findMany({
    where: { userId },
    include: { tags: true },
    orderBy: { openTime: 'asc' },
  });
  return trades.map((t: any) => ({
    ...t,
    openTime: t.openTime.toISOString(),
    closeTime: t.closeTime ? t.closeTime.toISOString() : null,
    tagIds: t.tags.map((tag: any) => tag.id),
    tags: undefined,
  }));
}

export async function dbCreateTrades(tradesData: any[]) {
  const userId = await requireUserId();
  return await prisma.$transaction(
    tradesData.map((trade: any) => {
      const { tagIds, userId: _u, ...data } = trade; void _u;
      return prisma.trade.create({
        data: {
          ...data,
          userId,
          openTime: new Date(data.openTime),
          closeTime: data.closeTime ? new Date(data.closeTime) : null,
          tags: tagIds && tagIds.length > 0 ? {
            connect: tagIds.map((id: string) => ({ id })),
          } : undefined,
        },
      });
    })
  );
}

export async function dbUpdateTrade(id: string, updates: any) {
  const userId = await requireUserId();
  const { tagIds, userId: _u, ...data } = updates; void _u;
  const updateData: any = { ...data };
  if (data.openTime) updateData.openTime = new Date(data.openTime);
  if (data.closeTime !== undefined) updateData.closeTime = data.closeTime ? new Date(data.closeTime) : null;

  // Verify ownership before updating
  const existing = await prisma.trade.findFirst({ where: { id, userId } });
  if (!existing) return null;

  if (tagIds) {
    updateData.tags = {
      set: tagIds.map((tid: string) => ({ id: tid })),
    };
  }

  return await prisma.trade.update({
    where: { id },
    data: updateData,
  });
}

export async function dbDeleteTrade(id: string) {
  const userId = await requireUserId();
  return await prisma.trade.deleteMany({ where: { id, userId } });
}

// ==========================================
// STRATEGIES & TAGS
// ==========================================
export async function dbGetStrategies() {
  const userId = await requireUserId();
  return await prisma.strategy.findMany({ where: { userId } });
}

export async function dbCreateStrategy(data: any) {
  const userId = await requireUserId();
  const { userId: _u, ...rest } = data; void _u;
  return await prisma.strategy.create({ data: { ...rest, userId } });
}

export async function dbUpdateStrategy(id: string, data: any) {
  const userId = await requireUserId();
  const { userId: _u, ...rest } = data; void _u;
  return await prisma.strategy.updateMany({ where: { id, userId }, data: rest });
}

export async function dbDeleteStrategy(id: string) {
  const userId = await requireUserId();
  return await prisma.strategy.deleteMany({ where: { id, userId } });
}

export async function dbGetTags() {
  const userId = await requireUserId();
  return await prisma.tag.findMany({ where: { userId } });
}

export async function dbCreateTag(data: any) {
  const userId = await requireUserId();
  const { userId: _u, ...rest } = data; void _u;
  return await prisma.tag.create({ data: { ...rest, userId } });
}

export async function dbUpdateTag(id: string, data: any) {
  const userId = await requireUserId();
  const { userId: _u, ...rest } = data; void _u;
  return await prisma.tag.updateMany({ where: { id, userId }, data: rest });
}

export async function dbDeleteTag(id: string) {
  const userId = await requireUserId();
  return await prisma.tag.deleteMany({ where: { id, userId } });
}

// ==========================================
// DAY NOTES
// ==========================================
export async function dbGetDayNotes() {
  const userId = await requireUserId();
  const notes = await prisma.dayNote.findMany({ where: { userId } });
  return notes.map((n) => ({ date: n.date, note: n.note }));
}

export async function dbSetDayNote(date: string, note: string) {
  const userId = await requireUserId();
  return await prisma.dayNote.upsert({
    where: { userId_date: { userId, date } },
    update: { note },
    create: { userId, date, note },
  });
}

// ==========================================
// RESET (current user only)
// ==========================================
export async function dbResetAll() {
  const userId = await requireUserId();
  // Order matters: trades reference accounts/strategies/tags
  await prisma.trade.deleteMany({ where: { userId } });
  await prisma.dayNote.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.strategy.deleteMany({ where: { userId } });
  await prisma.tag.deleteMany({ where: { userId } });
}
