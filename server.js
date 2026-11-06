const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
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
} = require("./src/database");

const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const passwordFile = path.join(dataDir, "admin-password.txt");
const adminSessionCookieName = "rentigo_admin_session";
const userSessionCookieName = "rentigo_user_session";
const sessionTtlMs = 8 * 60 * 60 * 1000;
// Behind HTTPS in production, session cookies must only travel over secure connections.
const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
const adminSessions = new Map();
const userSessions = new Map();

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Allowed Kosovo cities for booking pickup locations (expanded)
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

fs.mkdirSync(dataDir, { recursive: true });

function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }

  if (fs.existsSync(passwordFile)) {
    return fs.readFileSync(passwordFile, "utf8").trim();
  }

  const password = `rentigo-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(passwordFile, `${password}\n`, { mode: 0o600 });
  console.log(`Admin password created at ${passwordFile}`);
  return password;
}

const adminPassword = getAdminPassword();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [name, ...valueParts] = cookie.split("=");
        return [decodeURIComponent(name), decodeURIComponent(valueParts.join("="))];
      })
  );
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createAdminSession(res) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + sessionTtlMs;
  adminSessions.set(token, expiresAt);
  res.setHeader(
    "Set-Cookie",
    `${adminSessionCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/${secureCookie}; Max-Age=${Math.floor(
      sessionTtlMs / 1000
    )}`
  );
}

function clearAdminSession(req, res) {
  const token = parseCookies(req)[adminSessionCookieName];
  if (token) {
    adminSessions.delete(token);
  }
  res.setHeader("Set-Cookie", `${adminSessionCookieName}=; HttpOnly; SameSite=Lax; Path=/${secureCookie}; Max-Age=0`);
}

function isAdminAuthenticated(req) {
  const token = parseCookies(req)[adminSessionCookieName];
  if (!token) {
    return false;
  }

  const expiresAt = adminSessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    adminSessions.delete(token);
    return false;
  }

  adminSessions.set(token, Date.now() + sessionTtlMs);
  return true;
}

function requireAdmin(req, res) {
  if (isAdminAuthenticated(req)) {
    return true;
  }

  sendJson(res, 401, { error: "Duhet te identifikohesh si admin." });
  return false;
}

function createUserSession(res, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + sessionTtlMs;
  userSessions.set(token, { userId, expiresAt });
  res.setHeader(
    "Set-Cookie",
    `${userSessionCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/${secureCookie}; Max-Age=${Math.floor(
      sessionTtlMs / 1000
    )}`
  );
}

function clearUserSession(req, res) {
  const token = parseCookies(req)[userSessionCookieName];
  if (token) {
    userSessions.delete(token);
  }
  res.setHeader("Set-Cookie", `${userSessionCookieName}=; HttpOnly; SameSite=Lax; Path=/${secureCookie}; Max-Age=0`);
}

function getCurrentUser(req) {
  const token = parseCookies(req)[userSessionCookieName];
  if (!token) {
    return null;
  }

  const session = userSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    userSessions.delete(token);
    return null;
  }

  session.expiresAt = Date.now() + sessionTtlMs;
  userSessions.set(token, session);
  return getUser(session.userId);
}

function requireUser(req, res) {
  const user = getCurrentUser(req);
  if (user) {
    return user;
  }

  sendJson(res, 401, { error: "Duhet te hysh ne llogarine tende." });
  return null;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { hash, salt };
}

function sendNoContent(res) {
  res.writeHead(204);
  res.end();
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(Object.assign(new Error("JSON i derguar nuk eshte i vlefshem."), { statusCode: 400 }));
      }
    });

    req.on("error", reject);
  });
}

function requireFields(payload, fields) {
  const missing = fields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missing.length > 0) {
    const error = new Error(`Mungojne fushat: ${missing.join(", ")}.`);
    error.statusCode = 400;
    throw error;
  }
}

function normalizeCarPayload(payload) {
  requireFields(payload, [
    "brand",
    "model",
    "year",
    "category",
    "transmission",
    "fuel",
    "seats",
    "pricePerDay",
    "location",
    "imageUrl"
  ]);

  const year = Number(payload.year);
  const seats = Number(payload.seats);
  const pricePerDay = Number(payload.pricePerDay);

  if (!Number.isInteger(year) || year < 1990 || year > 2035) {
    throw Object.assign(new Error("Viti i makines nuk eshte i vlefshem."), { statusCode: 400 });
  }

  if (!Number.isInteger(seats) || seats < 2 || seats > 12) {
    throw Object.assign(new Error("Numri i vendeve nuk eshte i vlefshem."), { statusCode: 400 });
  }

  if (!Number.isInteger(pricePerDay) || pricePerDay < 10) {
    throw Object.assign(new Error("Cmimi ditor nuk eshte i vlefshem."), { statusCode: 400 });
  }

  const status = payload.status ? String(payload.status).trim() : "available";
  if (!["available", "maintenance"].includes(status)) {
    throw Object.assign(new Error("Statusi i makines nuk eshte i vlefshem."), { statusCode: 400 });
  }

  return {
    brand: String(payload.brand).trim(),
    model: String(payload.model).trim(),
    year,
    category: String(payload.category).trim(),
    transmission: String(payload.transmission).trim(),
    fuel: String(payload.fuel).trim(),
    seats,
    pricePerDay,
    location: String(payload.location).trim(),
    imageUrl: String(payload.imageUrl).trim(),
    status
  };
}

function normalizeBookingPayload(payload) {
  requireFields(payload, [
    "carId",
    "customerName",
    "email",
    "phone",
    "pickupDate",
    "returnDate",
    "pickupLocation"
  ]);

  const carId = Number(payload.carId);
  if (!Number.isInteger(carId) || carId < 1) {
    throw Object.assign(new Error("Makina e zgjedhur nuk eshte e vlefshme."), { statusCode: 400 });
  }

  const email = String(payload.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Email-i nuk eshte i vlefshem."), { statusCode: 400 });
  }

  const pickupDate = String(payload.pickupDate).trim();
  const returnDate = String(payload.returnDate).trim();
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(pickupDate) || !datePattern.test(returnDate)) {
    throw Object.assign(new Error("Datat duhet te jene ne formatin YYYY-MM-DD."), { statusCode: 400 });
  }

  const pickupLocation = String(payload.pickupLocation).trim();
  const allowed = new Set(KOSOVO_CITIES.map((c) => c.toLowerCase()));
  if (!allowed.has(pickupLocation.toLowerCase())) {
    const error = new Error(
      "Rezervimet lejohen vetem brenda qyteteve te Kosoves. Zgjidh nje qytet: " + KOSOVO_CITIES.join(", ")
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    carId,
    customerName: String(payload.customerName).trim(),
    email,
    phone: String(payload.phone).trim(),
    pickupDate,
    returnDate,
    pickupLocation
  };
}

function normalizeInquiryPayload(payload) {
  requireFields(payload, ["fullName", "email", "phone", "topic", "message"]);

  const email = String(payload.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Email-i nuk eshte i vlefshem."), { statusCode: 400 });
  }

  const message = String(payload.message).trim();
  if (message.length < 8) {
    throw Object.assign(new Error("Mesazhi duhet te kete te pakten 8 karaktere."), { statusCode: 400 });
  }

  return {
    fullName: String(payload.fullName).trim(),
    email,
    phone: String(payload.phone).trim(),
    topic: String(payload.topic).trim(),
    message
  };
}

function normalizeUserSignupPayload(payload) {
  requireFields(payload, ["fullName", "email", "phone", "password"]);

  const email = String(payload.email).trim().toLowerCase();
  const password = String(payload.password);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Email-i nuk eshte i vlefshem."), { statusCode: 400 });
  }

  if (password.length < 6) {
    throw Object.assign(new Error("Password-i duhet te kete te pakten 6 karaktere."), { statusCode: 400 });
  }

  return {
    fullName: String(payload.fullName).trim(),
    email,
    phone: String(payload.phone).trim(),
    password
  };
}

function normalizeUserLoginPayload(payload) {
  requireFields(payload, ["email", "password"]);

  const email = String(payload.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Email-i nuk eshte i vlefshem."), { statusCode: 400 });
  }

  return {
    email,
    password: String(payload.password)
  };
}

function getIdFromPath(pathname, prefix, suffix = "") {
  if (!pathname.startsWith(prefix) || (suffix && !pathname.endsWith(suffix))) {
    return null;
  }

  const withoutPrefix = pathname.slice(prefix.length);
  const id = suffix ? withoutPrefix.slice(0, -suffix.length) : withoutPrefix;

  return /^\d+$/.test(id) ? Number(id) : null;
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicDir, requested));
  const extensionlessPath = path.extname(filePath) ? null : `${filePath}.html`;

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Akses i ndaluar." });
    return;
  }

  const readFilePath = (targetPath) => {
    fs.readFile(targetPath, (error, data) => {
      if (error && extensionlessPath && targetPath === filePath) {
        readFilePath(extensionlessPath);
        return;
      }

      if (error) {
        sendJson(res, 404, { error: "Faqja nuk u gjet." });
        return;
      }

      const extension = path.extname(targetPath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": mimeTypes[extension] || "application/octet-stream"
      });
      res.end(data);
    });
  };

  if (extensionlessPath && !extensionlessPath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Akses i ndaluar." });
    return;
  }

  readFilePath(filePath);
}

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;

  if (req.method === "GET" && pathname === "/api/admin-me") {
    sendJson(res, 200, { authenticated: isAdminAuthenticated(req) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin-login") {
    const payload = await parseBody(req);
    requireFields(payload, ["password"]);

    if (!safeCompare(payload.password, adminPassword)) {
      sendJson(res, 401, { error: "Password i gabuar." });
      return;
    }

    createAdminSession(res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin-logout") {
    clearAdminSession(req, res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/user-me") {
    const user = getCurrentUser(req);
    sendJson(res, 200, { authenticated: Boolean(user), user });
    return;
  }

  if (req.method === "POST" && pathname === "/api/signup") {
    const payload = normalizeUserSignupPayload(await parseBody(req));

    if (findUserByEmail(payload.email)) {
      sendJson(res, 409, { error: "Ky email eshte regjistruar me pare." });
      return;
    }

    const password = hashPassword(payload.password);
    const user = createUser({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      passwordHash: password.hash,
      passwordSalt: password.salt
    });
    createUserSession(res, user.id);
    sendJson(res, 201, { user });
    return;
  }

  if (req.method === "POST" && pathname === "/api/user-login") {
    const payload = normalizeUserLoginPayload(await parseBody(req));
    const dbUser = findUserByEmail(payload.email);

    if (!dbUser) {
      sendJson(res, 401, { error: "Email ose password i gabuar." });
      return;
    }

    const password = hashPassword(payload.password, dbUser.password_salt);
    if (!safeCompare(password.hash, dbUser.password_hash)) {
      sendJson(res, 401, { error: "Email ose password i gabuar." });
      return;
    }

    createUserSession(res, dbUser.id);
    sendJson(res, 200, {
      user: {
        id: dbUser.id,
        fullName: dbUser.full_name,
        email: dbUser.email,
        phone: dbUser.phone,
        createdAt: dbUser.created_at
      }
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/user-logout") {
    clearUserSession(req, res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/my-bookings") {
    const user = requireUser(req, res);
    if (!user) return;

    sendJson(res, 200, { bookings: userBookings(user.id) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/cars") {
    const cars = allCars({
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "all",
      status: searchParams.get("status") || "all",
      location: searchParams.get("location") || "all"
    });
    sendJson(res, 200, { cars });
    return;
  }

  const carId = getIdFromPath(pathname, "/api/cars/");
  if (req.method === "GET" && carId) {
    const car = getCar(carId);
    if (!car) {
      sendJson(res, 404, { error: "Makina nuk u gjet." });
      return;
    }
    sendJson(res, 200, { car });
    return;
  }

  if (req.method === "DELETE" && carId) {
    if (!requireAdmin(req, res)) return;

    const deleted = deleteCar(carId);
    if (!deleted) {
      sendJson(res, 404, { error: "Makina nuk u gjet." });
      return;
    }

    sendJson(res, 200, { car: deleted });
    return;
  }

  if (req.method === "PATCH" && carId) {
    if (!requireAdmin(req, res)) return;

    const existing = getCar(carId);
    if (!existing) {
      sendJson(res, 404, { error: "Makina nuk u gjet." });
      return;
    }

    const body = await parseBody(req);
    // Preserve existing location since the edit form no longer has that field
    if (!body.location) body.location = existing.location;

    const payload = normalizeCarPayload(body);
    const car = updateCar(carId, payload);

    sendJson(res, 200, { car });
    return;
  }

  if (req.method === "POST" && pathname === "/api/cars") {
    if (!requireAdmin(req, res)) return;

    const payload = normalizeCarPayload(await parseBody(req));
    const car = createCar(payload);
    sendJson(res, 201, { car });
    return;
  }

  if (req.method === "GET" && pathname === "/api/bookings") {
    if (!requireAdmin(req, res)) return;

    sendJson(res, 200, { bookings: allBookings() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/bookings") {
    const payload = normalizeBookingPayload(await parseBody(req));
    const user = getCurrentUser(req);
    if (user) {
      payload.userId = user.id;
    }
    const booking = createBooking(payload);
    sendJson(res, 201, { booking });
    return;
  }

  const bookingStatusId = getIdFromPath(pathname, "/api/bookings/", "/status");
  if (req.method === "PATCH" && bookingStatusId) {
    if (!requireAdmin(req, res)) return;

    const payload = await parseBody(req);
    requireFields(payload, ["status"]);
    const booking = updateBookingStatus(bookingStatusId, String(payload.status).trim());
    if (!booking) {
      sendJson(res, 404, { error: "Rezervimi nuk u gjet." });
      return;
    }
    sendJson(res, 200, { booking });
    return;
  }

  if (req.method === "GET" && pathname === "/api/inquiries") {
    if (!requireAdmin(req, res)) return;

    sendJson(res, 200, { inquiries: allInquiries() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/inquiries") {
    const payload = normalizeInquiryPayload(await parseBody(req));
    const inquiry = createInquiry(payload);
    sendJson(res, 201, { inquiry });
    return;
  }

  if (req.method === "GET" && pathname === "/api/stats") {
    if (!requireAdmin(req, res)) return;

    sendJson(res, 200, dashboardStats());
    return;
  }

  if (req.method === "GET" && pathname === "/api/public-stats") {
    const stats = dashboardStats();
    sendJson(res, 200, {
      cars: {
        total: stats.cars.total,
        available: stats.cars.available
      },
      categories: stats.categories
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/options") {
    sendJson(res, 200, filterOptions());
    return;
  }

  sendJson(res, 404, { error: "API endpoint nuk u gjet." });
}

const server = http.createServer(async (req, res) => {
  try {
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (req.method === "OPTIONS") {
      sendNoContent(res);
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if ((url.pathname === "/admin" || url.pathname === "/admin.html") && !isAdminAuthenticated(req)) {
      redirect(res, `/login?admin=1&next=${encodeURIComponent(url.pathname)}`);
      return;
    }

    if (url.pathname === "/admin-login" || url.pathname === "/admin-login.html") {
      redirect(res, `/login?admin=1&next=${encodeURIComponent("/admin")}`);
      return;
    }

    if ((url.pathname === "/account" || url.pathname === "/account.html") && !getCurrentUser(req)) {
      redirect(res, `/login?next=${encodeURIComponent(url.pathname)}`);
      return;
    }

    const isAdminLoginMode =
      (url.pathname === "/login" || url.pathname === "/login.html") && url.searchParams.get("admin") === "1";

    if (isAdminLoginMode && isAdminAuthenticated(req)) {
      redirect(res, "/admin");
      return;
    }

    if ((url.pathname === "/login" || url.pathname === "/login.html" || url.pathname === "/signup" || url.pathname === "/signup.html") && getCurrentUser(req) && !isAdminLoginMode) {
      redirect(res, "/account");
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Metoda nuk lejohet." });
      return;
    }

    serveStatic(req, res, decodeURIComponent(url.pathname));
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, {
      error: statusCode === 500 ? "Ndodhi nje gabim ne server." : error.message
    });

    if (statusCode === 500) {
      console.error(error);
    }
  }
});

server.listen(PORT, () => {
  console.log(`Rentigo running at http://localhost:${PORT}`);

  // Release expired bookings on startup
  const released = releaseExpiredBookings();
  if (released > 0) {
    console.log(`Released ${released} car(s) from expired bookings.`);
  }

  // Check every hour
  setInterval(() => {
    const count = releaseExpiredBookings();
    if (count > 0) {
      console.log(`Released ${count} car(s) from expired bookings.`);
    }
  }, 60 * 60 * 1000);
});
