const { prisma } = require("../config/database");

const taskController = {
    getAllTasks: async (req, res, next) => {
        try {
            const tasks = await prisma.task.findMany({
                include: {
                    user: {
                        select: {
                            username: true,
                        },
                    },
                },
                orderBy: {
                    id: "asc",
                },
            });
            return res.json(tasks);
        } catch (error) {
            next(error);
        }
    },
    createTask: async (req, res, next) => {
        try {
            const { title, deadline, priority } = req.body; //извлекаем данные задачи из тела запроса

            const task = await prisma.task.create({
                data: {
                    title,
                    deadline,
                    priority,
                },
                include: {
                    user: {
                        select: {
                            username: true,
                        },
                    },
                },
            });
            return res.status(201).json({
                message: `Новая задача успешно добавлена`,
                todo: task,
            });
        } catch (error) {
            next(error);
        }
    },
    takeTask: async (req, res, next) => {
        try {
            const { id } = req.params; //получаем параметр из адресной строки
            const taskId = parseInt(id);

            const task = await prisma.task.update({
                where: { id: taskId },
                data: {
                    status: "in-progress",
                    userId: req.user.id,
                },
                include: {
                    user: {
                        select: {
                            username: true,
                        },
                    },
                },
            });
            return res.status(200).json({
                message: "Задача взята в работу",
                todo: task,
            });
        } catch (error) {
            next(error);
        }
    },
    completeTask: async (req, res, next) => {
        try {
            const { id } = req.params; //получаем параметр из адресной строки
            const taskId = parseInt(id);

            const task = await prisma.task.update({
                where: { id: taskId },
                data: {
                    status: "done",
                },
                include: {
                    user: {
                        select: {
                            username: true,
                        },
                    },
                },
            });
            return res.status(200).json({
                message: "Задача завершена",
                todo: task,
            });
        } catch (error) {
            next(error);
        }
    },
    deleteTask: async (req, res, next) => {
        try {
            const { id } = req.params; //получаем параметр из адресной строки
            const taskId = parseInt(id);
            await prisma.user.delete({
                where: { id: taskId },
            });
            return res.json({ message: "Задача удалена", id });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = taskController;
