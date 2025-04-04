const sequelize = require("../db");
const {DataTypes} = require("sequelize");
const { Op } = require("sequelize");
const {saveErrorLog, saveParserFuncLog} = require("./log");
const {WBAllSubjects} = require("../models/models");
const ProductListService = require('./productList-service')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const ID_STEP_FOR_ONE_TABLE = 1_000_000

// ********************************************************************************************************************
//                                  СЕРВИС РАБОТЫ СО СПИСКОМ ВОЗМОЖНЫХ ИД НА ВБ
//      Идея в том что мы храним много разных таблиц  wb_productIdList + Индекс от 1 и до 250
//      В Каждой таблице по ID_STEP_FOR_ONE_TABLE (1 млн) млн записей
//      Соотв таблицеа с nameIdx = 5 означает что в ней ид от 4_000_001 до 5_000_000 ИД-ков
//      Серввис позволяет создавать таблицы
// ********************************************************************************************************************



class ProductIdService {

    WBProductIdTable = sequelize.define('test',{
            id:{type: DataTypes.INTEGER, primaryKey: true},  // Соответсвует id карточки товара
            catalogId :{type: DataTypes.INTEGER},            // Ид каталога в который входит этот товар
        },
        { createdAt: false, updatedAt: false }
    )


    // удаляем товары которых больше нет на вб
    async deleteZeroID (idList){
        this.WBProductIdTable.tableName ='wb_productIdListAll'
        await this.WBProductIdTable.sync({ alter: true })
        await this.WBProductIdTable.destroy({ where: { id: idList }})

    }


    // Проверяем соответсвуют ли ид-ки нужному каталогу catalogId и УДАЛЯЕМ только то которые соответсвуют
    // Используется перед удалением нерабочих на ВБ ИД-ков чтобы не удалить те которые пристутсвуют в другом каталог ИД
    async checkIdInCatalogID_andDestroy (idList, catalogId){

        // saveErrorLog('deleteId_'+catalogId.toString(), '    ---------------------------------------------         ')
        //
        // let idListString = ''
        // for (let j in idList) idListString += idList[j].toString()+' '
        // saveErrorLog('deleteId_'+catalogId.toString(), 'Полный список на удаление всего '+idList.length)
        // saveErrorLog('deleteId_'+catalogId.toString(),idListString)


        this.WBProductIdTable.tableName ='wb_productIdListAll'
        await this.WBProductIdTable.sync({ alter: true })
        const needId = await this.WBProductIdTable.findAll({ where: { id: idList }})
        let idToDelete = []
        for (let i in needId)
            if (needId[i].catalogId === catalogId) idToDelete.push(needId[i].id)

        // idListString = ''
        // for (let j in idToDelete) idListString += idToDelete[j].toString()+' '
        // saveErrorLog('deleteId_'+catalogId.toString(), 'Список на удаление в wb_productIdListAll всего '+idToDelete.length)
        // saveErrorLog('deleteId_'+catalogId.toString(),idListString)

        await this.WBProductIdTable.destroy({where: {id: idToDelete}})
        return 'isOk'
    }

}

module.exports = new ProductIdService()
