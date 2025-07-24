
const TaskService = require('../servise/task-service')
const ProductListService= require('../servise/productList-service')
const ProductIdService= require('../servise/productId-service')
const {getDataFromHistory} = require('../wbdata/wbfunk')
const {saveErrorLog} = require("../servise/log");
class WbController{



    // async updateProductList_fromWB (req, res, next) {
    //
    //     try {
    //         const catalogId = req.query.catalogID ? parseInt(req.query.catalogID) : 0
    //         const productList  = await wbService.updateProductList_fromWB(catalogId)
    //         res.json(productList)
    //     } catch (e) {
    //         console.log(e);
    //         next(e)
    //     }
    //
    // }

    // async getBrandsAndSubjects_fromWB (req, res, next) {
    //
    //     try {
    //         const result  = await wbService.getBrandsAndSubjects_fromWB()
    //         res.json(result)
    //     } catch (e) {
    //         console.log(e);
    //         next(e)
    //     }
    //
    // }

    // async saveProductList (req, res, next) {
    //
    //     try {
    //         const catalogId = req.query.catalogID ? parseInt(req.query.catalogID) : 0
    //         console.log(req.query);
    //         const filename = req.query.filename ? req.query.filename : "test"
    //         const dtype = req.query.dtype ? req.query.dtype : true
    //         console.log('Сохраняем товары  '+ catalogId.toString()+'  в файл '+filename+".cvs  товары ФБО ? "+dtype.toString());
    //
    //         const productList  = await wbService.getProductList(catalogId)
    //         saveProductLIstToCVS(productList, filename, dtype)
    //         //    const productList = 'testKatalog'
    //         res.json('isOk')
    //     } catch (e) {
    //         console.log(e);
    //         next(e)
    //     }
    //
    // }

    // async getLiteWBCatalog (req, res, next) {
    //
    //     try {
    //         const allWBCatalog  = await wbService.getLiteWBCatalog()
    //         res.json(allWBCatalog)
    //     } catch (e) {
    //         console.log(e);
    //         next(e)
    //     }
    //
    // }

    // async getWBCatalog_fromWB (req, res, next) {
    //
    //     try {
    //         const allWBCatalog  = await wbService.getWBCatalog_fromWB()
    //         res.json(allWBCatalog)
    //     } catch (e) {
    //         console.log(e);
    //         next(e)
    //     }
    //
    // }



    async deleteZeroID (req, res, next) {
        try {
            const result = await ProductListService.deleteZeroID()
            res.json(result)
        } catch (e) {   console.log(e);   next(e)}
    }




    async getMathData (req, res, next) {

        try {
            const id = req.params.link

            let result = []
            const idInfo = await ProductIdService.getIdInfo(id)
            let productInfo = []
            if (idInfo) {
                productInfo = await ProductListService.getProductInfo(idInfo)
                result.push(idInfo)
                result.push(productInfo)
                // const res2 =  getDataFromHistory(productInfo.priceHistory, productInfo.price, productInfo.totalQuantity, 30)
                // result.push(res2)
            }


            //
            //
            //
            //
            //
            // // const testResult  = 'isOk'
            // console.log('testResult = '+testResult);
            res.json(result)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }
    async test (req, res, next) {

        try {

             const testResult  = await TaskService.updateAllProductList(false, false)
            // const testResult  = await TaskService.setNoUpdateProducts()
            //
            // const testResult  = await TaskService.checkAllProductListData()
            // const testResult  = await ProductListService.deleteAllProductListTable()
            // const testResult  = await ProductListService.updateAllWBProductListInfo_fromTable2('productList131533')
            // const testResult  = await ProductListService.test()
            // const testResult  = await ProductListService.getAllProductListInfo()


            // const testResult  = 'isOk'
            console.log('testResult = '+testResult);
            res.json(testResult)
        } catch (e) {
            console.log(e);
            next(e)
        }

    }





    async updateAllSubjects_inBD (req, res, next) {

        try {
            const catalogId = req.params.link
            console.log(catalogId);
            const result  = await CatalogService.updateAllSubjects_inBD()
            res.json(result)
        } catch (e) {
            next(e)
        }

    }

}

module.exports = new WbController()
