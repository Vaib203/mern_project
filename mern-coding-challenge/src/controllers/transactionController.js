const axios = require("axios");
const Transaction = require("../models/Transaction");

// Helper function to get the start and end dates of a month
const getMonthRange = (month) => {
  const monthIndex = new Date(Date.parse(month + " 1, 2021")).getMonth();
  const startOfMonth = new Date(2021, monthIndex, 1);
  const endOfMonth = new Date(2023, monthIndex + 1, 1);
  return { startOfMonth, endOfMonth };
};

// Initialize the database
exports.initializeDB = async (req, res) => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    await Transaction.deleteMany({});
    await Transaction.insertMany(response.data);
    res.status(200).json({ message: "Database initialized with seed data" });
  } catch (error) {
    res.status(500).json({ message: "Failed to initialize database", error });
  }
};

// List transactions with search and pagination
exports.initializeDB = async (req, res) => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    await Transaction.deleteMany({});
    await Transaction.insertMany(response.data);
    res.status(200).json({ message: "Database initialized with seed data" });
  } catch (error) {
    res.status(500).json({ message: "Failed to initialize database", error });
  }
};

// List transactions with search and pagination
exports.listTransactions = async (req, res) => {
  const { page = 1, perPage = 10, search = "", month } = req.query;

  // Validate month parameter
  if (!month || !Date.parse(month + " 1, 2021")) {
    return res.status(400).json({ message: "Invalid month parameter" });
  }

  const regex = new RegExp(search, "i");
  const { startOfMonth, endOfMonth } = getMonthRange(month);

  let query = {
    dateOfSale: { $gte: startOfMonth, $lte: endOfMonth },
  };

  // Search criteria
  if (search) {
    const isNumericSearch = !isNaN(search);
    query.$or = [{ title: regex }, { description: regex }];
    if (isNumericSearch) {
      query.$or.push({ price: parseFloat(search) });
    }
  }
  console.log(query);

  try {
    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions", error });
  }
};

// Statistics for selected month
exports.getStatistics = async (req, res) => {
  const { month } = req.query;
  try {
    const { startOfMonth, endOfMonth } = getMonthRange(month);

    const totalSaleAmount = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: { $gte: startOfMonth, $lt: endOfMonth },
          sold: true,
        },
      },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    const totalSoldItems = await Transaction.countDocuments({
      dateOfSale: { $gte: startOfMonth, $lt: endOfMonth },
      sold: true,
    });
    const totalNotSoldItems = await Transaction.countDocuments({
      dateOfSale: { $gte: startOfMonth, $lt: endOfMonth },
      sold: false,
    });

    res.status(200).json({
      totalSaleAmount: totalSaleAmount[0] ? totalSaleAmount[0].total : 0,
      totalSoldItems,
      totalNotSoldItems,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching statistics", error });
  }
};

// Bar chart data for price ranges
exports.getBarChartData = async (req, res) => {
  const { month } = req.query;
  try {
    const { startOfMonth, endOfMonth } = getMonthRange(month);

    const ranges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: Infinity },
    ];

    const barChartData = await Promise.all(
      ranges.map(async (range) => {
        const count = await Transaction.countDocuments({
          dateOfSale: { $gte: startOfMonth, $lt: endOfMonth },
          price: { $gte: range.min, $lte: range.max },
        });
        return { range: `${range.min}-${range.max}`, count };
      })
    );

    res.status(200).json(barChartData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bar chart data", error });
  }
};

// Pie chart data for categories
exports.getPieChartData = async (req, res) => {
  const { month } = req.query;
  try {
    const { startOfMonth, endOfMonth } = getMonthRange(month);

    const pieChartData = await Transaction.aggregate([
      { $match: { dateOfSale: { $gte: startOfMonth, $lt: endOfMonth } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    res.status(200).json(
      pieChartData.map((category) => ({
        category: category._id,
        count: category.count,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: "Error fetching pie chart data", error });
  }
};

// Combined data
exports.getCombinedData = async (req, res) => {
  const { month } = req.query;
  try {
    const [statistics, barChartData, pieChartData] = await Promise.all([
      new Promise((resolve, reject) =>
        this.getStatistics(
          { query: { month } },
          { json: resolve, status: () => ({ json: reject }) }
        )
      ),
      new Promise((resolve, reject) =>
        this.getBarChartData(
          { query: { month } },
          { json: resolve, status: () => ({ json: reject }) }
        )
      ),
      new Promise((resolve, reject) =>
        this.getPieChartData(
          { query: { month } },
          { json: resolve, status: () => ({ json: reject }) }
        )
      ),
    ]);

    res.status(200).json({
      statistics,
      barChartData,
      pieChartData,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching combined data", error });
  }
};
