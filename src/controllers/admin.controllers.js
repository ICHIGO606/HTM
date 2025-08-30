
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Hotel } from "../models/hotel.models.js";
import { Room } from "../models/room.models.js";
import { Booking } from "../models/booking.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const createHotel = asyncHandler(async (req, res) => {
  const { name, city, description, amenities, address } = req.body;
  if (!name || !city || !description) {
    throw new ApiError(401, "These details are required to create the hotel");
  }

  let imageUrls = [];
  if (req.files?.images) {
    const uploadPromises = req.files.images.map((file) =>
      uploadOnCloudinary(file.buffer, "hotels")
    );
    imageUrls = await Promise.all(uploadPromises);
  }

  const newHotel = await Hotel.create({
    name,
    city,
    description,
    amenities,
    address,
    adminId: req.user._id,
    images: imageUrls,
  });

  if (!newHotel) {
    throw new ApiError(500, "Server error while creating the hotel");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newHotel, "Hotel Created Successfully"));
});

const updateHotel = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { name, city, description, amenities, address, images } = req.body;

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    throw new ApiError(404, "Hotel not found");
  }

  if (name) hotel.name = name;
  if (city) hotel.city = city;
  if (description) hotel.description = description;
  if (amenities) hotel.amenities = amenities;
  if (address) hotel.address = address;

  // ✅ Handle new uploads
  if (req.files?.images) {
    const uploadPromises = req.files.images.map((file) =>
      uploadOnCloudinary(file.buffer, "hotels")
    );
    const newUploads = await Promise.all(uploadPromises);
    hotel.images.push(...newUploads);
  }

  if (images) {
    if (images.add && Array.isArray(images.add)) {
      hotel.images.push(...images.add);
    }
    if (images.remove && Array.isArray(images.remove)) {
      hotel.images = hotel.images.filter(
        (img) => !images.remove.includes(img)
      );
    }
  }

  const updatedHotel = await hotel.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedHotel, "Hotel updated successfully"));
});


function parseRoomNumbers(input) {
  if (!input) return [];

  // Ensure input is a string (if array is passed, join with commas)
  const str = Array.isArray(input) ? input.join(",") : String(input);

  const result = [];
  str.split(",").forEach((part) => {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          result.push(i);
        }
      }
    } else {
      const num = Number(part.trim());
      if (!isNaN(num)) result.push(num);
    }
  });

  return result;
}

const addRoom = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  let { type, pricePerNight, maxOccupancy, roomNumbers, amenities } = req.body;

  if (!type || !pricePerNight || !maxOccupancy || !roomNumbers) {
    throw new ApiError(400, "All fields are required");
  }

  // Parse ranges/comma-separated values into an array
  const parsedNumbers = parseRoomNumbers(roomNumbers);
  if (parsedNumbers.length === 0) {
    throw new ApiError(400, "Invalid room numbers format");
  }

  let imageUrls = [];
  if (req.files?.images) {
    const uploadPromises = req.files.images.map((file) =>
      uploadOnCloudinary(file.buffer, "rooms")
    );
    imageUrls = await Promise.all(uploadPromises);
  }

  let existingRoom = await Room.findOne({ hotelId, type });

  if (existingRoom) {
    existingRoom.roomNumbers = [
      ...new Set([...existingRoom.roomNumbers, ...parsedNumbers]),
    ];
    existingRoom.pricePerNight = pricePerNight;
    existingRoom.maxOccupancy = maxOccupancy;
    if (amenities) existingRoom.amenities = amenities;
    if (imageUrls.length > 0)
      existingRoom.images = [...existingRoom.images, ...imageUrls];

    await existingRoom.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          existingRoom,
          "Rooms updated successfully for existing type"
        )
      );
  }

  const newRoom = await Room.create({
    hotelId,
    type,
    pricePerNight,
    maxOccupancy,
    roomNumbers: parsedNumbers,
    amenities,
    images: imageUrls,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        newRoom,
        "New room type added with rooms successfully"
      )
    );
});

const updateRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  let { type, pricePerNight, maxOccupancy, roomNumbers, amenities, images } =
    req.body;

  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  if (type) room.type = type;
  if (pricePerNight) room.pricePerNight = pricePerNight;
  if (maxOccupancy) room.maxOccupancy = maxOccupancy;
  if (amenities) room.amenities = amenities;

  if (roomNumbers) {
    const parsedNumbers = parseRoomNumbers(roomNumbers);
    if (parsedNumbers.length > 0) {
      room.roomNumbers = [...new Set([...room.roomNumbers, ...parsedNumbers])];
    }
  }

  if (req.files?.images) {
    const uploadPromises = req.files.images.map((file) =>
      uploadOnCloudinary(file.buffer, "rooms")
    );
    const newUploads = await Promise.all(uploadPromises);
    room.images.push(...newUploads);
  }


  if (images) {
    if (images.add && Array.isArray(images.add)) {
      room.images.push(...images.add);
    }
    if (images.remove && Array.isArray(images.remove)) {
      room.images = room.images.filter((img) => !images.remove.includes(img));
    }
  }

  const updatedRoom = await room.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedRoom, "Room updated successfully"));
});


const deleteRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { roomNumber } = req.body; // could be single, range, or comma separated

  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Room type not found");
  }

  if (roomNumber) {
    const parsedNumbers = parseRoomNumbers(roomNumber);

    room.roomNumbers = room.roomNumbers.filter(
      (num) => !parsedNumbers.includes(num)
    );
    await room.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          room,
          `Room numbers ${parsedNumbers.join(", ")} removed successfully`
        )
      );
  } else {
    await room.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Room type deleted successfully"));
  }
});

const getHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find({ adminId: req.user._id });
  if (!hotels) {
    throw new ApiError(404, "No hotels found for this user");
  }
  return res.status(200)
  .json(new ApiResponse(200, hotels, "Hotels fetched successfully"));
});

const getRooms = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const rooms = await Room.find({ hotelId });
  if (!rooms) {
    throw new ApiError(404, "Unable to find the rooms for this hotel");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, rooms, "Rooms fetched successfully"));
});

const assignBooking = asyncHandler(async (req, res) => {
  const { hotelId, roomId } = req.params;
  const room = await Room.findOne({ _id: roomId, hotelId });
  const {
  checkInDate,
  checkOutDate,
  numberOfAdults,
  numberOfChildren,
  guests,
  totalAmount,
  paymentStatus,
  bookingStatus,
} = req.body;
  if (!room) {
    throw new ApiError(404, "Room not found in this hotel");
  }
  const overlap = await Booking.findOne({
    roomId,
    hotelId,
    bookingStatus: "Confirmed", // only check against confirmed bookings
    $or: [
      {
        checkInDate: { $lt: new Date(checkOutDate) },
        checkOutDate: { $gt: new Date(checkInDate) },
      },
    ],
  });
  if (overlap) {
    throw new ApiError(400, "Room is already booked for the given dates");
  }
  const user = req.user._id;
  const bookingType = "Hotel";
  
  const booking = await Booking.create({
    user,
    hotelId,
    roomId,
    bookingType,
    checkInDate,
    checkOutDate,
    numberOfAdults,
    numberOfChildren,
    totalAmount,
    guests,
    paymentStatus,
    bookingStatus,
  });
  if(!booking){
    return new ApiError(500,"Booking could not be made due to server error")
  }
  return res.status(200)
  .json(new ApiResponse(200,booking,"Booking done successfully"))
});

export {
  createHotel,
  addRoom,
  updateRoom,
  deleteRoom,
  getHotels,
  getRooms,
  updateHotel,
};
