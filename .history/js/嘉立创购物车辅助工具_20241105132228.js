// ==UserScript==
// @name         立创商城辅助工具
// @namespace    http://tampermonkey.net/
// @version      2.3.1
// @description  立创商城辅助工具
// @author       Lx
// @match        https://so.szlcsc.com/global.html**
// @match        https://bom.szlcsc.com/member/eda/search.html?**
// @match        https://bom.szlcsc.com/member/bom/upload/**.html
// @match        https://www.szlcsc.com/huodong.html?**
// @match        https://list.szlcsc.com/brand**
// @match        https://list.szlcsc.com/catalog**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=szlcsc.com
// @require      https://update.greasyfork.org/scripts/446666/1389793/jQuery%20Core%20minified.js
// @require      https://update.greasyfork.org/scripts/455576/1122361/Qmsg.js
// @resource customCSS https://gitee.com/snwjas/message.js/raw/master/dist/message.min.css
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/491619/%E5%98%89%E7%AB%8B%E5%88%9B%E8%B4%AD%E7%89%A9%E8%BD%A6%E8%BE%85%E5%8A%A9%E5%B7%A5%E5%85%B7.user.js
// @updateURL https://update.greasyfork.org/scripts/491619/%E5%98%89%E7%AB%8B%E5%88%9B%E8%B4%AD%E7%89%A9%E8%BD%A6%E8%BE%85%E5%8A%A9%E5%B7%A5%E5%85%B7.meta.js
// ==/UserScript==

(async function() {
    'use strict';
    // 软件版本
    const __version = 'Version 2.3.1';

    // 引入message的css文件并加入html中
    const css = GM_getResourceText("customCSS")
    GM_addStyle(css)

    const webSiteShareData = {
        lcscCartUrl: "https://cart.szlcsc.com",
        lcscWwwUrl: "https://www.szlcsc.com", 
        lcscSearchUrl: "https://so.szlcsc.com",
    };

    /**
     * rgb颜色随机
     * @returns
     */
    const rgb = () => {
        var r = Math.floor(Math.random() * 256)
        var g = Math.floor(Math.random() * 256)
        var b = Math.floor(Math.random() * 256)
        var rgb = 'rgb(' + r + ',' + g + ',' + b + ')';
        return rgb;
    }

    /**
     * rgba颜色随机
     * @param {*} a
     * @returns
     */
    const rgba = (a = 1) => {
        var r = Math.floor(Math.random() * 256)
        var g = Math.floor(Math.random() * 256)
        var b = Math.floor(Math.random() * 256)
        var rgb = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        return rgb;
    }

    /**
     * 深色 随机色
     * @returns
     */
    const srdmRgbColor = () => {
        //随机生成RGB颜色
        let arr = [];
        for (var i = 0; i < 3; i++) {
            // 暖色
            arr.push(Math.floor(Math.random() * 128 + 64));
            // 亮色
            // arr.push(Math.floor(Math.random() * 128 + 128));
        }
        let [r, g, b] = arr;
        // rgb颜色
        // var color=`rgb(${r},${g},${b})`;
        // 16进制颜色
        var color = `#${r.toString(16).length > 1 ? r.toString(16) : '0' + r.toString(16)}${g.toString(16).length > 1 ? g.toString(16) : '0' + g.toString(16)}${b.toString(16).length > 1 ? b.toString(16) : '0' + b.toString(16)}`;
        return color;
    }

    /**
     * 十六进制颜色随机
     * @returns
     */
    const color16 = () => {
        var r = Math.floor(Math.random() * 256)
        var g = Math.floor(Math.random() * 256)
        var b = Math.floor(Math.random() * 256)
        var color = '#' + r.toString(16) + g.toString(16) + b.toString(16)
        return color;
    }

    /**
     * 正则获取品牌名称，需要传入xxxx(品牌名称) 这样的字符
     * @param {*} text
     * @returns
     */
    const getBrandNameByRegex = (text) => {
        let res = text
        try {
            res = /\(.+\)/g.exec(text)[0].replace(/\((.*?)\)/, '$1')
        } catch (e) {

        }
        return res
    }

    /**
     * 正则获取品牌名称，优惠券的标题
     * @param {*} text
     * @returns
     */
    const getBrandNameByRegexInCouponTitle = (text) => {
        try {
            text = text.replaceAll(/.+元|品牌优惠/g, '')
        } catch (e) {

        }
        return text
    }

    /**
     * 等待
     * @param {*} timeout
     * @returns
     */
    const setAwait = (timeout) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(true)
            }, timeout);
        })
    }

    /**
     * 等待 执行函数
     * @param {*} timeout
     * @returns
     */
    const setAwaitFunc = (timeout, func) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                func && func()
            }, timeout);
        })
    }

    /**
     * 获取本地缓存
     * @param {*} key
     */
    const getLocalData = (k) => {
        return localStorage.getItem(k)
    }

    /**
     * 设置本地缓存
     * @param {*} key
     */
    const setLocalData = (k, v) => {
        localStorage.setItem(k, v)
    }

    /**
     * 判断插件是否已经加载切是显示状态
     * @returns
     */
    const plguinIsHavedAndShow = () => {
        return plguinIsHaved() && $('.bd').is(':visible');
    }

    /**
     * 判断插件是否已经加载
     * @returns
     */
    const plguinIsHaved = () => {
        return $('.bd').length > 0;
    }

    /**
     * 品牌名称加工
     * @param {*} name
     * @returns
     */
    const brandNameDataProcess = (name) => {
        return name.replace(/\//g, '_')
    }

    // 后续支持强排序按钮

    // 商品清单集合暂存
    const dataCartMp = new Map()
        // 品牌对应颜色，用于快速查找位置。
    const dataBrandColorMp = new Map()
        // 优惠券页面，数据暂存。只保存16-15的优惠券
    const all16_15CouponMp = new Map()
        // 自动领券的定时器
    let couponTimer = null;
    // 搜索页总条数
    var searchPageTotalCount = () => parseInt($('div.g01 span:eq(1)').text()) || parseInt($('#by-channel-total b').text());
    // 搜索页单页条数
    var searchPageSize = 30;
    // 搜索页需要显示多少条数据  自行修改
    var searchPageRealSize = 100;
    // 搜索页总页数
    var searchTotalPage = () => Math.min(((parseInt((searchPageTotalCount() / searchPageSize).toFixed(0)) + 1) || 34), 34);
    // 存储动态的function，用做数据处理
    var jsRules = [];
    // 搜索页数据预览定时器
    var searchTimer = null;
    // 搜索页数据暂存
    var searchTempList = [];
    // 品牌搜索结束标记
    var brandSearchEnd = false;
    // 搜索首页的结束标记
    var globalSearchEnd = false;

    // 消息弹框全局参数配置
    Qmsg.config({
        showClose: true,
        timeout: 2800,
        maxNums: 50
    })

    /**
     * 根据value排序Map
     * @param {*} map
     * @returns
     */
    const sortMapByValue = (map) => {
        var arrayObj = Array.from(map)
            //按照value值降序排序
        arrayObj.sort(function(a, b) { return a[1] - b[1] })
        return arrayObj
    }


    /**
     * GET请求封装
     * @param {} data
     */
    const getAjax = (url) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url,
                method: 'GET',
                onload: (r) => {
                    resolve(r.response)
                },
                onerror: (err) => {
                    reject(err)
                }
            })
        })
    }

    /**
     * POST请求封装
     * @param {} data
     */
    const postAjaxJSON = (url, data) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data,
                onload: (r) => {
                    resolve(r.response)
                },
                onerror: (err) => {
                    reject(err)
                }
            })
        })
    }

    function jsonToUrlParam(json, ignoreFields = '') {
        return Object.keys(json)
            .filter(key => ignoreFields.indexOf(key) === -1)
            .map(key => key + '=' + json[key]).join('&');
    }

    /**
     * POST请求封装
     * @param {} data
     */
    const postFormAjax = (url, jsonData) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url,
                data: jsonToUrlParam(jsonData),
                method: 'POST',
                headers: { 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                onload: (r) => {
                    resolve(r.response)
                },
                onerror: (err) => { reject(err) }
            })
        })
    }

    /**
     * 有进度的等待所有异步任务的执行
     * @param {*} requests
     * @param {*} callback
     * @returns
     */
    const allWithProgress = (requests, callback) => {
        let index = 0;
        requests.forEach(item => {
            item.then(() => {
                index++;
                const progress = index * 100 / requests.length;
                callback({ total: requests.length, cur: index, progress });
            })
        });
        return Promise.all(requests);
    }

    /**
     * 订购数量发生变化的时候
     */
    const onChangeCountHandler = () => {
        // 订购数量
        $('.product-item .cart-li input.input').on('change', () => {
                setTimeout(refresh, 1000);
            })
            // 加减数量
        $('.decrease,.increase').on('click', () => {
            setTimeout(refresh, 1000);
        })
    }

    /**
     * 换仓按钮事件
     * 一键换仓专用
     *
      换仓逻辑
        https://cart.szlcsc.com/cart/warehouse/deliverynum/update

         cartKey规则：
        标签id product-item-186525218
        商品的跳转地址（商品id）20430799

        cartKey: 186525218~0~20430799~RMB~CN
        gdDeliveryNum: 0
        jsDeliveryNum: 1
     */
    const onClickChangeDepotBtnHandler = () => {

        /**
         *
         * @param {*} this 标签
         * @param {*} warehouseType 仓库类型    GUANG_DONG：广东，JIANG_SU
         * @returns
         */

        // 换仓封装
        const _changeDepot = (that, warehouseType) => {

            return new Promise((resolve, reject) => {

                // 是否锁定样品
                let isLocked = (that.find('.warehouse-wrap .warehouse:contains(广东仓)').length +
                    that.find('.warehouse-wrap .warehouse:contains(江苏仓)').length) == 0

                // 查找商品的属性
                let infoElement = that.find('.cart-li:eq(1) a')

                if (isLocked === true) {
                    Qmsg.error(`物料编号：${infoElement.text()}，处于锁定样品状态，无法换仓`)
                    console.error(`物料编号：${infoElement.text()}，处于锁定样品状态，无法换仓`)
                    return
                }

                // 订购数量
                let count = that.find('.cart-li:eq(-4) input').val()

                // 物料ID1
                let productId1 = /\d+/g.exec(that.attr('id'))[0]

                // 物料ID2
                let productId2 = /\d+/g.exec(infoElement.attr('href'))[0]

                // 取最低起订量
                let sinpleCount = /\d+/g.exec(that.find('.price-area:eq(0)').text())[0]

                // 订购套数
                let batchCount = count / sinpleCount

                // 修改库存的参数体
                let params = ''

                // 当前是广东仓
                if (warehouseType == 'GUANG_DONG') {
                    params = `cartKey=${productId1}~0~${productId2}~RMB~CN&gdDeliveryNum=${batchCount}&jsDeliveryNum=${0}`
                }
                // 其他情况当成是江苏仓
                else if (warehouseType == 'JIANG_SU') {
                    params = `cartKey=${productId1}~0~${productId2}~RMB~CN&gdDeliveryNum=${0}&jsDeliveryNum=${batchCount}`
                }

                GM_xmlhttpRequest({
                    url: `${webSiteShareData.lcscCartUrl}/cart/warehouse/deliverynum/update`,
                    data: params,
                    method: 'POST',
                    headers: { 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    onload: (r) => {
                        console.log(r.response)
                        resolve(r.response)
                    },
                    onerror: (err) => { reject(err) }
                })
            })
        }


        /**
         * 动态刷新页面，不强制刷新
         * ！！！暂时不能用，需要考虑订货商品还是现货
         */
        // const _reload = async () => {

        //     // 购物车URL
        //     const cartDataUrl = `${webSiteShareData.lcscCartUrl}/cart/display?isInit=false&isOrderBack=${window.isOrderBack}&${Date.now()}`
        //     const res = await getAjax(cartDataUrl)
        //     const resObj = JSON.parse(res)

        //     // 合并订货和现货商品
        //     const newArr = [...resObj.result.shoppingCartVO.rmbCnShoppingCart.currentlyProductList,
        //     ...resObj.result.shoppingCartVO.rmbCnShoppingCart.isNeedProductList]

        //     // 遍历物料编号
        //     newArr.forEach(function (item) {

        //         const {
        //             jsDeliveryNum, // 江苏的订货量
        //             gdDeliveryNum, // 广东的订货量
        //             productCode,   // 物料编码
        //             isChecked,     // 是否选中
        //             jsValidStockNumber, // 江苏剩余库存
        //             szValidStockNumber, // 广东剩余库存
        //             jsDivideSplitDeliveryNum, // 江苏起订量的倍数
        //             gdDivideSplitDeliveryNum,  // 广东起订量的倍数
        //             shopCarMapKey              // 购物车主键
        //         } = item

        //         // 查找到这个物料编号所在的行
        //         const ele = getAllLineInfoByBrandName(productCode)

        //         // 计算出仓库名
        //         const depotName = jsDeliveryNum > 0 ? '江苏仓' : (gdDeliveryNum > 0 ? '广东仓' : '')

        //         const depotEle = ele.find('.warehouse-wrap .warehouse')

        //         const newDepotName = (depotEle.html() || '').replace('江苏仓', depotName).replace('广东仓', depotName)

        //         // 重新设置仓库名称
        //         depotEle.html(newDepotName)

        //     })
        // }

        // 换仓-江苏
        $('.change-depot-btn-left_').on('click', function() {

            let count = 0;
            const eles = getAllCheckedLineInfo()
            eles.each(async function() {
                count++
                await _changeDepot($(this), 'JIANG_SU').then(res => {
                    Qmsg.success('切换【江苏仓】成功！')
                })

                if (eles.length === count) {
                    //  setTimeout(_reload, 500);
                    setTimeout(function() {
                        location.reload()
                            // 官方刷新购物车
                            // cartModuleLoadCartList()
                    }, 2500);
                }
            })
        })

        // 换仓-广东
        $('.change-depot-btn-right_').on('click', function() {

            let count = 0;
            const eles = getAllCheckedLineInfo()
            eles.each(async function() {
                count++
                await _changeDepot($(this), 'GUANG_DONG').then(res => {
                    Qmsg.success('切换【广东仓】成功！')
                })

                if (eles.length === count) {
                    //  setTimeout(_reload, 500);
                    setTimeout(function() {
                        location.reload()
                            // 官方刷新购物车
                            // cartModuleLoadCartList()
                    }, 2500);
                }
            })
        })
    }

    /**
     * 选中仓库事件
     * 一键选仓专用
     * 废弃：由于模拟点击，会导致小窗口频繁刷新，影响性能。下面重新换接口
     */
    const _checkDepotBtnHandler = () => {

        const _clickFunc = (depotName, fn) => {
            const eles = fn()

            // 先看看有没有指定仓
            const jsIsEmpty = getJsLineInfo().length === 0
            const gdIsEmpty = getGdLineInfo().length === 0

            if (depotName === 'JIANG_SU' && jsIsEmpty) {
                Qmsg.error('购物车中并没有【江苏仓】的商品！')
                return

            } else if (depotName === 'GUANG_DONG' && gdIsEmpty) {
                Qmsg.error('购物车中并没有【广东仓】的商品！')
                return
            }

            // 是否有至少一个选中的
            const isHave = eles.parents('.product-item').find('input.check-box:checked').length > 0

            if (isHave) {
                eles.each(function() {
                    $(this).parents('.product-item').find('input.check-box:checked').click()
                })
            }
            // 都未选中，则执行仓库全选操作
            else {
                eles.each(function() {
                    $(this).parents('.product-item').find('input.check-box').click()
                })
            }
        }

        // 江苏仓
        $(".check-js-btn-left_").on('click', function() {
            _clickFunc('JIANG_SU', getJsLineInfo)
        })

        // 广东仓
        $(".check-gd-btn-right_").on('click', function() {
            _clickFunc('GUANG_DONG', getGdLineInfo)
        })
    }


    /**
     * 选中仓库事件
     * 一键选仓专用
     */
    const checkDepotBtnHandlerNew = () => {

        const _clickFunc = (depotName) => {
            // 广东仓选中
            const gdCheckedEles = getGdLineInfo()
                // 江苏仓选中
            const jsCheckedEles = getJsLineInfo()

            // 先看看有没有指定仓
            const jsIsEmpty = jsCheckedEles.length === 0
            const gdIsEmpty = gdCheckedEles.length === 0

            let isJs = depotName === 'JIANG_SU'
            let isGd = depotName === 'GUANG_DONG'

            if (isJs && jsIsEmpty) {
                Qmsg.error('购物车中并没有【江苏仓】的商品！')
                return

            } else if (isGd && gdIsEmpty) {
                Qmsg.error('购物车中并没有【广东仓】的商品！')
                return
            }

            // 这里只需要操作多选框的选中状态就行
            if (isJs) {
                const jsInputCheckBox = jsCheckedEles.parents('.product-item').find('input.check-box')
                const jsInputCheckBoxCK = jsInputCheckBox.parents('.product-item').find('input.check-box:checked')
                const isHave = jsInputCheckBoxCK.length > 0
                jsInputCheckBox.prop('checked', !isHave)

            } else if (isGd) {
                const gdInputCheckBox = gdCheckedEles.parents('.product-item').find('input.check-box')
                const gdInputCheckBoxCK = gdInputCheckBox.parents('.product-item').find('input.check-box:checked')
                const isHave = gdInputCheckBoxCK.length > 0
                gdInputCheckBox.prop('checked', !isHave)
            }

            cartUpdateChecked().then(res => {
                if (res === 'true') {
                    cartModuleLoadCartList()
                    setTimeout(refresh(), 1000);
                }
            })
        }

        // 江苏仓
        $(".check-js-btn-left_").on('click', function() {
            _clickFunc('JIANG_SU')
        })

        // 广东仓
        $(".check-gd-btn-right_").on('click', function() {
            _clickFunc('GUANG_DONG')
        })
    }


    /**
     * 自动领取优惠券的定时器
     */
    const autoGetCouponTimerHandler = () => {

        $('.auto-get-coupon').off('change')
        couponTimer = null
            // 自动领取优惠券开关
        $('.auto-get-coupon').on('change', function() {
            const isChecked = $(this).is(':checked')
            setLocalData('AUTO_GET_COUPON_BOOL', isChecked)
            autoGetCouponTimerHandler()
        })

        couponTimer = setInterval(() => {
            const isChecked = $('.auto-get-coupon').is(':checked')
            if (isChecked) {
                console.log(`自动领取优惠券，后台运行中...`)
                dataCartMp.keys().forEach(item => {
                    // 查找优惠券
                    const $couponEle = $(`.couponModal .coupon-item:contains(${item}):contains(立即抢券) div[data-id]`)

                    if ($couponEle.length === 0) {
                        return
                    }
                    //优惠券ID
                    const couponId = $couponEle.data('id')
                        // 优惠券名称
                    const couponName = $couponEle.data('name')

                    getAjax(`${webSiteShareData.lcscWwwUrl}/getCoupon/${couponId}`).then(async res => {
                        res = JSON.parse(res)
                        if (res.result === 'success' || res.code == 200) {
                            let msg = `${couponName}券，自动领取成功`;
                            console.log(msg);
                            Qmsg.success({
                                content: msg,
                                timeout: 4000
                            })
                            await setTimeout(5000);
                            allRefresh()
                        } else {
                            console.error(`自动领取优惠券失败：${res.msg}`)
                        }
                    })
                })
            } else {
                clearInterval(couponTimer)
                couponTimer = null
            }
        }, 5000);
    }

    /**
     * 一键分享 已经勾选的列表
     */
    const shareHandler = () => {
        // 产出数据并放在剪贴板中
        const _makeDataAndSetClipboard = () => {
            const $checkedEles = getAllCheckedLineInfo()

            if ($checkedEles.length === 0) {
                Qmsg.error('购物车未勾选任何商品！')
                return
            }

            // 获取所有已经勾选的商品，也包含订货商品
            const shareText = [...$checkedEles].map(function(item) {
                const $this = $(item)
                    // 是否是江苏仓，如果是多个仓的话，只取一个
                const isJsDepot = $this.find('.warehouse-wrap .warehouse').text().includes('江苏仓')
                    // 该商品订购的总量
                const count = $this.find('.cart-li:eq(4) input').val()

                return $this.find('.cart-li:eq(1) a').text().trim() + '_' + (isJsDepot ? 'JS_' : 'GD_') + count
            }).join('~')

            // navigator.clipboard.writeText(shareText)
            GM_setClipboard(shareText, "text", () => Qmsg.success('购物车一键分享的内容，已设置到剪贴板中！'))
        }

        $('.share_').click(_makeDataAndSetClipboard)
    }


    /**
     * 一键解析
     */
    const shareParseHandler = () => {
        let _loading = null
            // 定义匿名函数
        const _shareParse = async() => {
            // 富文本框内容
            const text = $('.textarea').val().trim()

            if (text.length === 0) {
                Qmsg.error('解析失败，富文本内容为空！')
                return
            }

            _loading = Qmsg.loading("正在解析中...请耐心等待！")

            // 成功条数计数
            let parseTaskSuccessCount = 0
                // 失败条数计数
            let parseTaskErrorCount = 0
                // 总条数
            let parseTaskTotalCount = 0
                // 首次处理出来的数组
            const firstparseArr = text.split('~')

            parseTaskTotalCount = firstparseArr.length || 0

            for (let item of firstparseArr) {
                // 二次处理出来的数组
                const secondParseArr = item.split('_')

                // 物料编号
                const productNo = secondParseArr[0].trim().replace('\n', '')
                    // 仓库编码
                const depotCode = secondParseArr[1].trim().replace('\n', '')
                    // 数量
                const count = secondParseArr[2].trim().replace('\n', '')

                if (productNo === undefined || count === undefined) {
                    Qmsg.error('解析失败，文本解析异常！')
                    _loading.close()
                    return
                }

                // 添加购物车
                await postFormAjax(`${webSiteShareData.lcscCartUrl}/cart/quick`, { productCode: productNo, productNumber: count }).then(res => {

                    res = JSON.parse(res)
                    if (res.code === 200) {
                        Qmsg.info(`正在疯狂解析中... 共：${parseTaskTotalCount}条，成功：${++parseTaskSuccessCount}条，失败：${parseTaskErrorCount}条。`);
                    } else {
                        Qmsg.error(`正在疯狂解析中... 共：${parseTaskTotalCount}条，成功：${parseTaskSuccessCount}条，失败：${++parseTaskErrorCount}条。`);
                    }
                })
            }

            Qmsg.success(`解析完成！共：${parseTaskTotalCount}条，成功：${parseTaskSuccessCount}条，失败：${parseTaskErrorCount}条。已自动加入购物车`)

            _loading.close()

            // 刷新购物车页面
            cartModuleLoadCartList()
            setTimeout(allRefresh, 100);
        }

        $('.share-parse').click(_shareParse)
    }

    /**
     * 一键锁定、释放商品
     */
    const lockProductHandler = () => {
        $(`.lock-product`).click(async function() {
            const $eles = getHavedCheckedLineInfo()

            if ($eles.has(':contains("锁定样品")').length === 0) {
                Qmsg.error('没有要锁定的商品！')
                return;
            }

            for (const that of $eles) {
                // 购物车商品的ID
                if (!$(that).has(':contains("锁定样品")').length) {
                    continue;
                }
                const shoppingCartId = $(that).has(':contains("锁定样品")').attr('id').split('-')[2]
                    // 接口限流延迟操作
                await postFormAjax(`${webSiteShareData.lcscCartUrl}/async/samplelock/locking`, { shoppingCartId }).then(res => {
                    res = JSON.parse(res)
                    if (res.code === 200) {
                        Qmsg.success(res.msg || res.result || '商品锁定成功！')
                    } else {
                        Qmsg.error(res.msg || res.result || '商品锁定失败！请稍后再试')
                    }
                })
            }

            // 刷新购物车页面
            setTimeout(() => {
                cartModuleLoadCartList();
                setTimeout(allRefresh, 800);
            }, 1000);

        })

        $(`.unlock-product`).click(async function() {

            const $eles = getHavedCheckedLineInfo()

            if ($eles.has(':contains("释放样品")').length === 0) {
                Qmsg.error('没有要锁定的商品！')
                return;
            }
            for (const that of $eles) {
                // 购物车商品的ID
                if (!$(that).has(':contains("释放样品")').length) {
                    continue;
                }
                const shoppingCartId = $(that).has(':contains("释放样品")').attr('id').split('-')[2]
                    // 接口限流延迟操作
                await postFormAjax(`${webSiteShareData.lcscCartUrl}/async/samplelock/release/locking`, { shoppingCartId }).then(res => {
                    res = JSON.parse(res)
                    if (res.code === 200) {
                        Qmsg.success(res.msg || res.result || '商品释放成功！')
                    } else {
                        Qmsg.error(res.msg || res.result || '商品释放失败！请稍后再试')
                    }
                })
            }

            // 刷新购物车页面
            setTimeout(() => {
                cartModuleLoadCartList();
                setTimeout(allRefresh, 800);
            }, 1000);
        })
    }

    // 控制按钮的生成
    const buttonListFactory = () => {

        let isBool = getAllCheckedLineInfo().length > 0

        return `
    <div style="border: unset; position: relative; padding: 8px;">
    <div class='mb10 flex flex-sx-center'>
        <label style="font-size: 14px" class='ftw1000'>自动领取优惠券</label>
        <input style="margin: 0 8px;" type="checkbox" class="checkbox auto-get-coupon" ${getLocalData('AUTO_GET_COUPON_BOOL') === 'true' ? 'checked' : ''}/>
    </div>

    <div class='mb10 flex flex-sx-center'>
        <label style="font-size: 14px; width: 105px; z-index: 2;" class='ftw1000 box_'>一键选仓
            <div class="circle_ tooltip_" data-msg='第一次点是选中，第二次点是取消选中' style="margin-left: 5px;">?</div>
        </label>
            <button class='check-js-btn-left_ btn-left_' type='button'>江苏</button>
            <button class='check-gd-btn-right_ btn-right_' type='button'>广东</button>
     </div>

     <div class='mb10 flex flex-sx-center'>
        <label style="font-size: 14px; width: 105px;  z-index: 2;" class='ftw1000 box_'>一键换仓
            <div class="circle_ tooltip_" data-msg='只操作多选框选中的商品，包含订货商品' style="margin-left: 5px;">?</div>
        </label>
            <button class='change-depot-btn-left_ btn-left_' type='button'  ${!isBool ? "style='cursor: not-allowed; background-color: #b9b9b95e;color: unset;' disabled" : ""}>江苏</button>
            <button class='change-depot-btn-right_ btn-right_' type='button' ${!isBool ? "style='cursor: not-allowed; background-color: #b9b9b95e;color: unset;' disabled" : ""}>广东</button>
     </div>

     <div class='mb10 flex flex-sx-center'>
     <label style="font-size: 14px; width: 105px; z-index: 2;" class='ftw1000 box_'>一键锁仓
         <div class="circle_ tooltip_" data-msg='只操作多选框选中的现货' style="margin-left: 5px;">?</div>
     </label>
         <button class='lock-product btn-left_' type='button'>锁定</button>
         <button class='unlock-product btn-right_' type='button'>释放</button>
  </div>


     <div class='flex flex-sx-center space-between'>
        <div class="flex flex-d-col">
            <p class='ftw1000 box_ small_btn_ share_' style="margin-bottom: 10px;">一键分享</p>
            <p class='ftw1000 box_ small_btn_ share-parse'>一键解析</p>
        </div>
        <div class="parse-text-box">
            <textarea class='textarea' placeholder="请将他人分享的购物车文本，粘贴在此处，之后点击一键解析"></textarea>
        </div>
     </div>

     <!-- 查看平台优惠券列表 -->
     ${lookCouponListBtnFactory()}
</div>
`
    }

    /**
     * 手动刷新按钮
     * @returns
     */
    const refreshBtnFactory = () => {
        const svg_ = `<svg t="1716342086339" style="position: absolute; top: 24px; left: 4px; cursor: pointer;" class="icon refresh_btn_" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2572" width="24" height="24"><path d="M981.314663 554.296783a681.276879 681.276879 0 0 1-46.986468 152.746388q-105.706098 230.734238-360.983096 242.19829a593.06288 593.06288 0 0 1-228.689008-33.853939v-1.022615l-31.808709 79.979258a55.759429 55.759429 0 0 1-20.506122 22.551352 40.043451 40.043451 0 0 1-21.04434 5.382184 51.076928 51.076928 0 0 1-19.483507-5.382184 95.210839 95.210839 0 0 1-13.347817-7.158305 52.314831 52.314831 0 0 1-5.382184-4.628679L71.671707 731.908862a57.427906 57.427906 0 0 1-7.158305-21.528737 46.932646 46.932646 0 0 1 1.022615-17.438277 35.952991 35.952991 0 0 1 7.158305-13.347816 74.435608 74.435608 0 0 1 10.279972-10.279972 60.495751 60.495751 0 0 1 11.248765-7.373593 50.431066 50.431066 0 0 1 8.18092-3.606063 6.189512 6.189512 0 0 0 3.067845-1.776121l281.003839-74.866183a91.497132 91.497132 0 0 1 35.899168-2.583448 122.337047 122.337047 0 0 1 22.174599 6.404799 21.528737 21.528737 0 0 1 12.325202 12.325202 76.157907 76.157907 0 0 1 4.628679 14.854829 47.63233 47.63233 0 0 1 0 14.370431 55.167388 55.167388 0 0 1-2.04523 10.764369 10.764368 10.764368 0 0 0-1.022615 3.606063l-32.831324 79.979258a677.50935 677.50935 0 0 0 164.264262 39.505232q77.395809 7.696523 131.809692-3.606063a358.507291 358.507291 0 0 0 101.023598-36.921784 381.27393 381.27393 0 0 0 73.951211-50.753997 352.64071 352.64071 0 0 0 48.708767-55.382676 410.391547 410.391547 0 0 0 26.910921-41.550462c3.767529-7.481236 6.673908-13.616926 8.719139-18.460892zM40.885614 449.667121a685.69027 685.69027 0 0 1 63.563595-176.427998q118.0313-212.273346 374.330913-207.160271a571.803252 571.803252 0 0 1 207.160271 39.989629l33.853939-78.956643A75.619688 75.619688 0 0 1 735.187378 9.189165a37.67529 37.67529 0 0 1 15.393047-8.234742 42.303968 42.303968 0 0 1 14.854829-0.538219 47.578509 47.578509 0 0 1 13.347817 3.606064 102.907362 102.907362 0 0 1 11.302586 6.13569 49.569917 49.569917 0 0 1 6.673909 4.628678l3.067845 3.067845 154.84544 276.913379a81.970666 81.970666 0 0 1 6.13569 22.712817 46.986468 46.986468 0 0 1-1.022615 17.438277 32.293105 32.293105 0 0 1-7.696523 13.347817 69.322533 69.322533 0 0 1-10.764369 9.741753 92.142994 92.142994 0 0 1-11.302587 6.673909l-8.18092 4.09046a7.104483 7.104483 0 0 1-3.067845 1.022615l-283.049068 67.546412a112.003254 112.003254 0 0 1-46.125319-1.022615c-11.571696-3.390776-19.160576-8.019454-22.551352-13.832214a41.173709 41.173709 0 0 1-5.382184-21.04434 97.256069 97.256069 0 0 1 1.291724-17.438277 24.381295 24.381295 0 0 1 3.067845-8.234742L600.632773 296.81309a663.730958 663.730958 0 0 0-164.102797-43.057474q-77.987849-9.203535-131.809692 0a348.227319 348.227319 0 0 0-101.292707 33.853938 368.571976 368.571976 0 0 0-75.350579 49.246986 383.31916 383.31916 0 0 0-50.269601 54.360061 408.507783 408.507783 0 0 0-28.740863 41.012244A113.025869 113.025869 0 0 0 40.885614 449.667121z m0 0" fill="#3498db" p-id="2573"></path></svg>`
        return svg_
    }

    /**
     * 手动刷新按钮 点击事件
     */
    const refreshBtnHandler = () => {
        $('.refresh_btn_').click(function() {
            cartModuleLoadCartList()
            allRefresh()
            Qmsg.success(`静默刷新购物车成功！`)
        })
    }

    /**
     * 版本号点击事件
     */
    const versionClickHandler = () => {
        $('#version__').on('click', function() {
            GM_setClipboard(
                'https://greasyfork.org/zh-CN/scripts/491619-%E5%98%89%E7%AB%8B%E5%88%9B%E8%B4%AD%E7%89%A9%E8%BD%A6%E8%BE%85%E5%8A%A9%E5%B7%A5%E5%85%B7',
                "text",
                () => Qmsg.success('插件地址已设置到剪贴板中！'))
        })
    }

    /**
     * 显示隐藏 小窗的的按钮展示
     */
    const showOrHideButtonFactory = () => {

        $('.hideBtn,.showBtn').remove()

        return `
<div class="hideBtn" ${getLocalData('SHOW_BOOL') === 'false' ? 'hide_' : ''}>
    收起助手 >
</div>
<div class="showBtn ${getLocalData('SHOW_BOOL') === 'true' ? 'hide_' : ''}" >
    < 展开助手
</div>
`
    }

    /**
     * 查询购物车中的品牌数量总和（多选框选中）
     */
    const brandCountFactory = () => {
        return `
<p class='small-sign small-sign-pos'>
    ${dataCartMp.size}
</p>
`
    }

    /**
     * 计算总的金额
     */
    const totalMoneyFactory = () => {

        let t = 0

        if (dataCartMp.size > 0) {
            t = [...dataCartMp.values()].reduce((total, num) => total + num).toFixed(2)
        }

        return `
<p class='total-money_'>
    ${t}
</p>
`
    }

    /**
     * 查询16-15优惠券列表
     */
    const lookCouponListBtnFactory = () => {
        return `
    <p class='look-coupon-btn'>
    优惠券专区
    </p>
    `
    }

    /**
     * 查看优惠券页面的扩展按钮，绑定事件
     */
    const lookCouponListExtendsBtnHandler = () => {

        // 查看已领取的优惠券
        $('.filter-haved').off('click').on('click', function() {
            $('.coupon-item:visible:not(:contains(立即使用))').hide()
        })

        // 过滤16-15的优惠券
        $('.filter-16-15').off('click').on('click', function() {
            $('.coupon-item:visible:not(:contains(满16可用))').hide()
        })

        // 过滤20-15的优惠券
        $('.filter-20-15').off('click').on('click', function() {
            $('.coupon-item:visible:not(:contains(满20可用))').hide()
        })

        // 过滤新人优惠券
        $('.filter-newone').off('click').on('click', function() {
            $('.coupon-item:visible:not(:contains(新人专享))').hide()
        })

        // 过滤非新人优惠券
        $('.filter-not-newone').off('click').on('click', function() {
            $('.coupon-item:visible:contains(新人专享)').hide()
        })


        // 手动刷新优惠券页面
        $('.refresh-coupon-page').off('click').on('click', function() {
            setTimeout(() => {
                Qmsg.info(`1秒后刷新优惠券页面...`)
                setTimeout(() => lookCouponListModal(true), 500);
            }, 500);

        })



        // 一键领取当前显示的所有优惠券
        $('.get-all').click(function() {
            const $couponEles = $('.coupon-item:visible div:contains(立即抢券)')

            let totalCount = 0,
                successCount = 0;
            $couponEles.each(function() {

                //优惠券ID
                const couponId = $(this).data('id')

                // 优惠券名称
                const couponName = $(this).data('name')

                getAjax(`${webSiteShareData.lcscWwwUrl}/getCoupon/${couponId}`).then(res => {
                    res = JSON.parse(res)
                    if (res.code === 200 && res.msg === '') {
                        successCount++
                        // console.log(`${couponName} 优惠券领取成功`)
                    } else {
                        // console.error(`${couponName} 优惠券领取失败，或者 已经没有可以领取的优惠券了！`)
                    }
                })

                totalCount++
            })

            if (successCount === 0) {
                Qmsg.error(`优惠券领取失败，或者已经没有可以领取的优惠券了！`)
            } else if ($couponEles.length === totalCount) {
                Qmsg.success(`优惠券领取成功！成功：${successCount}条，失败：${totalCount - successCount}条。`)
                setTimeout(() => {
                    Qmsg.info(`2秒后刷新优惠券页面...`)

                    // 由于调用接口领取，所以需要重新渲染优惠券页面
                    setTimeout(lookCouponListModal, 2000);
                }, 2000);
            }
        })

        // 过滤新人优惠券
        $('.filter-clear').click(function() {
            $('.coupon-item:hidden').show()
        })
    }

    /**
     * 查看优惠券列表的按钮
     */
    const lookCouponListHandler = () => {
        const _lookCouponClick = () => {
            if ($('#couponModal').is(':hidden')) {
                $('#couponModal').show()
            } else if ($('#couponModal').is(':visible')) {
                $('#couponModal').hide()
            }
        }
        $('.look-coupon-btn,.look-coupon-closebtn').on('click', _lookCouponClick)
    }

    // 优惠券模态框的锁
    var lookCouponLock = false;
    /**
     * 优惠券模态框
     */
    const lookCouponListModal = async(clear = false) => {

        if (lookCouponLock || !plguinIsHavedAndShow() || ($('.couponModal .all-coupon-page').length > 0 && clear === false)) {
            return;
        }
        //上锁, 防止这次还没处理完， 下次定时任务就已经就绪了。
        lookCouponLock = true;
        let couponHTML = await getAjax(`${webSiteShareData.lcscWwwUrl}/huodong.html`);

        const $couponHTML = $(couponHTML);

        let $cssLink = [...$couponHTML].filter(item => item.localName == 'link' && item.href.includes('/public/css/page/activity/couponAllCoupons'))[0].outerHTML;
        let $jsLink = [...$couponHTML].filter(item => item.localName == 'script' && item.src.includes('/public/js/chunk/page/activity/couponAllCoupons'))[0].outerHTML;

        let $main_wraper = $couponHTML.find('.main_wraper');
        let $navigation = $couponHTML.find('.navigation');

        let ht = `
    <div class="all-coupon-page"></div>
        <div class="common-alert-success-tip-tmpl common-confirm-del">
        <div class="common-confirm-del-title">
            <h3>成功提示</h3>
            <a style="cursor: pointer;" class="common-confirm-del-close"></a>
        </div>
        <div class="common-confirm-del-content">
            <p class="common-confirm-del-content-txt success">content</p>
            <div class="common-confirm-del-btn">
            <input type="button" class="common-confirm-a" value="确定">
            </div>
            <div class="common-confirm-del-icon-success"></div>
        </div>
        </div>
        <div class="mask">
    </div>`;
        const $couponEle = $('.couponModal');
        $couponEle.empty().append(ht).append($cssLink).append($jsLink);

        $('.couponModal .all-coupon-page').append($main_wraper).append($navigation);

        couponGotoHandler();
        // 解锁
        lookCouponLock = false;
    }

    /**
     * 品牌多选按钮监听处理事件
     * 追加html、事件监听、模态框都放在这里写
     */
    const lookCouponCheckboxHandler = () => {
            if ($('#batch-check-branch').length == 0 && $('.batch-del-btn').length > 0) {
                $('.foot-tool-left div:eq(0)').append(`
        <span id="batch-check-branch" style="margin-left: 10px;
        margin-left: 6px;
        padding: 10px 12px;
        background: #0093e6;
        border-radius: 2px;
        cursor: pointer;
        color: white;">批量选择现货品牌</span>
        `);

                // 动态刷新勾选框状态，商品下所有商品选中的状态才会打勾
                setInterval(() => {
                    // 小模态框未显示的话，直接跳过
                    if ($('#batch-check-branch-box').length === 0 || $('#batch-check-branch-box').is(':hidden')) {
                        return;
                    }
                    // CHECKED选中、UNCHECKED未选中、INDETERMINATE不确定
                    var ckMap = checkboxStatusGroupByBrandName();
                    ckMap.forEach((checkStatus, brandName) => {
                        brandName = brandNameDataProcess(brandName);
                        // 判断状态
                        switch (checkStatus) {
                            case 'CHECKED':
                                $(`input#${brandName}-ckbox`).prop('checked', true);
                                $(`input#${brandName}-ckbox`)[0].indeterminate = false;
                                break;
                            case 'UNCHECKED':
                                $(`input#${brandName}-ckbox`).prop('checked', false);
                                $(`input#${brandName}-ckbox`)[0].indeterminate = false;
                                break;
                            case 'INDETERMINATE':
                                $(`input#${brandName}-ckbox`)[0].indeterminate = true;
                                break;
                        }
                    })
                }, 1500);

                // 点击事件监听
                $('#batch-check-branch').on('click', function() {
                            const $box = $('#batch-check-branch-box');
                            if ($box.length == 0) {
                                $('body').append(`
                <div id="batch-check-branch-box" style="
                    position: fixed;
                    flex-wrap: wrap;
                    display: flex;
                    bottom: 55px;
                    left: 25%;
                    z-index: 100;
                    overflow: auto;
                    width: 500px;
                    background-color: white;
                    border: 3px solid #3498db;
                    border-radius: 5px;
                    ">
                ${[...dataBrandColorMp.keys()].reverse().map(brandName => {
                    var tempBname = brandName;
                    brandName = brandNameDataProcess(brandName);
                    return `<div class="hover-cs checkbox-branch-btn" style="background-color: ${dataBrandColorMp.get(tempBname)};
                                        width: fit-content;
                                        height: fit-content;
                                        font-size: 14px;
                                        margin: 5px 0px 5px 5px;
                                        padding: 5px;
                                        cursor: pointer;
                                        color: white;">
                                <label id="${brandName}-ckbox" style="cursor: pointer;display: flex;">
                                    <input id="${brandName}-ckbox" type="checkbox" style="margin-right: 5px; cursor: pointer;">${tempBname}</input>
                                </label>
                            </div>`
                }).join('')}
                </div>
                `);
                // 点击事件-选中指定品牌的所有商品
                $('.checkbox-branch-btn').on('click', function() {
                    var brandName = $(this).find('label').text().replace(/[ \n]/g, '');
                    checkBoxByBrandName(brandName, $(this).find('input[type=checkbox]').is(':checked')?1:0);
                })
        }
        $box.is(':visible') ? $box.hide() : $box.show();
    })
}
}

// 暂存已经领取的优惠券列表
var havedCouponList = [];
/**
* 比较慢的定时，去尝试获取已经拥有的优惠券
* 遍历我的优惠券页面，这显然不是一个很好的方法
*/
const lookHavedCouponList = () => {
// 清空集合
havedCouponList = [];
// 动态url
const renderUrl = (page) =>  `https://activity.szlcsc.com/member/couponList.html?currentPage=${page || 1}&couponUseStatus=no`;
// 当前页标记
var currentPage = 1;
// 定时取页面数据
var lookHavedCouponTimer = setInterval(async () => {
    // http获取我都优惠券
    let couponHTML = await getAjax(renderUrl(currentPage));
    var $html = $(couponHTML);
    // 查看当前页是否有优惠券
    var isNull = $html.find('td:contains(没有相关优惠券记录)').length > 0;
    // 没找到优惠券
    if(isNull) {
        // 清除定时
        clearInterval(lookHavedCouponTimer);
        lookHavedCouponTimer = null;
        // 30秒后再次尝试看有没有领的优惠券
        setTimeout(lookHavedCouponList, 30 * 1000);
        return;
    }
    // 剩下的是有券的时候
    else {
        havedCouponList = [...new Set(
            [
            ...havedCouponList,
            // 这里不关心 面板定制券、运费券  也不关心优惠券的金额。只要品牌名称对应上就算有券了。
            ...($html.find('span.yhjmingchen').text().split(/品牌优惠券?/g).map(item => item.replace(/.+元/g, '')).filter(item => item && !item.includes('面板定制', '运费券')))
        ])];
    }
    currentPage++;
    // 追加显示优惠券的状态
    if (plguinIsHavedAndShow()) {
        $('.bd ul li .appendStatus').each(function() {
            var isTrue = havedCouponList.includes($(this).attr('brandName'));
            if(isTrue) {
                $(this).off('click').removeClass('to_cou').css({
                    border: 'none',
                    background: 'transparent',
                    color: 'white',
                    fontSize: '12px'
                }).text('已领取-优惠券');
            }
        });
    }
}, 500);
}

/**
* 根据品牌名称分组多选框选中状态
* CHECKED选中、UNCHECKED未选中、INDETERMINATE不确定
* 只查现货的
*/
const checkboxStatusGroupByBrandName = () => {
// 获取现货
var $ele = getHavedLineInfo();
// 品牌名是否全选
var ckMap = new Map();
[...$ele].forEach(function(that) {
    var $this = $(that);
     // 品牌名称
    let brandName = $this.find('.cart-li-pro-info div:eq(2)').text().trim();
    // 查找到品牌名称
    brandName = getBrandNameByRegex(brandName.split('\n')[brandName.split('\n').length - 1].trim());
    // 处理特殊字符
    brandName = brandNameDataProcess(brandName);
    var $checkedEle = $this.find('input.check-box');
    // 当前元素的选中状态
    var currentCheckStatus = $checkedEle.is(':checked') ? 'CHECKED' : 'UNCHECKED';
    // 如果已经是未全选状态，直接跳出该品牌了
    if(ckMap.get(brandName) === 'INDETERMINATE') {
        return;
    }
    // 不确定的状态判断
    if(ckMap.get(brandName) != null && ckMap.get(brandName) != currentCheckStatus) {
        ckMap.set(brandName, 'INDETERMINATE');
        return;
    }
    // 默认
    ckMap.set(brandName, currentCheckStatus);
    if (currentCheckStatus === 'UNCHECKED') {
        ckMap.set(brandName, currentCheckStatus);
    }
})

return ckMap;
}

/**
* 常规的多选框事件，指定品牌的
* @param {*} brandName
* @param {*} type  1选中、0移除选中
*/
const checkBoxByBrandName = (brandName, type) => {
var $ele = getHavedLineInfoByBrandName(brandName);
var $checkedEle = $ele.find('input.check-box:checked');
var $notCheckedEle = $ele.find('input.check-box:not(:checked)');
if(type === 1) {
    $notCheckedEle.click();
}
else if(type === 0) {
    $checkedEle.click();
}
}

/**
* 获取勾选框选中的物料编号集合，波浪线分割
*/
const myGetCK = () => {
return [...getAllCheckedLineInfo().map(function () {
    return $(this).attr('id').split('-')[2]
})].join('~')
}


/**
* 更新购物车勾选
*/
const cartUpdateChecked = () => {
return new Promise((resolve, reject) => {
    try {
        postFormAjax(`${webSiteShareData.lcscCartUrl}/page/home/cart/update/checked`, { ck: (myGetCK() || 'false') }).then(res => {
            res = JSON.parse(res)
            if (res.code === 200 && res.msg === null) {
                resolve('true')
            } else {
                resolve('true')
            }
        })
    } catch (error) {
        console.error(error);
        reject('false')
    }
})
}

/**
* 根据品牌名称 查询是否多仓
* @returns true多仓，false 非多仓
*/
const juageMultiDepotByBrandName = (brandName) => {
//这样是多仓 ['江苏', '广东', '']
return new Set($(`.product-item:contains("${brandName}")`).find('.warehouse:contains("仓")').text().replace(/[^广东江苏仓]+/g, '').split('仓')).size === 3
}

/**
* 追加的html
* @returns
*/
const htmlFactory = () => {

let tempHtml = `
${$('.couponModal').length === 0 ? `
<div id="couponModal" style="display: none;">
    <div class="extend-btn-group_">
        <p class="coupon-item-btn-text_ refresh-coupon-page">刷新领券页面</p>
        <p class="coupon-item-btn-text_ filter-clear">清空筛选</p>
        <p class="coupon-item-btn-text_ filter-haved">查看已领取</p>
        <p class="coupon-item-btn-text_ filter-16-15">筛选16-15</p>
        <p class="coupon-item-btn-text_ filter-20-15">筛选20-15</p>
        <p class="coupon-item-btn-text_ filter-newone">筛选新人券</p>
        <p class="coupon-item-btn-text_ filter-not-newone">筛选非新人券</p>

        <p class="coupon-item-btn-text_ get-all" style="height: auto;">一键领取</br>当前展示优惠券</p>
    </div>
    <!-- <p class="look-coupon-closebtn" style=''>X</p> -->
    <div class="couponModal">

    </div>
</div>

` : ''}

${showOrHideButtonFactory()}
<div class="bd ${getLocalData('SHOW_BOOL') === 'true' ? '' : 'hide_'}">
${buttonListFactory()}
<ul>`

const head = `
<li class='li-cs' style="position: sticky; top: 0px; background-color: white; z-index: 2;">
${refreshBtnFactory()}
        <div>
        <!-- 勾选的品牌数量 -->
            ${brandCountFactory()}

            <!-- 计算所有的总金额 -->
            ${totalMoneyFactory()}

            <span style='font-weight: 1000; color: black;width: 165px; line-height: 24px;' class="flex flex-zy-center">品牌名称
            </br>(现货)</span>
            <span style='font-weight: 1000; color: black; width: 90px;line-height: 24px;' class="flex flex-zy-center">总金额</span>
            <span style='font-weight: 1000; color: black; width: 80px;line-height: 24px;' class="flex flex-zy-center">差额</span>
            <span style='font-weight: 1000; color: black; line-height: 24px;' class="flex flex-zy-center">优惠券</br>(16-15) </span>
        </div>
    </li>
`

tempHtml += head

for (var [key, val] of sortMapByValue(dataCartMp)) {
    tempHtml += `
    <li class='li-cs click-hv ftw500'>
        <div>
            <p class="small-sign ${juageMultiDepotByBrandName(key) ? 'multi_' : 'multi_default'} multi_pos_" style="font-size: 12px; line-height: 100%;">多仓库</p>
            <span class='key sort_' style="width: 155px; text-overflow: ellipsis;overflow: hidden;white-space: nowrap;">${key}</span>
            <span class='val sort_' style="width: 90px;">${val}</span>
            <span class='val sort_' style="width: 80px;">${(16 - val).toFixed(2)}</span>
            ${couponHTMLFactory(key)}
        </div>
    </li>
    `
}

return tempHtml + `</ul>
<div style="display: flex;
    justify-content: space-between;
    padding: 4px 5px 4px;
    background: #fff;
    box-sizing: border-box;
    position: sticky;
    user-select:none;
    bottom: 0px;">
    <span id="version__" title="点击版本，可以复制插件地址~" style="color: #3498dbe7; font-size: 14px; font-family: fantasy; cursor: pointer;">${__version}</span>
    <span style="color: #777;">如果觉得插件有用，请分享给你身边的朋友~</span>
</div>
</div>`;
}

/**
* 优惠券按钮的html生成
* @param {*} brandName  品牌名称
*/
const couponHTMLFactory = (brandName) => {

// 优惠券实体
const couponEntity = all16_15CouponMp.get(brandName)

let buttonLine = ''

if (!$.isEmptyObject(couponEntity)) {

    // 是否已经领取
    if (couponEntity.isHaved === true) {
        buttonLine = `<span class='val' style="text-align: center; ">
            <span style="font-size: 12px;">已领取-${couponEntity.isNew === false ? '普通券' : '新人券'}</span>
        </span> `
    }
    else if (couponEntity.isUsed === true) {
        buttonLine = `<span class='val' style="text-align: center; ">
                          <span style="font-size: 12px;">本月已使用</span>
                      </span> `
    }
    else {
        buttonLine = `<span class='flex-sx-center flex-zy-center flex' style="padding: 0; width: 195px; text-align: center; ">
            <button type="button" class="to_cou appendStatus" brandName="${brandName}">${couponEntity.isNew === false ? '普通券' : '新人券'}</button>
         </span> `
    }
}
// 这里会查一遍我的优惠券，如果有的话，就证明有券。
return $.isEmptyObject(buttonLine) ? `<span class='val' style="text-align: center; ">
            <span class="appendStatus" brandName="${brandName}">${havedCouponList.includes(brandName) ? '优惠券已领取' : '' }</span>
        </span> ` : buttonLine
}


/**
* 追加的css
* @returns
*/
const cssFactory = () => `
<style id="myCss">
.hover-cs:hover {
color: #e1e1e1 !important;
cursor: pointer;
}

#couponModal {
height: 85vh;
position: fixed;
top: 40px;
right: 440px;
z-index: 9999;
overflow: auto;
background-color: white;
border: 3px solid #3498db;
border-radius: 5px;
padding: 5px 150px 0 10px;
margin-left: 40px;
}

.look-coupon-closebtn {
position: fixed;
top: 20px;
right: 210px;
border: 2px solid #3498db !important;
background-color: white;
padding: 5px 20px;
width: min-content !important;
border-radius: 5px;
zoom: 200%;
}

.bd {
position: fixed;
top: 40px;
right: 33px;
background-color: white;
border: 2px solid #3498db;
width: 380px;
padding: 3px 3px 0px 3px;
border-radius: 5px;
z-index: 99;
overflow: auto;
}

.ftw400 {
font-weight: 400;
}

.ftw500 {
font-weight: 500;
}

.ftw1000 {
font-weight: 1000;
}

.hideBtn,
.showBtn {
position: fixed;
top: 20px;
right: 10px;
background-color: white;
border: 2px solid #3498db;
width: 85px;
line-height: 30px;
text-align: center;
padding: 3px;
font-weight: 800;
border-radius: 5px;
z-index: 1501;
font-size: 16px;
cursor: pointer;
user-select:none;
}

.hide_ {
display: none;
}

.m10 {
margin: 10px;
}
.mb10 {
margin-bottom: 10px;
}
.mt10 {
margin-top: 10px;
}
.ml10 {
margin-left: 10px;
}
.mr10 {
margin-right: 10px;
}

.flex {
display: flex;
}

.flex-sx-center {
/*上下居中*/
align-items: center;
}

.space-between {
justify-content: space-between;
}

.flex-zy-center {
/*左右居中*/
justify-content: center;
}

.flex-d-col {
flex-direction: column;
}

.flex-d-row {
flex-direction: row;
}

.li-cs {
margin: 5px;
font-size: 14px;
box-sizing: border-box;
user-select:none;
position: relative;
}

.box_ {
box-sizing: border-box;
}

.click-hv:hover span {
color: #e1e1e1 !important;
cursor: pointer;
}

.li-cs div, .li-cs p {
display: flex;
width: 100%;
border: 2px solid #3498db;
border-radius: 5px;
}

.li-cs span {
padding: 10px;
width: 50%;
color: white;
box-sizing: border-box;
}

.li-cs .to_cou {
border: 1px solid white;
border-radius: 3px;
background-color: rgba(255, 255, 255, 0.6);
padding: 5px 15px;
color: #2c4985;
}

.cart-li-pro-info div:hover {
color: rgba(57, 46, 74, 0.9) !important;
}

.checkbox {
appearance: none;
width: 64px;
height: 32px;
position: relative;
border-radius: 16px;
cursor: pointer;
background-color: #777;
zoom: 90%;
}

.checkbox:before {
content: "";
position: absolute;
width: 28px;
height: 28px;
background: white;
left: 2px;
top: 2px;
border-radius: 50%;
transition: left cubic-bezier(0.3, 1.5, 0.7, 1) 0.3s;
}

.checkbox:after {
content: "开 关";
text-indent: 12px;
word-spacing: 4px;
display: inline-block;
white-space: nowrap;
color: white;
font: 14px/30px monospace;
font-weight: bold;
}

.checkbox:hover:before {
box-shadow: inset 0px 0px 5px 0px #3498db;
}

.checkbox:checked {
background-color: #3498db;
}

.checkbox:checked:before {
left: 34px;
}

.checkbox:checked:after {
color: #fff;
}

.small-sign {
padding: 2px 3px;
width: min-content !important;
font-weight: bold;
}

.small-sign-pos {
position: absolute;
top: 35px;
left: 70px;
}

.multi_ {
background: white;
color: #013d72 !important;
width: min-content !important;
font-weight: 200 !important;
border-radius: 2px !important;
padding: unset !important;
height: fit-content;
border: none !important;
font-size: 11px;
}

.multi_default {
width: min-content !important;
font-weight: 200 !important;
border-radius: 2px !important;
padding: unset !important;
height: fit-content;
border: none !important;
font-size: 11px;
color: #00000000;
}

.multi_pos {
position: absolute;
top: -3px;
left: 83px;
}

.total-money_ {
position: absolute;
top: 35px;
left: 123px;
padding: 2px 3px;
width: min-content !important;
font-weight: bold;
}


.look-coupon-btn {
font-weight: bold;
width: 110px !important;
height: 135px;
text-align: center;
line-height: 130px;
display: block !important;
background-color: #3498db;
position: absolute;
top: 20px;
right: 4px;
color: white;
font-size: 18px;
border-radius: 5px;
border: 2px solid #3498db;
user-select:none;
}

.btn-group_ {
border: 2px solid #3498db;
}

button.btn-left_,
button.btn-right_ {
width: 60px;
height: 30px;
border: unset;
background-color: white;
}

button.btn-right_:hover,
button.btn-left_:hover,
.to_cou:hover,
.showBtn:hover,
.look-coupon-closebtn:hover,
.look-coupon-btn:hover,
.share_:hover,
.coupon-item-btn-text_:hover
{
background-color: #53a3d6 !important;
color: white !important;
cursor: pointer;
}

button.btn-left_ {
border-left: 2px solid #3498db;
border-block: 2px solid #3498db;
border-radius: 5px 0 0 5px;
border-right: 2px solid #3498db;
}

button.btn-right_ {
border-right: 2px solid #3498db;
border-block: 2px solid #3498db;
border-radius: 0 5px 5px 0;
}

.circle_ {
display: inline-block;
width: 16px;
height: 16px;
border-radius: 50%;
background-color: #77b0e2;
color: #fff;
font-size: 12px;
text-align: center;
line-height: 15px;
position: relative;
}

.circle_::before {
content: "?";
font-size: 16px;
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
}

.tooltip_ {
position: relative;
font-size: 14px;
cursor: pointer;
}

.tooltip_:hover::before {
word-break: keep-all;
white-space: nowrap;
content: attr(data-msg);
position: absolute;
padding: 8px 10px;
display: block;
color: #424343;
border: 2px solid #3498db;
border-radius: 5px;
font-size: 14px;
line-height: 20px;
top: -47px;
left: 50%;
transform: translateX(-25%);
background-color: white;
}

.tooltip_:hover::after {
content: "﹀";
position: absolute;
top: -10px;
left: 50%;
-webkit-transform: translateX(-50%);
-ms-transform: translateX(-50%);
transform: translateX(-50%);
background: #fff;
color: #3498db;
height: 7px;
line-height: 10px;
background-color: white;
}


.all-coupon-page .navigation {
position: fixed;
left: unset !important;
right: 505px !important;
top: 470px !important;
z-index: 1000;
}

.all-coupon-page .main_wraper {
background: #fff;
zoom: 0.9;
width: unset !important;
}

.extend-btn-group_  {
position: fixed;
right: 480px;
top: 100px;
z-index: 888;
margin-left: -720px;
}

.extend-btn-group_ .coupon-item-btn-text_ {
box-sizing: border-box;
width: 100px;
height: 30px;
text-align: center;
background: #199fe9;
font-size: 14px;
font-weight: 400;
color: #fff;
line-height: 30px;
cursor: pointer;
border-radius: 4px;
margin-top: 9px;
}

.extend-btn-group_ .filter-clear {
color: #3498db;
background: white;
border: 1px solid #3498db;
font-weight: bolder;
}

.coupon-item {
margin: 0 7px 10px 7px !important;
}

.parse-text-box {
margin-right: 7px;
width: 100%;
}

.textarea {
width: 100%;
min-width: 230px !important;
min-height: 85px !important;
border: 1px solid #3498db;
border-radius: 3px;
}

.small_btn_ {
font-size: 14px;
width: 80px;
margin-right: 22px;
z-index: 2;
border: 2px;
background-color: #3498db;
cursor: pointer;
color: white;
text-align: center;
border-radius: 5px;
padding: 6px;
}

::-webkit-scrollbar {
 width:14px !important;
 height:unset !important;
}

::-webkit-scrollbar-thumb {
background: #e1e1e1 !important;
}

/* 选中任意的状态不确定的 <input> */
input:indeterminate {
background: lime;
}
</style>
`;

// /*滚动条整体样式*/
// .bd::-webkit-scrollbar {
// width: 10px;
// height: 1px;
// }
// /*滚动条里面小方块*/
// .bd::-webkit-scrollbar-thumb {
// border-radius: 10px;
// background-color: #b4b7ba;
// background-image:
//     -webkit-linear-gradient(
//     45deg,
//     rgba(255, 255, 255, .2) 25%,
//     transparent 25%,
//     transparent 50%,
//     rgba(255, 255, 255, .2) 50%,
//     rgba(255, 255, 255, .2) 75%,
//     transparent 75%,
//     transparent
//     );
// }
// /*滚动条里面轨道*/
// .bd::-webkit-scrollbar-track {
// -webkit-box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
// /*border-radius: 10px;*/
// background: #EDEDED;
// }

/**
* 追加到body
*/
const appendHtml = () => {

// console.time('appendHtml')

if ($('#myCss').length === 0) {
    $('body').append(cssFactory())
}

$('.bd').remove()
$('body').append(htmlFactory())

// =========== 事件 ==============
clickBrandHandler()
getCouponClickHandler()
showOrHideModalHandler()
onClickChangeDepotBtnHandler()
checkDepotBtnHandlerNew()
lookCouponListExtendsBtnHandler()
lookCouponListHandler()
shareHandler()
shareParseHandler()
lockProductHandler()
refreshBtnHandler()
versionClickHandler()
// =============================
resizeHeight()

// console.timeEnd('appendHtml')
}

/**
* 基础配置优化
*/
const basicSettings = () => {
// 多选框放大
$('input.check-box:not([style*=zoom])').css('zoom', '150%')

// 点击物料图片，操作多选框
$('.product-img:not([class*=click_do_])').addClass('click_do_')
    .on('click', function () {
        $(this).addClass('click_do_').prev('.check-box').click();
    })

// 购物车列表 点击品牌跳转到该品牌下的商品
$('.product-item li.cart-li-pro-info:not(:has([class*=open_do_]))').find('div:eq(2)')
    .css({ cursor: 'pointer' }).addClass('open_do_').click(function () {
        GM_openInTab(`${webSiteShareData.lcscSearchUrl}/global.html?k=${getBrandNameByRegex(this.innerText)}`, { active: true, insert: true, setParent: true })
    })
}


/**
* 遍历购物车清单，并计算品牌总金额
*/
const eachCartList = () => {
dataCartMp.clear()

getHavedCheckedLineInfo().each(function (i) {

    let $this = $(this)

    // 物料编号
    // let productNo = $this.find('ul li:eq(1) a').text().trim()

    // 品牌名称
    let brandName = $this.find('.cart-li-pro-info div:eq(2)').text().trim()

    // 查找到品牌名称
    brandName = getBrandNameByRegex(brandName.split('\n')[brandName.split('\n').length - 1].trim())

    // if ($this.find('input:checked').length === 0) {
    //     return
    // }

    // 品牌下的单个商品总价
    let linePrice = parseFloat($this.find('.line-total-price').text().trim().replace('￥', ''))

    // 日志打印控制台
    // console.log(productId, brandName, linePrice)

    let mpVal = $.isEmptyObject(dataCartMp.get(brandName)) ? 0 : dataCartMp.get(brandName)

    // 保存到Map中
    dataCartMp.set(brandName, parseFloat((mpVal + linePrice).toFixed(2)))


    if ($.isEmptyObject(dataBrandColorMp.get(brandName))) {
        // 对品牌进行随机色设置
        dataBrandColorMp.set(brandName, srdmRgbColor())
    }
})
}

/**
* 对品牌进行随机色设置
*/
const setBrandColor = () => {

//弹框 对品牌进行随机色设置
$('.li-cs').each(function (i) {
    $(this).css('background', dataBrandColorMp.get($(this).find('span:eq(0)').text().trim()))
})

// 购物车列表 品牌颜色设置
dataBrandColorMp.forEach((v, k) => {
    let brandElement = getHavedLineInfoByBrandName(k).find('ul li.cart-li-pro-info div:eq(2)')
    brandElement.css({
        'background-color': v,
        'width': 'min-content',
        'color': 'white'
    })

    brandElement.find('a').css({
        'color': 'white'
    })
})
}

/**
* 查找购物车中所有选中的行的元素（包含现货、订货）
*
*/
const getAllCheckedLineInfo = () => {
return $('.product-list .product-item input:checked').parents('.product-item')
}

/**
* 查找购物车中所有选中的行的元素（包含现货、订货）指定：江苏仓
*
*/
const getJsLineInfo = () => {
return $('.product-list .product-item .warehouse-wrap .warehouse:contains(江苏仓)')
}

/**
* 查找购物车中所有选中的行的元素（包含现货、订货）指定：广东仓
*
*/
const getGdLineInfo = () => {
return $('.product-list .product-item .warehouse-wrap .warehouse:contains(广东仓)')
}

/**
* 通过品牌名称，查找购物车中所在行的元素（包含现货、订货）
*/
const getAllLineInfoByBrandName = (brandName) => {
return $('.product-list .product-item:contains(' + brandName + ')')
}

/**
* 购物车中所在行的元素（包含现货、订货）
*/
const getAllLineInfo = () => {
return $('.product-list .product-item')
}

/**
* 通过品牌名称，查找购物车中的行元素(只获取现货商品)
*/
const getHavedLineInfoByBrandName = (brandName) => {
return $('.product-list .product-list-dl:eq(0) .product-item:contains(' + brandName + ')')
}

/**
* 购物车中的行元素(只获取现货商品)
*/
const getHavedLineInfo = () => {
return $('.product-list .product-list-dl:eq(0) .product-item')
}

/**
* 通过品牌列表名称，购物车中的行的元素(只获取现货商品)
*/
const getHavedLineInfoByBrandNameList = (brandNameList) => {
return $(
    [...getHavedLineInfo()].filter(item => {
        const brandName = getBrandNameByRegex($(item).find(`.cart-li:eq(2) div:eq(2)`).text().trim())
        return brandNameList.includes(brandName)
    })
)
}

/**
* 查找购物车中选中的行元素(只获取现货商品、选中的)
* product-list-dl eq 0 是现货
* product-list-dl eq 1 是订货
*
*/
const getHavedCheckedLineInfo = () => {
return $('.product-list .product-list-dl:eq(0) .product-item input:checked').parents('.product-item')
}

/**
* 查找购物车中没有选中的行元素(只获取现货商品、选中的)
* product-list-dl eq 0 是现货
* product-list-dl eq 1 是订货
*
*/
const getHavedNotCheckedLineInfo = () => {
return $('.product-list .product-list-dl:eq(0) .product-item input:not(:checked)').parents('.product-item')
}

/**
* 点击小窗口的品牌按钮，实现该品牌下的单选
* 且该品牌下的物料，会自动排到购物车的前面几条
*/
const clickBrandHandler = () => {
$('.click-hv .sort_').on('click', function (target) {
    let brandName = $(this).text().trim()

    let cutHtmlElement = []

    // 查找购物车 现货商品
    getHavedLineInfoByBrandName(brandName).each(function (i) {
        cutHtmlElement.push($(this))
    })

    cutHtmlElement.forEach(item => {
        $('.product-list .product-list-dl:eq(0) .product-item').insertAfter(item)
    })
})

/**
 * 小窗口品牌列表的双击事件
 * 双击全选品牌
 */
$('.click-hv .sort_').on('dblclick', function () {

    let brandName = $(this).text().trim()

    // 当前品牌行
    const $brandEle = $(`.product-item:contains("${brandName}")`)
    // 当前品牌选中的
    const $brandCheckedEle = $(`.product-item:contains("${brandName}") li.cart-li .check-box:checked`)
    // 当前品牌没有选中的
    const $brandNotCheckedEle = $(`.product-item:contains("${brandName}") li.cart-li .check-box:not(:checked)`)

    // 当前品牌全选
    if ($brandCheckedEle.length != $brandEle.length) {
        setAwaitFunc(10, function () {
            $brandNotCheckedEle.click();
        })
        return;
    }

    /**
     * 过滤封装
     * @param {*} eles
     * @returns
     */
    const _filterNotSelf = (eles, brandName_, finder) => {
        return $([...eles].filter(item => {
            return $(item).find(`li.cart-li:eq(2):not(:contains(${brandName_}))`).length > 0
        })).find(finder)
    }

    // 获取选中的现货
    const $havedEles = getHavedCheckedLineInfo()


    // 看看有没有选中除自己之外，其他品牌的商品
    const isNckOtherPdtsBool = _filterNotSelf($havedEles, brandName, `li.cart-li:eq(2):not(:contains(${brandName}))`).length > 0

    if (isNckOtherPdtsBool) {
        // 获取现货
        setAwaitFunc(10, function () {
            _filterNotSelf($havedEles, brandName, `li.cart-li .check-box:checked`).click()
        })
    }
    else {
        // 全选
        setAwaitFunc(10, function () {
            _filterNotSelf(getHavedNotCheckedLineInfo(), brandName, `li.cart-li .check-box:not(:checked)`).click()
        })
    }
})
}

/**
* 多选框变化，刷新小窗口的计算结果
*/
const checkStatusChangeHandler = () => {
// $(".check-box,.check-box-checked-all").change(refresh)

$(".check-box,.check-box-checked-all").change(() => {
    setTimeout(refresh, 1000);
})
}

/**
* 获取优惠券列表信息，并暂存在变量集合中
*/
const getCouponHTML = async () => {
// http获取优惠券信息
let couponHTML = await getAjax(`${webSiteShareData.lcscWwwUrl}/huodong.html`)
// 遍历优惠券
$(couponHTML).find('.coupon-item:contains(满16可用) div[data-id]').each(function () {
    // 获取当前元素
    let $this = $(this);
    // 优惠券id
    let couponId = $this.data('id');
    // 是否已经领取
    let isHaved = $this.find(':contains(立即使用)').length > 0;
    // 优惠券名称
    let couponName = $this.data('name');
    // 对应的品牌主页地址
    let brandIndexHref = $this.data('href');
    // 优惠券金额
    let couponPrice = couponName.replace(/^.*?\>(.*?)元.*$/, '$1');
    // 品牌名称
    let brandName = couponName.replace(/^.*?元(.*?)品牌.*$/, '$1');
    // 是否新人优惠券
    let isNew = couponName.split('新人专享').length >= 2;
    // 是否已经使用过
    let isUsed = $this.find(':contains(已使用)').length > 0;

    // 一些优惠券特殊处理
    if(brandName === 'MDD') {
        // 存到变量Map中
        all16_15CouponMp.set('辰达半导体', {
            couponName, // 优惠券名称
            isNew, // 是否新人专享
            couponPrice, //优惠券金额减免
            brandName: '辰达半导体', // 品牌名称
            couponId, // 优惠券id
            isHaved, // 是否已经领取
            isUsed, // 是否已经使用过
            brandIndexHref, // 对应的品牌主页地址
            couponLink: `${webSiteShareData.lcscWwwUrl}/getCoupon/${couponId}`, // 领券接口地址
        });
    }

    // 存到变量Map中
    all16_15CouponMp.set(brandName, {
        couponName, // 优惠券名称
        isNew, // 是否新人专享
        couponPrice, //优惠券金额减免
        brandName, // 品牌名称
        couponId, // 优惠券id
        isHaved, // 是否已经领取
        isUsed, // 是否已经使用过
        brandIndexHref, // 对应的品牌主页地址
        couponLink: `${webSiteShareData.lcscWwwUrl}/getCoupon/${couponId}`, // 领券接口地址
    });
});
}

/**
* 优惠券领取按钮的绑定事件
*/
const getCouponClickHandler = () => {
$('.to_cou').click(async function (target) {
    let brandName = $(this).parents('span').siblings('.key').text()

    // 优惠券实体
    let couponEntity = all16_15CouponMp.get(brandName)

    if (!$.isEmptyObject(couponEntity)) {
        let res = await getAjax(couponEntity.couponLink)
        // console.log(res)

        let resParseData = JSON.parse(res)
        if (resParseData.result === 'success') {
            Qmsg.success(`${couponEntity.couponName}，领取成功！`)
            refresh(true)
        } else {
            Qmsg.error(resParseData.msg)
        }
    }
})
}

// 隐藏/显示 小窗
const showOrHideModalHandler = () => {
$('.showBtn,.hideBtn').click(function (target) {
    let $bd = $('.bd')

    if ($bd.is(':hidden')) {
        $('.hideBtn').show()
        $('.showBtn').hide()
        setLocalData('SHOW_BOOL', true)
        refresh()
    } else if ($bd.is(':visible')) {
        $('.showBtn').show()
        $('.hideBtn').hide()
        $('#couponModal').hide()
        setLocalData('SHOW_BOOL', false)
    }

    $bd.fadeToggle()
})
}

/**
* 优惠券快速入口
*/
const couponGotoHandler = () => {

if ($('.coupon-item-goto').length > 0) {
    return;
}

if ($('#conponCss_').length === 0)
    $('body').append(`
    <style id="conponCss_">
        .coupon-item-goto {
            user-select:none;
            right: 6% !important;
            left: unset !important;
            width: 43% !important;
            position: absolute;
            bottom: 12px;
            margin-left: -96px;
            box-sizing: border-box;
            height: 30px;
            text-align: center;
            font-size: 14px;
            font-weight: 400;
            color: #fff;
            line-height: 30px;
            cursor: pointer;
            border-radius: 4px;
            background: #53a3d6;
        }
        .watch-category-btn:hover,.coupon-item-goto:hover
        {
            opacity: 0.9;
            color: white !important;
            cursor: pointer;
        }
        .open-tab-search:hover
        {
            opacity: 0.9;
            background-color: #e0e0e0;
            cursor: pointer;
        }
        .coupon-item-btn {
            width: 43% !important;
        }
        .watch-category-btn {
            user-select:none;
            right: 13px !important;
            top: 10px !important;
            width: 33% !important;
            position: absolute;
            margin-left: -96px;
            box-sizing: border-box;
            height: 30px;
            text-align: center;
            font-size: 14px;
            font-weight: 400;
            color: #fff;
            line-height: 30px;
            cursor: pointer;
            border-radius: 4px;
            background: #e9a719;
        }
        .qmsg.qmsg-wrapper {
            z-index: 1000000 !important;
        }
    </style>
    `)

    const append_ = `<a class='coupon-item-goto' href="" target="_blank">快速入口</a>`;
    $('.coupon-item').each(function () {
        const $this = $(this)
        const btnBackgound = $this.hasClass('coupon-item-plus') ? '#61679e' : ($this.hasClass('receive') ? 'linear-gradient(90deg,#f4e6d6,#ffd9a8)' : '#199fe9')

        $this.append(append_)

        const dataUrl = $this.find('div.coupon-item-btn').data('url');
        const dataName = $this.find('div.coupon-item-btn').data('name');
        if (dataUrl.includes('/brand')) {
            $this.append(`<p class='watch-category-btn' data-url="${dataUrl}" data-name="${dataName}">查看类目</p>`)
        }
        if ($this.hasClass('receive')) {
            $this.find('.coupon-item-goto').css({ color: 'unset' })
        }

        $this.find('.coupon-item-goto').css({ background: btnBackgound })
        $this.find('.coupon-item-goto').attr('href', $this.find('div[data-id]').data('url'))
    });

    $(`p.watch-category-btn`).off('click').on('click', function() {
        const brandNameTitle = $(this).data('name');
        const brandDataUrl = $(this).data('url');
        const brandName = getBrandNameByRegexInCouponTitle(brandNameTitle);
        searchGlobalBOM(brandName, brandNameTitle, brandDataUrl);
    });
}

const searchGlobalBOM = async (k, title, brandDataUrl) => {
    const brandId = brandDataUrl.replaceAll(/[^\d]+/g, '');
    const url = `https://bom.szlcsc.com/global?k=${k}&pageSize=1&pageNumber=1`;
    const res = await getAjax(url);

    const resJsonObject = JSON.parse(res)

    if(resJsonObject.code === 200) {
        const renderCatelogHtml = JSON.parse(resJsonObject.result.catalogGroupJson)
        .map(e => `<span data-search-k="${e.label}" data-brand-id="${brandId}" 
                    class="open-tab-search" style="cursor: pointer; border: 1px solid black;padding: 5px 10px;margin-left: 10px; margin-bottom: 10px; height: min-content;">
                        ${e.label}(${e.count})</span>`).join(``);
        Qmsg.info({
            content: `
            <h1 style="padding: 20px 10px 10px; color: #199fe9db;">${title}</h1>
            <div style="color: black;flex-flow: wrap; padding: 20px 0;
                width: 46vw;flex-flow: wrap;
                display: flex;
                max-height: 55vh;
                overflow-y: auto;
                align-content: flex-start;
                ">
                ${renderCatelogHtml}
            </div>
            `,
            autoClose: false,
            html: true,
        });

        $('.qmsg.qmsg-wrapper').css('top', '18%');
        $('i.qmsg-icon:not(.qmsg-icon-close)').remove();
        $('i.qmsg-icon-close').css('zoom', '200%');

        // 跳转到对应的分类下查询
        $('span.open-tab-search').off('click').on('click', function() {
            const searchK = $(this).data('search-k');
            const brandId = $(this).data('brand-id');
            GM_openInTab(`${webSiteShareData.lcscSearchUrl}/global.html?k=${searchK}&gp=${brandId||''}`, { active: true, insert: true, setParent: true })
        });
    }
}

/**
* 页面加载的时候，控制小窗显示隐藏
*/
const onLoadSet = () => {
// if (getLocalData('SHOW_BOOL') === 'false') {
//     $('#bd').hide()
//     $('.hideBtn').click()
// }

// if (getLocalData('AUTO_GET_COUPON_BOOL') === 'true') {
//     $('.auto-get-coupon').attr('checked', true)
// }

// $('textarea').css('min-width', `${$('textarea').css('width')} !important`)
}

/**
* 刷新小窗口数据
* @param {*} notRefreshCouponHtml 是否更新优惠券集合数据
*/
const refresh = async (notRefreshCouponHtml) => {

// console.time('refresh')

if (getLocalData('SHOW_BOOL') === 'false') {
    return
}

// 是否更新优惠券集合数据，主要更新是否领取的状态
if (notRefreshCouponHtml === true) {
    await getCouponHTML()
}

eachCartList()
appendHtml()

setBrandColor()

// console.timeEnd('refresh')
}

/**
* 全部刷新重置
*/
const allRefresh = async () => {

await getCouponHTML()

refresh(true)

checkStatusChangeHandler()
onChangeCountHandler()
autoGetCouponTimerHandler()


lookCouponListModal()

// await setAwait(1000)
// onLoadSet()
}

/**
* 重置小窗口的高度
*
*/
const resizeHeight = () => {

if (((window.innerHeight - 120) < $('.bd').height())) {
    $('.bd').height('82vh')
} else {
    $('.bd').height('auto')
}
}

/**
* 购物车页面 初始化（只执行一次）
*/
const cartStart = async () => {

// 判断是否已经处理完成，否则会有性能问题
basicSettings()

// 插件只执行一次
if (plguinIsHaved()) { return; }

window.addEventListener('resize', resizeHeight)

eachCartList()
await getCouponHTML()
appendHtml()
setBrandColor()

checkStatusChangeHandler()
onChangeCountHandler()
autoGetCouponTimerHandler()

// onLoadSet()
lookCouponListModal()
lookCouponCheckboxHandler()
lookHavedCouponList()
}

/**
* 搜索页
* @param {*} isNew 是否新人 true/false
* @param {*} type 单选多选 ONE/MORE
*/
const searchStart = async () => {
/**
* 搜索列表中，对品牌颜色进行上色
* list.szlcsc.com/catalog
*/
const catalogListRenderBrandColor = () => {
    for (let [brandName, brandDetail] of all16_15CouponMp) {
        // 获取页面元素
        const $brandEle = $(`li[title*="${brandName}"]:not([style*=background-color]),span[title*="${brandName}"]:not([style*=background-color]),a.brand-name[title*="${brandName}"]:not([style*=background-color])`);
        // && $brandEle.css('background-color') === "rgba(0, 0, 0, 0)"
        if ($brandEle.length > 0) {
            $brandEle.css({
                "background-color": brandDetail.isNew ? '#00bfffb8' : '#7fffd4b8'
            })
        }
    }
}

catalogListRenderBrandColor()

// 回到顶部  嘉立创的返回顶部，在展开客服里。
// if ($('div.logo-wrap').hasClass('active')) {
//     if ($('#scrollTo_').length === 0) {
//         $('#productListFixedHeader:visible').parents('body').after(`
//         <a id="scrollTo_" style="border-radius: 5px;
//                                 z-index: 10000;
//                                 position: fixed;
//                                 right: 45px;
//                                 bottom: 45px;
//                                 padding: 10px 10px 5px 10px;
//                                 background: white;
//                                 border: 2px solid #199fe9;
//                                 font-size: 20px;
//                                 font-weight: 600;" href="javascript:scrollTo(0,0)">
//             <svg t="1716543304931" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4240" width="40" height="40"><path d="M0 96V0h1024v96z" fill="#3498db" p-id="4241"></path><path d="M384 1022.72V606.4H255.488a64 64 0 0 1-46.336-108.16l256.448-269.312a64 64 0 0 1 92.8 0l255.744 269.44a64 64 0 0 1-46.4 108.032h-120.32v416.32H384z" fill="#3498db" p-id="4242"></path></svg>
//         </a>
//         `);
//     }
// } else {
//     $('#scrollTo_').remove();
// }

if ($('span[class*=select-spec-]').length === 0) {
    // 查询封装规格
    const selectSpecHandler = () => {
        /**
         * 模糊查
         * 如果多选中没有查找到规格，则做一些小小的递归数据处理
         * @param {*} specName
         * @returns
         */
        const _MHCEachClick = (specName) => {
            if ($(`.det-screen:contains("封装：") label.fuxuanku-lable:contains("${specName}")`).length > 0) {
                $(`.det-screen:contains("封装：") label.fuxuanku-lable:contains("${specName}")`).click();
            } else {
                if (specName.includes('-')) {
                    _MHCEachClick(specName.split('-').slice(0, -1).join('-'));
                }
            }
        }
        /**
         * 精确查
         * 如果多选中没有查找到规格，则做一些小小的递归数据处理
         * @param {*} specName
         * @returns
         */
           const _JQCEachClick = (specName) => {
            if ($(`.det-screen:contains("封装：") label.fuxuanku-lable[title="${specName}"]`).length > 0) {
                $(`.det-screen:contains("封装：") label.fuxuanku-lable[title="${specName}"]`).click();
            } else {
                if (specName.includes('-')) {
                    _JQCEachClick(specName.split('-').slice(0, -1).join('-'));
                }
            }
        }

        /**
         * 封装查询-多选框点击
         * @param specName   规格封装名称
         * @param selectType 模糊查：MHC，精确查：JQC
         */
        const _clickSpecFunc = async (specName, selectType) => {
            // 统一文字
            $(`.det-screen:contains("规格：") .det-screen-title`).text('封装：');
            // 展开规格
            $(`.det-screen:contains("封装：") #more-standard`).click();

            switch (selectType) {
                // 模糊查
                case "MHC":
                    _MHCEachClick(specName);
                    break;
                // 精确查
                case "JQC":
                     _JQCEachClick(specName);
                    break;
            }

            // 查找规格对应的选项
            $(`.det-screen:contains("封装：") input[value="确定"]`).click();
        }

        $('.li-ellipsis:contains("封装:")').each(function () {
            // 查询到点击追加的规格名称
            let specName = $(this).find('span:eq(1)').attr('title');
            // 页面追加按钮元素
            $(this).after(`
            <li class="li-el">
            <span class="select-spec-mh" style="border-radius: 2px; display: inline-flex; padding: 3px 8px; color: white; cursor: pointer; user-select: none; background: #199fe9;"
                    specName="${specName}" selectType="MHC">封装模糊匹配</span>
            <span class="select-spec-jq" style="border-radius: 2px; display: inline-flex; padding: 3px 8px; color: white; cursor: pointer; user-select: none; background: #199fe9; margin-left: 3px;"
                    specName="${specName}" selectType="JQC">封装精确匹配</span>
            </li>
            `);
        });

        // $('.li-el + li').css('height', '10px')
        // 查询封装-按钮事件
        $('span[class*=select-spec-]').on('click', function () {
            _clickSpecFunc($(this).attr('specName'), $(this).attr('selectType'))
        })
    }
    // 查询规格快捷按钮
    selectSpecHandler()
}

if ($('.searchTaobao_').length === 0) {
    // 预售拼团 不处理，其他的都追加按钮
    $('.line-box:not(:contains("预售拼团")) li.pan-list').append(`
        <button type="button" class="pan-list-btn searchTaobao_" style="margin-top: 5px; background: #199fe9;">一键搜淘宝</button>
    `)
} else
// 搜索页的 一键搜淘宝
if ($('.searchTaobao_:not([addedClickHandler])').length > 0) {
    /**
    * 非阻容，其他数据处理
    * @param {*} parents 行级标签
    * @param {*} resArr  数据存放的数组
     */
    function other(parents, resArr) {
        let productName = parents.find('li.li-ellipsis a:eq(0)').attr('title') || '';

        if (productName.length === 0 || resArr.length > 0) {
            return;
        }

        let footprint = parents.find('li.li-ellipsis:contains("封装:") span:eq(1)').attr('title') || '';
        resArr.push(productName); resArr.push(footprint);
    }
    /**
     * 电阻数据处理
     * @param {*} parents 行级标签
     * @param {*} resArr  数据存放的数组
     */
    function R(parents, resArr) {
        const r = parents.find('li.li-ellipsis:contains("阻值:")').text().replace(/(阻值:|Ω)+/g, '').trim()

        if (r.length === 0 || resArr.length > 0) {
            return;
        }
        const f = parents.find('li.li-ellipsis:contains("封装:")').text().replace('封装:', '').trim()
        const j = parents.find('li.li-ellipsis:contains("精度:")').text().replace(/(精度:|\±)+/g, '').trim()

        resArr.push(r); resArr.push(f); resArr.push(j);
    }

    /**
     * 电容数据处理
     * @param {*} parents  行级标签
     * @param {*} resArr  数据存放的数组
     */
    function C(parents, resArr) {
        const c = parents.find('li.li-ellipsis:contains("容值:")').text().replace('容值:', '').trim()

        if (c.length === 0 || resArr.length > 0) {
            return;
        }

        const v = parents.find('li.li-ellipsis:contains("额定电压:")').text().replace('额定电压:', '').trim()
        const j = parents.find('li.li-ellipsis:contains("精度:")').text().replace(/(精度:|\±)+/g, '').trim()
        const f = parents.find('li.li-ellipsis:contains("封装:")').text().replace('封装:', '').trim()

        resArr.push(c); resArr.push(v); resArr.push(j); resArr.push(f);
    }
    $('.searchTaobao_:not([addedClickHandler])').attr('addedClickHandler', true).on('click', function (params) {
        let searchArrVals = [];

        const $parents = $(this).parents('td.line-box');
        // 阻容处理、其他元件处理
        R($parents, searchArrVals); C($parents, searchArrVals); other($parents, searchArrVals);

        GM_openInTab(`https://s.taobao.com/search?q=${searchArrVals.join('/')}`, { active: true, insert: true, setParent: true })
    })
}

/**
* 设置单选的背景颜色
*/
const _setOneCssByBrandName = (brandName, bgColor = '#00bfffb8') => {
    // 查找某个品牌
    const searchBrandItemList = $(`#brandList div`).find(`span:eq(0):contains(${brandName})`)
    searchBrandItemList.css({ 'background-color': bgColor, 'border-radius': '30px' })
}

/**
* 设置多选的背景颜色
*/
const _setMultiCssByBrandName = (brandName, bgColor = '#00bfffb8') => {
    // 查找某个品牌
    const searchBrandItemList = $(`.pick-txt.det-screen1 div`).find(`label:contains(${brandName})`)
    searchBrandItemList.css({ 'background-color': bgColor, 'border-radius': '30px' })
}

/**
 * 筛选条件：单选品牌-颜色
 */
const _renderFilterBrandColor = async () => {

    await setAwait(200)

    $(`#brandList div`).find(`span:eq(0)`).each(function () {
        const text = $(this).text().trim()

        let findBrandName = text
        if (text.includes('(')) {
            findBrandName = getBrandNameByRegex(text)
        }

        if (all16_15CouponMp.has(findBrandName)) {
            if (all16_15CouponMp.get(findBrandName).isNew) {
                _setOneCssByBrandName(findBrandName)
            } else {
                _setOneCssByBrandName(findBrandName, '#7fffd4b8')
            }
        }
    })
    // 省略号去掉，方便查看
    $('.det-screen1 span').css({ 'display': 'unset' })
}

/**
* 筛选条件：单选品牌-颜色
*/
const _renderMulitFilterBrandColor = async () => {

    await setAwait(200)

    $(`.pick-txt.det-screen1 div`).each(function () {
        const text = $(this).find('label').attr('title').trim()

        let findBrandName = text
        if (text.includes('(')) {
            findBrandName = getBrandNameByRegex(text)
        }

        if (all16_15CouponMp.has(findBrandName)) {
            if (all16_15CouponMp.get(findBrandName).isNew) {
                _setMultiCssByBrandName(findBrandName)
            } else {
                _setMultiCssByBrandName(findBrandName, '#7fffd4b8')
            }
        }
    })
    // 省略号去掉，方便查看
    $('.det-screen1 span').css({ 'display': 'unset' })
}
/**
 * 筛选条件：多选品牌
 * @param {*} isNew 是否新人券 true/false
 */
const multiFilterBrand = async (isNew) => {
    $('#more-brand').click()
    // $('.pick-txt.det-screen1 label.active').removeClass('active');
    $('.pick-txt.det-screen1 div').each(function () {
        const $labelEle = $(this).find('label.fuxuanku-lable')
        // 品牌名称
        const text = $labelEle.attr('title').trim()

        let findBrandName = text
        if (text.includes('(')) {
            findBrandName = getBrandNameByRegex(text)
        }

        if (all16_15CouponMp.has(findBrandName)) {
            if (all16_15CouponMp.get(findBrandName).isNew === isNew) {
                // 多选框选中
                $labelEle.click()
            }
        }
    })

    $('.hoice-ys .more-input02').click()
}

if ($('#_remind').length === 0) {
    $('.det-screen:contains("品牌：")').append(`
    <div id='_remind'>
        <span class='row_center get_new_coupon'><p class='new_'></p>新人券</span>
        <span class='row_center get_notnew_coupon'><p class='not_new_'></p>非新人券</span>
    </div>

    <style>
    #_remind {
        display: inline-block;
        position: absolute;
        top: 0px;
        right: 100px;
        width: 100px;
    }
    .row_center {
        display: inline-flex;
        align-items: center;
    }
    .new_ {
        background-color: #00bfffb8;
        margin-right: 10px;
        width: 20px;
        height: 10px;
    }
    .not_new_ {
        background-color: #7fffd4b8;
        margin-right: 10px;
        width: 20px;
        height: 10px;
    }
    .get_new_coupon,
    .get_notnew_coupon {
        cursor: pointer;
    }

    .get_new_coupon:hover,
    .get_notnew_coupon:hover {
        background: #e1e1e1;
    }
    </style>
    `)

    // 更新优惠券列表到集合中
    await getCouponHTML()

    _renderFilterBrandColor()

    // 多选展开按钮
    $('#more-brand').click(_renderMulitFilterBrandColor)
    // 品牌单选
    $('.screen-more .more-brand').click(_renderFilterBrandColor)
    // 多选新人券
    $('.get_new_coupon').click(() => multiFilterBrand(true))
    // 多选非新人券
    $('.get_notnew_coupon').click(() => multiFilterBrand(false))

}

/**
 * 显示最低购入价
 * @param {*} params
 */
function minBuyMoney(params) {
    $('.three-nr').find('.three-nr-item:eq(0) .price-warp p').each(function () {
        let minMum = parseInt($(this).attr('minordernum'));
        let orderPrice = parseFloat($(this).attr('orderprice'));

        $(this).parents('.three-nr-item').before(`
            <p class="minBuyMoney_" style="
                width: fit-content;
                padding: 2px 3px;
                font-weight: 600;
                color: #0094e7;">最低购入价： ${parseFloat((minMum * orderPrice).toFixed(6))}</p>
        `)
    })
}

//
if ($('.minBuyMoney_').length === 0) {
    minBuyMoney()
}

/**
 * html追加到页面中
 */
const appendProductListBox = (html) => {
    $('.wait-h2').hide(); $('.nodata-h2').hide();
    $('#product-list-box div#data-box—').html(html);

    if (html.length === 0 || $('#product-list-box div#data-box— table').length === 0) {
        $('.nodata-h2').show();
        $('.wait-h2').hide();
        return;
    }
}


/**
 * 分类搜索页的凑单逻辑
 */
const renderCatalogPageMinPriceSearch = () => {
    // 持续请求 && 定时器未初始化 && 未查询到结果的时候
    if(!globalSearchEnd) {
        // 总页数。默认：30页
        const totalPage = searchTotalPage();
        const promiseList = [];
        var searchData_ = null;

        // 取一遍值  如果没有定义，则取默认值
        try {
            searchData_ = searchData;
        } catch (error) {
            searchData_ = {
                catalogNodeId: /\d+/g.exec(location.pathname)[0],
                pageNumber: 1,
                querySortBySign: 0,
                showOutSockProduct: 1,
                showDiscountProduct: 1
            }
        }
        for (let pn = 1; pn <= totalPage; pn++) {
            searchData_['pageNumber'] = pn;
            var settings = {
                "url": "https://list.szlcsc.com/products/list",
                "method": "POST",
                "data": searchData_
            };
            promiseList.push($.ajax(settings));
        }
        globalSearchEnd = true;
        allWithProgress(promiseList,  ({total, cur, progress}) => {
            $('.wait-h2').html(`数据加载中...</br>(共${total}页，正在加载第${cur}页。或只查询前1000条记录)...`);
        }).then(function (result) {
            result.forEach(data => {
            if(data.success === true && data.productRecordList) {
                searchTempList = [...searchTempList, ...data.productRecordList];
            }
        });
    }).finally(() => {
        renderMinPriceSearch();
        setTimeout(() => { $('#js-filter-btn').click() }, 100);
    });
    }
}

/**
 * 搜索主页的凑单逻辑
 */
const renderMainPageMinPriceSearch = () => {
    // 持续请求 && 定时器未初始化 && 未查询到结果的时候
    if(!globalSearchEnd) {
        var val = $('#search-input').val();
        if (val == null || val.length === 0) {
            searchTempList = [];
            return;
        }
        // 总页数。默认：30页
        const totalPage = searchTotalPage();
        const promiseList = [];
            for (let pn = 1; pn <= totalPage; pn++) {
                const data = {};
                [...$('form#allProjectFrom>input[type="hidden"]:not([id*=SloganVal]):not([id*=LinkUrlVal])')].forEach(item => {
                    const name = $(item).attr('name');
                    const val = $(item).val();
                    data[name] = val;
                });
                data['pageNumber'] = pn;
                data['k'] = val;
                data['sk'] = val;
                data['localQueryKeyword'] = $('input[name="localQueryKeyword"]').val() || '';
                data['bp'] = $('input[name="bpTemp"]').val() || '';
                data['ep'] = $('input[name="epTemp"]').val() || '';

                var settings = {
                    "url": "https://so.szlcsc.com/search",
                    "method": "POST",
                    // "data": { "pn": searchPageNum, "k": val, "sk": val }
                    "data": data
                };

                // console.log('品牌搜索页参数：', settings);
                promiseList.push($.ajax(settings));
            }

            globalSearchEnd = true;
            allWithProgress(promiseList,  ({total, cur, progress}) => {
                $('.wait-h2').html(`数据加载中...</br>(共${total}页，正在加载第${cur}页。或只查询前1000条记录)...`);
            }).then(function (result) {
                console.time('搜索首页凑单渲染速度');
                result.forEach(data => {
                if(data.code === 200 && data.result != null) {
                    if (data.result.productRecordList != null) {
                        searchTempList = [...searchTempList, ...data.result.productRecordList];
                    }
                }
            });
        }).finally(() => {
            renderMinPriceSearch();
            console.timeEnd('搜索首页凑单渲染速度');
            setTimeout(() => { $('#js-filter-btn').click() }, 100);
        });
    }
}

 /**
 * 品牌搜索主页的凑单逻辑
 */
 const renderBrandPageMinPriceSearch = async () => {
    if (!brandSearchEnd) {
        const totalPage = searchTotalPage();
        // 延迟任务集合
        const promiseList = [];
        for (let pn = 1; pn <= totalPage; pn++) {
            // 取品牌id
            const brandId = /\d+/g.exec(location.href)[0];
            if (brandId != null) {
                const data = {};
                [...$('form#allProjectFrom>input[type="hidden"]')].forEach(item => {
                    const name = $(item).attr('name');
                    const val = $(item).val();
                    data[name] = val;
                });

                data['pageNumber'] = pn;
                data['queryProductGradePlateId'] = brandId;
                data['localQueryKeyword'] = $('input[name="localQueryKeyword"]').val() || '';
                data['queryBeginPrice'] = $('input[name="queryBeginPrice"]').val() || '';
                data['queryEndPrice'] = $('input[name="queryEndPrice"]').val() || '';
                data['queryBeginPriceTemp'] = $('input[name="queryBeginPriceTemp"]').val() || '';
                data['queryEndPriceTemp'] = $('input[name="queryEndPriceTemp"]').val() || '';

                var settings = {
                    "url": `https://list.szlcsc.com/brand_page/${brandId}.html`,
                    "method": "POST",
                    "data": data
                }
                // console.log('搜索首页参数：', settings);
                promiseList.push($.ajax(settings));
            }
        }

        brandSearchEnd = true;
        allWithProgress(promiseList, ({total, cur, progress}) => {
            $('.wait-h2').html(`数据加载中...</br>(共${total}页，正在加载第${cur}页。或只查询前1000条记录)...`);
        }).then((result) => {
            const dataArray = result.reduce((arr, cur)=> {
                const $tables = $(cur).find('#shop-list table');
                return arr.concat([...$tables]);
            }, []);

            const _buildMapData = ($table) => {
                const map = {};
                $table.each((i, e) => {
                    map[$(e).find('span:eq(0)').text().trim()] = $(e).find('span:eq(1)').text().trim();
                });
                return map;
            }
            console.time('品牌页凑单渲染速度');
            searchTempList = dataArray.map(h => {
                const $table = $(h);
                return {
                    productId: $table.data('productid'),
                    lightStandard: $table.data('encapstandard'),
                    lightProductCode: $table.data('productcode'),
                    productMinEncapsulationNumber: $table.data('productminencapsulationnumber'),
                    productMinEncapsulationUnit: $table.data('productminencapsulationunit'),
                    productName: $table.data('productname'),
                    productModel: $table.data('productmodel'),
                    lightProductModel: $table.data('productmodel-unlight'),
                    productGradePlateId: $table.data('brandid'),
                    productPriceList: [...$table.find('li.three-nr-item span.ccd-ppbbz')].map(e => ({
                        "startPurchasedNumber": parseInt($(e).data('startpurchasednumber')),
                        "endPurchasedNumber": parseInt($(e).data('endpurchasednumber')),
                        "productPrice": parseFloat($(e).data('productprice'))
                    })),
                    listProductDiscount: $table.find('div.three-box-top ul.three-nr > li.three-nr-01').find('span:eq(0)').text().replace(/[ 折\n]+/g, '') || null,
                    productGradePlateName: $table.data('brandname'),
                    hkConvesionRatio: $table.data('hkconvesionratio'),
                    convesionRatio: $table.data('convesionratio'),
                    theRatio: $table.data('theratio'),
                    smtStockNumber: parseInt($table.find('table div.smt-stock').text() || 0),
                    smtLabel: $table.find('div.smt-flag.common-label').text() || '',
                    productStockStatus: $table.data('productstockstatus'),
                    isPlusDiscount: $table.data('isplusdiscount'),
                    productUnit: $table.data('productunit'),
                    isPresent: $table.data('ispresent'),
                    isGuidePrice: $table.data('isguideprice'),
                    minBuyNumber: $table.data('minbuynumber'),
                    hasSampleRule: $table.data('hassamplerule'),
                    breviaryImageUrl: $table.find('a.one-to-item-link img').data('urls').split('<$>')[0],
                    luceneBreviaryImageUrls: $table.find('a.one-to-item-link img').data('urls') || '',
                    productType: $table.find('li.li-ellipsis a.catalog').attr('title') || '',
                    productTypeCode: /\d+/g.exec($table.find('li.li-ellipsis a.catalog').attr('href') || '')[0],
                    pdfDESProductId: $table.find('li.li-ellipsis a.sjsc').attr('param-click'),
                    gdWarehouseStockNumber: parseInt($table.find('div.stock-nums-gd span').text() || 0),
                    jsWarehouseStockNumber: parseInt($table.find('div.stock-nums-js span').text() || 0),
                    paramLinkedMap: _buildMapData($table.find('ul.params-list li.li-ellipsis')),
                    recentlySalesCount: /\d+/g.exec($table.find('div.stocks span').text() || '0')[0],
                    batchStockLimit: $table.data('batchstocklimit'),
                 };
            });

        }).finally(() => {
            renderMinPriceSearch();
            console.timeEnd('品牌页凑单渲染速度');
            setTimeout(() => { $('#js-filter-btn').click() }, 100);
        });
    }
}

/**
 * 搜索页-查找最低价 列表渲染方法
 */
const renderMinPriceSearch = () => {
    // 如果广东仓和江苏仓同时没有货的话，那么就属于订货商品，不需要显示
                 // 如果没有价格区间，证明是停售商品
                 var newList = searchTempList.filter(item =>!(parseInt(item.jsWarehouseStockNumber||0) <= 0 && parseInt(item.gdWarehouseStockNumber||0) <= 0) && item.productPriceList.length > 0);
                 // 去重
                 const map = new Map();
                 newList.forEach(item => {
                    map.set(item.productId, item);
                 });
                 newList = [...map.values()];
                 // 列表自动正序，方便凑单
                 newList.sort((o1, o2) =>{
                    return (o1.theRatio * o1.productPriceList[0].productPrice * (o1.listProductDiscount || 10) / 10).toFixed(6) - (o2.theRatio * o2.productPriceList[0].productPrice * (o2.listProductDiscount || 10) / 10).toFixed(6);
                 });
                 // 外部动态js规则组
                 if (jsRules.length > 0) {
                     jsRules.forEach(jsr => { newList = newList.filter(jsr); });
                 }

                 // 取指定条数的数据。默认50个
                 const html = newList.slice(0, (searchPageRealSize || 50)).map(item => {
                     const {
                         productId                     ,
                         lightStandard                 ,
                         lightProductCode              ,
                         productMinEncapsulationNumber ,
                         productMinEncapsulationUnit   ,
                         productName                   ,
                         productModel                  ,
                         lightProductModel             ,
                         productGradePlateId           ,
                         productPriceList              ,
                         listProductDiscount           ,
                         productGradePlateName         ,
                         hkConvesionRatio              ,
                         convesionRatio                ,
                         theRatio                      ,
                         smtStockNumber                ,
                         smtLabel                      ,
                         productStockStatus            ,
                         isPlusDiscount                ,
                         productUnit                   ,
                         isPresent                     ,
                         isGuidePrice                  ,
                         minBuyNumber                  ,
                         hasSampleRule                 ,
                         breviaryImageUrl              ,
                         luceneBreviaryImageUrls       ,
                         productType                   ,
                         productTypeCode               ,
                         pdfDESProductId               ,
                         gdWarehouseStockNumber        ,
                         jsWarehouseStockNumber        ,
                         paramLinkedMap                ,
                         recentlySalesCount            ,
                         batchStockLimit
                      } = item;

                     return `<table class="inside inside-page tab-data no-one-hk list-items"
                     id="product-tbody-line-${productId}" width="100%" border="0"
                     cellspacing="0" cellpadding="0" data-curpage="1" data-mainproductindex="0"
                     pid="${productId}" psid
                     data-batchstocklimit="${batchStockLimit}" data-encapstandard="${lightStandard}"
                     data-hassamplerule="${hasSampleRule}" data-productcode="${lightProductCode}"
                     data-productminencapsulationnumber="${productMinEncapsulationNumber}"
                     data-productminencapsulationunit="${productMinEncapsulationUnit}" data-productmodel="${productModel}"
                     data-productname="${productName}"
                     data-productstockstatus="${productStockStatus}"
                     data-convesionratio="${convesionRatio}" data-theratio="${theRatio}" data-hkconvesionratio="${hkConvesionRatio}"
                     data-productunit="${productUnit}" data-isplusdiscount="${isPlusDiscount}"
                     data-isguideprice="${isGuidePrice}" data-ispresent="${isPresent}" data-brandid="${productGradePlateId}"
                     data-brandname="${productGradePlateName}"
                     data-productmodel-unlight="${lightProductModel}" data-istiprovider data-isptoc
                     data-firstprice="${productPriceList[0].discountPrice || productPriceList[0].productPrice}" data-minbuynumber="${minBuyNumber}"
                     data-provider data-reposition data-productid="${productId}">
                     <tbody>
                         <tr class="no-tj-tr add-cart-tr" data-inventory-type="local" pid="${productId}">
                         <td class="line-box">
                             <div class="one line-box-left">
                             <a class="one-to-item-link"
                                 href="https://item.szlcsc.com/${productId}.html?fromZone=s_s__%2522123%2522"
                                 target="_blank" data-trackzone="s_s__&quot;123&quot;"
                                 onclick="goItemDetailBuriedPoint('${productId}', this, 'picture', 's_s__&quot;${$("#search-input").val()}&quot;', null, '0')">
                                 <img
                                 src="${breviaryImageUrl}"
                                 productid="${productId}" alt="${productName}"
                                 xpath="${breviaryImageUrl}"
                                 data-urls="${luceneBreviaryImageUrls}"
                                 showflag="yes"
                                 onerror="javascript:this.src='//static.szlcsc.com/ecp/assets/web/static/images/default_pic.gif'">
                             </a>
                             <span>
                                 <input type="button" class="db" data-add-compare="${productId}"
                                 title="对比后该商品会添加到对比栏中" value>
                                 <input type="button" class="sc common-sc productId-${productId} "
                                 title="收藏后该商品会保存到[会员中心]下的[我的收藏]中"
                                 data-productid="${productId}">
                             </span>
                             </div>
                             <div class="line-box-right">
                             <div class="line-box-right-bottom">
                                 <div class="two">
                                 <div class="two-01 two-top">
                                     <ul class="l02-zb">
                                     <li class="li-ellipsis">
                                         <a title="${productName}"
                                         class="ellipsis product-name-link  item-go-detail"
                                         href="https://item.szlcsc.com/${productId}.html?fromZone=s_s__%2522123%2522"
                                         target="_blank"
                                         data-trackzone="s_s__&quot;123&quot;"
                                         onclick="goItemDetailBuriedPoint('${productId}', this, 'name', 's_s__&quot;${$("#search-input").val()}&quot;', null, '0')">
                                         ${productName}</a>
                                     </li>
                                     <li class="band li-ellipsis"
                                         onclick="commonBuriedPoint(this, 'go_brand')">
                                         <span class="c9a9a9a" title="品牌：${productGradePlateName}">品牌:</span>
                                         <a class="brand-name" title="点击查看${productGradePlateName}的品牌信息"
                                         href="https://list.szlcsc.com/brand/${productGradePlateId}.html"
                                         target="_blank">
                                         ${productGradePlateName}
                                         </a>
                                     </li>
                                     <li class="li-ellipsis">
                                         <span class="c9a9a9a" title="封装:${lightStandard}">封装:</span>
                                         <span title="${lightStandard}">${lightStandard}</span>
                                     </li>
                                     <!--<li class="li-el">
                                         <span class="select-spec-mh"
                                         style="border-radius: 2px; display: inline-flex; padding: 3px 8px; color: white; cursor: pointer; user-select: none; background: #199fe9;"
                                         specname="${lightStandard}" selecttype="MHC">封装模糊匹配</span>
                                         <span class="select-spec-jq"
                                         style="border-radius: 2px; display: inline-flex; padding: 3px 8px; color: white; cursor: pointer; user-select: none; background: #199fe9; margin-left: 3px;"
                                         specname="${lightStandard}" selecttype="JQC">封装精确匹配</span>
                                     </li>-->
                                     <li>
                                     </li>
                                     </ul>
                                     <ul class="l02-zb params-list">
                                     ${Object.keys(paramLinkedMap).map(key => {
                                         return `<li class="li-ellipsis">
                                         <span class="c9a9a9a">${key}</span>:
                                         <span title="${paramLinkedMap[key]}">${paramLinkedMap[key]}</span>
                                         </li>`
                                     }).join('')}
                                     </ul>
                                     <ul class="l02-zb">
                                     <li class="li-ellipsis"
                                         onclick="commonBuriedPoint(this, 'go_catalog')">
                                         <span class="c9a9a9a">类目:</span>
                                         <a title="${productType}" target="_blank"
                                         class="catalog ellipsis underLine"
                                         href="https://list.szlcsc.com/catalog/${productTypeCode}.html">
                                         ${productType}
                                         </a>
                                     </li>
                                     <li class="li-ellipsis">
                                         <span class="c9a9a9a">编号:</span>
                                         <span>${lightProductCode}</span>
                                     </li>
                                     <li class="li-ellipsis">
                                         <span class="c9a9a9a">详细:</span>
                                         <a class="sjsc underLine" productid="${productId}"
                                         param-click="${pdfDESProductId}">
                                         数据手册
                                         </a>
                                     </li>
                                     </ul>
                                 </div>
                                 <div class="two-bottom">
                                     <!-- <li class="tag-wrapper">-->
                                     <!--</li>-->
                                     <!--<div class="three-box-bottom common-label common-useless-label">-->
                                     <!--<section class="smt-price" id="SP-LIST">-->
                                     <!--    <a target="_blank" data-pc="${lightProductCode}" class="to-jlc-smt-list"-->
                                     <!--    href="https://www.jlcsmt.com/lcsc/detail?componentCode=${lightProductCode}&amp;stockNumber=10&amp;presaleOrderSource=shop">嘉立创贴片惊喜价格(库存<span-->
                                     <!--        class="smtStockNumber">${smtStockNumber}</span>)</a>-->
                                     <!--</section>-->
                                     <!--</div>-->
                                     <!-- SMT 基础库、扩展库 -->
                                     <!--<div class="smt-flag common-label">${smtLabel}</div> -->
                                 </div>
                                 </div>
                                 <div class="three-box hasSMT">
                                 <div class="three-box-top">
                                     <div class="three">
                                     <ul class="three-nr">
                                     ${listProductDiscount != null && listProductDiscount < 10 ? `
                                     <li class="three-nr-01">
                                     <span>${listProductDiscount}折</span>
                                       <span class="show-discount-icon">
                                         <div class="common-float-dialog">
                                           <div class="common-float-content">
                                             <ul class="cel-item num-cel">
                                               <li></li>
                                               ${productPriceList.map(item => {
                                                    return `<li>${item.startPurchasedNumber * theRatio}+:&nbsp;</li>`;
                                                }).join('')}
                                             </ul>
                                             <ul class="cel-item mr5">
                                               <li class="text-align-center">折后价</li>
                                               ${productPriceList.map(item => {
                                                    return `<li>￥${parseFloat((item.productPrice * (listProductDiscount || 10) / 10).toFixed(6))}</li>`;
                                                }).join('')}
                                             </ul>
                                             <ul class="cel-item not-plus-o-price-cel">
                                               <li class="text-align-center">原价</li>
                                                 ${productPriceList.map(item => {
                                                    return `<li class="o-price">￥${item.productPrice}</li>`;
                                                }).join('')}
                                             </ul>
                                           </div>
                                           <s class="f-s"><i class="f-i"></i></s>
                                         </div>
                                       </span>
                                   </li>
                                     `:''}
                                         <p class="minBuyMoney_" style="
                                             width: fit-content;
                                             padding: 2px 3px;
                                             font-weight: 600;
                                             color: #0094e7;">最低购入价： ${parseFloat((theRatio * productPriceList[0].productPrice * (listProductDiscount || 10) / 10).toFixed(6))}</p>
                                             ${
                                                productPriceList.map(item => {
                                                    const discountPrice = parseFloat((item.productPrice * (listProductDiscount || 10) / 10).toFixed(6));
                                                    return `<li class="three-nr-item">
                                                                <div class="price-warp price-warp-local">
                                                                    <p class="ppbbz-p no-special " minordernum="${item.startPurchasedNumber * theRatio}"
                                                                    originalprice="${item.productPrice}" discountprice="${discountPrice}"
                                                                    orderprice="${discountPrice}">
                                                                    ${item.startPurchasedNumber * theRatio}+:&nbsp;
                                                                    </p>
                                                                    <span class="ccd ccd-ppbbz show-price-span"
                                                                    minordernum="${item.startPurchasedNumber * theRatio}" data-endpurchasednumber="${item.endPurchasedNumber}"
                                                                    data-productprice="${item.productPrice}" data-productprice-discount
                                                                    orderprice="${item.productPrice}"
                                                                    data-startpurchasednumber="${item.startPurchasedNumber}">
                                                                    ￥${discountPrice}
                                                                    </span>
                                                                </div>
                                                            </li>`;
                                                }).join('')}
                                     </ul>
                                     </div>
                                     <div class="three three-hk">
                                     </div>
                                 </div>
                                 </div>
                                 <div class="conformity-box">
                                 <div class="conformity-box-top">
                                     <div class="three-change">
                                     <span class="three-nr-01 three-nr-long">现货最快4H发</span>
                                     <ul class="finput">
                                         <li class="stocks stocks-change stocks-style"
                                         local-show="yes" hk-usd-show="no">
                                         <div class="stock-nums-gd">广东仓:<span style="font-weight:bold">${gdWarehouseStockNumber}</span></div>
                                         <div class="stock-nums-js">江苏仓:<span style="font-weight:bold">${jsWarehouseStockNumber}</span></div>
                                         </li>
                                         <li class="display-none">
                                         <div local-show="no" hk-usd-show="yes">
                                         </div>
                                         </li>
                                     </ul>
                                     <!--
                                         <div class="smt-stock">广东SMT仓: <span style="font-weight:bold">
                                         ${smtStockNumber}
                                         </span></div>
                                     -->
                                     </div>
                                     <div class="ffour">
                                     <ul class="finput">
                                         <li class="price-input price-input-gd local-input">
                                         <input type="text" maxlength="9" unit-type="single"
                                             class="cartnumbers " pluszk="false"
                                             unitnum="${productMinEncapsulationNumber}" placeholder="广东仓" defaultwarehouse="sz"
                                             data-type="gd" gdstock="${gdWarehouseStockNumber}" value>
                                         <div class="unit ">
                                             <span class="cur-unit ">个</span>
                                             <i class="xl"></i>
                                             <div class="unit-contain" style="display: none;">
                                             <div class="unit-type">
                                                 <span class="unit-one">个</span>
                                                 <span class="unit-two">${productMinEncapsulationUnit}</span>
                                             </div>
                                             <i class="sl"></i>
                                             </div>
                                         </div>
                                         </li>
                                         <li class="price-input price-input-js local-input">
                                         <input type="text" maxlength="9" unit-type="single"
                                             class="cartnumbers " pluszk="false"
                                             unitnum="${productMinEncapsulationNumber}" placeholder="江苏仓" defaultwarehouse="sz"
                                             data-type="js" jsstock="${jsWarehouseStockNumber}" value>
                                         <div class="unit ">
                                             <span class="cur-unit ">个</span>
                                             <i class="xl"></i>
                                             <div class="unit-contain" style="display: none;">
                                             <div class="unit-type">
                                                 <span class="unit-one">个</span>
                                                 <span class="unit-two">${productMinEncapsulationUnit}</span>
                                             </div>
                                             <i class="sl"></i>
                                             </div>
                                         </div>
                                         </li>
                                         <li class="price-input price-input-hk">
                                         <input type="text" maxlength="9" unit-type="single"
                                             class="cartnumbers " pluszk="false"
                                             unitnum="${productMinEncapsulationNumber}" placeholder="香港仓" data-type="hk"
                                             value="${hkConvesionRatio}">
                                         <div class="unit ">
                                             <span class="cur-unit ">个</span>
                                             <i class="xl"></i>
                                             <div class="unit-contain" style="display: none;">
                                             <div class="unit-type">
                                                 <span class="unit-one">个</span>
                                                 <span class="unit-two">${productMinEncapsulationUnit}</span>
                                             </div>
                                             <i class="sl"></i>
                                             </div>
                                         </div>
                                         </li>
                                         <li>${productMinEncapsulationNumber}个/${productMinEncapsulationUnit}</li>
                                         <li class="totalPrice-li">总额:<span class="goldenrod totalPrice">￥0</span>
                                         <div class="plus_mj">
                                             <div class="plus-flag">
                                             <span><span class="mj-name"></span>已优惠<span
                                                 class="mj-money">0</span>元！</span>
                                             <s><i></i></s>
                                             </div>
                                         </div>
                                         </li>
                                     </ul>
                                     <ul class="pan">
                                         <li class="pan-list">
                                         <button type="button" class="pan-list-btn addCartBtn "
                                             kind="cart" local-show="yes"
                                             hk-usd-show="no" id="addcart-so" productcode="${lightProductCode}"
                                             data-curpage="1"
                                             data-mainproductindex="0" param-product-id="${productId}"
                                             data-agl-cvt="15"
                                             data-trackzone="s_s__&quot;123&quot;">加入购物车</button>
                                         <button type="button"
                                             class="pan-list-btn addCartBtn display-none"
                                             kind="order" local-show="no"
                                             hk-usd-show="yes" productcode="${lightProductCode}" data-curpage="1"
                                             data-mainproductindex="0"
                                             param-product-id="${productId}" data-agl-cvt="15"
                                             data-trackzone="s_s__&quot;123&quot;">我要订货</button>
                                         <div class="stocks">
                                             <span>近期成交${recentlySalesCount}单</span>
                                         </div>
                                         <span class="add-cart-tip">
                                             <i class="add-cart"></i><span
                                             class="c999 cursor-default lh">已加购</span>
                                         </span>
                                         <button onclick="commonBuriedPoint(this, 'purchase_plan')"
                                             type="button" class="stock-btn"
                                             data-productmodel="${productName}"
                                             data-brandname="${productGradePlateName}"
                                             data-trackzone="s_s__&quot;123&quot;">
                                             我要备货
                                         </button>
                                         <button type="button" class="pan-list-btn searchTaobao_"
                                             style="margin-top: 5px; background: #199fe9;">一键搜淘宝</button>
                                         </li>
                                     </ul>
                                     </div>
                                 </div>
                                 </div>
                             </div>
                             </div>
                         </td>
                         </tr>
                         <tr
                         class="more-channel-products items-overseas-products display-none hide-tr">
                         <td colspan="6" id="overseasList" oldbatchproductlist
                             isgroupproduct="false" listlength="30" productid="${productId}">
                         </td>
                         </tr>
                         <tr class="more-channel-products items-hk-products display-none hide-tr">
                         <td colspan="6" id="hkProductList" oldbatchproductlist
                             isgroupproduct="false" listlength="30" productid="${productId}">
                         </td>
                         </tr>
                     </tbody>
                     </table>`;
                 }).join('');

                 appendProductListBox(html);

}

// 哪些需要显示凑单按钮
const productListIsShowBool = location.href.includes('so.szlcsc.com/global.html') || location.href.includes('list.szlcsc.com/brand') || location.href.includes('list.szlcsc.com/catalog');
// 在搜索首页
if(productListIsShowBool && $('#product-list-show-btn').length === 0) {
    $('body').append( `<div id="product-list-show-btn" style="
        border-radius: 5px;
        z-index: 10000;
        position: fixed;
        right: 45px;
        bottom: 45px;
        padding: 5px 10px;
        color: white;
        background: #199fe9;
        border: 2px solid #199fe9;
        font-size: 20px;
        cursor: pointer;
        user-select:none;
        font-weight: 600;"><p>凑单</p><span style="font-size: 12px;">页面加载慢，请耐心等待！</span></div>`);

        $('#product-list-show-btn').on('click', function() {
            if ($('#product-list-box').is(":hidden")) {
                globalSearchEnd = false;
                searchTempList = [];
            }
            $('#product-list-box').fadeToggle();
        });
}

if(productListIsShowBool && $('#product-list-box').length === 0) {
    // 这里处理前10页的最低购入价的排序
    $('body').append(`<div id='product-list-box' style="display: none; position: fixed; bottom: 35px; right: 100px; width: min-content; min-height: 30vh; max-height: 75vh; overflow: auto; border: 2px solid #199fe9; z-index: 9999; padding: 5px; background: white;">
                        <div style="display: flex; justify-content: space-around;height: 60px; position: sticky; top: 0px;z-index: 99999;">
                            <div style="border: 2px solid #199fe9; display: flex; padding: 5px; width: 100%;">
                                <button id="gd-filter-btn" style="white-space:nowrap; border-radius: 4px; display: inline-flex; padding: 3px 8px; color: white; width: 100%; border: none; justify-content: center; align-items: center;font-size: 16px; font-weight: bold;margin-left: 0px;cursor: pointer;user-select: none;background: #aaaeb0;">广东仓</button>
                                <button id="js-filter-btn" style="white-space:nowrap; border-radius: 4px; display: inline-flex; padding: 3px 8px; color: white; width: 100%; border: none; justify-content: center; align-items: center;font-size: 16px; font-weight: bold;margin-left: 10px;cursor: pointer;user-select: none;background: #aaaeb0;">江苏仓</button>
                            </div>
                            <div style="margin-left: 10px; border: 2px solid #199fe9; display: flex; padding: 5px; width: 100%;">
                                <button id="new-filter-coupon-btn" style="white-space:nowrap; border-radius: 4px; display: inline-flex; padding: 3px 8px; color: white; width: 100%; border: none; justify-content: center; align-items: center;font-size: 16px; font-weight: bold;margin-left: 0px;cursor: pointer;user-select: none;background: #aaaeb0;">新人券</button>
                                <button id="unnew-filter-coupon-btn" style="white-space:nowrap; border-radius: 4px; display: inline-flex; padding: 3px 8px; color: white; width: 100%; border: none; justify-content: center; align-items: center;font-size: 16px; font-weight: bold;margin-left: 10px;cursor: pointer;user-select: none;background: #aaaeb0;">非新人券</button>
                                <button id="other-filter-coupon-btn" style="white-space:nowrap; border-radius: 4px; display: inline-flex; padding: 3px 8px; color: white; width: 100%; border: none; justify-content: center; align-items: center;font-size: 16px; font-weight: bold;margin-left: 10px;cursor: pointer;user-select: none;background: #aaaeb0;">其他券</button>
                            </div>
                        </div>
                        <h2 class="wait-h2" style="height: 200px; width: 500px; display: flex;justify-content: center;align-items: center;">数据正在加载中...</h2>
                        <h2 class="nodata-h2" style="height: 200px; width: 500px; display: flex; justify-content: center;align-items: center;">暂无数据，请稍后刷新页面再试！</h2>
                        <div id="data-box—"></div>
                    </div>`);
    $('.nodata-h2').hide();
    // 广东仓过滤
    $('#gd-filter-btn').on('click', function() {
        $('button[id*=-filter-btn]').css('background', '#aaaeb0');
        $('#gd-filter-btn').css('background', '#199fe9');
        jsRules[0] = (item) => parseInt(item.gdWarehouseStockNumber||0) > 0;
        renderMinPriceSearch();
    });
    // 江苏仓过滤
    $('#js-filter-btn').on('click', function() {
        $('button[id*=-filter-btn]').css('background', '#aaaeb0');
        $('#js-filter-btn').css('background', '#199fe9')
        jsRules[0] = (item) => parseInt(item.jsWarehouseStockNumber||0) > 0;
        renderMinPriceSearch();
    });
    // 新人券过滤
    $('#new-filter-coupon-btn').on('click', function() {
        $('button[id*=-filter-coupon-btn]').css('background', '#aaaeb0');
        $('#new-filter-coupon-btn').css('background', '#199fe9');
        jsRules[1] = (item) => {
            try {
                return all16_15CouponMp.get(getBrandNameByRegex(item.productGradePlateName)).isNew === true;
            } catch (error) {
                return false;
            }
        };
        renderMinPriceSearch();
    });
    // 非新人券过滤
    $('#unnew-filter-coupon-btn').on('click', function() {
        $('button[id*=-filter-coupon-btn]').css('background', '#aaaeb0');
        $('#unnew-filter-coupon-btn').css('background-color', '#199fe9');
        jsRules[1] = (item) => {
            try {
                return all16_15CouponMp.get(getBrandNameByRegex(item.productGradePlateName)).isNew === false;
            } catch (error) {
                return false;
            }
        };;
        renderMinPriceSearch();
    });
    // 其他券过滤
    $('#other-filter-coupon-btn').on('click', function() {
        $('button[id*=-filter-coupon-btn]').css('background', '#aaaeb0');
        $('#other-filter-coupon-btn').css('background-color', '#199fe9');
        jsRules[1] = (item) => {
            try {
                // 这里不返回，就看领券中心有没有这个品牌的券，不太准确反正
                all16_15CouponMp.get(getBrandNameByRegex(item.productGradePlateName)).isNew;
            } catch (error) {
                // 不在领券中心的商品
                return true;
            }
        };;
        renderMinPriceSearch();
    });
} else if($('#product-list-box').is(':visible')) {
    // 搜索首页
    if (location.href.includes('so.szlcsc.com/global.html')) {
        renderMainPageMinPriceSearch();
    }
    // 品牌首页
    else if(location.href.includes('list.szlcsc.com/brand')) {
        renderBrandPageMinPriceSearch();
    }
    // 分类搜索
    else if(location.href.includes('list.szlcsc.com/catalog')) {
        renderCatalogPageMinPriceSearch();
    }
}
}


// 排序记录 desc降序，asc升序

/**
* 配单页 增加价格排序按钮
*/
const bomStart = () => {

if ($('div.bom-result-progess .progess-box .progess-line-blue').text() !== '0%') {
    $('#new-box_').attr('disabled', true)
} else {
    $('#new-box_').attr('disabled', false)
}
if ($('button#new-box_').length > 0) {
    return
}
const sortHt = `<button id='new-box_' class="new-box_" onclick="(function () {
        const $eles = $('.el-table__row.perfect').get();
        $eles.sort((next, prev) => {
            let nextPrice = $(next).find('div.dfc:contains(¥)').text().replace(/[¥ ]+/g, '')
            let prevPrice = $(prev).find('div.dfc:contains(¥)').text().replace(/[¥ ]+/g, '')
            if(localStorage.getItem('sortSign') === 'desc') {
                if (parseFloat(nextPrice) > parseFloat(prevPrice)) return -1;
                if (parseFloat(nextPrice) < parseFloat(prevPrice)) return 1;
            }
            else if(localStorage.getItem('sortSign') === 'asc') {
                if (parseFloat(nextPrice) > parseFloat(prevPrice)) return 1;
                if (parseFloat(nextPrice) < parseFloat(prevPrice)) return -1;
            }
            return 0;
        })
        localStorage.setItem('sortSign', (localStorage.getItem('sortSign') === 'desc') ? 'asc' : 'desc');
        $('.el-table__body-wrapper tbody').html($eles)
    })()"
    style="color: #315af8; width: 100px; height: 35px; line-height: 35px;background-color: #fff;border-radius: 3px;border: 1px solid #cdf; margin-left: 10px;">
    <div data-v-1b5f1317="" class="sg vg" style="height: 35px; display: none;">
        <svg data-v-1b5f1317="" viewBox="25 25 50 50" class="bom-circular blue" style="width: 16px; height: 16px;">
            <circle data-v-1b5f1317="" cx="50" cy="50" r="20" fill="none" class="path"></circle>
        </svg>
    </div>
    <div class="">
        小计 升/降序
    </div>
    </button>
    <style>
    .new-box_:hover {
        color: #315af8;
        border: 1px solid #315af8 !important;
    }
    .new-box_:disabled {
        border: 1px solid #dcdcdc !important;
        cursor: not-allowed;
        color: rgba(0, 0, 0, .3) !important;
    }
    </style>`;

$('div.bom-top-result.dfb div.flex-al-c:eq(2)').append(sortHt)
}

// 搜索页
let isSearchPage = () => location.href.includes('so.szlcsc.com/global.html') || location.href.includes('list.szlcsc.com/brand') || location.href.includes('list.szlcsc.com/catalog');
// 购物车页
let isCartPage = () => location.href.includes('cart.szlcsc.com/cart/display.html');
// BOM配单页
let isBomPage = () => location.href.includes('bom.szlcsc.com/member/eda/search.html') || location.href.includes('bom.szlcsc.com/member/bom/upload/');
// 优惠券页
let isCouponPage = () => location.href.includes('www.szlcsc.com/huodong.html');

setInterval(function () {

// if (isCartPage()) {
//     cartStart()
// }

if (isSearchPage()) {
    searchStart()
}

if (isBomPage()) {
    bomStart()
}

if (isCouponPage()) {
    couponGotoHandler()
}
}, 500)
})()