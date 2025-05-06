require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { // Use the MONGO_URI from .env
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"));

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
    console.log("Client connected:", socket.id);
    socket.emit("market-update", stocks);
});

server.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});
