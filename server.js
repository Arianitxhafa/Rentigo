// Local / long-running server. On Vercel the same handler runs as a function (api/index.js).
const http = require("node:http");
const { handler } = require("./src/app");
const { releaseExpiredBookings } = require("./src/database");

const PORT = Number(process.env.PORT || 3000);

async function releaseAndLog() {
  try {
    const released = await releaseExpiredBookings();
    if (released > 0) console.log(`Released ${released} car(s) from expired bookings.`);
  } catch (error) {
    console.error("Could not release expired bookings:", error.message);
  }
}

http.createServer(handler).listen(PORT, () => {
  console.log(`Rentigo running at http://localhost:${PORT}`);
  releaseAndLog();
  setInterval(releaseAndLog, 60 * 60 * 1000);
});
