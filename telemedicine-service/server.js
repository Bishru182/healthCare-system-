import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 3005;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Telemedicine Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      `Failed to start Telemedicine Service: ${error.message}`
    );
    process.exit(1);
  }
};

startServer();
