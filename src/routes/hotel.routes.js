import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getHotels, getRooms, assignBooking } from "../controllers/hotel.controllers.js";

const router = Router();

// Get hotels (optionally by city)
router.get("/hotels", verifyJWT, getHotels);

// Get rooms of a hotel
router.get("/hotels/:hotelId/rooms", verifyJWT, getRooms);

// Book a room
router.post("/hotels/:hotelId/rooms/:roomId/book", verifyJWT, assignBooking);

export default router;
