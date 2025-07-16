const fs = require("fs");
const noIdCatalogInclude = [1234, 131289, 61037, 1235]



async function saveProductLIstInfoToCVS(productList,productListInfo ){


    let filteredNumbers =  [].concat(productList);
    let jsonData = ''
    let jsonDataNull = ''

    // Подготовим списки на сохранение данных
    for (let i in productListInfo){
        //  получим список ид на которые не нашлось информации
        filteredNumbers = filteredNumbers.filter((id) => id !== parseInt(productListInfo[i].id));
        const addLine = productListInfo[i].id+'\t'+productListInfo[i].subjectId+'\t'+ productListInfo[i].totalQuantity+`\n`

        if (parseInt(productListInfo[i].totalQuantity)>process.env.MIN_TOTAL_QUANTITY) jsonData += addLine // Если кол-во больше нуля то это живая карточка товара
            else jsonDataNull += addLine // Если меньше то неактивная

    }
    const header = `id\tsubjectId\ttotalQuantity\n`

    // console.log(jsonDataNull);

    const fs = require('fs');

    // Сохраним живые карточки товаров
    const productFileName = "products.cvs"
    fs.stat( productFileName, (error, stats) => {
        // fs.appendFileSync(productFileName + ".cvs", header, function(err) { })
        fs.appendFileSync(productFileName + ".cvs", jsonData, function(err) { if (err) {   console.log(err);}  });
    })

    // Сохраним карточки с нулевыми остатками
    const productFileNameNull = "productsNull.cvs"
    fs.stat( productFileNameNull, (error, stats) => {
        // fs.appendFileSync(productFileNameNull + ".cvs", header, function(err) { })
        fs.appendFileSync(productFileNameNull + ".cvs", jsonDataNull, function(err) { if (err) {   console.log(err);}  });
    })

    // Сохраним не используемые ид
    const productFileNameNoId = "productsNoId.cvs"
    fs.stat( productFileNameNoId, (error, stats) => {

        fs.appendFileSync(productFileNameNoId + ".cvs", filteredNumbers.toString()+',', function(err) { if (err) {   console.log(err);}  });
    })


}



// Обрабатываем JSON ответ с сайта ВБ - и сохраняем в в формате cvs строки с заголовокм `id (Артикул)\tНазвание\tЦена\tСкидка\tЦена со скидкой\n` в файле
// data - входящие данные для парсинга
// fName - имя файла в котором сохзраняем данные





// Сохранение данных в файлу при загрузке данных
async function saveProductListToCVSFromLoadData(data, fName, brandName){
    const fileName = fName + '.cvs'

    let jsonData = ''


    for (var key in data)
        // TODO: Тут руслан просил только те кто не со склада вб выгрузить поэтому не все сохраняет
        if (parseInt(data[key].dtype) !== 2)
            jsonData += data[key].id+'\t'+data[key].subjectId+'\t'+ data[key].dtype+'\t'+data[key].promoTextCard  +'\t'+
                    parseInt(data[key].priceU)+'\t'+data[key].sale+'\t'+ parseInt(data[key].salePriceU) +`\n`


    // jsonData += data[key].id+'\t'+data[key].name+'\t'+ parseInt(data[key].priceU)+'\t'+data[key].sale+'\t'+ parseInt(data[key].salePriceU)+
        //     '\t' + data[key].dtype+'\t'+data[key].brandId+'\t'+brandName+'\t'+data[key].subjectId+'\t'+data[key].totalQuantity+`\n`

    fs.stat(String(fileName), (error, stats) => {
       try {
           stats.isFile()
       } catch {
           // const header = `id (Артикул)\tНазвание\tЦена\tЦена со скидкой\tСкидка\tdtype\tbrandId\tБрэнд\tsubjectId\ttotalQuantity\n`
           const header = `id товара\tid предмета\tdtype\tАкция\tЦена\tЦена со скидкой\tСкидка\n`

           fs.appendFileSync(String(fileName) , header, function(err) {

           })
       }

        fs.appendFileSync(String(fileName),  jsonData, function(err) {
            if (err) {
                console.log(err);
            }
        });
    })
}
async function saveProductLIstToCVS(data, fName, dtype){

    const fs = require('fs');

    console.log('savetofile '+dtype.toString());
    let jsonData = ''
    let allData = dtype.toString()
    for (var key in data) {

        const addLine = data[key].id+'\t'+data[key].name+'\t'+ parseInt(data[key].priceU)+'\t'+data[key].sale+'\t'+ parseInt(data[key].salePriceU)+`\n`
        if (allData === 'null') {
            jsonData += addLine
        } else {
            if (allData === 'true') if (data[key].dtype) jsonData += addLine
            if (allData === 'false') if (!data[key].dtype) jsonData += addLine
        }
    }



    fs.stat(String(fName) + ".cvs", (error, stats) => {
        try {
            stats.isFile()
        } catch {
            const header = `id (Артикул)\tНазвание\tЦена\tСкидка\tЦена со скидкой\n`
            fs.appendFileSync(String(fName) + ".cvs", header, function(err) {

            })
        }
        fs.appendFileSync(String(fName) + ".cvs", jsonData, function(err) {
            if (err) {
                console.log(err);
            }
        });
    })


}

// Подготоваливаем лайт верисю каталога для быстрой передачи на фронт
function getLiteWBCatalogFromData(data) {
    const rezult = []
      // Список разделов который не включаем в лайт каталог типа Сертификаты , экспрес доставка и Путешествия, тренд

    for (let i in data) {
        if (!noIdCatalogInclude.includes(data[i]?.id)) {
            const d1 = { id: data[i]?.id,  name : data[i]?.name,  childs: [] }

            if (data[i]?.childs)
                for (let j in data[i].childs){
                    const crCat2 = data[i].childs[j]
                    const d2 = {  id: crCat2?.id,  name : crCat2?.name, childs: [] }

                    if (crCat2.childs){

                        for (let k in data[i].childs[j].childs){
                            const crCat3 = data[i].childs[j].childs[k]
                            const d3 = {   id: crCat3?.id,  name : crCat3?.name, childs: []  }

                            if(crCat3.childs) {
                                for (let l in data[i].childs[j].childs[k].childs) {
                                    const crCat4 = data[i].childs[j].childs[k].childs[l]
                                    const d4 = {id: crCat4?.id, name: crCat4?.name, childs: []}

                                    if(crCat4.childs) {

                                        for (let z in crCat4.childs) {
                                            const crCat5 = crCat4.childs[z]
                                            const d5 = {id: crCat5?.id, name: crCat5?.name}
                                            d4.childs.push(d5)
                                        }
                                    }

                                    d3.childs.push(d4)
                                }
                            }

                            d2.childs.push(d3)   }

                    }
                    d1.childs.push(d2)
                }
            rezult.push(d1)

        }

    }



    return rezult
}

// Собираем ID по списку каталогов чтобы использовать для бытсрого поиска в дальнейшем
function getIDListFromProductList(data){
    const idList = []
    for (let i in data) {
        if (data[i]?.id) idList.push(data[i]?.id)
    }
    return idList
}

function getDataFromHistory (history, endPrice, totalQuantity, daysCount = 30, isFbo = false, all2025Year = false ){
    let dayCount = daysCount
    if (all2025Year){

        const nowDay = new Date(Date.now())

        const dateStart = new Date(2025, 0, 0)
        dayCount  = Math.round((nowDay.getTime() - dateStart.getTime())/(1000 * 60 * 60 * 24));

    }

         // История загр с БД

    let saleArray = []                                // Массив продаж
    let returnArray = []                              // массив возвратов
    let salePriceArray = []                           // Массив изм-я цены
    let addQuantityArray = []                         // Массив поступлений
    let totalSaleQuantity = 0                       // Общее кол-во продаж за период
    let totalMoney = 0                              // Общий оборот за период
    let addSQ = 0                                   // Сколько пришло на склад если это поступление
    let crDate = new Date()
    let realDayCounter = -1
    let isBigQuantity = false

    if (history?.length >0) {
        let arIdx = -1
        let isError = false
        let sp = 0
        let q = 0
        let sq = 0
        let counter = 0
        for (let i = dayCount; i > 0; i--) {
            counter ++
            // Сначала возмем отчетный день - последний
            if (i === dayCount) {
                crDate = new Date();
                q = totalQuantity
                sp = endPrice

                sq = 0
                arIdx--

            } else {
                crDate.setDate(crDate.getDate() - 1);
                addSQ = 0
                // Если послдений день истории
                if (Math.abs(arIdx) >  history.length){
                    sq = 0
                    q = 0
                    sp = 0
                    if (realDayCounter<0) realDayCounter = counter
                }

                if (Math.abs(arIdx) <=  history.length){

                    let d_tmp =  history.at(arIdx).d
                    sq = 0
                    // проверим есть ли дата внутри
                    if (crDate.toLocaleDateString() === d_tmp){
                        sq = history.at(arIdx).q - q
                        q = history.at(arIdx).q
                       // if (q>39000) isBigQuantity = true
                        // Если отрицательное кол-во продаж то возможно это поступление! выясним это
                        if (sq < 0){
                            const absSQ = -1*sq

                            // Если минус больше 5 или остатки ДО .. то это поступление иначе возврат
                            if ((absSQ >= q-2) || (absSQ>3)) {
                                addSQ = absSQ
                                sq = 0
                            }
                        }
                        if (history.at(arIdx).sp>0) {
                            sp = history.at(arIdx).sp

                        }
                        arIdx--
                    }
                }
            }

            if (Math.abs(arIdx)-1 <=  history.length){
                if (sp>0) salePriceArray.push(sp)
                else salePriceArray.push(null)
            } else { salePriceArray.push(null)

                q = 0}

            if (sq>0){ saleArray.push(sq)
                returnArray.push(0)}
            else {saleArray.push(0)
                returnArray.push( -1*sq)}

            addQuantityArray.push(addSQ)

            if (isError) break
        }

     }



    saleArray.push(0)

    saleArray = saleArray.reverse()
    salePriceArray = salePriceArray.reverse()
    addQuantityArray = addQuantityArray.reverse()
    returnArray = returnArray.reverse()


// КРУТОЙ АЛГОРИТМ ОПРЕДЕЛЕНИЯ ЛЕВЫХ ПРОДАЖ


    if (realDayCounter < 0) realDayCounter = saleArray.length
    // Вычисления делаем только если не было больших аномальных остатков, если аномальные остатки обнуляем продажи
    if ((isBigQuantity) || (realDayCounter<5)){
        for (let i in saleArray) saleArray[i] = 0
    }
    else
    {
        let saleData = []
        try {
            for (let i in saleArray)
                if (i > 0) saleData.push({i: i, q: saleArray[i], meanQ: 0,})
            // отсортируем по возрастанию колличества
            saleData.sort(function (a, b) {
                return a.q - b.q;
            });
            let addQCount = 0
            for (let i in addQuantityArray) if (addQuantityArray[i] > 0) addQCount++
            let returnCount = 0
            for (let i in returnArray)  if (returnArray[i] > 0) returnCount++

            let z = saleData.length - Math.round((realDayCounter-addQCount-returnCount) / 2)

            let meanQ = saleData[z].q > 0 ? saleData[z].q : 1
            for (let i in saleData) {
                saleData[i].meanQ = Math.round(10000 * (saleData[i].q - meanQ) / meanQ) / 100
                if (saleData[i].meanQ > 3990) saleArray[saleData[i].i] = 0
            }
        } catch (e) { console.log(e);}
        // console.log(saleData);

        // Добавим продажи в тот день когда были поступления
        // Сначала вычислим средние продажи БЕЗ поступлений
        try {
            let tsq = 0
            let qCount = 0
            for (let i in saleArray) {
                if (saleArray[i] >= 0) {
                    let q = saleArray[i]
                    if (returnArray[i]) q -= returnArray[i]
                    tsq += q
                    qCount++

                }
            }
            if (qCount > 0) tsq = Math.round(tsq / qCount)
            let onePercent = tsq / 100
            tsq = Math.round(tsq * 0.8)
            // Далее добавим продажи (и увеличим сами поступления в эти дни)
            qCount = 0
            for (let i in addQuantityArray) {
                if (addQuantityArray[i] > 0) {
                    let i_q = parseInt(i) + 1
                    if (i_q < saleArray.length) {
                        let a = Math.round(tsq + onePercent * qCount);
                        saleArray[i_q] = a
                        addQuantityArray[i] += a
                        qCount++
                    }
                }
            }

        } catch (e) { console.log(e);}

        // Расчитаем обьемы продаж
        for (let i in saleArray) {
            if (saleArray[i] >= 0) {
                let q = saleArray[i]
                if (returnArray[i]) q -= returnArray[i]
                totalSaleQuantity += q
                if (salePriceArray[i]) totalMoney += q * salePriceArray[i]
            }
        }

    }

    if (totalSaleQuantity <= 0) {
        totalSaleQuantity = 0
        totalMoney = 0
    }


    const resultData = {
        totalSaleQuantity : totalSaleQuantity,
        totalMoney : totalMoney,

    }


    return resultData
}

// Удалить
function get30DaysSaleInfoFromHistory (history, endPrice, totalQuantity){

    let totalSaleQuantity = 0                       // Общее кол-во продаж за период
    let totalMoney = 0                              // Общий оборот за период

    const dayCount = 30
    let crDate = new Date()
    if (history?.length >0) {

        let arIdx = -1
        let d = ''
        let sp = 0
        let q = 0
        let sq = 0
        let counter = 0
        for (let i = dayCount; i > 0; i--) {
            counter ++
            // Сначала возмем отчетный день - последний
            if (i === dayCount) {
                crDate = new Date();
                q = totalQuantity
                sp = endPrice

                sq = 0
                arIdx--

            } else {
                crDate.setDate(crDate.getDate() - 1);

                // Если послдений день истории
                if (Math.abs(arIdx) >  history.length){
                    sq = 0
                    q = 0
                    sp = 0
                }

                if (Math.abs(arIdx) <=  history.length){

                    let d_tmp = d = history.at(arIdx).d
                    sq = 0
                    // проверим есть ли дата внутри
                    if (crDate.toLocaleDateString() === d_tmp){
                        sq = history.at(arIdx).q - q
                        q = history.at(arIdx).q
                        // Если отрицательное кол-во продаж то возможно это поступление! выясним это

                        if (sq < 0){
                            const absSQ = -1*sq
                            // Если минус больше 5 или остатки ДО .. то это поступление иначе возврат
                            if ((absSQ >= q-2) || (absSQ>5)) {

                                sq = 0
                            }

                        }
                        // console.log(d_tmp+ ' sq ' + sq + ' sp '+sp);
                        totalSaleQuantity += sq
                        totalMoney += sq*sp
                        // console.log(d_tmp + 'totalSaleQuantity = '+totalSaleQuantity+' totalMoney = '+totalMoney);
                        if (history.at(arIdx).sp>0) {
                            sp = history.at(arIdx).sp

                        }
                        arIdx--
                    }
                }

            }
        }
    }
    if (totalSaleQuantity<0) totalSaleQuantity = 0
    if (totalMoney<0) totalMoney = 0
    if (totalSaleQuantity === 0 ) totalMoney = 0
    const resultData = {
        totalSaleQuantity : totalSaleQuantity,
        totalMoney : totalMoney,
    }

    return resultData
}

// Формируем список разделов каталога с учетом подразделов до 5-й ступени вложенности
function getCatalogData (catalog){
    let catalogData = []


    for (let i in catalog)
        if (!noIdCatalogInclude.includes(catalog[i]?.id)){

        if (catalog[i]?.childs)
            for (let j in catalog[i].childs){


                // Если у раздела есть дети то изем в них если нету то в самом разделе
                const crCat =catalog[i]?.childs[j]?.childs
                if (crCat?.length > 0) {

                    for (let k in crCat){
                        if (crCat[k].childs) {

                            const crCat2 = crCat[k].childs
                            for (let l in crCat2) {
                                if (crCat2[l].childs) {
                                    const crCat3 = crCat2[l].childs
                                    for (let z in crCat3) {
                                        const oneData = {id: crCat3[z]?.id, catalogParam: {shard: crCat3[z].shard, query: crCat3[z].query}  }
                                        catalogData.push(oneData)
                                    }


                                } else {
                                    const oneData = {id: crCat2[l]?.id, catalogParam: {shard: crCat2[l].shard, query: crCat2[l].query}  }
                                    catalogData.push(oneData)
                                }
                            }

                        }
                        else
                            { const oneData = { id: crCat[k]?.id, catalogParam: {shard: crCat[k].shard, query: crCat[k].query} }
                                catalogData.push(oneData) }

                        }

                } else {
                    const oneData = { id : catalog[i]?.childs[j]?.id,  catalogParam : { shard : catalog[i].childs[j].shard, query : catalog[i].childs[j].query} }
                    catalogData.push(oneData)
                }
            }
    }
    return catalogData
}
// Определяем параметры для поиска карточек товара в соответсвии с выбранным ID каталога
function getCatalogIdArray (catalog){
    let allCatalogParamArray = []
    for (let i in catalog) {
        if (catalog[i]?.childs)
            for (let j in catalog[i].childs){
                // Если у раздела есть дети то берем их если нету то в самом разделе
                if (catalog[i]?.childs[j]?.childs?.length > 0) {
                    for (let k in catalog[i].childs[j].childs){
                        const catalogParam = {
                            id      : catalog[i].childs[j].childs[k].id,
                            shard   : catalog[i].childs[j].childs[k].shard,
                            query   : catalog[i].childs[j].childs[k].query,
                            name    : catalog[i].childs[j].childs[k].name,
                        }
                        if ((catalogParam.shard) && (catalogParam.query)) allCatalogParamArray.push(catalogParam)
                    }
                } else {
                    const catalogParam = {
                        id      : catalog[i].childs[j].id,
                        shard   : catalog[i].childs[j].shard,
                        query   : catalog[i].childs[j].query,
                        name    : catalog[i].childs[j].name,
                    }
                    if ((catalogParam.shard) && (catalogParam.query)) allCatalogParamArray.push(catalogParam)
                }
            }
    }

    return allCatalogParamArray
}


// Определяем параметры для поиска карточек товара в соответсвии с выбранным ID каталога
function findCatalogParamByID (catalogId, catalog){
    const result = {

        shard : 0,
        query : 0,
        name : ''
    }
    const catalogIdInt = parseInt(catalogId)
    let isFind = false
    for (let i in catalog) {
            if (isFind) break
            if (catalog[i]?.childs)
                for (let j in catalog[i].childs){
                    if (isFind) break
                    // Если у раздела есть дети то изем в них если нету то в самом разделе
                    if (catalog[i]?.childs[j]?.childs?.length > 0) {
                        for (let k in catalog[i].childs[j].childs){
                            if (isFind) break

                            if (parseInt(catalog[i].childs[j].childs[k].id) === catalogIdInt) {
                                isFind = true
                                result.shard = catalog[i].childs[j].childs[k].shard
                                result.query = catalog[i].childs[j].childs[k].query
                                result.name = catalog[i].childs[j].childs[k].name
                            }
                        }
                    } else {
                        if (parseInt(catalog[i].childs[j].id) === catalogIdInt) {
                            isFind = true
                            result.shard = catalog[i].childs[j].shard
                            result.query = catalog[i].childs[j].query
                            result.name = catalog[i].childs[j].name
                        }
                    }
                }
        }


    return result

}

module.exports = {
     getLiteWBCatalogFromData, findCatalogParamByID, get30DaysSaleInfoFromHistory, getDataFromHistory, saveProductListToCVSFromLoadData, getCatalogData, getCatalogIdArray, saveProductLIstInfoToCVS
}
