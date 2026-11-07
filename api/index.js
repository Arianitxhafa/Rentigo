// Vercel function: every /api/* request is rewritten here (see vercel.json); static pages come from public/.
const { handler } = require("../src/app");

module.exports = handler;
