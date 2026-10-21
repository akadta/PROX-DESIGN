const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");

const mainUserEmployeeRegisterController = require("../controllers/mainUserEmployees/mainUserEmployeesRegisterController");
const mainUserEmployeesListController = require("../controllers/mainUserEmployees/mainUserEmployeesListController");
const mainUserEmployeesUpdateController = require("../controllers/mainUserEmployees/mainUserEmployeesUpdateController");
const mainUserEmployeesDeleteController = require("../controllers/mainUserEmployees/mainUserEmployeesDeleteController");
const mainUserEmployeesToggleActiveController = require("../controllers/mainUserEmployees/mainUserEmployeesToggleActiveController");
const mainUserRolesListController = require("../controllers/mainUserEmployees/mainUserRolesListController");
const mainUserRolesCreateController = require("../controllers/mainUserEmployees/mainUserRolesCreateController");
const mainUserRolesUpdateController = require("../controllers/mainUserEmployees/mainUserRolesUpdateController");


router.post("/main-user-employees", auth, mainUserEmployeeRegisterController);
router.get("/main-user-employees", auth, mainUserEmployeesListController);
router.put("/main-user-employees/:id", auth, mainUserEmployeesUpdateController);
router.delete("/main-user-employees/:id", auth, mainUserEmployeesDeleteController);
router.patch("/main-user-employees/:id/toggle-active", auth, mainUserEmployeesToggleActiveController);

router.get("/main-user-roles", auth, mainUserRolesListController);
router.post("/main-user-roles", auth, mainUserRolesCreateController);

router.put("/main-user-roles/:id", auth, mainUserRolesUpdateController);
module.exports = router;