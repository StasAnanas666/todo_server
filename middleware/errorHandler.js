const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    //ошибки Prisma
    if (err.code?.startsWith("P")) {
        switch (err.code) {
            case "P2002":
                return res.status(400).json({
                    error: "Запись уже существует",
                });
            case "P2015":
                return res.status(404).json({ error: "Задача не найдена" });
            default:
                return res.status(500).json({ error: "Ошибка базы данных" });
        }
    }

    //JWT ошибки
    if (err.name === "JsonWebTokenError") {
        return res.status(403).json({ error: "Невалидный токен" });
    }
    if (err.name === "TokenExpiredError") {
        return res.status(403).json({ error: "Токен истек" });
    }

    //по умолчанию
    res.status(err.status || 500).json({
        error: err.message || "Внутренняя ошибка сервера",
    });
};

module.exports = errorHandler;
