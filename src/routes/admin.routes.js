import { Router } from "express";
import { isAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
import { 
  addRoom, 
  createHotel, 
  deleteRoom, 
  getHotels, 
  getRooms, 
  updateRoom,
  updateHotel
} from "../controllers/admin.controllers.js";
import { verifyHotelAdmin } from "../middlewares/verifyHotelAdmin.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();


router.route("/hotels").post(
  verifyJWT,
  isAdmin,
  upload.fields([{ name: "images", maxCount: 10 }]),
  createHotel
);


router.route("/hotels/:hotelId").put(
  verifyJWT,
  verifyHotelAdmin,
  upload.fields([{ name: "images", maxCount: 10 }]),
  updateHotel
);

router.route("/hotels").get(verifyJWT, getHotels);


router.route("/hotels/:hotelId/rooms").post(
  verifyJWT,
  verifyHotelAdmin,
  upload.fields([{ name: "images", maxCount: 10 }]),
  addRoom
);

router.route("/hotels/:hotelId/rooms").get(
  verifyJWT,
  verifyHotelAdmin,
  getRooms
);

router.route("/hotels/:hotelId/rooms/:roomId").put(
  verifyJWT,
  verifyHotelAdmin,
  upload.fields([{ name: "images", maxCount: 10 }]),
  updateRoom
);

router.route("/hotels/:hotelId/rooms/:roomId").delete(
  verifyJWT,
  verifyHotelAdmin,
  deleteRoom
);

export default router;
