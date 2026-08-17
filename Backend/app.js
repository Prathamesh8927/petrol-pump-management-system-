import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import fuelRoutes from "./routes/fuelRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message:
      "Petrol Pump Management API is running",
  });
});

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/fuel",
  fuelRoutes
);

app.use(
  "/api/nozzles",
  nozzleRoutes
);

app.use(
  "/api/sales",
  salesRoutes
);
export default app;