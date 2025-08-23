const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 8888;
const secret = process.env.SECRET_KEY || "your_super_puper_secret_key";

const app = express(); //сборка вэб-приложения

//middleware
app.use(cors()); //разрешение кросдоменных запросов
app.use(express.json()); //json-парсер

//инициализация БД
const db = new sqlite3.Database("./todos.db");

db.serialize(() => {
    db.run(
        "create table if not exists roles(id integer primary key autoincrement, role text unique)"
    );
    db.run(
        "create table if not exists users(id integer primary key autoincrement, username text unique, email text unique, password text, roleid integer, foreign key (roleid) references roles(id))"
    );
    db.run("insert or ignore into roles(role) values('admin')");
    db.run("insert or ignore into roles(role) values('user')");
    db.run(
        "create table if not exists tasks(id integer primary key autoincrement, title text, deadline datetime, priority text, userid integer default null, status text default 'new', foreign key (userid) references users(id))"
    );
});

/* -------------------АУТЕНТИФИКАЦИЯ/АВТОРИЗАЦИЯ--------------------   */

//регистрация
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body; //извлекаем данные пользователя из тела запроса
    //хэширование пароля с использованием соли в 10 символов
    const hashedPassword = await bcrypt.hash(password, 10);

    db.get("select count(*) as count from users", (err, row) => {
        if (err) {
            //в случае ошибки отправляем клиенту ответ со статусом 500 и сообщением с текстом ошибки
            return res.status(500).json({ error: err.message });
        }
        const isFirstUser = row.count == 0; //если записей в users нет, то true
        //первый пользователь будет admin, остальные user
        const roleName = isFirstUser ? "admin" : "user";

        db.get("select id from roles where role=?", [roleName], (err, role) => {
            if (err) {
                //в случае ошибки отправляем клиенту ответ со статусом 500 и сообщением с текстом ошибки
                return res.status(500).json({ error: err.message });
            }
            db.run(
                "insert into users(username, email, password, roleid) values(?,?,?,?)",
                [username, email, hashedPassword, role.id],
                (err) => {
                    if (err) {
                        //в случае ошибки отправляем клиенту ответ со статусом 500 и сообщением с текстом ошибки
                        return res.status(500).json({ error: err.message });
                    }
                    return res
                        .status(201)
                        .json({ message: "Пользователь зарегистрирован" });
                }
            );
        });
    });
});

//вход
app.post("/login", async (req, res) => {
    const { username, email, password } = req.body; //извлекаем данные пользователя из тела запроса
    db.get(
        "select * from users where username=? or email=?",
        [username, email],
        async (err, user) => {
            if (err || !user) {
                return res.status(400).json({ error: err.message });
            }
            //сравниваем переданный в запросе пароль с хэшем из БД
            const isPasswordValid = await bcrypt.compare(
                password,
                user.password
            );
            if (!isPasswordValid) {
                return res.status(400).json({ error: "Неверный пароль" });
            }
            //получаем названием роли пользователя
            db.get(
                "select role from roles where id=?",
                [user.roleid],
                async (err, role) => {
                    if (err) {
                        return res.status(400).json({ error: err.message });
                    }
                    //генерируем jwt-токен
                    const token = jwt.sign(
                        {
                            id: user.id,
                            username: user.username,
                            role: role.role,
                        },
                        secret,
                        { expiresIn: "1h" }
                    );
                    res.json({
                        token,
                        user: {
                            id: user.id,
                            username: user.username,
                            role: role.role,
                        },
                    });
                }
            );
        }
    );
});

//проверка токена
const authenticateToken = (req, res, next) => {
    //получаем из заголовков запроса данные под ключом Authorization
    const authHeader = req.headers.authorization;
    //разделяем полученное значение по пробелу на массив, забираем второй элемент(токен)
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Токен не обнаружен" });
    }
    jwt.verify(token, secret, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Невалидный токен" });
        }
        //записываем в запрос полученные из токена данные пользователя
        req.user = user;
        next();
    });
};

//получение всех задач
app.get("/tasks", authenticateToken, async (req, res) => {
    db.all(
        "select t.*, u.username from tasks t left join users u on t.userid = u.id",
        (err, tasks) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            return res.json(tasks);
        }
    );
});

//добавление задачи
app.post("/tasks", authenticateToken, (req, res) => {
    if (req.user.role === "admin") {
        const { title, deadline, priority } = req.body; //извлекаем данные задачи из тела запроса
        db.run(
            "insert into tasks(title, deadline, priority) values(?,?,?)",
            [title, deadline, priority],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                db.get(
                    "select t.*, u.username from tasks t left join users u on t.userid = u.id where t.id = ?",
                    [this.lastID],
                    function (err, todo) {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        return res.status(201).json({
                            message: `Новая задача успешно добавлена`,
                            todo: todo,
                        });
                    }
                );
            }
        );
    } else {
        return res
            .status(403)
            .json({ error: "Доступ только для администраторов" });
    }
});

//закрепление задачи за пользователем, задача в работе
app.put("/tasks/active/:id", authenticateToken, async (req, res) => {
    const { id } = req.params; //получаем параметр из адресной строки
    db.run(
        "update tasks set status=?, userid=? where id=?",
        ["in-progress", req.user.id, id],
        async function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            db.get(
                "select t.*, u.username from tasks t left join users u on t.userid = u.id where t.id = ?",
                [id],
                function (err, todo) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    return res.status(201).json({
                        message: "Задача взята в работу",
                        todo: todo,
                    });
                }
            );
        }
    );
});

//завершение задачи
app.put("/tasks/complete/:id", authenticateToken, async (req, res) => {
    const { id } = req.params; //получаем параметр из адресной строки
    db.run(
        "update tasks set status=? where id=?",
        ["done", id],
        async (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            db.get(
                "select t.*, u.username from tasks t left join users u on t.userid = u.id where t.id = ?",
                [id],
                function (err, todo) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    return res.status(201).json({
                        message: "Задача завершена",
                        todo: todo,
                    });
                }
            );
        }
    );
});

//удаление задачи
app.delete("/tasks/:id", authenticateToken, async (req, res) => {
    if (req.user.role === "admin") {
        const { id } = req.params; //получаем параметр из адресной строки
        db.run("delete from tasks where id=?", [id], async (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            return res.json({ message: "Задача удалена", id });
        });
    } else {
        return res
            .status(403)
            .json({ error: "Доступ только для администраторов" });
    }
});

//запуск прослушивания сервера
app.listen(port, () =>
    console.log("Сервер запущен по адресу: http://localhost:8888")
);
