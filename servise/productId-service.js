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



}

module.exports = new ProductIdService()
