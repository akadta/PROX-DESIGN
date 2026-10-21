const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const PORT = process.env.PORT;
const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173","http://localhost:5174"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "500mb" }));

const testRoutes = require("./src/routes/testRoutes");
const authRoutes = require("./src/routes/authRoutes");
const bookRoutes = require("./src/routes/bookRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const userRoutes = require("./src/routes/userRoutes");
const mainUserEmployeesRoutes = require("./src/routes/mainUserEmployeesRoutes");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", testRoutes);
app.use("/api", authRoutes);
app.use("/api", bookRoutes);
app.use("/api", aiRoutes);
app.use("/api",userRoutes);
app.use("/api",mainUserEmployeesRoutes);


app.listen(PORT, () => {
  console.log(`The server started on port http://localhost:${PORT}`);
});
