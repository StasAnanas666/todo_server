const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { initializeRoles } = require("./config/database");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const errorHandler = require("./middleware/errorHandler");

const port = process.env.PORT || 8888;

const app = express(); //сборка вэб-приложения

//middleware
app.use(cors()); //разрешение кросдоменных запросов
app.use(express.json()); //json-парсер

app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);

//обработка ошибок
app.use(errorHandler);

app.use("*", (req, res) => {
    res.status(404).json({ error: "Маршрут не найден" });
});

async function startServer() {
    try {
        await initializeRoles();
        //запуск прослушивания сервера
        app.listen(port, () =>
            console.log("Сервер запущен по адресу: http://localhost:8888")
        );
    } catch (error) {
        console.error("Ошибка запуска сервера: ", error);
    }
}

//процессы завершения работы сервера
//в случае принудительной остановки(Ctrl + C)
process.on("SIGINT", async () => {
    console.log("Выключение сервера...");
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("Выключение сервера...");
    process.exit(0);
});

startServer();
