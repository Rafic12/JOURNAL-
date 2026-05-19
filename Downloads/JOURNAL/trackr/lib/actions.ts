'use server';

import { prisma } from './prisma';
import { Account, Trade, Strategy, Tag, DayNote } from './types';

// ==========================================
// ACCOUNTS
// ==========================================
export async function dbGetAccounts() {
  return await prisma.account.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function dbCreateAccount(data: any) {
  const { createdAt, ...rest } = data;
  return await prisma.account.create({
    data: {
      ...rest,
      createdAt: createdAt ? new Date(createdAt) : new Date()
    }
  });
}

export async function dbUpdateAccount(id: string, data: any) {
  const { createdAt, ...rest } = data;
  const updateData: any = { ...rest };
  if (createdAt) updateData.createdAt = new Date(createdAt);
  return await prisma.account.update({ where: { id }, data: updateData });
}

export async function dbDeleteAccount(id: string) {
  return await prisma.account.delete({ where: { id } });
}

// ==========================================
// TRADES
// ==========================================
export async function dbGetTrades() {
  const trades = await prisma.trade.findMany({
    include: { tags: true },
    orderBy: { openTime: 'asc' }
  });
  // Map Prisma relation to trackr format
  return trades.map((t: any) => ({
    ...t,
    openTime: t.openTime.toISOString(),
    closeTime: t.closeTime ? t.closeTime.toISOString() : null,
    tagIds: t.tags.map((tag: any) => tag.id),
    tags: undefined
  }));
}

export async function dbCreateTrades(tradesData: any[]) {
  // Prisma createMany does not support creating nested relations.
  // We use a transaction to create multiple trades safely.
  return await prisma.$transaction(
    tradesData.map((trade: any) => {
      const { tagIds, ...data } = trade;
      return prisma.trade.create({
        data: {
          ...data,
          openTime: new Date(data.openTime),
          closeTime: data.closeTime ? new Date(data.closeTime) : null,
          tags: tagIds && tagIds.length > 0 ? {
            connect: tagIds.map((id: string) => ({ id }))
          } : undefined
        }
      });
    })
  );
}

export async function dbUpdateTrade(id: string, updates: any) {
  const { tagIds, ...data } = updates;
  const updateData: any = { ...data };
  if (data.openTime) updateData.openTime = new Date(data.openTime);
  if (data.closeTime !== undefined) updateData.closeTime = data.closeTime ? new Date(data.closeTime) : null;
  
  if (tagIds) {
    updateData.tags = {
      set: tagIds.map((tid: string) => ({ id: tid }))
    };
  }

  return await prisma.trade.update({
    where: { id },
    data: updateData
  });
}

export async function dbDeleteTrade(id: string) {
  return await prisma.trade.delete({ where: { id } });
}

// ==========================================
// STRATEGIES & TAGS
// ==========================================
export async function dbGetStrategies() {
  return await prisma.strategy.findMany();
}

export async function dbCreateStrategy(data: any) {
  return await prisma.strategy.create({ data });
}

export async function dbUpdateStrategy(id: string, data: any) {
  return await prisma.strategy.update({ where: { id }, data });
}

export async function dbDeleteStrategy(id: string) {
  return await prisma.strategy.delete({ where: { id } });
}

export async function dbGetTags() {
  return await prisma.tag.findMany();
}

export async function dbCreateTag(data: any) {
  return await prisma.tag.create({ data });
}

export async function dbUpdateTag(id: string, data: any) {
  return await prisma.tag.update({ where: { id }, data });
}

export async function dbDeleteTag(id: string) {
  return await prisma.tag.delete({ where: { id } });
}

// ==========================================
// DAY NOTES
// ==========================================
export async function dbGetDayNotes() {
  return await prisma.dayNote.findMany();
}

export async function dbSetDayNote(date: string, note: string) {
  return await prisma.dayNote.upsert({
    where: { date },
    update: { note },
    create: { date, note }
  });
}

export async function dbResetAll() {
  await prisma.trade.deleteMany();
  await prisma.account.deleteMany();
  await prisma.strategy.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.dayNote.deleteMany();
}
