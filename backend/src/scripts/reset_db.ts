import { prisma } from '../lib/prisma';
(async () => {
  const rows: { tablename: string }[] = await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`
  );
  const names = rows.map(r => `"${r.tablename}"`).join(', ');
  if (names) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
    console.log('✓ Base vidée (' + rows.length + ' tables).');
  }
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
