const jwt = require("jsonwebtoken");
const prisma = require("../config/database");
require("dotenv").config();

const secret = process.env.SECRET_KEY || "your_super_puper_secret_key";

//проверка токена
const authenticateToken = async (req, res, next) => {
    try {
        //получаем из заголовков запроса данные под ключом Authorization
        const authHeader = req.headers.authorization;
        //разделяем полученное значение по пробелу на массив, забираем второй элемент(токен)
        const token = authHeader && authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Токен не обнаружен" });
        }
        const decoded = jwt.verify(token, secret);
        //проверяем, есть ли пользователь из токена в БД
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { role: true },
        });
        if (!user) {
            return res.status(403).json({ error: "Пользователь не найден" });
        }

        req.user = {
            id: user.id,
            username: user.username,
            role: user.role.role,
        };

        next();
    } catch (error) {
        return res.status(403).json({ error: "Невалидный токен" });
    }
};

//проверка роли админа
const requireAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res
            .status(403)
            .json({ error: "Доступ только для администраторов" });
    }
    next();
};

module.exports = { authenticateToken, requireAdmin };
