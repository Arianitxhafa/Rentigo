// Data layer on Neon serverless Postgres (HTTP driver: one round trip per query, ideal for Vercel functions).
const crypto = require("node:crypto");
const { neon } = require("@neondatabase/serverless");

let client;
function sql() {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set — add your Neon connection string to .env (locally) or to Vercel.");
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}

// Timestamps stay in the "YYYY-MM-DD HH:MM:SS" (UTC) text format the frontend already understands.
const NOW_TEXT = `to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')`;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
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
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    pickup_date TEXT NOT NULL,
    return_date TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE TABLE IF NOT EXISTS inquiries (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    topic TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  // Sessions live in the database so every serverless instance sees the same logins. Only a hash of the token is stored.
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('admin', 'user')),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS bookings_car_idx ON bookings (car_id)`,
  `CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at)`,
  // Demo data, only into an empty database. One statement, so concurrent cold starts can't half-seed it.
  `WITH seeded AS (
    INSERT INTO cars (brand, model, year, category, transmission, fuel, seats, price_per_day, location, image_url, status)
    SELECT * FROM (VALUES
      ('Toyota', 'Corolla', 2023, 'Economy', 'Automatic', 'Hybrid', 5, 42, 'Mitrovice', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80', 'available'),
      ('Volkswagen', 'Golf', 2022, 'Compact', 'Manual', 'Diesel', 5, 38, 'Mitrovice', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80', 'available'),
      ('BMW', 'X3', 2024, 'SUV', 'Automatic', 'Petrol', 5, 88, 'Mitrovice', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80', 'available'),
      ('Mercedes-Benz', 'C-Class', 2023, 'Luxury', 'Automatic', 'Petrol', 5, 96, 'Mitrovice', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80', 'available'),
      ('Hyundai', 'Tucson', 2023, 'SUV', 'Automatic', 'Hybrid', 5, 72, 'Mitrovice', 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=1200&q=80', 'maintenance'),
      ('Fiat', '500', 2022, 'City', 'Automatic', 'Petrol', 4, 31, 'Mitrovice', 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1200&q=80', 'available')
    ) AS v(brand, model, year, category, transmission, fuel, seats, price_per_day, location, image_url, status)
    WHERE NOT EXISTS (SELECT 1 FROM cars)
    RETURNING id, model
  )
  INSERT INTO bookings (car_id, customer_name, email, phone, pickup_date, return_date, pickup_location, total_price, status)
  SELECT seeded.id, b.customer_name, b.email, b.phone, b.pickup_date, b.return_date, b.pickup_location, b.total_price, b.status
  FROM seeded
  JOIN (VALUES
    ('Corolla', 'Arta Krasniqi', 'arta@example.com', '+355 69 111 2222', '2026-05-18', '2026-05-21', 'Mitrovice', 126, 'confirmed'),
    ('X3', 'Elion Meta', 'elion@example.com', '+355 68 333 4444', '2026-05-15', '2026-05-17', 'Mitrovice', 176, 'pending')
  ) AS b(model, customer_name, email, phone, pickup_date, return_date, pickup_location, total_price, status)
  ON b.model = seeded.model`
];

// Created once per process (or serverless instance); every query waits for it.
let ready;
function ensureReady() {
  if (!ready) {
    ready = sql()
      .transaction(SCHEMA.map((statement) => sql().query(statement)))
      .catch((error) => {
        ready = undefined; // retry on the next request instead of caching the failure
        throw error;
      });
  }
  return ready;
}

async function query(text, params = []) {
  await ensureReady();
  return sql().query(text, params);
}

async function one(text, params) {
  const rows = await query(text, params);
  return rows[0] || null;
}

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

// Canonical list of Kosovo cities allowed for pickup locations
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

/** Cars marked 'booked' whose bookings have all ended become available again. Returns how many were released. */
async function releaseExpiredBookings() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await query(
    `UPDATE cars SET status = 'available'
     WHERE status = 'booked'
       AND NOT EXISTS (
         SELECT 1 FROM bookings
         WHERE bookings.car_id = cars.id
           AND bookings.status IN ('pending', 'confirmed')
           AND bookings.return_date > $1
       )
     RETURNING id`,
    [today]
  );
  return rows.length;
}

// Serverless has no long-running timer, so expired bookings are released lazily, at most every few minutes.
let lastRelease = 0;
async function releaseExpiredBookingsThrottled() {
  if (Date.now() - lastRelease < 5 * 60 * 1000) return 0;
  lastRelease = Date.now();
  return releaseExpiredBookings();
}

async function allCars(filters = {}) {
  await releaseExpiredBookingsThrottled();
  const clauses = [];
  const params = [];
  const add = (clause, value) => {
    params.push(value);
    clauses.push(clause.replace("?", `$${params.length}`));
  };

  if (filters.search) add("(brand || ' ' || model) ILIKE ?", `%${filters.search}%`);
  if (filters.category && filters.category !== "all") add("category = ?", filters.category);
  if (filters.status && filters.status !== "all") add("status = ?", filters.status);
  if (filters.location && filters.location !== "all") add("location = ?", filters.location);

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query(`SELECT * FROM cars ${where} ORDER BY status = 'available' DESC, price_per_day ASC, brand ASC`, params);
}

function getCar(id) {
  return one("SELECT * FROM cars WHERE id = $1", [Number(id)]);
}

function carValues(car) {
  return [
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
  ];
}

function createCar(car) {
  return one(
    `INSERT INTO cars (brand, model, year, category, transmission, fuel, seats, price_per_day, location, image_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    carValues(car)
  );
}

function updateCar(id, car) {
  return one(
    `UPDATE cars SET
       brand = $1, model = $2, year = $3, category = $4, transmission = $5, fuel = $6,
       seats = $7, price_per_day = $8, location = $9, image_url = $10, status = $11
     WHERE id = $12
     RETURNING *`,
    [...carValues(car), Number(id)]
  );
}

function deleteCar(id) {
  return one("DELETE FROM cars WHERE id = $1 RETURNING *", [Number(id)]);
}

function allBookings() {
  return query(`
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
    ORDER BY bookings.created_at DESC, bookings.id DESC
  `);
}

async function hasBookingConflict(carId, pickupDate, returnDate) {
  const conflict = await one(
    `SELECT id FROM bookings
     WHERE car_id = $1
       AND status IN ('pending', 'confirmed')
       AND pickup_date < $2
       AND return_date > $3
     LIMIT 1`,
    [Number(carId), returnDate, pickupDate]
  );
  return Boolean(conflict);
}

function calculateDays(pickupDate, returnDate) {
  const start = new Date(`${pickupDate}T00:00:00Z`);
  const end = new Date(`${returnDate}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

async function createBooking(booking) {
  const car = await getCar(booking.carId);
  if (!car) throw httpError("Makina nuk u gjet.", 404);
  if (car.status !== "available") throw httpError("Kjo makine nuk eshte aktualisht e disponueshme.", 409);

  const days = calculateDays(booking.pickupDate, booking.returnDate);
  if (!Number.isFinite(days) || days < 1) throw httpError("Datat e rezervimit nuk jane te vlefshme.", 400);

  if (await hasBookingConflict(car.id, booking.pickupDate, booking.returnDate)) {
    throw httpError("Kjo makine ka rezervim tjeter per keto data.", 409);
  }

  const totalPrice = days * car.price_per_day;
  // Insert the booking and mark the car as booked in one round trip. The car update only succeeds
  // while it is still available, so two simultaneous requests can't both book it.
  const [inserted] = await query(
    `WITH claimed AS (
       UPDATE cars SET status = 'booked' WHERE id = $2 AND status = 'available' RETURNING id
     )
     INSERT INTO bookings (user_id, car_id, customer_name, email, phone, pickup_date, return_date, pickup_location, total_price, status)
     SELECT $1, claimed.id, $3, $4, $5, $6, $7, $8, $9, 'confirmed' FROM claimed
     RETURNING id`,
    [
      booking.userId || null,
      car.id,
      booking.customerName,
      booking.email,
      booking.phone,
      booking.pickupDate,
      booking.returnDate,
      booking.pickupLocation,
      totalPrice
    ]
  );
  if (!inserted) throw httpError("Kjo makine nuk eshte aktualisht e disponueshme.", 409);

  return one(
    `SELECT
       bookings.*,
       cars.brand, cars.model, cars.year, cars.category, cars.fuel, cars.transmission, cars.seats, cars.image_url
     FROM bookings
     JOIN cars ON cars.id = bookings.car_id
     WHERE bookings.id = $1`,
    [inserted.id]
  );
}

async function updateBookingStatus(id, status) {
  const allowedStatuses = new Set(["pending", "confirmed", "cancelled", "completed"]);
  if (!allowedStatuses.has(status)) throw httpError("Statusi nuk eshte i vlefshem.", 400);

  const booking = await one("UPDATE bookings SET status = $1 WHERE id = $2 RETURNING car_id", [status, Number(id)]);
  if (!booking) return null;

  // If cancelled or completed, release the car (only when it has no other active booking).
  if (status === "cancelled" || status === "completed") {
    await query(
      `UPDATE cars SET status = 'available'
       WHERE id = $1 AND status = 'booked'
         AND NOT EXISTS (
           SELECT 1 FROM bookings
           WHERE car_id = $1 AND status IN ('pending', 'confirmed') AND id <> $2
         )`,
      [booking.car_id, Number(id)]
    );
  }

  return one(
    `SELECT bookings.*, cars.brand, cars.model
     FROM bookings
     JOIN cars ON cars.id = bookings.car_id
     WHERE bookings.id = $1`,
    [Number(id)]
  );
}

function allInquiries() {
  return query("SELECT * FROM inquiries ORDER BY created_at DESC, id DESC");
}

function createInquiry(inquiry) {
  return one(
    `INSERT INTO inquiries (full_name, email, phone, topic, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [inquiry.fullName, inquiry.email, inquiry.phone, inquiry.topic, inquiry.message]
  );
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

async function createUser(user) {
  const row = await one(
    `INSERT INTO users (full_name, email, phone, password_hash, password_salt)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [user.fullName, user.email, user.phone, user.passwordHash, user.passwordSalt]
  );
  if (!row) throw httpError("Ky email eshte regjistruar me pare.", 409);
  return publicUser(row);
}

function findUserByEmail(email) {
  return one("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
}

async function getUser(id) {
  return publicUser(await one("SELECT * FROM users WHERE id = $1", [Number(id)]));
}

function userBookings(userId) {
  return query(
    `SELECT bookings.*, cars.brand, cars.model, cars.category, cars.image_url
     FROM bookings
     JOIN cars ON cars.id = bookings.car_id
     WHERE bookings.user_id = $1
     ORDER BY bookings.created_at DESC, bookings.id DESC`,
    [Number(userId)]
  );
}

async function dashboardStats() {
  const [cars, bookings, categories, inquiries] = await Promise.all([
    one(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'available')::int AS available,
        COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance
      FROM cars
    `),
    one(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed'))::int AS active,
        COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed', 'completed')), 0)::int AS revenue
      FROM bookings
    `),
    query(`
      SELECT category, COUNT(*)::int AS count
      FROM cars
      GROUP BY category
      ORDER BY count DESC, category ASC
    `),
    one(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'new')::int AS "new"
      FROM inquiries
    `)
  ]);
  return { cars, bookings, categories, inquiries };
}

async function filterOptions() {
  const categories = await query("SELECT DISTINCT category FROM cars ORDER BY category");
  const locations = KOSOVO_CITIES.map((location) => ({ location }));
  return { categories, locations };
}

// ---- Sessions ---------------------------------------------------------------

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/** Creates a session and returns the raw token for the cookie (only its hash is stored). */
async function createSession(kind, userId, ttlMs) {
  const token = crypto.randomBytes(32).toString("hex");
  await query("DELETE FROM sessions WHERE expires_at < now()"); // housekeeping
  await query("INSERT INTO sessions (token_hash, kind, user_id, expires_at) VALUES ($1, $2, $3, now() + $4 * interval '1 millisecond')", [
    hashToken(token),
    kind,
    userId ?? null,
    ttlMs
  ]);
  return token;
}

/** The live session for this token and kind, or null. */
function getSession(token, kind) {
  if (!token) return Promise.resolve(null);
  return one("SELECT user_id FROM sessions WHERE token_hash = $1 AND kind = $2 AND expires_at > now()", [hashToken(token), kind]);
}

async function deleteSession(token) {
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

module.exports = {
  KOSOVO_CITIES,
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
  filterOptions,
  createSession,
  getSession,
  deleteSession
};
