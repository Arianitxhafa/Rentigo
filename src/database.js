const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "rentigo.db");

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    category TEXT NOT NULL,
    transmission TEXT NOT NULL,
    fuel TEXT NOT NULL,
    seats INTEGER NOT NULL,
    price_per_day INTEGER NOT NULL,
    location TEXT NOT NULL,
    image_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    car_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    pickup_date TEXT NOT NULL,
    return_date TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    topic TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const bookingColumns = db.prepare("PRAGMA table_info(bookings)").all();
if (!bookingColumns.some((column) => column.name === "user_id")) {
  db.exec("ALTER TABLE bookings ADD COLUMN user_id INTEGER");
}

// Canonical list of Kosovo cities allowed for pickup locations (expanded)
const KOSOVO_CITIES = [
  "Prishtine",
  "Prizren",
  "Peje",
  "Gjakove",
  "Ferizaj",
  "Gjilan",
  "Mitrovice",
  "Podujeve",
  "Vushtrri",
  "Suhareke",
  "Lipjan",
  "Istog",
  "Klina",
  "Kamenice"
];

const carCount = db.prepare("SELECT COUNT(*) AS count FROM cars").get().count;

if (carCount === 0) {
  const insertCar = db.prepare(`
    INSERT INTO cars (
      brand, model, year, category, transmission, fuel, seats,
      price_per_day, location, image_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedCars = [
    [
      "Toyota",
      "Corolla",
      2023,
      "Economy",
      "Automatic",
      "Hybrid",
      5,
      42,
      "Mitrovice",
      "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80",
      "available"
    ],
    [
      "Volkswagen",
      "Golf",
      2022,
      "Compact",
      "Manual",
      "Diesel",
      5,
      38,
      "Mitrovice",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80",
      "available"
    ],
    [
      "BMW",
      "X3",
      2024,
      "SUV",
      "Automatic",
      "Petrol",
      5,
      88,
      "Mitrovice",
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80",
      "available"
    ],
    [
      "Mercedes-Benz",
      "C-Class",
      2023,
      "Luxury",
      "Automatic",
      "Petrol",
      5,
      96,
      "Mitrovice",
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80",
      "available"
    ],
    [
      "Hyundai",
      "Tucson",
      2023,
      "SUV",
      "Automatic",
      "Hybrid",
      5,
      72,
      "Mitrovice",
      "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=1200&q=80",
      "maintenance"
    ],
    [
      "Fiat",
      "500",
      2022,
      "City",
      "Automatic",
      "Petrol",
      4,
      31,
      "Mitrovice",
      "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1200&q=80",
      "available"
    ]
  ];

  for (const car of seedCars) {
    insertCar.run(...car);
  }

  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      car_id, customer_name, email, phone, pickup_date, return_date,
      pickup_location, total_price, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBooking.run(
    1,
    "Arta Krasniqi",
    "arta@example.com",
    "+355 69 111 2222",
    "2026-05-18",
    "2026-05-21",
    "Mitrovice",
    126,
    "confirmed"
  );

  insertBooking.run(
    3,
    "Elion Meta",
    "elion@example.com",
    "+355 68 333 4444",
    "2026-05-15",
    "2026-05-17",
    "Mitrovice",
    176,
    "pending"
  );
}

// Ensure all existing cars are marked as located in Mitrovice (one-time enforcement)
try {
  db.prepare("UPDATE cars SET location = ?").run("Mitrovice");
} catch (err) {
  // ignore if table doesn't exist yet or no-op
}

function releaseExpiredBookings() {
  const today = new Date().toISOString().slice(0, 10);

  // Find cars that are 'booked' but have no active booking covering today or future
  const expiredCars = db.prepare(`
    SELECT DISTINCT cars.id
    FROM cars
    WHERE cars.status = 'booked'
      AND NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE bookings.car_id = cars.id
          AND bookings.status IN ('pending', 'confirmed')
          AND bookings.return_date > ?
      )
  `).all(today);

  for (const row of expiredCars) {
    db.prepare("UPDATE cars SET status = 'available' WHERE id = ?").run(row.id);
  }

  return expiredCars.length;
}

function allCars(filters = {}) {
  const clauses = [];
  const params = {};

  if (filters.search) {
    clauses.push("(LOWER(brand || ' ' || model) LIKE LOWER(@search))");
    params.search = `%${filters.search}%`;
  }

  if (filters.category && filters.category !== "all") {
    clauses.push("category = @category");
    params.category = filters.category;
  }

  if (filters.status && filters.status !== "all") {
    clauses.push("status = @status");
    params.status = filters.status;
  }

  if (filters.location && filters.location !== "all") {
    clauses.push("location = @location");
    params.location = filters.location;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  return db
    .prepare(`
      SELECT *
      FROM cars
      ${where}
      ORDER BY status = 'available' DESC, price_per_day ASC, brand ASC
    `)
    .all(params);
}

function getCar(id) {
  return db.prepare("SELECT * FROM cars WHERE id = ?").get(Number(id));
}

function createCar(car) {
  const result = db
    .prepare(`
      INSERT INTO cars (
        brand, model, year, category, transmission, fuel, seats,
        price_per_day, location, image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      car.brand,
      car.model,
      Number(car.year),
      car.category,
      car.transmission,
      car.fuel,
      Number(car.seats),
      Number(car.pricePerDay),
      car.location,
      car.imageUrl,
      car.status || "available"
    );

  return getCar(result.lastInsertRowid);
}

function updateCar(id, car) {
  const existing = getCar(id);
  if (!existing) return null;

  db.prepare(`
    UPDATE cars SET
      brand = ?,
      model = ?,
      year = ?,
      category = ?,
      transmission = ?,
      fuel = ?,
      seats = ?,
      price_per_day = ?,
      location = ?,
      image_url = ?,
      status = ?
    WHERE id = ?
  `).run(
    car.brand,
    car.model,
    Number(car.year),
    car.category,
    car.transmission,
    car.fuel,
    Number(car.seats),
    Number(car.pricePerDay),
    car.location,
    car.imageUrl,
    car.status || "available",
    Number(id)
  );

  return getCar(id);
}

function deleteCar(id) {
  const car = getCar(id);
  if (!car) {
    return null;
  }

  db.prepare("DELETE FROM cars WHERE id = ?").run(Number(id));
  return car;
}

function allBookings() {
  return db
    .prepare(`
      SELECT
        bookings.*,
        cars.brand,
        cars.model,
        cars.category,
        cars.image_url,
        users.full_name AS user_full_name,
        users.email AS user_email
      FROM bookings
      JOIN cars ON cars.id = bookings.car_id
      LEFT JOIN users ON users.id = bookings.user_id
      ORDER BY bookings.created_at DESC
    `)
    .all();
}

function hasBookingConflict(carId, pickupDate, returnDate) {
  const conflict = db
    .prepare(`
      SELECT id
      FROM bookings
      WHERE car_id = ?
        AND status IN ('pending', 'confirmed')
        AND pickup_date < ?
        AND return_date > ?
      LIMIT 1
    `)
    .get(Number(carId), returnDate, pickupDate);

  return Boolean(conflict);
}

function calculateDays(pickupDate, returnDate) {
  const start = new Date(`${pickupDate}T00:00:00`);
  const end = new Date(`${returnDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / 86400000);
}

function createBooking(booking) {
  const car = getCar(booking.carId);
  if (!car) {
    const error = new Error("Makina nuk u gjet.");
    error.statusCode = 404;
    throw error;
  }

  if (car.status !== "available") {
    const error = new Error("Kjo makine nuk eshte aktualisht e disponueshme.");
    error.statusCode = 409;
    throw error;
  }

  const days = calculateDays(booking.pickupDate, booking.returnDate);
  if (!Number.isFinite(days) || days < 1) {
    const error = new Error("Datat e rezervimit nuk jane te vlefshme.");
    error.statusCode = 400;
    throw error;
  }

  if (hasBookingConflict(car.id, booking.pickupDate, booking.returnDate)) {
    const error = new Error("Kjo makine ka rezervim tjeter per keto data.");
    error.statusCode = 409;
    throw error;
  }

  const totalPrice = days * car.price_per_day;
  const result = db
    .prepare(`
      INSERT INTO bookings (
        user_id, car_id, customer_name, email, phone, pickup_date, return_date,
        pickup_location, total_price, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `)
    .run(
      booking.userId || null,
      car.id,
      booking.customerName,
      booking.email,
      booking.phone,
      booking.pickupDate,
      booking.returnDate,
      booking.pickupLocation,
      totalPrice
    );

  // Mark car as booked
  db.prepare("UPDATE cars SET status = 'booked' WHERE id = ?").run(car.id);

  return db
    .prepare(`
      SELECT
        bookings.*,
        cars.brand,
        cars.model,
        cars.year,
        cars.category,
        cars.fuel,
        cars.transmission,
        cars.seats,
        cars.image_url
      FROM bookings
      JOIN cars ON cars.id = bookings.car_id
      WHERE bookings.id = ?
    `)
    .get(result.lastInsertRowid);
}

function updateBookingStatus(id, status) {
  const allowedStatuses = new Set(["pending", "confirmed", "cancelled", "completed"]);
  if (!allowedStatuses.has(status)) {
    const error = new Error("Statusi nuk eshte i vlefshem.");
    error.statusCode = 400;
    throw error;
  }

  db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, Number(id));

  // If cancelled or completed, release the car back to available
  // (only if no other active bookings exist for that car)
  if (status === "cancelled" || status === "completed") {
    const booking = db.prepare("SELECT car_id FROM bookings WHERE id = ?").get(Number(id));
    if (booking) {
      const activeBookings = db.prepare(`
        SELECT COUNT(*) AS count FROM bookings
        WHERE car_id = ? AND status IN ('pending', 'confirmed') AND id != ?
      `).get(booking.car_id, Number(id));

      if (activeBookings.count === 0) {
        db.prepare("UPDATE cars SET status = 'available' WHERE id = ? AND status = 'booked'")
          .run(booking.car_id);
      }
    }
  }

  return db
    .prepare(`
      SELECT
        bookings.*,
        cars.brand,
        cars.model
      FROM bookings
      JOIN cars ON cars.id = bookings.car_id
      WHERE bookings.id = ?
    `)
    .get(Number(id));
}

function allInquiries() {
  return db
    .prepare(`
      SELECT *
      FROM inquiries
      ORDER BY created_at DESC
    `)
    .all();
}

function createInquiry(inquiry) {
  const result = db
    .prepare(`
      INSERT INTO inquiries (full_name, email, phone, topic, message)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      inquiry.fullName,
      inquiry.email,
      inquiry.phone,
      inquiry.topic,
      inquiry.message
    );

  return db.prepare("SELECT * FROM inquiries WHERE id = ?").get(result.lastInsertRowid);
}

function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    createdAt: user.created_at
  };
}

function createUser(user) {
  const result = db
    .prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, password_salt)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(user.fullName, user.email, user.phone, user.passwordHash, user.passwordSalt);

  return publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid));
}

function findUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(email);
}

function getUser(id) {
  return publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(Number(id)));
}

function userBookings(userId) {
  return db
    .prepare(`
      SELECT
        bookings.*,
        cars.brand,
        cars.model,
        cars.category,
        cars.image_url
      FROM bookings
      JOIN cars ON cars.id = bookings.car_id
      WHERE bookings.user_id = ?
      ORDER BY bookings.created_at DESC
    `)
    .all(Number(userId));
}

function dashboardStats() {
  const cars = db
    .prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'available'), 0) AS available,
        COALESCE(SUM(status = 'maintenance'), 0) AS maintenance
      FROM cars
    `)
    .get();

  const bookings = db
    .prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status IN ('pending', 'confirmed')), 0) AS active,
        COALESCE(SUM(CASE WHEN status IN ('confirmed', 'completed') THEN total_price ELSE 0 END), 0) AS revenue
      FROM bookings
    `)
    .get();

  const categories = db
    .prepare(`
      SELECT category, COUNT(*) AS count
      FROM cars
      GROUP BY category
      ORDER BY count DESC, category ASC
    `)
    .all();

  const inquiries = db
    .prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'new'), 0) AS new
      FROM inquiries
    `)
    .get();

  return {
    cars,
    bookings,
    categories,
    inquiries
  };
}

function filterOptions() {
  const categories = db.prepare("SELECT DISTINCT category FROM cars ORDER BY category").all();
  const locations = KOSOVO_CITIES.map((l) => ({ location: l }));
  return { categories, locations };
}

module.exports = {
  allCars,
  getCar,
  createCar,
  updateCar,
  deleteCar,
  releaseExpiredBookings,
  allBookings,
  createBooking,
  updateBookingStatus,
  allInquiries,
  createInquiry,
  createUser,
  findUserByEmail,
  getUser,
  userBookings,
  dashboardStats,
  filterOptions
};
