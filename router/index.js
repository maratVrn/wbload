const Router = require('express').Router
const wbController = require('../controllers/wb-controller')



const router = new Router()

// Для валидации запросов
// const {body} = require('express-validator')

// Основная функция - обновление данныъ
router.get('/test', wbController.test)         // тестовая функция для отладки

// Сервисные функции

router.get('/deleteZeroID', wbController.deleteZeroID)                  //  удаляем товары которых больше нет на вб для который saleCount стал null


module.exports = router
