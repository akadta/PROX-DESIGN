const prisma = require("../../config/prisma");
const bcrypt = require("bcryptjs");

const adminSeeder = async () => {
  console.log("Creating Admin...");

  // Create role if it doesn't exist
  const role = await prisma.role.upsert({
    where: {
      slug: "super-admin",
    },
    update: {},
    create: {
      name: "Super Admin",
      slug: "super-admin",
    },
  });

  // Hash password
  const hashedPassword = await bcrypt.hash("Prox!@#$Design", 10);

  // Create admin if it doesn't exist
  await prisma.user.upsert({
    where: {
      email: "proxdesignadmin@gmail.com",
    },
    update: {},
    create: {
      name: "Super Admin",
      email: "proxdesignadmin@gmail.com",
      password: hashedPassword,
      roleId: role.id,
    },
  });

  console.log("Super Admin Created Successfully");
};

module.exports = adminSeeder;
