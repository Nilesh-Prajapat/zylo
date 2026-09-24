import { PrismaClient, UserRole, StreamStatus } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Zylo production database seed...');

  // 1. Seed Gifts Catalog
  console.log('📦 Seeding gifts catalog...');
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

  // 2. Seed Categories
  console.log('🏷️  Seeding categories...');
  const categoryData = [
    { name: 'Music', slug: 'music', description: 'Live performances, jam sessions, and acoustic vibes' },
    { name: 'Gaming', slug: 'gaming', description: 'Esports, casual play, and competitive ranked runs' },
    { name: 'Just Chatting', slug: 'just-chatting', description: 'IRL talks, podcasts, tea sessions, and open discussions' },
    { name: 'Dance', slug: 'dance', description: 'Choreography, live performances, and freestyle moves' },
    { name: 'Art', slug: 'art', description: 'Digital illustration, painting, design, and 3D modeling' },
    { name: 'Fitness', slug: 'fitness', description: 'Workouts, yoga sessions, and athletic training' },
    { name: 'Outdoors', slug: 'outdoors', description: 'Travel streams, mountain hikes, and nature adventures' },
    { name: 'Lifestyle', slug: 'lifestyle', description: 'Daily vlogs, cooking, fashion, and wellness' },
    { name: 'Tech', slug: 'tech', description: 'Live coding, AI development, and gadget reviews' },
  ];

  const categoriesMap = new Map<string, string>();
  for (const cat of categoryData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
    categoriesMap.set(cat.name, created.id);
  }

  // 3. Password Hash for Fictional Users
  const passwordHash = await argon2.hash('ZyloCreator2026!');

  // 4. Seed Fictional Realistic Creators
  console.log('👤 Seeding fictional creators...');
  const creatorDefs = [
    {
      username: 'saraa',
      email: 'sara@zylo.live',
      displayName: 'Sara Ahmed',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
      bio: 'Music creator & acoustic singer ✨ Sharing warm night vibes & song requests.',
      location: 'London, UK',
      category: 'Music',
    },
    {
      username: 'ryancole',
      email: 'ryan@zylo.live',
      displayName: 'Ryan Cole',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop',
      bio: 'Competitive FPS player & esports streamer 🎮 Pushing ranks daily.',
      location: 'Austin, TX',
      category: 'Gaming',
    },
    {
      username: 'mayachen',
      email: 'maya@zylo.live',
      displayName: 'Maya Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
      bio: 'Digital illustrator & 3D artist 🎨 Painting live and answering art questions.',
      location: 'Vancouver, Canada',
      category: 'Art',
    },
    {
      username: 'linac',
      email: 'lina@zylo.live',
      displayName: 'Lina Carter',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop',
      bio: 'Late night chats, coffee talk & cozy community vibes ☕',
      location: 'Seattle, WA',
      category: 'Just Chatting',
    },
    {
      username: 'alexm',
      email: 'alex@zylo.live',
      displayName: 'Alex Morgan',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop',
      bio: 'Outdoor adventure & travel enthusiast 🏔️ Streaming from the world’s trails.',
      location: 'Denver, CO',
      category: 'Outdoors',
    },
    {
      username: 'noahw',
      email: 'noah@zylo.live',
      displayName: 'Noah Williams',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop',
      bio: 'Certified fitness coach & calisthenics trainer 💪 Let’s train together.',
      location: 'Miami, FL',
      category: 'Fitness',
    },
    {
      username: 'sophier',
      email: 'sophie@zylo.live',
      displayName: 'Sophie Reed',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop',
      bio: 'Choreographer & freestyle dancer 💃 Bringing high energy performance live.',
      location: 'Los Angeles, CA',
      category: 'Dance',
    },
    {
      username: 'kaib',
      email: 'kai@zylo.live',
      displayName: 'Kai Bennett',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop',
      bio: 'Fullstack developer & AI architect 💻 Building real-time apps live.',
      location: 'San Francisco, CA',
      category: 'Tech',
    },
    {
      username: 'avab',
      email: 'ava@zylo.live',
      displayName: 'Ava Brooks',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop',
      bio: 'Mindful living, interior design & daily routines 🌿',
      location: 'New York, NY',
      category: 'Lifestyle',
    },
    {
      username: 'ethanb',
      email: 'ethan@zylo.live',
      displayName: 'Ethan Blake',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&auto=format&fit=crop',
      bio: 'Retro gaming & classic arcade speedrunner 👾',
      location: 'Chicago, IL',
      category: 'Gaming',
    },
  ];

  const createdCreators = new Map<string, any>();

  for (const c of creatorDefs) {
    const user = await prisma.user.upsert({
      where: { username: c.username },
      update: {
        displayName: c.displayName,
        email: c.email,
        role: UserRole.CREATOR,
        avatarUrl: c.avatarUrl,
        profile: {
          upsert: {
            create: { bio: c.bio, location: c.location },
            update: { bio: c.bio, location: c.location },
          },
        },
        wallet: {
          upsert: {
            create: { purchasedCoins: 500, creatorEarnings: 1200 },
            update: {},
          },
        },
      },
      create: {
        username: c.username,
        email: c.email,
        displayName: c.displayName,
        passwordHash,
        role: UserRole.CREATOR,
        avatarUrl: c.avatarUrl,
        profile: {
          create: { bio: c.bio, location: c.location },
        },
        wallet: {
          create: { purchasedCoins: 500, creatorEarnings: 1200 },
        },
      },
    });

    createdCreators.set(c.username, user);
  }

  // Also ensure a standard viewer user exists
  const defaultViewer = await prisma.user.upsert({
    where: { username: 'zylo_viewer' },
    update: {
      displayName: 'Zylo Viewer',
      role: UserRole.NORMAL_USER,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop',
      wallet: {
        upsert: {
          create: { purchasedCoins: 1000, creatorEarnings: 0 },
          update: {},
        },
      },
    },
    create: {
      username: 'zylo_viewer',
      email: 'viewer@zylo.live',
      displayName: 'Zylo Viewer',
      passwordHash,
      role: UserRole.NORMAL_USER,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop',
      wallet: {
        create: { purchasedCoins: 1000, creatorEarnings: 0 },
      },
    },
  });

  // 5. Seed Follower Relationships to give believable follower numbers
  console.log('🤝 Seeding follower counts...');
  const sara = createdCreators.get('saraa');
  const ryan = createdCreators.get('ryancole');
  const maya = createdCreators.get('mayachen');
  const lina = createdCreators.get('linac');
  const alex = createdCreators.get('alexm');
  const noah = createdCreators.get('noahw');

  const followPairs = [
    { followerId: defaultViewer.id, followingId: sara.id },
    { followerId: defaultViewer.id, followingId: ryan.id },
    { followerId: defaultViewer.id, followingId: maya.id },
    { followerId: ryan.id, followingId: sara.id },
    { followerId: lina.id, followingId: sara.id },
    { followerId: alex.id, followingId: maya.id },
    { followerId: noah.id, followingId: ryan.id },
  ];

  for (const f of followPairs) {
    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: f.followerId,
          followingId: f.followingId,
        },
      },
      update: {},
      create: f,
    });
  }

  // 6. Seed Streams
  console.log('🎥 Seeding live and upcoming streams...');

  const now = new Date();
  const streamsToSeed = [
    // LIVE STREAMS
    {
      publicId: 'stream-sara-music-1',
      broadcasterId: sara.id,
      title: 'Chill Night Vibes ✨',
      description: 'Acoustic songs, warm bedroom lighting & chill conversation with everyone!',
      thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop',
      categoryId: categoriesMap.get('Music'),
      status: StreamStatus.LIVE,
      viewerCount: 3240,
      peakViewerCount: 3890,
      startedAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 mins ago
      vibe: 'Music',
    },
    {
      publicId: 'stream-ryan-gaming-1',
      broadcasterId: ryan.id,
      title: 'Rank Push to Immortal 🎮',
      description: 'High level gameplay, callouts and tactical tips. Drop your game tag!',
      thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop',
      categoryId: categoriesMap.get('Gaming'),
      status: StreamStatus.LIVE,
      viewerCount: 1820,
      peakViewerCount: 2100,
      startedAt: new Date(now.getTime() - 90 * 60 * 1000), // 90 mins ago
      vibe: 'Gaming',
    },
    {
      publicId: 'stream-maya-art-1',
      broadcasterId: maya.id,
      title: 'Art & Creativity Workshop 🎨',
      description: 'Digital painting studio session. Working on fantasy concept character art!',
      thumbnailUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&auto=format&fit=crop',
      categoryId: categoriesMap.get('Art'),
      status: StreamStatus.LIVE,
      viewerCount: 720,
      peakViewerCount: 890,
      startedAt: new Date(now.getTime() - 30 * 60 * 1000),
      vibe: 'Art',
    },
    {
      publicId: 'stream-lina-chatting-1',
      broadcasterId: lina.id,
      title: 'Late Night Talk & Tea ☕',
      description: 'Grab a warm cup and drop in. Answering viewer questions & story time!',
      thumbnailUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop',
      categoryId: categoriesMap.get('Just Chatting'),
      status: StreamStatus.LIVE,
      viewerCount: 640,
      peakViewerCount: 710,
      startedAt: new Date(now.getTime() - 20 * 60 * 1000),
      vibe: 'Just Chatting',
    },
    {
      publicId: 'stream-alex-outdoors-1',
      broadcasterId: alex.id,
      title: 'Hiking in the Himalayas 🏔️',
      description: 'Live mountain summit trail broadcast! Breathtaking views and alpine crisp air.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop',
      categoryId: categoriesMap.get('Outdoors'),
      status: StreamStatus.LIVE,
      viewerCount: 980,
      peakViewerCount: 1150,
      startedAt: new Date(now.getTime() - 110 * 60 * 1000),
      vibe: 'Outdoors',
    },
    {
      publicId: 'stream-noah-fitness-1',
      broadcasterId: noah.id,
      title: 'Morning High-Intensity Workout 💪',
      description: 'Full body bodyweight & mobility workout session. Sweat together!',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop',
      categoryId: categoriesMap.get('Fitness'),
      status: StreamStatus.LIVE,
      viewerCount: 430,
      peakViewerCount: 520,
      startedAt: new Date(now.getTime() - 15 * 60 * 1000),
      vibe: 'Fitness',
    },
    // SCHEDULED STREAMS
    {
      publicId: 'stream-sophie-dance-1',
      broadcasterId: createdCreators.get('sophier').id,
      title: 'Digital Dance Performance 💃',
      description: 'Choreographed live session featuring urban street dance & electronic beats.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&auto=format&fit=crop',
      categoryId: categoriesMap.get('Dance'),
      status: StreamStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      viewerCount: 0,
      vibe: 'Dance',
    },
    {
      publicId: 'stream-kai-tech-1',
      broadcasterId: createdCreators.get('kaib').id,
      title: 'Building Next-Gen AI Apps 💻',
      description: 'Live coding session: building real-time vector search & agentic UI with Next.js.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop',
      categoryId: categoriesMap.get('Tech'),
      status: StreamStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2 days
      viewerCount: 0,
      vibe: 'Tech',
    },
    {
      publicId: 'stream-ava-lifestyle-1',
      broadcasterId: createdCreators.get('avab').id,
      title: 'Weekly Lifestyle Q&A 🌿',
      description: 'Talking home organization, interior moodboards, and evening routine tips.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&auto=format&fit=crop',
      categoryId: categoriesMap.get('Lifestyle'),
      status: StreamStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 72 * 60 * 60 * 1000), // 3 days
      viewerCount: 0,
      vibe: 'Lifestyle',
    },
  ];

  const seededStreamsMap = new Map<string, any>();

  for (const s of streamsToSeed) {
    const existing = await prisma.stream.findFirst({
      where: { publicId: s.publicId },
    });

    let streamObj;
    if (existing) {
      streamObj = await prisma.stream.update({
        where: { id: existing.id },
        data: s,
      });
    } else {
      streamObj = await prisma.stream.create({
        data: {
          ...s,
          livekitRoomName: `zylo-room-${s.publicId}`,
        },
      });
    }
    seededStreamsMap.set(s.publicId, streamObj);
  }

  // 7. Seed Live Chat Messages for Sara's Stream
  console.log('💬 Seeding chat messages...');
  const saraStream = seededStreamsMap.get('stream-sara-music-1');

  if (saraStream) {
    const chatSeedData = [
      { userId: ryan.id, message: 'This vibe is amazing 🔥' },
      { userId: maya.id, message: 'Love this song! So peaceful ✨' },
      { userId: alex.id, message: 'Hey everyone! Perfect evening stream' },
      { userId: noah.id, message: 'Sara this acoustic cover is incredible 🎸' },
      { userId: lina.id, message: '❤️❤️' },
      { userId: defaultViewer.id, message: 'Greetings from Zylo live chat!' },
    ];

    for (let i = 0; i < chatSeedData.length; i++) {
      const item = chatSeedData[i];
      await prisma.chatMessage.create({
        data: {
          streamId: saraStream.id,
          userId: item.userId,
          message: item.message,
          streamOffsetSeconds: (i + 1) * 15,
        },
      });
    }
  }

  console.log('✅ Zylo database successfully seeded with fictional creators & realistic live streams!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
