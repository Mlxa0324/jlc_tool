// ==UserScript==
// @name         嘉立创购物车辅助工具
// @namespace    http://tampermonkey.net/
// @version      1.8.5
// @description  嘉立创购物车辅助增强工具 包含：手动领券、自动领券、小窗显示优惠券领取状态、一键分享BOM、一键锁定/释放商品、一键换仓、一键选仓、搜索页优惠券新老用户高亮。
// @author       Lx
// @match        https://cart.szlcsc.com/cart/display.html**
// @match        https://so.szlcsc.com/global.html**
// @match        https://bom.szlcsc.com/member/eda/search.html?**
// @match        https://www.szlcsc.com/huodong.html?**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=szlcsc.com
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.min.js
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

(async function () {
    'use strict';

    // 引入message的css文件并加入html中
    const css = GM_getResourceText("customCSS")
    GM_addStyle(css)

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


    // 后续支持强排序按钮

    // 商品清单集合暂存
    const dataCartMp = new Map()
    // 品牌对应颜色，用于快速查找位置。
    const dataBrandColorMp = new Map()
    // 优惠券页面，数据暂存。只保存16-15的优惠券
    const all16_15CouponMp = new Map()
    // 自动领券的定时器
    let couponTimer = null

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
        arrayObj.sort(function (a, b) { return a[1] - b[1] })
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
        $('.change-depot-btn-left_').on('click', function () {

            let count = 0;
            const eles = getAllCheckedLineInfo()
            eles.each(async function () {
                count++
                await _changeDepot($(this), 'JIANG_SU').then(res => {
                    Qmsg.success('切换【江苏仓】成功！')
                })

                if (eles.length === count) {
                    //  setTimeout(_reload, 500);
                    setTimeout(function () {
                        location.reload()
                        // 官方刷新购物车
                        // cartModuleLoadCartList()
                    }, 2500);
                }
            })
        })

        // 换仓-广东
        $('.change-depot-btn-right_').on('click', function () {

            let count = 0;
            const eles = getAllCheckedLineInfo()
            eles.each(async function () {
                count++
                await _changeDepot($(this), 'GUANG_DONG').then(res => {
                    Qmsg.success('切换【广东仓】成功！')
                })

                if (eles.length === count) {
                    //  setTimeout(_reload, 500);
                    setTimeout(function () {
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
                eles.each(function () {
                    $(this).parents('.product-item').find('input.check-box:checked').click()
                })
            }
            // 都未选中，则执行仓库全选操作
            else {
                eles.each(function () {
                    $(this).parents('.product-item').find('input.check-box').click()
                })
            }
        }

        // 江苏仓
        $(".check-js-btn-left_").on('click', function () {
            _clickFunc('JIANG_SU', getJsLineInfo)
        })

        // 广东仓
        $(".check-gd-btn-right_").on('click', function () {
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
        $(".check-js-btn-left_").on('click', function () {
            _clickFunc('JIANG_SU')
        })

        // 广东仓
        $(".check-gd-btn-right_").on('click', function () {
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
        $('.auto-get-coupon').on('change', function () {
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
            const shareText = [...$checkedEles].map(function (item) {
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
        const _shareParse = async () => {
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
        $(`.lock-product`).click(async function () {
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
                basicSettings()
            }, 1000);

        })

        $(`.unlock-product`).click(async function () {

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
                basicSettings()
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
        $('.filter-haved').click(function () {
            $('.coupon-item:visible:not(:contains(立即使用))').hide()
        })

        // 过滤16-15的优惠券
        $('.filter-16-15').click(function () {
            $('.coupon-item:visible:not(:contains(满16可用))').hide()
        })

        // 过滤20-15的优惠券
        $('.filter-20-15').click(function () {
            $('.coupon-item:visible:not(:contains(满20可用))').hide()
        })

        // 过滤新人优惠券
        $('.filter-newone').click(function () {
            $('.coupon-item:visible:not(:contains(新人专享))').hide()
        })

        // 过滤非新人优惠券
        $('.filter-not-newone').click(function () {
            $('.coupon-item:visible:contains(新人专享)').hide()
        })


        // 手动刷新优惠券页面
        $('.refresh-coupon-page').click(function () {
            setTimeout(() => {
                Qmsg.info(`1秒后刷新优惠券页面...`)
                setTimeout(lookCouponListModal, 500);
            }, 500);

        })



        // 一键领取当前显示的所有优惠券
        $('.get-all').click(function () {
            const $couponEles = $('.coupon-item:visible div:contains(立即抢券)')

            let totalCount = 0,
                successCount = 0
            $couponEles.each(function () {

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
        $('.filter-clear').click(function () {
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
        $('.look-coupon-btn,.look-coupon-closebtn').click(_lookCouponClick)
    }

    /**
     * 优惠券模态框
     */
    const lookCouponListModal = async () => {

        let couponHTML = await getAjax(`${webSiteShareData.lcscWwwUrl}/huodong.html`)

        const $couponHTML = $(couponHTML)

        let $cssLink = [...$couponHTML].filter(item => item.localName == 'link' && item.href.includes('/public/css/page/activity/couponAllCoupons'))[0].outerHTML
        let $jsLink = [...$couponHTML].filter(item => item.localName == 'script' && item.src.includes('/public/js/chunk/page/activity/couponAllCoupons'))[0].outerHTML

        let $main_wraper = $couponHTML.find('.main_wraper')
        let $navigation = $couponHTML.find('.navigation')

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
            </div>`

        const $couponEle = $('.couponModal')
        $couponEle.empty()
        $couponEle.append(ht).append($cssLink).append($jsLink)

        $('.couponModal .all-coupon-page').append($main_wraper).append($navigation)

        couponGotoHandler()
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
        <li class='li-cs' style="position: sticky; top: 0px; background-color: white;">
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

        return tempHtml + '</ul></div>'
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
            } else {
                buttonLine = `<span class='flex-sx-center flex-zy-center flex' style="padding: 0; width: 195px; text-align: center; ">
                    <button type="button" class="to_cou">${couponEntity.isNew === false ? '普通券' : '新人券'}</button>
                 </span> `
            }
        }

        return $.isEmptyObject(buttonLine) ? '<span></span>' : buttonLine
    }


    /**
     * 追加的css
     * @returns
     */
    const cssFactory = () => `
    <style id="myCss">

    #couponModal {
        height: 85vh;
        position: fixed;
        top: 40px;
        right: 440px;
        z-index: 100;
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
        padding: 3px;
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
        color: #444 !important;
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
    </style>
    `

    /**
     * 追加到body
     */
    const appendHtml = () => {

        console.time('appendHtml')

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
        // =============================
        resizeHeight()

        console.timeEnd('appendHtml')
    }

    /**
     * 基础配置优化
     */
    const basicSettings = () => {
        // 多选框放大
        $('input.check-box').css('zoom', '150%')

        // 点击物料图片，操作多选框
        $('.product-img').each(function () {
            $(this).on('click', function (target) {
                $(this).prev('.check-box').click()
            })
        })

        // 购物车列表 点击品牌跳转到该品牌下的商品
        let brandElement = $('.product-item li.cart-li-pro-info').find('div:eq(2)')
        brandElement.css({ cursor: 'pointer' })
        brandElement.on('click', function () {
            window.open(`${webSiteShareData.lcscSearchUrl}/global.html?k=${getBrandNameByRegex(this.innerText)}`)
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
                _filterNotSelf($havedEles, brandName, `li.cart-li .check-box:checked`).click()
            }
            else {
                // 全选
                _filterNotSelf(getHavedNotCheckedLineInfo(), brandName, `li.cart-li .check-box:not(:checked)`).click()
            }
        })
    }

    /**
     * 多选框变化，刷新小窗口的计算结果
     */
    const checkStatusChangeHandler = () => {
        $(".check-box,.check-box-checked-all").change(refresh)
    }

    /**
     * 获取优惠券列表信息，并暂存在变量集合中
     */
    const getCouponHTML = async () => {

        let couponHTML = await getAjax(`${webSiteShareData.lcscWwwUrl}/huodong.html`)

        $(couponHTML).find('.coupon-item:contains(满16可用) div[data-id]').each(function () {

            let $this = $(this)

            // 优惠券id
            let couponId = $this.data('id')

            // 是否已经领取
            let isHaved = $this.find(':contains(立即使用)').length > 0

            // 优惠券名称
            let couponName = $this.data('name')

            // 对应的品牌主页地址
            let brandIndexHref = $this.data('href')

            // 优惠券金额
            let couponPrice = couponName.replace(/^.*?\>(.*?)元.*$/, '$1')
            // 品牌名称
            let brandName = couponName.replace(/^.*?元(.*?)品牌.*$/, '$1')

            // 是否新人优惠券
            let isNew = couponName.split('新人专享').length >= 2

            all16_15CouponMp.set(brandName, {
                couponName, // 优惠券名称
                isNew, // 是否新人专享
                couponPrice, //优惠券金额减免
                brandName, // 品牌名称
                couponId, // 优惠券id
                isHaved, // 是否已经领取
                brandIndexHref, // 对应的品牌主页地址
                couponLink: `${webSiteShareData.lcscWwwUrl}/getCoupon/${couponId}`, // 领券接口地址
            })

        })
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
                .coupon-item-goto:hover
                {
                    background-color: #53a3d6 !important;
                    color: white !important;
                    cursor: pointer;
                }
                .coupon-item-btn {
                    width: 43% !important;
                }
            </style>
            `)

        const append_ = `
        <a class='coupon-item-goto' href="" target="_blank">
         快速入口
        </a>
        `
        $('.coupon-item').each(function () {
            const $this = $(this)
            const btnBackgound = $this.hasClass('coupon-item-plus') ? '#61679e' : ($this.hasClass('receive') ? 'linear-gradient(90deg,#f4e6d6,#ffd9a8)' : '#199fe9')

            $this.append(append_)

            if ($this.hasClass('receive')) {
                $this.find('.coupon-item-goto').css({ color: 'unset' })
            }

            $this.find('.coupon-item-goto').css({ background: btnBackgound })
            $this.find('.coupon-item-goto').attr('href', $this.find('div[data-id]').data('url'))

        })
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

        console.time('refresh')

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

        console.timeEnd('refresh')
    }

    /**
     * 全部刷新重置
     */
    const allRefresh = async () => {

        basicSettings()
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
     * 购物车页面
     */
    const cartStart = async () => {

        if ($('div.bd').length > 0) {
            return;
        }

        window.addEventListener('resize', resizeHeight)

        basicSettings()
        eachCartList()
        await getCouponHTML()
        appendHtml()
        setBrandColor()

        checkStatusChangeHandler()
        onChangeCountHandler()
        autoGetCouponTimerHandler()

        // onLoadSet()
        lookCouponListModal()
    }

    /**
     * 搜索页
     * @param {*} isNew 是否新人 true/false
     * @param {*} type 单选多选 ONE/MORE
     */
    const searchStart = async () => {

        // 搜索页的 一键搜淘宝
        if ($('.searchTaobao_').length === 0) {

            /**
            * 非阻容，其他数据处理
            * @param {*} parents 行级标签
            * @param {*} resArr  数据存放的数组
             */
            function other(parents, resArr) {
                let productName = parents.find('a.product-name-link').attr('title') || '';

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

            // 预售拼团 不处理，其他的都追加按钮
            $('.line-box:not(:contains("预售拼团")) li.pan-list').append(`
                <button type="button" class="pan-list-btn searchTaobao_" style="margin-top: 5px; background: #199fe9;">一键搜淘宝</button>
            `)

            $('.searchTaobao_').on('click', function (params) {
                let searchArrVals = [];

                const $parents = $(this).parents('td.line-box');
                // 阻容处理、其他元件处理
                R($parents, searchArrVals); C($parents, searchArrVals); other($parents, searchArrVals);

                GM_openInTab(`https://s.taobao.com/search?q=${searchArrVals.join('/')}`, { active: true, insert: true, setParent: true })
            })

        }

        if ($('div#_remind').length > 0) {
            return;
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
         * 搜索列表中，对品牌颜色进行上色
         */
        const listRenderBrandColor = () => {
            for (let [brandName, brandDetail] of all16_15CouponMp) {
                // 获取页面元素
                const $brandEle = $(`a.brand-name[title*="${brandName}"]`)
                if ($brandEle.length > 0 && $brandEle.css('background-color') === "rgba(0, 0, 0, 0)") {
                    $brandEle.css({
                        "background-color": brandDetail.isNew ? '#00bfffb8' : '#7fffd4b8'
                    })
                }
            }
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

        // 更新优惠券列表到集合中
        await getCouponHTML()

        _renderFilterBrandColor()

        listRenderBrandColor()

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
                        color: #0094e7;">最低购入价： ${(minMum * orderPrice).toFixed(6)}</p>
                `)
            })
        }

        // 
        if ($('.minBuyMoney_').length === 0) {
            minBuyMoney()
        }


        // 多选展开按钮
        $('#more-brand').click(_renderMulitFilterBrandColor)
        // 品牌单选
        $('.screen-more .more-brand').click(_renderFilterBrandColor)
        // 多选新人券
        $('.get_new_coupon').click(() => multiFilterBrand(true))
        // 多选非新人券
        $('.get_notnew_coupon').click(() => multiFilterBrand(false))
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
    let isSearchPage = () => location.href.includes('so.szlcsc.com/global.html');
    // 购物车页
    let isCartPage = () => location.href.includes('cart.szlcsc.com/cart/display.html');
    // BOM配单页
    let isBomPage = () => location.href.includes('bom.szlcsc.com/member/eda/search.html');
    // 优惠券页
    let isCouponPage = () => location.href.includes('www.szlcsc.com/huodong.html');

    setInterval(function () {

        if (isCartPage()) {
            cartStart()
        }

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