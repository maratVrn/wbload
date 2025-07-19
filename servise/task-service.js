// Класс заданий на работу сервера по получению и обновлению данных с ВБ
// Основной смысл в том что каждое задание это запись в базе данных , по каждому подзаданию сохраняется информация
// о ходе выполнения задания. Если задание было прервано то можно продолжить выполнять его с момента где оно было остановлено

const sequelize = require("../db");
const {DataTypes, Op, where} = require("sequelize");
const ProductListService = require('../servise/productList-service')
const ProductIdService= require('../servise/productId-service')
const WBService= require('../servise/wb-service')
const {WBCatalog} = require("../models/models");
const {saveErrorLog, saveParserFuncLog} = require("./log");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class TaskService{

    AllTask = sequelize.define('allTask',{
            id              :   {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            taskName        :   {type: DataTypes.STRING},           // Название задачи (соотв фугкции которая его вызывает)
            isEnd           :   {type: DataTypes.BOOLEAN},          // Завершено ли
            startDateTime	:   {type: DataTypes.STRING},           // Стартовое время задания
            taskData        :   {type: DataTypes.JSON},             // Данные по заданию
            taskResult      :   {type: DataTypes.JSON},             // результат выполнения задания

        })

    // НУЖНА ОСНОВНАЯ ЗАДАЧА !!!! ОБновляем информацию по всем товарам в базе - цену и колличество
    async updateAllProductList (needCalcData = false){
        const taskName = 'updateAllProductList'
        let needTask = {}
        let allUpdateCount = 0
        let allDeletedCount = 0

        // Сначала разберемся с задачей - продолжать ли старую или создать новую
        saveParserFuncLog('taskService ', '  ----------  Запускаем задачу updateAllProductList -------')
        try {

            const allNoEndTask = await this.AllTask.findAll({
                where: {isEnd: false, taskName: taskName},
                order: [['id']]
            })

            let currTask = {
                taskName: taskName,
                isEnd: false,
                startDateTime: new Date().toString(),
                taskData: [],
                taskResult: []
            }


            if (allNoEndTask.length > 0) {
                needTask = allNoEndTask[0]
                saveParserFuncLog('taskService ', '  --- Нашли НЕ завершенную задачу с ID '+needTask.id)
            } else {
                const allProductListTableName = await ProductListService.getAllProductListTableName()
                for (let i in allProductListTableName) {
                    const oneTaskData = {
                        tableName: allProductListTableName[i],
                        tableTaskEnd: false,
                        tableTaskResult: ''
                    }
                    currTask.taskData.push(oneTaskData)
                }

                needTask = await this.AllTask.create(currTask)
                saveParserFuncLog('taskService ', '  --- Создали новую задачу с ID '+needTask.id)

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в updateAllProductList при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру  обновления по списку задач
        let taskData = [...needTask.taskData]
        let allTableIsUpdate = true
        for (let i in taskData){

            if (!taskData[i].tableTaskEnd) try {
             // if (i >= 2050) try {
            // if (taskData[i].tableTaskEnd) try {  // Отладка

                console.log(taskData[i].tableName);

                const [updateResult,updateCount, deleteCount]  = await ProductListService.updateAllWBProductListInfo_fromTable2(taskData[i].tableName, needCalcData)


                taskData[i].tableTaskEnd = updateCount >0 ? true : false
                taskData[i].tableTaskResult = updateResult
                await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})

                saveParserFuncLog('taskService ', '--- Обновляем таблицу  '+taskData[i].tableName+'  кол-во  '+updateCount+' удалили '+deleteCount)
                allUpdateCount += updateCount
                allDeletedCount += deleteCount

                await delay(0.005 * 60 * 1000)
            } catch(error) {
                saveErrorLog('taskService',`Ошибка в updateAllProductList при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }
            // break // Отладка
        }
        if (allTableIsUpdate) await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})

        console.log('updateAllProductList isOk');
        saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')

        saveParserFuncLog('taskService ', ' ВСЕГО обновили '+allUpdateCount+ ' удалили '+allDeletedCount)

    }

    // НУЖНА  !!!! Устанавливаем флаг  needUpdate - который потом будем использовать при обновлении товаров
    async setNoUpdateProducts (){
        const taskName = 'deleteZeroProducts'
        let needTask = {}
        let allDeletedCount = 0

        // Сначала разберемся с задачей - продолжать ли старую или создать новую
        saveParserFuncLog('taskService ', '  ----------  Запускаем задачу deleteZeroProducts -------')
        try {

            const allNoEndTask = await this.AllTask.findAll({
                where: {isEnd: false, taskName: taskName},
                order: [['id']]
            })

            let currTask = {
                taskName: taskName,
                isEnd: false,
                startDateTime: new Date().toString(),
                taskData: [],
                taskResult: []
            }


            if (allNoEndTask.length > 0) {
                needTask = allNoEndTask[0]
                saveParserFuncLog('taskService ', '  --- Нашли НЕ завершенную задачу с ID '+needTask.id)
            } else {
                const allProductListTableName = await ProductListService.getAllProductListTableName()
                for (let i in allProductListTableName) {
                    const oneTaskData = {
                        tableName: allProductListTableName[i],
                        tableTaskEnd: false,
                        tableTaskResult: ''
                    }
                    currTask.taskData.push(oneTaskData)
                }

                needTask = await this.AllTask.create(currTask)
                saveParserFuncLog('taskService ', '  --- Создали новую задачу с ID '+needTask.id)

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в deleteZeroProducts при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру  обновления по списку задач
        let taskData = [...needTask.taskData]
        let allTableIsUpdate = true
        for (let i in taskData){

            if (!taskData[i].tableTaskEnd) try {
                console.log(taskData[i].tableName);

                const [allCount, deleteCount]  = await ProductListService.setNoUpdateProducts(taskData[i].tableName)

                // TODO: Отладка
                taskData[i].tableTaskEnd =  true
                taskData[i].tableTaskResult = deleteCount
                await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})

                saveParserFuncLog('taskService ', '--- Удалили из таблицы  '+taskData[i].tableName+' Всего товаров =  '+ allCount+'  удалили  '+deleteCount)
                allDeletedCount += deleteCount

                // await delay(0.0005 * 60 * 1000)

            } catch(error) {
                saveErrorLog('taskService',`Ошибка в deleteZeroProducts при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }
            // break // TODO: Отладка
        }
        // if (allTableIsUpdate) await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},})

        console.log('updateAllProductList isOk');
        saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')

        saveParserFuncLog('taskService ', ' ВСЕГО УДАЛИЛИ  '+allDeletedCount)

    }

    // НУЖНА !!! Сворчиваем данные тк есть много дублирующих записей
    async checkAllProductListData (){
        const taskName = 'checkAllProductListData'
        let needTask = {}

        // Сначала разберемся с задачей - продолжать ли старую или создать новую
        saveParserFuncLog('taskService ', '  ----------  Запускаем задачу checkAllProductListData -------')
        try {

            const allNoEndTask = await this.AllTask.findAll({
                where: {isEnd: false, taskName: taskName},
                order: [['id']]
            })

            let currTask = {
                taskName: taskName,
                isEnd: false,
                startDateTime: new Date().toString(),
                taskData: [],
                taskResult: []
            }


            if (allNoEndTask.length > 0) {
                needTask = allNoEndTask[0]
                saveParserFuncLog('taskService ', '  --- Нашли НЕ завершенную задачу с ID '+needTask.id)
            } else {
                const allProductListTableName = await ProductListService.getAllProductListTableName()
                for (let i in allProductListTableName) {
                    const oneTaskData = {
                        tableName: allProductListTableName[i],
                        tableTaskEnd: false,
                        tableTaskResult: ''
                    }
                    currTask.taskData.push(oneTaskData)
                }

                needTask = await this.AllTask.create(currTask)
                saveParserFuncLog('taskService ', '  --- Создали новую задачу с ID '+needTask.id)

            }

        } catch (error) { saveErrorLog('taskService',`Ошибка в checkAllProductListData  при определении задачи новая или продолжаем `)
            saveErrorLog('taskService', error)}

        // Далее запустим процедуру  обновления по списку задач
        let taskData = [...needTask.taskData]
        let allTableIsUpdate = true
        for (let i in taskData){

            if (!taskData[i].tableTaskEnd) try {
                console.log(taskData[i].tableName);
                console.log('tut1');
                const updateCount  = await ProductListService.checkAllProductListData(taskData[i].tableName)

                //TODO: отладка
                // if (updateCount > 0){
                //     taskData[i].tableTaskEnd = true
                //     taskData[i].tableTaskResult = updateCount
                //     await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id,},})
                // } else allTableIsUpdate = false
                // saveParserFuncLog('taskService ', '--- Обновляем таблицу  '+taskData[i].tableName+'  кол-во'+updateCount)

                await delay(0.02 * 60 * 1000)
            } catch(error) {
                saveErrorLog('taskService',`Ошибка в checkAllProductListData  при обновлении таблицы `+taskData[i].tableName)
                saveErrorLog('taskService', error)
            }
            break //TODO: отладка
        }
        // if (allTableIsUpdate) await this.AllTask.update({isEnd: true}, {where: {id: needTask.id},}) //TODO: отладка

        console.log('checkAllProductListData isOk');
        saveParserFuncLog('taskService ', ' ********  ЗАВЕРШЕНО **************')
    }


    async test(){
        const taskName = 'updateAllProductList'
        const allNoEndTask = await this.AllTask.findAll({
            where: {isEnd: false, taskName: taskName},
            order: [['id']]
        })
        const needTask = allNoEndTask[0]
        let taskData = [...needTask.taskData]
        for (let i in taskData) {
            if (i>105)
            if (taskData[i].tableTaskEnd){
                console.log(taskData[i].tableName+ '  --- >  '+taskData[i].tableTaskResult);
                taskData[i].tableTaskEnd = false
                taskData[i].tableTaskResult = ''

            }


        }
        console.log('test isOk');
        await this.AllTask.update({taskData: taskData,}, {where: {id: needTask.id}})


    }

}

module.exports = new TaskService()
