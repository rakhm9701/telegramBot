dotenv.config();

const mongoose = require("mongoose");
const appbot = require("./app.js");

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB Successfully!");
    appbot.start();
  })
  .catch((err) => {
    console.error("Error: not connected to MongoDB:", err);
  });
