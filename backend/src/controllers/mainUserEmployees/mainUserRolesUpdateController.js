const prisma = require("../../../config/prisma");


function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const mainUserRolesUpdateController = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const role = await prisma.mainUserRole.findUnique({ where: { id: Number(id) } });
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.slug === "admin") {
      return res.status(403).json({ message: "The admin role cannot be edited" });
    }

    const slug = slugify(name);
    if (slug === "admin") {
      return res.status(400).json({ message: "This role name is reserved" });
    }

    const clash = await prisma.mainUserRole.findFirst({
      where: { id: { not: role.id }, OR: [{ name: name.trim() }, { slug }] },
    });
    if (clash) return res.status(409).json({ message: "A role with this name already exists" });

    const updated = await prisma.mainUserRole.update({
      where: { id: role.id },
      data: { name: name.trim(), slug },
      select: { id: true, name: true, slug: true },
    });

    return res.json({ message: "Role updated", data: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = mainUserRolesUpdateController;