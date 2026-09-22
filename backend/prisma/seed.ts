import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial gifts catalog...');

  const gifts = [
    { name: 'Heart', emoji: '❤️', price: 10, sortOrder: 1 },
    { name: 'Rose', emoji: '🌹', price: 25, sortOrder: 2 },
    { name: 'Star', emoji: '⭐', price: 50, sortOrder: 3 },
    { name: 'Fire', emoji: '🔥', price: 100, sortOrder: 4 },
    { name: 'Gem', emoji: '💎', price: 250, sortOrder: 5 },
    { name: 'Rocket', emoji: '🚀', price: 500, sortOrder: 6 },
    { name: 'Crown', emoji: '👑', price: 1000, sortOrder: 7 },
  ];

  for (const gift of gifts) {
    await prisma.gift.upsert({
      where: { name: gift.name },
      update: { emoji: gift.emoji, price: gift.price, sortOrder: gift.sortOrder },
      create: gift,
    });
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
