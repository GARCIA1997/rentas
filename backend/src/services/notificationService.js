import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMyNotifications = async (userId) => {
  return prisma.notificationLog.findMany({
    where: { userId },
    orderBy: { sentAt: 'desc' },
    take: 50,
  });
};

export const getUnreadCount = async (userId) => {
  return prisma.notificationLog.count({ where: { userId, readAt: null } });
};

export const markAllAsRead = async (userId) => {
  await prisma.notificationLog.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
};
