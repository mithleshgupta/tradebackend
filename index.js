require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const axios = require("axios");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log(" MongoDB connected"))
    .catch(err => console.error(" MongoDB connection error:", err));

const Stock = mongoose.model("Stock", {
    symbol: String,
    currentPrice: Number,
    low: Number,
    high: Number,
    change: String,
    prevClose: Number,
    volume: String
});

const fetchStockData = async () => {
    try {
        const response = await axios.get("https://www.alphavantage.co/query", {
            params: {
                function: "TIME_SERIES_INTRADAY",
                symbol: "IBM",
                interval: "5min",
                apikey: "demo"
            }
        });

        const timeSeries = response.data["Time Series (5min)"];
        if (!timeSeries) {
            console.error("Invalid API response:", response.data);
            return [];
        }

        const stocks = Object.entries(timeSeries).map(([timestamp, data]) => ({
            symbol: "IBM",
            currentPrice: parseFloat(data["4. close"]),
            low: parseFloat(data["3. low"]),
            high: parseFloat(data["2. high"]),
            change: (parseFloat(data["4. close"]) - parseFloat(data["1. open"])).toFixed(2),
            prevClose: parseFloat(data["1. open"]),
            volume: data["5. volume"]
        }));

        return stocks;
    } catch (error) {
        console.error("Error fetching stock data:", error.message);
        return [];
    }
};

const updateStocks = async () => {
    const stocks = await fetchStockData();

    if (stocks.length === 0) return;

    stocks.forEach(async (stock) => {
        const updatedStock = new Stock(stock);
        await updatedStock.save();
    });

    io.emit("market-update", stocks);
};

setInterval(updateStocks, 10000);

app.get("/market-data", async (req, res) => {
    const stocks = await Stock.find();
    res.json(stocks);
});


io.on("connection", (socket) => {
    console.log(" Client connected:", socket.id);
    socket.emit("market-update", []);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
