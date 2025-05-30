// ==UserScript==
// @name         JLC_SHOP_SEARCH_TOOL_2.0
// @namespace    http://tampermonkey.net/
// @version      1.1.2
// @description  JLC_SHOP_SEARCH_TOOL_2.0
// @author       Lx
// @match        https://so.szlcsc.com/global.html**
// @match        https://list.szlcsc.com/brand**
// @match        https://list.szlcsc.com/catalog**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=szlcsc.com
// @require      https://update.greasyfork.org/scripts/446666/1389793/jQuery%20Core%20minified.js
// @grant        GM_xmlhttpRequest
// @connect      szlcsc.com
// @license      MIT
// ==/UserScript==
(async function() {
    'use strict';
    /**
     * 根据value排序Map
     * @param {*} map
     * @returns
     */
    const sortMapByValue = (map) => {
        var arrayObj = Array.from(map)
        //按照value值降序排序
        arrayObj.sort(function(a, b) {
            return a[1] - b[1]
        })
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
                headers: {
                    'Content-Type': 'application/json'
                },
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

    /**
     * 获取品牌名称
     * 支持列表：
     * 1、XUNDA(讯答)
     * 2、立创开发板
     * 3、50元德立品牌优惠
     * 4、<新人专享>15元芯声品牌优惠
     * @param text
     */
    const brandNameProcess = (text) => {
        let replaceText = text;
        try {
            // 取括号里的品牌名称 如：ICEY(冰禹)
            if (replaceText.includes("(")) {
                const t = replaceText.split(/\(|\)/g).filter((e => e));
                replaceText = (1 === t.length ? t[0] : t.length > 1 ? t[t.length - 1] : name)
            } else {
                const t = /<.+>/g.exec(text)
                if (t != null) {
                    replaceText = t[0].replace(/<|>/g, '')
                    if (replaceText === '新人专享') {
                        replaceText = text.replace(/^.[^元]*元(.*)品牌.*$/, '$1')
                    }
                } else {
                    replaceText = text.replace(/^.[^元]*元(.*)品牌.*$/, '$1')
                }
            }
        } catch (e) {
            console.error(e)
        } finally {
            return replaceText
        }
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
                headers: {
                    'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
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
                callback({
                    total: requests.length,
                    cur: index,
                    progress
                });
            })
        });
        return Promise.all(requests);
    }
    /**
     * 等待
     * @param {*} timeout
     * @returns
     */
    const sleep = (timeout) => {
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
    const sleepFunc = (timeout, func) => {
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
     * 获取本地缓存
     * @param {*} key
     */
    const getSessionData = (k) => {
        return sessionStorage.getItem(k)
    }
    /**
     * 设置本地缓存
     * @param {*} key
     */
    const setSessionData = (k, v) => {
        sessionStorage.setItem(k, v)
    }

    // ========================================================

    // 优惠券只保存1元购的优惠券信息
    const allOneCouponMap = new Map();

    /**
     * 搜索列表中，对品牌颜色进行上色
     * list.szlcsc.com/catalog
     */
    const catalogBrandColor = () => {
        for (let [brandName, brandDetail] of allOneCouponMap) {
            // 获取页面元素
            const $brandEle = $(`li[title*="${brandName}"]:not([style*=background-color]),span[title*="${brandName}"]:not([style*=background-color]),a.brand-name[title*="${brandName}"]:not([style*=background-color])`);
            if ($brandEle.length > 0) {
                $brandEle.css({
                    "background-color": brandDetail.isNew ? '#00bfffb8' : '#7fffd4b8'
                });
                $brandEle.addClass(brandDetail.isNew ? 'isNew' : 'isNotNew')
            }
        }
    }

    const someCouponMapping = {
        "MDD": "辰达半导体",
    }
    /**
     * 获取优惠券列表信息，并暂存在变量集合中
     * 只获取1元购的优惠券
     */
    const getAllCoupon = async() => {
        // 获取缓存的我的优惠券数据
        const couponData = getSessionData('COUPON_DATA');
        if (couponData) {
            return;
        }

        // 处理单个优惠券
        const processItem = (couponItem, referenceMap, someCouponMapping) => {
            // 一些优惠券特殊处理
            for (let key in someCouponMapping) {
                if (couponItem.couponTypeName == key) {
                    const newBrandName = someCouponMapping[key]
                    // 存到变量Map中
                    referenceMap.set(newBrandName, {
                        couponName: couponItem.couponName, // 优惠券名称
                        isNew: couponItem.couponName.includes("<新人专享>"), // 是否新人专享
                        couponPrice: couponItem.couponAmount, //优惠券金额减免
                        minOrderMoney: couponItem.minOrderMoney, //要求最低金额
                        pay: couponItem.minOrderMoney - couponItem.couponAmount, // 实际支付金额
                        brandName: newBrandName, // 品牌名称
                        couponId: couponItem.uuid, // 优惠券id
                        isHaved: couponItem.isReceive, // 是否已经领取
                        isUsed: couponItem.isUse, // 是否已经使用过
                        brandIndexHref: couponItem.targetUrl, // 对应的品牌主页地址
                        couponLink: `https://www.szlcsc.com/getCoupon/${couponItem.uuid}`, // 领券接口地址
                    });
                }
            }
            // 存到变量Map中
            referenceMap.set(couponItem.couponTypeName, {
                couponName: couponItem.couponName, // 优惠券名称
                isNew: couponItem.couponName.includes("<新人专享>"), // 是否新人专享
                couponPrice: couponItem.couponAmount, //优惠券金额减免
                minOrderMoney: couponItem.minOrderMoney, //要求最低金额
                pay: couponItem.minOrderMoney - couponItem.couponAmount, // 实际支付金额
                brandName: couponItem.couponTypeName, // 品牌名称
                couponId: couponItem.uuid, // 优惠券id
                isHaved: couponItem.isReceive, // 是否已经领取
                isUsed: couponItem.isUse, // 是否已经使用过
                brandIndexHref: couponItem.targetUrl, // 对应的品牌主页地址
                couponLink: `https://www.szlcsc.com/getCoupon/${couponItem.uuid}`, // 领券接口地址
            });
        }
        // 优惠券简单封装
        const processCouponList = (couponList, someCouponMapping) => {
            // 遍历
            for (let couponItem of couponList) {
                const {
                    couponAmount,
                    minOrderMoney
                } = couponItem;
                // 1元购
                if ((minOrderMoney - couponAmount) === 1) {
                    processItem(couponItem, allOneCouponMap, someCouponMapping)
                }
            }
        }

        // http获取优惠券信息
        let json = await getAjax(`https://activity.szlcsc.com/activity/coupon`);
        setSessionData('COUPON_DATA', json);
        json = JSON.parse(json);
        if (json.code === 200) {
            // 取数据
            const resultMap = json.result.couponModelVOListMap;
            const datas = ['1', '2', '3', '4', '5'];
            let allCouponNotNew = [];
            for (const key of datas) {
                // 合并所有类型的优惠券
                if (resultMap[key]) {
                    allCouponNotNew = [...allCouponNotNew, ...resultMap[key]];
                }
                // 优惠券处理
                processCouponList(allCouponNotNew, someCouponMapping);
            }
            console.log(allOneCouponMap);
        }
    }

    /**
     * 筛选条件：多选品牌
     * @param {*} isNew 是否新人券 true/false
     */
    const multiFilterBrand = async(isNew) => {
        $('li:contains("品牌"):contains("多选") div:contains("多选")').last().click();
        await sleep(300);
        const elementStr = isNew ? 'isNew' : 'isNotNew';
        $(`.${elementStr}`).each(function() {
            // 品牌名称
            const brandNameOrigin = brandNameProcess($(this).attr('title').trim());
            if (allOneCouponMap.has(brandNameOrigin)) {
                if (allOneCouponMap.get(brandNameOrigin).isNew === isNew) {
                    // 多选框选中
                    $(this).find('label').click();
                }
            }
        })
        await sleep(1500);
        $('button[data-need-query*="lcsc_vid="][data-spm-reset]:contains("确定")').click();
    }

    function btnsRender() {
        if ($('#_remind').length === 0) {
            $('li:contains("品牌"):contains("多选")').append(`
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
            // 多选新人券
            $('.get_new_coupon').click(() => multiFilterBrand(true))
            // 多选非新人券
            $('.get_notnew_coupon').click(() => multiFilterBrand(false))
        }
    }

    function catalogSearchBtns() {
        const rows = $('div.product-group-leader section, div.group section');
        [...rows.find('button:contains("数据手册")')].forEach(row => {
            const $btn = $(row);
            if ($btn.length > 0 && $btn.siblings('button:contains("封装查询")').length === 0) {
                $btn.before(`<button class='btn_data_manual mr-[10px] flex h-[26px] w-[95px] items-center justify-center rounded-[13px] bg-[#F5F6F9] text-[#333] hover:bg-[#ECEEF0]'>
                       <svg style="margin-right: 5px" t="1748569569792" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7704" width="16" height="16"><path d="M945.71 946c-18.67 18.67-49.21 18.67-67.88 0L674.18 742.35c-18.67-18.67-18.67-49.21 0-67.88 18.67-18.67 49.21-18.67 67.88 0l203.65 203.65c18.66 18.66 18.66 49.21 0 67.88z" fill="#CDD8F8" p-id="7705"></path><path d="M447.71 832c-51.82 0-102.11-10.16-149.49-30.2-45.73-19.34-86.79-47.02-122.04-82.27-35.25-35.25-62.93-76.31-82.27-122.04-20.04-47.37-30.2-97.67-30.2-149.49s10.16-102.11 30.2-149.49c19.34-45.73 47.02-86.79 82.27-122.04 35.25-35.25 76.31-62.93 122.04-82.27C345.6 74.16 395.89 64 447.71 64S549.82 74.16 597.2 94.2c45.73 19.34 86.79 47.02 122.04 82.27 35.25 35.25 62.93 76.31 82.27 122.04 20.04 47.37 30.2 97.67 30.2 149.49s-10.16 102.11-30.2 149.49c-19.34 45.73-47.02 86.79-82.27 122.04-35.25 35.25-76.31 62.93-122.04 82.27-47.38 20.04-97.67 30.2-149.49 30.2z m0-667.83c-75.81 0-147.09 29.52-200.7 83.13S163.88 372.18 163.88 448s29.52 147.09 83.13 200.7c53.61 53.61 124.88 83.13 200.7 83.13s147.09-29.52 200.7-83.13c53.61-53.61 83.13-124.88 83.13-200.7s-29.52-147.09-83.13-200.7-124.89-83.13-200.7-83.13z" fill="#5C76F9" p-id="7706"></path></svg>
                       封装查询
                       </button>`);
            }
        });
    }

    // 搜索页启动
    function searchStart() {
        // 优惠券信息获取
        getAllCoupon();
        // 搜索页按钮组渲染
        btnsRender();

        catalogSearchBtns();

        // 定时上色
        setInterval(catalogBrandColor, 1000);
    }

    // 搜索页判断
    let isSearchPage = () => location.href.includes('so.szlcsc.com/global.html')
        || location.href.includes('list.szlcsc.com/brand')
        || location.href.includes('list.szlcsc.com/catalog');

    setInterval(function () {
        if (isSearchPage()) {
            searchStart()
        }
    }, 500)

})()
