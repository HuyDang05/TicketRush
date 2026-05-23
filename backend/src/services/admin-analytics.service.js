// Purpose: Service chua nghiep vu chinh cua backend, tach khoi controller de de test va tai su dung.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function calculateAge(dob) {
  if (!dob) return null;

  const today = new Date();
  const birthDate = new Date(dob);

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

function getAgeGroup(age) {
  if (age === null) return 'UNKNOWN';
  if (age < 18) return 'UNDER_18';
  if (age <= 25) return '18_25';
  if (age <= 35) return '26_35';
  if (age <= 45) return '36_45';
  return 'OVER_45';
}

async function getAudienceAnalytics(eventId) {
  const whereCondition = {
    status: 'PAID',
  };

  if (eventId) {
    whereCondition.seat = {
      zone: {
        eventId,
      },
    };
  }

  const paidBookings = await prisma.booking.findMany({
    where: whereCondition,
    distinct: ['userId'],
    include: {
      user: {
        select: {
          id: true,
          gender: true,
          dob: true,
        },
      },
    },
  });

  const genderDistribution = {
    MALE: 0,
    FEMALE: 0,
    OTHER: 0,
    UNKNOWN: 0,
  };

  const ageDistribution = {
    UNDER_18: 0,
    '18_25': 0,
    '26_35': 0,
    '36_45': 0,
    OVER_45: 0,
    UNKNOWN: 0,
  };

  paidBookings.forEach((booking) => {
    const user = booking.user;

    const gender = user.gender || 'UNKNOWN';
    genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;

    const age = calculateAge(user.dob);
    const ageGroup = getAgeGroup(age);
    ageDistribution[ageGroup] += 1;
  });

  return {
    eventId: eventId || null,
    totalPaidUsers: paidBookings.length,
    genderDistribution,
    ageDistribution,
    updatedAt: new Date(),
  };
}

module.exports = {
  getAudienceAnalytics,
};