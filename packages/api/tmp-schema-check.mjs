import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
  console.log(await prisma.$queryRawUnsafe("SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_NAME IN ('Vehicule','Service','RetourCuve','DetailRetour','InventaireCarburant','DetailInventaireCarburant','FAMDEPENSE','TauxTVA')"));
  console.log(await prisma.$queryRawUnsafe("SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND COLUMN_NAME IN ('magasinId','vehiculeId','serviceId','famDepenseId') ORDER BY TABLE_NAME, COLUMN_NAME"));
  console.log(await prisma.$queryRawUnsafe("SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND TABLE_NAME = 'user' ORDER BY ORDINAL_POSITION"));
  console.log(await prisma.$queryRawUnsafe("SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND TABLE_NAME IN ('retourcuve','detailretour','inventairecarburant','detailinventairecarburant','vehicule','service','tauxtva','famdepense') AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME, CONSTRAINT_NAME"));
} finally {
  await prisma.$disconnect();
}