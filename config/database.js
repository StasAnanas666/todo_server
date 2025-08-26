const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function initializeRoles() {
    try {
        const roles = ["admin", "user"];
        for (const role of roles) {
            await prisma.role.upsert({
                where: { role },
                update: {},
                create: { role },
            });
        }
        console.log("Роли инициализированы");
    } catch (error) {
        console.error("Ошибка инициализации ролей: ", error);
    }
}

module.exports = { prisma, initializeRoles };
