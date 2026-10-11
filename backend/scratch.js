const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const invoices = await prisma.invoice.findMany();
  const payments = await prisma.payment.findMany();
  console.log("Invoices:", invoices.map(i => ({id: i.id, status: i.status})));
  console.log("Payments:", payments);
}
main();
