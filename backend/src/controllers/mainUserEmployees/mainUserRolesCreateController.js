const prisma = require("../../../config/prisma");


function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const mainUserRolesCreateController = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const slug = slugify(name);

    if (slug === "admin") {
      return res.status(400).json({ message: "This role name is reserved" });
    }

    const existing = await prisma.mainUserRole.findFirst({
      where: { OR: [{ name: name.trim() }, { slug }] },
    });
    if (existing) {
      return res.status(409).json({ message: "A role with this name already exists" });
    }

    const role = await prisma.mainUserRole.create({
      data: { name: name.trim(), slug },
      select: { id: true, name: true, slug: true },
    });

    return res.status(201).json({ message: "Role created", data: role });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = mainUserRolesCreateController;