const axios = require('axios-https-proxy-fix');
const {saveParserProductListLog, saveErrorLog} = require('../servise/log')
// const {saveProductLIstInfoToCVS} = require('../wbdata/wbfunk')
const {DataTypes} = require("sequelize");


// global.axiosProxy  = { host: '45.89.102.146', port: 8000,  protocol: 'https', auth: { username: 'OmzRbS', password: '9blCjmBKmH' } }
// global.axiosProxy  ={ host: '185.166.163.180', port: 8000, protocol: 'https', auth: { username: 'OmzRbS', password: '9blCjmBKmH' } };
global.axiosProxy  ={ host: '46.8.111.94', port: 8000, protocol: 'https', auth: { username: 'OmzRbS', password: '9blCjmBKmH' } };
global.axiosProxy2  ={ host: '45.88.149.19', port: 8000, protocol: 'https', auth: { username: 'OmzRbS', password: '9blCjmBKmH' } };
// РАБОТА С ПРОКСИ ЛИСТОМ
// const proxy = { host: '109.248.142.166', port: 8000,  protocol: 'https', auth: { username: 'OmzRbS', password: '9blCjmBKmH' } };
//      const proxy = { host: '45.89.102.146', port: 8000,  protocol: 'https', auth: { username: 'OmzRbS', password: '9blCjmBKmH' } };
// const proxy = { host: '185.166.163.180', port: 8000, protocol: 'https', auth: { username: 'OmzRbS', password: '9blCjmBKmH' } };
// Проверка прокси - смотрим какой ip возрвщается в запросе
// await axios.get('https://httpbin.io/ip', {
//     proxy: proxy,
// })
//     .then((response) => {
//         // log the response data
//         console.log(response.data);
//     })
//     .catch((error) => {
//         // log request error if any
//         console.error('Error:', error);
//     });
//

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Парсим данным с конретной страницы
function getWBCatalogDataFromJsonReq(data){
    let currData = []
    const dt = new Date().toLocaleDateString()
    for (let key in data) {
        try {
            // Правильный поиск цен
            let price = -1
            for (let k in data[key]?.sizes) {
                if (data[key].sizes[k]?.price) {
                    price = data[key].sizes[k]?.price?.product ? Math.round(parseInt(data[key].sizes[k]?.price?.product) / 100) : -1
                    break
                }
            }
            const priceHistory_tmp = []
            priceHistory_tmp.push({d: dt, sp: price, q: data[key].totalQuantity})

            let jsonData = {

                id: data[key].id ? data[key].id : -1,
                price: price,
                reviewRating: data[key].reviewRating ? data[key].reviewRating : -1,
                brandId: data[key].brandId ? data[key].brandId : -1,
                saleCount : 0,
                subjectId: data[key].subjectId ? data[key].subjectId : -1,
                totalQuantity: data[key].totalQuantity ? data[key].totalQuantity : -1,
                priceHistory: priceHistory_tmp

            }
            currData.push(jsonData)
        } catch (err) {}
    }
    return currData
}

// Получаем список товарв для выбранного предмета и типа сортировки
async function PARSER_GetCurrProductList(catalogParam, subjectID, sort, maxPage){
    let currProductList = []
    let needGetData = true
    let needGetNextProducts = true
    let isProxyOne = true
    let proxy = global.axiosProxy

    for (let i = 1; i <= maxPage; i++) {
        let page = i
        needGetData = true
        while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
            try {

                const url2 = `https://catalog.wb.ru/catalog/${catalogParam.shard}/v2/catalog?ab_testing=false&appType=1&${catalogParam.query}&curr=rub&dest=12358291&hide_dtype=10&lang=ru&page=${page}&sort=${sort}&spp=30&xsubject=${subjectID}`

                await axios.get(url2, {proxy: proxy}).then(response => {
                    const resData = response.data
                    if (resData?.data?.products) {

                        const products = getWBCatalogDataFromJsonReq(resData.data.products)
                        if (products.length < 100) needGetNextProducts = false
                        console.log('Страница ' + page + ' -->  Забрали продуктов :' + products.length);
                        currProductList = [...currProductList, ...products]

                    }
                })
                needGetData = false
                isResult = true
            } catch (err) {
                needGetData = false

                if (err.code === 'ECONNRESET') {
                    saveErrorLog('PARSER_GetCurrProductList', 'Словили ECONNRESET')
                    await delay(50);
                    needGetData = true
                }

                if ((err.status === 429) || (err.response?.status === 429)) {
                    console.log('Частое подключение к серверу');
                    if (isProxyOne)  proxy = global.axiosProxy2
                        else proxy = global.axiosProxy
                    isProxyOne = !isProxyOne

                    await delay(50);
                    needGetData = true
                }
            }
        }
        if (!needGetNextProducts) break
    }
    return currProductList
}


async function PARSER_GetProductList(catalogParam, subjectList){
    let productListParserResult = []

    for (let i in subjectList){
        // i = 0 // убрать
        console.log(subjectList[i].count);
        const currProductList = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'popular', 100) // 100
        productListParserResult = [...productListParserResult, ...currProductList]

        if (subjectList[i].count > 10000) {
            const currProductList2 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'popular', 40)
            productListParserResult = [...productListParserResult, ...currProductList2]
            const currProductList3 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'rate', 40)
            productListParserResult = [...productListParserResult, ...currProductList3]
            const currProductList4 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'priceup', 40)
            productListParserResult = [...productListParserResult, ...currProductList4]
            const currProductList5 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'pricedown', 40)
            productListParserResult = [...productListParserResult, ...currProductList5]
            const currProductList6 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'newly', 40)
            productListParserResult = [...productListParserResult, ...currProductList6]
            const currProductList7 = await PARSER_GetCurrProductList(catalogParam, subjectList[i].id, 'benefit', 40)
            productListParserResult = [...productListParserResult, ...currProductList7]

        }

        console.log('tut end');
        console.log(productListParserResult.length);
        // break // убрать
    }


    return productListParserResult

}

// Получаем бренд лист и категории товаров для выбранного каталога
async function PARSER_GetBrandAndCategoriesList(currCatalog) {
    let isResult = false
    let needGetData = true

    while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
        try {
            // Загрузим бренды
            // const url = `https://catalog.wb.ru/catalog/${currCatalog.catalogParam.shard}/v6/filters?ab_testing=false&appType=1&${currCatalog.catalogParam.query}&curr=rub&dest=-3390370&filters=ffbrand&spp=30`
            // await axios.get(url, {proxy: global.axiosProxy}).then(response => {
            //     const resData = response.data
            //     if (resData?.data?.filters[0]) {
            //         currCatalog.brandList = resData?.data?.filters[0].items
            //     }})
            // Загрузим бренды
            const url2 = `https://catalog.wb.ru/catalog/${currCatalog.catalogParam.shard}/v6/filters?ab_testing=false&appType=1&${currCatalog.catalogParam.query}&curr=rub&dest=-3390370&filters=xsubject&spp=30`
            await axios.get(url2, {proxy: global.axiosProxy}).then(response => {
                const resData = response.data
                if (resData?.data?.filters[0]) {
                    currCatalog.subjectList = resData?.data?.filters[0].items
                    // console.log(currCatalog.subjectList);
                }})
            needGetData = false
            isResult = true
        } catch (err) {
            needGetData = false
            console.log(err);
            if (err.code === 'ECONNRESET') {
                saveErrorLog('PARSER_GetBrandAndCategoriesList', 'Словили ECONNRESET')
                await delay(50);
                needGetData = true
            }

            if ((err.status === 429) || (err.response?.status === 429)) {
                saveErrorLog('PARSER_GetBrandAndCategoriesList', 'Частое подключение к серверу')
                await delay(50);
                needGetData = true
            }
        }
    }
    return isResult
}

async function PARSER_GetIDInfo(id,subject,kind, brand) {
    let catalogId = -1
    let needGetData = true

    while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
        try {
            // const url2 ='https://www.wildberries.ru/webapi/product/145561667/data?subject=80&kind=7&brand=310866989'
            const url2 =`https://www.wildberries.ru/webapi/product/${id}/data?subject=${subject}&kind=${kind}&brand=${brand}`

            const res =  await axios.post(url2, {proxy: global.axiosProxy}).then(response => {
                const resData = response.data

                try {catalogId = resData.value.data.sitePath.at(-2).id} catch (err) {
                    // console.log(err);
                }

            })

            needGetData = false
            isResult = true
        } catch (err) {
            needGetData = false
            // console.log(err);
            // if (err.code === 'ECONNRESET') {
            //     saveErrorLog('PARSER_GetBrandAndCategoriesList', 'Словили ECONNRESET')
            //     await delay(50);
            //     needGetData = true
            // }
            //
            // if ((err.status === 429) || (err.response?.status === 429)) {
            //     saveErrorLog('PARSER_GetBrandAndCategoriesList', 'Частое подключение к серверу')
            //     await delay(50);
            //     needGetData = true
            // }
        }
    }
    return catalogId
}

// Получаем бренд лист для выбранного каталога
async function PARSER_GetBrandsAndSubjectsList(catalogParam, needBrands = true) {
    let brandList = []
    let subjectList = []
    let needGetData = true
    while (needGetData) {
        try {
            if (needBrands) {
                // Загрузим Список брендов
                saveParserProductListLog(catalogParam.name, 'Получаем бренды в каталоге')
                const url = `https://catalog.wb.ru/catalog/${catalogParam.shard}/v6/filters?ab_testing=false&appType=1&${catalogParam.query}&curr=rub&dest=-3390370&filters=ffbrand&spp=30`
                saveParserProductListLog(catalogParam.name, `Начинаем загрузку брендов по ссылке: ` + url)
                await axios.get(url, {proxy: global.axiosProxy}).then(response => {
                    const resData = response.data
                    if (resData?.data?.filters[0]) {
                        brandList = resData?.data?.filters[0].items
                        let brandCount = brandList.length ? brandList.length : 0
                        saveParserProductListLog(catalogParam.name, 'Бренды успешно загруженны, колличество брендов ' + brandCount.toString())
                    }
                    needGetData = false
                })
            }
            // Загрузим Список категорий товаров
            needGetData = true
            saveParserProductListLog(catalogParam.name, 'Получаем список категорий товаров  в каталоге')
            const url2 = `https://catalog.wb.ru/catalog/${catalogParam.shard}/v6/filters?ab_testing=false&appType=1&${catalogParam.query}&curr=rub&dest=-3390370&filters=xsubject&spp=30`
            await axios.get(url2, {proxy: global.axiosProxy} ).then(response => {
                const resData = response.data
                if (resData?.data?.filters[0]) {
                    subjectList = resData?.data?.filters[0].items
                    let subjectCount = subjectList.length ? subjectList.length : 0
                }
                needGetData = false
            })
        } catch (error) {
            console.log(error);
            needGetData = false
            console.log('error ' + error.response?.status);
            saveErrorLog('wbParserFunctions', `Ошибка в PARSER_GetBrandsAndSubjectsList в разделе `+catalogParam.name+'  id '+catalogParam.id)
            saveErrorLog('wbParserFunctions', error)
            // TODO: Сделать механизм отработки 429 ошибки универсальным для всех парсер функций c переключением прокси и т.п.
            let code429 = false
            if (error.status) if (error.status === 429) code429 = true
            if (error.response?.status) if (error.response?.status === 429) code429 = true
            if (code429) {
                saveParserProductListLog(catalogParam.name, 'Частое подключение к серверу')
                await delay(50);
                needGetData = true
            }  // console.log(err.message);


        }
    }
    return [brandList, subjectList]
}


// Вторая глобальная функция парсинга списка товаров - мы идем по рандомному списку товаров и получаем детальную инфу если такой товар был
async function PARSER_GetProductListInfoAll_fromIdArray(need_ProductIDInfo) {

    let productListInfoAll = [] // Результ список всех найденных товаров

    const endId   = need_ProductIDInfo.idList.length-1

    const step = 500
    for (let i = 0; i <= endId; i++) {

        console.log('i = '+i+'   --id = '+need_ProductIDInfo.idList[i]?.id);
        let productList = []
        let currEnd = i + step-1 > endId ? endId : i + step-1
        for (let k = i; k <= currEnd; k++)
            productList.push(need_ProductIDInfo.idList[k]?.id)
        console.log(productList.length+'  -- 0  --> '+productList[0]+'   --  end -->  '+productList.at(-1));
        const productListInfo = await PARSER_GetProductListInfo(productList)
        productListInfoAll = [...productListInfoAll,...productListInfo]
        i += step-1
            // TODO: Отладка
        // if (i>20000) break
    }
    return productListInfoAll
}
// Обновляем информацию про товары по списку ИД и получаем детальную инфу если такой товар был
async function PARSER_UpdateProductListInfoAll_fromIdArray(need_ProductIDInfo) {

    let productListInfoAll = [] // Результ список всех найденных товаров

    const endId   = need_ProductIDInfo.length-1

    const step = 500 //process.env.PARSER_MAX_QUANTITY_SEARCH
    for (let i = 0; i <= endId; i++) {


        let productList = []
        let currEnd = i + step-1 > endId ? endId : i + step-1
        for (let k = i; k <= currEnd; k++)
            productList.push(need_ProductIDInfo[k])
        console.log('i = '+i+'  --  Запросили = '+productList.length);
        const productListInfo = await PARSER_GetProductListInfo(productList)
        productListInfoAll = [...productListInfoAll,...productListInfo]
        i += step-1


        // TODO: Отладка
        // if (i>2300) break
    }
    return productListInfoAll
}

async function PARSER_GetProductListInfo(productIdList) {


    let productListInfo = []
    let needGetData = true



    let productListStr = ''
    for (let i in productIdList) {
        if (i>0) productListStr += ';'
        productListStr += parseInt(productIdList[i]).toString()
    }
      while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
        try {

            const dt = new Date().toLocaleDateString()

            const url = `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-3390370&spp=30&ab_testing=false&nm=`+productListStr
            // axios.get(url, {proxy: global.axiosProxy})
            await axios.get(url).then(response => {
                const resData = response.data

                if (resData.data) {
                    console.log('-------------------->   '+resData.data.products.length);
                    for (let i in resData.data.products){
                        const currProduct = resData.data.products[i]
                        const totalQuantity = currProduct.totalQuantity?         parseInt(currProduct.totalQuantity)      : 0
                        // Если остатков товара больше минимума 1 то сохраняем полную информацию иначе усеченную
                        if (totalQuantity > 0) {
                            // Поиск цен. Пробегаемся по остаткам на размерах и если находим то прекращаем писк. Тут важно что если на остатках в размере 0 то и цен не будет

                            let price = -1
                            for (let k in currProduct.sizes) {
                                if (currProduct.sizes[k]?.price) {
                                    price = currProduct.sizes[k]?.price?.product ? Math.round(parseInt(currProduct.sizes[k]?.price?.product)  / 100): -1
                                    break
                                }
                            }

                            // Определим dtype
                            let dtype = -1
                            // TODO: Потом это убрать!! это надо сделать один раз при загрузке нового товара и забить и брать из описания
                            if (currProduct.dtype) dtype = currProduct.dtype


                            const priceHistory_tmp = []
                            priceHistory_tmp.push({d: dt, sp: price, q:totalQuantity})

                            const newProduct = {
                                id              : currProduct?.id ? currProduct.id : 0,
                                price           : price,
                                reviewRating    : currProduct.reviewRating ? currProduct.reviewRating : 0,
                                kindId	        : currProduct.kindId ? currProduct.kindId : 0,
                                subjectId       : currProduct.subjectId ? currProduct.subjectId : 0,
                                brandId         : currProduct.brandId,
                                saleCount       : 0,
                                saleMoney       : 0,
                                totalQuantity   : totalQuantity,
                                priceHistory    : priceHistory_tmp,
                                dtype           : dtype,
                            }

                            productListInfo.push(newProduct)
                        } else {
                            const priceHistory_tmp = []
                            priceHistory_tmp.push({d: dt, sp: 0, q:0})

                            const newProduct = {
                                id              : currProduct?.id ? currProduct.id : 0,
                                price           : 0,
                                reviewRating    : currProduct.reviewRating ? currProduct.reviewRating : 0,
                                kindId	        : currProduct.kindId ? currProduct.kindId : 0,
                                subjectId       : currProduct.subjectId ? currProduct.subjectId : 0,
                                brandId         : currProduct.brandId,
                                saleCount       : 0,
                                saleMoney       : 0,
                                totalQuantity   : totalQuantity,
                                priceHistory    : priceHistory_tmp,
                                dtype           : 0,
                            }

                            productListInfo.push(newProduct)

                        }
                    }


                }})
            needGetData = false
        } catch (err) {
            needGetData = false
            if ((err.response?.status ) && (err.response?.statusText)) saveErrorLog('PARSER_GetProductListInfo', 'Ошибка '+err.response?.status+err.response?.statusText)
            // console.log(err);
            console.log(' ---------  error  -------');
            console.log(err.code);

            if (err.code === 'ECONNRESET') {
                saveErrorLog('PARSER_GetProductListInfo', 'Словили ECONNRESET')
                await delay(50);
                needGetData = true
            }

            if ((err.code === 'ETIMEDOUT') || (err.code === 'ENOTFOUND')) {
                saveErrorLog('PARSER_GetProductListInfo', 'Нет Итернета '+err.code)
                await delay(60_000*5);
                needGetData = true
            }

            if ((err.status === 429) || (err.response?.status === 429)) {
                saveErrorLog('PARSER_GetProductListInfo', 'Частое подключение к серверу')
                await delay(50);
                needGetData = true
            }

            if (needGetData === false){
                saveErrorLog('PARSER_GetProductListInfo', 'Неизвестная ошибка '+err.code+'  делаем задержку 1 минут')
                await delay(60_000);
                needGetData = true

            }

        }
    }





    return productListInfo
}

// Берем актуальную информацию по товарам для отображения на клиенте
async function PARSER_GetProductListInfoToClient(productIdList) {


    let productListInfo = []
    let needGetData = true



    let productListStr = ''
    for (let i in productIdList) {
        if (i>0) productListStr += ';'
        productListStr += parseInt(productIdList[i].id).toString()
    }
    while (needGetData) {  // Делаем в цикле т.к. вдруг вылетит частое подключение к серверу то перезапустим
        try {
            const url = `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-3390370&spp=30&ab_testing=false&nm=`+productListStr

            await axios.get(url, {proxy: global.axiosProxy}).then(response => {
                const resData = response.data

                if (resData.data) {
                    console.log('-------------------->   '+resData.data.products.length);
                    for (let i in resData.data.products){
                        const currProduct = resData.data.products[i]
                        const totalQuantity = currProduct.totalQuantity?         parseInt(currProduct.totalQuantity)      : 0
                        // Если остатков товара больше 0  то найдем цену
                        let price = -1
                        let basicPrice = -1
                        if (totalQuantity > 0) {
                            // Поиск цен. Пробегаемся по остаткам на размерах и если находим то прекращаем писк. Тут важно что если на остатках в размере 0 то и цен не будет

                            for (let k in currProduct.sizes) {
                                if (currProduct.sizes[k]?.price) {
                                    price = currProduct.sizes[k]?.price?.product ? Math.round(parseInt(currProduct.sizes[k]?.price?.product) / 100) : -1
                                    basicPrice = currProduct.sizes[k]?.price?.basic ? Math.round(parseInt(currProduct.sizes[k]?.price?.basic) / 100) : -1

                                    break
                                }
                            }
                        }
                        // Далее сохраним необходимую инфомацию в обьекте
                        let priceHistory_tmp = []
                        let countHistory_tmp = []
                        for (let i in productIdList) {
                            if (productIdList[i].id === currProduct?.id) {
                                priceHistory_tmp = productIdList[i].priceHistory
                                countHistory_tmp = productIdList[i].countHistory
                                break
                            }
                        }

                        const newproduct = {
                            id              : currProduct?.id ? currProduct.id : 0,
                            basicPrice      : basicPrice,
                            price           : price,
                            dtype           : currProduct.dtype	 ? currProduct.dtype : 0,
                            totalQuantity   : totalQuantity,
                            reviewRating    : currProduct.reviewRating	 ? currProduct.reviewRating : 0,
                            feedbacks	    : currProduct.feedbacks ? currProduct.feedbacks : 0,
                            brand		    : currProduct.brand	    ? currProduct.brand	 : "",
                            name		    : currProduct.name	    ? currProduct.name		 : "",
                            photoUrl        : '',
                            priceHistory    : priceHistory_tmp,
                            countHistory    : countHistory_tmp,
                        }
                        productListInfo.push(newproduct)

                        }
                    }

             })
            needGetData = false
        } catch (err) {
            needGetData = false
            // TODO: Удалить
            console.log(' ---------  error  -------');
            console.log(err);
            //TODO: ENETUNREACH Обработать когда нет интернета!!

            if (err.code === 'ECONNRESET') {
                await delay(50);
                needGetData = true
            }

            if ((err.status === 429) || (err.response?.status === 429)) {
                await delay(50);
                needGetData = true
            }

        }
    }





    return productListInfo
}

module.exports = {
    PARSER_GetBrandAndCategoriesList, PARSER_GetBrandsAndSubjectsList, PARSER_GetProductListInfo,PARSER_GetProductListInfoAll_fromIdArray,
    PARSER_GetProductListInfoToClient, PARSER_GetIDInfo, PARSER_GetProductList
}
