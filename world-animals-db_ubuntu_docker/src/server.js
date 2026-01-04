// src/server.js
import express from "express";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import api from "./routes/api.js";
import dotenv from "dotenv";


dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));


// Serve local images at /uploads/*
app.use("/uploads", express.static(path.join(process.cwd(), "public", "assets", "uploads")));


// API
app.use("/api", api);


// Frontend (static demo)
app.use(express.static(path.join(process.cwd(), "public")));


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));