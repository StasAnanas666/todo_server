const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("../config/database");
require("dotenv").config();

const secret = process.env.SECRET_KEY || "your_super_puper_secret_key";

const authController = {
    //регистрация
    register: async (req, res, next) => {
        try {
            const { username, email, password } = req.body; //извлекаем данные пользователя из тела запроса
            //хэширование пароля с использованием соли в 10 символов
            const hashedPassword = await bcrypt.hash(password, 10);

            const userCount = await prisma.user.count(); //получаем кол-во пользователей в таблице users
            const isFirstUser = userCount === 0; //если записей в users нет, то true
            //первый пользователь будет admin, остальные user
            const roleName = isFirstUser ? "admin" : "user";

            //находим роль
            const role = await prisma.role.findUnique({
                where: { role: roleName },
            });
            if (!role) {
                //в случае ошибки отправляем клиенту ответ со статусом 500 и сообщением с текстом ошибки
                return res.status(500).json({ error: "Роль не найдена" });
            }
            //создаем пользователя
            const user = await prisma.user.create({
                data: {
                    username,
                    email,
                    hashedPassword,
                    roleId: role.id,
                },
            });

            return res
                .status(201)
                .json({ message: "Пользователь зарегистрирован" });
        } catch (error) {
            next(error);
        }
    },
    //вход
    login: async (req, res, next) => {
        try {
            const { username, email, password } = req.body; //извлекаем данные пользователя из тела запроса

            //ищем пользователя и его роль
            const user = await prisma.user.findFirst({
                where: {
                    OR: [{ username }, { email }],
                },
                include: {
                    role: true,
                },
            });

            if (!user) {
                return res
                    .status(400)
                    .json({ error: "Пользователь не найден" });
            }

            //сравниваем переданный в запросе пароль с хэшем из БД
            const isPasswordValid = await bcrypt.compare(
                password,
                user.password
            );
            if (!isPasswordValid) {
                return res.status(400).json({ error: "Неверный пароль" });
            }

            //генерируем jwt-токен
            const token = jwt.sign(
                {
                    id: user.id,
                    username: user.username,
                    role: user.role.role,
                },
                secret,
                { expiresIn: "1h" }
            );
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role.role,
                },
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = authController;
