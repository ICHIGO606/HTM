import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Hotel } from "../models/hotel.models.js";
import { Room } from "../models/room.models.js";
import { Booking } from "../models/booking.models.js";

// Get all hotels (optionally filter by city)
const getHotels = asyncHandler(async (req, res) => {
  const { city } = req.query;
  const query = city ? { city: new RegExp(city, "i") } : {};
  const hotels = await Hotel.find(query);
  return res.status(200).json(new ApiResponse(200, hotels, "Hotels fetched successfully"));
});

// Get rooms for a hotel
const getRooms = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const rooms = await Room.find({ hotelId });
  if (!rooms.length) throw new ApiError(404, "No rooms found for this hotel");
  return res.status(200).json(new ApiResponse(200, rooms, "Rooms fetched successfully"));
});

// User booking
const assignBooking = asyncHandler(async (req, res) => {
  const { hotelId, roomId } = req.params;
  const room = await Room.findOne({ _id: roomId, hotelId });
  if (!room) throw new ApiError(404, "Room not found in this hotel");

  const { checkInDate, checkOutDate, numberOfAdults, numberOfChildren, guests, totalAmount, paymentStatus, bookingStatus } = req.body;

  const overlap = await Booking.findOne({
    roomId,
    hotelId,
    bookingStatus: "Confirmed",
    $or: [
      { checkInDate: { $lt: new Date(checkOutDate) }, checkOutDate: { $gt: new Date(checkInDate) } }
    ]
  });
  if (overlap) throw new ApiError(400, "Room is already booked for the given dates");

  const booking = await Booking.create({
    user: req.user._id,
    hotelId,
    roomId,
    bookingType: "Hotel",
    checkInDate,
    checkOutDate,
    numberOfAdults,
    numberOfChildren,
    guests,
    totalAmount,
    paymentStatus,
    bookingStatus
  });

  return res.status(200).json(new ApiResponse(200, booking, "Booking done successfully"));
});

export { getHotels, getRooms, assignBooking };
