const express = require("express");

const router = express.Router();

const userCreateController = require("../controllers/user/userCreateController");
const userListController = require("../controllers/user/userListController");
const userUpdateController = require("../controllers/user/userUpdateController");

router.post("/users", userCreateController.createUser);
router.get("/users", userListController.listUsers);
router.put("/users/:id", userUpdateController.updateUser);

module.exports = router;