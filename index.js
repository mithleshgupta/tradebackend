require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const FRONTEND_ORIGIN = "https://tradefrontend-qn0rvnlag-mithleshs-projects-f6ca9f84.vercel.app";

const io = new Server(server, {
    cors: {
        origin: FRONTEND_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

const Stock = mongoose.model("Stock", {
    symbol: String,
    currentPrice: Number,
    low: Number,
    high: Number,
    change: String,
    prevClose: Number,
    volume: String
});

let stocks = require("./stocks.json");

setInterval(async () => {
    stocks = stocks.map(stock => {
        const randomChange = parseFloat((Math.random() * 10 - 5).toFixed(2));
        const newPrice = parseFloat((stock.currentPrice + randomChange).toFixed(2));
        const changePercent = parseFloat(((newPrice - stock.prevClose) / stock.prevClose * 100).toFixed(2));

        const updated = {
            ...stock,
            currentPrice: newPrice,
            low: Math.min(stock.low, newPrice),
            high: Math.max(stock.high, newPrice),
            change: randomChange,
            percent: changePercent
        };

        new Stock(updated).save();
        return updated;
    });

    io.emit("market-update", stocks);
}, 5000);

app.get("/market-data", (req, res) => {
    res.json(stocks);
});

io.on("connection", (socket) => {
    console.log("✅ Client connected:", socket.id);
    socket.emit("market-update", stocks);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
