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
(async function () {
    'use strict';

    const Util = {
        /**
         * 根据value排序Map
         * @param {*} map
         * @returns
         */
        sortMapByValue: function(map) {
            var arrayObj = Array.from(map);
            // 按照value值降序排序
            arrayObj.sort(function (a, b) {
                return b[1] - a[1]; // 修改为降序排序
            });
            return arrayObj;
        },

        /**
         * GET请求封装
         * @param {*} url
         */
        getAjax: function(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    url: url,
                    method: 'GET',
                    onload: (r) => {
                        resolve(r.response);
                    },
                    onerror: (err) => {
                        reject(err);
                    }
                });
            });
        },

        /**
         * POST请求封装
         * @param {*} url
         * @param {*} data
         */
        postAjaxJSON: function(url, data) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    url: url,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify(data), // 确保数据被正确转换为JSON字符串
                    onload: (r) => {
                        resolve(r.response);
                    },
                    onerror: (err) => {
                        reject(err);
                    }
                });
            });
        },

        /**
         * 获取品牌名称
         * 支持列表：
         * 1、XUNDA(讯答)
         * 2、立创开发板
         * 3、50元德立品牌优惠
         * 4、<新人专享>15元芯声品牌优惠
         * @param text
         */
        brandNameProcess: function(text) {
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
        },

        jsonToUrlParam: function(json, ignoreFields = '') {
            return Object.keys(json)
                .filter(key => ignoreFields.indexOf(key) === -1)
                .map(key => key + '=' + encodeURIComponent(json[key])).join('&'); // 使用 encodeURIComponent 避免URL编码问题
        },

        /**
         * POST请求封装
         * @param {*} url
         * @param {*} jsonData
         */
        postFormAjax: function(url, jsonData) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    url: url,
                    data: this.jsonToUrlParam(jsonData), // 使用 Util.jsonToUrlParam 方法
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    onload: (r) => {
                        resolve(r.response);
                    },
                    onerror: (err) => {
                        reject(err);
                    }
                });
            });
        },

        /**
         * 有进度的等待所有异步任务的执行
         * @param {*} requests
         * @param {*} callback
         * @returns
         */
        allWithProgress: function(requests, callback) {
            let index = 0;
            requests.forEach(item => {
                item.then(() => {
                    index++;
                    const progress = (index / requests.length) * 100;
                    callback({
                        total: requests.length,
                        cur: index,
                        progress: progress
                    });
                }).catch((err) => {
                    console.error(err);
                });
            });
            return Promise.all(requests);
        },

        /**
         * 等待
         * @param {*} timeout
         * @returns
         */
        sleep: function(timeout) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve(true);
                }, timeout);
            });
        },

        /**
         * 等待 执行函数
         * @param {*} timeout
         * @param {*} func
         * @returns
         */
        sleepFunc: function(timeout, func) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    func && func();
                }, timeout);
            });
        },

        /**
         * 获取本地缓存
         * @param {*} key
         */
        getLocalData: function(k) {
            return localStorage.getItem(k);
        },

        /**
         * 设置本地缓存
         * @param {*} key
         * @param {*} value
         */
        setLocalData: function(k, v) {
            localStorage.setItem(k, v);
        },

        /**
         * 获取session缓存
         * @param {*} key
         */
        getSessionData: function(k) {
            return sessionStorage.getItem(k);
        },

        /**
         * 设置session缓存
         * @param {*} key
         * @param {*} value
         */
        setSessionData: function(k, v) {
            sessionStorage.setItem(k, v);
        }
    };

    // ========================================================
    // 基础方法
    const Base = {
        // 优惠券只保存1元购的优惠券信息
        allOneCouponMap: new Map(),
        // 搜索页获取每一行的元素
        getSearchRow: () => {
            const rows = $('div.product-group-leader section, div.group section');
            rows.each(function () {
                if (!$(this).hasClass('line-box')) {
                    $(this).addClass('line-box');
                }
            });
            return rows;
        },
        // 获取顶级的行元素
        getParentRow: (that) => $(that).closest('.line-box')
    }


    /**
     * 一键索索淘宝
     */
    class SearchPageHelper {
        constructor() {
            this.someCouponMapping = {
                "MDD": "辰达半导体",
            }
        }

        /**
         * 搜索列表中，对品牌颜色进行上色
         * list.szlcsc.com/catalog
         */
        static catalogBrandColor() {
            for (let [brandName, brandDetail] of Base.allOneCouponMap) {
                // 获取页面元素
                const $brandEle = $(`li[title*="${brandName}"]:not([style*=background-color]), 
                span[title*="${brandName}"]:not([style*=background-color]), 
                a.brand-name[title*="${brandName}"]:not([style*=background-color])`);
                if ($brandEle.length > 0) {
                    $brandEle.css({
                        "background-color": brandDetail.isNew ? '#00bfffb8' : '#7fffd4b8'
                    });
                    $brandEle.addClass(brandDetail.isNew ? 'isNew' : 'isNotNew')
                }
            }
        }

        /**
         * 筛选条件：多选品牌
         * @param {*} isNew 是否新人券 true/false
         */
        async multiFilterBrand(isNew) {
            $('li:contains("品牌"):contains("多选") div:contains("多选")').last().click();
            await Util.sleep(1000);
            const elementStr = isNew ? 'isNew' : 'isNotNew';
            $(`.${elementStr}`).each(function () {
                // 品牌名称
                const brandNameOrigin = Util.brandNameProcess($(this).text().trim().trim());
                if (Base.allOneCouponMap.has(brandNameOrigin)) {
                    if (Base.allOneCouponMap.get(brandNameOrigin).isNew === isNew) {
                        // 多选框选中
                        $(this).find('label').click();
                    }
                }
            })
            await Util.sleep(1000);
            $('button[data-need-query*="lcsc_vid="][data-spm-reset]:contains("确定")').click();
        }

        /**
         * 类目筛选按钮租
         */
        btnsRender() {
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
                $('.get_new_coupon').click(() => this.multiFilterBrand(true))
                // 多选非新人券
                $('.get_notnew_coupon').click(() => this.multiFilterBrand(false))
            }
        }

        /**
         * 获取优惠券列表信息，并暂存在变量集合中
         * 只获取1元购的优惠券
         */
        async getAllCoupon() {

            const buildData = (jsonText) => {
                const json = JSON.parse(jsonText);
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
                        processCouponList(allCouponNotNew, this.someCouponMapping);
                    }
                    console.log(Base.allOneCouponMap);
                }
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
                        processItem(couponItem, Base.allOneCouponMap, someCouponMapping)
                    }
                }
            }

            // 获取缓存的我的优惠券数据
            const couponData = Util.getSessionData('COUPON_DATA');
            if (couponData) {
                if ([...Base.allOneCouponMap.keys()].length == 0) {
                    buildData(couponData);
                }
                return;
            }

            // http获取优惠券信息
            let json = await Util.getAjax(`https://activity.szlcsc.com/activity/coupon`);
            Util.setSessionData('COUPON_DATA', json);
            buildData(json);
        }

        /**
         * 一键搜索淘宝
         */
        appendSearchTbBtn() {
            if ($('.searchTaobao_').length === 0) {
                // 预售拼团 不处理，其他的都追加按钮
                $('button:contains("加入购物车")').after(`
                <button type="button" class="mb-[6px] h-[32px] w-full rounded-[6px] bg-[#0093E6] text-[12px] text-[white] hover:bg-[#47B2ED] searchTaobao_">一键搜淘宝</button>
            `)
            } else if ($('.searchTaobao_:not([addedClickHandler])').length > 0) {
                /**
                 * 非阻容，其他数据处理
                 * @param {*} parents 行级标签
                 * @param {*} resArr  数据存放的数组
                 */
                function other(parents, resArr) {
                    let productName = parents.find('dl dd:eq(0)').text().trim() || '';
                    if (productName.length === 0 || resArr.length > 0) {
                        return;
                    }
                    let footprint = parents.find('dl:contains("封装") dd span').text().trim() || '';
                    resArr.push(productName);
                    resArr.push(footprint);
                }

                /**
                 * 电阻数据处理
                 * @param {*} parents 行级标签
                 * @param {*} resArr  数据存放的数组
                 */
                function R(parents, resArr) {
                    const r = parents.find('dl:contains("阻值") dd span:eq(0)').text().replace('Ω', '').trim() || '';
                    if (r.length === 0 || resArr.length > 0) {
                        return;
                    }
                    const f = parents.find('dl:contains("封装") dd span:eq(0)').text().trim() || '';
                    const j = parents.find('dl:contains("精度") dd span:eq(0)').text().replace('±', '').trim() || '';
                    resArr.push(r);
                    resArr.push(f);
                    resArr.push(j);
                }

                /**
                 * 电容数据处理
                 * @param {*} parents  行级标签
                 * @param {*} resArr  数据存放的数组
                 */
                function C(parents, resArr) {
                    const c = parents.find('dl:contains("容值") dd span:eq(0)').text().trim() || '';
                    if (c.length === 0 || resArr.length > 0) {
                        return;
                    }
                    const v = parents.find('dl:contains("额定电压") dd span:eq(0)').text().trim() || '';
                    const j = parents.find('dl:contains("精度") dd span:eq(0)').text().replace('±', '').trim() || '';
                    const f = parents.find('dl:contains("封装") dd span:eq(0)').text().trim() || '';
                    resArr.push(c);
                    resArr.push(v);
                    resArr.push(j);
                    resArr.push(f);
                }

                $('.searchTaobao_:not([addedClickHandler])').attr('addedClickHandler', true).on('click', function (params) {
                    let searchArrVals = [];
                    const $parents = Base.getParentRow(this);
                    // 阻容处理、其他元件处理
                    R($parents, searchArrVals);
                    C($parents, searchArrVals);
                    other($parents, searchArrVals);
                    GM_openInTab(`https://s.taobao.com/search?q=${searchArrVals.join('/')}`, {
                        active: true,
                        insert: true,
                        setParent: true
                    })
                })
            }
        }

        /**
         * 左侧封装搜索
         */
        appendLeftRowBtns() {
            const rows = this.getSearchRow();
            [...rows.find('button:contains("数据手册")')].forEach(row => {
                const $btn = $(row);
                const specName = $btn.closest('section').find('dl:contains("封装")').find('dd').text();
                if ($btn.length > 0 && $btn.siblings('button:contains("封装精确匹配")').length === 0) {
                    // $btn.before(`<button specName="${specName}" selectType="MHC" style="width: 110px;" class='btn_search_manual mr-[10px] flex h-[26px] items-center justify-center rounded-[13px] bg-[#F5F6F9] text-[#333] hover:bg-[#ECEEF0]'>
                    //        <svg style="margin-right: 3px" t="1748570264460" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6531" width="16" height="16"><path d="M949.76 884.3264a88.68864 88.68864 0 0 1-25.64096 62.67904 87.14752 87.14752 0 0 1-123.76576 0.16896l-164.29568-160.87552a382.4128 382.4128 0 0 1-26.43968 12.6208 382.83776 382.83776 0 0 1-300.032 0 383.38048 383.38048 0 0 1-122.48064-83.39968 391.296 391.296 0 0 1 0-550.36928 384.56832 384.56832 0 0 1 627.55328 123.648 391.00416 391.00416 0 0 1-40.704 376.57088l150.32882 156.56448a88.576 88.576 0 0 1 25.47712 62.39232z m-153.6512-444.04736c0-186.33216-150.41536-337.92-335.30368-337.92s-335.32928 151.6032-335.32928 337.92S275.89632 778.24 460.8 778.24s335.3088-151.64928 335.3088-337.96096z m-503.61344 168.90368a240.45568 240.45568 0 0 1 0-337.73568l34.63168 40.07424a183.46496 183.46496 0 0 0 0 257.50528z" fill="#fa6650" p-id="6532"></path></svg>
                    //        封装模糊匹配
                    //        </button>`);
                    $btn.before(`<button specName="${specName}" selectType="JQC" style="width: 110px;" class='btn_search_manual mr-[10px] flex h-[26px] items-center justify-center rounded-[13px] bg-[#F5F6F9] text-[#333] hover:bg-[#ECEEF0]'>
                           <svg style="margin-right: 3px" t="1748569569792" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7704" width="16" height="16"><path d="M945.71 946c-18.67 18.67-49.21 18.67-67.88 0L674.18 742.35c-18.67-18.67-18.67-49.21 0-67.88 18.67-18.67 49.21-18.67 67.88 0l203.65 203.65c18.66 18.66 18.66 49.21 0 67.88z" fill="#CDD8F8" p-id="7705"></path><path d="M447.71 832c-51.82 0-102.11-10.16-149.49-30.2-45.73-19.34-86.79-47.02-122.04-82.27-35.25-35.25-62.93-76.31-82.27-122.04-20.04-47.37-30.2-97.67-30.2-149.49s10.16-102.11 30.2-149.49c19.34-45.73 47.02-86.79 82.27-122.04 35.25-35.25 76.31-62.93 122.04-82.27C345.6 74.16 395.89 64 447.71 64S549.82 74.16 597.2 94.2c45.73 19.34 86.79 47.02 122.04 82.27 35.25 33.25 62.93 76.31 82.27 122.04 20.04 47.37 30.2 97.67 30.2 149.49s-10.16 102.11-30.2 149.49c-19.34 45.73-47.02 86.79-82.27 122.04-35.25 35.25-76.31 62.93-122.04 82.27-47.38 20.04-97.67 30.2-149.49 30.2z m0-667.83c-75.81 0-147.09 29.52-200.7 83.13S163.88 372.18 163.88 448s29.52 147.09 83.13 200.7c53.61 53.61 124.88 83.13 200.7 83.13s147.09-29.52 200.7-83.13c53.61-53.61 83.13-124.88 83.13-200.7s-29.52-147.09-83.13-200.7-124.89-83.13-200.7-83.13z" fill="#5C76F9" p-id="7706"></path></svg>
                           封装精确匹配
                           </button>`);
                }
            });

            $('.btn_search_manual').off('click').on('click', function () {
                this._clickSpecFunc($(this).attr('specName'), $(this).attr('selectType'));
            }.bind(this));
        }

        /**
         * 获取搜索结果行
         */
        getSearchRow() {
            return Base.getSearchRow();
        }

        /**
         * 封装模糊匹配
         * @param specName
         * @private
         */
        _MHCEachClick(specName) {
            if ($(`.det-screen:contains("封装：") label.fuxuanku-lable:contains("${specName}")`).length > 0) {
                $(`.det-screen:contains("封装：") label.fuxuanku-lable:contains("${specName}")`).click();
            } else {
                if (specName.includes('-')) {
                    this._MHCEachClick(specName.split('-').slice(0, -1).join('-'));
                }
            }
        }

        /**
         * 封装精确匹配
         * @param specName
         * @private
         */
        _JQCEachClick(specName) {
            if ($(`.det-screen:contains("封装：") label.fuxuanku-lable[title="${specName}"]`).length > 0) {
                $(`.det-screen:contains("封装：") label.fuxuanku-lable[title="${specName}"]`).click();
            } else {
                if (specName.includes('-')) {
                    this._JQCEachClick(specName.split('-').slice(0, -1).join('-'));
                }
            }
        }

        async _clickSpecFunc(specName, selectType) {
            // 封装的筛选条件那一行 展开规格
            $('li:contains("封装"):contains("多选")').find('div:contains("多选")').click();
            switch (selectType) {
                // 模糊查
                case "MHC":
                    this._MHCEachClick(specName);
                    break;
                // 精确查
                case "JQC":
                    this._JQCEachClick(specName);
                    break;
            }
            // 查找规格对应的选项
            $(`.det-screen:contains("封装：") input[value="确定"]`).click();
        }
    };

    /**
     * 右下角商品列表按钮
     */
    class SearchMinPriceProducts {
        constructor({jsRules, searchText, searchPageRealSize}) {
            // 搜索结束的标记
            this.searchEnd = false;
            this.searchText = searchText;
            this.jsRules = jsRules || [];
            // 分页大小
            this.searchPageRealSize = searchPageRealSize || 50;
            // 查询结果
            this.dataList = [];
            this.init();
            this.fetchData();
            this.dataFilter();
            this.preRender();
            this.bindEvent();

            console.log($('input[placeholder="在结果中再搜索"]').val())
            console.log($('input#global-seach-input').val())

        }

        /**
         * 初始化
         */
        init() {
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
                        <div id="data-box"></div>
                    </div>`);

        }

        showControl(html) {
            $('.wait-h2').hide(); $('.nodata-h2').hide();
            $('#product-list-box div#data-box').html(html);
            if (html.length === 0 || $('#product-list-box div#data-box table').length === 0) {
                $('.nodata-h2').show();
                $('.wait-h2').hide();
                return;
            }
        }

        /**
         * 绑定事件
         */
        bindEvent() {
            $('#product-list-show-btn').off('click').on('click', function() {
                if ($('#product-list-box').is(":hidden")) {
                    this.searchEnd = false;
                    this.dataList = [];
                }
                $('#product-list-box').fadeToggle();
            });
        }

        /**
         * 数据过滤
         */
        dataFilter() {
            // 如果广东仓和江苏仓同时没有货的话，那么就属于订货商品，不需要显示
            // 如果没有价格区间，证明是停售商品
            this.dataList = this.dataList.filter(item => !(parseInt(item.jsWarehouseStockNumber || 0) <= 0 && parseInt(item.gdWarehouseStockNumber || 0) <= 0) && item.productPriceList.length > 0);
            // 去重
            const map = new Map();
            this.dataList.forEach(item => {
                map.set(item.productId, item);
            });
            this.dataList = [...map.values()];
            // 列表自动正序，方便凑单
            this.dataList.sort((o1, o2) => {
                return (o1.theRatio * o1.productPriceList[0].productPrice * (o1.listProductDiscount || 10) / 10).toFixed(6) - (o2.theRatio * o2.productPriceList[0].productPrice * (o2.listProductDiscount || 10) / 10).toFixed(6);
            });
            // 外部动态js规则组
            if (this.jsRules.length > 0) {
                this.jsRules.forEach(jsr => {
                    this.dataList = this.dataList.filter(jsr);
                });
            }
        }

        /**
         * 渲染搜索结果列表
         */
        preRender() {
            // 取指定条数的数据。默认50个
            const html = this.dataList.slice(0, this.searchPageRealSize).map(item => {
                const {
                    productId,
                    lightStandard,
                    lightProductCode,
                    productMinEncapsulationNumber,
                    productMinEncapsulationUnit,
                    productName,
                    productModel,
                    lightProductModel,
                    productGradePlateId,
                    productPriceList,
                    listProductDiscount,
                    productGradePlateName,
                    hkConvesionRatio,
                    convesionRatio,
                    theRatio,
                    smtStockNumber,
                    smtLabel,
                    productStockStatus,
                    isPlusDiscount,
                    productUnit,
                    isPresent,
                    isGuidePrice,
                    minBuyNumber,
                    hasSampleRule,
                    breviaryImageUrl,
                    luceneBreviaryImageUrls,
                    productType,
                    productTypeCode,
                    pdfDESProductId,
                    gdWarehouseStockNumber,
                    jsWarehouseStockNumber,
                    paramLinkedMap,
                    recentlySalesCount,
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
                                          ${lightProductModel}</a>
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
                                     ` : ''}
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
            this.showControl(html);
        }

        /**
         * 数据请求
         */
        fetchData() {

        }
    }

    // 控制单个实体
    let searchMinPriceIsEnd = false;

    // 搜索页启动
    function searchStart() {
        // 每行追加到按钮组
        const searchPageHelper = new SearchPageHelper();
        searchPageHelper.appendLeftRowBtns();
        searchPageHelper.appendSearchTbBtn();
        // 优惠券信息获取
        searchPageHelper.getAllCoupon();
        // 搜索页按钮组渲染
        searchPageHelper.btnsRender();
        // 定时上色
        setInterval(SearchPageHelper.catalogBrandColor, 1000);
        // 最新金额按钮
        if (!searchMinPriceIsEnd) {
            const smp = new SearchMinPriceProducts($('#global-seach-input').val());
            searchMinPriceIsEnd = true;
        }
    }

    // 搜索页判断
    let isSearchPage = () => location.href.includes('so.szlcsc.com/global.html')
        || location.href.includes('list.szlcsc.com/brand')
        || location.href.includes('list.szlcsc.com/catalog');

    setInterval(function () {
        if (isSearchPage()) {
            searchStart()
        }
    }, 2000)

})()
