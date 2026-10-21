const express = require("express");
const auth = require("../middlewares/auth");

const router = express.Router();

const loginController = require("../controllers/auth/loginController");
const userDataController = require("../controllers/auth/userDataController");
const mainUserDataController = require("../controllers/auth/mainUserDataController");

// regular users (blocked if they have a main_users profile)
router.post("/login", loginController.Login);
router.get("/auth/user", auth, userDataController.authUser);

// main_users / admin panel only (blocked if there's no main_users profile)
router.post("/main/login", loginController.MainLogin);
router.get("/main/auth/user", auth, mainUserDataController.authUser);

module.exports = router;