const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  // Clean existing data
  await prisma.notificationLog.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.breakTime.deleteMany();
  await prisma.workingHour.deleteMany();
  console.log('Cleared existing data.');

  // ... (working hours and breaks seeding) ...

  // Nepal Time (NPT) is UTC+5:45
  // 09:00 NPT = 03:15 UTC
  // 17:00 NPT = 11:15 UTC
  // 12:00 NPT = 06:15 UTC
  // 13:00 NPT = 07:15 UTC

  const days = [0, 1, 2, 3, 4, 5, 6];
  for (const day of days) {
    await prisma.workingHour.create({
      data: {
        dayOfWeek: day,
        startTime: new Date('1970-01-01T03:15:00Z'),
        endTime: new Date('1970-01-01T11:15:00Z'),
        isActive: day !== 6, // Saturday is holiday
      },
    });
  }
  console.log('Seeded working hours (09:00-17:00 NPT / 03:15-11:15 UTC, Saturday off).');

  // Seed lunch break: 12:00 - 13:00 NPT
  await prisma.breakTime.create({
    data: {
      startTime: new Date('1970-01-01T06:15:00Z'),
      endTime: new Date('1970-01-01T07:15:00Z'),
      isActive: true,
    },
  });
  console.log('Seeded lunch break (12:00-13:00 NPT / 06:15-07:15 UTC).');

  // Seed notification templates
  const templates = [
    {
      name: 'Standard Confirmation',
      subject: 'Appointment Confirmed - {{serviceName}}',
      body: `Dear {{customerName}},\n\nYour appointment has been confirmed!\n\nService: {{serviceName}}\nDate: {{date}}\nTime: {{startTime}} - {{endTime}}\n\nThank you for choosing our salon.\n\nBest regards,\nSalon Team`,
      isActive: true,
    },
    {
      name: 'Premium Welcome',
      subject: '✨ Your {{serviceName}} Appointment is Confirmed!',
      body: `Hello {{customerName}},\n\nWe're thrilled to confirm your upcoming appointment!\n\n🎯 Service: {{serviceName}}\n📅 Date: {{date}}\n⏰ Time: {{startTime}} - {{endTime}}\n\nWe look forward to providing you with an exceptional experience. If you need to reschedule, please contact us at least 24 hours in advance.\n\nWarm regards,\nThe Salon Team ✨`,
      isActive: true,
    },
    {
      name: 'Short & Sweet',
      subject: 'Booking Confirmed ',
      body: `Hi {{customerName}},\n\nAll set! {{serviceName}} on {{date}} at {{startTime}}.\n\nSee you soon!\nSalon Team`,
      isActive: true,
    },
    {
      name: 'Cancellation Notice',
      subject: 'Appointment Cancelled - {{serviceName}}',
      body: `Dear {{customerName}},\n\nYour appointment for {{serviceName}} on {{date}} at {{startTime}} has been cancelled.\n\nIf this was a mistake, please rebook at your earliest convenience.\n\nRegards,\nSalon Team`,
      isActive: true,
    },
    {
      name: 'Appointment Reminder',
      subject: 'Reminder: {{serviceName}} Tomorrow',
      body: `Hi {{customerName}},\n\nThis is a friendly reminder about your appointment tomorrow.\n\nService: {{serviceName}}\nDate: {{date}}\nTime: {{startTime}}\n\nPlease arrive 5 minutes early. See you soon!\n\nSalon Team`,
      isActive: true,
    },
  ];

  for (const tpl of templates) {
    await prisma.notificationTemplate.create({ data: tpl });
  }
  console.log(`Seeded ${templates.length} notification templates.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
