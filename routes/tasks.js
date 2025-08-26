const express = require("express");
const taskController = require("../controllers/taskController");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

//получение всех задач
router.get("/", authenticateToken, taskController.getAllTasks);

//добавление задачи
router.post("/", authenticateToken, requireAdmin, taskController.createTask);

//закрепление задачи за пользователем, задача в работе
router.put("/active/:id", authenticateToken, taskController.takeTask);

//завершение задачи
router.put("/complete/:id", authenticateToken, taskController.completeTask);

//удаление задачи
router.delete(
    "/:id",
    authenticateToken,
    requireAdmin,
    taskController.deleteTask
);

module.exports = router;
