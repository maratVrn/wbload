// Класс для работы со списком товаров внутри каталога
const sequelize = require("../db");
const {DataTypes, Op} = require("sequelize");
const {saveErrorLog, saveParserFuncLog} = require('../servise/log')
const {PARSER_GetProductListInfo,PARSER_GetProductListInfoAll_fromIdArray, PARSER_GetIDInfo} = require("../wbdata/wbParserFunctions");
const {getDataFromHistory} = require('../wbdata/wbfunk')
const ProductIdService= require('../servise/productId-service')


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ProductListService {

    WBCatalogProductList = sequelize.define('test_ok',{
            id              :   {type: DataTypes.INTEGER, primaryKey: true},
            dtype           :   {type: DataTypes.INTEGER},          // тип склада
            price           :   {type: DataTypes.INTEGER},          // максимальная цена товара
            reviewRating	:   {type: DataTypes.FLOAT},            // Рейтинг товара ПО Обзорам
            subjectId       :   {type: DataTypes.INTEGER},          // ИД Позиции в предмета
            brandId         :   {type: DataTypes.INTEGER},          // ИД Позиции в бренда
            saleCount       :   {type: DataTypes.INTEGER},          // Обьем продаж за последний месяц
            totalQuantity   :   {type: DataTypes.INTEGER},          // Остатки последние
            saleMoney       :   {type: DataTypes.INTEGER},          // Обьем продаж за последний месяц в руб
            priceHistory    :   {type: DataTypes.JSON},             // История изменения цены Берем с первой позиции в sizes basic (БЕЗ скидки) и product	(со скидкой) - все в в ите чтобы проще хранить


        },
        { createdAt: false,   updatedAt: false  }  )

    // WBCatalogProductList_new = sequelize.define('test_ok_new',{
    //         id:{type: DataTypes.INTEGER, primaryKey: true},
    //         isNew:{type: DataTypes.BOOLEAN},             // Новый ли это товар
    //         maxPrice:{type: DataTypes.INTEGER},          // максимальная цена товара
    //         discount:{type: DataTypes.FLOAT},            // текущая скида
    //         subjectId:{type: DataTypes.INTEGER},         // ИД Позиции в предмета
    //         brandId:{type: DataTypes.INTEGER},           // ИД Позиции в бренда
    //         totalQuantity:{type: DataTypes.INTEGER},     // Остатки последние
    //         priceHistory:{type: DataTypes.JSON},         // История изменения цены Берем с первой позиции в sizes basic (БЕЗ скидки) и product	(со скидкой) - все в в ите чтобы проще хранить
    //         countHistory:{type: DataTypes.JSON},         // История кол-ва товаров - берем только totalQuantity
    //
    //     },
    //     { createdAt: false,   updatedAt: false  }  )
// ********************************* Основной этап парсинга карточек товаров с ВБ **************************************



    // ПАРСННГ Глобальная задача - обновляем информацию в выюранноной таблице и там же сохраняем
    // НУЖНА!!!
    async updateAllWBProductListInfo_fromTable2(productList_tableName, needCalcData){
        let updateResult = 'Старт обновления'
        let updateCount = 0
        let deleteCount = 0
        // saveParserFuncLog('updateServiceInfo ', 'Обновляем информацию для таблицы '+productList_tableName)
        try {


            // Второй вариант - Пагинация внутри запросов
            if (productList_tableName) {
                this.WBCatalogProductList.tableName = productList_tableName.toString()
                const endId = await this.WBCatalogProductList.count()-1
                if (endId === -1)  saveParserFuncLog('updateServiceInfo ', 'Нулевая таблица '+productList_tableName.toString())

                // saveParserFuncLog('updateServiceInfo ', ' Обновляем инф-ю про товары, Всего надо обновить товаров '+(endId+1).toString())
                const step = 200_000 //process.env.PARSER_MAX_QUANTITY_SEARCH

                for (let i = 0; i <= endId; i++) {

                    const currProductList = await this.WBCatalogProductList.findAll({ offset: i, limit: step, order: [['id'] ] }) // поиграть с attributes: ['id', 'logo_version', 'logo_content_type', 'name', 'updated_at']
                    console.log(currProductList.length+'  '+currProductList[0].id+'  '+currProductList[currProductList.length-1].id);
                    let saveArray = []          // массив с обновленными данными
                    let deleteIdArray = []      // массив с удаленными товарами


                    const step2 = 500

                    for (let j = 0; j < currProductList.length; j ++) {
                    // for (let j = 27921; j < 27922; j ++) {
                        try {

                            let end_j = j + step2 - 1 < currProductList.length ? j + step2 - 1 : currProductList.length - 1
                            let productList = []

                            for (let k = j; k <= end_j; k++)
                                productList.push(currProductList[k].id)


                            console.log('j = ' + j + '  --  Запросили = ' + productList.length);

                            const updateProductListInfo = await PARSER_GetProductListInfo(productList)
                            const [saveResult,newSaveArray, newDeleteIdArray] = await this.update_AllProductList(currProductList,updateProductListInfo, j, end_j, needCalcData )

                            updateCount += updateProductListInfo.length
                            if (saveResult) saveArray = [...saveArray,...newSaveArray]
                            deleteIdArray = [...deleteIdArray, ...newDeleteIdArray]

                            j += step2 - 1

                        } catch (error) {
                            console.log(error);
                        }
                        // break

                    }


                    i += step-1
                    if (saveArray.length === 0)
                        saveParserFuncLog('updateServiceInfo ', 'Нулевая таблица '+productList_tableName.toString())

                    console.log('Всего нужно обновить ' + saveArray.length);
                    console.log('нужно удалить ' + deleteIdArray.length);
                    deleteCount = deleteIdArray.length
                    if (needCalcData)  await this.WBCatalogProductList.bulkCreate(saveArray,{    updateOnDuplicate: ["price","reviewRating","dtype","totalQuantity","saleCount","saleMoney","priceHistory"]  })
                        else await this.WBCatalogProductList.bulkCreate(saveArray,{    updateOnDuplicate: ["price","totalQuantity","priceHistory"]  })


                    // Удаляем нерабочие ИД-ки
                    await this.WBCatalogProductList.destroy({where: {id: deleteIdArray}})
                    await ProductIdService.checkIdInCatalogID_andDestroy(deleteIdArray, parseInt(productList_tableName.replace('productList','')))


                }

                updateResult = ' isOk, needProduct : ' + (endId+1).toString() + ' , updateProduct : '+updateCount.toString()

            }


        } catch (error) {
            saveErrorLog('productListService',`Ошибка в updateAllWBProductListInfo_fromTable в таблице `+ productList_tableName.toString())
            saveErrorLog('productListService', error)
            console.log(error);
        }

        console.log('updateAllWBProductListInfo_fromTable isOk');
        return [updateResult, updateCount, deleteCount]
    }


    // НУЖНА Проверяем дублирующие записи отдельной позиции
    checkOneProduct (product){
        let needNew = true
        const oneProduct = {
            id              : product.id,
            price           : product.price,
            reviewRating    : product.reviewRating,
            dtype           : product.dtype,
            totalQuantity   : product.totalQuantity,
            priceHistory    : [],
            subjectId       : product.subjectId,
            brandId         : product.brandId,
            saleCount       : product.saleCount,
        }

        needNew = false //
        if (needNew) return oneProduct
            else return null

    }

    // НУЖНА Проверяем дублирующие записи в priceHistory

    // checkAllProductListData
    async checkAllProductListData(productList_tableName){
        let updateCount = 0

        try {
            console.log('tut');
            // Второй вариант - Пагинация внутри запросов
            if (productList_tableName) {
                this.WBCatalogProductList.tableName = productList_tableName.toString()
                updateCount = await this.WBCatalogProductList.count()
                const endId = await this.WBCatalogProductList.count()-1


                const step = 300_000 //process.env.PARSER_MAX_QUANTITY_SEARCH

                for (let i = 0; i <= endId; i++) {

                    const currProductList = await this.WBCatalogProductList.findAll({ offset: i, limit: step, order: [['id'] ] }) // поиграть с attributes: ['id', 'logo_version', 'logo_content_type', 'name', 'updated_at']
                    console.log(currProductList.length);
                    // let saveArray = await this.update_AllProductList(currProductList,updateProductListInfo, j, end_j )
                    let saveArray = []
                    for (let j in currProductList){

                        console.log(currProductList[j].priceHistory);
                        const OneProduct = this.checkOneProduct(currProductList[j])
                        if (OneProduct) saveArray.push(OneProduct)
                        console.log('saveArray' + saveArray);
                        break //TODO: отладка
                    }

                    i += step-1

                    // Далее сохраним все товары
                    // await this.WBCatalogProductList.bulkCreate(saveArray,{    updateOnDuplicate: ["maxPrice","price","reviewRating","discount","totalQuantity","priceHistory","countHistory"]  })

                }



                saveParserFuncLog('updateServiceInfo ', ' Загрузили товаров, подготавливаем и сохранили,   всего '+updateCount)

            }


        } catch (error) {
            saveErrorLog('productListService',`Ошибка в checkAllProductListData `)
            saveErrorLog('productListService', error)
            console.log(error);
        }
        saveParserFuncLog('updateServiceInfo ', ' ********  ЗАВЕРШЕНО **************')

        return  updateCount
    }

    async moveWBProductListInfo_toTableAll(productList_tableName){
        let moveCount = 0
        try {


            if (productList_tableName) {
                this.WBCatalogProductList.tableName = productList_tableName.toString()
                const endId = await this.WBCatalogProductList.count()-1

                const step = 300_000 //process.env.PARSER_MAX_QUANTITY_SEARCH

                for (let i = 0; i <= endId; i++) {
                    const currProductList = await this.WBCatalogProductList.findAll({ offset: i, limit: step, order: [['id'] ] }) // поиграть с attributes: ['id', 'logo_version', 'logo_content_type', 'name', 'updated_at']
                    moveCount = await this.WBCatalogProductList.count()
                    console.log(moveCount);

                    this.WBCatalogProductList.tableName = process.env.MASTER_PRODUCT_LIST_TABLE
                    // console.log(currProductList);
                    await this.WBCatalogProductList.sync({ alter: true })
                    // await this.WBCatalogProductList.bulkCreate(currProductList)
                    let newProduct = []
                    for (let j in currProductList) {
                        const one = {
                            id: currProductList[j].id,
                            price: currProductList[j].price,
                            reviewRating: currProductList[j].reviewRating,
                            subjectId: currProductList[j].subjectId,
                            brandId: currProductList[j].brandId,
                            dtype: currProductList[j].dtype,
                            totalQuantity: currProductList[j].totalQuantity,
                            priceHistory: currProductList[j].priceHistory,
                            countHistory: currProductList[j].countHistory,
                        }
                        newProduct.push(one)
                    }
                    await this.WBCatalogProductList.bulkCreate(newProduct,  { ignoreDuplicates: true })



                    this.WBCatalogProductList.tableName = productList_tableName.toString()

                    i += step-1


                }



            }


        } catch (error) {
            console.log(error);
        }
        this.WBCatalogProductList.tableName = process.env.MASTER_PRODUCT_LIST_TABLE
        // console.log(currProductList);
        await this.WBCatalogProductList.sync({ alter: true })
        const newCount = await this.WBCatalogProductList.count()
        return [moveCount, newCount]
    }


    // Обновляем информацию в сущетсвующей таблице и сохраняем изменные  товары в базе данных
    //НУЖНА!!!
    async update_AllProductList (allProductList,updateProductListInfo, startI, endI , needCalcData = false){
        let saveResult = false
        let newDeleteIdArray = []
        let saveArray = []
        if (updateProductListInfo.length>0)
        try {
            // Сначала создадим Обновленный массив с данными

            for (let i = startI; i <= endI; i ++) {
                try {
                    const oneProduct = {
                        id              : allProductList[i]?.id ? allProductList[i].id : 0,
                        price           : allProductList[i]?.price ? allProductList[i].price : 0,
                        dtype           : allProductList[i]?.dtype ? allProductList[i].dtype : 0,
                        reviewRating    : 0,
                        totalQuantity   : 0,
                        saleMoney       : 0,
                        saleCount       : 0,
                        priceHistory    : allProductList[i]?.priceHistory ? allProductList[i]?.priceHistory : [],
                        // TODO: Добавил эти поля для отладки
                        kindId	        : allProductList[i]?.kindId ? allProductList[i].kindId : 0,
                        subjectId       : allProductList[i]?.subjectId ? allProductList[i].subjectId : 0,
                        brandId         : allProductList[i]?.brandId ? allProductList[i].brandId : 0,
                    }


                    let inUpdateData = false
                    for (let j in updateProductListInfo)
                        if (oneProduct.id === updateProductListInfo[j].id) {

                            try {
                                // console.log('ид '+oneProduct.id);
                                // console.log('Было');
                                // console.log(oneProduct.priceHistory);
                                const oldHistory = oneProduct.priceHistory.at(-1)
                                // Проверим совпадают ли значения - если ДА то удалим последний элемент
                                if (oldHistory) {
                                    if ((oldHistory.q === updateProductListInfo[j]?.priceHistory[0].q) &&
                                        (oldHistory.sp === updateProductListInfo[j]?.priceHistory[0].sp)) {

                                        if (oldHistory.q > 0) { 
                                            oneProduct.priceHistory.pop()
                                        }
                                    }
                                    // Дата задвоилась
                                    if ((oldHistory.d === updateProductListInfo[j]?.priceHistory[0].d) &&
                                        (oldHistory.q >0 )) {
                                            oneProduct.priceHistory.pop()
                                    }
                                }
                                if (updateProductListInfo[j]?.totalQuantity > 0)
                                    oneProduct.priceHistory.push(updateProductListInfo[j]?.priceHistory[0])
                                if ((updateProductListInfo[j]?.totalQuantity === 0) && (oldHistory.q > 0))
                                    oneProduct.priceHistory.push(updateProductListInfo[j]?.priceHistory[0])
                                //
                                // console.log('Стало');
                                // console.log(oneProduct.priceHistory);

                                oneProduct.totalQuantity = updateProductListInfo[j]?.totalQuantity ? updateProductListInfo[j]?.totalQuantity : 0
                                oneProduct.dtype = updateProductListInfo[j]?.dtype>0 ? updateProductListInfo[j]?.dtype : oneProduct.dtype
                                oneProduct.reviewRating = updateProductListInfo[j]?.reviewRating ? updateProductListInfo[j]?.reviewRating : 0
                                oneProduct.kindId = updateProductListInfo[j]?.kindId ? updateProductListInfo[j]?.kindId : 0

                                // Если нужно обновлять расчет за последние 30 дней (тк это занимает время делаем не постоянно)
                                if (needCalcData) {

                                    let isFbo =  oneProduct.dtype === 4
                                    const saleInfo = getDataFromHistory(oneProduct.priceHistory,
                                        updateProductListInfo[j].price, updateProductListInfo[j].totalQuantity, 30,isFbo, false )
                                    oneProduct.saleMoney = saleInfo.totalMoney
                                    oneProduct.saleCount = saleInfo.totalSaleQuantity

                                    // TODO: тут обнаружены аномалии - обьем продаж может быть очень большим что говорит о левых записях в бд
                                    // пока просто сохраним данные об этом ID и поставим saleMoney в опр число
                                    if (oneProduct.saleMoney > 1_111_111_111){
                                        oneProduct.saleMoney = 0
                                        oneProduct.saleCount = 0
                                        saveParserFuncLog('unomalId ', 'Аномальные данные в ID '+oneProduct.id)
                                    }
                                }






                                if (updateProductListInfo[j]?.totalQuantity > 0) {
                                    if (updateProductListInfo[j]?.price > 0) {
                                        oneProduct.price = updateProductListInfo[j].price
                                    }
                                }

                            }  catch (error) {}
                            inUpdateData = true
                            saveArray.push(oneProduct)

                        }

                    if (!inUpdateData) {
                        // saveErrorLog('noUpdateListID', oneProduct.id.toString())
                        newDeleteIdArray.push(oneProduct.id)
                    }

                } catch (error) {
                    console.log(error);
                }

            }
            saveResult = true
        } catch (error) {
            saveErrorLog('productListService',`Ошибка в update_and_saveAllProductList`)
            saveErrorLog('productListService', error)
            console.log(error)
        }
        return  [saveResult,saveArray, newDeleteIdArray]
    }

    // Проверяем наличие таблицы в базе данных по catalogId и создаем/обновляем параметры таблицы
    async checkTableName (catalogId){
        let result = false
        try {
            if (catalogId)
                if (parseInt(catalogId))
                    if (parseInt(catalogId) > 0) {
                        this.WBCatalogProductList.tableName ='productList'+ catalogId.toString()
                        //проверим существует ли таблица // либо создадим таблицу либо обновим ее поля
                        await this.WBCatalogProductList.sync({ alter: true })
                        result = true
                    }
            if (parseInt(catalogId) === 0) {

                this.WBCatalogProductList.tableName = 'productListNOID'
                //проверим существует ли таблица // либо создадим таблицу либо обновим ее поля
                await this.WBCatalogProductList.sync({alter: true})
                result = true
            }

        } catch (error) {
            saveErrorLog('productListService',`Ошибка в checkTableName при catalogId = `+catalogId.toString())
            saveErrorLog('productListService', error)
        }
        return result
    }


    // Получим список имен всех таблиц
    async getAllProductListTableName(){
        let allProductListTableName = []
        try {

            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('productList'))  {
                        allProductListTableName.push(tableName.toString())
                    }
                }
        } catch (error) {
            saveErrorLog('productListService',`Ошибка в getAllProductListTableName `)
            saveErrorLog('productListService', error)
        }

        console.log('getAllProductListTableNameAndTask isOk');
        return allProductListTableName
    }

    // НУЖНА!!! // Удаление всех таблиц productList
    async deleteAllProductListTable(){

        saveParserFuncLog('productListService ', 'Старт удаления всех таблиц productList  --deleteAllProductListTable-- ')
        try {

            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('productList') && !tableName.toString().includes(process.env.MASTER_PRODUCT_LIST_TABLE))  {
                        this.WBCatalogProductList.tableName = tableName.toString()
                        console.log(this.WBCatalogProductList.tableName);
                        await this.WBCatalogProductList.drop()
                    }
                }


        } catch (error) {
            saveErrorLog('productListService',`Ошибка в deleteAllProductListTable `)
            saveErrorLog('productListService', error)
        }
        saveParserFuncLog('productListService ', ' ******** УДАЛЕНИЕ ЗАВЕРШЕНО **************')
        console.log('isOk');

    }

    // НУЖНА!!! // Колл-во всех товаров в базе в productList
    async getAllProductCount(){
        let allCount = 0
        saveParserFuncLog('listServiceInfo ', 'Собираем кол-во всех товаров в   --productList-- ')
        try {



            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('productList') && !tableName.toString().includes('new'))  {

                        this.WBCatalogProductList.tableName = tableName.toString()
                        const count = await this.WBCatalogProductList.count()

                        allCount += count
                    }
                }
            saveParserFuncLog('listServiceInfo ', 'Общее кол-во товаров '+allCount)
            console.log('Общее кол-во товаров ' + allCount);

        } catch (error) {
            saveErrorLog('productListService',`Ошибка в getAllProductCount`)
            saveErrorLog('productListService', error)
            console.log(error);
        }

        console.log('isOk');
        return allCount

    }

    // НУЖНА!!!// Сохраняем информацию обо всех таблицах productList - название и сколько товара загружено
    async getAllProductListInfo(){

        saveParserFuncLog('listServiceInfo ', 'Собираем инфомрацию обо всех разделах  --productList-- ')
        try {
            let allCount = 0
            let minQuantityCount = 0

            const allTablesName = await sequelize.getQueryInterface().showAllTables()
            if (allTablesName)
                for (let i in allTablesName) {
                    const tableName = allTablesName[i]

                    if (tableName.toString().includes('productList') && !tableName.toString().includes('new'))  {

                        this.WBCatalogProductList.tableName = tableName.toString()
                        const count = await this.WBCatalogProductList.count()
                        console.log(i);

                        allCount += count
                        saveParserFuncLog('listServiceInfo ', 'Таблица '+tableName.toString()+' кол-во записей '+count )
                    }
                }
            saveParserFuncLog('listServiceInfo ', 'Общее кол-во таблиц '+allTablesName.length+' Общее кол-во записей '+allCount)

        } catch (error) {
            saveErrorLog('productListService',`Ошибка в getAllProductListInfo `)
            saveErrorLog('productListService', error)
            console.log(error);
        }
        saveParserFuncLog('listServiceInfo ', ' ********  ЗАВЕРШЕНО **************')

        console.log('isOk');

    }

    // Копируем таблицу productList в productListХХХ_copy для тестовых работ
    async setProductListTableCopy (tableId){

        const isTable = await this.checkTableName(tableId)

        if (isTable) try {
            const productList  = await this.WBCatalogProductList.findAll({order: [['id'] ]})
            let copyProductList = []
            for (let i in productList)
                copyProductList.push(productList[i].dataValues)

            this.WBCatalogProductList.tableName ='productList'+ tableId.toString()+'_copy'
            //проверим существует ли таблица // либо создадим таблицу либо обновим ее поля
            await this.WBCatalogProductList.drop()
            await this.WBCatalogProductList.sync({ alter: true })
            await this.WBCatalogProductList.bulkCreate(copyProductList)
        }

        catch (error) {
                    saveErrorLog('productListService',`Ошибка в setProductListTableCopy tableId`+tableId)
                    saveErrorLog('productListService', error)
                    console.log(error);
                }

        console.log('setProductListTableCopy isOk');
    }

    // Проверяет сущетсвует ли ид в таблице catalogId
    async checkId(id, catalogId){
        const isTable = await this.checkTableName(catalogId)
        let result = false
        if (isTable) try {
            const data = await this.WBCatalogProductList.findOne({where: {id: id}})
            if (data) result = true
        }

        catch (error) {
            saveErrorLog('productListService',`Ошибка в checkId tableId `+catalogId+'  id = '+id)
            saveErrorLog('productListService', error)
            console.log(error);
        }

        return result
    }

    // Проверяет сущетсвует ли список ид в таблице catalogId и возвращает те ИД которых там нет!
    async checkIdArray(idArray, catalogId){
        const isTable = await this.checkTableName(catalogId)
        let result = []
        if (isTable) try {
            const data = await this.WBCatalogProductList.findAll({ where: { id: { [Op.in]: idArray } }, order: [['id'] ] })
            for (let i in idArray){
                let isInData = false
                for (let j in data){
                    if (idArray[i] === data[j].id){
                        isInData = true
                        break
                    }
                }
                if (!isInData) result.push(idArray[i])
            }
        }

        catch (error) {
            saveErrorLog('productListService',`Ошибка в checkIdArray tableId `+catalogId)
            saveErrorLog('productListService', error)
            console.log(error);
        }

        return result
    }


    // Тестовая функция
    async test (){

        let testResult = ['tut 1']
        this.WBCatalogProductList.tableName = 'productList8130'
        await this.WBCatalogProductList.sync({ alter: true })
        const res = await this.WBCatalogProductList.findOne({where: {id: 1431296}})

        const saleInfo = get30DaysSaleInfoFromHistory(res.priceHistory, res.price, res.totalQuantity)
        console.log(saleInfo);
        console.log('isOk');
        return testResult
    }

    // удаляем товары которых больше нет на вб по ним saleCount равно null
    // НУЖНА
    async deleteZeroID() {
        let allIdToDeleteCount = 0
        const allTablesName = await sequelize.getQueryInterface().showAllTables()
        if (allTablesName)
            for (let i = 0; i < allTablesName.length; i ++)
            {
                try {
                    const tableName = allTablesName[i]
                    if (tableName.toString().includes('productList') && !tableName.toString().includes('all')) {

                        this.WBCatalogProductList.tableName = tableName
                        console.log(i + '  ' + tableName);

                        const data = await this.WBCatalogProductList.findAll({where: {saleCount: null}})
                        if (data.length > 0) {
                            allIdToDeleteCount += data.length
                            const IdList = []
                            for (let j in data) IdList.push(data[j].id)

                            console.log('    ------------Удаляем   ' + data.length);
                            await ProductIdService.deleteZeroID(IdList)
                            await this.WBCatalogProductList.destroy({where: {id: IdList}})
                        }
                    }
                    // if (i > 5) break
                } catch (e) {   console.log(e);  }
            }
        return allIdToDeleteCount
    }


    async getProductInfo(idInfo){

        let result = []

        if (idInfo.catalogId) {
            const isTable = await this.checkTableName(idInfo.catalogId)

            if (isTable)
                if (idInfo.id)
                    try {
                        const id = parseInt(idInfo.id)
                        const data = await this.WBCatalogProductList.findOne({where: {id:id}})
                        if (data) result = data
                    }

                    catch (error) {console.log(error);  }
        }

        return result
    }



}

module.exports = new ProductListService()
