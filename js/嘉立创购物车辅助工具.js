// ==UserScript==
// @name         嘉立创购物车辅助工具
// @namespace    http://tampermonkey.net/
// @version      1.3.3
// @description  嘉立创辅助工具，购物车辅助增强工具
// @author       Lx
// @match        https://cart.szlcsc.com/cart/display.html**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=szlcsc.com
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://update.greasyfork.org/scripts/455576/1122361/Qmsg.js
// @resource customCSS https://gitee.com/snwjas/message.js/raw/master/dist/message.min.css
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @license      MIT
// ==/UserScript==

(async function() {
    'use strict';

    // 引入message的css文件并加入html中
    const css = GM_getResourceText("customCSS");
    GM_addStyle(css);

    /**
     * rgb颜色随机
     * @returns
     */
    const rgb = () => {
        var r = Math.floor(Math.random() * 256);
        var g = Math.floor(Math.random() * 256);
        var b = Math.floor(Math.random() * 256);
        var rgb = 'rgb(' + r + ',' + g + ',' + b + ')';
        return rgb;
    }

    /**
     * rgba颜色随机
     * @param {*} a
     * @returns
     */
    const rgba = (a = 1) => {
        var r = Math.floor(Math.random() * 256);
        var g = Math.floor(Math.random() * 256);
        var b = Math.floor(Math.random() * 256);
        var rgb = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        return rgb;
    }

    /**
     * 十六进制颜色随机
     * @returns
     */
    const color16 = () => {
        var r = Math.floor(Math.random() * 256);
        var g = Math.floor(Math.random() * 256);
        var b = Math.floor(Math.random() * 256);
        var color = '#' + r.toString(16) + g.toString(16) + b.toString(16);
        return color;
    }

    /**
     * 正则获取品牌名称，需要传入xxxx(品牌名称) 这样的字符
     * @param {*} text
     * @returns
     */
    const getBrandNameByRe = (text) => {
        let res = text
        try {
            res = /\(.+\)/g.exec(text)[0].replace(/\((.*?)\)/, '$1')
        } catch (e) {
            console.error(e);
        }
        return res
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
    const dataMp = new Map()
        // 品牌对应颜色，用于快速查找位置。
    const dataBrandColorMp = new Map()
        // 优惠券页面，数据暂存。只保存16-15的优惠券
    const couponMp = new Map()

    // 消息弹框全局参数配置
    Qmsg.config({
        showClose: true,
        timeout: 2500,
    })

    /**
     * 根据value排序Map
     * @param {*} map
     * @returns
     */
    const sortMapByValue = (map) => {
        var arrayObj = Array.from(map);
        //按照value值降序排序
        arrayObj.sort(function(a, b) { return a[1] - b[1] });
        return arrayObj
    }


    // 控制按钮的生成
    const buttonListFactory = () => {
        return `
            <div class='mr10 flex flex-sx-center'><label style="font-size: 14px">自动领取优惠券</label><input style="zoom: 80%; margin: 0 8px;" type="checkbox" class="checkbox"/>(功能暂未开发)</div>
        `
    }


    /**
     * 显示隐藏 小窗的的按钮展示
     */
    const showOrHideButtonFactory = () => {
        return `
        <div class="hideBtn">
            收起助手 >
        </div>
        <div class="showBtn hide_">
            < 展开助手
        </div>
        `
    }

    /**
     * 追加的html
     * @returns
     */
    const htmlFactory = () => {
        let tempHtml = `
        ${showOrHideButtonFactory()}
        <div class="bd">
        ${buttonListFactory()}
        <ul>`

        const head = `
        <li class='li-cs' style="position: sticky; top: 0px; background-color: white;">
                <div>
                    <span style='font-weight: 1000; color: black;width: 110px;' class="flex flex-zy-center">品牌名称</br>(现货)</span>
                    <span style='font-weight: 1000; color: black; width: 80px;' class="flex flex-zy-center">总金额</span>
                    <span style='font-weight: 1000; color: black;' class="flex flex-zy-center">优惠券</br>(16-15) </span>
                </div>
            </li>
        `

        tempHtml += head

        for (var [key, val] of sortMapByValue(dataMp)) {
            // <a href='https://www.szlcsc.com/huodong.html?from=dh' class="to_cou" target="_blank">优惠券入口</a>
            tempHtml += `
            <li class='li-cs click-hv'>
                <div>
                    <span class='key sort_' style="width: 110px;">${key}</span>
                    <span class='val sort_' style="width: 80px;">${val}</span>
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
        const couponEntity = couponMp.get(brandName)

        let buttonLine = ''

        if (!$.isEmptyObject(couponEntity)) {

            // 是否已经领取
            if (couponEntity.isHaved === true) {
                buttonLine = `<span class='val' style="text-align: center; ">
                    <span style="font-size: 12px;">已领取-${couponEntity.isNew === false ? '普通券' : '新人券'}</span>
                </span> `
            } else {
                buttonLine = `<span class='flex-sx-center flex-zy-center flex' style="padding: 0; width: 160px; text-align: center; ">
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
    .bd {
        position: fixed;
        top: 40px;
        right: 40px;
        background-color: white;
        border: 2px solid #3498db;
        width: 320px;
        padding: 3px;
        border-radius: 5px;
        z-index: 10;
        overflow: auto;
    }

    .hideBtn, .showBtn {
        position: fixed;
        top: 25px;
        right: 10px;
        background-color: white;
        border: 2px solid #3498db;
        width: 85px;
        line-height: 30px;
        text-align: center;
        padding: 3px;
        font-weight: 800;
        border-radius: 5px;
        z-index: 11;
        font-size: 16px;
    }

    .hide_ {
        display: none;
    }

    .mr10 {
        margin: 10px;
    }

    .flex {
        display: flex;
    }

    .flex-sx-center {
        /*上下居中*/
        align-items: center;
    }

    .flex-zy-center {
        /*左右居中*/
        justify-content: center;
    }

    .li-cs{
     margin: 5px;
     font-size: 14px;
     box-sizing:border-box;
    }

    .click-hv:hover span, .li-cs button:hover {
      color: #444 !important;
      cursor: pointer;
    }

    .li-cs div {
        display: flex;
        width: 100%;
        border: 2px solid #3498db;
        border-radius: 5px;
    }

    .li-cs span {
        padding: 10px;
        width: 50%;
        color: white;
        text-shadow: 1px 1px 1px white;
        box-sizing:border-box;
    }

    .li-cs .to_cou {
        border: 1px solid white;
        border-radius: 3px;
        background-color: rgba(255, 255, 255, 0.6);
        padding: 3px 4px;
        color: #2c4985;
        text-shadow: 1px 1px 1px white;
    }

    .cart-li-pro-info div:hover {
        color:rgba(57, 46, 74, 0.9) !important;
        text-shadow: 1px 1px 1px white;
    }
     .li-cs .to_cou:hover {
        color:black !important;
        text-shadow: 1px 1px 1px white;
    }

    .checkbox {
        appearance: none;
        width: 64px;
        height: 32px;
        position: relative;
        border-radius: 16px;
        cursor: pointer;
        background-color: #777;
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

    ..checkbox:hover:before {
        box-shadow: inset 0px 0px 5px 0px #3498db;
    }
    .checkbox:checked {
        background-color: limegreen;
    }
    .checkbox:checked:before {
        left: 34px;
    }
    .checkbox:checked:after {
        color: black;
    }
    </style>
    `


    /**
     * 追加到body
     */
    const appendHtml = () => {

        $('#myCss').remove()
        $('.bd').remove()

        $('body').append(cssFactory())
            .append(htmlFactory())
    }

    /**
     * 基础配置优化
     */
    const basicSettings = () => {
        // 多选框放大
        $('input[type*=checkbox]').css('zoom', '150%')

        // 点击物料图片，操作多选框
        $('.product-img').each(function() {
            $(this).on('click', function(target) {
                $(this).prev('.check-box').click()
            })
        })

        // 购物车列表 点击品牌跳转到该品牌下的商品
        let brandElement = $('.product-item li.cart-li-pro-info').find('div:eq(2)')
        brandElement.css({ cursor: 'pointer' })
        brandElement.on('click', function() {
            window.open(`https://so.szlcsc.com/global.html?k=${getBrandNameByRe(this.innerText)}`)
        })
    }


    /**
     * 遍历购物车清单，并计算品牌总金额
     */
    const eachCartList = () => {
        dataMp.clear()

        getHavedLineInfo().each(function(i) {

            let $this = $(this)

            // 物料编号
            let productId = $this.find('ul li:eq(1) a').text().trim()

            // 品牌名称
            let brandName = $this.find('.cart-li-pro-info div:eq(2)').text().trim()

            // 查找到品牌名称
            brandName = getBrandNameByRe(brandName.split('\n')[brandName.split('\n').length - 1].trim())

            if ($this.find('input:checked').length === 0) {
                return
            }

            // 品牌下的单个商品总价
            let linePrice = parseFloat($this.find('.line-total-price').text().trim().replace('￥', ''))

            // 日志打印控制台
            // console.log(productId, brandName, linePrice)

            let mpVal = $.isEmptyObject(dataMp.get(brandName)) ? 0 : dataMp.get(brandName)

            // 保存到Map中
            dataMp.set(brandName, parseFloat((mpVal + linePrice).toFixed(2)))


            if ($.isEmptyObject(dataBrandColorMp.get(brandName))) {
                // 对品牌进行随机色设置
                dataBrandColorMp.set(brandName, rgba('0.9'))
            }
        })
    }

    /**
     * 对品牌进行随机色设置
     */
    const setBrandColor = () => {

        //弹框 对品牌进行随机色设置
        $('.li-cs').each(function(i) {
            $(this).css('background', dataBrandColorMp.get($(this).find('span:eq(0)').text().trim()))
        })

        // 购物车列表颜色设置
        dataBrandColorMp.forEach((v, k) => {
            let brandElement = getHavedLineInfoByBrandName(k).find('ul li.cart-li-pro-info')
            brandElement.css({
                'background-color': v,
                'text-shadow': '0px 1px 1px white',
                'color': 'white'
            })

            brandElement.find('a').css({
                'text-shadow': '0px 1px 1px white',
                'color': 'white'
            })
        })
    }

    /**
     * 通过品牌名称，查找购物车中所在行的元素（包含现货、订货）
     */
    const getAllLineInfoByBrandName = (brandName) => {
        return $('.product-list .product-item:contains(' + brandName + ')')
    }

    /**
     * 通过品牌名称，查找购物车中所在行的元素(只获取现货商品)
     */
    const getHavedLineInfoByBrandName = (brandName) => {
        return $('.product-list .product-list-dl:eq(0) .product-item:contains(' + brandName + ')')
    }

    /**
     * 查找购物车中所在行的元素(只获取现货商品)
     */
    const getHavedLineInfo = () => {
        return $('.product-list .product-list-dl:eq(0) .product-item')
    }

    /**
     * 点击小窗口的品牌按钮，实现该品牌下的单选
     * 且该品牌下的物料，会自动排到购物车的前面几条
     */
    const clickBrandHandler = () => {
        $('.click-hv .sort_').on('click', function(target) {
            let brandName = $(this).text().trim()

            let cutHtmlElement = []

            // 查找购物车 现货商品
            getHavedLineInfoByBrandName(brandName).each(function(i) {
                cutHtmlElement.push($(this))
            })

            cutHtmlElement.forEach(item => {
                $('.product-list .product-list-dl:eq(0) .product-item').insertAfter(item)
            })
        })
    }

    /**
     * 多选框变化，刷新小窗口的计算结果
     */
    const checkStatusChangeHandler = () => {
        $(".check-box").change(refresh);
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
            });
        });
    }

    /**
     * POST请求封装
     * @param {} data
     */
    const postAjax = (url, data) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
                onload: (r) => {
                    resolve(r.response)
                },
                onerror: (err) => {
                    reject(err)
                }
            });
        });
    }


    /**
     * 获取优惠券列表信息，并暂存在变量集合中
     */
    const getCouponHTML = async() => {
        let couponHTML = await getAjax('https://www.szlcsc.com/huodong.html?from=dh#coupon2')

        $(couponHTML).find('.coupon-item:contains(满16可用) div[data-id]').each(function() {

            let $this = $(this)

            // 优惠券id
            let couponId = $this.attr('data-id')

            // 是否已经领取
            let isHaved = $this.find(':contains(立即使用)').length > 0

            // 优惠券名称
            let couponName = $this.attr('data-name')

            // 优惠券金额
            let couponPrice = couponName.replace(/^.*?\>(.*?)元.*$/, '$1')
                // 品牌名称
            let brandName = couponName.replace(/^.*?元(.*?)品牌.*$/, '$1')

            // 是否新人优惠券
            let isNew = couponName.split('新人专享').length >= 2

            couponMp.set(brandName, {
                couponName, // 优惠券名称
                isNew, // 是否新人专享
                couponPrice, //优惠券金额减免
                brandName, // 品牌名称
                couponId, // 优惠券id
                isHaved, // 是否已经领取
                couponLink: `https://www.szlcsc.com/getCoupon/${couponId}`, // 领券接口地址
            })

            // console.log(couponPrice, brandName)
        })


        // console.log(couponMp)
    }

    /**
     * 优惠券领取按钮的绑定事件
     */
    const getCouponClickHandler = () => {
        $('.to_cou').click(async function(target) {
            let brandName = $(this).parents('span').siblings('.key').text()

            // 优惠券实体
            let couponEntity = couponMp.get(brandName)

            if (!$.isEmptyObject(couponEntity)) {
                let res = await getAjax(couponEntity.couponLink)
                    // console.log(res);

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
        $('.showBtn,.hideBtn').click(function(target) {
            let $bd = $('.bd')

            if ($bd.is(':hidden')) {
                $('.hideBtn').show()
                $('.showBtn').hide()
                setLocalData('SHOW_BOOL', true)
            } else if ($bd.is(':visible')) {
                $('.showBtn').show()
                $('.hideBtn').hide()
                setLocalData('SHOW_BOOL', false)
            }

            $bd.fadeToggle()
        })
    }

    /**
     * 页面加载的时候，控制小窗显示隐藏
     */
    const onloadSetShowOrHide = () => {
        if (getLocalData('SHOW_BOOL') === 'false') {
            $('.hideBtn').click()
        }
    }

    /**
     * 刷新小窗口数据
     * @param {*} notRefreshCouponHtml 是否更新优惠券集合数据
     */
    const refresh = async(notRefreshCouponHtml) => {

        // 是否更新优惠券集合数据，主要更新是否领取的状态
        if (notRefreshCouponHtml === true) {
            await getCouponHTML()
        }

        eachCartList()
        appendHtml()
        setBrandColor()
        clickBrandHandler()
        getCouponClickHandler()
        showOrHideModalHandler()
        resizeHeght()
    }


    /**
     * 重置小窗口的高度
     */
    const resizeHeght = () => {

        let bdHeight = parseFloat($('.bd').css('height').replace('px', ''))

        if ((window.innerHeight - 120) < bdHeight) {
            $('.bd').css({ height: '82vh' })
        } else {
            $('.bd').css({ height: 'auto' })
        }
    }

    window.addEventListener('resize', resizeHeght);

    basicSettings()
    eachCartList()
    await getCouponHTML()
    appendHtml()
    setBrandColor()
    clickBrandHandler()
    checkStatusChangeHandler()
    getCouponClickHandler()
    showOrHideModalHandler()
    onloadSetShowOrHide()

    resizeHeght()

})();