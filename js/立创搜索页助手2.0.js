// ==UserScript==
// @name         JLC_SHOP_SEARCH_TOOL_2.0
// @namespace    http://tampermonkey.net/
// @version      1.1.3
// @description  JLC_SHOP_SEARCH_TOOL_2.0.
// @author       Lx
// @match        https://so.szlcsc.com/global.html**
// @match        https://list.szlcsc.com/brand**
// @match        https://list.szlcsc.com/catalog**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=szlcsc.com
// @require      https://update.greasyfork.org/scripts/446666/1389793/jQuery%20Core%20minified.js
// @resource searchCSS https://gitee.com/mlx6_admin/public_resource_lc/raw/master/search.css
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      szlcsc.com
// @license      MIT
// ==/UserScript==
(async function () {
    'use strict';

    const searchCSS = GM_getResourceText("searchCSS")
    GM_addStyle(searchCSS)

    const Util = {
        /**
         * 根据value排序Map
         * @param {*} map
         * @returns
         */
        sortMapByValue: function (map) {
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
        getAjax: function (url) {
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
        postAjaxJSON: function (url, data) {
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
        brandNameProcess: function (text) {
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

        jsonToUrlParam: function (json, ignoreFields = '') {
            return Object.keys(json)
                .filter(key => ignoreFields.indexOf(key) === -1)
                .map(key => key + '=' + encodeURIComponent(json[key])).join('&'); // 使用 encodeURIComponent 避免URL编码问题
        },

        /**
         * POST请求封装
         * @param {*} url
         * @param {*} jsonData
         */
        postFormAjax: function (url, jsonData) {
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
        allWithProgress: function (requests, callback) {
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
        sleep: function (timeout) {
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
        sleepFunc: function (timeout, func) {
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
        getLocalData: function (k) {
            return localStorage.getItem(k);
        },

        /**
         * 设置本地缓存
         * @param {*} key
         * @param {*} value
         */
        setLocalData: function (k, v) {
            localStorage.setItem(k, v);
        },

        /**
         * 获取session缓存
         * @param {*} key
         */
        getSessionData: function (k) {
            return sessionStorage.getItem(k);
        },

        /**
         * 设置session缓存
         * @param {*} key
         * @param {*} value
         */
        setSessionData: function (k, v) {
            sessionStorage.setItem(k, v);
        }
    };

    // ========================================================
    // 基础方法
    const Base = {
        // 优惠券只保存1元购的优惠券信息
        allOneCouponMap: new Map(),
        // 存放新人券的map
        isNewCouponMap: new Map(),
        // 存放非新人券的map
        isNotNewCouponMap: new Map(),
        // 搜索页获取每一行的元素
        getSearchRows: () => {
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

        // 使用私有静态字段保存单例实例
        static instance;

        constructor() {
            // 如果实例已存在，直接返回
            if (SearchPageHelper.instance) {
                return SearchPageHelper.instance;
            }

            // 初始化成员变量
            this.someCouponMapping = {
                "MDD": "辰达半导体",
            };

            // 保存当前实例
            SearchPageHelper.instance = this;
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
                    console.log('allOneCouponMap: ', Base.allOneCouponMap);
                    console.log('isNewCouponMap: ', Base.isNewCouponMap);
                }
            }

            // 处理单个优惠券
            const processItem = (couponItem, referenceMap, someCouponMapping) => {
                // 是否新人券
                const isNew = couponItem.couponName.includes("<新人专享>");
                // 一些优惠券特殊处理
                for (let key in someCouponMapping) {
                    if (couponItem.couponTypeName == key) {
                        const newBrandName = someCouponMapping[key]
                        // 存到变量Map中
                        const newVar = {
                            brandId: couponItem.brandIds,
                            brandNames: couponItem.brandNames,
                            couponName: couponItem.couponName, // 优惠券名称
                            isNew: isNew, // 是否新人专享
                            couponPrice: couponItem.couponAmount, //优惠券金额减免
                            minOrderMoney: couponItem.minOrderMoney, //要求最低金额
                            pay: couponItem.minOrderMoney - couponItem.couponAmount, // 实际支付金额
                            brandName: newBrandName, // 品牌名称
                            couponId: couponItem.uuid, // 优惠券id
                            isHaved: couponItem.isReceive, // 是否已经领取
                            isUsed: couponItem.isUse, // 是否已经使用过
                            brandIndexHref: couponItem.targetUrl, // 对应的品牌主页地址
                            couponLink: `https://www.szlcsc.com/getCoupon/${couponItem.uuid}`, // 领券接口地址
                        };
                        referenceMap.set(newBrandName, newVar);
                        isNew && (Base.isNewCouponMap.set(couponItem.brandNames, newVar));
                        !isNew && (Base.isNotNewCouponMap.set(couponItem.brandNames, newVar));
                    }
                }
                // 存到变量Map中
                const newVar1 = {
                    brandId: couponItem.brandIds,
                    brandNames: couponItem.brandNames,
                    couponName: couponItem.couponName, // 优惠券名称
                    isNew: isNew, // 是否新人专享
                    couponPrice: couponItem.couponAmount, //优惠券金额减免
                    minOrderMoney: couponItem.minOrderMoney, //要求最低金额
                    pay: couponItem.minOrderMoney - couponItem.couponAmount, // 实际支付金额
                    brandName: couponItem.couponTypeName, // 品牌名称
                    couponId: couponItem.uuid, // 优惠券id
                    isHaved: couponItem.isReceive, // 是否已经领取
                    isUsed: couponItem.isUse, // 是否已经使用过
                    brandIndexHref: couponItem.targetUrl, // 对应的品牌主页地址
                    couponLink: `https://www.szlcsc.com/getCoupon/${couponItem.uuid}`, // 领券接口地址
                };
                referenceMap.set(couponItem.couponTypeName, newVar1);
                isNew && (Base.isNewCouponMap.set(couponItem.brandNames, newVar1));
                !isNew && (Base.isNotNewCouponMap.set(couponItem.brandNames, newVar1));
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
            const rows = this.getSearchRows();
            [...rows.find('button:contains("复制")')].forEach(row => {
                const $btn = $(row);
                const specName = $btn.closest('section').find('dl:contains("封装")').find('dd').text();
                if ($btn.length > 0 && $btn.siblings('button:contains("封装精确匹配")').length === 0) {
                    // $btn.before(`<button spec-name="${specName}" select-type="MHC" style="width: 110px;" class='btn_search_manual mr-[10px] flex h-[26px] items-center justify-center rounded-[13px] bg-[#F5F6F9] text-[#333] hover:bg-[#ECEEF0]'>
                    //        <svg style="margin-right: 3px" t="1748570264460" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6531" width="16" height="16"><path d="M949.76 884.3264a88.68864 88.68864 0 0 1-25.64096 62.67904 87.14752 87.14752 0 0 1-123.76576 0.16896l-164.29568-160.87552a382.4128 382.4128 0 0 1-26.43968 12.6208 382.83776 382.83776 0 0 1-300.032 0 383.38048 383.38048 0 0 1-122.48064-83.39968 391.296 391.296 0 0 1 0-550.36928 384.56832 384.56832 0 0 1 627.55328 123.648 391.00416 391.00416 0 0 1-40.704 376.57088l150.32882 156.56448a88.576 88.576 0 0 1 25.47712 62.39232z m-153.6512-444.04736c0-186.33216-150.41536-337.92-335.30368-337.92s-335.32928 151.6032-335.32928 337.92S275.89632 778.24 460.8 778.24s335.3088-151.64928 335.3088-337.96096z m-503.61344 168.90368a240.45568 240.45568 0 0 1 0-337.73568l34.63168 40.07424a183.46496 183.46496 0 0 0 0 257.50528z" fill="#fa6650" p-id="6532"></path></svg>
                    //        封装模糊匹配
                    //        </button>`);
                    $btn.before(`<button spec-name="${specName}" select-type="JQC" style="width: 110px;" class='btn_search_manual mr-[10px] flex h-[26px] items-center justify-center rounded-[13px] bg-[#F5F6F9] text-[#333] hover:bg-[#ECEEF0]'>
                           <svg style="margin-right: 3px" t="1748569569792" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7704" width="16" height="16"><path d="M945.71 946c-18.67 18.67-49.21 18.67-67.88 0L674.18 742.35c-18.67-18.67-18.67-49.21 0-67.88 18.67-18.67 49.21-18.67 67.88 0l203.65 203.65c18.66 18.66 18.66 49.21 0 67.88z" fill="#CDD8F8" p-id="7705"></path><path d="M447.71 832c-51.82 0-102.11-10.16-149.49-30.2-45.73-19.34-86.79-47.02-122.04-82.27-35.25-35.25-62.93-76.31-82.27-122.04-20.04-47.37-30.2-97.67-30.2-149.49s10.16-102.11 30.2-149.49c19.34-45.73 47.02-86.79 82.27-122.04 35.25-35.25 76.31-62.93 122.04-82.27C345.6 74.16 395.89 64 447.71 64S549.82 74.16 597.2 94.2c45.73 19.34 86.79 47.02 122.04 82.27 35.25 33.25 62.93 76.31 82.27 122.04 20.04 47.37 30.2 97.67 30.2 149.49s-10.16 102.11-30.2 149.49c-19.34 45.73-47.02 86.79-82.27 122.04-35.25 35.25-76.31 62.93-122.04 82.27-47.38 20.04-97.67 30.2-149.49 30.2z m0-667.83c-75.81 0-147.09 29.52-200.7 83.13S163.88 372.18 163.88 448s29.52 147.09 83.13 200.7c53.61 53.61 124.88 83.13 200.7 83.13s147.09-29.52 200.7-83.13c53.61-53.61 83.13-124.88 83.13-200.7s-29.52-147.09-83.13-200.7-124.89-83.13-200.7-83.13z" fill="#5C76F9" p-id="7706"></path></svg>
                           封装精确匹配
                           </button>`);
                }
            });

            $('.btn_search_manual').off('click').on('click', function (e) {
                this._clickSpecFunc($(e.currentTarget), $(e.currentTarget).attr('spec-name'), $(e.currentTarget).attr('select-type'));
            }.bind(this));
        }

        /**
         * 获取搜索结果行
         */
        getSearchRows() {
            return Base.getSearchRows();
        }

        /**
         * 封装模糊匹配
         * @param specName
         * @private
         */
        _MHCEachClick(that, specName) {
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
        async _JQCEachClick(that, specName) {
            console.log('Base.getParentRow(that)', Base.getParentRow(that))
            await Util.sleep(200);
            if ($(`.det-screen:contains("封装：") label.fuxuanku-lable[title="${specName}"]`).length > 0) {
                $(`.det-screen:contains("封装：") label.fuxuanku-lable[title="${specName}"]`).click();
            } else {
                if (specName.includes('-')) {
                    this._JQCEachClick(specName.split('-').slice(0, -1).join('-'));
                }
            }
        }

        async _clickSpecFunc(that, specName, selectType) {
            // 封装的筛选条件那一行 展开规格
            $('li:contains("封装"):contains("多选")').find('div:contains("多选")').click();
            switch (selectType) {
                // 模糊查
                case "MHC":
                    this._MHCEachClick(that, specName);
                    break;
                // 精确查
                case "JQC":
                    this._JQCEachClick(that, specName);
                    break;
            }
            // 查找规格对应的选项
            $(`.det-screen:contains("封装：") input[value="确定"]`).click();
        }
    };

    /**
     * 搜索页凑单列表
     */
    class SearchListHelper {
        // 使用私有静态字段保存单例实例
        static instance;
        // 是否已添加右下角的按钮
        static btnStatus = false;
        // 请求状态
        static fetchStatus = false;
        // 分页大小
        static searchPageRealSize = 200;
        // 查询结果暂存
        static listData = [];

        // 初始化默认选中状态
        static defaultTabs = {
            region: '江苏',
            userType: false
        };

        constructor() {
            // 如果实例已存在，直接返回
            if (SearchListHelper.instance) {
                return SearchListHelper.instance;
            }

            // 保存当前实例
            SearchListHelper.instance = this;
        }

        static async start(brandsNameOrSearchText, brandsId, maxCount, stock) {
            SearchListHelper.fetchStatus = false;
            SearchListHelper.listData = await SearchListHelper.getBrandsProducts(brandsNameOrSearchText, brandsId, maxCount, stock);
            console.log(SearchListHelper.listData);
            SearchListHelper.setCouponSign();
            SearchListHelper.renderMinPriceSearch();
        }

        // 设置商品列表的券标记
        static setCouponSign() {
            SearchListHelper.listData.forEach(e => {
                const newCoupon = Base.isNewCouponMap.get(e.lightBrandName);
                const notNewCoupon = Base.isNotNewCouponMap.get(e.lightBrandName);
                newCoupon && (e.isNew = newCoupon.isNew);
                notNewCoupon && (e.isNew = notNewCoupon.isNew);
            })
        }

        // 渲染页面
        renderListItems() {
            const stock = 'js';
            const searchValue = $('#global-seach-input').val();
            SearchListHelper.start(searchValue, null, 200, stock);
        }

        render() {
            if (!this.btnStatus) {
                $('head').prepend(`<style>
.hint-down {
    margin-left: -400px;
    margin-top: -335px;
    width: 800px;
    height: auto
}

@media screen and (max-height: 610px) {
    .hint-down {
        -webkit-transform:scale(.8);
        transform: scale(.8)
    }
}

@media screen and (max-height: 670px) and (min-height:610px) {
    .hint-down {
        -webkit-transform:scale(.9);
        transform: scale(.9)
    }
}

#hint_down {
    left: 41%;
    top: 120px;
    width: 800px;
    height: auto
}

#hint_down #lcedalogo {
    margin: 0 auto;
    width: 94%;
    height: 52px;
    background-color: #e3e9f1;
    border-radius: 8px
}

#hint_down #lcedalogo svg {
    margin-top: 15px;
    margin-left: 30px
}

#hint_down #lcedalogo div {
    font-size: 13px;
    margin-top: -24px;
    margin-left: 185px
}

#hint_down div.lcedaCanvas {
    border: 1px solid #d9d9d9;
    width: 46%;
    height: 366px;
    display: inline-block;
    margin-right: 10px;
    margin-top: 20px
}

#hint_down div.requestDesign {
    text-align: center;
    margin-top: 158px;
    font-size: 16px;
    font-weight: 700
}

#hint_down #schCanvas {
    margin-left: 3%
}

#hint_down div.canvasBorder {
    margin-top: 0;
    width: 366px;
    height: auto
}

#hint_down #userButton {
    background-color: #fa7701;
    font-size: 14px;
    color: #fff;
    font-weight: 700;
    text-align: center;
    margin: 20px auto 0;
    width: 138px;
    height: 27px;
    border-radius: 8px;
    padding-top: 8px;
    cursor: pointer
}

#hint_down #userButton a,#hint_down #userButton a:hover {
    color: #fff
}

#hint_down #rootControl {
    position: absolute;
    bottom: 13%;
    left: 40.5%
}

#hint_down #rootControl2 {
    position: absolute;
    bottom: 13%;
    right: 4%
}

#hint_down #rootControl2 span,#hint_down #rootControl span {
    cursor: pointer
}

#hint_down [layerid="0"]:not([c_para]) {
    stroke: #fff
}

#hint_down [layerid="1"]:not([c_para]) {
    stroke: red;
    fill: red
}

#hint_down [layerid="2"]:not([c_para]) {
    stroke: #00f;
    fill: #00f
}

#hint_down [layerid="3"]:not([c_para]) {
    stroke: #ff0;
    fill: #ff0
}

#hint_down [layerid="4"]:not([c_para]) {
    stroke: olive;
    fill: olive
}

#hint_down [layerid="5"]:not([c_para]) {
    stroke: grey;
    fill: grey
}

#hint_down [layerid="6"]:not([c_para]) {
    stroke: maroon;
    fill: maroon
}

#hint_down [layerid="7"]:not([c_para]) {
    stroke: purple;
    fill: purple
}

#hint_down [layerid="8"]:not([c_para]) {
    stroke: #a0f;
    fill: #a0f
}

#hint_down [layerid="9"]:not([c_para]) {
    stroke: #6464ff;
    fill: #6464ff
}

#hint_down [layerid="10"]:not([c_para]) {
    stroke: #f0f;
    fill: #f0f
}

#hint_down [layerid="11"]:not([c_para]) {
    stroke: #606060;
    fill: #606060
}

#hint_down [layerid="12"]:not([c_para]) {
    stroke: #fff;
    fill: #fff
}

#hint_down [layerid="13"]:not([c_para]),#hint_down [layerid="14"]:not([c_para]),#hint_down [layerid="15"]:not([c_para]),#hint_down [layerid="16"]:not([c_para]),#hint_down [layerid="17"]:not([c_para]),#hint_down [layerid="18"]:not([c_para]),#hint_down [layerid="19"]:not([c_para]),#hint_down [layerid="20"]:not([c_para]) {
    stroke: #fff
}

#hint_down [layerid="21"]:not([c_para]) {
    stroke: maroon;
    fill: maroon
}

#hint_down [layerid="22"]:not([c_para]) {
    stroke: green;
    fill: green
}

#hint_down [layerid="23"]:not([c_para]) {
    stroke: #0f0;
    fill: #0f0
}

#hint_down [layerid="24"]:not([c_para]) {
    stroke: navy;
    fill: navy
}

#hint_down [layerid="43"]:not([c_para]) {
    stroke: #39503f;
    fill: #39503f
}

#hint_down [layerid="44"]:not([c_para]) {
    stroke: #0c715d;
    fill: #0c715d
}

#hint_down [layerid="45"]:not([c_para]) {
    stroke: #5a8a80;
    fill: #5a8a80
}

#hint_down [layerid="46"]:not([c_para]) {
    stroke: #2b937e;
    fill: #2b937e
}

#hint_down [layerid="47"]:not([c_para]) {
    stroke: #23999d;
    fill: #23999d
}

#hint_down [layerid="48"]:not([c_para]) {
    stroke: #45b4e3;
    fill: #45b4e3
}

#hint_down [layerid="49"]:not([c_para]) {
    stroke: #215da1;
    fill: #215da1
}

#hint_down [layerid="50"]:not([c_para]) {
    stroke: #4564d7;
    fill: #4564d7
}

#hint_down [layerid="51"]:not([c_para]) {
    stroke: #6969e9;
    fill: #6969e9
}

#hint_down [layerid="52"]:not([c_para]) {
    stroke: #9069e9;
    fill: #9069e9
}

#hint_down [fill=none] {
    fill: none
}

#hint_down [stroke=none] {
    stroke: none
}

#hint_down #g12 line,#hint_down #g12 path,#hint_down #g12 polygon,#hint_down #g12 polyline {
    stroke-linecap: round
}

#hint_down [fill=none]:not([c_para]) {
    fill: none
}

#hint_down [stroke=none]:not([c_para]) {
    stroke: none
}

#hint_down #g12 g[c_partid=part_pad] {
    display: initial
}

#hint_down #g12 line[c_shapetype=line] {
    stroke-width: 1
}

#hint_down #gCurParts g[c_partid=part_hole]>*+circle,#hint_down #gCurParts g[c_partid=part_pad]>*+circle,#hint_down #gCurParts g[c_partid=part_via]>*+circle:nth-of-type(2),#hint_down #root2 #g12 g[c_partid=part_hole]>*+circle,#hint_down #root2 #g12 g[c_partid=part_pad]>*+circle,#hint_down #root2 #g12 g[c_partid=part_via]>*+circle:nth-of-type(2) {
    fill: #222
}

#hint_down #gCurParts g[c_partid=part_pad]>polyline:last-of-type,#hint_down #gCurParts g[c_partid=part_pad]>polyline:nth-of-type(2),#hint_down #root2 #g12 g[c_partid=part_pad]>polyline:nth-of-type(2),#hint_down #root2 #g12 g[c_partid=part_pad][c_shape=ELLIPSE]>polyline:last-of-type,#hint_down #root2 #g12 g[c_partid=part_pad][c_shape=RECT]>polyline:last-of-type {
    stroke: #000
}

#hint_down #root2 g[c_partid=part_pad][layerid="1"] ellipse:not([c_padid]),#hint_down #root2 g[c_partid=part_pad][layerid="1"] polygon:not([c_padid]) {
    fill: red
}

#hint_down #root2 g[c_partid=part_pad][layerid="1"] polyline:not([c_padid]) {
    stroke: red
}

#hint_down #root2 g[c_partid=part_pad][layerid="1"] circle {
    fill: red
}

#hint_down #root2 g[c_partid=part_pad][layerid="2"] ellipse:not([c_padid]),#hint_down #root2 g[c_partid=part_pad][layerid="2"] polygon:not([c_padid]) {
    fill: #00f
}

#hint_down #root2 g[c_partid=part_pad][layerid="2"] polyline:not([c_padid]) {
    stroke: #00f
}

#hint_down #root2 g[c_partid=part_pad][layerid="2"] circle {
    fill: #00f
}

#hint_down #root2 g[c_partid=part_pad][layerid="11"] ellipse:not([c_padid]),#hint_down #root2 g[c_partid=part_pad][layerid="11"] polygon:not([c_padid]) {
    fill: silver
}

#hint_down #root2 g[c_partid=part_pad][layerid="11"] polyline:not([c_padid]) {
    stroke: silver
}

#hint_down #root2 g[c_partid=part_pad][layerid="11"] circle {
    fill: silver
}

#hint_down #root2 g[c_partid=part_pad][layerid]>circle[c_padhole] {
    fill: #000
}

#hint_down #root2 g[c_partid=part_pad][layerid]>polyline[c_padhole] {
    stroke: #000
}

#hint_down #root2 g[c_partid=part_via][layerid]>*+circle {
    fill: #000
}

#hint_down #root2 g[c_partid=part_pad]>polygon[c_padid] {
    stroke-linejoin: miter;
    stroke-miterlimit: 100
}

#hint_down #root2 g[c_partid=part_hole]>circle {
    fill: silver
}

#hint_down path,#hint_down polygon,#hint_down polyline {
    stroke-linejoin: round
}

#hint_down #g12 circle,#hint_down #g12 ellipse,#hint_down #g12 line,#hint_down #g12 path,#hint_down #g12 polygon,#hint_down #g12 polyline {
    shape-rendering: crispEdges
}

#hint_down #g12 [stroke-width="1"],#hint_down .px1 {
    stroke-width: 1
}

#hint_down #rootControl .control {
    font-size: 20px;
    color: #239be4
}

#hint_down #rootControl2 .control {
    font-size: 19px;
    color: #fff
}

#hint_down div {
    -webkit-user-select: none;
    user-select: none
}

#hint_down #g12 .active:not([fill]),#hint_down #g12 .active :not([fill]),#hint_down #g12 .hover:not([fill]),#hint_down #g12 .hover :not([fill]),#hint_down #g12 .selected:not([fill]),#hint_down #g12 .selected :not([fill]) {
    fill: #223;
    fill-opacity: .6
}

#hint_down #g12 .active:not([stroke]),#hint_down #g12 .active :not([stroke]),#hint_down #g12 .hover:not([stroke]),#hint_down #g12 .hover :not([stroke]),#hint_down #g12 .selected:not([stroke]),#hint_down #g12 .selected :not([stroke]) {
    stroke: #fff;
    stroke-opacity: .6
}

#hint_down #g12 g[c_partid=part_pad].active>:not([fill]),#hint_down #g12 g[c_partid=part_pad]:hover>:not([fill]) {
    fill: #222
}

#hint_down #g12 g[c_partid=part_pad].active>:not([stroke]),#hint_down #g12 g[c_partid=part_pad]:hover>:not([stroke]) {
    stroke: #333
}

#hint_down #g12 g[c_partid=part_via].active>:not([fill]),#hint_down #g12 g[c_partid=part_via]:hover>:not([fill]) {
    fill: #111;
    fill-opacity: 1
}

#hint_down #g12 path[attachedcopperid] {
    pointer-events: none
}

#hint_down .hover text,#hint_down .hover tspan,#hint_down text.hover,#hint_down tspan.hover {
    stroke: none;
    fill: #fff
}

#hint_down #root2 g[c_partid=part_pad]:hover[layerid="1"] polyline:not([c_padid]) {
    stroke: #fff
}

#hint_down #root2 g[c_partid=part_pad]:hover[layerid="1"] ellipse:not([c_padid]),#hint_down #root2 g[c_partid=part_pad]:hover[layerid="1"] polygon:not([c_padid]) {
    fill: #fff
}

#hint_down #root2 .active ellipse,#hint_down #root2 .active polyline:not([c_padid]),#hint_down #root2 g[c_partid=part_hole]:hover ellipse {
    stroke: #fff
}

#hint_down #root path,#hint_down #root polygon,#hint_down #root polyline {
    stroke-linejoin: round;
    stroke-linecap: round
}

#hint_down #root circle,#hint_down #root ellipse,#hint_down #root line,#hint_down #root path,#hint_down #root polygon,#hint_down #root polyline,#hint_down #root rect {
    shape-rendering: initial;
    stroke-linecap: round
}

#hint_down #g1 circle.pindot {
    fill: none;
    stroke-opacity: .5;
    stroke-width: .3;
    stroke: #333;
    shape-rendering: auto
}

#hint_down #gNets>text,#hint_down #gNetsTextRuler {
    text-anchor: middle;
    font-family: Consolas,Courier,Monospace
}

#hint_down #gNets>text:not([fill]) {
    fill: #fff
}

#hint_down #gNets>text:not(stroke) {
    stroke: #000
}

#hint_down #export_altium {
    right: 232px
}

#hint_down #reportError,#hint_down .link-btn {
    color: #0093e6;
    position: absolute;
    right: 22px;
    bottom: 25px
}

#hint_down #user-info {
    position: absolute;
    left: 22px;
    bottom: 28px
}

#hint_down #user-info a {
    color: #0093e6
}

@font-face {
    font-family: icomoon;
    src: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/font/icomoon.d339e13b.eot);
    src: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/font/icomoon.d339e13b.eot#iefix) format("embedded-opentype"),url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/font/icomoon.507fcf04.ttf) format("truetype"),url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/font/icomoon.cb1eba5a.woff) format("woff"),url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icomoon.e101fbf6.svg#icomoon) format("svg");
    font-weight: 400;
    font-style: normal
}

[class*=" icon-"],[class^=icon-] {
    font-family: icomoon!important;
    speak: none;
    font-style: normal;
    font-weight: 400;
    font-variant: normal;
    text-transform: none;
    line-height: 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale
}

.icon-goal:before,.icon-location:before,.icon-target:before {
    content: "\\e900"
}

.icon-refresh:before {
    content: "\\e901"
}

.icon-minus-square:before {
    content: "\\e902"
}

.icon-minus-circle:before {
    content: "\\e903"
}

.icon-plus-square:before {
    content: "\\e904"
}

.icon-plus-circle:before {
    content: "\\e905"
}

.icon-my_location:before {
    content: "\\e906"
}

#website-ad-dialog {
    position: fixed;
    z-index: 100000;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0
}

#website-ad-dialog .dialog-container-wrap {
    position: relative
}

#website-ad-dialog .dialog-container-wrap .content {
    position: absolute;
    top: 50%;
    left: 50%;
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);
    min-width: 200px;
    min-height: 120px;
    height: calc(100% - 280px);
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center
}

#website-ad-dialog .dialog-container-wrap .content #ad-link {
    position: relative;
    cursor: pointer;
    height: -webkit-fit-content;
    height: fit-content;
    display: block
}

#website-ad-dialog .dialog-container-wrap .content #ad-link .close-box {
    position: absolute;
    width: 72px;
    height: 72px;
    top: -72px;
    right: -72px
}

#website-ad-dialog .dialog-container-wrap .content #ad-link .close {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 36px;
    height: 36px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/dialog-close-icon3.afa60a90.svg) no-repeat;
    background-size: 36px;
    cursor: pointer
}

#website-ad-dialog .dialog-container-wrap .content #ad-link>img {
    max-height: 100%;
    max-width: 100%
}

#website-group-dialog {
    position: fixed;
    z-index: 100000;
    top: 160px;
    bottom: 0;
    left: 0;
    right: 0
}

#website-group-dialog .dialog-container-wrap-group {
    position: relative
}

#website-group-dialog .dialog-container-wrap-group .content {
    position: absolute;
    top: 50%;
    left: 50%;
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);
    min-width: 200px;
    min-height: 120px;
    height: calc(100% - 280px);
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link {
    position: relative;
    cursor: pointer;
    height: -webkit-fit-content;
    height: fit-content;
    display: block
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .top {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/top.533b2e30.png) no-repeat;
    width: 444px;
    height: 224px;
    background-size: 100% 100%;
    position: relative
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .line {
    position: absolute;
    top: 52%;
    left: 8%;
    width: 370px;
    height: 22px;
    background: #bf0909;
    box-shadow: inset 0 0 1px 1px #a40000,inset 0 0 1px 0 #fff;
    border-radius: 15px
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card {
    position: absolute;
    width: 350px;
    top: 57%;
    left: 10.3%;
    background: -webkit-linear-gradient(273deg,#fe795a,#ff4753);
    background: linear-gradient(177deg,#fe795a,#ff4753);
    border-radius: 0 0 1px 1px;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    -webkit-flex-wrap: wrap;
    flex-wrap: wrap
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .card-top {
    width: 100%;
    height: 8px;
    background: -webkit-linear-gradient(top,#a50505,rgba(185,15,15,.48) 48%,rgba(191,9,9,0));
    background: linear-gradient(180deg,#a50505,rgba(185,15,15,.48) 48%,rgba(191,9,9,0))
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list {
    width: 300px;
    height: 70px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/card.29be1e6c.png) no-repeat;
    background-size: 100% 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list .list-left {
    text-align: center;
    width: 30%
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list .list-left .price {
    font-weight: 700;
    color: #ff5d56;
    font-size: 24px
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list .list-left .unit {
    color: #ff5d56;
    font-size: 14px
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list .list-right {
    width: 70%
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list .list-right .coupon-title {
    font-weight: 700;
    color: #444;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list .list-right .coupon-limit,#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list .list-right .coupon-time {
    font-weight: 700;
    color: #666;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list2 {
    width: 300px;
    height: 70px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/card2.8dd1fea3.png) no-repeat;
    background-size: 100% 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list2 .list-left {
    text-align: center;
    width: 30%
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list2 .list-left .price {
    font-weight: 700;
    color: #ff5d56;
    font-size: 24px
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list2 .list-left .unit {
    color: #ff5d56;
    font-size: 14px
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list2 .list-right {
    width: 70%
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list2 .list-right .coupon-title {
    font-weight: 700;
    color: #444;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list2 .list-right .coupon-limit,#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .list2 .list-right .coupon-time {
    font-weight: 700;
    color: #666;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .card .website-group-dialog-btn {
    width: 190px;
    height: 50px;
    background: #ff8c25;
    border-radius: 30px;
    color: #fff;
    line-height: 50px;
    font-size: 18px;
    margin: 40px 0 30px;
    font-family: MicrosoftYaHei-Bold,MicrosoftYaHei;
    font-weight: 700
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .close-box {
    position: absolute;
    width: 72px;
    height: 72px;
    top: -72px;
    right: -72px
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link .website-group-dialog-close {
    position: absolute;
    top: 153px;
    left: -35px;
    right: 0;
    width: 20px;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/dialog-close-icon3.afa60a90.svg) no-repeat;
    background-size: 20px;
    cursor: pointer
}

#website-group-dialog .dialog-container-wrap-group .content #ad-link>img {
    max-height: 100%;
    max-width: 100%
}

#website-right-float-ad-dialog {
    position: fixed;
    bottom: 410px;
    right: 80px;
    z-index: 999
}

#website-right-float-ad-dialog .website-right-float-ad {
    position: relative;
    display: inline-block
}

#website-right-float-ad-dialog .website-right-float-ad img {
    width: 188px;
    height: 157px
}

#website-right-float-ad-dialog .website-right-float-ad .website-right-float-ad-close {
    position: absolute;
    right: 0;
    width: 26px;
    height: 26px;
    z-index: 1000
}

html {
    visibility: visible;
    opacity: 1
}

body,button,dd,dl,dt,form,h1,h2,h3,h4,h5,h6,html,input,li,ol,p,select,td,textarea,th,ul {
    margin: 0;
    padding: 0;
    font-family: Microsoft YaHei,微软雅黑,Arail
}

body {
    background: #fff;
    font: 12px/18px Microsoft YaHei,微软雅黑,Arail;
    color: #444;
    min-width: 1200px
}

img {
    border: 0;
    vertical-align: top
}

li,ul {
    list-style-type: none
}

a {
    color: #444;
    cursor: pointer
}

a:hover {
    color: #0093e6
}

button,input,select,textarea {
    color: #444
}

input[type=text],textarea {
    border: 1px solid #dedede;
    padding: 0 5px
}

select {
    border: 1px solid #dedede
}

input[type=text] {
    height: 26px;
    line-height: 26px
}

button,input[type=button] {
    cursor: pointer;
    outline: none
}

::-webkit-input-placeholder {
    color: #ccc;
    font-size: 12px
}

:-moz-placeholder {
    color: #ccc;
    font-size: 12px
}

:-ms-input-placeholder {
    color: #ccc;
    font-size: 12px
}

.common-button-style {
    padding: 8px 28px;
    color: #fff;
    background: #0093e6;
    border: none;
    border-radius: 3px;
    cursor: pointer
}

.overflow-ellipsis {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical
}

.common-hover-tooltip-box {
    position: relative;
    cursor: pointer
}

.common-hover-tooltip-box .icon_tip:hover,.common-hover-tooltip-box .icon_tip_narrow:hover,.common-hover-tooltip-box:hover .icon_tip,.common-hover-tooltip-box:hover .icon_tip_narrow {
    display: block
}

.common-hover-tooltip-box .icon_tip {
    display: none;
    position: absolute;
    top: -135px;
    left: 23px;
    z-index: 3;
    padding: 6px 10px;
    color: #666;
    text-align: left;
    font-size: 12px;
    background-color: #fff;
    border: 1px solid #cecbce;
    box-sizing: border-box;
    width: -webkit-max-content;
    width: max-content;
    border-radius: 2px;
    line-height: 20px
}

.common-hover-tooltip-box .icon_tip_narrow {
    display: none;
    position: absolute;
    left: 18px;
    top: 0;
    z-index: 4;
    width: 6px;
    height: 9px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAJCAYAAAARml2dAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjAyOENFOUIwOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjAyOENFOUIxOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDI4Q0U5QUU5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDI4Q0U5QUY5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6wJC0SAAAARUlEQVR42mI4d/ocw////+EYyP8PAkwMSOD8mfP/DU0MwWwmbIJwCXRBmASGIEyCEagDqwQDUAeGJNxydEkU5yJLAgQYACcBK9GRst39AAAAAElFTkSuQmCC) no-repeat
}

.common-hover-tooltip-box .icon_tip_down {
    -webkit-transform: rotate(-90deg);
    transform: rotate(-90deg)
}

.common-hover-tooltip-box .icon_tip_up {
    -webkit-transform: rotate(90deg);
    transform: rotate(90deg)
}

.common-hover-tooltip-box .icon_tip_right {
    -webkit-transform: rotate(180deg);
    transform: rotate(180deg)
}

.main-container {
    box-sizing: border-box;
    width: 100%;
    overflow: hidden
}

.content-container {
    margin: 0 auto;
    width: 1200px
}

.position-r,.relative {
    position: relative
}

.display-none {
    display: none
}

.display-inline-block,.inline-block {
    display: inline-block
}

.fr,.right {
    float: right!important
}

.fl,.left {
    float: left!important
}

.clear {
    clear: both;
    width: 0;
    height: 0;
    line-height: 0;
    font-size: 0;
    overflow: hidden
}

.clear-fix:after {
    content: ".";
    display: block;
    height: 0;
    clear: both;
    visibility: hidden
}

.vertical-align-mid {
    vertical-align: middle
}

.line-h24 {
    line-height: 24px
}

.line-h45 {
    line-height: 45px
}

.line-h30 {
    line-height: 30px
}

.line-h35 {
    line-height: 35px
}

.txt-center {
    text-align: center
}

.txt-right {
    text-align: right
}

.txt-indent15 {
    text-indent: 15px
}

.txt-indent10 {
    text-indent: 10px
}

.txt-indent20 {
    text-indent: 20px
}

.txt-indent25 {
    text-indent: 25px
}

.text-align-left {
    text-align: left
}

.text-align-center {
    text-align: center!important
}

.mt16 {
    margin-top: 16px
}

.mt6 {
    margin-top: 6px
}

.mb7 {
    margin-bottom: 7px
}

.ml90 {
    margin-left: 90px
}

.ml30 {
    margin-left: 30px!important
}

.mr17 {
    margin-left: 17px!important
}

.ml16 {
    margin-left: 16px!important
}

.ml110 {
    margin-left: 110px
}

.ml120 {
    margin-left: 120px
}

.ml60 {
    margin-left: 60px
}

.ml50 {
    margin-left: 50px
}

.ml5 {
    margin-left: 5px
}

.ml45 {
    margin-left: 45px
}

.ml255 {
    margin-left: 255px
}

.ml22 {
    margin-left: 22px!important
}

.mt8 {
    margin-top: 8px
}

.mt15 {
    margin-top: 15px
}

.mt10 {
    margin-top: 10px
}

.mt4 {
    margin-top: 4px
}

.mt5 {
    margin-top: 5px
}

.mt20 {
    margin-top: 20px!important
}

.mt22 {
    margin-top: 22px
}

.mt30 {
    margin-top: 30px
}

.mt50 {
    margin-top: 50px
}

.mtn10 {
    margin-top: -10px
}

.mr8 {
    margin-right: 8px
}

.ml3 {
    margin-left: 3px
}

.ml10 {
    margin-left: 10px!important
}

.ml7 {
    margin-left: 7px
}

.ml18 {
    margin-left: 18px
}

.ml35 {
    margin-left: 35px
}

.ml40 {
    margin-left: 40px
}

.ml20 {
    margin-left: 20px
}

.mb10 {
    margin-bottom: 10px
}

.mb20 {
    margin-bottom: 20px
}

.ml15 {
    margin-left: 15px
}

.mr5 {
    margin-right: 5px
}

.mr15 {
    margin-right: 15px
}

.mr3 {
    margin-right: 3px
}

.mr10 {
    margin-right: 10px!important
}

.mr18 {
    margin-right: 18px
}

.mr20 {
    margin-right: 20px
}

.pt5 {
    padding-top: 5px
}

.pl10 {
    padding-left: 10px
}

.pl20 {
    padding-left: 20px
}

.pl15 {
    padding-left: 15px
}

.pl22 {
    padding-left: 22px
}

.pl25 {
    padding-left: 25px
}

.pl55 {
    padding-left: 55px
}

.pl60 {
    padding-left: 60px
}

.pl5 {
    padding-left: 5px
}

.pl45 {
    padding-left: 45px
}

.pl97 {
    padding-left: 97px
}

.pt15 {
    padding-top: 15px
}

.pt10 {
    padding-top: 10px
}

.pt25 {
    padding-top: 25px
}

.pb5 {
    padding-bottom: 5px
}

.pb10 {
    padding-bottom: 10px
}

.pb20 {
    padding-bottom: 20px
}

.pr5 {
    padding-right: 5px
}

.pr30 {
    padding-right: 30px
}

.pr25 {
    padding-right: 25px
}

.w510 {
    width: 510px
}

.w70 {
    width: 70px!important
}

.w220 {
    width: 220px!important
}

.w570 {
    width: 570px
}

.w580 {
    width: 580px
}

.w500 {
    width: 500px
}

.w450 {
    width: 450px
}

.w-percent-100 {
    width: 100%
}

.w340 {
    width: 340px
}

.w360 {
    width: 360px
}

.percent40 {
    width: 40%!important
}

.percent20 {
    width: 20%!important
}

.percent10 {
    width: 10%!important
}

.percent30 {
    width: 30%!important
}

.percent100 {
    width: 100%!important
}

.percent8 {
    width: 8%!important
}

.percent14 {
    width: 14%
}

.percent34 {
    width: 34%
}

.percent16 {
    width: 16%
}

.percent22 {
    width: 22%
}

.percent11 {
    width: 11%
}

.percent24 {
    width: 24%!important
}

.percent28 {
    width: 28%!important
}

.percent32 {
    width: 32%!important
}

.w150 {
    width: 150px
}

.w310 {
    width: 310px
}

.w680 {
    width: 680px
}

.w370 {
    width: 370px
}

.w190 {
    width: 190px!important
}

.w200 {
    width: 200px
}

.w530 {
    width: 530px
}

.w225 {
    width: 225px
}

.w240 {
    width: 240px
}

.w180 {
    width: 180px
}

.w400 {
    width: 400px
}

.w410 {
    width: 410px
}

.w440 {
    width: 440px
}

.w350 {
    width: 350px
}

.w415 {
    width: 415px
}

.w545 {
    width: 545px
}

.w940 {
    width: 940px
}

.w155 {
    width: 155px
}

.w120 {
    width: 120px
}

.w160 {
    width: 160px
}

.w170 {
    width: 170px
}

.w260 {
    width: 260px
}

.w300 {
    width: 300px
}

.w90 {
    width: 90px
}

.w80 {
    width: 80px!important
}

.w105 {
    width: 105px!important
}

.w110 {
    width: 110px
}

.w130 {
    width: 130px!important
}

.w140 {
    width: 140px
}

.w72 {
    width: 72px
}

.w335 {
    width: 335px
}

.w75 {
    width: 75px
}

.w100 {
    width: 100px
}

.w82 {
    width: 82px
}

.w50 {
    width: 50px
}

.w102 {
    width: 102px
}

.w65 {
    width: 65px
}

.w85 {
    width: 85px
}

.input-h25 {
    height: 25px
}

.h26 {
    height: 26px
}

.h155 {
    height: 155px
}

.h190 {
    height: 190px
}

.h180 {
    height: 180px
}

.h420 {
    height: 420px
}

.h300 {
    height: 300px
}

.h565 {
    height: 565px
}

.h22 {
    height: 22px
}

.h170 {
    height: 170px
}

.pointer {
    cursor: pointer
}

.line-through {
    text-decoration: line-through
}

.fw-b,.fwb {
    font-weight: 700
}

.fw-n {
    font-weight: 400
}

.visibility-hidden {
    visibility: hidden
}

.border-right-none {
    border-right: none
}

.ellipsis {
    text-overflow: ellipsis;
    word-break: break-all;
    white-space: nowrap;
    overflow: hidden
}

.btn {
    text-align: center;
    color: #fff;
    line-height: 32px
}

.opacity-none {
    -ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=0)";
    filter: alpha(opacity=0);
    -moz-opacity: 0;
    -khtml-opacity: 0;
    opacity: 0
}

.decoration-none {
    text-decoration: none!important
}

.f16 {
    font-size: 16px
}

.border-top-e5 {
    border-top: 1px solid #e5e5e5
}

.cursor-pointer {
    cursor: pointer
}

.cursor-not-allowed {
    cursor: not-allowed
}

.font-bold {
    font-weight: 700
}

.fs14 {
    font-size: 14px
}

.fs16 {
    font-size: 16px
}

.fs12 {
    font-size: 12px!important
}

.fs25 {
    font-size: 25px
}

.table-max-h {
    overflow: auto
}

.valid-form {
    margin-left: 1px;
    color: red
}

.valid-form span.error {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -218px -315px
}

.valid-form span.error,.valid-form span.success {
    width: 18px;
    height: 18px;
    display: inline-block;
    vertical-align: middle
}

.valid-form span.success {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -310px -313px
}

.valid-form-error,.valid-form-success {
    display: none
}

div.required-tip {
    margin-top: 5px
}

.error-required-tip {
    color: red
}

div.required-tip:before {
    margin: 0 3px
}

.required-tip:before {
    content: "";
    display: inline-block;
    margin: 0 3px 0 5px;
    width: 18px;
    height: 16px;
    vertical-align: -4px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png)
}

.error-required-tip:before {
    background-position: -552px -315px
}

.success-required-tip:before {
    margin-top: -2px;
    background-position: -310px -314px
}

.valid-error {
    position: absolute;
    left: 348px;
    top: 4px
}

.valid-error span {
    display: inline-block;
    width: 16px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -218px -315px
}

.pop-box {
    display: none;
    padding: 15px;
    position: absolute;
    z-index: 1;
    border: 1px solid #cecbce;
    background: #fff;
    box-shadow: 0 0 1px 2px #eee
}

.pop-box .icon {
    position: absolute;
    top: -9px;
    left: 20px;
    width: 11px;
    height: 10px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -255px -441px
}

.icon-exclamation {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat 0 -315px
}

.icon-exclamation,.icon-question-mark {
    display: inline-block;
    width: 16px;
    height: 16px;
    vertical-align: text-bottom
}

.icon-question-mark {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/cart_icon.b1026903.png) no-repeat -353px -282px
}

.common-fail-tip,.common-success-tip {
    display: none;
    position: fixed;
    z-index: 100001;
    top: 150px;
    left: 50%;
    margin-left: -100px;
    padding-right: 10px;
    width: auto;
    min-width: 120px;
    height: 40px;
    background: #fff;
    box-shadow: 1px 3px 9px #ddd
}

.common-fail-tip .icon,.common-success-tip .icon {
    margin-right: 5px;
    display: inline-block;
    vertical-align: middle;
    height: 100%;
    width: 40px
}

.common-fail-tip .icon {
    background: #ff7800 url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/pay_icon.4dd25ecd.png) no-repeat -30px -15px
}

.common-success-tip .icon {
    background: #7fbe25 url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/pay_icon.4dd25ecd.png) no-repeat -30px -15px
}

.common-modal {
    display: none;
    position: fixed;
    left: 50%;
    top: 50%;
    z-index: 100000;
    padding: 0 0 20px;
    width: 660px;
    background: #fff;
    border: 4px solid #d9d9d9
}

.common-modal .modal-title {
    position: relative;
    height: 34px;
    line-height: 32px;
    text-indent: 15px;
    background: #f2f2f2;
    border-bottom: 1px solid #dedede;
    color: #444
}

.common-modal .modal-title .left {
    float: left;
    font-size: 14px
}

.common-modal .modal-title .right {
    float: right;
    margin-top: 10px;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -286px -317px;
    padding: 2px 10px;
    cursor: pointer
}

.common-modal .modal-content {
    padding: 20px 15px 12px;
    overflow: visible!important
}

.member-nav {
    margin: 0 auto;
    padding-top: 16px;
    width: 1200px
}

.member-nav,.member-nav a {
    font-size: 14px
}

.pagination {
    margin: 10px auto 0;
    padding-bottom: 15px;
    height: 30px;
    line-height: 30px;
    text-align: right
}

.pagination li {
    display: inline
}

.pagination .pagination-info {
    float: left;
    margin-top: 5px;
    padding-right: 20px;
    line-height: 22px;
    font-size: 12px
}

.pagination .pagination-info-total {
    color: #ff7900
}

.pagination .pagination-click {
    padding: 2px 5px;
    border: 1px solid #999
}

.pagination .pagination-click a {
    color: #666
}

.pagination .pagination-click a.active,.pagination .pagination-click a:hover {
    color: #0093e6;
    text-decoration: none
}

.pagination .pagination-click-more {
    border: none
}

.address-popup {
    display: none;
    top: 30px;
    left: 176px;
    position: absolute;
    background: #fff;
    padding: 10px;
    z-index: 99999;
    width: 442px;
    line-height: 1;
    border: 1px solid #ccc;
    font-size: 12px
}

.address-popup .address-head {
    position: relative
}

.address-popup .address-head .address-popup-ul {
    border-bottom: 2px solid #ffb786;
    height: 30px
}

.address-popup .address-head .address-popup-ul .address-popup-li {
    cursor: pointer;
    text-align: center;
    float: left;
    border: 1px solid #ccc;
    border-bottom: none;
    margin-left: 6px;
    margin-bottom: 0!important;
    padding-left: 0;
    width: 82px;
    height: 28px!important;
    line-height: 30px!important;
    color: #999
}

.address-popup .address-head .address-popup-ul .address-popup-li span {
    width: 9px;
    height: 5px;
    display: inline-block;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -203px -443px;
    margin-left: 12px
}

.address-popup .address-head .address-popup-ul .address-popup-li b {
    font-weight: 400
}

.address-popup .address-head .address-popup-ul .address-popup-li.active {
    border: 2px solid #ffb786;
    border-bottom-color: #fff;
    color: inherit
}

.address-popup .address-head .address-popup-ul .address-popup-li.active span {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -179px -443px
}

.address-popup .address-head a {
    position: absolute;
    top: 0;
    right: 0;
    cursor: pointer;
    display: block;
    float: right;
    width: 14px;
    height: 14px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -286px -317px
}

.address-popup .area-list {
    margin-top: 10px
}

.address-popup .area-list span {
    display: inline-block;
    padding: 0 6px;
    line-height: 24px!important;
    cursor: pointer
}

.address-popup .area-list span.active {
    color: #fff;
    background: #ff7900
}

.address-popup .area-item {
    float: left;
    width: 108px
}

.collect-goods-success-modal {
    width: 492px;
    margin-left: -246px;
    margin-top: -140px
}

.collect-goods-success-modal .add-goods-success-icon {
    width: 50px;
    height: 50px;
    display: inline-block;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/pay_icon.4dd25ecd.png);
    background-position-x: 0;
    background-position-y: 247px
}

.collect-goods-success-modal .add-goods-success-left {
    width: 20%;
    margin-right: 20px;
    display: inline-block;
    vertical-align: top;
    text-align: right
}

.collect-goods-success-modal .add-goods-success-right {
    display: inline-block
}

.collect-goods-success-modal .add-goods-success-message {
    margin-top: 5px;
    font-size: 16px;
    color: #71c000;
    font-weight: 700
}

.collect-goods-success-modal .check-collection-goods {
    margin-top: 8px;
    margin-bottom: 15px;
    font-size: 14px
}

.collect-goods-success-modal .blue-btn {
    width: 92px;
    height: 33px;
    border: none;
    border-radius: 2px;
    background: #0093e6;
    color: #fff
}

.img-show {
    width: 340px;
    position: absolute;
    z-index: 999999
}

.img-show .img-show1 {
    float: left;
    height: 366px;
    width: 15px;
    position: relative
}

.img-show .img-show1 b {
    width: 6px;
    height: 9px;
    float: right;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAJCAYAAAARml2dAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjAyOENFOUIwOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjAyOENFOUIxOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDI4Q0U5QUU5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDI4Q0U5QUY5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6wJC0SAAAARUlEQVR42mI4d/ocw////+EYyP8PAkwMSOD8mfP/DU0MwWwmbIJwCXRBmASGIEyCEagDqwQDUAeGJNxydEkU5yJLAgQYACcBK9GRst39AAAAAElFTkSuQmCC) no-repeat;
    margin-top: 165px
}

.img-show .img-show2 {
    float: left;
    background: #fff;
    width: 318px;
    border: 1px solid #cecbce;
    text-align: center;
    padding-top: 10px;
    margin-left: -1px;
    box-shadow: 0 0 1px 2px #eee
}

.img-show .img-show2 span {
    word-wrap: break-word
}

.img-show .img-show2 span img {
    width: 300px;
    height: 300px
}

.img-show .img-show2 .font {
    width: 300px;
    float: left;
    text-align: center;
    font-size: 12px;
    padding: 5px 0 8px;
    color: #9a9a9a
}

.img-show .show-switch {
    padding: 8px 8px 5px 9px
}

.img-show .show-switch a:hover {
    background-position-y: -550px
}

.img-show .img-left {
    width: 14px;
    height: 28px;
    float: left;
    margin-top: 8px
}

.img-show .img-left a {
    width: 14px;
    height: 28px;
    float: left;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/index_icon.1b6a881a.png) no-repeat -126px -503px
}

.img-show .img-cont {
    width: 265px;
    float: left;
    text-align: center
}

.img-show .img-cont img {
    margin-left: 3px;
    margin-right: 3px;
    cursor: pointer;
    vertical-align: middle
}

.img-show .img-chc {
    height: 40px;
    width: 40px;
    border: 1px solid #a9a9a9
}

.img-show .img-cls {
    height: 38px;
    width: 38px;
    border: 2px solid #0093e6
}

.img-show .img-right {
    width: 14px;
    height: 28px;
    float: left;
    margin-top: 8px
}

.img-show .img-right a {
    width: 14px;
    height: 28px;
    float: left;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/index_icon.1b6a881a.png) no-repeat -163px -503px
}

.hint-down {
    display: none;
    position: fixed;
    left: 50%;
    top: 50%;
    z-index: 100000;
    padding: 0 0 20px;
    background: #fff;
    border: 4px solid #d9d9d9;
    height: auto!important
}

.hint-down .down-tit {
    position: relative;
    height: 34px;
    line-height: 32px;
    text-indent: 15px;
    background: #f2f2f2;
    border-bottom: 1px solid #dedede;
    color: #444;
    font-size: 14px;
    font-weight: 700
}

.hint-down .down-tit a {
    position: absolute;
    top: 10px;
    right: 0;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -286px -317px;
    padding: 2px 10px;
    cursor: pointer
}

.hint-down .down-cont {
    padding: 20px 15px 12px
}

.hint-down .down-cont li {
    height: 30px;
    line-height: 30px
}

.hint-down .down-cont li a.down-pdf {
    float: right;
    height: 30px;
    box-sizing: border-box;
    padding: 0 5px;
    background: #f2f2f2;
    border: 1px solid #ccc;
    border-radius: 3px
}

.hint-down .down-cont li i {
    position: relative;
    top: 2px;
    width: 22px;
    height: 20px;
    display: inline-block;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png);
    background-position-x: -20px;
    background-position-y: 162px
}

.hint-down .down-cont li>span {
    display: inline-block;
    width: 110px;
    text-align: right;
    color: #999
}

.hint-down .down-cont li>span.noFile {
    text-align: left
}

.hint-down .down-cont a.ellipsis {
    display: inline-block;
    width: 300px;
    vertical-align: top
}

.wrap-library {
    border: 3px solid #7c7c7c;
    width: 380px;
    padding: 3px 8px 10px 12px;
    height: 120px;
    background: #fff;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-left: -190px;
    margin-top: -60px;
    z-index: 2223000;
    display: none
}

.wrap-library a {
    width: 14px;
    height: 12px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/hint_popup.b1bc00e6.png) no-repeat -52px -676px;
    float: right
}

.wrap-library p {
    float: left;
    font-size: 14px;
    padding-top: 8px
}

.wrap-library input {
    width: 115px;
    height: 28px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/hint_popup.b1bc00e6.png) no-repeat 0 -835px;
    float: left;
    border: none;
    cursor: pointer;
    margin: 12px 0 0 130px
}

.arrival-notice-modal {
    width: 450px;
    margin-left: -225px;
    margin-top: -140px
}

.arrival-notice-modal .modal-content {
    text-align: center;
    font-size: 14px
}

.arrival-notice-modal .notice-text {
    color: #444
}

.arrival-notice-modal form {
    margin-top: 25px;
    padding-left: 10px;
    text-align: left
}

.arrival-notice-modal form>div {
    margin-top: 12px
}

.arrival-notice-modal form input {
    width: 230px
}

.arrival-notice-modal form .btn-wrapper {
    text-align: center
}

.arrival-notice-modal form .btn-wrapper .yellow-btn,.arrival-notice-modal form .btn-wrapper .yellow-btn-notice {
    width: 92px;
    height: 33px;
    line-height: 33px;
    border: none;
    border-radius: 2px;
    background: #ff7800;
    color: #fff
}

.left-negative10 {
    left: -10px
}

.icon-mark {
    position: relative;
    display: inline-block;
    width: 18px;
    height: 18px;
    cursor: pointer;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/cart_icon.b1026903.png);
    background-position: -352px -282px;
    margin-bottom: -6px
}

.icon-mark .icon-tip {
    left: -160px!important;
    display: none;
    position: absolute;
    top: 25px;
    z-index: 1;
    padding: 10px;
    color: #666;
    font-size: 12px;
    line-height: 18px;
    background-color: #fff;
    border: 1px solid #cecbce;
    box-sizing: border-box;
    box-shadow: 0 0 2px 3px #f2f2f2;
    width: 106px;
    text-align: left;
    border-radius: 2px;
    cursor: default
}

.icon-mark:hover .icon-tip,.icon-mark:hover .icon-tip-narrow {
    display: block!important
}

.icon-order {
    width: 19px;
    height: 16px;
    margin-bottom: -3px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order.f3c9b24e.svg) no-repeat
}

.icon-tip-narrow:hover,.icon-tip:hover {
    display: block
}

.icon-tip-narrow {
    display: none;
    position: absolute;
    right: 2px;
    top: 20px;
    z-index: 2;
    width: 11px;
    height: 6px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.so-no-result {
    margin: 30px auto 34px;
    font-size: 15px
}

.so-no-result .so-no-result-icon {
    margin: auto;
    width: 109px;
    height: 98px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/new_so01.8956c38d.png) no-repeat 50%
}

.so-no-result .so-no-result-tip {
    margin-top: 15px;
    text-align: center
}

.so-no-result .so-no-result-tip p {
    line-height: 1.75
}

.so-no-result .so-no-result-tip p a {
    margin-left: 4px;
    text-decoration: underline
}

.so-no-result .btn-wrapper {
    margin-top: 16px
}

.add-cart-ball {
    visibility: hidden;
    position: absolute;
    z-index: 100001;
    width: 16px;
    height: 16px;
    font-size: 12px;
    text-align: center;
    color: #fff;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/red_ball.6923b245.png) no-repeat 50%
}

.common-float-dialog {
    position: absolute;
    left: -18px;
    top: 28px;
    min-width: 100px;
    height: auto;
    padding: 10px;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #eaeaea;
    text-align: center;
    font-style: normal;
    display: none;
    z-index: 5
}

.common-float-dialog .f-s {
    position: absolute;
    top: -19px;
    left: 20px;
    display: block;
    height: 0;
    width: 0;
    border: 9px dashed transparent;
    border-bottom: 9px solid #d2d2d2
}

.common-float-dialog .f-i {
    position: absolute;
    top: -9px;
    left: -10px;
    display: block;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.lcsc-dialog-mask {
    position: fixed;
    z-index: 100000;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: #000;
    background: rgba(0,0,0,.35)
}

.legal-require-style {
    font-weight: 700!important;
    text-decoration: underline!important
}

.user-select {
    -webkit-user-select: none;
    user-select: none
}

input {
    outline: none
}

.blue {
    color: #0093e6
}

.red {
    color: red
}

.yellow {
    color: #ff7a01
}

.green {
    color: #0da401
}

.light-gray {
    color: #999
}

.grey {
    color: #a0a0a0
}

.cff3300 {
    color: #f30
}

.fff {
    color: #fff
}

.bgcolor-efeeee {
    background-color: #efeeee
}

.goldenrod {
    color: #ff7800!important
}

a.goldenrod:hover {
    color: #ff7800;
    text-decoration: underline
}

.c666 {
    color: #666
}

.c444 {
    color: #444
}

.c999 {
    color: #999
}

.cff7800 {
    color: #ff7800
}

.c9a9a9a,.color9a {
    color: #9a9a9a
}

.c009900 {
    color: #090
}

.c009933 {
    color: #093
}

.gray {
    color: grey
}

.light-color {
    color: #ff7800
}

.white {
    color: #fff!important
}

.purple {
    color: #7359e2!important
}

.placehd {
    color: #999
}

.LUCENE_HIGHLIGHT_CLASS {
    background-color: #ff0
}

.orange {
    color: #ff7900
}

.color666 {
    color: #666
}

.color333 {
    color: #333
}

.bgf6 {
    background-color: #f6f6f6
}

.bgf0f8fd {
    background-color: #f0f8fd
}

.bgfa {
    background-color: #fafafa
}

.help-page-color-blue {
    color: #409eff
}

.common-useless-coupon {
    background: #ffebeb;
    color: #ff2020;
    width: -webkit-max-content;
    width: max-content;
    padding: 0 5px;
    border-radius: 2px;
    margin-bottom: 5px
}

.common-useless-coupon2 {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    height: 30px;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    color: #999;
    text-indent: 5px;
    font-size: 12px;
    margin-top: 3px
}

.flex {
    display: -webkit-box!important;
    display: -webkit-flex!important;
    display: flex!important
}

.flex-al-c {
    -webkit-box-align: center!important;
    -webkit-align-items: center!important;
    align-items: center!important
}

.flex-jc-c {
    -webkit-box-pack: center!important;
    -webkit-justify-content: center!important;
    justify-content: center!important
}

.flex-jc-bt {
    -webkit-box-pack: justify!important;
    -webkit-justify-content: space-between!important;
    justify-content: space-between!important
}

.dfc {
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center
}

.dfb,.dfc {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.dfb {
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between
}

.dfa {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-justify-content: space-around;
    justify-content: space-around
}

.ml-5 {
    margin-left: 5px!important
}

.mr-5 {
    margin-right: 5px!important
}

.mt-5 {
    margin-top: 5px!important
}

.mb-5 {
    margin-bottom: 5px!important
}

.pl-5 {
    padding-left: 5px!important
}

.pr-5 {
    padding-right: 5px!important
}

.pt-5 {
    padding-top: 5px!important
}

.pb-5 {
    padding-bottom: 5px!important
}

.ml-10 {
    margin-left: 10px!important
}

.mr-10 {
    margin-right: 10px!important
}

.mt-10 {
    margin-top: 10px!important
}

.mb-10 {
    margin-bottom: 10px!important
}

.pl-10 {
    padding-left: 10px!important
}

.pr-10 {
    padding-right: 10px!important
}

.pt-10 {
    padding-top: 10px!important
}

.pb-10 {
    padding-bottom: 10px!important
}

.ml-12 {
    margin-left: 12px!important
}

.mr-12 {
    margin-right: 12px!important
}

.mt-12 {
    margin-top: 12px!important
}

.mb-12 {
    margin-bottom: 12px!important
}

.pl-12 {
    padding-left: 12px!important
}

.pr-12 {
    padding-right: 12px!important
}

.pt-12 {
    padding-top: 12px!important
}

.pb-12 {
    padding-bottom: 12px!important
}

.ml-15 {
    margin-left: 15px!important
}

.mr-15 {
    margin-right: 15px!important
}

.mt-15 {
    margin-top: 15px!important
}

.mb-15 {
    margin-bottom: 15px!important
}

.pl-15 {
    padding-left: 15px!important
}

.pr-15 {
    padding-right: 15px!important
}

.pt-15 {
    padding-top: 15px!important
}

.pb-15 {
    padding-bottom: 15px!important
}

.ml-20 {
    margin-left: 20px!important
}

.mr-20 {
    margin-right: 20px!important
}

.mt-20 {
    margin-top: 20px!important
}

.mb-20 {
    margin-bottom: 20px!important
}

.pl-20 {
    padding-left: 20px!important
}

.pr-20 {
    padding-right: 20px!important
}

.pt-20 {
    padding-top: 20px!important
}

.pb-20 {
    padding-bottom: 20px!important
}

.ml-25 {
    margin-left: 25px!important
}

.mr-25 {
    margin-right: 25px!important
}

.mt-25 {
    margin-top: 25px!important
}

.mb-25 {
    margin-bottom: 25px!important
}

.pl-25 {
    padding-left: 25px!important
}

.pr-25 {
    padding-right: 25px!important
}

.pt-25 {
    padding-top: 25px!important
}

.pb-25 {
    padding-bottom: 25px!important
}

.ml-30 {
    margin-left: 30px!important
}

.mr-30 {
    margin-right: 30px!important
}

.mt-30 {
    margin-top: 30px!important
}

.mb-30 {
    margin-bottom: 30px!important
}

.pl-30 {
    padding-left: 30px!important
}

.pr-30 {
    padding-right: 30px!important
}

.pt-30 {
    padding-top: 30px!important
}

.pb-30 {
    padding-bottom: 30px!important
}

.ml-35 {
    margin-left: 35px!important
}

.mr-35 {
    margin-right: 35px!important
}

.mt-35 {
    margin-top: 35px!important
}

.mb-35 {
    margin-bottom: 35px!important
}

.pl-35 {
    padding-left: 35px!important
}

.pr-35 {
    padding-right: 35px!important
}

.pt-35 {
    padding-top: 35px!important
}

.pb-35 {
    padding-bottom: 35px!important
}

.ml-40 {
    margin-left: 40px!important
}

.mr-40 {
    margin-right: 40px!important
}

.mt-40 {
    margin-top: 40px!important
}

.mb-40 {
    margin-bottom: 40px!important
}

.pl-40 {
    padding-left: 40px!important
}

.pr-40 {
    padding-right: 40px!important
}

.pt-40 {
    padding-top: 40px!important
}

.pb-40 {
    padding-bottom: 40px!important
}

.ml-45 {
    margin-left: 45px!important
}

.mr-45 {
    margin-right: 45px!important
}

.mt-45 {
    margin-top: 45px!important
}

.mb-45 {
    margin-bottom: 45px!important
}

.pl-45 {
    padding-left: 45px!important
}

.pr-45 {
    padding-right: 45px!important
}

.pt-45 {
    padding-top: 45px!important
}

.pb-45 {
    padding-bottom: 45px!important
}

.ml-50 {
    margin-left: 50px!important
}

.mr-50 {
    margin-right: 50px!important
}

.mt-50 {
    margin-top: 50px!important
}

.mb-50 {
    margin-bottom: 50px!important
}

.pl-50 {
    padding-left: 50px!important
}

.pr-50 {
    padding-right: 50px!important
}

.pt-50 {
    padding-top: 50px!important
}

.pb-50 {
    padding-bottom: 50px!important
}

.ml-55 {
    margin-left: 55px!important
}

.mr-55 {
    margin-right: 55px!important
}

.mt-55 {
    margin-top: 55px!important
}

.mb-55 {
    margin-bottom: 55px!important
}

.pl-55 {
    padding-left: 55px!important
}

.pr-55 {
    padding-right: 55px!important
}

.pt-55 {
    padding-top: 55px!important
}

.pb-55 {
    padding-bottom: 55px!important
}

.ml-60 {
    margin-left: 60px!important
}

.mr-60 {
    margin-right: 60px!important
}

.mt-60 {
    margin-top: 60px!important
}

.mb-60 {
    margin-bottom: 60px!important
}

.pl-60 {
    padding-left: 60px!important
}

.pr-60 {
    padding-right: 60px!important
}

.pt-60 {
    padding-top: 60px!important
}

.pb-60 {
    padding-bottom: 60px!important
}

.ml-65 {
    margin-left: 65px!important
}

.mr-65 {
    margin-right: 65px!important
}

.mt-65 {
    margin-top: 65px!important
}

.mb-65 {
    margin-bottom: 65px!important
}

.pl-65 {
    padding-left: 65px!important
}

.pr-65 {
    padding-right: 65px!important
}

.pt-65 {
    padding-top: 65px!important
}

.pb-65 {
    padding-bottom: 65px!important
}

.ml-70 {
    margin-left: 70px!important
}

.mr-70 {
    margin-right: 70px!important
}

.mt-70 {
    margin-top: 70px!important
}

.mb-70 {
    margin-bottom: 70px!important
}

.pl-70 {
    padding-left: 70px!important
}

.pr-70 {
    padding-right: 70px!important
}

.pt-70 {
    padding-top: 70px!important
}

.pb-70 {
    padding-bottom: 70px!important
}

.ml-75 {
    margin-left: 75px!important
}

.mr-75 {
    margin-right: 75px!important
}

.mt-75 {
    margin-top: 75px!important
}

.mb-75 {
    margin-bottom: 75px!important
}

.pl-75 {
    padding-left: 75px!important
}

.pr-75 {
    padding-right: 75px!important
}

.pt-75 {
    padding-top: 75px!important
}

.pb-75 {
    padding-bottom: 75px!important
}

.ml-80 {
    margin-left: 80px!important
}

.mr-80 {
    margin-right: 80px!important
}

.mt-80 {
    margin-top: 80px!important
}

.mb-80 {
    margin-bottom: 80px!important
}

.pl-80 {
    padding-left: 80px!important
}

.pr-80 {
    padding-right: 80px!important
}

.pt-80 {
    padding-top: 80px!important
}

.pb-80 {
    padding-bottom: 80px!important
}

.ml-85 {
    margin-left: 85px!important
}

.mr-85 {
    margin-right: 85px!important
}

.mt-85 {
    margin-top: 85px!important
}

.mb-85 {
    margin-bottom: 85px!important
}

.pl-85 {
    padding-left: 85px!important
}

.pr-85 {
    padding-right: 85px!important
}

.pt-85 {
    padding-top: 85px!important
}

.pb-85 {
    padding-bottom: 85px!important
}

.ml-90 {
    margin-left: 90px!important
}

.mr-90 {
    margin-right: 90px!important
}

.mt-90 {
    margin-top: 90px!important
}

.mb-90 {
    margin-bottom: 90px!important
}

.pl-90 {
    padding-left: 90px!important
}

.pr-90 {
    padding-right: 90px!important
}

.pt-90 {
    padding-top: 90px!important
}

.pb-90 {
    padding-bottom: 90px!important
}

.ml-95 {
    margin-left: 95px!important
}

.mr-95 {
    margin-right: 95px!important
}

.mt-95 {
    margin-top: 95px!important
}

.mb-95 {
    margin-bottom: 95px!important
}

.pl-95 {
    padding-left: 95px!important
}

.pr-95 {
    padding-right: 95px!important
}

.pt-95 {
    padding-top: 95px!important
}

.pb-95 {
    padding-bottom: 95px!important
}

.ml-100 {
    margin-left: 100px!important
}

.mr-100 {
    margin-right: 100px!important
}

.mt-100 {
    margin-top: 100px!important
}

.mb-100 {
    margin-bottom: 100px!important
}

.pl-100 {
    padding-left: 100px!important
}

.pr-100 {
    padding-right: 100px!important
}

.pt-100 {
    padding-top: 100px!important
}

.pb-100 {
    padding-bottom: 100px!important
}

.line-over-1 {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden
}

.line-over-2 {
    -webkit-line-clamp: 2
}

.line-over-2,.line-over-3 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden
}

.line-over-3 {
    -webkit-line-clamp: 3
}

.line-over-4 {
    -webkit-line-clamp: 4
}

.line-over-4,.line-over-5 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden
}

.line-over-5 {
    -webkit-line-clamp: 5
}

.mro-btn {
    min-width: 100px;
    min-height: 32px;
    padding: 5px 15px;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    font-size: 12px;
    color: #333;
    line-height: 1em;
    background-color: #fff;
    border-radius: 16px;
    border: none;
    outline: none;
    box-sizing: border-box
}

.mro-btn:hover {
    color: #0093e6;
    border: 1px solid #0093e6
}

.mro-btn.primary {
    background: -webkit-linear-gradient(323deg,#00c5f4,#0093e6);
    background: linear-gradient(127deg,#00c5f4,#0093e6);
    color: #fff
}

.mro-btn.primary:hover {
    border: none;
    background: -webkit-linear-gradient(323deg,#00c5f4,#37a5e6);
    background: linear-gradient(127deg,#00c5f4,#37a5e6)
}

.mro-input {
    background: #fff;
    border-radius: 4px;
    border: 1px solid #dedde1;
    outline: none;
    font-size: 14px;
    height: 40px;
    width: 450px;
    line-height: 40px;
    padding: 0 20px;
    box-sizing: border-box;
    color: #333
}

.mro-input::-webkit-input-placeholder {
    color: #ccc
}

.mro-input::placeholder {
    color: #ccc
}

.mro-input:hover {
    border-color: #c5c4c8
}

.mro-input:focus {
    border-color: #29a4ea
}

.mro-input.error {
    border-color: #f66c69
}

.relative {
    position: relative
}

.absolute {
    position: absolute
}

.annual-mask {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    background-color: rgba(0,0,0,.4);
    z-index: 999998;
    display: none
}

.fw600 {
    font-weight: 600
}

#annual-statement-dialog {
    display: none;
    position: fixed;
    top: 30vh;
    z-index: 999999;
    width: 100%
}

#annual-statement-dialog .commonP {
    color: #520000
}

#annual-statement-dialog .commonSpan {
    background: -webkit-linear-gradient(107deg,#ff0808,#ff7f00);
    background: linear-gradient(343deg,#ff0808,#ff7f00);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background: transparent\\9;
    color: #ff0808\\9
}

@media (-ms-high-contrast:none),screen and (-ms-high-contrast:active) {
    #annual-statement-dialog .commonSpan {
        background: transparent;
        color: #ff0808
    }
}

#annual-statement-dialog .commonBtn {
    cursor: pointer;
    position: absolute;
    width: 286px;
    height: 102px;
    bottom: 20px;
    left: calc(50% - 143px)
}

#annual-statement-dialog .commonBtn span {
    position: absolute;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    width: 100%;
    top: 25px;
    color: #fff;
    font-size: 22px;
    letter-spacing: 1px;
    font-weight: 500;
    line-height: 30px
}

#annual-statement-dialog .commonBtn .openMailBtn {
    width: 100%
}

#annual-statement-dialog .mailBox {
    display: none;
    width: 556px;
    height: 360px;
    margin: auto;
    position: relative
}

#annual-statement-dialog .mailBox .msgTitle {
    font-size: 28px;
    font-family: Helvetica;
    letter-spacing: 1px;
    position: absolute;
    width: 100%;
    text-align: center;
    top: 86px
}

#annual-statement-dialog .mailBox .closeBtn {
    position: absolute;
    right: 0;
    height: 20px;
    width: 20px;
    margin: 15px;
    cursor: pointer
}

#annual-statement-dialog .mailBox .mailImg {
    height: 100%;
    width: 100%
}

#annual-statement-dialog .contentBox {
    display: none;
    width: 694px;
    height: 520px;
    position: fixed;
    left: calc(50% - 347px);
    top: 18vh
}

#annual-statement-dialog .contentBox .head {
    height: 40px;
    background: #fff0ec
}

#annual-statement-dialog .contentBox .head .closeBtn {
    float: right;
    width: 20px;
    height: 20px;
    margin: 10px 20px 0;
    cursor: pointer
}

#annual-statement-dialog .contentBox .contentInner {
    width: 100%;
    height: 480px;
    position: relative
}

#annual-statement-dialog .contentBox .contentInner .rabitImg {
    position: absolute;
    width: 158px;
    right: -5px;
    top: 0;
    z-index: 9
}

#annual-statement-dialog .contentBox .contentInner .plusImg {
    width: 100%;
    height: 100%
}

#annual-statement-dialog .contentBox .contentInner .textBox {
    position: absolute;
    top: 24px;
    left: 32px;
    width: 630px;
    height: 362px
}

#annual-statement-dialog .contentBox .contentInner .textBox .visiable {
    visibility: hidden
}

#annual-statement-dialog .contentBox .contentInner .textBox .bigSpan {
    font-size: 20px;
    font-weight: 700
}

#annual-statement-dialog .contentBox .contentInner .textBox .tips {
    font-size: 12px;
    font-family: Helvetica;
    color: #825751;
    line-height: 14px;
    width: 100%;
    height: 30px;
    margin: 12px -13px;
    -webkit-transform: scale(.9);
    transform: scale(.9)
}

#annual-statement-dialog .contentBox .contentInner .textBox .step1 {
    display: none
}

#annual-statement-dialog .contentBox .contentInner .textBox .step1 .title {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    margin: 22px 0 15px 20px
}

#annual-statement-dialog .contentBox .contentInner .textBox .step1 .title img {
    width: 60px!important
}

#annual-statement-dialog .contentBox .contentInner .textBox .step1 .title .commonSpan {
    font-size: 28px;
    margin-left: 10px;
    display: inline-block;
    line-height: 35px
}

#annual-statement-dialog .contentBox .contentInner .textBox .step1 .commonP {
    color: #4a0900;
    font-size: 16px;
    margin: 0 0 14px 22px;
    letter-spacing: .5px
}

#annual-statement-dialog .contentBox .contentInner .textBox .step2 {
    display: none;
    width: 610px;
    margin: -23px auto;
    position: relative;
    height: 152px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/bg2.c4a7993a.png) no-repeat;
    background-size: 100% 100%
}

#annual-statement-dialog .contentBox .contentInner .textBox .step2 .commonP {
    margin: 0 0 14px 12px;
    font-size: 14px
}

#annual-statement-dialog .contentBox .contentInner .textBox .step2 .commonP .commonSpan {
    color: #e03600
}

#annual-statement-dialog .contentBox .contentInner .textBox .step3 {
    display: none
}

#annual-statement-dialog .contentBox .contentInner .textBox .step3 .step3box {
    width: 610px;
    position: relative;
    height: 189px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/bg3.87d2ad39.png) no-repeat;
    background-size: 100% 100%;
    margin: 12px auto
}

#annual-statement-dialog .contentBox .contentInner .textBox .step3 .step3box .commonP {
    margin: 0 0 15px 12px;
    font-size: 14px
}

#annual-statement-dialog .contentBox .contentInner .textBox .step3 .step3box .commonP .commonSpan {
    font-size: 20px
}

#annual-statement-dialog .contentBox .contentInner .textBox .step3 .step3box .tips {
    margin-top: 18px
}

#annual-statement-dialog .contentBox .contentInner .textBox .step4 {
    margin-top: 10px
}

#annual-statement-dialog .contentBox .contentInner .textBox .step4 .commonP {
    margin: 0 0 14px 22px;
    font-size: 16px;
    font-weight: 600
}

#annual-statement-dialog .contentBox .contentInner .textBox .step4 .giftImg {
    position: absolute;
    width: 45px;
    margin-top: -21px
}

#annual-statement-dialog .contentBox .contentInner .textBox .step4 .tips {
    margin-top: 10px;
    font-weight: 600
}

#annual-statement-dialog .contentBox .contentInner .btnBox {
    position: absolute;
    bottom: 18px;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    left: 113px;
    left: 20px\\9
}

@media (-ms-high-contrast:none),screen and (-ms-high-contrast:active) {
    #annual-statement-dialog .contentBox .contentInner .btnBox {
        left: 20px
    }
}

#annual-statement-dialog .contentBox .contentInner .btnBox .commonBtn {
    position: relative;
    bottom: 0;
    left: unset;
    width: 216px;
    height: 58px
}

#annual-statement-dialog .contentBox .contentInner .btnBox .commonBtn span {
    top: 5px;
    font-size: 22px
}

#annual-statement-dialog .contentBox .contentInner .btnBox .commonBtn+.commonBtn {
    margin-left: 36px
}

.ani1 {
    -webkit-animation: animates 1s ease-in-out 0s;
    animation: animates 1s ease-in-out 0s
}

.ani2 {
    -webkit-animation: animates2 3.3s ease-in-out 0s;
    animation: animates2 3.3s ease-in-out 0s
}

.ani3 {
    -webkit-animation: animates3 5.5s ease-in-out 0s;
    animation: animates3 5.5s ease-in-out 0s
}

@-webkit-keyframes animates {
    0% {
        opacity: 0
    }

    to {
        opacity: 1%
    }
}

@keyframes animates {
    0% {
        opacity: 0
    }

    to {
        opacity: 1%
    }
}

@-webkit-keyframes animates2 {
    0%,60.06% {
        opacity: 0
    }

    to {
        opacity: 1%
    }
}

@keyframes animates2 {
    0%,60.06% {
        opacity: 0
    }

    to {
        opacity: 1%
    }
}

@-webkit-keyframes animates3 {
    0%,81% {
        opacity: 0
    }

    to {
        opacity: 1%
    }
}

@keyframes animates3 {
    0%,81% {
        opacity: 0
    }

    to {
        opacity: 1%
    }
}

.mb5 {
    margin-bottom: 5px
}

.layout-tools {
    position: fixed;
    bottom: 102px;
    right: 0;
    z-index: 8888;
    width: 64px
}

.layout-tools .red-package {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/xrfl.42b14ab6.gif) 100% 100% no-repeat;
    background-size: cover
}

.layout-tools .red-package,.layout-tools .tjfl {
    display: inline-block;
    width: 66px;
    height: 66px;
    margin-bottom: 9px
}

.layout-tools .tjfl {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/yqyl.2b96e268.gif) 100% 100% no-repeat;
    background-size: cover
}

.layout-tools .right-utils-show-btn {
    position: absolute;
    bottom: 42px;
    right: 5px;
    box-sizing: border-box;
    width: 55px;
    height: 37px;
    border-radius: 2px;
    text-align: center;
    line-height: 37px;
    border: 1px solid #dfdfdf;
    color: #666;
    font-size: 12px;
    background-color: #fff;
    cursor: pointer
}

.layout-tools .right-utils-show-btn .right-utils-item-icon {
    margin: 0 auto 4px;
    display: block;
    width: 11px;
    height: 10px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/righ_utils_icon_new.ba40447f.png) 50% no-repeat
}

.layout-tools .right-utils-item {
    position: relative;
    padding: 5px 6px 9px 7px;
    display: block;
    box-sizing: border-box;
    width: 64px;
    height: 61px;
    background-color: #fff;
    cursor: pointer
}

.layout-tools .right-utils-item:nth-last-child(2) {
    border-radius: 0 0 0 8px
}

.layout-tools .right-utils-item:hover {
    border-color: #dfdfdf;
    background-color: #199de9
}

.layout-tools .right-utils-item:hover .right-utils-item-panel {
    visibility: visible;
    -webkit-transition: all .5s;
    transition: all .5s;
    -webkit-transform: translateX(0);
    transform: translateX(0)
}

.layout-tools .right-utils-item:hover .right-utils-item-text {
    color: #fff
}

.layout-tools .right-utils-item .border-ccc {
    display: block;
    height: 1px;
    margin-bottom: 8px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIYAAAABCAIAAACUrkGmAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkQ4Qzc3RTZGNjU5NDExRTlBQzZCODU1QjY2NjYxMzk1IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkQ4Qzc3RTcwNjU5NDExRTlBQzZCODU1QjY2NjYxMzk1Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RDhDNzdFNkQ2NTk0MTFFOUFDNkI4NTVCNjY2NjEzOTUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RDhDNzdFNkU2NTk0MTFFOUFDNkI4NTVCNjY2NjEzOTUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5JnqTCAAAAHklEQVR42mL8//8/AwPD/fv3gaSiouIoe8DZAAEGAOqvZf9X7OaOAAAAAElFTkSuQmCC) no-repeat;
    width: 126px
}

.layout-tools .right-utils-item .arrow-wrap {
    width: 126px
}

.layout-tools .right-utils-item .arrow-wrap .arrow-down {
    display: block;
    width: 12px;
    height: 8px;
    margin: 0 auto;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iOSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBzdHJva2U9IiM5Nzk3OTciIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNMSAxbDUuNSA2TDEyIDEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==);
    cursor: pointer
}

.layout-tools .right-utils-item .arrow-wrap .arrow-down:hover {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iOSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBzdHJva2U9IiMwRUEwRUMiIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNMSAxbDUuNSA2TDEyIDEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==)
}

.layout-tools .right-utils-item .right-utils-item-icon {
    margin: 0 auto;
    display: block;
    width: 30px;
    height: 31px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/righ_utils_icon_new.ba40447f.png);
    background-repeat: no-repeat;
    background-position: 50%
}

.layout-tools .right-utils-item .right-utils-item-text {
    display: block;
    text-align: center;
    color: #333
}

.layout-tools .right-utils-item .right-utils-item-panel {
    visibility: hidden;
    box-sizing: border-box;
    position: absolute;
    top: -1px;
    right: 78px;
    z-index: 1;
    width: 155px;
    border: 1px solid #e3e3e3;
    background: #fff;
    -webkit-transform: translateX(-15px);
    transform: translateX(-15px);
    cursor: default;
    box-shadow: 5px 4px 8px 0 rgba(1,66,104,.17);
    border-radius: 8px
}

.layout-tools .right-utils-item .right-utils-item-panel .white-box {
    width: 70px;
    height: 100%;
    position: absolute;
    top: 0;
    right: -41px;
    background: transparent
}

.layout-tools .right-utils-item .right-utils-item-panel .arrows {
    position: absolute;
    top: 20px;
    right: -5px;
    width: 6px;
    height: 9px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/rightUtils20180907_new.d3293935.png) no-repeat -220px 0
}

.layout-tools .right-utils-item-kf {
    border: 1px solid #dfdfdf
}

.layout-tools .right-utils-item-kf .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/kf.570342f3.svg);
    background-repeat: no-repeat
}

.layout-tools .right-utils-item-kf:hover .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/kf-hover.93e39dd5.svg)
}

.layout-tools .right-utils-item-kf .right-utils-item-panel {
    padding: 17px 10px;
    width: 155px
}

.layout-tools .right-utils-item-kf .right-utils-item-panel h4 {
    font-weight: 700;
    padding-bottom: 8px;
    font-size: 12px;
    color: #333
}

.layout-tools .right-utils-item-kf .right-utils-item-panel .kf-panel h4 {
    line-height: 12px;
    font-size: 12px
}

.layout-tools .right-utils-item-kf .right-utils-item-panel .kf-panel-item .kf-panel-item-icon {
    height: 13px;
    width: 18px;
    float: left;
    margin-top: 4px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/side-tel.44d7fce4.svg);
    background-position: 0 0;
    background-repeat: no-repeat
}

.layout-tools .right-utils-item-kf .right-utils-item-panel .kf-panel-item-fwsj {
    margin-top: 5px;
    margin-bottom: 24px;
    color: #333;
    font-size: 12px;
    line-height: 12px
}

.layout-tools .right-utils-item-kf .right-utils-item-panel .kf-panel-item-fwsj p:first-of-type {
    margin-bottom: 10px
}

.layout-tools .right-utils-item-kf .right-utils-item-panel .kf-panel-item-fwsj .kf-panel-item-icon {
    background-position-x: -116px
}

.layout-tools .right-utils-item-kf .right-utils-item-panel .kf-panel-item-kfrx #kf-phone-p {
    margin-bottom: 20px;
    color: #333
}

.layout-tools .right-utils-item-kf .right-utils-item-panel .kf-panel-item-tsdh {
    margin-bottom: 0
}

.layout-tools #forKF {
    display: none;
    border: 1px solid #dfdfdf
}

.layout-tools #forKF .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/vip.ebd0959a.svg);
    background-repeat: no-repeat
}

.layout-tools #forKF:hover .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/vip-hover.315d86f3.svg)
}

.layout-tools .right-utils-item-QQ {
    border-bottom: 1px solid #dfdfdf;
    border-left: 1px solid #dfdfdf;
    border-right: 1px solid #dfdfdf
}

.layout-tools .right-utils-item-QQ .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/qq.29648b28.svg);
    background-repeat: no-repeat
}

.layout-tools .right-utils-item-QQ:hover .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/qq-hover.44c7de30.svg)
}

.layout-tools .right-utils-item-yhq {
    border-left: 1px solid #dfdfdf;
    border-right: 1px solid #dfdfdf;
    border-bottom: 1px solid #dfdfdf
}

.layout-tools .right-utils-item-yhq .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/yhq.d090ec31.svg);
    background-repeat: no-repeat
}

.layout-tools .right-utils-item-yhq:hover .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/yhq-hover.ccc1a6d4.svg)
}

.layout-tools .right-utils-item-yjwj {
    border-left: 1px solid #dfdfdf;
    border-right: 1px solid #dfdfdf;
    border-bottom: 1px solid #dfdfdf
}

.layout-tools .right-utils-item-yjwj .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/yjwj.ff35aaf3.svg);
    background-repeat: no-repeat
}

.layout-tools .right-utils-item-yjwj:hover .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/yjwj-hover.a677ece8.svg)
}

.layout-tools .right-utils-item-yjwj .right-utils-item-panel {
    text-align: left;
    width: 284px;
    height: 116px;
    border: none;
    background: transparent;
    box-shadow: 0 0 0 0;
    right: 65px
}

.layout-tools .right-utils-item-yjwj .right-utils-item-panel .item-content {
    background: transparent;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.layout-tools .right-utils-item-yjwj .right-utils-item-panel .item-content>img {
    width: 100%
}

.layout-tools .right-utils-item-yjwj .right-utils-item-panel .item-content .item-content-tips {
    position: absolute;
    right: 35px;
    top: 20px
}

.layout-tools .right-utils-item-yjwj .right-utils-item-panel .item-content .item-content-tips>span {
    display: block
}

.layout-tools .right-utils-item-yjwj .right-utils-item-panel .item-content .item-content-tips .title {
    font-size: 16px;
    color: #199de9;
    margin-bottom: 4px
}

.layout-tools .right-utils-item-yjwj .right-utils-item-panel .item-content .item-content-tips .tips {
    font-size: 12px;
    color: #666;
    margin-bottom: 12px
}

.layout-tools .right-utils-item-yjwj .right-utils-item-panel .item-content .item-content-tips .btn {
    width: 74px;
    height: 24px;
    line-height: 24px;
    background: -webkit-linear-gradient(228deg,#36ccf6,#199de9);
    background: linear-gradient(222deg,#36ccf6,#199de9);
    border-radius: 12px;
    font-size: 12px;
    color: #fff;
    cursor: pointer
}

.layout-tools .right-utils-item-yjwj p {
    color: #fff
}

.layout-tools .right-utils-item-QR {
    border: 1px solid #dfdfdf;
    border-bottom: none;
    border-radius: 8px 0 0 0
}

.layout-tools .right-utils-item-QR .code-img-wrap {
    margin: auto;
    width: 120px
}

.layout-tools .right-utils-item-QR .code-tip-text1 {
    margin-top: 10px;
    margin-left: 11px;
    padding-bottom: 8px;
    width: 134px;
    line-height: 12px;
    font-size: 12px;
    font-weight: 700
}

.layout-tools .right-utils-item-QR .border-ccc {
    margin-left: 12px
}

.layout-tools .right-utils-item-QR .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/wx.7b86e081.svg);
    background-repeat: no-repeat
}

.layout-tools .right-utils-item-QR:hover .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/wx-hover.7c22530a.svg)
}

.layout-tools .right-utils-item-QR .right-utils-item-panel {
    width: 155px;
    height: 172px
}

.layout-tools .right-utils-item-QR .right-utils-item-panel .code-img {
    margin-top: 12px;
    width: 120px;
    height: 110px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/righ_utils_icon_new.ba40447f.png) no-repeat -44px -9px
}

.layout-tools .right-utils-item-wx {
    border: 1px solid #dfdfdf;
    border-top: none
}

.layout-tools .right-utils-item-wx .item-content {
    padding: 15px 0
}

.layout-tools .right-utils-item-wx .code-tip-text1 {
    margin-bottom: 7px
}

.layout-tools .right-utils-item-wx .right-utils-item-icon {
    margin: 0 auto;
    display: block;
    width: 30px;
    height: 31px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/xmt.a931af37.svg) 50% no-repeat
}

.layout-tools .right-utils-item-wx:hover .right-utils-item-icon {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/xmt-hover.14b1f68d.svg)
}

.layout-tools .right-utils-item-wx .right-utils-item-panel {
    top: -115px;
    text-align: center
}

.layout-tools .right-utils-item-wx .right-utils-item-panel .arrows {
    top: 135px
}

.layout-tools .right-utils-item-wx .right-utils-item-panel .code-img {
    margin-left: 17px;
    width: 120px;
    height: 110px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/righ_utils_icon_new.ba40447f.png) no-repeat -44px -132px
}

.layout-tools .right-utils-item-wx .right-utils-item-panel .code-tip-text {
    text-align: center;
    line-height: 12px
}

.layout-tools .right-utils-item-hdb {
    margin-top: 9px;
    padding-top: 2px;
    width: 64px;
    height: 59px;
    border: 1px solid #dfdfdf;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/to-top.4e72feeb.svg) no-repeat 50%;
    border-radius: 8px 0 0 8px
}

.layout-tools .right-utils-item-hdb:hover {
    background: #199de9 url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/to-top-hover.faf1b1ba.svg) no-repeat 50%
}

.new-person-bottom-fixed {
    width: 100vw;
    height: 6.25vw;
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 999999;
    display: none;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center
}

.new-person-bottom-fixed .img {
    height: 100%;
    width: 100%;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/gy_banner05_01.f20d8fc5.jpg) no-repeat;
    background-size: 100%
}

.new-person-bottom-fixed .close {
    position: absolute;
    top: 10px;
    right: 150px;
    width: 36px;
    height: 36px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/dialog-close-icon3.afa60a90.svg) no-repeat;
    cursor: pointer;
    -webkit-transform: scale(.8);
    transform: scale(.8)
}

.animate {
    position: absolute;
    -webkit-animation-duration: .5s;
    animation-duration: .5s;
    -webkit-animation-fill-mode: both;
    animation-fill-mode: both;
    -webkit-animation-name: animate;
    animation-name: animate
}

@-webkit-keyframes animate {
    0% {
        opacity: 1
    }

    to {
        opacity: 0
    }
}

@keyframes animate {
    0% {
        opacity: 1
    }

    to {
        opacity: 0
    }
}

.red-package-gif {
    display: none;
    width: 1100px;
    height: 1200px;
    position: fixed;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/activity-fixed-bottom.4ce34aed.gif) no-repeat;
    right: -500px;
    margin-top: -400px;
    -webkit-transform: scale(.6);
    transform: scale(.6)
}

.add-cart-modal,.sellAbroad-add-cart-modal {
    border: 4px solid #d9d9d9;
    position: fixed;
    left: 50%;
    top: 50%;
    background: #fff;
    padding: 0 0 20px;
    z-index: 100000;
    width: 660px;
    margin-left: -330px;
    margin-top: -190px
}

.add-cart-modal .yellow,.sellAbroad-add-cart-modal .yellow {
    color: #ff7a01;
    font-size: 14px
}

.add-cart-modal .buy-num,.sellAbroad-add-cart-modal .buy-num {
    margin-top: 15px;
    position: relative
}

.add-cart-modal .item-tit-color,.sellAbroad-add-cart-modal .item-tit-color {
    color: #9a9a9a
}

.add-cart-modal .stock-flag,.sellAbroad-add-cart-modal .stock-flag {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    line-height: 14px;
    margin-left: 3px;
    margin-right: 20px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/gantanhao.d8159e2e.svg) no-repeat;
    cursor: pointer;
    vertical-align: -2px
}

.add-cart-modal .stock-flag .pop-box,.sellAbroad-add-cart-modal .stock-flag .pop-box {
    position: absolute;
    top: 20px;
    left: -10px;
    min-width: 100px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.add-cart-modal .stock-flag .pop-box .icon_tip_narrow,.sellAbroad-add-cart-modal .stock-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 10px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.add-cart-modal .stock-flag .pop-box .tip-text,.sellAbroad-add-cart-modal .stock-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.add-cart-modal .stock-flag .pop-box .tip-text .text,.sellAbroad-add-cart-modal .stock-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.add-cart-modal .stock-flag .pop-box .tip-text .text .stock-num,.sellAbroad-add-cart-modal .stock-flag .pop-box .tip-text .text .stock-num {
    color: #333;
    font-weight: 700
}

.add-cart-modal .modal-title,.sellAbroad-add-cart-modal .modal-title {
    position: relative;
    height: 34px;
    line-height: 35px;
    text-indent: 15px;
    background: #f2f2f2;
    border-bottom: 1px solid #dedede;
    color: #444
}

.add-cart-modal .modal-title .left,.sellAbroad-add-cart-modal .modal-title .left {
    float: left;
    font-size: 14px
}

.add-cart-modal .modal-title .right,.sellAbroad-add-cart-modal .modal-title .right {
    float: right;
    display: block;
    margin-top: 10px;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -286px -317px;
    padding: 2px 10px;
    cursor: pointer
}

.add-cart-modal .modal-content,.sellAbroad-add-cart-modal .modal-content {
    padding: 20px 28px 12px;
    overflow: visible!important
}

.add-cart-modal .modal-content .add-one,.sellAbroad-add-cart-modal .modal-content .add-one {
    background: #ff7800;
    width: 32px;
    height: 16px;
    border-radius: 8px;
    position: relative;
    left: 310px;
    top: -30px;
    color: #fff;
    text-align: center;
    line-height: 15px
}

.add-cart-modal .ul-left,.sellAbroad-add-cart-modal .ul-left {
    float: left;
    width: 246px
}

.add-cart-modal .ul-left li,.sellAbroad-add-cart-modal .ul-left li {
    margin-bottom: 18px;
    white-space: normal
}

.add-cart-modal .ul-left .li-name,.sellAbroad-add-cart-modal .ul-left .li-name {
    display: inline-block;
    vertical-align: top;
    width: 184px
}

.add-cart-modal .ul-left .icon-wrap,.sellAbroad-add-cart-modal .ul-left .icon-wrap {
    position: relative;
    display: inline-block;
    vertical-align: text-bottom;
    margin-left: 5px;
    width: 20px;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/cart_icon.b1026903.png) no-repeat -350px -278px
}

.add-cart-modal .ul-right,.sellAbroad-add-cart-modal .ul-right {
    float: left;
    padding-left: 26px;
    width: 330px;
    border-left: 1px solid #e9e9e9
}

.add-cart-modal .ul-right .item-border,.sellAbroad-add-cart-modal .ul-right .item-border {
    text-align: center
}

.add-cart-modal .ul-right .item-border ul,.add-cart-modal .ul-right .item-border ul li,.sellAbroad-add-cart-modal .ul-right .item-border ul,.sellAbroad-add-cart-modal .ul-right .item-border ul li {
    width: 100%;
    text-align: center
}

.add-cart-modal .ul-right .item-border span,.sellAbroad-add-cart-modal .ul-right .item-border span {
    display: inline-block;
    width: 50%;
    box-sizing: border-box;
    text-align: left
}

.add-cart-modal .ul-right .item-border .span-1,.sellAbroad-add-cart-modal .ul-right .item-border .span-1 {
    text-align: right
}

.add-cart-modal .ul-right .item-border .span-1 .separator,.sellAbroad-add-cart-modal .ul-right .item-border .span-1 .separator {
    margin: 0 5px;
    font-weight: 400
}

.add-cart-modal .ul-right .item-border .span-2,.sellAbroad-add-cart-modal .ul-right .item-border .span-2 {
    color: #ff7b00
}

.add-cart-modal .ul-right .ul-right-l,.sellAbroad-add-cart-modal .ul-right .ul-right-l {
    float: left;
    width: 60px;
    color: #9a9a9a
}

.add-cart-modal .ul-right li .input,.sellAbroad-add-cart-modal .ul-right li .input {
    width: 63px
}

.add-cart-modal .ul-right ul,.sellAbroad-add-cart-modal .ul-right ul {
    float: left;
    margin-top: -5px
}

.add-cart-modal .ul-right ul li,.sellAbroad-add-cart-modal .ul-right ul li {
    height: 30px;
    line-height: 30px;
    width: 168px
}

.add-cart-modal .ul-right ul li.first,.sellAbroad-add-cart-modal .ul-right ul li.first {
    border-top: none
}

.add-cart-modal .ul-right ul li .span-2,.sellAbroad-add-cart-modal .ul-right ul li .span-2 {
    float: right
}

.add-cart-modal .ul-right .checkbox,.sellAbroad-add-cart-modal .ul-right .checkbox {
    vertical-align: text-bottom
}

.add-cart-modal .ul-right .icon-i,.sellAbroad-add-cart-modal .ul-right .icon-i {
    display: inline-block;
    vertical-align: text-bottom;
    width: 20px;
    height: 20px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/pay_icon.4dd25ecd.png) no-repeat 0 -40px
}

.add-cart-modal .common-btn,.sellAbroad-add-cart-modal .common-btn {
    margin-top: 10px;
    width: 93px;
    height: 33px;
    line-height: 33px;
    border-radius: 2px;
    border: none;
    color: #fff;
    background: #ff7a01;
    cursor: pointer
}

.add-cart-modal-toast {
    z-index: 2;
    display: none;
    padding: 0 10px;
    position: absolute;
    top: -50px;
    left: 60px;
    height: 36px;
    line-height: 38px;
    text-align: center;
    font-size: 14px;
    color: #444;
    white-space: nowrap;
    border: 1px solid #cecbce;
    background: #fff;
    box-shadow: 0 0 1px 2px #eee
}

.add-cart-modal-toast .icon {
    position: absolute;
    bottom: -10px;
    left: 30px;
    display: block;
    width: 11px;
    height: 10px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -276px -470px
}

.page-link-page-util {
    margin-top: 20px
}

.page-link-page-util .border-none {
    border: none
}

.page-link-page-util .bgccc {
    background-color: #ccc
}

.page-link-page-util .page-left {
    float: right
}

.page-link-page-util .page-left li {
    float: left;
    margin-right: 12px;
    height: 32px;
    line-height: 30px!important
}

.page-link-page-util .page-left li a,.page-link-page-util .page-left li span {
    padding: 0 8px;
    display: block;
    border: 1px solid #ccc
}

.page-link-page-util .page-left li a.active,.page-link-page-util .page-left li span.active {
    color: #fff;
    background: #0093e6;
    border: 1px solid #0093e6
}

.page-link-page-util .page-right {
    float: right;
    height: 22px;
    line-height: 22px;
    margin-top: 4px
}

.page-link-page-util .page-right input {
    width: 20px;
    height: 22px;
    padding: 0 5px;
    border: 1px solid #ccc
}

.page-link-page-util .page-right .confirm-page {
    margin-left: 8px;
    width: 54px;
    height: 24px;
    line-height: 22px;
    background: #f3f3f5;
    cursor: pointer
}

.page-link-page-util .page-right .confirm-page:hover {
    color: #0093e6
}

.page-link-page-util .page-right .page-input {
    width: 30px;
    line-height: normal;
    box-sizing: content-box
}

.catalog-warp {
    width: 302px;
    height: 100%;
    background: #fff;
    border-right: 1px solid #dedede;
    position: fixed;
    top: 0;
    left: -260px;
    z-index: 10000
}

.catalog-warp .so-list-left-catalog {
    width: 252px;
    height: 100%;
    overflow-x: hidden;
    padding: 0 4px;
    font-size: 14px;
    float: left
}

.catalog-warp .so-list-left-catalog .list-side-li {
    margin-bottom: 5px
}

.catalog-warp .so-list-left-catalog .list-side-li-tit {
    box-sizing: border-box;
    padding: 0 12px 0 15px;
    height: 42px;
    line-height: 42px;
    border: 1px solid #e3e3e3
}

.catalog-warp .so-list-left-catalog .list-side-li-tit>a {
    display: inline-block;
    width: 90%;
    color: #444;
    text-overflow: ellipsis;
    word-break: break-all;
    white-space: nowrap;
    overflow: hidden
}

.catalog-warp .so-list-left-catalog .list-side-li-tit>a:hover {
    color: #0093e6
}

.catalog-warp .so-list-left-catalog .list-side-li-tit-active {
    background: #e4e4e4;
    font-weight: 700
}

.catalog-warp .so-list-left-catalog .list-side-li-tit-icon {
    float: right;
    width: 16px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/notes.cd84d6b1.png) no-repeat 0 -23px;
    margin-top: 13px;
    cursor: pointer
}

.catalog-warp .so-list-left-catalog .list-side-li-tit-icon-close {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/notes.cd84d6b1.png) no-repeat 0 -40px
}

.catalog-warp .so-list-left-catalog .list-side-li-tit-icon-active {
    float: right;
    width: 8px;
    height: 14px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png) no-repeat 0 -9px;
    margin-top: 14px;
    cursor: default
}

.catalog-warp .so-list-left-catalog .list-side-li-child {
    padding: 6px 12px 6px 15px;
    border: 1px solid #e3e3e3;
    border-top: none;
    display: none
}

.catalog-warp .so-list-left-catalog .list-side-li-child>a {
    display: block;
    height: 30px;
    line-height: 30px;
    text-overflow: ellipsis;
    word-break: break-all;
    white-space: nowrap;
    overflow: hidden
}

.catalog-warp .so-list-left-catalog .list-side-li-child-active {
    display: block;
    height: auto
}

.catalog-warp .so-list-left-catalog::-webkit-scrollbar {
    width: 10px;
    height: 1px
}

.catalog-warp .so-list-left-catalog::-webkit-scrollbar-thumb {
    border-radius: 10px;
    box-shadow: inset 0 0 5px rgba(0,0,0,.2);
    background: #999
}

.catalog-warp .so-list-left-catalog::-webkit-scrollbar-track {
    box-shadow: inset 0 0 5px rgba(0,0,0,.2);
    border-radius: 10px;
    background: #ededed
}

.catalog-warp .show-catalog {
    width: 42px;
    height: 100%;
    text-align: center;
    position: relative;
    float: right
}

.catalog-warp .show-catalog .show-btn {
    width: 22px;
    text-align: center;
    color: #999;
    font-size: 14px;
    position: absolute;
    left: 50%;
    top: 50%;
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none
}

.catalog-warp .show-catalog .show-btn:hover {
    color: #0094e5
}

.catalog-warp .show-catalog .show-icon {
    display: block;
    width: 20px;
    height: 20px;
    margin-top: 4px;
    margin-left: 1px
}

.catalog-warp .show-catalog .show-icon-l {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/catalog-k.569d6303.svg) 50% no-repeat
}

.catalog-warp .show-catalog .show-icon-r {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/catalog-s.5f94bcf0.svg) 50% no-repeat
}

.det-screen-wrapper {
    padding: 0 12px 0 15px;
    border: 1px solid #e9e9e9;
    font-size: 12px
}

.det-screen,.det-screen-wrapper {
    position: relative;
    overflow: hidden
}

.det-screen {
    width: 100%;
    height: 34px;
    min-height: 34px;
    border-bottom: 1px dashed #e3e3e3
}

.det-screen-height {
    height: auto
}

.no-border {
    border-bottom: none
}

.det-screen-title {
    float: left;
    font-weight: 400;
    margin-top: 8px;
    color: #9a9a9a
}

.det-screen1 {
    float: left;
    width: 82%;
    height: 100%;
    padding-top: 8px
}

.det-screen1 div {
    float: left;
    display: block;
    margin-right: 24px;
    margin-bottom: 10px
}

.det-screen1 span {
    display: inline-block;
    vertical-align: top
}

.det-screen a {
    box-sizing: border-box;
    border: 1px solid #fff;
    max-width: 160px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap
}

.det-screen a i {
    display: none
}

.det-screen a.active {
    position: relative;
    border-color: #e3e3e3;
    padding: 0 15px 4px 4px
}

.det-screen a.active:hover {
    border-color: #0093e6
}

.det-screen a.active i {
    position: absolute;
    top: 0;
    right: 0;
    display: block;
    height: 11px;
    width: 11px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png) no-repeat -129px -13px
}

.det-screen a.active:hover i {
    border-color: #0093e6;
    background-position: -108px -13px
}

.det-screen1 .span-first {
    padding-right: 7px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: 98px
}

.det-screen .hoice-ys {
    width: 100%;
    margin: 10px auto 18px;
    height: 25px
}

.det-screen .hoice-ys input {
    margin: 2px 0 0 10px;
    width: 55px;
    height: 26px;
    line-height: 18px;
    text-align: center;
    cursor: pointer
}

.det-screen .hoice-ys .more-input {
    float: left;
    background: #fff;
    border: 1px solid #dedede
}

.det-screen .hoice-ys .more-input02 {
    float: left;
    margin-left: 45%;
    background: #0093e6;
    border: 1px solid #0093e6;
    color: #fff
}

.screen-more {
    position: absolute;
    top: 7px;
    right: 0;
    width: 100px
}

.screen-more a {
    width: 58px;
    text-align: left;
    color: #9a9a9a;
    height: 18px;
    line-height: 18px;
    display: block;
    float: left;
    padding: 0 15px 2px 4px
}

.screen-more a:hover {
    color: #0093e6
}

.screen-more b {
    width: 12px;
    height: 7px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/l_p.c69ea6a2.png) no-repeat -45px -664px;
    float: right;
    margin: 6px 0 0
}

.screen-more b.active {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/l_p.c69ea6a2.png) no-repeat 0 -664px
}

.screen-more input {
    width: 42px;
    height: 20px;
    background: #fff;
    border: 1px solid #ccc;
    line-height: 18px;
    text-align: center;
    color: #9a9a9a;
    cursor: pointer;
    float: right;
    font-family: 微软雅黑;
    font-size: 12px
}

.screen-more input:hover {
    color: #0093e6;
    border-color: #0093e6
}

.more-select {
    display: none;
    float: left;
    width: 100%;
    height: auto
}

.more-select .pick-txt {
    box-sizing: border-box;
    width: 88%;
    float: left;
    padding: 0 10px 18px;
    border: 1px solid #dedede;
    margin-top: 8px
}

.more-select .pick-txt div {
    margin-top: 8px
}

.more-select .pick-txt label {
    color: #666;
    cursor: pointer
}

.more-select .pick-txt label:hover {
    color: #0093e6
}

.cleanCondition {
    margin-top: 8px;
    text-align: right
}

.cleanCondition a {
    padding: 1px 5px;
    color: #9a9a9a;
    border: 1px solid #ccc
}

.cleanCondition a:hover {
    color: #0093e6;
    border-color: #0093e6
}

.fuxuanku {
    display: none
}

.fuxuanku-lable {
    box-sizing: border-box;
    max-width: 100%;
    display: inline-block;
    padding: 0 8px 2px 4px;
    border: 1px solid #fff
}

.fuxuanku-lable.active {
    position: relative;
    border-color: #0093e6
}

.fuxuanku-lable.active i {
    display: block;
    position: absolute;
    bottom: 0;
    right: 0;
    width: 9px;
    height: 9px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png) no-repeat -254px -165px
}

.disabled-mask {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: .5;
    background: #f1f1f1;
    z-index: 1;
    cursor: not-allowed
}

.viewer-close:before,.viewer-flip-horizontal:before,.viewer-flip-vertical:before,.viewer-fullscreen-exit:before,.viewer-fullscreen:before,.viewer-next:before,.viewer-one-to-one:before,.viewer-play:before,.viewer-prev:before,.viewer-reset:before,.viewer-rotate-left:before,.viewer-rotate-right:before,.viewer-zoom-in:before,.viewer-zoom-out:before {
    background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARgAAAAUCAYAAABWOyJDAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNui8sowAAAQPSURBVHic7Zs/iFxVFMa/0U2UaJGksUgnIVhYxVhpjDbZCBmLdAYECxsRFBTUamcXUiSNncgKQbSxsxH8gzAP3FU2jY0kKKJNiiiIghFlccnP4p3nPCdv3p9778vsLOcHB2bfveeb7955c3jvvNkBIMdxnD64a94GHMfZu3iBcRynN7zAOI7TG15gHCeeNUkr8zaxG2lbYDYsdgMbktBsP03jdQwljSXdtBhLOmtjowC9Mg9L+knSlcD8TNKpSA9lBpK2JF2VdDSR5n5J64m0qli399hNFMUlpshQii5jbXTbHGviB0nLNeNDSd9VO4A2UdB2fp+x0eCnaXxWXGA2X0au/3HgN9P4LFCjIANOJdrLr0zzZ+BEpNYDwKbpnQMeAw4m8HjQtM6Z9qa917zPQwFr3M5KgA6J5rTJCdFZJj9/lyvGhsDvwFNVuV2MhhjrK6b9bFiE+j1r87eBl4HDwCF7/U/k+ofAX5b/EXBv5JoLMuILzf3Ap6Z3EzgdqHMCuF7hcQf4HDgeoHnccncqdK/TvSDWffFXI/exICY/xZyqc6XLWF1UFZna4gJ7q8BsRvgd2/xXpo6P+D9dfT7PpECtA3cnWPM0GXGFZh/wgWltA+cDNC7X+AP4GzjZQe+k5dRxuYPeiuXU7e1qwLpDz7dFjXKRaSwuMLvAlG8zZlG+YmiK1HoFqT7wP2z+4Q45TfEGcMt01xLoNZEBTwRqD4BLpnMLeC1A41UmVxsXgXeBayV/Wx20rpTyrpnWRft7p6O/FdqzGrDukPNtkaMoMo3FBdBSQMOnYBCReyf05s126fU9ytfX98+mY54Kxnp7S9K3kj6U9KYdG0h6UdLbkh7poFXMfUnSOyVvL0h6VtIXHbS6nOP+s/Zm9mvyXW1uuC9ohZ72E9uDmXWLJOB1GxsH+DxPftsB8B6wlGDN02TAkxG6+4D3TWsbeC5CS8CDFce+AW500LhhOW2020TRjK3b21HEmgti9m0RonxbdMZeVzV+/4tF3cBpP7E9mKHNL5q8h5g0eYsCMQz0epq8gQrwMXAgcs0FGXGFRcB9wCemF9PkbYqM/Bas7fxLwNeJPdTdpo4itQti8lPMqTpXuozVRVXPpbHI3KkNTB1NfkL81j2mvhDp91HgV9MKuRIqrykj3WPq4rHyL+axj8/qGPmTqi6F9YDlHOvJU6oYcTsh/TYSzWmTE6JT19CtLTJt32D6CmHe0eQn1O8z5AXgT4sx4Vcu0/EQecMydB8z0hUWkTd2t4CrwNEePqMBcAR4mrBbwyXLPWJa8zrXmmLEhNBmfpkuY2102xxrih+pb+ieAb6vGhuA97UcJ5KR8gZ77K+99xxeYBzH6Q3/Z0fHcXrDC4zjOL3hBcZxnN74F+zlvXFWXF9PAAAAAElFTkSuQmCC");
    background-repeat: no-repeat;
    background-size: 280px;
    color: transparent;
    display: block;
    font-size: 0;
    height: 20px;
    line-height: 0;
    width: 20px
}

.viewer-zoom-in:before {
    background-position: 0 0;
    content: "Zoom In"
}

.viewer-zoom-out:before {
    background-position: -20px 0;
    content: "Zoom Out"
}

.viewer-one-to-one:before {
    background-position: -40px 0;
    content: "One to One"
}

.viewer-reset:before {
    background-position: -60px 0;
    content: "Reset"
}

.viewer-prev:before {
    background-position: -80px 0;
    content: "Previous"
}

.viewer-play:before {
    background-position: -100px 0;
    content: "Play"
}

.viewer-next:before {
    background-position: -120px 0;
    content: "Next"
}

.viewer-rotate-left:before {
    background-position: -140px 0;
    content: "Rotate Left"
}

.viewer-rotate-right:before {
    background-position: -160px 0;
    content: "Rotate Right"
}

.viewer-flip-horizontal:before {
    background-position: -180px 0;
    content: "Flip Horizontal"
}

.viewer-flip-vertical:before {
    background-position: -200px 0;
    content: "Flip Vertical"
}

.viewer-fullscreen:before {
    background-position: -220px 0;
    content: "Enter Full Screen"
}

.viewer-fullscreen-exit:before {
    background-position: -240px 0;
    content: "Exit Full Screen"
}

.viewer-close:before {
    background-position: -260px 0;
    content: "Close"
}

.viewer-container {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    bottom: 0;
    direction: ltr;
    font-size: 0;
    left: 0;
    line-height: 0;
    overflow: hidden;
    position: absolute;
    right: 0;
    top: 0;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none
}

.viewer-container::selection,.viewer-container ::selection {
    background-color: transparent
}

.viewer-container:focus {
    outline: 0
}

.viewer-container img {
    display: block;
    height: auto;
    max-height: none!important;
    max-width: none!important;
    min-height: 0!important;
    min-width: 0!important;
    width: 100%
}

.viewer-canvas {
    bottom: 0;
    left: 0;
    overflow: hidden;
    position: absolute;
    right: 0;
    top: 0
}

.viewer-canvas>img {
    height: auto;
    margin: 15px auto;
    max-width: 90%!important;
    width: auto
}

.viewer-footer {
    bottom: 0;
    left: 0;
    overflow: hidden;
    position: absolute;
    right: 0;
    text-align: center
}

.viewer-navbar {
    background-color: rgba(0,0,0,.5);
    overflow: hidden
}

.viewer-list {
    box-sizing: content-box;
    height: 50px;
    margin: 0;
    overflow: hidden;
    padding: 1px 0
}

.viewer-list>li {
    color: transparent;
    cursor: pointer;
    float: left;
    font-size: 0;
    height: 50px;
    line-height: 0;
    opacity: .5;
    overflow: hidden;
    -webkit-transition: opacity .15s;
    transition: opacity .15s;
    width: 30px
}

.viewer-list>li:focus,.viewer-list>li:hover {
    opacity: .75
}

.viewer-list>li:focus {
    outline: 0
}

.viewer-list>li+li {
    margin-left: 1px
}

.viewer-list>.viewer-loading {
    position: relative
}

.viewer-list>.viewer-loading:after {
    border-width: 2px;
    height: 20px;
    margin-left: -10px;
    margin-top: -10px;
    width: 20px
}

.viewer-list>.viewer-active,.viewer-list>.viewer-active:focus,.viewer-list>.viewer-active:hover {
    opacity: 1
}

.viewer-player {
    background-color: #000;
    bottom: 0;
    cursor: none;
    display: none;
    right: 0;
    z-index: 1
}

.viewer-player,.viewer-player>img {
    left: 0;
    position: absolute;
    top: 0
}

.viewer-toolbar>ul {
    display: inline-block;
    margin: 0 auto 5px;
    overflow: hidden;
    padding: 6px 3px
}

.viewer-toolbar>ul>li {
    background-color: rgba(0,0,0,.5);
    border-radius: 50%;
    cursor: pointer;
    float: left;
    height: 24px;
    overflow: hidden;
    -webkit-transition: background-color .15s;
    transition: background-color .15s;
    width: 24px
}

.viewer-toolbar>ul>li:focus,.viewer-toolbar>ul>li:hover {
    background-color: rgba(0,0,0,.8)
}

.viewer-toolbar>ul>li:focus {
    box-shadow: 0 0 3px #fff;
    outline: 0;
    position: relative;
    z-index: 1
}

.viewer-toolbar>ul>li:before {
    margin: 2px
}

.viewer-toolbar>ul>li+li {
    margin-left: 1px
}

.viewer-toolbar>ul>.viewer-small {
    height: 18px;
    margin-bottom: 3px;
    margin-top: 3px;
    width: 18px
}

.viewer-toolbar>ul>.viewer-small:before {
    margin: -1px
}

.viewer-toolbar>ul>.viewer-large {
    height: 30px;
    margin-bottom: -3px;
    margin-top: -3px;
    width: 30px
}

.viewer-toolbar>ul>.viewer-large:before {
    margin: 5px
}

.viewer-tooltip {
    background-color: rgba(0,0,0,.8);
    border-radius: 10px;
    color: #fff;
    display: none;
    font-size: 12px;
    height: 20px;
    left: 50%;
    line-height: 20px;
    margin-left: -25px;
    margin-top: -10px;
    position: absolute;
    text-align: center;
    top: 50%;
    width: 50px
}

.viewer-title {
    color: #ccc;
    display: inline-block;
    font-size: 12px;
    line-height: 1.2;
    margin: 0 5% 5px;
    max-width: 90%;
    opacity: .8;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-transition: opacity .15s;
    transition: opacity .15s;
    white-space: nowrap
}

.viewer-title:hover {
    opacity: 1
}

.viewer-button {
    -webkit-app-region: no-drag;
    background-color: rgba(0,0,0,.5);
    border-radius: 50%;
    cursor: pointer;
    height: 80px;
    overflow: hidden;
    position: absolute;
    right: -40px;
    top: -40px;
    -webkit-transition: background-color .15s;
    transition: background-color .15s;
    width: 80px
}

.viewer-button:focus,.viewer-button:hover {
    background-color: rgba(0,0,0,.8)
}

.viewer-button:focus {
    box-shadow: 0 0 3px #fff;
    outline: 0
}

.viewer-button:before {
    bottom: 15px;
    left: 15px;
    position: absolute
}

.viewer-fixed {
    position: fixed
}

.viewer-open {
    overflow: hidden
}

.viewer-show {
    display: block
}

.viewer-hide {
    display: none
}

.viewer-backdrop {
    background-color: rgba(0,0,0,.5)
}

.viewer-invisible {
    visibility: hidden
}

.viewer-move {
    cursor: move;
    cursor: grab
}

.viewer-fade {
    opacity: 0
}

.viewer-in {
    opacity: 1
}

.viewer-transition {
    -webkit-transition: all .3s;
    transition: all .3s
}

@-webkit-keyframes viewer-spinner {
    0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg)
    }

    to {
        -webkit-transform: rotate(1turn);
        transform: rotate(1turn)
    }
}

@keyframes viewer-spinner {
    0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg)
    }

    to {
        -webkit-transform: rotate(1turn);
        transform: rotate(1turn)
    }
}

.viewer-loading:after {
    -webkit-animation: viewer-spinner 1s linear infinite;
    animation: viewer-spinner 1s linear infinite;
    border: 4px solid hsla(0,0%,100%,.1);
    border-left-color: hsla(0,0%,100%,.5);
    border-radius: 50%;
    content: "";
    display: inline-block;
    height: 40px;
    left: 50%;
    margin-left: -20px;
    margin-top: -20px;
    position: absolute;
    top: 50%;
    width: 40px;
    z-index: 1
}

@media (max-width: 767px) {
    .viewer-hide-xs-down {
        display:none
    }
}

@media (max-width: 991px) {
    .viewer-hide-sm-down {
        display:none
    }
}

@media (max-width: 1199px) {
    .viewer-hide-md-down {
        display:none
    }
}

.cpt-loading-mask * {
    box-sizing: border-box
}

.cpt-loading-mask.column {
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: transparent;
    z-index: 100;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    -webkit-user-select: none;
    user-select: none
}

.cpt-loading-mask.column .div-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 260px;
    background: rgba(0,0,0,.6);
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);
    -webkit-transform: translate3d(-50%,-50%,0);
    transform: translate3d(-50%,-50%,0);
    border-radius: 12px;
    padding: 16px
}

.cpt-loading-mask.column .div-loading .loading {
    position: relative;
    width: 60px;
    height: 60px;
    background: transparent;
    margin: 0 auto
}

.cpt-loading-mask.column .div-loading .loading.origin div {
    width: 80%;
    height: 80%;
    position: absolute;
    left: 10%;
    top: 10%;
    filter: progid:DXImageTransform.Microsoft.Alpha(enabled=false);
    opacity: 1;
    -webkit-animation: load 2.28s linear infinite;
    animation: load 2.28s linear infinite
}

.cpt-loading-mask.column .div-loading .loading.origin div span {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fbc9b9;
    position: absolute;
    left: 50%;
    margin-top: -10px;
    margin-left: -10px
}

.cpt-loading-mask.column .div-loading .loading.origin div:first-child {
    -webkit-animation-delay: .2s;
    animation-delay: .2s
}

.cpt-loading-mask.column .div-loading .loading.origin div:nth-child(2) {
    -webkit-animation-delay: .4s;
    animation-delay: .4s
}

.cpt-loading-mask.column .div-loading .loading.origin div:nth-child(3) {
    -webkit-animation-delay: .6s;
    animation-delay: .6s
}

.cpt-loading-mask.column .div-loading .loading.origin div:nth-child(4) {
    -webkit-animation-delay: .8s;
    animation-delay: .8s
}

.cpt-loading-mask.column .div-loading .loading.origin div:nth-child(5) {
    -webkit-animation-delay: 1s;
    animation-delay: 1s
}

.cpt-loading-mask.column .div-loading .loading.pic {
    width: 80px;
    height: 80px
}

.cpt-loading-mask.column .div-loading .loading.pic img {
    width: 100%;
    height: 100%
}

.cpt-loading-mask.column .div-loading .loading-title {
    width: 100%;
    text-align: center;
    color: #fff;
    padding: 2px 0;
    font-size: 16px;
    margin-bottom: 20px;
    white-space: nowrap;
    overflow: hidden;
    -ms-text-overflow: ellipsis;
    text-overflow: ellipsis
}

.cpt-loading-mask.column .div-loading .loading-discription {
    width: 100%;
    text-align: center;
    color: #fff;
    font-size: 14px;
    margin-top: 20px
}

.cpt-loading-mask.row {
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: transparent;
    z-index: 100;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    -webkit-user-select: none;
    user-select: none
}

.cpt-loading-mask.row .div-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 260px;
    background: rgba(0,0,0,.6);
    display: -webkit-flex;
    display: -webkit-box;
    display: flex;
    -webkit-align-items: center;
    -webkit-box-align: center;
    align-items: center;
    -webkit-justify-content: center;
    -webkit-box-pack: center;
    justify-content: center;
    -webkit-flex-direction: row-reverse;
    -webkit-box-orient: horizontal;
    -webkit-box-direction: reverse;
    flex-direction: row-reverse;
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);
    -webkit-transform: translate3d(-50%,-50%,0);
    transform: translate3d(-50%,-50%,0);
    border-radius: 12px;
    padding: 15px
}

.cpt-loading-mask.row .div-loading .loading {
    position: relative;
    width: 60px;
    height: 60px;
    background: transparent;
    float: left
}

.cpt-loading-mask.row .div-loading .loading.origin div {
    width: 80%;
    height: 80%;
    position: absolute;
    left: 10%;
    top: 10%;
    filter: progid:DXImageTransform.Microsoft.Alpha(enabled=false);
    opacity: 1;
    -webkit-animation: load 2.28s linear infinite;
    animation: load 2.28s linear infinite
}

.cpt-loading-mask.row .div-loading .loading.origin div span {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fbc9b9;
    position: absolute;
    left: 50%;
    margin-top: -10px;
    margin-left: -10px
}

.cpt-loading-mask.row .div-loading .loading.origin div:first-child {
    -webkit-animation-delay: .2s;
    animation-delay: .2s
}

.cpt-loading-mask.row .div-loading .loading.origin div:nth-child(2) {
    -webkit-animation-delay: .4s;
    animation-delay: .4s
}

.cpt-loading-mask.row .div-loading .loading.origin div:nth-child(3) {
    -webkit-animation-delay: .6s;
    animation-delay: .6s
}

.cpt-loading-mask.row .div-loading .loading.origin div:nth-child(4) {
    -webkit-animation-delay: .8s;
    animation-delay: .8s
}

.cpt-loading-mask.row .div-loading .loading.origin div:nth-child(5) {
    -webkit-animation-delay: 1s;
    animation-delay: 1s
}

.cpt-loading-mask.row .div-loading .loading.pic {
    width: 80px;
    height: 80px
}

.cpt-loading-mask.row .div-loading .loading.pic img {
    width: 100%;
    height: 100%
}

.cpt-loading-mask.row .div-loading .loading-title {
    width: 72%;
    text-align: center;
    color: #fff;
    font-size: 16px;
    padding: 2px 0 2px 20px;
    margin-bottom: 0;
    white-space: nowrap;
    overflow: hidden;
    -ms-text-overflow: ellipsis;
    text-overflow: ellipsis
}

.cpt-loading-mask.row .div-loading .loading-discription {
    display: none;
    width: 100%;
    text-align: center;
    color: #fff;
    font-size: 12px;
    margin-top: 20px
}

.animated {
    -webkit-animation-duration: .5s;
    animation-duration: .5s;
    -webkit-animation-fill-mode: both;
    animation-fill-mode: both
}

.animated.infinite {
    -webkit-animation-iteration-count: infinite;
    animation-iteration-count: infinite
}

@-webkit-keyframes fadeInNoTransform {
    0% {
        opacity: 0
    }

    to {
        opacity: 1
    }
}

@keyframes fadeInNoTransform {
    0% {
        opacity: 0
    }

    to {
        opacity: 1
    }
}

.fadeInNoTransform {
    -webkit-animation-name: fadeInNoTransform;
    animation-name: fadeInNoTransform
}

@-webkit-keyframes fadeOutNoTransform {
    0% {
        opacity: 1
    }

    to {
        opacity: 0
    }
}

@keyframes fadeOutNoTransform {
    0% {
        opacity: 1
    }

    to {
        opacity: 0
    }
}

.fadeOutNoTransform {
    -webkit-animation-name: fadeOutNoTransform;
    animation-name: fadeOutNoTransform
}

@-webkit-keyframes load {
    0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg)
    }

    10% {
        -webkit-transform: rotate(45deg);
        transform: rotate(45deg)
    }

    50% {
        filter: progid:DXImageTransform.Microsoft.Alpha(enabled=false);
        opacity: 1;
        -webkit-transform: rotate(160deg);
        transform: rotate(160deg)
    }

    62% {
        filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=0);
        opacity: 0
    }

    65% {
        filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=0);
        opacity: 0;
        -webkit-transform: rotate(200deg);
        transform: rotate(200deg)
    }

    90% {
        -webkit-transform: rotate(340deg);
        transform: rotate(340deg)
    }

    to {
        -webkit-transform: rotate(1turn);
        transform: rotate(1turn)
    }
}

@keyframes load {
    0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg)
    }

    10% {
        -webkit-transform: rotate(45deg);
        transform: rotate(45deg)
    }

    50% {
        filter: progid:DXImageTransform.Microsoft.Alpha(enabled=false);
        opacity: 1;
        -webkit-transform: rotate(160deg);
        transform: rotate(160deg)
    }

    62% {
        filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=0);
        opacity: 0
    }

    65% {
        filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=0);
        opacity: 0;
        -webkit-transform: rotate(200deg);
        transform: rotate(200deg)
    }

    90% {
        -webkit-transform: rotate(340deg);
        transform: rotate(340deg)
    }

    to {
        -webkit-transform: rotate(1turn);
        transform: rotate(1turn)
    }
}

.page-confirm-customer-type {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 9999;
    display: none
}

.page-confirm-customer-type .mt2 {
    margin-top: 2px
}

.page-confirm-customer-type .line40 {
    margin-left: 15px;
    height: 40px;
    line-height: 40px
}

.page-confirm-customer-type .line-h40 {
    line-height: 40px
}

.page-confirm-customer-type .line-height-45 {
    line-height: 45px
}

.page-confirm-customer-type .line-height-36 {
    line-height: 36px
}

.page-confirm-customer-type .line-h15 {
    line-height: 15px
}

.page-confirm-customer-type .text-decoration-underline {
    text-decoration: underline
}

.page-confirm-customer-type .c0e83ce {
    color: #0e83ce
}

.page-confirm-customer-type .link-phone {
    width: 195px;
    height: 25px;
    line-height: 25px;
    border: none
}

.page-confirm-customer-type .confirm-customer-type-mask {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: #777;
    opacity: .6;
    z-index: 9998
}

.page-confirm-customer-type .confirm-customer-content {
    width: 100%;
    height: 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    overflow: auto;
    position: relative;
    z-index: 9999
}

.page-confirm-customer-type .confirm-customer-type-main {
    position: relative;
    z-index: 9999;
    margin: auto;
    width: 800px;
    height: 750px;
    background-color: #fff;
    border: 4px solid #d9d9d9
}

.page-confirm-customer-type .confirm-customer-type-main img {
    vertical-align: -4px
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-title {
    position: relative;
    height: 34px;
    line-height: 34px;
    text-indent: 15px;
    border-bottom: 1px solid #dedede;
    font-size: 14px;
    font-weight: 700;
    color: #444;
    background: #f2f2f2
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content {
    padding: 10px 15px
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .m-slt {
    position: relative;
    padding: 10px 35px;
    border: 1px solid #ccc;
    font-size: 12px;
    cursor: pointer
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .m-slt.cur {
    border: 2px solid #0093e6
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .sub-tit {
    font-size: 14px;
    font-weight: 700
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .person-wrap .person-form {
    margin: 10px auto 0
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .person-wrap table {
    margin-top: 10px;
    border: none
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .person-wrap table .name-input {
    width: 195px;
    height: 25px;
    line-height: 25px
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .person-wrap table .icon-ok {
    position: relative;
    left: -15px
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .person-wrap table .confirm-person-btn {
    width: 113px;
    height: 30px;
    border: 1px solid #34aff5;
    font-size: 14px;
    color: #fff;
    cursor: pointer;
    background: #34aff5
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .enterprise-wrap .enterprise-form {
    margin: 10px auto 0
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .enterprise-wrap .enterprise-input {
    width: 195px;
    height: 25px;
    line-height: 25px
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .enterprise-wrap .confirm-enterprise-btn {
    float: left;
    width: 113px;
    height: 30px;
    border: 1px solid #34aff5;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    background: #34aff5
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .enterprise-wrap .upload-wrapper .upload-before {
    position: relative
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .enterprise-wrap .upload-wrapper .upload-before .upload-btn {
    width: 95px;
    height: 28px;
    text-align: center;
    color: #ff7800;
    background: #fff;
    border-radius: 4px;
    margin: 15px 0;
    border: 1px solid #ff7800
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .enterprise-wrap .upload-wrapper .upload-before .upload-file {
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    position: absolute;
    opacity: 0;
    outline: none;
    font-size: 0;
    width: 100px;
    cursor: pointer
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .enterprise-wrap .upload-wrapper .upload-after {
    display: none
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .enterprise-wrap .upload-wrapper .upload-after .upload-btn {
    color: #0093e6;
    margin-left: 10px;
    position: relative;
    cursor: pointer
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .enterprise-wrap .upload-wrapper .upload-after .upload-btn .upload-file {
    position: absolute;
    top: 0;
    opacity: 0;
    bottom: 0;
    right: 0;
    width: 40px;
    height: 30px;
    cursor: pointer
}

.page-confirm-customer-type .confirm-customer-type-main .confirm-customer-type-content .enterprise-wrap .upload-wrapper .upload-after .file-img {
    width: 110px;
    height: 110px;
    border-radius: 4px;
    border: 1px solid #f2f2f2;
    object-fit: contain;
    overflow: hidden
}

.page-confirm-customer-type .enterprise-modal {
    margin-top: -150px;
    margin-left: -254px;
    width: 500px
}

.page-confirm-customer-type .enterprise-modal .btn-wrapper {
    margin-top: 25px;
    text-align: center
}

.page-confirm-customer-type .enterprise-modal .btn-wrapper .blue-btn {
    height: 28px;
    width: 72px;
    border: none;
    border-radius: 2px;
    color: #fff;
    background: #0093e6
}

.page-confirm-customer-type .confirm-submit-btn {
    position: absolute;
    bottom: 25px;
    margin-left: -57px;
    left: 50%
}

.page-confirm-customer-type .dialog-reset-co-wrap {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    bottom: 0;
    right: 0
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,.5)
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-main {
    z-index: 2;
    position: relative;
    margin: 30vh auto 0;
    width: 565px;
    height: 246px;
    background: #fff;
    border-radius: 5px
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-main .dialog-reset-co-title {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    height: 50px;
    padding: 0 20px;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    border-bottom: 1px solid #e8e8e8
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-main .dialog-reset-co-title p {
    font-size: 16px;
    color: #444
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-main .dialog-reset-co-title .close-dialog-reset-co {
    cursor: pointer;
    display: block;
    width: 14px;
    height: 14px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -286px -317px
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-main .content {
    padding: 35px 20px 0
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-main .content p {
    font-size: 14px;
    color: #666;
    line-height: 24px
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-main .dialog-reset-co-footer {
    position: absolute;
    bottom: 20px;
    width: 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-pack: end;
    -webkit-justify-content: flex-end;
    justify-content: flex-end;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-main .dialog-reset-co-footer .btn {
    cursor: pointer;
    margin-right: 20px;
    width: 110px;
    height: 40px;
    background: #f8f8f8;
    border-radius: 5px;
    border: 1px solid #dedede;
    color: #444;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-main .dialog-reset-co-footer .btn:hover {
    opacity: .9
}

.page-confirm-customer-type .dialog-reset-co-wrap .dialog-reset-co-main .dialog-reset-co-footer .btn.btn-blue {
    background: #0093e6;
    color: #fff
}

.coupon-main {
    display: none;
    width: 256px;
    height: 100vh;
    background: #fff;
    border-left: 1px solid #dedede;
    position: fixed;
    top: 0;
    right: -281px;
    z-index: 10000
}

.coupon-main .coupon-top {
    width: 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    height: 76px;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    width: 256px;
    background: #eafaff;
    position: relative
}

.coupon-main .coupon-top i {
    display: block;
    width: 34px;
    height: 31px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/coupon.f2e10951.png) no-repeat 50%;
    margin-right: 7px
}

.coupon-main .coupon-top h3 {
    font-size: 16px;
    color: #444
}

.coupon-main .coupon-top .close {
    width: 20px;
    height: 20px;
    position: absolute;
    top: 12px;
    right: 12px;
    color: #9e9e9e;
    cursor: pointer;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAs0lEQVQ4T2NkoDJgpLJ5DLQ1MDMzU+/v378Jv3//bp8/f/5rfK5PTEwUZWVlrWRmZl4wffr0SzC1KC5MS0vrA0oUAvEVoKFOuAyFGrYPqE4HiPtnzZpVhNVANIVYDSWkBiMM8WkgZBjIlVgjBZtGkGJgmMG8iTNIcMYyuqHQMAKFGd7wxZts0AwFmYnXMJxehsUYVQ2kqpepGilUTTbEpDNCamib9aheOFCjbKRteUgNFwIAU2bGFdWl3iAAAAAASUVORK5CYII=) no-repeat 50%
}

.coupon-main .coupon-tabs {
    width: 100%;
    box-sizing: border-box;
    height: 30px;
    border: 1px solid #199fe9;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.coupon-main .coupon-tabs .title {
    -webkit-box-flex: 1;
    -webkit-flex: 1;
    flex: 1;
    height: 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
    color: #444
}

.coupon-main .coupon-tabs .title.active {
    background: #199fe9;
    color: #fff
}

.coupon-main .coupons {
    overflow-x: hidden;
    height: 100%;
    padding-bottom: 80px;
    box-sizing: border-box
}

.coupon-main .coupons::-webkit-scrollbar {
    width: 5px;
    height: 1px
}

.coupon-main .coupons::-webkit-scrollbar-thumb {
    border-radius: 5px;
    box-shadow: inset 0 0 5px rgba(0,0,0,.2);
    background: #999
}

.coupon-main .coupons::-webkit-scrollbar-track {
    box-shadow: inset 0 0 5px rgba(0,0,0,.2);
    border-radius: 10px;
    background: #ededed
}

.coupon-main #waitReceive {
    display: block
}

.coupon-main #receive {
    display: none
}

.coupon-main .coupon-area {
    width: 100%;
    overflow: hidden
}

.coupon-main .coupon-area .mar_bot {
    margin-bottom: 14px;
    overflow: hidden
}

.coupon-main .coupon-area .mar_bot .line {
    width: calc(50% - 40.5px);
    height: 1px;
    background: #e9e9e9;
    margin-top: 9.5px;
    float: left
}

.coupon-main .coupon-area .mar_bot .title {
    width: 81px;
    text-align: center;
    font-size: 14px;
    color: #666;
    line-height: 20px;
    float: left
}

.coupon-main .coupon-area .coupon-box .coupon-item {
    position: relative;
    width: 192px;
    height: 140px;
    font-size: 12px;
    margin: 16px auto 0;
    box-sizing: border-box;
    padding: 0 12px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/bg.9cd02f3c.png);
    background-repeat: no-repeat;
    background-size: 100% 100%
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-btn {
    position: absolute;
    bottom: 12px;
    left: 50%;
    margin-left: -84px;
    box-sizing: border-box;
    width: 168px;
    height: 26px;
    text-align: center;
    background: #199fe9;
    font-size: 12px;
    font-weight: 400;
    color: #fff;
    line-height: 26px;
    cursor: pointer;
    border-radius: 3.52px
}

.coupon-main .coupon-area .coupon-box .coupon-item .over-btn {
    cursor: default
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-top-title,.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-top-title .coupon-item-con-desc {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-top-title .coupon-item-con-desc {
    margin-top: 8px
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-top-title .coupon-item-con-desc .icon {
    font-weight: 700;
    font-size: 14px;
    color: #0d567e;
    line-height: 40px
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-top-title .coupon-item-con-desc .money {
    font-weight: 700;
    font-size: 28px;
    color: #0d567e;
    line-height: 40px
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-top-title .coupon-item-con-desc .express-free {
    line-height: 40px;
    font-size: 24px;
    font-weight: 700;
    color: #0d567e
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-top-title .coupon-item-con-desc .disable-color {
    color: #8897a0!important
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-top-title .condition-brought {
    margin-left: 8px;
    margin-top: 8px
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-top-title .condition-brought .condition {
    line-height: 40px;
    text-align: center;
    color: #0d567e
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-top-title .condition-brought .condition-disable {
    line-height: 40px;
    text-align: center;
    color: #a5a5a6
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .brought {
    margin-top: 6px;
    color: #666
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .brought.dis-color {
    color: #999
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .plus-btn {
    width: 71px;
    height: 22px;
    text-align: center;
    line-height: 22px;
    font-size: 12px;
    color: #fffb90;
    position: absolute;
    left: 7px;
    top: -2px
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .plus-btn i {
    display: block;
    width: 71px;
    height: 22px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plus.ebe219cb.svg) 50% no-repeat
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .plus-btn .plus-used {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plus-used.b9c03c6d.svg) 50% no-repeat
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .plus-btn span {
    position: absolute;
    left: 10px;
    top: -1px
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .colorf {
    color: #fff
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-name .ellipsis {
    font-size: 12px;
    color: #444
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con .coupon-item-name .ellipsis.dis-color {
    color: #666
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-con h3 {
    max-width: 150px;
    font-size: 13px;
    font-weight: 700;
    color: #333;
    display: inline-block
}

.coupon-main .coupon-area .coupon-box .coupon-item.receive {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/ylq.393cc035.png)
}

.coupon-main .coupon-area .coupon-box .coupon-item.receive .coupon-item-btn {
    background: -webkit-linear-gradient(left,#f4e6d6,#ffd9a8);
    background: linear-gradient(90deg,#f4e6d6,#ffd9a8);
    color: #444
}

.coupon-main .coupon-area .coupon-box .coupon-item.receive .coupon-item-con .coupon-item-top-title .express-free,.coupon-main .coupon-area .coupon-box .coupon-item.receive .coupon-item-con .coupon-item-top-title .icon,.coupon-main .coupon-area .coupon-box .coupon-item.receive .coupon-item-con .coupon-item-top-title .money {
    color: #fff
}

.coupon-main .coupon-area .coupon-box .coupon-item.receive .coupon-item-con .coupon-item-top-title .condition,.coupon-main .coupon-area .coupon-box .coupon-item.receive .coupon-item-con .coupon-item-top-title .condition-brought {
    color: #e6f6ff
}

.coupon-main .coupon-area .coupon-box .coupon-item.receive .coupon-item-con .coupon-item-name .ellipsis {
    color: #fff
}

.coupon-main .coupon-area .coupon-box .coupon-item.receive .coupon-item-con .brought {
    color: #d8f1ff
}

.coupon-main .coupon-area .coupon-box .coupon-item.used {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/bklq.4816918f.png)
}

.coupon-main .coupon-area .coupon-box .coupon-item.used .coupon-item-btn {
    background: #b0d1ed;
    color: #fff
}

.coupon-main .coupon-area .coupon-box .coupon-item.used .coupon-item-con .coupon-item-name .ellipsis {
    color: #666
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plusbg.9830c1f3.png);
    background-size: 192px 140px
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus .coupon-item-con .brought {
    margin-left: 68px
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus .coupon-item-btn {
    background: #61679e
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.receive {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plusylq.d863b2bb.png)
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.receive .coupon-item-btn {
    background: -webkit-linear-gradient(left,#f4e6d6,#ffd9a8);
    background: linear-gradient(90deg,#f4e6d6,#ffd9a8);
    color: #444
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.receive .coupon-item-con .coupon-item-top-title .condition,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.receive .coupon-item-con .coupon-item-top-title .condition-brought,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.receive .coupon-item-con .coupon-item-top-title .express-free,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.receive .coupon-item-con .coupon-item-top-title .icon,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.receive .coupon-item-con .coupon-item-top-title .money {
    color: #ffefd8
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.receive .coupon-item-con .coupon-item-name .ellipsis {
    color: #fff
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.receive .coupon-item-con .brought {
    color: #ffd49f
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.used {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plusbklq.c65de8fc.png)
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.used .coupon-item-btn {
    background: #b3c2e1
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.used .coupon-item-con .coupon-item-top-title .coupon-item-con-desc .icon,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-plus.used .coupon-item-con .coupon-item-top-title .coupon-item-con-desc .money {
    color: #8897a0
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/mrobg.a1f417a8.svg);
    background-size: 100% 100%
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro .coupon-item-top-title .condition-brought .condition,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro .coupon-item-top-title .coupon-item-con-desc .express-free,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro .coupon-item-top-title .coupon-item-con-desc .icon,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro .coupon-item-top-title .coupon-item-con-desc .money {
    color: #527cf0
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro .coupon-item-btn {
    background: #567eeb
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.receive {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/mroylq.1598cd44.svg)
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.receive .coupon-item-btn {
    background: -webkit-linear-gradient(left,#f4e6d6,#ffd9a8);
    background: linear-gradient(90deg,#f4e6d6,#ffd9a8);
    color: #444
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.receive .coupon-item-con .coupon-item-name .ellipsis,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.receive .coupon-item-con .coupon-item-top-title .condition,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.receive .coupon-item-con .coupon-item-top-title .condition-brought,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.receive .coupon-item-con .coupon-item-top-title .express-free,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.receive .coupon-item-con .coupon-item-top-title .icon,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.receive .coupon-item-con .coupon-item-top-title .money {
    color: #fff
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.receive .coupon-item-con .brought {
    color: #d8f1ff
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.used {
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/mroused.2dfe04e9.svg)
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.used .coupon-item-btn {
    background: #b7c5ed
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.used .coupon-item-con .coupon-item-top-title .coupon-item-con-desc .icon,.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.used .coupon-item-con .coupon-item-top-title .coupon-item-con-desc .money {
    color: #8897a0
}

.coupon-main .coupon-area .coupon-box .coupon-item.coupon-item-mro.used .coupon-item-con .coupon-item-top-title .coupon-item-con-desc .disable-color {
    color: #b7c5ed!important
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-tag {
    position: absolute;
    width: 73px;
    height: 64px;
    top: 1px;
    right: 1px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/tag.f329dc1c.png);
    background-repeat: no-repeat;
    background-size: 100% 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.coupon-main .coupon-area .coupon-box .coupon-item .coupon-item-tag span {
    -webkit-transform: rotate(40deg);
    transform: rotate(40deg);
    display: block;
    position: relative;
    top: -8px;
    right: -10px;
    font-size: 12px;
    color: #fff
}

.coupon-main .plus-area .mar_bot .line {
    width: calc(50% - 69px)
}

.coupon-main .plus-area .mar_bot .title {
    width: 138px
}

.coupon-main .coupon-area:last-child {
    margin-bottom: 55px
}

.coupon-main .freight-money-icon {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    line-height: 14px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/help.59256c5f.svg) no-repeat;
    cursor: pointer;
    vertical-align: 2px;
    -webkit-filter: grayscale(1);
    filter: grayscale(1);
    z-index: 1
}

.coupon-main .freight-money-icon .pop-box {
    position: absolute;
    top: 25px;
    left: -32px;
    min-width: 100px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.coupon-main .freight-money-icon .pop-box .icon_tip_narrow {
    position: absolute;
    left: 32px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.coupon-main .freight-money-icon .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.coupon-main .freight-money-icon .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.coupon-main .freight-money-icon .pop-box .tip-text .text .freight-money {
    color: #333;
    font-weight: 700
}

#plus-coupon-contain .plus-main {
    display: none;
    width: 281px;
    height: 100vh;
    background: #fff;
    border-left: 1px solid #dedede;
    position: fixed;
    top: 0;
    right: -281px;
    z-index: 10001;
    overflow-x: hidden
}

#plus-coupon-contain .plus-main .plus-top {
    width: 100%;
    padding: 20px;
    position: relative
}

#plus-coupon-contain .plus-main .plus-top h3 {
    font-size: 16px;
    color: #666
}

#plus-coupon-contain .plus-main .plus-top .close {
    width: 14px;
    height: 14px;
    position: absolute;
    top: 24px;
    right: 50px;
    color: #9e9e9e;
    cursor: pointer;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -286px -317px
}

#plus-coupon-contain .plus-main .line {
    width: 100%;
    height: 1px;
    background: #e9e9e9
}

#plus-coupon-contain .plus-main .plus-contain {
    position: relative;
    height: 100%
}

#plus-coupon-contain .plus-main .plus-warp {
    overflow-x: hidden;
    position: absolute;
    left: 0;
    top: 0
}

#plus-coupon-contain .plus-main .plus-warp .plus-box {
    width: 281px;
    float: left;
    padding-bottom: 26px
}

#plus-coupon-contain .plus-main .plus-warp .plus-row {
    padding: 20px
}

#plus-coupon-contain .plus-main .plus-warp .plus-row .change-title {
    font-size: 14px;
    color: #444;
    line-height: 19px;
    float: left;
    letter-spacing: .78px
}

#plus-coupon-contain .plus-main .plus-warp .plus-row .btn-page {
    float: right;
    font-size: 14px;
    color: #999;
    letter-spacing: .2px
}

#plus-coupon-contain .plus-main .plus-warp .plus-row .btn-page span {
    cursor: default
}

#plus-coupon-contain .plus-main .plus-warp .plus-row .btn-page span:first-child,#plus-coupon-contain .plus-main .plus-warp .plus-row .btn-page span:last-child {
    cursor: pointer
}

#plus-coupon-contain .plus-main .plus-warp .plus-row .btn-page .page {
    width: 20px;
    line-height: 20px;
    text-align: center;
    display: inline-block;
    font-weight: 700
}

#plus-coupon-contain .plus-main .plus-warp .plus-row .btn-page .page:hover {
    border-radius: 10px;
    background: #e6eff4;
    color: #0093e6
}

#plus-coupon-contain .plus-main .plus-warp .plus-row .btn-page .cur-page {
    color: #0093e6
}

#plus-coupon-contain .plus-main .plus-warp .cur-product {
    width: 248px;
    height: 95px;
    border: 1px solid #e9e9e9;
    margin: 16px auto
}

#plus-coupon-contain .plus-main .plus-warp .cur-product ul {
    width: 100%;
    height: 100%;
    padding: 6px;
    overflow: hidden
}

#plus-coupon-contain .plus-main .plus-warp .cur-product ul li {
    float: left
}

#plus-coupon-contain .plus-main .plus-warp .cur-product ul li:first-child {
    width: 83px;
    height: 83px
}

#plus-coupon-contain .plus-main .plus-warp .cur-product ul li:first-child a,#plus-coupon-contain .plus-main .plus-warp .cur-product ul li:first-child img {
    display: block;
    width: 100%;
    height: 100%
}

#plus-coupon-contain .plus-main .plus-warp .cur-product ul li:last-child {
    margin-left: 6px
}

#plus-coupon-contain .plus-main .plus-warp .cur-product ul li:last-child div {
    width: 145px;
    font-size: 12px;
    color: #999;
    line-height: 17px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap
}

#plus-coupon-contain .plus-main .plus-warp .cur-product ul li:last-child div a.pName {
    color: #0093e6
}

#plus-coupon-contain .plus-main .plus-warp .cur-product ul li:last-child span {
    color: #444
}

#plus-coupon-contain .plus-main .plus-warp .tz-box button {
    display: block;
    width: 149px;
    height: 20px;
    background: #fff;
    border: 1px solid #e9e9e9;
    margin: 0 auto
}

#plus-coupon-contain .plus-main .plus-warp .tz-box button i {
    display: block;
    width: 18px;
    height: 10px;
    margin: 0 auto
}

#plus-coupon-contain .plus-main .plus-warp .tz-box button i.i-t {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTS0uNSA4TDcgLjUgMTQuNSA4IiBzdHJva2U9IiNFOUU5RTkiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

#plus-coupon-contain .plus-main .plus-warp .tz-box button i.i-b {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2LjUgMUw5IDguNSAxLjUgMSIgc3Ryb2tlPSIjRTlFOUU5IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==) 50% no-repeat
}

#plus-coupon-contain .plus-main .plus-warp .tz-box button:hover {
    background: #e9e9e9
}

#plus-coupon-contain .plus-main .plus-warp .tz-box button:hover i.i-t {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTS0uNSA4TDcgLjUgMTQuNSA4IiBzdHJva2U9IiM5QTlBOUEiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

#plus-coupon-contain .plus-main .plus-warp .tz-box button:hover i.i-b {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2LjUgMUw5IDguNSAxLjUgMSIgc3Ryb2tlPSIjOUE5QTlBIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==) 50% no-repeat
}

#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp {
    width: 248px;
    border: 1px solid #e9e9e9;
    margin: 15px auto;
    overflow: hidden;
    position: relative
}

#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp .tz-contain {
    width: 248px;
    position: absolute;
    left: 0;
    top: 0
}

#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp .tz-contain ul {
    width: 100%;
    height: 95px;
    padding: 6px;
    margin-top: 9px;
    overflow: hidden
}

#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp .tz-contain ul li {
    float: left
}

#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp .tz-contain ul li:first-child {
    width: 83px;
    height: 83px
}

#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp .tz-contain ul li:first-child a,#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp .tz-contain ul li:first-child img {
    display: block;
    width: 100%;
    height: 100%
}

#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp .tz-contain ul li:last-child {
    margin-left: 6px
}

#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp .tz-contain ul li:last-child div {
    width: 145px;
    font-size: 12px;
    color: #999;
    line-height: 17px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap
}

#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp .tz-contain ul li:last-child div a.pName {
    color: #0093e6
}

#plus-coupon-contain .plus-main .plus-warp .tz-box .tz-warp .tz-contain ul li:last-child span {
    color: #444
}

#plus-coupon-contain .plus-main .plus-warp i.add {
    display: block;
    width: 27px;
    height: 27px;
    margin: 15px auto;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjciIGhlaWdodD0iMjciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1LjMgMHYxMC44SDI3djQuNUgxNS4yOTlMMTUuMyAyN2gtMy42VjE1LjNIMHYtNC41aDExLjdWMGgzLjZ6IiBmaWxsPSIjRDhEOEQ4IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=) 50% no-repeat
}

#plus-coupon-contain .plus-main .plus-warp i.equal {
    display: block;
    width: 15px;
    height: 23px;
    margin: 15px auto;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUiIGhlaWdodD0iMjMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDB2MjNoLTQuNDEyVjBIMTV6TTQuNDEyIDB2MjNIMFYwaDQuNDEyeiIgZmlsbD0iI0Q4RDhEOCIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

#plus-coupon-contain .plus-main .plus-warp .tz-price {
    text-align: center;
    margin-bottom: 5px;
    color: #999
}

#plus-coupon-contain .plus-main .plus-warp .tz-price span {
    font-size: 18px;
    font-weight: 700;
    color: #ff7800
}

#plus-coupon-contain .plus-main .plus-warp .original-price {
    text-align: center;
    margin-bottom: 5px;
    color: #999
}

#plus-coupon-contain .plus-main .plus-warp .original-price span {
    color: #666
}

#plus-coupon-contain .plus-main .plus-warp .tz-num {
    text-align: center;
    margin-bottom: 8px;
    color: #999;
    position: relative
}

#plus-coupon-contain .plus-main .plus-warp .tz-num .tz-input {
    width: 80px;
    height: 20px;
    font-size: 12px
}

#plus-coupon-contain .plus-main .plus-warp .add-cart {
    margin-bottom: 4px;
    position: relative;
    text-align: center
}

#plus-coupon-contain .plus-main .plus-warp .add-cart button {
    display: inline-block;
    width: 92px;
    height: 33px;
    border: none;
    border-radius: 2px;
    background: #ff7800;
    color: #fff;
    margin: 0 auto
}

#plus-coupon-contain .plus-main .plus-warp .add-cart i {
    display: inline-block;
    width: 16px;
    height: 16px;
    cursor: pointer;
    vertical-align: middle;
    margin-left: 20px
}

#plus-coupon-contain .plus-main .plus-warp .add-cart i.tip {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/gantanhao.d8159e2e.svg) 50% no-repeat;
    position: relative
}

#plus-coupon-contain .plus-main .plus-warp .add-cart i.tip:hover+.tip-flag {
    display: block
}

#plus-coupon-contain .plus-main .plus-warp .add-cart .tip-flag {
    position: absolute;
    right: 115px;
    top: -30px;
    width: auto;
    height: auto;
    padding: 10px;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #eaeaea;
    text-align: left;
    display: none;
    z-index: 5
}

#plus-coupon-contain .plus-main .plus-warp .add-cart .tip-flag s {
    position: absolute;
    top: 40px;
    right: -14px;
    display: block;
    height: 0;
    width: 0;
    border: 6px dashed transparent;
    border-bottom: 6px solid #c8c8c8;
    -webkit-transform: rotate(90deg);
    transform: rotate(90deg)
}

#plus-coupon-contain .plus-main .plus-warp .add-cart .tip-flag i {
    position: absolute;
    top: -9px;
    left: -30px;
    display: block;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

#plus-coupon-contain .plus-main .plus-warp .tz-tip {
    text-align: center
}

#plus-coupon-contain .plus-main .plus-warp .tz-tip i {
    display: inline-block;
    vertical-align: bottom;
    margin-right: 6px;
    width: 20px;
    height: 20px
}

#plus-coupon-contain .plus-main .plus-warp .tz-tip i.tz-success {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjOTk5IiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSI5Ii8+PHBhdGggZD0iTTQgOC42MzlMNy41OSAxMiAxNCA2Ii8+PC9nPjwvc3ZnPg==) 50% no-repeat
}

#plus-coupon-contain .plus-main .plus-warp .tz-tip i.tz-max-num {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/warn.5d027012.svg) 50% no-repeat
}

#plus-coupon-contain .plus-main .plus-warp .tz-tip .l9h {
    line-height: 19px
}

#plus-coupon-contain .plus-main .plus-warp .tz-add-cart-tip,#plus-coupon-contain .plus-main .plus-warp .tz-max-tip {
    display: none
}

#plus-coupon-contain .plus-main .cFF7800 {
    color: #ff7800
}

#plus-coupon-contain .plus-main .c999 {
    color: #999
}

#plus-coupon-contain .plus-main .add-cart-modal-toast {
    z-index: 2;
    display: none;
    padding: 0 10px;
    position: absolute;
    top: -50px;
    left: 24px;
    height: 36px;
    line-height: 38px;
    text-align: center;
    font-size: 14px;
    color: #444;
    white-space: nowrap;
    border: 1px solid #cecbce;
    background: #fff;
    box-shadow: 0 0 1px 2px #eee
}

#plus-coupon-contain .plus-main .add-cart-modal-toast .icon {
    position: absolute;
    bottom: -10px;
    left: 30px;
    display: block;
    width: 11px;
    height: 10px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -276px -470px
}

#plus-coupon-contain .plus-main .user-select {
    -webkit-user-select: none;
    user-select: none
}

#plus-coupon-contain .plus-main .plus-box::-webkit-scrollbar {
    width: 10px;
    height: 1px
}

#plus-coupon-contain .plus-main .plus-box::-webkit-scrollbar-thumb {
    border-radius: 10px;
    box-shadow: inset 0 0 5px rgba(0,0,0,.2);
    background: #999
}

#plus-coupon-contain .plus-main .plus-box::-webkit-scrollbar-track {
    box-shadow: inset 0 0 5px rgba(0,0,0,.2);
    border-radius: 10px;
    background: #ededed
}

.stock {
    margin-top: 14px;
    width: 100%;
    height: 42px;
    line-height: 42px;
    border-top: 1px solid #e3e3e3;
    border-bottom: 1px solid #e3e3e3;
    background: #f1f1f1
}

.stock,.stock .aszzs {
    border-right: 1px solid #e3e3e3
}

.stock .aszzs {
    float: left;
    padding: 0 20px;
    height: 100%;
    color: #444;
    font-size: 14px
}

.stock .qwzzs {
    position: relative;
    background: #0093e6!important;
    color: #fff!important
}

.stock .qwzzs:hover {
    color: #fff
}

.stock .qwzzs .icon {
    display: none
}

.stock .small-square {
    width: 70px;
    height: 23px;
    line-height: 23px;
    margin: 8px 0;
    padding: 0;
    text-align: center;
    background: #fff;
    border: 1px solid #ddd;
    border-left: none
}

.stock .white-bottom-arrow .icon,.stock .white-top-arrow .icon {
    display: block;
    position: absolute;
    top: 5px;
    right: 7px;
    width: 10px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png) no-repeat -175px -3px
}

.stock .white-bottom-arrow .icon {
    background-position-x: -193px
}

.stock .input-style {
    float: left;
    margin: 0 15px;
    position: relative
}

.stock .input-style:hover .so-price {
    display: block
}

.stock .input-style b {
    font-weight: 400;
    margin: 0 4px
}

.stock .input-style .srk {
    width: 56px;
    height: 23px;
    line-height: 23px;
    color: #999
}

.stock .input-style .so-price {
    display: none;
    position: absolute;
    left: -6px;
    top: -1px;
    z-index: 1;
    width: 167px;
    height: 80px;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.stock .input-style .so-price .price-float {
    margin-left: 5px
}

.stock .input-style .so-price .so-btn {
    margin-top: -9px
}

.stock .input-style .so-price .so-btn button {
    background: transparent;
    border: none;
    font-size: 12px;
    color: #999;
    margin: 0;
    padding: 0
}

.stock .input-style .so-price .so-btn .empty-btn {
    margin-left: 28px;
    margin-right: 47px;
    cursor: pointer
}

.stock .input-style .so-price .so-btn .empty-btn:hover {
    color: #0094e5;
    border-color: #0094e5
}

.stock .input-style .so-price .so-btn button.search-btn {
    width: 47px;
    height: 24px;
    line-height: 22px;
    border: 1px solid #999
}

.stock .input-style .so-price .so-btn button:hover {
    color: #0094e5;
    border-color: #0094e5
}

.stock .check-style {
    float: left;
    line-height: 42px
}

.stock .check-style .has-shop {
    margin-right: 15px
}

.stock .check-style input {
    margin-right: 3px;
    vertical-align: top;
    margin-top: 15px
}

.stock .right .cur-page {
    margin-right: 12px
}

.stock .right a {
    float: right;
    width: 50px;
    height: 42px;
    border-left: 1px solid #e3e3e3
}

.stock .right a:hover {
    background: #fff
}

.stock .right a.next {
    border-right: 1px solid #e3e3e3
}

.stock .right a.next i {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png) no-repeat -235px -6px
}

.stock .right a i {
    display: block;
    margin: 14px 21px;
    width: 10px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png) no-repeat -212px -6px
}

.stock .right .g01 input {
    height: 25px;
    line-height: 25px;
    color: #444;
    text-indent: 5px
}

.stock .right .g01 .search-key {
    width: 240px;
    height: 25px;
    outline: none
}

.stock .right .g01 .out {
    margin-left: -4px;
    margin-right: 15px;
    padding: 0 10px;
    width: 92px;
    height: 27px;
    line-height: 27px;
    background: #0093e6;
    color: #fff;
    border: none
}

.stock .right .g01 span {
    color: #444
}

.stock .spnum {
    float: right;
    margin-right: 21px;
    color: #666
}

.public-params {
    width: 1200px;
    height: 108px;
    margin-top: 11px;
    background: #e6f1fd
}

.public-params .img {
    display: inline-block;
    width: 90px;
    height: 90px;
    padding: 9px 0 9px 15px;
    cursor: pointer
}

.public-params .params {
    display: inline-block;
    width: 1075px;
    height: 100%;
    padding-left: 15px
}

.public-params .params .wrap {
    display: inline-block;
    width: 100%;
    height: 100px;
    padding-top: 8px
}

.public-params .params .wrap .title {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    color: #0093e6;
    font-size: 14px
}

.public-params .params .wrap .title .product-name-link {
    display: block;
    max-width: 200px;
    float: left
}

.public-params .params .wrap .title .catalog {
    display: inline-block;
    max-width: 100px;
    height: 17px;
    padding: 2px 10px;
    margin-left: 4px;
    font-size: 12px;
    color: #979797;
    background: hsla(0,0%,100%,.75);
    border: 1px solid #ddd
}

.public-params .params .wrap .l02-zb {
    float: left;
    margin-right: 40px
}

.public-params .params .wrap .l02-zb li {
    box-sizing: border-box;
    width: 100%;
    height: 23px;
    margin: 0;
    padding: 0
}

.public-params .params .wrap .l02-zb li a {
    color: #333
}

.public-params .params .wrap .l02-zb a:hover {
    color: #0093e6
}

.public-params .params .wrap .l02-zb .ellipsis {
    width: 200px;
    max-width: 200px
}

.public-params .params .wrap .l02-zb .ms {
    margin-bottom: 6px
}

.public-params .params .wrap .l02-zb .ellipsis-link {
    max-width: 240px
}

.public-params .params .wrap .l02-zb .desc {
    display: -webkit-inline-box;
    width: 300px;
    vertical-align: top;
    height: 55px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden
}

.public-params .params .wrap .l02-zb .sjsc {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    width: 91px;
    margin-right: 0
}

.public-params .params .wrap .l02-zb .sjsc i {
    width: 17px;
    height: 16px;
    margin-right: 2px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png) no-repeat -23px -32px
}

.public-params .params .wrap .l02-zb .sjsc:hover {
    color: #0093e6;
    border-color: #0093e6
}

.public-params .params .wrap .w-206 {
    width: 206px
}

.public-params .params .wrap .w-350 {
    width: 350px
}

.add-more-warp {
    padding: 10px 0;
    text-align: center;
    font-size: 14px
}

.add-more-warp i {
    margin-left: 5px;
    display: inline-block;
    vertical-align: bottom;
    width: 20px;
    height: 20px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAAAXNSR0IArs4c6QAAAstJREFUOBGFVF1IFFEU/u4d1zQ111zd1YqCxLAQ+oUkIqKiMAortR+hx0QTesnqocceLCEITOkljLDCyCyD6rmnICISKiWjINzdUDRLLHVnOufO3JnZxc2B4dzzne+cOfeeby7AT0d0iI3gxcpco/z77wQ5/HRELWVtJ9ajkC8/5y3mqtACPECig7lAz74guvfkezXQGa3Dzdgv3LICjLp1XIohj0p2Dq1Z4mJImH0KfPb1r9OZHZOQsp37cNtsKRF2S5Yl6UMJr4ZvRUloDl8QqhsTvRyqLMzA4Pi8yxo8GULl/THlS1jito7c2LkMjRuW4v2JEDINgb6RPzpEvfG+5mKzGglQ2wMHC3BgYEJDZMWI3SNDXfEjvD1fVBHQEiljzCOqyvFuQg7DskbpkC+jueShTrSJnfFrMM1WDSbZsxEDQphi4U8mUQE6R6n74qPwPxtDanY2RANVo2GPz+vDKZu8KtdAYZbXPkxccYkXN+dgS+84XtcWYveKTJzflON9QIhSl3j17TSu78hD1aNx7CJitf8cLTwl/cQ+0/jX6vQn1QWoezmJ2YQrCSAQybQbSdKzTnGsKwqNp1RWMKkTTeHHvPZtzclQo7Ta/e04kRQjRmCIVl1IB72C/5uiZqezzjY47Kgx/nHxjtJV0zh1HAhXSMyRAH2nzWGe33BDEcryDc12bXkwA99OF2F72KcYFaWJUS2p1OzS7UVtWRaJYwzbigN4dzyEomyJYnqHGkJYvzwDFffG0LAuOyWLXPoz1B1Gy/LUaFtVnko+9nwCZ+jvnZm3cOfTDB7sD2J02sS5V1OpKewPJ90RqQxJI7u7N4ipWRMzJLjVeQbqX0zCr72kHIl6e8oL/vVJ1MUdR4uebPjK6/rRlvYCSFeSJdNUfIkvB6Z4Bf0JfP0kYjUwRQ0pYCuRS1WYryKIN5BWP4xIPxrFnD+N1/8A9pX3jr6NY1sAAAAASUVORK5CYII=) no-repeat
}

.search-loading {
    display: none;
    width: 100%;
    padding: 10px 0;
    text-align: center
}

.search-loading b {
    color: #0094e7
}

.goods {
    box-sizing: border-box;
    padding: 7px 10px 0;
    width: 100%;
    height: 40px;
    border-bottom: 1px solid #e3e3e3;
    background: #f9f9f9
}

.goods .g01 {
    float: left;
    margin-right: 20px;
    width: 150px
}

.goods .g01 input {
    width: 150px;
    height: 23px;
    line-height: 23px;
    color: #999;
    text-indent: 5px
}

.goods .g02 {
    width: 403px;
    float: left
}

.goods .g02 p {
    float: left;
    line-height: 25px;
    color: #444
}

.goods .g02 b {
    font-weight: 400;
    margin: 0 4px;
    float: left;
    line-height: 25px
}

.goods .g02 .srk {
    width: 56px;
    height: 23px;
    line-height: 23px;
    color: #999;
    text-align: center;
    float: left
}

.goods .g02 .out {
    float: left;
    margin-left: 10px;
    padding: 0 10px;
    height: 24px;
    line-height: 24px;
    background: #b7b7b7;
    color: #fff;
    border: none
}

.goods .g02 .out:hover {
    background: #0093e6
}

.goods .g03 {
    float: left;
    line-height: 25px;
    color: #444
}

.goods .g03 input {
    margin-top: 6px;
    margin-right: 3px;
    vertical-align: top
}

.goods .g04 {
    float: right;
    line-height: 25px
}

.list-b-an {
    text-align: center;
    margin: 30px auto;
    font-size: 14px;
    color: #666
}

.list-b-an a {
    font-size: 18px;
    text-decoration: underline
}

.mfyzb-modal {
    width: 540px!important;
    height: 170px;
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%)
}

.mfyzb-modal .con-t {
    width: 100%;
    border-collapse: collapse
}

.mfyzb-modal .con-t td {
    display: none;
    text-align: center
}

.mfyzb-modal .con-t td img {
    margin-bottom: 10px
}

.offer-modal {
    width: 589px;
    height: 385px;
    box-sizing: border-box;
    margin-left: -257px;
    margin-top: -179px
}

.offer-modal .required-number,.offer-modal .required-price {
    display: inline-block;
    padding-left: 10px
}

.offer-modal .required-number #addCartModaltoast,.offer-modal .required-price #addCartModaltoast {
    top: 38px;
    z-index: 10
}

.offer-modal .required-number #addCartModaltoast .icon,.offer-modal .required-price #addCartModaltoast .icon {
    top: -9px;
    left: 50%;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -255px -441px
}

.offer-modal .required-number span,.offer-modal .required-price span {
    color: red;
    margin-right: 5px
}

.offer-modal .required-number input,.offer-modal .required-price input {
    width: 100px
}

.offer-modal .required-price {
    position: relative;
    width: 279px
}

.offer-modal .required-price input {
    padding-left: 15px;
    position: relative
}

.offer-modal .required-price b {
    font-weight: 400;
    margin-left: 5px
}

.offer-modal .required-price b.money {
    position: absolute;
    top: 18%;
    z-index: 1
}

.offer-modal .required-number {
    padding-right: 10px;
    text-align: right;
    position: relative;
    cursor: pointer
}

.offer-modal .required-number #addCartModaltoast {
    right: 11px;
    left: auto;
    font-weight: 400
}

.offer-modal .required-number .unit-wrap {
    padding-right: 10px;
    position: absolute;
    z-index: 2;
    bottom: 0;
    right: -28px;
    width: 28px;
    text-align: center;
    line-height: 26px;
    background: #f2f2f2;
    border: 1px solid #dedede
}

.offer-modal .required-number .unit-wrap .select-icon {
    display: inline-block;
    position: absolute;
    top: 10px;
    right: 4px;
    content: "";
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #666
}

.offer-modal .required-number .unit-wrap .select-icon-active {
    border: 5px solid transparent;
    border-top: none;
    border-bottom: 5px solid #666
}

.offer-modal .required-number .unit-wrap .unit {
    margin: 0;
    color: #444
}

.offer-modal .required-number .unit-select {
    display: none;
    padding-right: 10px;
    position: absolute;
    bottom: -54px;
    left: -1px;
    width: 28px;
    background: #f2f2f2;
    border: 1px solid #dedede
}

.offer-modal .required-number .unit-select .unit1:hover,.offer-modal .required-number .unit-select .unit2:hover {
    color: #ff7800
}

.offer-modal .lock-stock {
    padding-left: 10px;
    margin-top: 10px;
    line-height: 28px
}

.offer-modal .lock-stock .radio {
    vertical-align: middle;
    margin-right: 6px;
    margin-top: -2px
}

.offer-modal .choose-industry {
    font-weight: 400;
    margin-top: 10px;
    position: relative;
    cursor: pointer
}

.offer-modal .choose-industry span {
    margin-left: 44px
}

.offer-modal .choose-industry .select-title {
    width: 443px;
    display: inline-block;
    border: 1px solid #dedede;
    box-sizing: border-box;
    height: 28px;
    padding: 0 10px;
    line-height: 28px;
    position: relative
}

.offer-modal .choose-industry .select-title:after {
    display: inline-block;
    position: absolute;
    top: 10px;
    right: 10px;
    content: "";
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #666
}

.offer-modal .choose-industry .select {
    width: 443px;
    border: 1px solid #dedede;
    margin-left: 83px;
    height: 212px;
    padding: 5px;
    box-sizing: border-box;
    position: absolute;
    background: #fff;
    display: none
}

.offer-modal .choose-industry .select p {
    width: 30%;
    box-sizing: border-box;
    display: inline-block
}

.offer-modal .choose-industry .select p.active span {
    background-color: #ff7b00;
    color: #fff
}

.offer-modal .choose-industry .select p span {
    display: inline-block;
    box-sizing: border-box;
    margin: 0;
    padding: 5px
}

.offer-modal .submit {
    display: block;
    border: none;
    width: 93px;
    height: 33px;
    line-height: 33px;
    font-size: 14px;
    text-align: center;
    background: #aba9a9;
    color: #fff;
    font-weight: 400;
    margin: 30px auto 0;
    cursor: default
}

.offer-modal .account {
    font-weight: 400;
    font-size: 12px;
    margin-top: 49px
}

.offer-modal .account .title {
    color: red;
    font-weight: 700
}

.offer-modal .account p {
    margin: 5px 0
}

.contrast {
    display: none;
    position: fixed;
    left: 50%;
    z-index: 100000;
    background: #fff;
    border: 4px solid #d9d9d9;
    box-sizing: border-box;
    width: 1000px;
    height: 160px;
    bottom: 0;
    top: auto;
    margin-left: -465px
}

.contrast .contrast-nr .contrast1 {
    position: relative;
    height: 34px;
    line-height: 32px;
    padding-left: 15px;
    background: #f2f2f2;
    border-bottom: 1px solid #dedede;
    color: #444
}

.contrast .contrast-nr .contrast1 .contrast-bt li {
    float: left
}

.contrast .contrast-nr .contrast1 .contrast-bt a {
    display: inline-block;
    padding: 0 12px 1px;
    font-size: 14px;
    color: #444;
    font-weight: 700
}

.contrast .contrast-nr .contrast1 .contrast-bt a.hover {
    color: #0093e6;
    border-bottom: 2px solid #0093e6
}

.contrast .contrast-nr .contrast1 .contrast-yc a {
    float: right;
    display: block;
    margin-top: 10px;
    width: 0;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -286px -317px;
    padding: 2px 10px
}

.contrast .contrast-nr .contrast-cp {
    padding: 20px 15px 12px
}

.contrast .contrast-nr .contrast-cp .contrast-btn {
    float: right;
    box-sizing: border-box;
    width: 90px;
    padding: 16px 0 12px 20px;
    border-left: 1px solid #e3e3e3
}

.contrast .contrast-nr .contrast-cp .contrast-btn input {
    margin-bottom: 15px;
    width: 60px;
    height: 25px;
    line-height: 25px;
    border: none;
    border-radius: 2px;
    background: #0093e6;
    color: #fff
}

.contrast .contrast-nr .contrast-cp .contrast-btn a {
    color: #0093e6
}

.contrast .lcsc-2015db {
    width: 980px;
    margin: 0 auto;
    background: #fff;
    position: absolute;
    bottom: 0;
    left: 20%;
    z-index: 999999
}

.contrast .lcsc-2015db-nr {
    border: 1px solid #cdcdcd;
    border-bottom: 0;
    background-color: #fff;
    box-shadow: 1px 5px 10px #eaeaea,-5px -5px 10px #eaeaea;
    -ms-filter: "progid:DXImageTransform.Microsoft.Shadow(Strength=5, Direction=85, offX=-3,offY=-3,OffX=-2, OffY=-2,Color='#eaeaea')"
}

.contrast .lcsc-2015db-bt {
    width: 980px;
    height: 34px
}

.contrast .lcsc-2015db-bt1 {
    float: left;
    position: relative
}

.contrast .lcsc-2015db-bt1 li,.contrast .lcsc-2015db-bt1 li a {
    width: 100px;
    height: 36px;
    float: left;
    display: block
}

.contrast .lcsc-2015db-bt1 li a {
    text-align: center;
    font-size: 14px;
    color: #333;
    line-height: 36px;
    font-weight: 700;
    position: absolute;
    top: 0
}

.contrast .lcsc-2015db-bt1 .hover {
    background: #fff;
    width: 100px;
    height: 34px;
    border: 2px solid #0093e6;
    border-bottom: 0;
    color: #0093e6;
    line-height: 34px;
    display: block;
    position: absolute;
    top: 0;
    z-index: 99;
    float: left
}

.contrast .lcsc-2015db-bt2 {
    float: right;
    line-height: 34px
}

.contrast .lcsc-2015db-bt2 a {
    margin-right: 10px;
    margin-left: 10px;
    color: #039;
    text-decoration: underline
}

.contrast .lcsc-2015db-nr1 {
    width: 976px;
    height: 100px;
    background: #fff;
    border: 2px solid #0093e6
}

.contrast .lcsc-2015db-nr2 {
    float: left
}

.contrast .lcsc-2015db-nr2 dl {
    width: 290px;
    float: left
}

.contrast .lcsc-2015db-nr2 dt {
    width: 82px;
    height: 82px;
    float: left
}

.contrast .lcsc-2015db-nr2 dt img {
    width: 82px;
    height: 82px
}

.contrast .lcsc-2015db-nr2 dd {
    float: left;
    margin-left: 10px;
    margin-top: 2px;
    width: 182px
}

.contrast .lcsc-2015db-nr2-1 {
    width: 148px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    float: left
}

.contrast .lcsc-2015db-nr2-2 {
    float: right;
    width: 29px;
    text-align: right;
    color: #0093e6
}

.contrast .lcsc-2015db-nr2 dd b {
    font-weight: 400
}

.contrast .lcsc-2015db-nr2-3 {
    box-sizing: border-box;
    width: 100%;
    height: 20px;
    line-height: 20px;
    background: #fff;
    border: 1px solid #ccc;
    margin-top: 3px;
    position: relative
}

.contrast .lcsc-2015db-nr2-3 div {
    font-size: 12px;
    font-weight: 400;
    text-align: right;
    width: 100%
}

.contrast .lfy-btg {
    width: 180px;
    height: 24px
}

.contrast .lcsc-2015db-nr2-fd {
    width: 167px;
    background: #fff;
    border: 1px solid #ccc;
    border-bottom: 0;
    position: absolute;
    z-index: 99;
    bottom: 1px;
    left: -1px
}

.contrast .lcsc-2015db-nr2-fd li {
    width: 170px;
    padding-right: 8px;
    text-align: left;
    cursor: pointer
}

.contrast .lcsc-2015db-nr2-4 dt {
    width: 82px;
    height: 82px;
    background: #f3f3f3;
    text-align: center
}

.contrast .lcsc-2015db-nr2-4 dt b {
    font-size: 66px;
    color: #ccc;
    line-height: 82px;
    font-weight: 400
}

.contrast .lcsc-2015db-nr2-4 dd {
    color: #ccc;
    font-size: 14px
}

.contrast .lcsc-2015db-nr3 {
    width: 130px;
    float: right;
    text-align: center
}

.contrast .lcsc-2015db-nr3 p {
    padding-top: 13px
}

.contrast .lcsc-2015db-nr3 a {
    color: #005aa0
}

.pagination-page-wrap {
    margin: 20px 0
}

.pagination-page-wrap .page {
    width: 100%;
    text-align: left;
    margin: 20px auto 0;
    height: 30px;
    padding-bottom: 5px
}

.pagination-page-wrap .page a,.pagination-page-wrap .page span {
    padding: 7px 9px;
    margin-right: 12px;
    border: 1px solid #ccc
}

.pagination-page-wrap .page .active {
    border-color: #0093e6;
    color: #fff;
    background: #0093e6
}

.pagination-page-wrap .page a.curr-page {
    color: #fff;
    background: #0093e6
}

.pagination-page-wrap .page .total-page {
    margin-right: 12px
}

.pagination-page-wrap .page .total-page i {
    font-style: normal
}

.mid-advert {
    display: none;
    width: 1200px;
    height: 64px;
    margin: 8px 0;
    position: relative
}

.mid-advert a,.mid-advert img {
    display: block;
    width: 100%;
    height: 100%
}

.mid-advert img {
    border: 0
}

.mid-advert .close {
    width: 18px;
    height: 18px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/close_top.2f74c796.png) no-repeat;
    cursor: pointer;
    position: absolute;
    right: 6px;
    top: 6px
}

.inside-page {
    display: block;
    position: relative;
    padding: 8px 0 0;
    border-bottom: 1px solid #e9e9e9;
    background: #fff;
    border-collapse: collapse;
    padding-top: 20px;
}

.inside-page .rebate-popover .plus {
    display: inline-block;
    width: 79px;
    height: 21px;
    line-height: 21px;
    text-align: center;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzkiIGhlaWdodD0iMjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIwJSIgeTE9IjUwJSIgeDI9IjExMS4zOTQlIiB5Mj0iNTAlIiBpZD0iYSI+PHN0b3Agc3RvcC1jb2xvcj0iIzIyMjMzMCIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiM1MDUwN0IiIG9mZnNldD0iMTAwJSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGQ9Ik0wIDBoNjguNUM3NC4yOTkgMCA3OSA0LjcwMSA3OSAxMC41Uzc0LjI5OSAyMSA2OC41IDIxSDBWMHoiIGZpbGw9InVybCgjYSkiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==) 100% no-repeat;
    color: #ffe7c0!important
}

.inside-page.list-items .line-box {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    width: 1200px;
    padding-bottom: 8px
}

.inside-page.list-items .line-box .one {
    /*width: 90px;*/
    padding-left: 12px
}

.inside-page.list-items .line-box .one .one-to-item-link {
    position: relative;
    display: block
}

.inside-page.list-items .line-box .one .one-to-item-link .new-product {
    position: absolute;
    left: 0;
    top: 0;
    width: 72px;
    height: 22px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/new-product.ca62bd8e.png) 50% no-repeat;
    font-size: 12px;
    color: #fff
}

.inside-page.list-items .line-box .one .one-to-item-link .new-product span {
    margin: 0;
    padding-left: 6px;
    line-height: 22px
}

.inside-page.list-items .line-box .one .flash-sales {
    line-height: 15px;
    font-size: 12px;
    background: #f30;
    width: 35px;
    height: 35px;
    text-align: center;
    color: #fff;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1
}

.inside-page.list-items .line-box .one .clearance {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/clearance.94296441.svg);
    width: 36px;
    height: 29px;
    line-height: 29px;
    text-align: center;
    text-indent: 5px;
    position: absolute;
    color: #fff;
    top: 0;
    left: 0;
    z-index: 1
}

.inside-page.list-items .line-box .one .shuang11-discount-icon {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    min-width: 35px;
    height: 35px;
    line-height: 35px;
    text-align: center;
    font-size: 12px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/shuang11_discount_icon_item.26f7f55c.png) 50% no-repeat;
    background-size: 35px;
    color: #fff
}

.inside-page.list-items .line-box .one img {
    width: 130px;
    /*height: 90px;*/
    float: left;
    overflow: hidden
}

.inside-page.list-items .line-box .one img.is-hot-img {
    position: absolute;
    top: -1px;
    left: -1px;
    z-index: 1;
    width: 45px;
    height: 39px
}

.inside-page.list-items .line-box .one span {
    /*width: 90px;*/
    float: left;
    margin: 3px 0
}

.inside-page.list-items .line-box .one .db,.inside-page.list-items .line-box .one .sc {
    float: left;
    background: #fff;
    border: 1px solid #e9e9e9;
    height: 20px;
    width: 45px;
    color: #999;
    font-size: 12px;
    cursor: pointer
}

.inside-page.list-items .line-box .one .db {
    border-right-color: transparent
}

.inside-page.list-items .line-box .one .db:hover,.inside-page.list-items .line-box .one .sc:hover {
    border: 1px solid #ff7800;
    color: #ff7800
}

.inside-page.list-items .line-box .line-box-right {
    padding-left: 12px;
    box-sizing: border-box
}

.inside-page.list-items .line-box .line-box-right .two-tit {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    color: #0093e6;
    font-size: 14px
}

.inside-page.list-items .line-box .line-box-right .two-tit .product-name-link {
    max-width: 300px
}

.inside-page.list-items .line-box .line-box-right .two-tit .product-name-link.mro-item {
    max-width: calc(100% - 120px)
}

.inside-page.list-items .line-box .line-box-right .two-tit .product-name-link.mro-item.have-smt {
    max-width: calc(100% - 240px)
}

.inside-page.list-items .line-box .line-box-right .two-tit .catalog {
    display: inline-block;
    max-width: 100px;
    height: 19px;
    background: #f9f9f9;
    padding: 2px 10px;
    font-size: 12px;
    color: #979797
}

.inside-page.list-items .line-box .line-box-right .two-tit .catalog:hover {
    color: #0093e6
}

.inside-page.list-items .line-box .line-box-right .two-tit .smt-flag {
    display: inline-block;
    width: 117px;
    height: 22px;
    line-height: 22px;
    margin-left: 6px;
    font-size: 12px;
    text-align: center;
    color: #ff7800;
    background: #fff5eb
}

.inside-page.list-items .line-box .line-box-right .two-tit .common-useless-mro {
    background: #e4ecff;
    color: #3a6cef;
    width: -webkit-max-content;
    width: max-content;
    padding: 0 5px;
    border-radius: 2px;
    height: 22px;
    line-height: 22px;
    font-size: 12px;
    margin-left: 6px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .li-ellipsis {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .multi-ellipsis {
    height: auto;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    overflow: hidden
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two ul li {
    box-sizing: border-box;
    width: 100%;
    height: 23px;
    margin: 0;
    padding: 0
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two .l02-zb li a {
    color: #333
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two .l02-zb a:hover,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two .l02-zb li b a {
    color: #0093e6
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two .l02-zb .ellipsis {
    width: 200px;
    max-width: 200px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two .l02-zb .ms {
    margin-bottom: 6px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two .l02-zb .ellipsis-link {
    max-width: 240px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two .band {
    float: left;
    width: 100%
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two .band a {
    width: 110px;
    display: inline-block;
    vertical-align: bottom;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half {
    margin-left: 23px;
    width: 230px;
    -webkit-flex-shrink: 0;
    flex-shrink: 0
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb {
    line-height: 23px;
    box-sizing: border-box
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li {
    height: 20px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper {
    height: auto
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper a {
    display: inline-block;
    margin-right: 10px;
    margin-bottom: 6px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper a i {
    margin-right: 2px;
    display: inline-block;
    vertical-align: middle;
    width: 16px;
    height: 16px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png);
    background-repeat: no-repeat;
    background-position-y: -33px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper a.sjsc i {
    background-position-x: -23px;
    background-position-y: -32px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper a.jswl i {
    background-position-x: -122px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper a.ptsp i {
    background-position-x: -47px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper a.mfyzb i {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAQCAYAAAFRk36sAAAAAXNSR0IArs4c6QAAAYpJREFUKBV9Ur9Lw1AQ/l6bai24KbUFKejkD0QQETdncXZwdG3r4FAEcfUPMGmwf4CrTnXW0UHoJFJws0laEVw6SJucl5e8mBDIg+Te3fd99+7uPQHD7oLoENAtAi+hNr4jVxDJiwO4MNGsbARcIiFh3WkmNDmI3CXneUOzGjBgOHs+NSf5oPPAhgcGTvIfMsOgbvW4qL6i/IOGdc2HbDMwB8N6568W9aHYcZuoMw5AiMeEn3C4UI3n9MENnMKlNe7EYkUejfKDT9TQqKxKRXv0Cs/to1DaUhk0tQEVZ1GeX8axcFUsBo5bGI03uQXOJH74SjhttMQnhPeCevVehjImF/afyYjSJjesCUZrOGdJhL223YJuP6HtXKQwDgSTnSnWMPntsF8KSYvcSI/v6IQbu+O5vaCxdBMlkFVmlWoOV9ChQiRQG9bEphNGb+11TOkZhAE8T8MCdhmZKI2yaeGUdkDCgSCTy73C93Af5tdACmh6BA91cNbMp6Wyp6ws1X9eWX2mVH5AdP8Amx6cGUMCKU8AAAAASUVORK5CYII=) 50% no-repeat
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper a.designyzb i {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAFM0aXcAAAAAXNSR0IArs4c6QAAAbhJREFUKBVtUj1LJEEQfb27aGAiJrLrbxAxMBDhUDjQVCPBSDE6dhEVzD3hLj2YGUQwFTQyUzDRxMhAEQzuggsMpl1FUEQRnJm6Vz0zezu7VtBd/V59dL9qAy+8AjAC+DaiA0NE1EnNv1tGCwnslKIlGBM7Wkr9uhdzGjUDiBj44auLKix+eKtkxYFe+AgpTbIeW2YXKETrYft+VLc0I7Dr9MtscI0Eq2jUppHEE8QuuytoL785C+9uOKsgV/Dshx5gWKFUnsS3wb/urFDrpTmS7wa7udu9+/aCvcMdx3h2kf5DexT1qqwjsBvsuQXBL0cG4Zzu1KrDguYCRbmARGdFMicQnaJeHaIIme0+DyBKnpARilZa73x/E/b8gUZ1KI/vVuo/87mnM3DP1Omr6Xw77Uh6iad8O9eX/OE7NxWiwpZfR87pP3Lsv3k1Q1mWUDZjiDBGfI1XHdfgTqswVFCvfSkQnj1GLHvEYvT0LDrOKRX/hJgX5hxQre/p9ylk8tConnHV7wNokh+eUPuvPK3AJD4LHCr1ebIyrU5Zko5AzEy72mnyqRSL3DTrkGSekuy7uXUkaW21f26ps3f8kqGiAAAAAElFTkSuQmCC) 50% no-repeat
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper a.fayzb i {
    background-position-x: -96px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper a.bomqd i {
    background-position-x: -256px;
    background-position-y: -114px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.btn-wrapper a:hover {
    color: #0093e6
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.hy-sample {
    height: 24px;
    margin-bottom: 6px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.hy-sample span {
    display: inline-block;
    color: #666;
    border-radius: 2px;
    border: 1px solid #666;
    box-sizing: border-box;
    padding: 2px 4px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper {
    height: auto;
    margin-bottom: 6px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .money-off-flag {
    position: relative;
    width: 70px;
    height: 22px;
    line-height: 22px;
    border-radius: 2px;
    border: 1px solid #ff7800;
    text-align: center;
    color: #ff7800;
    cursor: pointer;
    font-size: 12px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .money-off-flag .pop-box {
    position: absolute;
    top: 29px;
    left: -10px;
    width: 200px;
    padding: 5px 10px 10px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .money-off-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 20px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .money-off-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .money-off-flag .pop-box .tip-text .text {
    margin-top: 7px;
    line-height: 18px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .money-off-flag .pop-box .tip-text .link {
    color: #0093e6;
    text-decoration: underline
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .money-off-flag .opacity-mask {
    width: 74px;
    height: 20px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .money-off-flag .opacity-mask:hover .pop-box,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .money-off-flag:hover .pop-box {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .original-sample {
    background-color: #83cdff;
    color: #fff;
    padding: 3px 11px;
    border: none;
    margin-right: 2px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .stop-product {
    background-color: #c9c9c9;
    color: #fff;
    padding: 3px 13px;
    border: none;
    margin-right: 2px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .sold-out {
    background-color: #ff9b9b;
    color: #fff;
    padding: 3px 11px;
    border: none;
    margin-right: 2px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .on-sale {
    background-color: #ffbb7f;
    color: #fff;
    padding: 3px 13px;
    border: none;
    margin-right: 2px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper>span {
    box-sizing: border-box;
    padding: 2px 8px;
    border: 1px solid;
    border-radius: 2px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .orgin {
    border-radius: 2px;
    border: 1px solid #ff7800;
    font-size: 12px;
    text-align: center;
    line-height: 22px;
    color: #ff7800;
    cursor: pointer;
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .list-float-flag {
    position: absolute;
    left: 0;
    top: 30px;
    width: 129px;
    height: auto;
    padding: 10px 0;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    display: none;
    z-index: 5
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .list-float-flag s {
    position: absolute;
    top: -17px;
    left: 20px;
    display: block;
    height: 0;
    width: 0;
    border: 8px dashed transparent;
    border-bottom: 8px solid #cdcbce
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .list-float-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    display: block;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .list-float-flag .content {
    text-align: left;
    padding-left: 10px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .list-float-flag .content li {
    color: #666
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .list-float-flag .content li span {
    font-weight: 700
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .couponbgs {
    display: inline-block;
    font-size: 12px;
    cursor: pointer;
    color: #ff7800;
    text-align: center;
    border-radius: 2px;
    border: 1px solid #ff7800;
    box-sizing: border-box;
    padding: 0 4px;
    line-height: 22px;
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .couponbgs.mro-box {
    border-color: #567eeb;
    color: #567eeb;
    padding: 0 13px 0 4px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .couponbgs .lq {
    display: inline-block;
    width: 32px;
    height: 22px;
    background: #fff5eb;
    margin-left: -4px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .couponbgs .lq.mro-lq {
    background: #567eeb;
    color: #fff
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .couponbgs .line {
    position: absolute;
    left: 31px;
    top: 0;
    background: transparent;
    height: 22px;
    border-right: 1px dashed #ff7800
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .couponbgs .line.mro-line {
    border-right: 1px solid #567eeb
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .couponbgs .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #ff7800;
    text-align: center;
    line-height: 22px;
    color: #fff
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .couponbgs .ljsy.mro-ljsy {
    background: #567eeb
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.tag-wrapper .couponbgs:hover .ljsy {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper {
    height: 24px;
    margin-bottom: 6px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .plus-div {
    display: inline-block;
    width: 102px;
    height: 22px;
    border-radius: 2px;
    border: 1px solid #30304a;
    line-height: 22px;
    color: #30304a;
    margin-right: 4px;
    background: #fff;
    cursor: pointer;
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .plus-div .plus-lq {
    display: inline-block;
    width: 32px;
    background: #30304a;
    color: #fffb90;
    text-align: center
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .plus-div .line {
    position: absolute;
    left: 32px;
    top: 0;
    background: transparent;
    height: 22px;
    border-right: 1px dashed #30304a
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .plus-div .plus-zx {
    display: inline-block;
    width: 66px;
    text-align: center;
    margin-left: -2px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .plus-div .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #30304a;
    text-align: center;
    line-height: 22px;
    color: #fffb90
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .plus-div:hover .ljsy {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .orgin {
    display: inline-block;
    max-width: 100px;
    height: 22px;
    border: 1px solid #30304a;
    line-height: 22px;
    color: #30304a;
    text-align: center;
    padding: 0 6px;
    border-radius: 2px;
    cursor: pointer;
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .list-float-flag {
    position: absolute;
    left: 0;
    top: 30px;
    width: 129px;
    height: auto;
    padding: 10px 0;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    display: none;
    z-index: 5
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .list-float-flag s {
    position: absolute;
    top: -17px;
    left: 20px;
    display: block;
    height: 0;
    width: 0;
    border: 8px dashed transparent;
    border-bottom: 8px solid #cdcbce
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .list-float-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    display: block;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .list-float-flag .content {
    text-align: left;
    padding-left: 10px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .list-float-flag .content li {
    color: #666
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.plus-wrapper .list-float-flag .content li span {
    font-weight: 700
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.smt-wrapper {
    height: 24px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.smt-wrapper .smt-flag {
    border: 1px solid #ff3d00;
    border-radius: 2px;
    text-align: center;
    line-height: 22px;
    color: #ff3d00;
    width: 90px;
    display: inline-block;
    cursor: default
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.xgj-wrapper {
    height: 24px;
    margin-bottom: 6px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.xgj-wrapper .xgj-div {
    width: 69px;
    height: 22px;
    border-radius: 2px;
    border: 1px solid #ff7800;
    text-align: center;
    line-height: 22px;
    color: #ff7800;
    font-size: 12px;
    margin-right: 4px;
    cursor: pointer;
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.xgj-wrapper .xgj-div .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #ff7800;
    text-align: center;
    line-height: 22px;
    color: #fff
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb li.xgj-wrapper .xgj-div:hover .ljsy {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate {
    display: inline-block;
    font-size: 12px;
    cursor: pointer;
    border-radius: 2px;
    border: 1px solid #ff7800;
    box-sizing: border-box;
    line-height: 22px;
    position: relative;
    padding: 0
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate.welfare .rebate-popover {
    min-width: 230px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate .lq {
    font-size: 12px;
    text-align: center;
    color: #ff7800;
    display: inline-block;
    width: auto;
    padding: 0 3px;
    height: 22px;
    background: #fff5eb
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate .line {
    position: absolute;
    left: 40px;
    top: 0;
    background: transparent;
    height: 22px;
    border-right: 1px dashed #ff7800
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate .line.point {
    left: 28px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate .rebate-popover {
    top: 25px;
    position: absolute;
    width: auto;
    background: #fff;
    -webkit-transition: all .4s;
    transition: all .4s;
    cursor: auto;
    overflow: hidden;
    opacity: 0;
    max-height: 0;
    z-index: 2
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate .rebate-popover h4 {
    font-weight: 400
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate .rebate-popover span {
    color: #de3231
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate .rebate-popover ul li {
    padding-left: 50px;
    text-align: left
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate .rebate-popover p {
    white-space: nowrap
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate .rebate-popover a {
    color: #0093e6
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .rebate:hover .rebate-popover {
    padding: 5px;
    border: 1px solid #f2f2f2;
    opacity: 1;
    box-shadow: 2px 2px 3px 4px rgba(0,0,0,.1);
    max-height: 300px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress-total {
    position: relative;
    display: inline-block;
    width: 102px;
    height: 5px;
    border-radius: 7px;
    background: #dedede
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress-total .progress-percent {
    height: 5px;
    border-radius: 7px;
    background: -webkit-linear-gradient(left,hsla(0,0%,100%,0),#0093e6);
    background: linear-gradient(90deg,hsla(0,0%,100%,0),#0093e6)
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress-total:hover .tooltip {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress-total .tooltip {
    display: none;
    position: absolute;
    top: 15px;
    left: -40px;
    width: auto;
    max-width: 300px;
    min-width: 150px;
    min-height: 22px!important;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    background: #fff;
    z-index: 10
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress-total .tooltip .narrow {
    position: absolute;
    left: 50%;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px;
    -webkit-transform: rotate(1turn);
    transform: rotate(1turn)
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress-total .tooltip .content {
    min-height: 22px;
    line-height: 16px;
    font-size: 12px;
    font-weight: 400;
    color: #444;
    text-align: left;
    word-break: break-all
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress {
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress .look-group-detail {
    position: relative;
    text-decoration: underline;
    margin-left: 4px;
    cursor: pointer
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress .look-group-detail:hover {
    color: #0093e6
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress .detail-content-pop {
    position: absolute;
    top: 25px;
    left: 16px;
    padding: 11px;
    font-style: normal;
    color: #333;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    z-index: 999
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress .detail-content-pop .icon_tip_narrow {
    position: absolute;
    left: 45px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress .detail-content-pop .group-detail h4 {
    margin-bottom: 8px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress .detail-content-pop .group-detail .content {
    width: 305px;
    height: 82px;
    background: #fafafa;
    font-size: 0
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress .detail-content-pop .group-detail .content .round {
    display: inline-block;
    width: 19px;
    height: 19px;
    margin: 13px 6px 6px;
    font-size: 12px;
    text-align: center;
    color: #ff7800;
    border-radius: 10px;
    border: 1px solid #ff7800
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress .detail-content-pop .group-detail .content .dash-line {
    display: inline-block;
    width: 50px;
    height: 1px;
    border-top: 1px dashed #ccc;
    vertical-align: 3px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half .l02-yb .progress .detail-content-pop .group-detail .content .label-wrap .label {
    display: inline-block;
    width: 50px;
    line-height: 16px;
    font-size: 12px;
    text-align: center
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half i.sjck-i {
    width: 15px;
    height: 16px;
    display: inline-block;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/link.1e242339.svg) no-repeat;
    vertical-align: text-bottom;
    margin-left: -4px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half a.sjck-a {
    text-decoration: underline
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .two-half a.sjck-a:hover {
    color: #0094e7
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box {
    position: relative;
    -webkit-flex-shrink: 0;
    flex-shrink: 0;
    width: 210px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box.hasSMT {
    /*margin-bottom: 70px*/
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box.originPosition {
    margin-bottom: 0;
    width: 245px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box.originPosition .three-box-bottom {
    top: 0
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box.originPosition .three-box-bottom .smt-price {
    border-top: none;
    padding-top: 0;
    margin-top: 0
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three {
    width: auto;
    margin-left: 25px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .show-dollar-transform-icon {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/prompt-usd.b2ad18ac.svg) no-repeat 50%;
    background-size: 14px 14px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .show-dollar-transform-icon .common-float-dialog {
    padding: 10px 12px;
    left: -23px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .show-dollar-transform-icon .common-float-content {
    white-space: nowrap
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .show-dollar-transform-icon .common-float-content .item {
    line-height: 1.75;
    text-align: left
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .show-dollar-transform-icon:hover .common-float-dialog {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr {
    width: 100%
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr li {
    height: 21px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr li p {
    float: left;
    text-align: right
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .three-nr-01 {
    margin-bottom: 6px;
    height: auto;
    text-align: center;
    color: #444;
    padding-left: 30px;
    box-sizing: border-box
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .three-nr-01 .show-discount-icon {
    position: relative;
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/prompt-rmb.3f416450.svg) no-repeat 50%;
    background-size: 16px 16px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog {
    padding: 10px 12px;
    left: auto;
    right: 0;
    -webkit-transform: translateX(50px);
    transform: translateX(50px)
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content {
    white-space: nowrap;
    text-align: left
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item {
    display: inline-block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item.num-cel {
    text-align: right
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item.not-plus-o-price-cel .o-price {
    color: #999;
    text-decoration: line-through
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .f-s {
    left: auto;
    right: 50px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .three-nr-01 .show-discount-icon:hover .common-float-dialog {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .three-nr-01 .group-icon {
    display: inline-block;
    width: 12px;
    height: 14px;
    margin-left: 2px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/group-icon.23e9c5fa.svg);
    vertical-align: text-top
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .text_initial {
    text-align: initial
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .text_initial span {
    display: inline-block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .text_initial .p-1 {
    width: 63px;
    text-align: right
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .text_initial .p-2 {
    width: 80px;
    margin-left: 14px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .text_initial .p-3 {
    width: 65px;
    margin-left: 3px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .ccd {
    float: left
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .ccd .plus-ff7900 {
    color: #ff7900
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .ccd .del-ff7900 {
    color: #444
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .ccd-ppbbz {
    float: left
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .ccdbj {
    width: 64px;
    height: 20px;
    border: 1px solid #ccc;
    text-align: center;
    line-height: 20px;
    color: #444
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .ccdbj a {
    display: block;
    width: 100%;
    height: 100%
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .ccdbj:hover {
    color: #0093e6;
    border-color: #0093e6
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .price-warp {
    width: auto;
    height: 21px;
    text-align: center
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .price-warp .ppbbz-p {
    width: 70px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nr .price-warp .ppbbz-nowrap {
    margin-left: 0
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nrg {
    width: 200px;
    float: right
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .three-nrg3 {
    width: 175px;
    float: left
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-top .three .hk-radio {
    padding-left: 15px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-bottom {
    position: absolute;
    bottom: -70px;
    width: 100%
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-bottom .smt-price {
    border-top: 1px dashed #c5c1c1;
    bottom: 0;
    padding-top: 3px;
    margin-top: 3px;
    text-align: center
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-box .three-box-bottom .smt-price a {
    color: #199de9;
    background-color: #e3f5ff;
    display: inline-block;
    height: 20px;
    line-height: 20px;
    padding: 2px 8px;
    margin-left: 10px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour {
    width: 165px;
    -webkit-flex-shrink: 0;
    flex-shrink: 0
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput {
    width: 100%
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li {
    margin-bottom: 3px;
    width: 100%;
    height: 18px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li .hk-stock,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li .stock-nums-gd,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li .stock-nums-js,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li .hk-stock,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li .stock-nums-gd,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li .stock-nums-js {
    max-width: 135px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks-style,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks-style {
    height: auto
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input {
    height: 24px;
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input .cartnumbers,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input .cartnumbers {
    width: 91px;
    height: 22px;
    border: 1px solid #ccc;
    border-right: none;
    padding: 0 4px;
    float: left;
    background: #fff;
    font-size: 12px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input .cFF7800,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input .cFF7800 {
    color: #ff7800
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input .unit,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input .unit {
    width: 47px;
    height: 22px;
    border: 1px solid #ccc;
    background: #fafafa;
    position: relative;
    float: left;
    cursor: pointer
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input .unit span,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input .unit span {
    display: inline-block;
    width: 32px;
    height: 22px;
    text-align: center;
    line-height: 22px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input .unit i,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input .unit i {
    display: inline-block;
    width: 20px;
    height: 14px;
    position: absolute;
    right: 0;
    top: 4px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input .unit i.xl,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input .unit i.xl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input .unit i.sl,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input .unit i.sl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input .unit .unit-contain,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input .unit .unit-contain {
    display: none;
    width: 47px;
    height: 44px;
    border: 1px solid #ccc;
    background: #fafafa;
    position: absolute;
    left: -1px;
    top: -1px;
    z-index: 6
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input .unit .unit-contain span:hover,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input .unit .unit-contain span:hover {
    color: #ff7800
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input .cccc,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input .cccc {
    color: #ccc
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.price-input-hk,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.price-input-hk {
    display: none
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li {
    white-space: nowrap
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .plus_mj,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .plus_mj {
    display: none;
    vertical-align: -4px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    position: relative;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plus_mj_icon.aa156a65.svg) 50% no-repeat
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .plus_mj .plus-flag,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .plus_mj .plus-flag {
    display: none;
    position: absolute;
    z-index: 5;
    right: -40px;
    top: 24px;
    width: auto;
    height: auto;
    padding: 10px;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #eaeaea;
    text-align: center
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .plus_mj .plus-flag s,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .plus_mj .plus-flag s {
    position: absolute;
    top: -13px;
    right: 41px;
    height: 0;
    width: 0;
    border: 6px dashed transparent;
    border-bottom: 6px solid #c8c8c8
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .plus_mj .plus-flag i,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .plus_mj .plus-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .plus_mj .plus-flag span,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .plus_mj .plus-flag span {
    font-size: 12px;
    color: #333;
    white-space: nowrap
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .plus_mj:hover .plus-flag,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .plus_mj:hover .plus-flag {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .rebate-flag,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .rebate-flag {
    position: relative;
    display: inline-block;
    width: 18px;
    height: 18px;
    line-height: 18px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/rebate.4e45e8f4.svg) no-repeat;
    cursor: pointer;
    vertical-align: text-top
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .rebate-flag .pop-box,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .rebate-flag .pop-box {
    position: absolute;
    top: 24px;
    left: -73px;
    min-width: 180px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .rebate-flag .pop-box .icon_tip_narrow,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .rebate-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 75px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text .rebate-money,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text .rebate-money {
    color: #333;
    font-weight: 700
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .link,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .link {
    color: #0093e6;
    text-decoration: underline
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks {
    cursor: default
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks i.pan-stock,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks i.pan-stock {
    display: inline-block;
    vertical-align: bottom;
    width: 17px;
    height: 16px;
    margin-right: 3px;
    margin-bottom: 2px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks i.adequate,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks i.adequate {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/adequate.3240c862.svg) 50% no-repeat
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks .arrival-notice-btn,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks .arrival-notice-btn {
    text-decoration: underline
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks .arrival-notice-btn:hover,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks .arrival-notice-btn:hover {
    color: #0094e5
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks .stock-flag,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks .stock-flag {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    line-height: 14px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/gantanhao.d8159e2e.svg) no-repeat;
    cursor: pointer;
    vertical-align: text-top
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks .stock-flag .pop-box,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks .stock-flag .pop-box {
    position: absolute;
    top: 30px;
    left: -10px;
    min-width: 100px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks .stock-flag .pop-box .icon_tip_narrow,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks .stock-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 13px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks .stock-flag .pop-box .tip-text,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks .stock-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks .stock-flag .pop-box .tip-text .text,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks .stock-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput li.stocks .stock-flag .pop-box .tip-text .text .stock-num,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput li.stocks .stock-flag .pop-box .tip-text .text .stock-num {
    color: #333;
    font-weight: 700
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .finput .dh-style,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .finput .dh-style {
    display: inline-block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan {
    width: 100%;
    height: auto
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list {
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .dinghuoyouhui:hover,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .icon-mark:hover .dinghuoyouhui,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .dinghuoyouhui:hover,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .icon-mark:hover .dinghuoyouhui {
    color: #ff7800
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .top-to-sale-btn,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .top-to-sale-btn {
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .top-to-sale-btn:hover .icon-tip,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .top-to-sale-btn:hover .icon-tip-narrow,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .top-to-sale-btn:hover .icon-tip,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .top-to-sale-btn:hover .icon-tip-narrow {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .top-to-sale-btn .icon-tip-narrow,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .top-to-sale-btn .icon-tip-narrow {
    display: none;
    position: absolute;
    right: -6px;
    top: 12px;
    z-index: 4;
    width: 6px;
    height: 9px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAJCAYAAAARml2dAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjAyOENFOUIwOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjAyOENFOUIxOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDI4Q0U5QUU5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDI4Q0U5QUY5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6wJC0SAAAARUlEQVR42mI4d/ocw////+EYyP8PAkwMSOD8mfP/DU0MwWwmbIJwCXRBmASGIEyCEagDqwQDUAeGJNxydEkU5yJLAgQYACcBK9GRst39AAAAAElFTkSuQmCC) no-repeat
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .top-to-sale-btn .icon-tip,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .top-to-sale-btn .icon-tip {
    display: none;
    position: absolute;
    top: -12px;
    left: 96px;
    z-index: 3;
    padding: 10px;
    color: #666;
    font-size: 12px;
    line-height: 18px;
    background-color: #fff;
    border: 1px solid #cecbce;
    box-sizing: border-box;
    box-shadow: 0 0 2px 3px #f2f2f2;
    width: 106px;
    text-align: center;
    border-radius: 2px;
    cursor: default
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .pan-list-btn,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .pan-list-btn {
    width: 92px;
    height: 33px;
    border: none;
    border-radius: 2px;
    background: #ff7800;
    color: #fff
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .pan-list-btn.product-move-btn,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .pan-list-btn.product-move-btn {
    position: relative;
    background: #5e5e5e
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip {
    display: none;
    position: absolute;
    width: 202px;
    right: 0;
    top: 40px;
    color: #666;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    font-weight: 400;
    font-size: 12px;
    padding: 4px 8px;
    text-align: left;
    background: #fff;
    z-index: 1;
    line-height: 1.4
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip .icon-tip-narrow,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip .icon-tip-narrow {
    top: -6px;
    right: 5px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip .icon-tip-narrow,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip .icon-tip-narrow {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .pan-list-btn.addCartBtn-TJ,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .pan-list-btn.addCartBtn-TJ {
    width: 92px;
    height: 33px;
    border: 1px solid #ff7800;
    border-radius: 2px;
    background: #fcf1e7;
    color: #ff7800
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .pan-list-btn.group-booking-btn,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .pan-list-btn.group-booking-btn {
    width: 92px;
    height: 33px;
    color: #fff;
    border-radius: 2px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .pan-list-btn.orange,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .pan-list-btn.orange {
    border: 1px solid #ff7800;
    background: #ff7800
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .pan-list-btn.blue,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .pan-list-btn.blue {
    border: 1px solid #0093e6;
    background: #0093e6
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .hover-flag,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .hover-flag {
    position: relative;
    margin-top: 5px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .hover-flag:hover .gmxz-box,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .hover-flag:hover .gmxz-box {
    display: block
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .hover-flag .gmxz,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .hover-flag .gmxz {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 18px;
    height: 19px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/warn.5d027012.svg) 50% no-repeat
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .hover-flag .gmxz-box,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .hover-flag .gmxz-box {
    display: none;
    position: absolute;
    top: 27px;
    left: -5px;
    width: 147px;
    padding: 9px;
    font-style: normal;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    z-index: 9999
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .hover-flag .gmxz-box .icon_tip_narrow,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .hover-flag .gmxz-box .icon_tip_narrow {
    position: absolute;
    left: 7px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .hover-flag .gmxz-box p,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .hover-flag .gmxz-box p {
    color: #666
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .add-cart-tip,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .add-cart-tip {
    display: none
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .add-cart-tip .add-cart,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .add-cart-tip .add-cart {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 20px;
    height: 20px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjOTk5IiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSI5Ii8+PHBhdGggZD0iTTQgOC42MzlMNy41OSAxMiAxNCA2Ii8+PC9nPjwvc3ZnPg==) 50% no-repeat
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .no-dh-wrap,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .no-dh-wrap {
    margin: 5px 0
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .no-dh-wrap .no-dh,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .no-dh-wrap .no-dh {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 18px;
    height: 19px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/no-dh.3e47a559.svg) 50% no-repeat
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .pan .pan-list .flag1,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .pan .pan-list .flag1 {
    float: left;
    margin-top: 5px;
    margin-right: 4px;
    width: 16px;
    height: 15px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCAwaDE2djE2SDB6Ii8+PGNpcmNsZSBzdHJva2U9IiM5OTkiIGN4PSI4LjQyMSIgY3k9IjguNDIxIiByPSI1Ljg5NSIvPjxwYXRoIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNOC40MjkgNS4wNTN2My4zNjgiLz48Y2lyY2xlIGZpbGw9IiM5OTkiIGZpbGwtcnVsZT0ibm9uemVybyIgY3g9IjguNDIxIiBjeT0iMTAuOTQ3IiByPSIxIi8+PC9nPjwvc3ZnPg==) no-repeat 50%
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .clock,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .clock {
    display: inline-block;
    width: 15px;
    height: 16px;
    margin-right: 2px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/alarm-clock-grey.ad5ba25b.svg);
    vertical-align: -3px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .remain-time,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .remain-time {
    display: inline-block;
    margin-bottom: 5px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .ffour .remain-time .bold,.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .remain-time .bold {
    font-weight: 700;
    margin-left: -3px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change {
    width: 145px;
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .smt-stock {
    position: absolute;
    bottom: 2px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .smt-stock.originPosition {
    position: inherit
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label {
    display: inline-block;
    margin-bottom: 4px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label.local-radio-label {
    position: relative
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label.local-radio-label .radio-label-dialog {
    left: auto;
    right: 155px;
    top: -20px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content {
    white-space: nowrap;
    text-align: left
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-list-li {
    line-height: 1.75
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-gradient {
    width: 68px;
    text-align: right
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price {
    width: 70px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price.hk-usd {
    width: 80px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price.hk-rmb {
    width: auto
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-list-tit .price.hk-usd {
    margin-left: -10px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-f-s {
    display: none
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .input-radio {
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNyIgY3k9IjciIHI9IjciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkiIGZpbGw9IiNGRkYiIHN0cm9rZT0iI0FBQSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) no-repeat 50%;
    background-size: 14px
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .input-radio.disabled {
    background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIHN0cm9rZT0iI0NDQyIgZmlsbD0iI0ZGRiIgY3g9IjYiIGN5PSI2IiByPSI2Ii8+PGNpcmNsZSBmaWxsPSIjQ0NDIiBjeD0iNiIgY3k9IjYiIHI9IjMiLz48L2c+PC9zdmc+)
}

.inside-page.list-items .line-box .line-box-right .line-box-right-bottom .three-change .input-radio.active {
    background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjRkY3ODAwIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI0ZGRiIgY3g9IjciIGN5PSI3IiByPSI3Ii8+PGNpcmNsZSBmaWxsPSIjRkY3ODAwIiBjeD0iNyIgY3k9IjciIHI9IjQiLz48L2c+PC9zdmc+)
}

.inside-page.list-items .group .one,.inside-page.list-items .group .two {
    display: inline-block;
    vertical-align: top;
    padding-top: 15px
}

.inside-page.list-items .group .two {
    padding-left: 20px;
    border-top: none
}

.inside-page.list-items .group .two .l02-zb {
    width: 300px
}

.inside-page.list-items .group .two.copy-pt {
    padding-top: 42px
}

.inside-page.list-items .group .two.copy-pt .l02-yb {
    width: 275px
}

.inside-page.list-items .group .three {
    display: inline-block;
    vertical-align: top;
    border-top: none;
    padding-top: 42px
}

.inside-page.list-items .group .three .three-nr .price-warp .ppbbz-p {
    width: 135px
}

.inside-page.list-items .group .ffour {
    display: inline-block;
    vertical-align: top;
    border-top: none
}

.inside-page.list-items .group .one {
    width: 90px;
    padding-left: 15px
}

.inside-page.list-items .group .one .one-to-item-link {
    position: relative;
    display: block
}

.inside-page.list-items .group .one .one-to-item-link .new-product {
    position: absolute;
    left: 0;
    top: 0;
    width: 72px;
    height: 22px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/new-product.ca62bd8e.png) 50% no-repeat;
    font-size: 12px;
    color: #fff
}

.inside-page.list-items .group .one .one-to-item-link .new-product span {
    margin: 0;
    padding-left: 6px;
    line-height: 22px
}

.inside-page.list-items .group .one .flash-sales {
    line-height: 15px;
    font-size: 12px;
    background: #f30;
    width: 35px;
    height: 35px;
    text-align: center;
    color: #fff;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1
}

.inside-page.list-items .group .one .clearance {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/clearance.94296441.svg);
    width: 36px;
    height: 29px;
    line-height: 29px;
    text-align: center;
    text-indent: 5px;
    position: absolute;
    color: #fff;
    top: 0;
    left: 0;
    z-index: 1
}

.inside-page.list-items .group .one .shuang11-discount-icon {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    min-width: 35px;
    height: 35px;
    line-height: 35px;
    text-align: center;
    font-size: 12px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/shuang11_discount_icon_item.26f7f55c.png) 50% no-repeat;
    background-size: 35px;
    color: #fff
}

.inside-page.list-items .group .one img {
    width: 90px;
    height: 90px;
    float: left;
    overflow: hidden
}

.inside-page.list-items .group .one img.pticon {
    position: absolute;
    top: -1px;
    right: -1px;
    z-index: 1;
    width: 58px;
    height: 18px
}

.inside-page.list-items .group .one img.is-hot-img {
    position: absolute;
    top: -1px;
    left: -1px;
    z-index: 1;
    width: 45px;
    height: 39px
}

.inside-page.list-items .group .one span {
    width: 90px;
    float: left;
    margin: 3px 0
}

.inside-page.list-items .group .one .db,.inside-page.list-items .group .one .sc {
    float: left;
    background: #fff;
    border: 1px solid #e9e9e9;
    height: 20px;
    width: 45px;
    color: #999;
    font-size: 12px;
    cursor: pointer
}

.inside-page.list-items .group .one .db {
    border-right-color: transparent
}

.inside-page.list-items .group .one .db:hover,.inside-page.list-items .group .one .sc:hover {
    border: 1px solid #ff7800;
    color: #ff7800
}

.inside-page.list-items .group .two {
    padding-left: 15px
}

.inside-page.list-items .group .two .remain-time {
    display: inline-block;
    margin-bottom: 5px
}

.inside-page.list-items .group .two .remain-time .bold {
    font-weight: 700;
    color: #ff7800
}

.inside-page.list-items .group .two .two-tit {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    color: #0093e6;
    font-size: 14px
}

.inside-page.list-items .group .two .two-tit .product-name-link {
    display: block;
    max-width: 150px;
    float: left
}

.inside-page.list-items .group .two .two-tit .catalog {
    display: inline-block;
    max-width: 100px;
    height: 19px;
    background: #f9f9f9;
    padding: 2px 10px;
    margin-left: 4px;
    font-size: 12px;
    color: #979797
}

.inside-page.list-items .group .two .two-tit .catalog:hover {
    color: #0093e6
}

.inside-page.list-items .group .two .two-tit .smt-flag {
    display: inline-block;
    width: 117px;
    height: 22px;
    line-height: 22px;
    margin-left: 6px;
    font-size: 12px;
    text-align: center;
    color: #ff7800;
    background: #fff5eb
}

.inside-page.list-items .group .two .two-tit .common-useless-mro {
    background: #e4ecff;
    color: #3a6cef;
    width: -webkit-max-content;
    width: max-content;
    padding: 0 5px;
    border-radius: 2px;
    height: 22px;
    line-height: 22px;
    font-size: 12px;
    margin-left: 6px
}

.inside-page.list-items .group .two .two-01 {
    float: left
}

.inside-page.list-items .group .two .two-01 ul li {
    box-sizing: border-box;
    width: 100%;
    max-width: 230px;
    height: 23px;
    margin: 0;
    padding: 0
}

.inside-page.list-items .group .two .two-01 .li-ellipsis {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap
}

.inside-page.list-items .group .two .two-01 .multi-ellipsis {
    height: 36px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    cursor: pointer
}

.inside-page.list-items .group .two .two-01 .copy-input-des {
    position: absolute;
    z-index: -1;
    width: 1px;
    height: 1px;
    opacity: 0
}

.inside-page.list-items .group .two .l02-zb {
    width: 230px;
    float: left;
    margin-right: 40px
}

.inside-page.list-items .group .two .l02-zb li a {
    color: #333
}

.inside-page.list-items .group .two .l02-zb a:hover,.inside-page.list-items .group .two .l02-zb li b a {
    color: #0093e6
}

.inside-page.list-items .group .two .l02-zb .ellipsis {
    width: 230px;
    max-width: 230px
}

.inside-page.list-items .group .two .l02-zb .ms {
    margin-bottom: 6px;
    color: #444
}

.inside-page.list-items .group .two .l02-zb .ellipsis-link {
    max-width: 240px
}

.inside-page.list-items .group .two i.sjck-i {
    width: 15px;
    height: 16px;
    display: inline-block;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/link.1e242339.svg) no-repeat;
    vertical-align: text-bottom;
    margin-left: -4px
}

.inside-page.list-items .group .two a.sjck-a {
    text-decoration: underline
}

.inside-page.list-items .group .two a.sjck-a:hover {
    color: #0094e7
}

.inside-page.list-items .group .two .l02-yb {
    width: 193px;
    float: left
}

.inside-page.list-items .group .two .l02-yb li {
    height: 20px
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper {
    height: auto
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper a {
    display: inline-block;
    margin-right: 10px;
    margin-bottom: 6px
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper a i {
    margin-right: 2px;
    display: inline-block;
    vertical-align: bottom;
    width: 16px;
    height: 16px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png);
    background-repeat: no-repeat;
    background-position-y: -33px
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper a.sjsc i {
    background-position-x: -23px;
    background-position-y: -32px
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper a.jswl i {
    background-position-x: -122px
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper a.ptsp i {
    background-position-x: -47px
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper a.mfyzb i {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAQCAYAAAFRk36sAAAAAXNSR0IArs4c6QAAAYpJREFUKBV9Ur9Lw1AQ/l6bai24KbUFKejkD0QQETdncXZwdG3r4FAEcfUPMGmwf4CrTnXW0UHoJFJws0laEVw6SJucl5e8mBDIg+Te3fd99+7uPQHD7oLoENAtAi+hNr4jVxDJiwO4MNGsbARcIiFh3WkmNDmI3CXneUOzGjBgOHs+NSf5oPPAhgcGTvIfMsOgbvW4qL6i/IOGdc2HbDMwB8N6568W9aHYcZuoMw5AiMeEn3C4UI3n9MENnMKlNe7EYkUejfKDT9TQqKxKRXv0Cs/to1DaUhk0tQEVZ1GeX8axcFUsBo5bGI03uQXOJH74SjhttMQnhPeCevVehjImF/afyYjSJjesCUZrOGdJhL223YJuP6HtXKQwDgSTnSnWMPntsF8KSYvcSI/v6IQbu+O5vaCxdBMlkFVmlWoOV9ChQiRQG9bEphNGb+11TOkZhAE8T8MCdhmZKI2yaeGUdkDCgSCTy73C93Af5tdACmh6BA91cNbMp6Wyp6ws1X9eWX2mVH5AdP8Amx6cGUMCKU8AAAAASUVORK5CYII=) 50% no-repeat
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper a.designyzb i {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAFM0aXcAAAAAXNSR0IArs4c6QAAAbhJREFUKBVtUj1LJEEQfb27aGAiJrLrbxAxMBDhUDjQVCPBSDE6dhEVzD3hLj2YGUQwFTQyUzDRxMhAEQzuggsMpl1FUEQRnJm6Vz0zezu7VtBd/V59dL9qAy+8AjAC+DaiA0NE1EnNv1tGCwnslKIlGBM7Wkr9uhdzGjUDiBj44auLKix+eKtkxYFe+AgpTbIeW2YXKETrYft+VLc0I7Dr9MtscI0Eq2jUppHEE8QuuytoL785C+9uOKsgV/Dshx5gWKFUnsS3wb/urFDrpTmS7wa7udu9+/aCvcMdx3h2kf5DexT1qqwjsBvsuQXBL0cG4Zzu1KrDguYCRbmARGdFMicQnaJeHaIIme0+DyBKnpARilZa73x/E/b8gUZ1KI/vVuo/87mnM3DP1Omr6Xw77Uh6iad8O9eX/OE7NxWiwpZfR87pP3Lsv3k1Q1mWUDZjiDBGfI1XHdfgTqswVFCvfSkQnj1GLHvEYvT0LDrOKRX/hJgX5hxQre/p9ylk8tConnHV7wNokh+eUPuvPK3AJD4LHCr1ebIyrU5Zko5AzEy72mnyqRSL3DTrkGSekuy7uXUkaW21f26ps3f8kqGiAAAAAElFTkSuQmCC) 50% no-repeat
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper a.fayzb i {
    background-position-x: -96px
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper a.bomqd i {
    background-position-x: -256px;
    background-position-y: -114px
}

.inside-page.list-items .group .two .l02-yb li.btn-wrapper a:hover {
    color: #0093e6
}

.inside-page.list-items .group .two .l02-yb li.hy-sample {
    height: 24px;
    margin-bottom: 6px
}

.inside-page.list-items .group .two .l02-yb li.hy-sample span {
    display: inline-block;
    color: #666;
    border-radius: 2px;
    border: 1px solid #666;
    box-sizing: border-box;
    padding: 2px 4px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper {
    height: auto;
    margin-bottom: 6px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .money-off-flag {
    position: relative;
    width: 70px;
    height: 22px;
    line-height: 22px;
    border-radius: 2px;
    border: 1px solid #ff7800;
    text-align: center;
    color: #ff7800;
    cursor: pointer;
    font-size: 12px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .money-off-flag .pop-box {
    position: absolute;
    top: 29px;
    left: -10px;
    width: 200px;
    padding: 5px 10px 10px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .money-off-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 20px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .money-off-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .money-off-flag .pop-box .tip-text .text {
    margin-top: 7px;
    line-height: 18px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .money-off-flag .pop-box .tip-text .link {
    color: #0093e6;
    text-decoration: underline
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .money-off-flag .opacity-mask {
    width: 74px;
    height: 20px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .money-off-flag .opacity-mask:hover .pop-box,.inside-page.list-items .group .two .l02-yb li.tag-wrapper .money-off-flag:hover .pop-box {
    display: block
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .original-sample {
    background-color: #83cdff;
    color: #fff;
    padding: 3px 11px;
    border: none;
    margin-right: 2px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .stop-product {
    background-color: #c9c9c9;
    color: #fff;
    padding: 3px 13px;
    border: none;
    margin-right: 2px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .sold-out {
    background-color: #ff9b9b;
    color: #fff;
    padding: 3px 11px;
    border: none;
    margin-right: 2px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .on-sale {
    background-color: #ffbb7f;
    color: #fff;
    padding: 3px 13px;
    border: none;
    margin-right: 2px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper>span {
    box-sizing: border-box;
    padding: 2px 8px;
    border: 1px solid;
    border-radius: 2px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .orgin {
    border-radius: 2px;
    border: 1px solid #ff7800;
    font-size: 12px;
    text-align: center;
    line-height: 22px;
    color: #ff7800;
    cursor: pointer;
    position: relative
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .list-float-flag {
    position: absolute;
    left: 0;
    top: 30px;
    width: 129px;
    height: auto;
    padding: 10px 0;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    display: none;
    z-index: 5
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .list-float-flag s {
    position: absolute;
    top: -17px;
    left: 20px;
    display: block;
    height: 0;
    width: 0;
    border: 8px dashed transparent;
    border-bottom: 8px solid #cdcbce
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .list-float-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    display: block;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .list-float-flag .content {
    text-align: left;
    padding-left: 10px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .list-float-flag .content li {
    color: #666
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .list-float-flag .content li span {
    font-weight: 700
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .couponbgs {
    display: inline-block;
    font-size: 12px;
    cursor: pointer;
    color: #ff7800;
    text-align: center;
    border-radius: 2px;
    border: 1px solid #ff7800;
    box-sizing: border-box;
    padding: 0 4px;
    line-height: 22px;
    position: relative
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .couponbgs.mro-box {
    border-color: #567eeb;
    color: #567eeb;
    padding: 0 13px 0 4px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .couponbgs .lq {
    display: inline-block;
    width: 32px;
    height: 22px;
    background: #fff5eb;
    margin-left: -4px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .couponbgs .lq.mro-lq {
    background: #567eeb;
    color: #fff
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .couponbgs .line {
    position: absolute;
    left: 31px;
    top: 0;
    background: transparent;
    height: 22px;
    border-right: 1px dashed #ff7800
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .couponbgs .line.mro-line {
    border-right: 1px solid #567eeb
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .couponbgs .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #ff7800;
    text-align: center;
    line-height: 22px;
    color: #fff
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .couponbgs .ljsy.mro-ljsy {
    background: #567eeb
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate {
    display: inline-block;
    font-size: 12px;
    cursor: pointer;
    border-radius: 2px;
    border: 1px solid #ff7800;
    box-sizing: border-box;
    line-height: 22px;
    position: relative;
    padding: 0
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate.welfare .rebate-popover {
    min-width: 230px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate .lq {
    font-size: 12px;
    text-align: center;
    color: #ff7800;
    display: inline-block;
    width: auto;
    padding: 0 3px;
    height: 22px;
    background: #fff5eb
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate .line {
    position: absolute;
    left: 40px;
    top: 0;
    background: transparent;
    height: 22px;
    border-right: 1px dashed #ff7800
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate .line.point {
    left: 28px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate .rebate-popover {
    top: 25px;
    position: absolute;
    width: auto;
    background: #fff;
    -webkit-transition: all .4s;
    transition: all .4s;
    cursor: auto;
    overflow: hidden;
    opacity: 0;
    max-height: 0;
    z-index: 2
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate .rebate-popover h4 {
    font-weight: 400
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate .rebate-popover span {
    color: #de3231
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate .rebate-popover ul li {
    padding-left: 50px;
    text-align: left
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate .rebate-popover p {
    white-space: nowrap
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate .rebate-popover a {
    color: #0093e6
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .rebate:hover .rebate-popover {
    padding: 5px;
    border: 1px solid #f2f2f2;
    opacity: 1;
    box-shadow: 2px 2px 3px 4px rgba(0,0,0,.1);
    max-height: 300px
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .mb-5 {
    margin-bottom: 5px!important
}

.inside-page.list-items .group .two .l02-yb li.tag-wrapper .couponbgs:hover .ljsy {
    display: block
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper {
    height: 24px;
    margin-bottom: 6px
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .plus-div {
    display: inline-block;
    width: 102px;
    height: 22px;
    border-radius: 2px;
    border: 1px solid #30304a;
    line-height: 22px;
    color: #30304a;
    margin-right: 4px;
    background: #fff;
    cursor: pointer;
    position: relative
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .plus-div .plus-lq {
    display: inline-block;
    width: 32px;
    background: #30304a;
    color: #fffb90;
    text-align: center
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .plus-div .line {
    position: absolute;
    left: 32px;
    top: 0;
    background: transparent;
    height: 22px;
    border-right: 1px dashed #30304a
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .plus-div .plus-zx {
    display: inline-block;
    width: 66px;
    text-align: center;
    margin-left: -2px
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .plus-div .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #30304a;
    text-align: center;
    line-height: 22px;
    color: #fffb90
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .plus-div:hover .ljsy {
    display: block
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .orgin {
    display: inline-block;
    max-width: 100px;
    height: 22px;
    border: 1px solid #30304a;
    line-height: 22px;
    color: #30304a;
    text-align: center;
    padding: 0 6px;
    border-radius: 2px;
    cursor: pointer;
    position: relative
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .list-float-flag {
    position: absolute;
    left: 0;
    top: 30px;
    width: 129px;
    height: auto;
    padding: 10px 0;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    display: none;
    z-index: 5
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .list-float-flag s {
    position: absolute;
    top: -17px;
    left: 20px;
    display: block;
    height: 0;
    width: 0;
    border: 8px dashed transparent;
    border-bottom: 8px solid #cdcbce
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .list-float-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    display: block;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .list-float-flag .content {
    text-align: left;
    padding-left: 10px
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .list-float-flag .content li {
    color: #666
}

.inside-page.list-items .group .two .l02-yb li.plus-wrapper .list-float-flag .content li span {
    font-weight: 700
}

.inside-page.list-items .group .two .l02-yb li.xgj-wrapper {
    height: 24px;
    margin-bottom: 6px
}

.inside-page.list-items .group .two .l02-yb li.xgj-wrapper .xgj-div {
    width: 69px;
    height: 22px;
    border-radius: 2px;
    border: 1px solid #ff7800;
    text-align: center;
    line-height: 22px;
    color: #ff7800;
    font-size: 12px;
    margin-right: 4px;
    cursor: pointer;
    position: relative
}

.inside-page.list-items .group .two .l02-yb li.xgj-wrapper .xgj-div .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #ff7800;
    text-align: center;
    line-height: 22px;
    color: #fff
}

.inside-page.list-items .group .two .l02-yb li.xgj-wrapper .xgj-div:hover .ljsy {
    display: block
}

.inside-page.list-items .group .two .l02-yb .progress-total {
    position: relative;
    display: inline-block;
    width: 102px;
    height: 5px;
    border-radius: 7px;
    background: #dedede
}

.inside-page.list-items .group .two .l02-yb .progress-total .progress-percent {
    height: 5px;
    border-radius: 7px;
    background: -webkit-linear-gradient(left,#ffead8,#ff7800);
    background: linear-gradient(90deg,#ffead8,#ff7800)
}

.inside-page.list-items .group .two .l02-yb .progress-total:hover .tooltip {
    display: block
}

.inside-page.list-items .group .two .l02-yb .progress-total .tooltip {
    display: none;
    position: absolute;
    top: 15px;
    left: -40px;
    width: auto;
    max-width: 300px;
    min-width: 150px;
    min-height: 22px!important;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    background: #fff;
    z-index: 10
}

.inside-page.list-items .group .two .l02-yb .progress-total .tooltip .narrow {
    position: absolute;
    left: 50%;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px;
    -webkit-transform: rotate(1turn);
    transform: rotate(1turn)
}

.inside-page.list-items .group .two .l02-yb .progress-total .tooltip .content {
    min-height: 22px;
    line-height: 16px;
    font-size: 12px;
    font-weight: 400;
    color: #444;
    text-align: left;
    word-break: break-all
}

.inside-page.list-items .group .two .l02-yb .progress {
    position: relative
}

.inside-page.list-items .group .two .l02-yb .progress .look-group-detail {
    position: relative;
    text-decoration: underline;
    margin-left: 4px;
    cursor: pointer
}

.inside-page.list-items .group .two .l02-yb .progress .look-group-detail:hover {
    color: #0093e6
}

.inside-page.list-items .group .two .l02-yb .progress .detail-content-pop {
    position: absolute;
    top: 25px;
    left: 16px;
    padding: 11px;
    font-style: normal;
    color: #333;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    background-color: #fff;
    z-index: 999
}

.inside-page.list-items .group .two .l02-yb .progress .detail-content-pop .icon_tip_narrow {
    position: absolute;
    left: 45px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .group .two .l02-yb .progress .detail-content-pop .group-detail h4 {
    margin-bottom: 8px
}

.inside-page.list-items .group .two .l02-yb .progress .detail-content-pop .group-detail .content {
    width: 305px;
    height: 82px;
    background: #fafafa;
    font-size: 0
}

.inside-page.list-items .group .two .l02-yb .progress .detail-content-pop .group-detail .content .round {
    display: inline-block;
    width: 19px;
    height: 19px;
    margin: 13px 6px 6px;
    font-size: 12px;
    text-align: center;
    color: #ff7800;
    border-radius: 10px;
    border: 1px solid #ff7800
}

.inside-page.list-items .group .two .l02-yb .progress .detail-content-pop .group-detail .content .dash-line {
    display: inline-block;
    width: 50px;
    height: 1px;
    border-top: 1px dashed #ccc;
    vertical-align: 3px
}

.inside-page.list-items .group .two .l02-yb .progress .detail-content-pop .group-detail .content .label-wrap .label {
    display: inline-block;
    width: 50px;
    line-height: 16px;
    font-size: 12px;
    text-align: center
}

.inside-page.list-items .group .two .l02-ybg {
    width: 275px
}

.inside-page.list-items .group .two .band {
    width: 100%
}

.inside-page.list-items .group .two .band a {
    width: 110px;
    display: inline-block;
    vertical-align: bottom;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden
}

.inside-page.list-items .group .two .lower {
    width: 100%;
    float: left
}

.inside-page.list-items .group .two .lower .ellipsis {
    width: 200px;
    max-width: 200px
}

.inside-page.list-items .group .two .lower .ms {
    margin-bottom: 6px
}

.inside-page.list-items .group .two .lower .discuss-content-ellipsis {
    display: inline-block;
    vertical-align: top;
    max-width: 246px
}

.inside-page.list-items .group .show-dollar-transform-icon {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/prompt-usd.b2ad18ac.svg) no-repeat 50%;
    background-size: 14px 14px
}

.inside-page.list-items .group .show-dollar-transform-icon .common-float-dialog {
    padding: 10px 12px;
    left: -23px
}

.inside-page.list-items .group .show-dollar-transform-icon .common-float-content {
    white-space: nowrap
}

.inside-page.list-items .group .show-dollar-transform-icon .common-float-content .item {
    line-height: 1.75;
    text-align: left
}

.inside-page.list-items .group .show-dollar-transform-icon:hover .common-float-dialog {
    display: block
}

.inside-page.list-items .group .three {
    width: 155px
}

.inside-page.list-items .group .three .three-nr {
    width: 100%;
    float: left
}

.inside-page.list-items .group .three .three-nr li {
    height: 21px
}

.inside-page.list-items .group .three .three-nr li p {
    float: left;
    text-align: right
}

.inside-page.list-items .group .three .three-nr .three-nr-01 {
    margin-bottom: 6px;
    height: auto;
    text-align: center;
    color: #444
}

.inside-page.list-items .group .three .three-nr .three-nr-01 .show-discount-icon {
    position: relative;
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/prompt-rmb.3f416450.svg) no-repeat 50%;
    background-size: 16px 16px
}

.inside-page.list-items .group .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog {
    padding: 10px 12px;
    left: auto;
    right: 0;
    -webkit-transform: translateX(50px);
    transform: translateX(50px)
}

.inside-page.list-items .group .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content {
    white-space: nowrap;
    text-align: left
}

.inside-page.list-items .group .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item {
    display: inline-block
}

.inside-page.list-items .group .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item.num-cel {
    text-align: right
}

.inside-page.list-items .group .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item.not-plus-o-price-cel .o-price {
    color: #999;
    text-decoration: line-through
}

.inside-page.list-items .group .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .f-s {
    left: auto;
    right: 50px
}

.inside-page.list-items .group .three .three-nr .three-nr-01 .show-discount-icon:hover .common-float-dialog {
    display: block
}

.inside-page.list-items .group .three .three-nr .three-nr-01 .group-icon {
    display: inline-block;
    width: 12px;
    height: 14px;
    margin-left: 2px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/group-icon.23e9c5fa.svg);
    vertical-align: text-top
}

.inside-page.list-items .group .three .three-nr .text_initial {
    text-align: initial
}

.inside-page.list-items .group .three .three-nr .text_initial span {
    display: inline-block
}

.inside-page.list-items .group .three .three-nr .text_initial .p-1 {
    width: 63px;
    text-align: right
}

.inside-page.list-items .group .three .three-nr .text_initial .p-2 {
    width: 80px;
    margin-left: 14px
}

.inside-page.list-items .group .three .three-nr .text_initial .p-3 {
    width: 65px;
    margin-left: 3px
}

.inside-page.list-items .group .three .three-nr .ccd {
    float: left
}

.inside-page.list-items .group .three .three-nr .ccd .plus-ff7900 {
    color: #ff7900
}

.inside-page.list-items .group .three .three-nr .ccd .del-ff7900 {
    color: #444
}

.inside-page.list-items .group .three .three-nr .ccd-ppbbz {
    float: left
}

.inside-page.list-items .group .three .three-nr .ccdbj {
    width: 64px;
    height: 20px;
    border: 1px solid #ccc;
    text-align: center;
    line-height: 20px;
    color: #444
}

.inside-page.list-items .group .three .three-nr .ccdbj a {
    display: block;
    width: 100%;
    height: 100%
}

.inside-page.list-items .group .three .three-nr .ccdbj:hover {
    color: #0093e6;
    border-color: #0093e6
}

.inside-page.list-items .group .three .three-nr .price-warp {
    width: auto;
    height: 21px;
    text-align: center
}

.inside-page.list-items .group .three .three-nr .price-warp .ppbbz-p {
    width: 70px
}

.inside-page.list-items .group .three .three-nr .price-warp .ppbbz-nowrap {
    margin-left: 0
}

.inside-page.list-items .group .three .three-nrg {
    width: 165px;
    float: left
}

.inside-page.list-items .group .three .three-nrg3 {
    width: 175px;
    float: left
}

.inside-page.list-items .group .three .hk-radio {
    padding-left: 15px
}

.inside-page.list-items .group .three .radio-label {
    display: inline-block;
    margin-bottom: 4px
}

.inside-page.list-items .group .three .radio-label.local-radio-label {
    position: relative
}

.inside-page.list-items .group .three .radio-label.local-radio-label .radio-label-dialog {
    left: auto;
    right: 155px;
    top: -20px
}

.inside-page.list-items .group .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content {
    white-space: nowrap;
    text-align: left
}

.inside-page.list-items .group .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-list-li {
    line-height: 1.75
}

.inside-page.list-items .group .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-gradient {
    width: 68px;
    text-align: right
}

.inside-page.list-items .group .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price {
    width: 70px
}

.inside-page.list-items .group .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price.hk-usd {
    width: 80px
}

.inside-page.list-items .group .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price.hk-rmb {
    width: auto
}

.inside-page.list-items .group .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-list-tit .price.hk-usd {
    margin-left: -10px
}

.inside-page.list-items .group .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-f-s {
    display: none
}

.inside-page.list-items .group .three .input-radio {
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNyIgY3k9IjciIHI9IjciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkiIGZpbGw9IiNGRkYiIHN0cm9rZT0iI0FBQSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) no-repeat 50%;
    background-size: 14px
}

.inside-page.list-items .group .three .input-radio.disabled {
    background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIHN0cm9rZT0iI0NDQyIgZmlsbD0iI0ZGRiIgY3g9IjYiIGN5PSI2IiByPSI2Ii8+PGNpcmNsZSBmaWxsPSIjQ0NDIiBjeD0iNiIgY3k9IjYiIHI9IjMiLz48L2c+PC9zdmc+)
}

.inside-page.list-items .group .three .input-radio.active {
    background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjRkY3ODAwIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI0ZGRiIgY3g9IjciIGN5PSI3IiByPSI3Ii8+PGNpcmNsZSBmaWxsPSIjRkY3ODAwIiBjeD0iNyIgY3k9IjciIHI9IjQiLz48L2c+PC9zdmc+)
}

.inside-page.list-items .group .ffour,.inside-page.list-items .group .three-change {
    width: 165px;
    padding-top: 42px
}

.inside-page.list-items .group .ffour .finput,.inside-page.list-items .group .three-change .finput {
    width: 100%
}

.inside-page.list-items .group .ffour .finput li,.inside-page.list-items .group .three-change .finput li {
    margin-bottom: 3px;
    width: 100%;
    height: 18px
}

.inside-page.list-items .group .ffour .finput li.stocks-style,.inside-page.list-items .group .three-change .finput li.stocks-style {
    height: auto
}

.inside-page.list-items .group .ffour .finput li.price-input,.inside-page.list-items .group .three-change .finput li.price-input {
    height: 24px;
    position: relative
}

.inside-page.list-items .group .ffour .finput li.price-input .cartnumbers,.inside-page.list-items .group .three-change .finput li.price-input .cartnumbers {
    width: 70px;
    height: 22px;
    border: 1px solid #ccc;
    border-right: none;
    padding: 0 4px;
    float: left;
    background: #fff;
    font-size: 12px
}

.inside-page.list-items .group .ffour .finput li.price-input .cFF7800,.inside-page.list-items .group .three-change .finput li.price-input .cFF7800 {
    color: #ff7800
}

.inside-page.list-items .group .ffour .finput li.price-input .unit,.inside-page.list-items .group .three-change .finput li.price-input .unit {
    width: 47px;
    height: 22px;
    border: 1px solid #ccc;
    background: #fafafa;
    position: relative;
    float: left;
    cursor: pointer
}

.inside-page.list-items .group .ffour .finput li.price-input .unit span,.inside-page.list-items .group .three-change .finput li.price-input .unit span {
    display: inline-block;
    width: 32px;
    height: 22px;
    text-align: center;
    line-height: 22px
}

.inside-page.list-items .group .ffour .finput li.price-input .unit i,.inside-page.list-items .group .three-change .finput li.price-input .unit i {
    display: inline-block;
    width: 20px;
    height: 14px;
    position: absolute;
    right: 0;
    top: 4px
}

.inside-page.list-items .group .ffour .finput li.price-input .unit i.xl,.inside-page.list-items .group .three-change .finput li.price-input .unit i.xl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.inside-page.list-items .group .ffour .finput li.price-input .unit i.sl,.inside-page.list-items .group .three-change .finput li.price-input .unit i.sl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.inside-page.list-items .group .ffour .finput li.price-input .unit .unit-contain,.inside-page.list-items .group .three-change .finput li.price-input .unit .unit-contain {
    display: none;
    width: 47px;
    height: 44px;
    border: 1px solid #ccc;
    background: #fafafa;
    position: absolute;
    left: -1px;
    top: -1px;
    z-index: 6
}

.inside-page.list-items .group .ffour .finput li.price-input .unit .unit-contain span:hover,.inside-page.list-items .group .three-change .finput li.price-input .unit .unit-contain span:hover {
    color: #ff7800
}

.inside-page.list-items .group .ffour .finput li.price-input .cccc,.inside-page.list-items .group .three-change .finput li.price-input .cccc {
    color: #ccc
}

.inside-page.list-items .group .ffour .finput li.price-input-hk,.inside-page.list-items .group .three-change .finput li.price-input-hk {
    display: none
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li,.inside-page.list-items .group .three-change .finput li.totalPrice-li {
    white-space: nowrap
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .plus_mj,.inside-page.list-items .group .three-change .finput li.totalPrice-li .plus_mj {
    display: none;
    vertical-align: -4px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    position: relative;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plus_mj_icon.aa156a65.svg) 50% no-repeat
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .plus_mj .plus-flag,.inside-page.list-items .group .three-change .finput li.totalPrice-li .plus_mj .plus-flag {
    display: none;
    position: absolute;
    z-index: 5;
    right: -40px;
    top: 24px;
    width: auto;
    height: auto;
    padding: 10px;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #eaeaea;
    text-align: center
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .plus_mj .plus-flag s,.inside-page.list-items .group .three-change .finput li.totalPrice-li .plus_mj .plus-flag s {
    position: absolute;
    top: -13px;
    right: 41px;
    height: 0;
    width: 0;
    border: 6px dashed transparent;
    border-bottom: 6px solid #c8c8c8
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .plus_mj .plus-flag i,.inside-page.list-items .group .three-change .finput li.totalPrice-li .plus_mj .plus-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .plus_mj .plus-flag span,.inside-page.list-items .group .three-change .finput li.totalPrice-li .plus_mj .plus-flag span {
    font-size: 12px;
    color: #333;
    white-space: nowrap
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .plus_mj:hover .plus-flag,.inside-page.list-items .group .three-change .finput li.totalPrice-li .plus_mj:hover .plus-flag {
    display: block
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .rebate-flag,.inside-page.list-items .group .three-change .finput li.totalPrice-li .rebate-flag {
    position: relative;
    display: inline-block;
    width: 18px;
    height: 18px;
    line-height: 18px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/rebate.4e45e8f4.svg) no-repeat;
    cursor: pointer;
    vertical-align: text-top
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .rebate-flag .pop-box,.inside-page.list-items .group .three-change .finput li.totalPrice-li .rebate-flag .pop-box {
    position: absolute;
    top: 24px;
    left: -73px;
    min-width: 180px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .rebate-flag .pop-box .icon_tip_narrow,.inside-page.list-items .group .three-change .finput li.totalPrice-li .rebate-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 75px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text,.inside-page.list-items .group .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text,.inside-page.list-items .group .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text .rebate-money,.inside-page.list-items .group .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text .rebate-money {
    color: #333;
    font-weight: 700
}

.inside-page.list-items .group .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .link,.inside-page.list-items .group .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .link {
    color: #0093e6;
    text-decoration: underline
}

.inside-page.list-items .group .ffour .finput li.stocks,.inside-page.list-items .group .three-change .finput li.stocks {
    cursor: default
}

.inside-page.list-items .group .ffour .finput li.stocks i.pan-stock,.inside-page.list-items .group .three-change .finput li.stocks i.pan-stock {
    display: inline-block;
    vertical-align: bottom;
    width: 17px;
    height: 16px;
    margin-right: 3px;
    margin-bottom: 2px
}

.inside-page.list-items .group .ffour .finput li.stocks i.adequate,.inside-page.list-items .group .three-change .finput li.stocks i.adequate {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/adequate.3240c862.svg) 50% no-repeat
}

.inside-page.list-items .group .ffour .finput li.stocks .arrival-notice-btn,.inside-page.list-items .group .three-change .finput li.stocks .arrival-notice-btn {
    text-decoration: underline
}

.inside-page.list-items .group .ffour .finput li.stocks .arrival-notice-btn:hover,.inside-page.list-items .group .three-change .finput li.stocks .arrival-notice-btn:hover {
    color: #0094e5
}

.inside-page.list-items .group .ffour .finput li.stocks .stock-flag,.inside-page.list-items .group .three-change .finput li.stocks .stock-flag {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    line-height: 14px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/gantanhao.d8159e2e.svg) no-repeat;
    cursor: pointer;
    vertical-align: text-top
}

.inside-page.list-items .group .ffour .finput li.stocks .stock-flag .pop-box,.inside-page.list-items .group .three-change .finput li.stocks .stock-flag .pop-box {
    position: absolute;
    top: 30px;
    left: -10px;
    min-width: 100px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.list-items .group .ffour .finput li.stocks .stock-flag .pop-box .icon_tip_narrow,.inside-page.list-items .group .three-change .finput li.stocks .stock-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 13px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .group .ffour .finput li.stocks .stock-flag .pop-box .tip-text,.inside-page.list-items .group .three-change .finput li.stocks .stock-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.list-items .group .ffour .finput li.stocks .stock-flag .pop-box .tip-text .text,.inside-page.list-items .group .three-change .finput li.stocks .stock-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.inside-page.list-items .group .ffour .finput li.stocks .stock-flag .pop-box .tip-text .text .stock-num,.inside-page.list-items .group .three-change .finput li.stocks .stock-flag .pop-box .tip-text .text .stock-num {
    color: #333;
    font-weight: 700
}

.inside-page.list-items .group .ffour .finput .dh-style,.inside-page.list-items .group .three-change .finput .dh-style {
    display: inline-block
}

.inside-page.list-items .group .ffour .pan,.inside-page.list-items .group .three-change .pan {
    width: 100%;
    height: auto
}

.inside-page.list-items .group .ffour .pan .pan-list,.inside-page.list-items .group .three-change .pan .pan-list {
    position: relative
}

.inside-page.list-items .group .ffour .pan .pan-list .dinghuoyouhui:hover,.inside-page.list-items .group .ffour .pan .pan-list .icon-mark:hover .dinghuoyouhui,.inside-page.list-items .group .three-change .pan .pan-list .dinghuoyouhui:hover,.inside-page.list-items .group .three-change .pan .pan-list .icon-mark:hover .dinghuoyouhui {
    color: #ff7800
}

.inside-page.list-items .group .ffour .pan .pan-list .top-to-sale-btn,.inside-page.list-items .group .three-change .pan .pan-list .top-to-sale-btn {
    position: relative
}

.inside-page.list-items .group .ffour .pan .pan-list .top-to-sale-btn:hover .icon-tip,.inside-page.list-items .group .ffour .pan .pan-list .top-to-sale-btn:hover .icon-tip-narrow,.inside-page.list-items .group .three-change .pan .pan-list .top-to-sale-btn:hover .icon-tip,.inside-page.list-items .group .three-change .pan .pan-list .top-to-sale-btn:hover .icon-tip-narrow {
    display: block
}

.inside-page.list-items .group .ffour .pan .pan-list .top-to-sale-btn .icon-tip-narrow,.inside-page.list-items .group .three-change .pan .pan-list .top-to-sale-btn .icon-tip-narrow {
    display: none;
    position: absolute;
    right: -6px;
    top: 12px;
    z-index: 4;
    width: 6px;
    height: 9px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAJCAYAAAARml2dAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjAyOENFOUIwOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjAyOENFOUIxOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDI4Q0U5QUU5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDI4Q0U5QUY5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6wJC0SAAAARUlEQVR42mI4d/ocw////+EYyP8PAkwMSOD8mfP/DU0MwWwmbIJwCXRBmASGIEyCEagDqwQDUAeGJNxydEkU5yJLAgQYACcBK9GRst39AAAAAElFTkSuQmCC) no-repeat
}

.inside-page.list-items .group .ffour .pan .pan-list .top-to-sale-btn .icon-tip,.inside-page.list-items .group .three-change .pan .pan-list .top-to-sale-btn .icon-tip {
    display: none;
    position: absolute;
    top: -12px;
    left: 96px;
    z-index: 3;
    padding: 10px;
    color: #666;
    font-size: 12px;
    line-height: 18px;
    background-color: #fff;
    border: 1px solid #cecbce;
    box-sizing: border-box;
    box-shadow: 0 0 2px 3px #f2f2f2;
    width: 106px;
    text-align: center;
    border-radius: 2px;
    cursor: default
}

.inside-page.list-items .group .ffour .pan .pan-list .pan-list-btn,.inside-page.list-items .group .three-change .pan .pan-list .pan-list-btn {
    width: 92px;
    height: 33px;
    border: none;
    border-radius: 2px;
    background: #ff7800;
    color: #fff
}

.inside-page.list-items .group .ffour .pan .pan-list .pan-list-btn.product-move-btn,.inside-page.list-items .group .three-change .pan .pan-list .pan-list-btn.product-move-btn {
    position: relative;
    background: #5e5e5e
}

.inside-page.list-items .group .ffour .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip,.inside-page.list-items .group .three-change .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip {
    display: none;
    position: absolute;
    width: 202px;
    right: 0;
    top: 40px;
    color: #666;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    font-weight: 400;
    font-size: 12px;
    padding: 4px 8px;
    text-align: left;
    background: #fff;
    z-index: 1;
    line-height: 1.4
}

.inside-page.list-items .group .ffour .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip .icon-tip-narrow,.inside-page.list-items .group .three-change .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip .icon-tip-narrow {
    top: -6px;
    right: 5px
}

.inside-page.list-items .group .ffour .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip,.inside-page.list-items .group .ffour .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip .icon-tip-narrow,.inside-page.list-items .group .three-change .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip,.inside-page.list-items .group .three-change .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip .icon-tip-narrow {
    display: block
}

.inside-page.list-items .group .ffour .pan .pan-list .pan-list-btn.addCartBtn-TJ,.inside-page.list-items .group .three-change .pan .pan-list .pan-list-btn.addCartBtn-TJ {
    width: 92px;
    height: 33px;
    border: 1px solid #ff7800;
    border-radius: 2px;
    background: #fcf1e7;
    color: #ff7800
}

.inside-page.list-items .group .ffour .pan .pan-list .pan-list-btn.group-booking-btn,.inside-page.list-items .group .three-change .pan .pan-list .pan-list-btn.group-booking-btn {
    width: 92px;
    height: 33px;
    border-radius: 2px;
    color: #fff
}

.inside-page.list-items .group .ffour .pan .pan-list .pan-list-btn.orange,.inside-page.list-items .group .three-change .pan .pan-list .pan-list-btn.orange {
    border: 1px solid #ff7800;
    background: #ff7800
}

.inside-page.list-items .group .ffour .pan .pan-list .pan-list-btn.blue,.inside-page.list-items .group .three-change .pan .pan-list .pan-list-btn.blue {
    border: 1px solid #0093e6;
    background: #0093e6
}

.inside-page.list-items .group .ffour .pan .pan-list .hover-flag,.inside-page.list-items .group .three-change .pan .pan-list .hover-flag {
    position: relative;
    margin-top: 5px
}

.inside-page.list-items .group .ffour .pan .pan-list .hover-flag:hover .gmxz-box,.inside-page.list-items .group .three-change .pan .pan-list .hover-flag:hover .gmxz-box {
    display: block
}

.inside-page.list-items .group .ffour .pan .pan-list .hover-flag .gmxz,.inside-page.list-items .group .three-change .pan .pan-list .hover-flag .gmxz {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 18px;
    height: 19px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/warn.5d027012.svg) 50% no-repeat
}

.inside-page.list-items .group .ffour .pan .pan-list .hover-flag .gmxz-box,.inside-page.list-items .group .three-change .pan .pan-list .hover-flag .gmxz-box {
    display: none;
    position: absolute;
    top: 27px;
    left: -5px;
    width: 147px;
    padding: 9px;
    font-style: normal;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    z-index: 9999
}

.inside-page.list-items .group .ffour .pan .pan-list .hover-flag .gmxz-box .icon_tip_narrow,.inside-page.list-items .group .three-change .pan .pan-list .hover-flag .gmxz-box .icon_tip_narrow {
    position: absolute;
    left: 7px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .group .ffour .pan .pan-list .hover-flag .gmxz-box p,.inside-page.list-items .group .three-change .pan .pan-list .hover-flag .gmxz-box p {
    color: #666
}

.inside-page.list-items .group .ffour .pan .pan-list .add-cart-tip,.inside-page.list-items .group .three-change .pan .pan-list .add-cart-tip {
    display: none
}

.inside-page.list-items .group .ffour .pan .pan-list .add-cart-tip .add-cart,.inside-page.list-items .group .three-change .pan .pan-list .add-cart-tip .add-cart {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 20px;
    height: 20px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjOTk5IiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSI5Ii8+PHBhdGggZD0iTTQgOC42MzlMNy41OSAxMiAxNCA2Ii8+PC9nPjwvc3ZnPg==) 50% no-repeat
}

.inside-page.list-items .group .ffour .pan .pan-list .no-dh-wrap,.inside-page.list-items .group .three-change .pan .pan-list .no-dh-wrap {
    margin: 5px 0
}

.inside-page.list-items .group .ffour .pan .pan-list .no-dh-wrap .no-dh,.inside-page.list-items .group .three-change .pan .pan-list .no-dh-wrap .no-dh {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 18px;
    height: 19px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/no-dh.3e47a559.svg) 50% no-repeat
}

.inside-page.list-items .group .ffour .pan .pan-list .flag1,.inside-page.list-items .group .three-change .pan .pan-list .flag1 {
    float: left;
    margin-top: 5px;
    margin-right: 4px;
    width: 16px;
    height: 15px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCAwaDE2djE2SDB6Ii8+PGNpcmNsZSBzdHJva2U9IiM5OTkiIGN4PSI4LjQyMSIgY3k9IjguNDIxIiByPSI1Ljg5NSIvPjxwYXRoIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNOC40MjkgNS4wNTN2My4zNjgiLz48Y2lyY2xlIGZpbGw9IiM5OTkiIGZpbGwtcnVsZT0ibm9uemVybyIgY3g9IjguNDIxIiBjeT0iMTAuOTQ3IiByPSIxIi8+PC9nPjwvc3ZnPg==) no-repeat 50%
}

.inside-page.list-items .group .ffour .clock,.inside-page.list-items .group .three-change .clock {
    display: inline-block;
    width: 15px;
    height: 16px;
    margin-right: 2px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/alarm-clock-grey.ad5ba25b.svg);
    vertical-align: -3px
}

.inside-page.list-items .group .three-change {
    padding-top: 26px;
    width: 164px
}

.inside-page.list-items .old-batch-product-item {
    line-height: 20px;
    width: 100%
}

.inside-page.list-items .old-batch-product-item>td {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    padding: 16px 12px 20px
}

.inside-page.list-items .old-batch-product-item>td>div {
    display: inline-block;
    border-top: none
}

.inside-page.list-items .old-batch-product-item .section-1 {
    width: 90px
}

.inside-page.list-items .old-batch-product-item .section-1 img {
    width: 90px;
    height: 90px;
    float: left;
    overflow: hidden
}

.inside-page.list-items .old-batch-product-item .section-2 {
    padding-left: 12px;
    width: 280px
}

.inside-page.list-items .old-batch-product-item .section-2 .two-tit {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    color: #0093e6;
    font-size: 14px
}

.inside-page.list-items .old-batch-product-item .section-3 {
    margin-left: 23px;
    width: 230px
}

.inside-page.list-items .old-batch-product-item .section-3 .l02-yb {
    width: 193px
}

.inside-page.list-items .old-batch-product-item .section-3 .l02-yb li {
    height: 20px
}

.inside-page.list-items .old-batch-product-item .section-4 {
    width: 210px
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr {
    width: 100%;
    float: left
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr li {
    height: 21px
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr li p {
    float: left;
    text-align: right
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .three-nr-01 {
    margin-bottom: 6px;
    height: auto;
    text-align: center;
    color: #444
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .three-nr-01 .show-discount-icon {
    position: relative;
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/prompt-rmb.3f416450.svg) no-repeat 50%;
    background-size: 16px 16px
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .three-nr-01 .show-discount-icon .common-float-dialog {
    padding: 10px 12px;
    left: auto;
    right: 0;
    -webkit-transform: translateX(50px);
    transform: translateX(50px)
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content {
    white-space: nowrap;
    text-align: left
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item {
    display: inline-block
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item.num-cel {
    text-align: right
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item.not-plus-o-price-cel .o-price {
    color: #999;
    text-decoration: line-through
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .f-s {
    left: auto;
    right: 50px
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .three-nr-01 .show-discount-icon:hover .common-float-dialog {
    display: block
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .three-nr-01 .group-icon {
    display: inline-block;
    width: 12px;
    height: 14px;
    margin-left: 2px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/group-icon.23e9c5fa.svg);
    vertical-align: text-top
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .text_initial {
    text-align: initial
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .text_initial span {
    display: inline-block
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .text_initial .p-1 {
    width: 63px;
    text-align: right
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .text_initial .p-2 {
    width: 80px;
    margin-left: 14px
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .text_initial .p-3 {
    width: 65px;
    margin-left: 3px
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .ccd {
    float: left
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .ccd .plus-ff7900 {
    color: #ff7900
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .ccd .del-ff7900 {
    color: #444
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .ccd-ppbbz {
    float: left
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .ccdbj {
    width: 64px;
    height: 20px;
    border: 1px solid #ccc;
    text-align: center;
    line-height: 20px;
    color: #444
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .ccdbj a {
    display: block;
    width: 100%;
    height: 100%
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .ccdbj:hover {
    color: #0093e6;
    border-color: #0093e6
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .price-warp {
    width: auto;
    height: 21px;
    text-align: center
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .price-warp .ppbbz-p {
    width: 46%
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nr .price-warp .ppbbz-nowrap {
    margin-left: 0
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nrg {
    width: 165px;
    float: left
}

.inside-page.list-items .old-batch-product-item .section-4 .three-nrg3 {
    width: 175px;
    float: left
}

.inside-page.list-items .old-batch-product-item .section-4 .hk-radio {
    padding-left: 15px
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label {
    display: inline-block;
    margin-bottom: 4px
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label.local-radio-label {
    position: relative
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label.local-radio-label .radio-label-dialog {
    left: auto;
    right: 155px;
    top: -20px
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content {
    white-space: nowrap;
    text-align: left
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-list-li {
    line-height: 1.75
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-gradient {
    width: 68px;
    text-align: right
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price {
    width: 70px
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price.hk-usd {
    width: 80px
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price.hk-rmb {
    width: auto
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-list-tit .price.hk-usd {
    margin-left: -10px
}

.inside-page.list-items .old-batch-product-item .section-4 .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-f-s {
    display: none
}

.inside-page.list-items .old-batch-product-item .section-4 .input-radio {
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNyIgY3k9IjciIHI9IjciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkiIGZpbGw9IiNGRkYiIHN0cm9rZT0iI0FBQSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) no-repeat 50%;
    background-size: 14px
}

.inside-page.list-items .old-batch-product-item .section-4 .input-radio.disabled {
    background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIHN0cm9rZT0iI0NDQyIgZmlsbD0iI0ZGRiIgY3g9IjYiIGN5PSI2IiByPSI2Ii8+PGNpcmNsZSBmaWxsPSIjQ0NDIiBjeD0iNiIgY3k9IjYiIHI9IjMiLz48L2c+PC9zdmc+)
}

.inside-page.list-items .old-batch-product-item .section-4 .input-radio.active {
    background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjRkY3ODAwIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI0ZGRiIgY3g9IjciIGN5PSI3IiByPSI3Ii8+PGNpcmNsZSBmaWxsPSIjRkY3ODAwIiBjeD0iNyIgY3k9IjciIHI9IjQiLz48L2c+PC9zdmc+)
}

.inside-page.list-items .old-batch-product-item .section-5 {
    width: 150px;
    padding-left: 27px
}

.inside-page.list-items .old-batch-product-item .section-5 .finput {
    width: 100%
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li {
    margin-bottom: 3px;
    width: 100%;
    height: 18px
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks-style {
    height: auto
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input {
    height: 24px;
    position: relative
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input .cartnumbers {
    width: 70px;
    height: 22px;
    border: 1px solid #ccc;
    border-right: none;
    padding: 0 4px;
    float: left;
    background: #fff;
    font-size: 12px
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input .cFF7800 {
    color: #ff7800
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input .unit {
    width: 47px;
    height: 22px;
    border: 1px solid #ccc;
    background: #fafafa;
    position: relative;
    float: left;
    cursor: pointer
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input .unit span {
    display: inline-block;
    width: 32px;
    height: 22px;
    text-align: center;
    line-height: 22px
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input .unit i {
    display: inline-block;
    width: 20px;
    height: 14px;
    position: absolute;
    right: 0;
    top: 4px
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input .unit i.xl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input .unit i.sl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input .unit .unit-contain {
    display: none;
    width: 47px;
    height: 44px;
    border: 1px solid #ccc;
    background: #fafafa;
    position: absolute;
    left: -1px;
    top: -1px;
    z-index: 6
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input .unit .unit-contain span:hover {
    color: #ff7800
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input .cccc {
    color: #ccc
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.price-input-hk {
    display: none
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li {
    white-space: nowrap
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .plus_mj {
    display: none;
    vertical-align: -4px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    position: relative;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plus_mj_icon.aa156a65.svg) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .plus_mj .plus-flag {
    display: none;
    position: absolute;
    z-index: 5;
    right: -40px;
    top: 24px;
    width: auto;
    height: auto;
    padding: 10px;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #eaeaea;
    text-align: center
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .plus_mj .plus-flag s {
    position: absolute;
    top: -13px;
    right: 41px;
    height: 0;
    width: 0;
    border: 6px dashed transparent;
    border-bottom: 6px solid #c8c8c8
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .plus_mj .plus-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .plus_mj .plus-flag span {
    font-size: 12px;
    color: #333;
    white-space: nowrap
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .plus_mj:hover .plus-flag {
    display: block
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .rebate-flag {
    position: relative;
    display: inline-block;
    width: 18px;
    height: 18px;
    line-height: 18px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/rebate.4e45e8f4.svg) no-repeat;
    cursor: pointer;
    vertical-align: text-top
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .rebate-flag .pop-box {
    position: absolute;
    top: 24px;
    left: -73px;
    min-width: 180px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .rebate-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 75px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .rebate-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text .rebate-money {
    color: #333;
    font-weight: 700
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .link {
    color: #0093e6;
    text-decoration: underline
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks {
    cursor: default
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks i.pan-stock {
    display: inline-block;
    vertical-align: bottom;
    width: 17px;
    height: 16px;
    margin-right: 3px;
    margin-bottom: 2px
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks i.adequate {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/adequate.3240c862.svg) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks .arrival-notice-btn {
    text-decoration: underline
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks .arrival-notice-btn:hover {
    color: #0094e5
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks .stock-flag {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    line-height: 14px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/gantanhao.d8159e2e.svg) no-repeat;
    cursor: pointer;
    vertical-align: text-top
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks .stock-flag .pop-box {
    position: absolute;
    top: 30px;
    left: -10px;
    min-width: 100px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks .stock-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 13px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks .stock-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks .stock-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.inside-page.list-items .old-batch-product-item .section-5 .finput li.stocks .stock-flag .pop-box .tip-text .text .stock-num {
    color: #333;
    font-weight: 700
}

.inside-page.list-items .old-batch-product-item .section-5 .finput .dh-style {
    display: inline-block
}

.inside-page.list-items .old-batch-product-item .section-6 .finput {
    width: 100%
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li {
    margin-bottom: 3px;
    width: 100%;
    height: 18px
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks-style {
    height: auto
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input {
    height: 24px;
    position: relative
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input .cartnumbers {
    width: 70px;
    height: 22px;
    border: 1px solid #ccc;
    border-right: none;
    padding: 0 4px;
    float: left;
    background: #fff;
    font-size: 12px
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input .cFF7800 {
    color: #ff7800
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input .unit {
    width: 47px;
    height: 22px;
    border: 1px solid #ccc;
    background: #fafafa;
    position: relative;
    float: left;
    cursor: pointer
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input .unit span {
    display: inline-block;
    width: 32px;
    height: 22px;
    text-align: center;
    line-height: 22px
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input .unit i {
    display: inline-block;
    width: 20px;
    height: 14px;
    position: absolute;
    right: 0;
    top: 4px
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input .unit i.xl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input .unit i.sl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input .unit .unit-contain {
    display: none;
    width: 47px;
    height: 44px;
    border: 1px solid #ccc;
    background: #fafafa;
    position: absolute;
    left: -1px;
    top: -1px;
    z-index: 6
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input .unit .unit-contain span:hover {
    color: #ff7800
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input .cccc {
    color: #ccc
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.price-input-hk {
    display: none
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li {
    white-space: nowrap
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .plus_mj {
    display: none;
    vertical-align: -4px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    position: relative;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plus_mj_icon.aa156a65.svg) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .plus_mj .plus-flag {
    display: none;
    position: absolute;
    z-index: 5;
    right: -40px;
    top: 24px;
    width: auto;
    height: auto;
    padding: 10px;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #eaeaea;
    text-align: center
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .plus_mj .plus-flag s {
    position: absolute;
    top: -13px;
    right: 41px;
    height: 0;
    width: 0;
    border: 6px dashed transparent;
    border-bottom: 6px solid #c8c8c8
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .plus_mj .plus-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .plus_mj .plus-flag span {
    font-size: 12px;
    color: #333;
    white-space: nowrap
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .plus_mj:hover .plus-flag {
    display: block
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .rebate-flag {
    position: relative;
    display: inline-block;
    width: 18px;
    height: 18px;
    line-height: 18px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/rebate.4e45e8f4.svg) no-repeat;
    cursor: pointer;
    vertical-align: text-top
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .rebate-flag .pop-box {
    position: absolute;
    top: 24px;
    left: -73px;
    min-width: 180px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .rebate-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 75px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .rebate-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text .rebate-money {
    color: #333;
    font-weight: 700
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .link {
    color: #0093e6;
    text-decoration: underline
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks {
    cursor: default
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks i.pan-stock {
    display: inline-block;
    vertical-align: bottom;
    width: 17px;
    height: 16px;
    margin-right: 3px;
    margin-bottom: 2px
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks i.adequate {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/adequate.3240c862.svg) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks .arrival-notice-btn {
    text-decoration: underline
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks .arrival-notice-btn:hover {
    color: #0094e5
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks .stock-flag {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    line-height: 14px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/gantanhao.d8159e2e.svg) no-repeat;
    cursor: pointer;
    vertical-align: text-top
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks .stock-flag .pop-box {
    position: absolute;
    top: 30px;
    left: -10px;
    min-width: 100px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks .stock-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 13px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks .stock-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks .stock-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.inside-page.list-items .old-batch-product-item .section-6 .finput li.stocks .stock-flag .pop-box .tip-text .text .stock-num {
    color: #333;
    font-weight: 700
}

.inside-page.list-items .old-batch-product-item .section-6 .finput .dh-style {
    display: inline-block
}

.inside-page.list-items .old-batch-product-item .section-6 .pan {
    width: 100%;
    height: auto
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list {
    position: relative
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .dinghuoyouhui:hover,.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .icon-mark:hover .dinghuoyouhui {
    color: #ff7800
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .top-to-sale-btn {
    position: relative
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .top-to-sale-btn:hover .icon-tip,.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .top-to-sale-btn:hover .icon-tip-narrow {
    display: block
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .top-to-sale-btn .icon-tip-narrow {
    display: none;
    position: absolute;
    right: -6px;
    top: 12px;
    z-index: 4;
    width: 6px;
    height: 9px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAJCAYAAAARml2dAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjAyOENFOUIwOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjAyOENFOUIxOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDI4Q0U5QUU5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDI4Q0U5QUY5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6wJC0SAAAARUlEQVR42mI4d/ocw////+EYyP8PAkwMSOD8mfP/DU0MwWwmbIJwCXRBmASGIEyCEagDqwQDUAeGJNxydEkU5yJLAgQYACcBK9GRst39AAAAAElFTkSuQmCC) no-repeat
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .top-to-sale-btn .icon-tip {
    display: none;
    position: absolute;
    top: -12px;
    left: 96px;
    z-index: 3;
    padding: 10px;
    color: #666;
    font-size: 12px;
    line-height: 18px;
    background-color: #fff;
    border: 1px solid #cecbce;
    box-sizing: border-box;
    box-shadow: 0 0 2px 3px #f2f2f2;
    width: 106px;
    text-align: center;
    border-radius: 2px;
    cursor: default
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .pan-list-btn {
    width: 92px;
    height: 33px;
    border: none;
    border-radius: 2px;
    background: #ff7800;
    color: #fff
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .pan-list-btn.product-move-btn {
    position: relative;
    background: #5e5e5e
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip {
    display: none;
    position: absolute;
    width: 202px;
    right: 0;
    top: 40px;
    color: #666;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    font-weight: 400;
    font-size: 12px;
    padding: 4px 8px;
    text-align: left;
    background: #fff;
    z-index: 1;
    line-height: 1.4
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip .icon-tip-narrow {
    top: -6px;
    right: 5px
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip,.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip .icon-tip-narrow {
    display: block
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .pan-list-btn.addCartBtn-TJ {
    width: 92px;
    height: 33px;
    border: 1px solid #ff7800;
    border-radius: 2px;
    background: #fcf1e7;
    color: #ff7800
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .pan-list-btn.group-booking-btn {
    width: 92px;
    height: 33px;
    border-radius: 2px;
    color: #fff
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .pan-list-btn.orange {
    border: 1px solid #ff7800;
    background: #ff7800
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .pan-list-btn.blue {
    border: 1px solid #0093e6;
    background: #0093e6
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .hover-flag {
    position: relative;
    margin-top: 5px
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .hover-flag:hover .gmxz-box {
    display: block
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .hover-flag .gmxz {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 18px;
    height: 19px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/warn.5d027012.svg) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .hover-flag .gmxz-box {
    display: none;
    position: absolute;
    top: 27px;
    left: -5px;
    width: 147px;
    padding: 9px;
    font-style: normal;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    z-index: 9999
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .hover-flag .gmxz-box .icon_tip_narrow {
    position: absolute;
    left: 7px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .hover-flag .gmxz-box p {
    color: #666
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .add-cart-tip {
    display: none
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .add-cart-tip .add-cart {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 20px;
    height: 20px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjOTk5IiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSI5Ii8+PHBhdGggZD0iTTQgOC42MzlMNy41OSAxMiAxNCA2Ii8+PC9nPjwvc3ZnPg==) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .no-dh-wrap {
    margin: 5px 0
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .no-dh-wrap .no-dh {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 18px;
    height: 19px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/no-dh.3e47a559.svg) 50% no-repeat
}

.inside-page.list-items .old-batch-product-item .section-6 .pan .pan-list .flag1 {
    float: left;
    margin-top: 5px;
    margin-right: 4px;
    width: 16px;
    height: 15px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCAwaDE2djE2SDB6Ii8+PGNpcmNsZSBzdHJva2U9IiM5OTkiIGN4PSI4LjQyMSIgY3k9IjguNDIxIiByPSI1Ljg5NSIvPjxwYXRoIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNOC40MjkgNS4wNTN2My4zNjgiLz48Y2lyY2xlIGZpbGw9IiM5OTkiIGZpbGwtcnVsZT0ibm9uemVybyIgY3g9IjguNDIxIiBjeT0iMTAuOTQ3IiByPSIxIi8+PC9nPjwvc3ZnPg==) no-repeat 50%
}

.inside-page.list-items .old-batch-product-item .section-6 .clock {
    display: inline-block;
    width: 15px;
    height: 16px;
    margin-right: 2px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/alarm-clock-grey.ad5ba25b.svg);
    vertical-align: -3px
}

.inside-page.list-items .icon-left {
    display: none;
    position: absolute;
    left: -6px;
    top: 25px;
    z-index: 1;
    padding: 10px;
    color: #666;
    font-size: 12px;
    line-height: 18px;
    background-color: #fff;
    border: 1px solid #cecbce;
    box-sizing: border-box;
    box-shadow: 0 0 2px 3px #f2f2f2;
    width: 106px;
    text-align: left;
    border-radius: 2px;
    cursor: default
}

.inside-page.list-items.no-one-hk .line-box {
    padding-bottom: 8px
}

.inside-page.list-items.no-one-hk .line-box .line-box-right {
    width: calc(100% - 102px)
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    width: 100%
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom .two {
    overflow: hidden;
    width: 280px;
    min-width: 280px;
    /*max-width: 280px*/
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom .two .l02-zb {
    width: auto
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom .two ul li {
    max-width: auto
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom .three-change {
    width: 150px;
    margin-right: 25px;
    padding-left: 27px;
    -webkit-flex-shrink: 0;
    flex-shrink: 0;
    box-sizing: border-box;
    position: relative;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-orient: vertical;
    -webkit-box-direction: normal;
    -webkit-flex-direction: column;
    flex-direction: column
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom .three-change.originPosition {
    width: 120px
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom .three-change.originPosition .smt-stock {
    position: inherit;
    bottom: 0;
    left: 0
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom .three-change .smt-stock {
    position: absolute;
    bottom: 17px;
    border-top: 1px dashed #c5c1c1;
    padding: 6px 0;
    left: 0
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom .three-change .finput {
    width: auto;
    line-height: 23px
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom .three-box-top .three-hk {
    display: none
}

.inside-page.list-items.no-one-hk .line-box .line-box-right .line-box-right-bottom .three-box-bottom {
    bottom: -50px;
    left: 0
}

.inside-page.group-items .one {
    width: 90px;
    padding-left: 15px
}

.inside-page.group-items .one .one-to-item-link {
    position: relative;
    display: block
}

.inside-page.group-items .one .one-to-item-link .new-product {
    position: absolute;
    left: 0;
    top: 0;
    width: 72px;
    height: 22px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/new-product.ca62bd8e.png) 50% no-repeat;
    font-size: 12px;
    color: #fff
}

.inside-page.group-items .one .one-to-item-link .new-product span {
    margin: 0;
    padding-left: 6px;
    line-height: 22px
}

.inside-page.group-items .one .flash-sales {
    line-height: 15px;
    font-size: 12px;
    background: #f30;
    width: 35px;
    height: 35px;
    text-align: center;
    color: #fff;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1
}

.inside-page.group-items .one .clearance {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/clearance.94296441.svg);
    width: 36px;
    height: 29px;
    line-height: 29px;
    text-align: center;
    text-indent: 5px;
    position: absolute;
    color: #fff;
    top: 0;
    left: 0;
    z-index: 1
}

.inside-page.group-items .one .shuang11-discount-icon {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    min-width: 35px;
    height: 35px;
    line-height: 35px;
    text-align: center;
    font-size: 12px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/shuang11_discount_icon_item.26f7f55c.png) 50% no-repeat;
    background-size: 35px;
    color: #fff
}

.inside-page.group-items .one img {
    width: 90px;
    height: 90px;
    float: left;
    overflow: hidden
}

.inside-page.group-items .one img.pticon {
    position: absolute;
    top: -1px;
    right: -1px;
    z-index: 1;
    width: 58px;
    height: 18px
}

.inside-page.group-items .one img.is-hot-img {
    position: absolute;
    top: -1px;
    left: -1px;
    z-index: 1;
    width: 45px;
    height: 39px
}

.inside-page.group-items .one span {
    width: 90px;
    float: left;
    margin: 3px 0
}

.inside-page.group-items .one .db,.inside-page.group-items .one .sc {
    float: left;
    background: #fff;
    border: 1px solid #e9e9e9;
    height: 20px;
    width: 45px;
    color: #999;
    font-size: 12px;
    cursor: pointer
}

.inside-page.group-items .one .db {
    border-right-color: transparent
}

.inside-page.group-items .one .db:hover,.inside-page.group-items .one .sc:hover {
    border: 1px solid #ff7800;
    color: #ff7800
}

.inside-page.group-items .two {
    padding-left: 15px
}

.inside-page.group-items .two .remain-time {
    display: inline-block;
    margin-bottom: 5px
}

.inside-page.group-items .two .remain-time .bold {
    font-weight: 700;
    color: #ff7800
}

.inside-page.group-items .two .two-tit {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    color: #0093e6;
    font-size: 14px;
    max-width: 200px
}

.inside-page.group-items .two .two-tit .product-name-link {
    display: block;
    max-width: 200px;
    float: left
}

.inside-page.group-items .two .two-tit .catalog {
    display: inline-block;
    max-width: 100px;
    height: 19px;
    background: #f9f9f9;
    padding: 2px 10px;
    margin-left: 4px;
    font-size: 12px;
    color: #979797
}

.inside-page.group-items .two .two-tit .catalog:hover {
    color: #0093e6
}

.inside-page.group-items .two .two-tit .smt-flag {
    display: inline-block;
    width: 117px;
    height: 22px;
    line-height: 22px;
    margin-left: 6px;
    font-size: 12px;
    text-align: center;
    color: #ff7800;
    background: #fff5eb
}

.inside-page.group-items .two .two-tit .common-useless-mro {
    background: #e4ecff;
    color: #3a6cef;
    width: -webkit-max-content;
    width: max-content;
    padding: 0 5px;
    border-radius: 2px;
    height: 22px;
    line-height: 22px;
    font-size: 12px;
    margin-left: 6px
}

.inside-page.group-items .two .two-01 {
    float: left
}

.inside-page.group-items .two .two-01 ul li {
    box-sizing: border-box;
    width: 100%;
    max-width: 230px;
    height: 23px;
    margin: 0;
    padding: 0
}

.inside-page.group-items .two .two-01 .li-ellipsis {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap
}

.inside-page.group-items .two .two-01 .multi-ellipsis {
    height: 36px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    cursor: pointer
}

.inside-page.group-items .two .two-01 .copy-input-des {
    position: absolute;
    z-index: -1;
    width: 1px;
    height: 1px;
    opacity: 0
}

.inside-page.group-items .two .l02-zb {
    width: 230px;
    float: left;
    margin-right: 40px
}

.inside-page.group-items .two .l02-zb li a {
    color: #333
}

.inside-page.group-items .two .l02-zb a:hover,.inside-page.group-items .two .l02-zb li b a {
    color: #0093e6
}

.inside-page.group-items .two .l02-zb .ellipsis {
    width: 200px;
    max-width: 200px
}

.inside-page.group-items .two .l02-zb .ms {
    margin-bottom: 6px;
    color: #444
}

.inside-page.group-items .two .l02-zb .ellipsis-link {
    max-width: 240px
}

.inside-page.group-items .two i.sjck-i {
    width: 15px;
    height: 16px;
    display: inline-block;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/link.1e242339.svg) no-repeat;
    vertical-align: text-bottom;
    margin-left: -4px
}

.inside-page.group-items .two a.sjck-a {
    text-decoration: underline
}

.inside-page.group-items .two a.sjck-a:hover {
    color: #0094e7
}

.inside-page.group-items .two .l02-yb {
    width: 193px;
    float: left
}

.inside-page.group-items .two .l02-yb li {
    height: 20px
}

.inside-page.group-items .two .l02-yb li.btn-wrapper {
    height: auto
}

.inside-page.group-items .two .l02-yb li.btn-wrapper a {
    display: inline-block;
    margin-right: 10px;
    margin-bottom: 6px
}

.inside-page.group-items .two .l02-yb li.btn-wrapper a i {
    margin-right: 2px;
    display: inline-block;
    vertical-align: bottom;
    width: 16px;
    height: 16px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png);
    background-repeat: no-repeat;
    background-position-y: -33px
}

.inside-page.group-items .two .l02-yb li.btn-wrapper a.sjsc i {
    background-position-x: -23px;
    background-position-y: -32px
}

.inside-page.group-items .two .l02-yb li.btn-wrapper a.jswl i {
    background-position-x: -122px
}

.inside-page.group-items .two .l02-yb li.btn-wrapper a.ptsp i {
    background-position-x: -47px
}

.inside-page.group-items .two .l02-yb li.btn-wrapper a.mfyzb i {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAQCAYAAAFRk36sAAAAAXNSR0IArs4c6QAAAYpJREFUKBV9Ur9Lw1AQ/l6bai24KbUFKejkD0QQETdncXZwdG3r4FAEcfUPMGmwf4CrTnXW0UHoJFJws0laEVw6SJucl5e8mBDIg+Te3fd99+7uPQHD7oLoENAtAi+hNr4jVxDJiwO4MNGsbARcIiFh3WkmNDmI3CXneUOzGjBgOHs+NSf5oPPAhgcGTvIfMsOgbvW4qL6i/IOGdc2HbDMwB8N6568W9aHYcZuoMw5AiMeEn3C4UI3n9MENnMKlNe7EYkUejfKDT9TQqKxKRXv0Cs/to1DaUhk0tQEVZ1GeX8axcFUsBo5bGI03uQXOJH74SjhttMQnhPeCevVehjImF/afyYjSJjesCUZrOGdJhL223YJuP6HtXKQwDgSTnSnWMPntsF8KSYvcSI/v6IQbu+O5vaCxdBMlkFVmlWoOV9ChQiRQG9bEphNGb+11TOkZhAE8T8MCdhmZKI2yaeGUdkDCgSCTy73C93Af5tdACmh6BA91cNbMp6Wyp6ws1X9eWX2mVH5AdP8Amx6cGUMCKU8AAAAASUVORK5CYII=) 50% no-repeat
}

.inside-page.group-items .two .l02-yb li.btn-wrapper a.designyzb i {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAFM0aXcAAAAAXNSR0IArs4c6QAAAbhJREFUKBVtUj1LJEEQfb27aGAiJrLrbxAxMBDhUDjQVCPBSDE6dhEVzD3hLj2YGUQwFTQyUzDRxMhAEQzuggsMpl1FUEQRnJm6Vz0zezu7VtBd/V59dL9qAy+8AjAC+DaiA0NE1EnNv1tGCwnslKIlGBM7Wkr9uhdzGjUDiBj44auLKix+eKtkxYFe+AgpTbIeW2YXKETrYft+VLc0I7Dr9MtscI0Eq2jUppHEE8QuuytoL785C+9uOKsgV/Dshx5gWKFUnsS3wb/urFDrpTmS7wa7udu9+/aCvcMdx3h2kf5DexT1qqwjsBvsuQXBL0cG4Zzu1KrDguYCRbmARGdFMicQnaJeHaIIme0+DyBKnpARilZa73x/E/b8gUZ1KI/vVuo/87mnM3DP1Omr6Xw77Uh6iad8O9eX/OE7NxWiwpZfR87pP3Lsv3k1Q1mWUDZjiDBGfI1XHdfgTqswVFCvfSkQnj1GLHvEYvT0LDrOKRX/hJgX5hxQre/p9ylk8tConnHV7wNokh+eUPuvPK3AJD4LHCr1ebIyrU5Zko5AzEy72mnyqRSL3DTrkGSekuy7uXUkaW21f26ps3f8kqGiAAAAAElFTkSuQmCC) 50% no-repeat
}

.inside-page.group-items .two .l02-yb li.btn-wrapper a.fayzb i {
    background-position-x: -96px
}

.inside-page.group-items .two .l02-yb li.btn-wrapper a.bomqd i {
    background-position-x: -256px;
    background-position-y: -114px
}

.inside-page.group-items .two .l02-yb li.btn-wrapper a:hover {
    color: #0093e6
}

.inside-page.group-items .two .l02-yb li.hy-sample {
    height: 24px;
    margin-bottom: 6px
}

.inside-page.group-items .two .l02-yb li.hy-sample span {
    display: inline-block;
    color: #666;
    border-radius: 2px;
    border: 1px solid #666;
    box-sizing: border-box;
    padding: 2px 4px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper {
    height: auto;
    margin-bottom: 6px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .money-off-flag {
    position: relative;
    width: 70px;
    height: 22px;
    line-height: 22px;
    border-radius: 2px;
    border: 1px solid #ff7800;
    text-align: center;
    color: #ff7800;
    cursor: pointer;
    font-size: 12px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .money-off-flag .pop-box {
    position: absolute;
    top: 29px;
    left: -10px;
    width: 200px;
    padding: 5px 10px 10px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .money-off-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 20px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .money-off-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .money-off-flag .pop-box .tip-text .text {
    margin-top: 7px;
    line-height: 18px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .money-off-flag .pop-box .tip-text .link {
    color: #0093e6;
    text-decoration: underline
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .money-off-flag .opacity-mask {
    width: 74px;
    height: 20px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .money-off-flag .opacity-mask:hover .pop-box,.inside-page.group-items .two .l02-yb li.tag-wrapper .money-off-flag:hover .pop-box {
    display: block
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .original-sample {
    background-color: #83cdff;
    color: #fff;
    padding: 3px 11px;
    border: none;
    margin-right: 2px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .stop-product {
    background-color: #c9c9c9;
    color: #fff;
    padding: 3px 13px;
    border: none;
    margin-right: 2px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .sold-out {
    background-color: #ff9b9b;
    color: #fff;
    padding: 3px 11px;
    border: none;
    margin-right: 2px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .on-sale {
    background-color: #ffbb7f;
    color: #fff;
    padding: 3px 13px;
    border: none;
    margin-right: 2px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper>span {
    box-sizing: border-box;
    padding: 2px 8px;
    border: 1px solid;
    border-radius: 2px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .orgin {
    border-radius: 2px;
    border: 1px solid #ff7800;
    font-size: 12px;
    text-align: center;
    line-height: 22px;
    color: #ff7800;
    cursor: pointer;
    position: relative
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .list-float-flag {
    position: absolute;
    left: 0;
    top: 30px;
    width: 129px;
    height: auto;
    padding: 10px 0;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    display: none;
    z-index: 5
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .list-float-flag s {
    position: absolute;
    top: -17px;
    left: 20px;
    display: block;
    height: 0;
    width: 0;
    border: 8px dashed transparent;
    border-bottom: 8px solid #cdcbce
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .list-float-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    display: block;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .list-float-flag .content {
    text-align: left;
    padding-left: 10px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .list-float-flag .content li {
    color: #666
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .list-float-flag .content li span {
    font-weight: 700
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .list-float-flag .content:hover .common-float-dialog {
    display: block
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .couponbgs {
    display: inline-block;
    font-size: 12px;
    cursor: pointer;
    color: #ff7800;
    text-align: center;
    border-radius: 2px;
    border: 1px solid #ff7800;
    box-sizing: border-box;
    padding: 0 4px;
    line-height: 22px;
    position: relative
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .couponbgs.mro-box {
    border-color: #567eeb;
    color: #567eeb;
    padding: 0 13px 0 4px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .couponbgs .lq {
    display: inline-block;
    width: 32px;
    height: 22px;
    background: #fff5eb;
    margin-left: -4px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .couponbgs .lq.mro-lq {
    background: #567eeb;
    color: #fff
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .couponbgs .line {
    position: absolute;
    left: 31px;
    top: 0;
    background: transparent;
    height: 22px;
    border-right: 1px dashed #ff7800
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .couponbgs .line.mro-line {
    border-right: 1px solid #567eeb
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .couponbgs .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #ff7800;
    text-align: center;
    line-height: 22px;
    color: #fff
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .couponbgs .ljsy.mro-ljsy {
    background: #567eeb
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .couponbgs .p-3 {
    width: 65px;
    margin-left: 3px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .ccd {
    float: left
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .ccd .plus-ff7900 {
    color: #ff7900
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .ccd .del-ff7900 {
    color: #444
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .ccd-ppbbz {
    float: left
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .ccdbj {
    width: 64px;
    height: 20px;
    border: 1px solid #ccc;
    text-align: center;
    line-height: 20px;
    color: #444
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .couponbgs:hover .ljsy {
    display: block;
    width: 100%;
    height: 100%
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .ccdbj:hover {
    color: #0093e6;
    border-color: #0093e6
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .price-warp {
    width: auto;
    height: 21px;
    text-align: center
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .price-warp .ppbbz-p {
    width: 70px
}

.inside-page.group-items .two .l02-yb li.tag-wrapper .price-warp .ppbbz-nowrap {
    margin-left: 0
}

.inside-page.group-items .two .l02-yb li.plus-wrapper {
    height: 24px;
    margin-bottom: 6px
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .plus-div {
    display: inline-block;
    width: 102px;
    height: 22px;
    border-radius: 2px;
    border: 1px solid #30304a;
    line-height: 22px;
    color: #30304a;
    margin-right: 4px;
    background: #fff;
    cursor: pointer;
    position: relative
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .plus-div .plus-lq {
    display: inline-block;
    width: 32px;
    background: #30304a;
    color: #fffb90;
    text-align: center
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .plus-div .line {
    position: absolute;
    left: 32px;
    top: 0;
    background: transparent;
    height: 22px;
    border-right: 1px dashed #30304a
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .plus-div .plus-zx {
    display: inline-block;
    width: 66px;
    text-align: center;
    margin-left: -2px
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .plus-div .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #30304a;
    text-align: center;
    line-height: 22px;
    color: #fffb90
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .plus-div:hover .ljsy {
    display: block
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .orgin {
    display: inline-block;
    max-width: 100px;
    height: 22px;
    border: 1px solid #30304a;
    line-height: 22px;
    color: #30304a;
    text-align: center;
    padding: 0 6px;
    border-radius: 2px;
    cursor: pointer;
    position: relative
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .list-float-flag {
    position: absolute;
    left: 0;
    top: 30px;
    width: 129px;
    height: auto;
    padding: 10px 0;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    display: none;
    z-index: 5
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .list-float-flag s {
    position: absolute;
    top: -17px;
    left: 20px;
    display: block;
    height: 0;
    width: 0;
    border: 8px dashed transparent;
    border-bottom: 8px solid #cdcbce
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .list-float-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    display: block;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .list-float-flag .content {
    text-align: left;
    padding-left: 10px
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .list-float-flag .content li {
    color: #666
}

.inside-page.group-items .two .l02-yb li.plus-wrapper .list-float-flag .content li span {
    font-weight: 700
}

.inside-page.group-items .two .l02-yb li.xgj-wrapper {
    height: 24px;
    margin-bottom: 6px
}

.inside-page.group-items .two .l02-yb li.xgj-wrapper .xgj-div {
    width: 69px;
    height: 22px;
    border-radius: 2px;
    border: 1px solid #ff7800;
    text-align: center;
    line-height: 22px;
    color: #ff7800;
    font-size: 12px;
    margin-right: 4px;
    cursor: pointer;
    position: relative
}

.inside-page.group-items .two .l02-yb li.xgj-wrapper .xgj-div .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #ff7800;
    text-align: center;
    line-height: 22px;
    color: #fff
}

.inside-page.group-items .two .l02-yb li.xgj-wrapper .xgj-div:hover .ljsy {
    display: block
}

.inside-page.group-items .two .l02-yb .progress-total {
    position: relative;
    display: inline-block;
    width: 102px;
    height: 5px;
    border-radius: 7px;
    background: #dedede
}

.inside-page.group-items .two .l02-yb .progress-total .progress-percent {
    height: 5px;
    border-radius: 7px;
    background: -webkit-linear-gradient(left,#ffead8,#ff7800);
    background: linear-gradient(90deg,#ffead8,#ff7800)
}

.inside-page.group-items .two .l02-yb .progress-total:hover .tooltip {
    display: block
}

.inside-page.group-items .two .l02-yb .progress-total .tooltip {
    display: none;
    position: absolute;
    top: 15px;
    left: -40px;
    width: auto;
    max-width: 300px;
    min-width: 150px;
    min-height: 22px!important;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    background: #fff;
    z-index: 10
}

.inside-page.group-items .two .l02-yb .progress-total .tooltip .narrow {
    position: absolute;
    left: 50%;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px;
    -webkit-transform: rotate(1turn);
    transform: rotate(1turn)
}

.inside-page.group-items .two .l02-yb .progress-total .tooltip .content {
    min-height: 22px;
    line-height: 16px;
    font-size: 12px;
    font-weight: 400;
    color: #444;
    text-align: left;
    word-break: break-all
}

.inside-page.group-items .two .l02-yb .progress {
    position: relative
}

.inside-page.group-items .two .l02-yb .progress .look-group-detail {
    position: relative;
    text-decoration: underline;
    margin-left: 4px;
    cursor: pointer
}

.inside-page.group-items .two .l02-yb .progress .look-group-detail:hover {
    color: #0093e6
}

.inside-page.group-items .two .l02-yb .progress .detail-content-pop {
    position: absolute;
    top: 25px;
    left: 16px;
    padding: 11px;
    font-style: normal;
    color: #333;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    background-color: #fff
}

.inside-page.group-items .two .l02-yb .progress .detail-content-pop .icon_tip_narrow {
    position: absolute;
    left: 45px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.group-items .two .l02-yb .progress .detail-content-pop .group-detail h4 {
    margin-bottom: 8px
}

.inside-page.group-items .two .l02-yb .progress .detail-content-pop .group-detail .content {
    width: 305px;
    height: 82px;
    background: #fafafa;
    font-size: 0
}

.inside-page.group-items .two .l02-yb .progress .detail-content-pop .group-detail .content .round {
    display: inline-block;
    width: 19px;
    height: 19px;
    margin: 13px 6px 6px;
    font-size: 12px;
    text-align: center;
    color: #ff7800;
    border-radius: 10px;
    border: 1px solid #ff7800
}

.inside-page.group-items .two .l02-yb .progress .detail-content-pop .group-detail .content .dash-line {
    display: inline-block;
    width: 50px;
    height: 1px;
    border-top: 1px dashed #ccc;
    vertical-align: 3px
}

.inside-page.group-items .two .l02-yb .progress .detail-content-pop .group-detail .content .label-wrap .label {
    display: inline-block;
    width: 50px;
    line-height: 16px;
    font-size: 12px;
    text-align: center
}

.inside-page.group-items .two .l02-ybg {
    width: 275px
}

.inside-page.group-items .two .band {
    width: 100%
}

.inside-page.group-items .two .band a {
    width: 110px;
    display: inline-block;
    vertical-align: bottom;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden
}

.inside-page.group-items .two .lower {
    width: 100%;
    float: left
}

.inside-page.group-items .two .lower .ellipsis {
    width: 200px;
    max-width: 200px
}

.inside-page.group-items .two .lower .ms {
    margin-bottom: 6px
}

.inside-page.group-items .two .lower .discuss-content-ellipsis {
    display: inline-block;
    vertical-align: top;
    max-width: 246px
}

.inside-page.group-items .show-dollar-transform-icon {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/prompt-usd.b2ad18ac.svg) no-repeat 50%;
    background-size: 14px 14px
}

.inside-page.group-items .show-dollar-transform-icon .common-float-dialog {
    padding: 10px 12px;
    left: -23px
}

.inside-page.group-items .show-dollar-transform-icon .common-float-content {
    white-space: nowrap
}

.inside-page.group-items .show-dollar-transform-icon .common-float-content .item {
    line-height: 1.75;
    text-align: left
}

.inside-page.group-items .show-dollar-transform-icon:hover .common-float-dialog {
    display: block
}

.inside-page.group-items .three {
    width: 155px;
    padding-top: 26px
}

.inside-page.group-items .three .three-nr .price-warp .ppbbz-p {
    width: 135px
}

.inside-page.group-items .three .three-nr .price-warp .ppbbz-g {
    width: 98px
}

.inside-page.group-items .three .three-nr .price-warp .ppbbz-p3 {
    width: 85px
}

.inside-page.group-items .three .three-nr {
    width: 100%;
    float: left
}

.inside-page.group-items .three .three-nr li {
    height: 21px
}

.inside-page.group-items .three .three-nr li p {
    float: left;
    text-align: right
}

.inside-page.group-items .three .three-nr .three-nr-01 {
    margin-bottom: 6px;
    height: auto;
    text-align: center;
    color: #444
}

.inside-page.group-items .three .three-nr .three-nr-01 .show-discount-icon {
    position: relative;
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/prompt-rmb.3f416450.svg) no-repeat 50%;
    background-size: 16px 16px
}

.inside-page.group-items .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog {
    padding: 10px 12px;
    left: auto;
    right: 0;
    -webkit-transform: translateX(50px);
    transform: translateX(50px)
}

.inside-page.group-items .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content {
    white-space: nowrap;
    text-align: left
}

.inside-page.group-items .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item {
    display: inline-block
}

.inside-page.group-items .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item.num-cel {
    text-align: right
}

.inside-page.group-items .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .common-float-content .cel-item.not-plus-o-price-cel .o-price {
    color: #999;
    text-decoration: line-through
}

.inside-page.group-items .three .three-nr .three-nr-01 .show-discount-icon .common-float-dialog .f-s {
    left: auto;
    right: 50px
}

.inside-page.group-items .three .three-nr .three-nr-01 .show-discount-icon:hover .common-float-dialog {
    display: block
}

.inside-page.group-items .three .three-nr .three-nr-01 .group-icon {
    display: inline-block;
    width: 12px;
    height: 14px;
    margin-left: 2px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/group-icon.23e9c5fa.svg);
    vertical-align: text-top
}

.inside-page.group-items .three .three-nr .text_initial {
    text-align: initial
}

.inside-page.group-items .three .three-nr .text_initial span {
    display: inline-block
}

.inside-page.group-items .three .three-nr .text_initial .p-1 {
    width: 63px;
    text-align: right
}

.inside-page.group-items .three .three-nr .text_initial .p-2 {
    width: 80px;
    margin-left: 14px
}

.inside-page.group-items .three .three-nr .text_initial .p-3 {
    width: 65px;
    margin-left: 3px
}

.inside-page.group-items .three .three-nr .ccd {
    float: left
}

.inside-page.group-items .three .three-nr .ccd .plus-ff7900 {
    color: #ff7900
}

.inside-page.group-items .three .three-nr .ccd .del-ff7900 {
    color: #444
}

.inside-page.group-items .three .three-nr .ccd-ppbbz {
    float: left
}

.inside-page.group-items .three .three-nr .ccdbj {
    width: 64px;
    height: 20px;
    border: 1px solid #ccc;
    text-align: center;
    line-height: 20px;
    color: #444
}

.inside-page.group-items .three .three-nr .ccdbj a {
    display: block;
    width: 100%;
    height: 100%
}

.inside-page.group-items .three .three-nr .ccdbj:hover {
    color: #0093e6;
    border-color: #0093e6
}

.inside-page.group-items .three .three-nr .price-warp {
    width: auto;
    height: 21px;
    text-align: center
}

.inside-page.group-items .three .three-nr .price-warp .ppbbz-p {
    width: 70px
}

.inside-page.group-items .three .three-nr .price-warp .ppbbz-nowrap {
    margin-left: 0
}

.inside-page.group-items .three .three-nrg {
    width: 165px;
    float: left
}

.inside-page.group-items .three .three-nrg3 {
    width: 175px;
    float: left
}

.inside-page.group-items .three .hk-radio {
    padding-left: 15px
}

.inside-page.group-items .three .radio-label {
    display: inline-block;
    margin-bottom: 4px
}

.inside-page.group-items .three .radio-label.local-radio-label {
    position: relative
}

.inside-page.group-items .three .radio-label.local-radio-label .radio-label-dialog {
    left: auto;
    right: 155px;
    top: -20px
}

.inside-page.group-items .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content {
    white-space: nowrap;
    text-align: left
}

.inside-page.group-items .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-list-li {
    line-height: 1.75
}

.inside-page.group-items .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-gradient {
    width: 68px;
    text-align: right
}

.inside-page.group-items .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price {
    width: 70px
}

.inside-page.group-items .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price.hk-usd {
    width: 80px
}

.inside-page.group-items .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price.hk-rmb {
    width: auto
}

.inside-page.group-items .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-content .price-list-tit .price.hk-usd {
    margin-left: -10px
}

.inside-page.group-items .three .radio-label.local-radio-label .radio-label-dialog .radio-label-dialog-f-s {
    display: none
}

.inside-page.group-items .three .input-radio {
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: -3px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNyIgY3k9IjciIHI9IjciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkiIGZpbGw9IiNGRkYiIHN0cm9rZT0iI0FBQSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) no-repeat 50%;
    background-size: 14px
}

.inside-page.group-items .three .input-radio.disabled {
    background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIHN0cm9rZT0iI0NDQyIgZmlsbD0iI0ZGRiIgY3g9IjYiIGN5PSI2IiByPSI2Ii8+PGNpcmNsZSBmaWxsPSIjQ0NDIiBjeD0iNiIgY3k9IjYiIHI9IjMiLz48L2c+PC9zdmc+)
}

.inside-page.group-items .three .input-radio.active {
    background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjRkY3ODAwIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI0ZGRiIgY3g9IjciIGN5PSI3IiByPSI3Ii8+PGNpcmNsZSBmaWxsPSIjRkY3ODAwIiBjeD0iNyIgY3k9IjciIHI9IjQiLz48L2c+PC9zdmc+)
}

.inside-page.group-items .ffour,.inside-page.group-items .three-change {
    width: 166px;
    padding-top: 26px
}

.inside-page.group-items .ffour .finput,.inside-page.group-items .three-change .finput {
    width: 100%
}

.inside-page.group-items .ffour .finput li,.inside-page.group-items .three-change .finput li {
    margin-bottom: 3px;
    width: 100%;
    height: 18px
}

.inside-page.group-items .ffour .finput li.stocks-style,.inside-page.group-items .three-change .finput li.stocks-style {
    height: auto
}

.inside-page.group-items .ffour .finput li.price-input,.inside-page.group-items .three-change .finput li.price-input {
    height: 24px;
    position: relative
}

.inside-page.group-items .ffour .finput li.price-input .cartnumbers,.inside-page.group-items .three-change .finput li.price-input .cartnumbers {
    width: 70px;
    height: 22px;
    border: 1px solid #ccc;
    border-right: none;
    padding: 0 4px;
    float: left;
    background: #fff;
    font-size: 12px
}

.inside-page.group-items .ffour .finput li.price-input .cFF7800,.inside-page.group-items .three-change .finput li.price-input .cFF7800 {
    color: #ff7800
}

.inside-page.group-items .ffour .finput li.price-input .unit,.inside-page.group-items .three-change .finput li.price-input .unit {
    width: 47px;
    height: 22px;
    border: 1px solid #ccc;
    background: #fafafa;
    position: relative;
    float: left;
    cursor: pointer
}

.inside-page.group-items .ffour .finput li.price-input .unit span,.inside-page.group-items .three-change .finput li.price-input .unit span {
    display: inline-block;
    width: 32px;
    height: 22px;
    text-align: center;
    line-height: 22px
}

.inside-page.group-items .ffour .finput li.price-input .unit i,.inside-page.group-items .three-change .finput li.price-input .unit i {
    display: inline-block;
    width: 20px;
    height: 14px;
    position: absolute;
    right: 0;
    top: 4px
}

.inside-page.group-items .ffour .finput li.price-input .unit i.xl,.inside-page.group-items .three-change .finput li.price-input .unit i.xl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.inside-page.group-items .ffour .finput li.price-input .unit i.sl,.inside-page.group-items .three-change .finput li.price-input .unit i.sl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.inside-page.group-items .ffour .finput li.price-input .unit .unit-contain,.inside-page.group-items .three-change .finput li.price-input .unit .unit-contain {
    display: none;
    width: 47px;
    height: 44px;
    border: 1px solid #ccc;
    background: #fafafa;
    position: absolute;
    left: -1px;
    top: -1px;
    z-index: 6
}

.inside-page.group-items .ffour .finput li.price-input .unit .unit-contain span:hover,.inside-page.group-items .three-change .finput li.price-input .unit .unit-contain span:hover {
    color: #ff7800
}

.inside-page.group-items .ffour .finput li.price-input .cccc,.inside-page.group-items .three-change .finput li.price-input .cccc {
    color: #ccc
}

.inside-page.group-items .ffour .finput li.price-input-hk,.inside-page.group-items .three-change .finput li.price-input-hk {
    display: none
}

.inside-page.group-items .ffour .finput li.totalPrice-li,.inside-page.group-items .three-change .finput li.totalPrice-li {
    white-space: nowrap
}

.inside-page.group-items .ffour .finput li.totalPrice-li .plus_mj,.inside-page.group-items .three-change .finput li.totalPrice-li .plus_mj {
    display: none;
    vertical-align: -4px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    position: relative;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plus_mj_icon.aa156a65.svg) 50% no-repeat
}

.inside-page.group-items .ffour .finput li.totalPrice-li .plus_mj .plus-flag,.inside-page.group-items .three-change .finput li.totalPrice-li .plus_mj .plus-flag {
    display: none;
    position: absolute;
    z-index: 5;
    right: -40px;
    top: 24px;
    width: auto;
    height: auto;
    padding: 10px;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #eaeaea;
    text-align: center
}

.inside-page.group-items .ffour .finput li.totalPrice-li .plus_mj .plus-flag s,.inside-page.group-items .three-change .finput li.totalPrice-li .plus_mj .plus-flag s {
    position: absolute;
    top: -13px;
    right: 41px;
    height: 0;
    width: 0;
    border: 6px dashed transparent;
    border-bottom: 6px solid #c8c8c8
}

.inside-page.group-items .ffour .finput li.totalPrice-li .plus_mj .plus-flag i,.inside-page.group-items .three-change .finput li.totalPrice-li .plus_mj .plus-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.inside-page.group-items .ffour .finput li.totalPrice-li .plus_mj .plus-flag span,.inside-page.group-items .three-change .finput li.totalPrice-li .plus_mj .plus-flag span {
    font-size: 12px;
    color: #333;
    white-space: nowrap
}

.inside-page.group-items .ffour .finput li.totalPrice-li .plus_mj:hover .plus-flag,.inside-page.group-items .three-change .finput li.totalPrice-li .plus_mj:hover .plus-flag {
    display: block
}

.inside-page.group-items .ffour .finput li.totalPrice-li .rebate-flag,.inside-page.group-items .three-change .finput li.totalPrice-li .rebate-flag {
    position: relative;
    display: inline-block;
    width: 18px;
    height: 18px;
    line-height: 18px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/rebate.4e45e8f4.svg) no-repeat;
    cursor: pointer;
    vertical-align: text-top
}

.inside-page.group-items .ffour .finput li.totalPrice-li .rebate-flag .pop-box,.inside-page.group-items .three-change .finput li.totalPrice-li .rebate-flag .pop-box {
    position: absolute;
    top: 24px;
    left: -73px;
    min-width: 180px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.group-items .ffour .finput li.totalPrice-li .rebate-flag .pop-box .icon_tip_narrow,.inside-page.group-items .three-change .finput li.totalPrice-li .rebate-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 75px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.group-items .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text,.inside-page.group-items .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.group-items .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text,.inside-page.group-items .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.inside-page.group-items .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text .rebate-money,.inside-page.group-items .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .text .rebate-money {
    color: #333;
    font-weight: 700
}

.inside-page.group-items .ffour .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .link,.inside-page.group-items .three-change .finput li.totalPrice-li .rebate-flag .pop-box .tip-text .link {
    color: #0093e6;
    text-decoration: underline
}

.inside-page.group-items .ffour .finput li.stocks,.inside-page.group-items .three-change .finput li.stocks {
    cursor: default
}

.inside-page.group-items .ffour .finput li.stocks i.pan-stock,.inside-page.group-items .three-change .finput li.stocks i.pan-stock {
    display: inline-block;
    vertical-align: bottom;
    width: 17px;
    height: 16px;
    margin-right: 3px;
    margin-bottom: 2px
}

.inside-page.group-items .ffour .finput li.stocks i.adequate,.inside-page.group-items .three-change .finput li.stocks i.adequate {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/adequate.3240c862.svg) 50% no-repeat
}

.inside-page.group-items .ffour .finput li.stocks .arrival-notice-btn,.inside-page.group-items .three-change .finput li.stocks .arrival-notice-btn {
    text-decoration: underline
}

.inside-page.group-items .ffour .finput li.stocks .arrival-notice-btn:hover,.inside-page.group-items .three-change .finput li.stocks .arrival-notice-btn:hover {
    color: #0094e5
}

.inside-page.group-items .ffour .finput li.stocks .stock-flag,.inside-page.group-items .three-change .finput li.stocks .stock-flag {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    line-height: 14px;
    border-radius: 2px;
    text-align: center;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/gantanhao.d8159e2e.svg) no-repeat;
    cursor: pointer;
    vertical-align: text-top
}

.inside-page.group-items .ffour .finput li.stocks .stock-flag .pop-box,.inside-page.group-items .three-change .finput li.stocks .stock-flag .pop-box {
    position: absolute;
    top: 30px;
    left: -10px;
    min-width: 100px;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.inside-page.group-items .ffour .finput li.stocks .stock-flag .pop-box .icon_tip_narrow,.inside-page.group-items .three-change .finput li.stocks .stock-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 13px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.group-items .ffour .finput li.stocks .stock-flag .pop-box .tip-text,.inside-page.group-items .three-change .finput li.stocks .stock-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.inside-page.group-items .ffour .finput li.stocks .stock-flag .pop-box .tip-text .text,.inside-page.group-items .three-change .finput li.stocks .stock-flag .pop-box .tip-text .text {
    height: 16px;
    line-height: 16px;
    white-space: nowrap
}

.inside-page.group-items .ffour .finput li.stocks .stock-flag .pop-box .tip-text .text .stock-num,.inside-page.group-items .three-change .finput li.stocks .stock-flag .pop-box .tip-text .text .stock-num {
    color: #333;
    font-weight: 700
}

.inside-page.group-items .ffour .finput .dh-style,.inside-page.group-items .three-change .finput .dh-style {
    display: inline-block
}

.inside-page.group-items .ffour .pan,.inside-page.group-items .three-change .pan {
    width: 100%;
    height: auto
}

.inside-page.group-items .ffour .pan .pan-list,.inside-page.group-items .three-change .pan .pan-list {
    position: relative
}

.inside-page.group-items .ffour .pan .pan-list .dinghuoyouhui:hover,.inside-page.group-items .ffour .pan .pan-list .icon-mark:hover .dinghuoyouhui,.inside-page.group-items .three-change .pan .pan-list .dinghuoyouhui:hover,.inside-page.group-items .three-change .pan .pan-list .icon-mark:hover .dinghuoyouhui {
    color: #ff7800
}

.inside-page.group-items .ffour .pan .pan-list .top-to-sale-btn,.inside-page.group-items .three-change .pan .pan-list .top-to-sale-btn {
    position: relative
}

.inside-page.group-items .ffour .pan .pan-list .top-to-sale-btn:hover .icon-tip,.inside-page.group-items .ffour .pan .pan-list .top-to-sale-btn:hover .icon-tip-narrow,.inside-page.group-items .three-change .pan .pan-list .top-to-sale-btn:hover .icon-tip,.inside-page.group-items .three-change .pan .pan-list .top-to-sale-btn:hover .icon-tip-narrow {
    display: block
}

.inside-page.group-items .ffour .pan .pan-list .top-to-sale-btn .icon-tip-narrow,.inside-page.group-items .three-change .pan .pan-list .top-to-sale-btn .icon-tip-narrow {
    display: none;
    position: absolute;
    right: -6px;
    top: 12px;
    z-index: 4;
    width: 6px;
    height: 9px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAJCAYAAAARml2dAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjAyOENFOUIwOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjAyOENFOUIxOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDI4Q0U5QUU5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDI4Q0U5QUY5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6wJC0SAAAARUlEQVR42mI4d/ocw////+EYyP8PAkwMSOD8mfP/DU0MwWwmbIJwCXRBmASGIEyCEagDqwQDUAeGJNxydEkU5yJLAgQYACcBK9GRst39AAAAAElFTkSuQmCC) no-repeat
}

.inside-page.group-items .ffour .pan .pan-list .top-to-sale-btn .icon-tip,.inside-page.group-items .three-change .pan .pan-list .top-to-sale-btn .icon-tip {
    display: none;
    position: absolute;
    top: -12px;
    left: 96px;
    z-index: 3;
    padding: 10px;
    color: #666;
    font-size: 12px;
    line-height: 18px;
    background-color: #fff;
    border: 1px solid #cecbce;
    box-sizing: border-box;
    box-shadow: 0 0 2px 3px #f2f2f2;
    width: 106px;
    text-align: center;
    border-radius: 2px;
    cursor: default
}

.inside-page.group-items .ffour .pan .pan-list .pan-list-btn,.inside-page.group-items .three-change .pan .pan-list .pan-list-btn {
    width: 92px;
    height: 33px;
    border: none;
    border-radius: 2px;
    background: #ff7800;
    color: #fff
}

.inside-page.group-items .ffour .pan .pan-list .pan-list-btn.product-move-btn,.inside-page.group-items .three-change .pan .pan-list .pan-list-btn.product-move-btn {
    position: relative;
    background: #5e5e5e
}

.inside-page.group-items .ffour .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip,.inside-page.group-items .three-change .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip {
    display: none;
    position: absolute;
    width: 202px;
    right: 0;
    top: 40px;
    color: #666;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    font-weight: 400;
    font-size: 12px;
    padding: 4px 8px;
    text-align: left;
    background: #fff;
    z-index: 1;
    line-height: 1.4
}

.inside-page.group-items .ffour .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip .icon-tip-narrow,.inside-page.group-items .three-change .pan .pan-list .pan-list-btn.product-move-btn .product-move-tip .icon-tip-narrow {
    top: -6px;
    right: 5px
}

.inside-page.group-items .ffour .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip,.inside-page.group-items .ffour .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip .icon-tip-narrow,.inside-page.group-items .three-change .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip,.inside-page.group-items .three-change .pan .pan-list .pan-list-btn.product-move-btn:hover .product-move-tip .icon-tip-narrow {
    display: block
}

.inside-page.group-items .ffour .pan .pan-list .pan-list-btn.addCartBtn-TJ,.inside-page.group-items .three-change .pan .pan-list .pan-list-btn.addCartBtn-TJ {
    width: 92px;
    height: 33px;
    border: 1px solid #ff7800;
    border-radius: 2px;
    background: #fcf1e7;
    color: #ff7800
}

.inside-page.group-items .ffour .pan .pan-list .pan-list-btn.group-booking-btn,.inside-page.group-items .three-change .pan .pan-list .pan-list-btn.group-booking-btn {
    width: 92px;
    height: 33px;
    border-radius: 2px;
    color: #fff
}

.inside-page.group-items .ffour .pan .pan-list .pan-list-btn.orange,.inside-page.group-items .three-change .pan .pan-list .pan-list-btn.orange {
    border: 1px solid #ff7800;
    background: #ff7800
}

.inside-page.group-items .ffour .pan .pan-list .pan-list-btn.blue,.inside-page.group-items .three-change .pan .pan-list .pan-list-btn.blue {
    border: 1px solid #0093e6;
    background: #0093e6
}

.inside-page.group-items .ffour .pan .pan-list .hover-flag,.inside-page.group-items .three-change .pan .pan-list .hover-flag {
    position: relative;
    margin-top: 5px
}

.inside-page.group-items .ffour .pan .pan-list .hover-flag:hover .gmxz-box,.inside-page.group-items .three-change .pan .pan-list .hover-flag:hover .gmxz-box {
    display: block
}

.inside-page.group-items .ffour .pan .pan-list .hover-flag .gmxz,.inside-page.group-items .three-change .pan .pan-list .hover-flag .gmxz {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 18px;
    height: 19px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/warn.5d027012.svg) 50% no-repeat
}

.inside-page.group-items .ffour .pan .pan-list .hover-flag .gmxz-box,.inside-page.group-items .three-change .pan .pan-list .hover-flag .gmxz-box {
    display: none;
    position: absolute;
    top: 27px;
    left: -5px;
    width: 147px;
    padding: 9px;
    font-style: normal;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    z-index: 9999
}

.inside-page.group-items .ffour .pan .pan-list .hover-flag .gmxz-box .icon_tip_narrow,.inside-page.group-items .three-change .pan .pan-list .hover-flag .gmxz-box .icon_tip_narrow {
    position: absolute;
    left: 7px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.inside-page.group-items .ffour .pan .pan-list .hover-flag .gmxz-box p,.inside-page.group-items .three-change .pan .pan-list .hover-flag .gmxz-box p {
    color: #666
}

.inside-page.group-items .ffour .pan .pan-list .add-cart-tip,.inside-page.group-items .three-change .pan .pan-list .add-cart-tip {
    display: none
}

.inside-page.group-items .ffour .pan .pan-list .add-cart-tip .add-cart,.inside-page.group-items .three-change .pan .pan-list .add-cart-tip .add-cart {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 20px;
    height: 20px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjOTk5IiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSI5Ii8+PHBhdGggZD0iTTQgOC42MzlMNy41OSAxMiAxNCA2Ii8+PC9nPjwvc3ZnPg==) 50% no-repeat
}

.inside-page.group-items .ffour .pan .pan-list .no-dh-wrap,.inside-page.group-items .three-change .pan .pan-list .no-dh-wrap {
    margin: 5px 0
}

.inside-page.group-items .ffour .pan .pan-list .no-dh-wrap .no-dh,.inside-page.group-items .three-change .pan .pan-list .no-dh-wrap .no-dh {
    display: inline-block;
    vertical-align: -5px;
    margin-right: 6px;
    width: 18px;
    height: 19px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/no-dh.3e47a559.svg) 50% no-repeat
}

.inside-page.group-items .ffour .pan .pan-list .flag1,.inside-page.group-items .three-change .pan .pan-list .flag1 {
    float: left;
    margin-top: 5px;
    margin-right: 4px;
    width: 16px;
    height: 15px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCAwaDE2djE2SDB6Ii8+PGNpcmNsZSBzdHJva2U9IiM5OTkiIGN4PSI4LjQyMSIgY3k9IjguNDIxIiByPSI1Ljg5NSIvPjxwYXRoIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNOC40MjkgNS4wNTN2My4zNjgiLz48Y2lyY2xlIGZpbGw9IiM5OTkiIGZpbGwtcnVsZT0ibm9uemVybyIgY3g9IjguNDIxIiBjeT0iMTAuOTQ3IiByPSIxIi8+PC9nPjwvc3ZnPg==) no-repeat 50%
}

.inside-page.group-items .ffour .clock,.inside-page.group-items .three-change .clock {
    display: inline-block;
    width: 15px;
    height: 16px;
    margin-right: 2px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/alarm-clock-grey.ad5ba25b.svg);
    vertical-align: -3px
}

.inside-page.group-items .three-change {
    padding-top: 26px;
    width: 164px
}

.inside-page.group-items .tr3 {
    width: 375px
}

.inside-page .ff7900 {
    color: #ff7900
}

.inside-page .pt3 {
    padding-top: 3px
}

.inside-page .cursor-default {
    cursor: default
}

.inside-page .lh {
    line-height: 19px
}

.inside-page.active,.inside-page:hover {
    z-index: 1;
    box-shadow: 0 0 1px 2px #eee
}

.inside-page:hover .search-result-check-tip-tr {
    visibility: visible
}

.inside-page .search-result-check-tip-tr {
    visibility: hidden
}

.inside-page .search-result-check-tip-tr td {
    padding-top: 10px;
    padding-left: 15px;
    color: #9a9a9a
}

.inside-page .search-result-check-tip-tr .search-result-check-tip-icon {
    display: inline-block;
    vertical-align: text-bottom;
    width: 20px;
    height: 15px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat 0 -315px
}

.inside-page .search-result-check-tip-tr .global-search-keyword {
    color: #222
}

.inside-page td {
    box-sizing: border-box;
    vertical-align: top
}

.inside-page td.group-td {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.inside-page .hover-icon-left:hover .icon-left {
    display: block
}

.inside-page .pointer-event {
    pointer-events: none
}

.inside-page .add-cart-modal-toast {
    z-index: 2;
    display: none;
    padding: 0 10px;
    position: absolute;
    top: -50px;
    left: 0;
    height: 36px;
    line-height: 38px;
    text-align: center;
    font-size: 14px;
    color: #444;
    white-space: nowrap;
    border: 1px solid #cecbce;
    background: #fff;
    box-shadow: 0 0 1px 2px #eee
}

.inside-page .add-cart-modal-toast .icon {
    position: absolute;
    bottom: -10px;
    left: 30px;
    display: block;
    width: 11px;
    height: 10px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -276px -470px
}

.items-overseas-products .items-content-wrapper .con-body {
    display: block;
    width: 1200px;
    padding: 0;
    border: none
}

.items-overseas-products .items-content-wrapper .con-body:hover {
    box-shadow: 0 2px 5px 2px rgba(0,0,0,.08)
}

.items-overseas-products .items-content-wrapper .con-table {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    line-height: 20px;
    width: calc(100% - 24px);
    padding: 16px 0 20px;
    margin: 0 12px;
    box-sizing: border-box;
    border-top: 1px solid #e9e9e9
}

.items-overseas-products .items-content-wrapper .con-table .line-left {
    margin-right: 12px
}

.items-overseas-products .items-content-wrapper .con-table .line-right {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-1 {
    width: 280px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-1 .line-right-title .item-name {
    font-size: 14px;
    margin-bottom: 8px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-1 .line-right-title .item-name .light-color {
    color: #0094e5
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-1 .ggs i {
    margin-right: 2px;
    display: inline-block;
    vertical-align: -3px;
    width: 16px;
    height: 16px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png);
    background-repeat: no-repeat;
    background-position-x: -23px;
    background-position-y: -32px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-1 div.td-ellipsis {
    height: 20px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-1 div.td120 {
    max-width: 120px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-2 {
    margin-left: 23px;
    width: 230px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3 {
    width: 210px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3.price-area-td .tit {
    text-align: center
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3.price-area-td .toggle-prices-list {
    margin-top: 10px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3.price-area-td .toggle-prices-list i {
    margin: 0 auto;
    display: block;
    width: 20px;
    height: 14px;
    cursor: pointer
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3.price-area-td .toggle-prices-list i.xl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3.price-area-td .toggle-prices-list i.sl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3.price-area-td .num-label {
    display: inline-block;
    min-width: 45%;
    text-align: right;
    word-break: keep-all
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3.price-area-td .price-label {
    display: inline-block
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3 .tit {
    text-align: center
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3 .toggle-prices-list {
    margin-top: 10px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3 .toggle-prices-list i {
    margin: 0 auto;
    display: block;
    width: 20px;
    height: 14px;
    cursor: pointer
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3 .toggle-prices-list i.xl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3 .toggle-prices-list i.sl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3 .num-label {
    display: inline-block;
    min-width: 45%;
    text-align: right;
    word-break: keep-all
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-3 .price-label {
    display: inline-block
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 {
    margin-right: 28px;
    width: 150px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    font-size: 12px;
    position: relative;
    margin-top: 10px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span {
    display: inline-block;
    width: 44px;
    height: 21px;
    box-sizing: border-box;
    text-align: center;
    background: #fff;
    color: #444;
    margin-right: 10px;
    cursor: pointer
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover {
    color: #ff7800;
    border-radius: 2px;
    border: 1px solid #ff7800
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover~.tips-popup {
    display: block
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover~.tips-popup .fee-1,.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover~.tips-popup .fee-2,.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover~.tips-popup .fee-3 {
    display: none
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover:first-of-type~.tips-popup>.fee-1 {
    display: block
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover:first-of-type~.tips-popup .icon_tip_narrow {
    display: block;
    left: 15px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover:nth-of-type(2)~.tips-popup>.fee-2 {
    display: block
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover:nth-of-type(2)~.tips-popup .icon_tip_narrow {
    display: block;
    left: 70px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover:nth-of-type(3)~.tips-popup>.fee-3 {
    display: block
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee>span:hover:nth-of-type(3)~.tips-popup .icon_tip_narrow {
    display: block;
    left: 125px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee .tips-popup {
    display: none;
    position: absolute;
    top: 30px;
    left: 0;
    min-width: 275px;
    line-height: 30px;
    text-align: center;
    height: 30px;
    background: #fff;
    box-shadow: 0 2px 6px 2px hsla(0,0%,91.8%,.81)
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-4 .three-fee .tips-popup .icon_tip_narrow {
    display: none;
    position: absolute;
    top: -6px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 {
    width: 165px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area {
    width: 100%
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area li {
    margin-bottom: 3px;
    width: 100%;
    height: 18px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area li.price-input {
    height: 24px;
    position: relative
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area li.price-input .cartnumbers {
    width: 70px;
    height: 22px;
    border: 1px solid #ccc;
    border-right: none;
    padding: 0 4px;
    float: left;
    background: #fff;
    font-size: 12px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area li.price-input .cFF7800 {
    color: #ff7800
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area li.price-input .unit {
    width: 47px;
    height: 22px;
    border: 1px solid #ccc;
    background: #fafafa;
    text-align: center;
    line-height: 22px;
    float: left;
    cursor: default
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area li.price-input .cccc {
    color: #ccc
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area li.totalPrice-li {
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 180px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area li.stocks {
    cursor: default
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area li.stocks i.pan-stock {
    display: inline-block;
    vertical-align: bottom;
    width: 17px;
    height: 16px;
    margin-right: 3px;
    margin-bottom: 2px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area li.stocks i.adequate {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/adequate.3240c862.svg) 50% no-repeat
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 ul.price-area .pointer-event {
    pointer-events: none
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag {
    margin-top: 8px;
    cursor: default
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag i {
    display: inline-block;
    vertical-align: bottom;
    margin-right: 6px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag i.add-cart {
    width: 20px;
    height: 20px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjOTk5IiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSI5Ii8+PHBhdGggZD0iTTQgOC42MzlMNy41OSAxMiAxNCA2Ii8+PC9nPjwvc3ZnPg==) 50% no-repeat
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag i.jgsb {
    display: inline-block;
    vertical-align: bottom;
    margin-right: 6px;
    width: 20px;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/xx.1c38afb4.svg) 50% no-repeat
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag .c999 {
    color: #999
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag .cff7800 {
    color: #ff7800
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag .cursor-pointer {
    cursor: pointer
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag .cursor-default {
    cursor: default
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag .lh {
    line-height: 19px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag span.mar-right {
    float: right
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.li-flag span.underline {
    text-decoration: underline
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.fail-tip,.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.loading-tip {
    display: none
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.pad24 {
    padding-right: 24px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.pad20 {
    padding-right: 21px;
    line-height: 24px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 li.add-cart-tip {
    display: none
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 .addtocart-btn {
    width: 86px;
    height: 33px;
    line-height: 33px;
    color: #fff;
    border: none;
    border-radius: 2px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 .light-btn {
    background: #ff7800
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 .gray-btn {
    cursor: not-allowed;
    background-color: #5e5e5e
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 .no-add {
    opacity: .59;
    filter: alpha(opacity=0.59);
    pointer-events: none
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 .add-more-warp {
    padding: 10px 0;
    text-align: center;
    font-size: 14px
}

.items-overseas-products .items-content-wrapper .con-table .line-right .section-5 .add-more-warp i {
    margin-left: 5px;
    display: inline-block;
    vertical-align: bottom;
    width: 20px;
    height: 20px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAAAXNSR0IArs4c6QAAAstJREFUOBGFVF1IFFEU/u4d1zQ111zd1YqCxLAQ+oUkIqKiMAortR+hx0QTesnqocceLCEITOkljLDCyCyD6rmnICISKiWjINzdUDRLLHVnOufO3JnZxc2B4dzzne+cOfeeby7AT0d0iI3gxcpco/z77wQ5/HRELWVtJ9ajkC8/5y3mqtACPECig7lAz74guvfkezXQGa3Dzdgv3LICjLp1XIohj0p2Dq1Z4mJImH0KfPb1r9OZHZOQsp37cNtsKRF2S5Yl6UMJr4ZvRUloDl8QqhsTvRyqLMzA4Pi8yxo8GULl/THlS1jito7c2LkMjRuW4v2JEDINgb6RPzpEvfG+5mKzGglQ2wMHC3BgYEJDZMWI3SNDXfEjvD1fVBHQEiljzCOqyvFuQg7DskbpkC+jueShTrSJnfFrMM1WDSbZsxEDQphi4U8mUQE6R6n74qPwPxtDanY2RANVo2GPz+vDKZu8KtdAYZbXPkxccYkXN+dgS+84XtcWYveKTJzflON9QIhSl3j17TSu78hD1aNx7CJitf8cLTwl/cQ+0/jX6vQn1QWoezmJ2YQrCSAQybQbSdKzTnGsKwqNp1RWMKkTTeHHvPZtzclQo7Ta/e04kRQjRmCIVl1IB72C/5uiZqezzjY47Kgx/nHxjtJV0zh1HAhXSMyRAH2nzWGe33BDEcryDc12bXkwA99OF2F72KcYFaWJUS2p1OzS7UVtWRaJYwzbigN4dzyEomyJYnqHGkJYvzwDFffG0LAuOyWLXPoz1B1Gy/LUaFtVnko+9nwCZ+jvnZm3cOfTDB7sD2J02sS5V1OpKewPJ90RqQxJI7u7N4ipWRMzJLjVeQbqX0zCr72kHIl6e8oL/vVJ1MUdR4uebPjK6/rRlvYCSFeSJdNUfIkvB6Z4Bf0JfP0kYjUwRQ0pYCuRS1WYryKIN5BWP4xIPxrFnD+N1/8A9pX3jr6NY1sAAAAASUVORK5CYII=) no-repeat
}

.items-hk-products .items-content-wrapper .con-body {
    display: block;
    width: 1200px;
    padding: 0;
    border: none
}

.items-hk-products .items-content-wrapper .con-body:hover {
    box-shadow: 0 2px 5px 2px rgba(0,0,0,.08)
}

.items-hk-products .items-content-wrapper .con-table {
    line-height: 20px;
    width: calc(100% - 24px);
    padding: 16px 0 20px;
    margin: 0 12px;
    box-sizing: border-box;
    border-top: 1px solid #e9e9e9
}

.items-hk-products .items-content-wrapper .con-table>div {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    box-sizing: border-box
}

.items-hk-products .items-content-wrapper .con-table>div .line-left {
    margin-right: 12px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-1 {
    width: 280px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-1 .line-right-title .item-name {
    font-size: 14px;
    margin-bottom: 8px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-1 .line-right-title .item-name .light-color {
    color: #0094e5
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-1 .ggs i {
    margin-right: 2px;
    display: inline-block;
    vertical-align: -3px;
    width: 16px;
    height: 16px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png);
    background-repeat: no-repeat;
    background-position-x: -23px;
    background-position-y: -32px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-1 div.td-ellipsis {
    height: 20px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-1 div.td120 {
    max-width: 120px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-2 {
    margin-left: 23px;
    width: 230px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3 {
    width: 210px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3.price-area-td .tit {
    text-align: center
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3.price-area-td .toggle-prices-list {
    margin-top: 10px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3.price-area-td .toggle-prices-list i {
    margin: 0 auto;
    display: block;
    width: 20px;
    height: 14px;
    cursor: pointer
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3.price-area-td .toggle-prices-list i.xl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3.price-area-td .toggle-prices-list i.sl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3.price-area-td .num-label {
    display: inline-block;
    min-width: 45%;
    text-align: right;
    word-break: keep-all
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3.price-area-td .price-label {
    display: inline-block
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3 .tit {
    text-align: center
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3 .toggle-prices-list {
    margin-top: 10px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3 .toggle-prices-list i {
    margin: 0 auto;
    display: block;
    width: 20px;
    height: 14px;
    cursor: pointer
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3 .toggle-prices-list i.xl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3 .toggle-prices-list i.sl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3 .num-label {
    display: inline-block;
    min-width: 45%;
    text-align: right;
    word-break: keep-all
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-3 .price-label {
    display: inline-block
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-4 {
    margin-right: 28px;
    width: 150px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 {
    width: 165px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area {
    width: 100%
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area li {
    margin-bottom: 3px;
    width: 100%;
    height: 18px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area li.price-input {
    height: 24px;
    position: relative
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area li.price-input .cartnumbers {
    width: 70px;
    height: 22px;
    border: 1px solid #ccc;
    border-right: none;
    padding: 0 4px;
    float: left;
    background: #fff;
    font-size: 12px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area li.price-input .cFF7800 {
    color: #ff7800
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area li.price-input .unit {
    width: 47px;
    height: 22px;
    border: 1px solid #ccc;
    background: #fafafa;
    text-align: center;
    line-height: 22px;
    float: left;
    cursor: default
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area li.price-input .cccc {
    color: #ccc
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area li.totalPrice-li {
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 180px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area li.stocks {
    cursor: default
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area li.stocks i.pan-stock {
    display: inline-block;
    vertical-align: bottom;
    width: 17px;
    height: 16px;
    margin-right: 3px;
    margin-bottom: 2px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area li.stocks i.adequate {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/adequate.3240c862.svg) 50% no-repeat
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 ul.price-area .pointer-event {
    pointer-events: none
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag {
    margin-top: 8px;
    cursor: default
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag i {
    display: inline-block;
    vertical-align: bottom;
    margin-right: 6px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag i.add-cart {
    width: 20px;
    height: 20px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjOTk5IiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSI5Ii8+PHBhdGggZD0iTTQgOC42MzlMNy41OSAxMiAxNCA2Ii8+PC9nPjwvc3ZnPg==) 50% no-repeat
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag i.jgsb {
    display: inline-block;
    vertical-align: bottom;
    margin-right: 6px;
    width: 20px;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/xx.1c38afb4.svg) 50% no-repeat
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag .c999 {
    color: #999
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag .cff7800 {
    color: #ff7800
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag .cursor-pointer {
    cursor: pointer
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag .cursor-default {
    cursor: default
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag .lh {
    line-height: 19px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag span.mar-right {
    float: right
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.li-flag span.underline {
    text-decoration: underline
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.fail-tip,.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.loading-tip {
    display: none
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.pad24 {
    padding-right: 24px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.pad20 {
    padding-right: 21px;
    line-height: 24px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 li.add-cart-tip {
    display: none
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 .addtocart-btn {
    width: 86px;
    height: 33px;
    line-height: 33px;
    color: #fff;
    border: none;
    border-radius: 2px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 .light-btn {
    background: #ff7800
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 .gray-btn {
    cursor: not-allowed;
    background-color: #5e5e5e
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 .no-add {
    opacity: .59;
    filter: alpha(opacity=0.59);
    pointer-events: none
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 .add-more-warp {
    padding: 10px 0;
    text-align: center;
    font-size: 14px
}

.items-hk-products .items-content-wrapper .con-table>div .line-right .section-5 .add-more-warp i {
    margin-left: 5px;
    display: inline-block;
    vertical-align: bottom;
    width: 20px;
    height: 20px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAAAXNSR0IArs4c6QAAAstJREFUOBGFVF1IFFEU/u4d1zQ111zd1YqCxLAQ+oUkIqKiMAortR+hx0QTesnqocceLCEITOkljLDCyCyD6rmnICISKiWjINzdUDRLLHVnOufO3JnZxc2B4dzzne+cOfeeby7AT0d0iI3gxcpco/z77wQ5/HRELWVtJ9ajkC8/5y3mqtACPECig7lAz74guvfkezXQGa3Dzdgv3LICjLp1XIohj0p2Dq1Z4mJImH0KfPb1r9OZHZOQsp37cNtsKRF2S5Yl6UMJr4ZvRUloDl8QqhsTvRyqLMzA4Pi8yxo8GULl/THlS1jito7c2LkMjRuW4v2JEDINgb6RPzpEvfG+5mKzGglQ2wMHC3BgYEJDZMWI3SNDXfEjvD1fVBHQEiljzCOqyvFuQg7DskbpkC+jueShTrSJnfFrMM1WDSbZsxEDQphi4U8mUQE6R6n74qPwPxtDanY2RANVo2GPz+vDKZu8KtdAYZbXPkxccYkXN+dgS+84XtcWYveKTJzflON9QIhSl3j17TSu78hD1aNx7CJitf8cLTwl/cQ+0/jX6vQn1QWoezmJ2YQrCSAQybQbSdKzTnGsKwqNp1RWMKkTTeHHvPZtzclQo7Ta/e04kRQjRmCIVl1IB72C/5uiZqezzjY47Kgx/nHxjtJV0zh1HAhXSMyRAH2nzWGe33BDEcryDc12bXkwA99OF2F72KcYFaWJUS2p1OzS7UVtWRaJYwzbigN4dzyEomyJYnqHGkJYvzwDFffG0LAuOyWLXPoz1B1Gy/LUaFtVnko+9nwCZ+jvnZm3cOfTDB7sD2J02sS5V1OpKewPJ90RqQxJI7u7N4ipWRMzJLjVeQbqX0zCr72kHIl6e8oL/vVJ1MUdR4uebPjK6/rRlvYCSFeSJdNUfIkvB6Z4Bf0JfP0kYjUwRQ0pYCuRS1WYryKIN5BWP4xIPxrFnD+N1/8A9pX3jr6NY1sAAAAASUVORK5CYII=) no-repeat
}

.view-more {
    text-align: center
}

.view-more .view-more-tips {
    height: 16px;
    font-size: 12px;
    color: #0294e8;
    line-height: 16px;
    cursor: pointer;
    text-align: center;
    padding-bottom: 8px
}

.view-more .view-more-tips .fonts {
    display: inline-block
}

.view-more .view-more-tips .fonts2 {
    display: none
}

.view-more .view-more-tips .arrow_down {
    display: inline-block;
    margin-left: 5px;
    width: 7px;
    height: 7px;
    margin-bottom: 2px;
    border-top: 1px solid #0294e8;
    border-left: 1px solid #0294e8;
    -webkit-transform: rotate(225deg);
    transform: rotate(225deg)
}

.view-more .view-more-tips.active .fonts {
    display: none
}

.view-more .view-more-tips.active .fonts2 {
    display: inline-block
}

.view-more .view-more-tips.active .arrow_down {
    margin-bottom: -2px;
    -webkit-transform: rotate(45deg);
    transform: rotate(45deg)
}

.hide-tr {
    background-color: #f9f9f9
}

@media (max-width: 1555px) {
    .top-to-sale-btn .icon-tip-narrow {
        right:94px!important;
        background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) -216px 15px!important
    }

    .top-to-sale-btn .icon-tip {
        left: -112px!important
    }
}

.tagsTextLine1 {
    height: 5px;
    line-height: 32px;
    font-size: 10px;
    margin-top: 0!important
}

.tagsTextLine1,.tagsTextLine2 {
    display: block;
    -webkit-transform: scale(.75);
    transform: scale(.75)
}

.tagsTextLine2 {
    font-size: 12px
}

.more-small {
    font-size: 11px!important;
    -webkit-transform: scale(.8)!important;
    transform: scale(.8)!important
}

#sellAbroadList .content-list {
    padding-bottom: 20px
}

#sellAbroadList .ggs i {
    margin-right: 2px;
    display: inline-block;
    vertical-align: -3px;
    width: 16px;
    height: 16px;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/list_item_icon20181217.6f4354a1.png);
    background-repeat: no-repeat;
    background-position-x: -23px;
    background-position-y: -32px
}

#sellAbroadList .con-title {
    position: relative;
    margin: 10px 0 0;
    box-sizing: border-box;
    width: 100%;
    height: 45px;
    color: #666;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    height: 60px;
    background: #dcefff;
    padding: 0 12px
}

#sellAbroadList .con-title h3 {
    display: inline-block;
    height: 20px;
    font-size: 16px;
    color: #444
}

#sellAbroadList .con-title .icon-item {
    display: inline-block;
    height: 25px;
    line-height: 25px
}

#sellAbroadList .con-title .icon-item i {
    margin-top: -4px;
    display: inline-block;
    vertical-align: middle
}

#sellAbroadList .con-title .icon-item i.icon-1 {
    width: 19px;
    height: 23px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAXCAYAAAGexkRMAAAAAXNSR0IArs4c6QAAAypJREFUOBGNVV1IFFEU/u7MZiZSUWbuohEEZi9lL2EWIQQJVtD/SxT2A0K72ksPQi9S+hL0tzNjCQVtj1kpSD0ERVBIJIQRBmWlkc5d+5H0IQrduZ17x9mZ0RW8sPf8fefMueecexeQy+SvFIVp97sMwBRj8BpoYp+n9ClDcnQzmLZMen/x9S6nkfvr2UpXNvllxVy314QBBn8eVgQlkw9rSk6OlMKwvYQmXKWmt2bBQgwwSukSBB4rJROTSMTeuICOH1HFmOmLkjIIwWCNnQATG4ivJuQ2BZDZaOiDYB+QKLlFIak0iVglLPsAhT6uQP6WIluXxFBCLF/p47GHxP8mA2XLdPrWMJgz5PqwJRHo7JAfYIYT4jY5dGf1Ojvo8u18N1oG8rIGj0kOLqaUdknR7ZhnsL4XQmRkXzNYJLaiIfbHM4WBshE6ewGIHfTprz7IsGsBrYIM+yl2HInoAJJj62geUlSBTjD2HrgndM8jJyW7/znT9k/moVV5PEHSDrtAiTnmwe22tE6zIwokN8u+pn5ZRZJvUbzF6xWdHak9XaVBF21Zh1yMI9pkL7uUzaHeyasAtCjq8lQZ0en6mrzXZWbtJg9cAzlrJn8agpicKp9rGfZ5An+jz53LZZ6rM9M7yeET/eqU0UrvdeX0nrlgV0Ojz2/AQRk09hLC+UsXegwZ8RZNUertPMuwKwhXCTglRPPhiO2EpMEJvB7zuC5MTXEic5DmSDndouqQXqCZ5Cc0nTPXmySR6UWi9GMQR8FYYVChABavojGuobE+qWyGnBbxLHT9Qk4kMBTIzCaQ/LUUTSsnA3Y5m/LnL8aoAfbarCITeYSzxYNKvjq0nJ6WyQhtd6H9O03KK1lgLkaIHjQGHoYgJi//FByWcu+Zwd8BkVo0rrKp/Xco5Y10zCI62kyNmOzWZ5K5H4ONqzJYo2WUUA+VoFIeE5ia3oI89NO1r0Nidb3SLWRrH10PR+vGz/FNEu6/AFIy+AWqVDkiJcfQwKakKueSz13Rivvk3Yd4VL3XEhcO5nla9lFKvZWOmoKm30S8OA35X6FpZ8jlMN3UZqrfAw/u0f8pjxyF+QTS/AAAAABJRU5ErkJggg==) no-repeat
}

#sellAbroadList .con-title .icon-item i.icon-2 {
    width: 19px;
    height: 19px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAUCAYAAAEYUjbiAAAAAXNSR0IArs4c6QAAAtRJREFUOBF1VE1oE0EU/mYTUxRR0QjZULEKUkQUigi9SBEvKaJgz4IIimjTINKiUKGp0EPFP5JNIKci9FQVQQW91IMgouDNivbQKtadNLUietAkzY5vZjKbXa0DO+/ve2/evHlvAbkc/kGSKDFCMuHl8LtakRXRgMVxx7RUcFMBtYw2ITcdKe+eCBkxJSLmPG1QcGILlYRS5HmvNmRnYigu7lQChbMUk91TgyeeawR+00HlyaYA5HnW5xXj8GkUeNpXSt7hz3zZT9NoSt82ku6JERX1zzZaebd69TuJqfBVJMDh8wanqMPnQnJTYCGlw99CYFTpGK4ibe8O2X3BKZ9WOUsaWDpa0d0Pjz3F14SNLFuBfK94mcMSKZxPvpG5/URuoT3gSDUr71Cy1Eu7rzAoh782rKLkYCEqWo2iC3ogBCK7fi+pdfhJ2g8pgKxdjm9VPG0tUNq+Q9fWF2GRXcjYSwpUtX5RbwTeUDZQvrzXRDCUwXG3A+wdvJiNzJYfxkCNtR6iwcEiXTq8tBT5EQhxC9VGN2LRlxBsCAOJh9LUAknJLOngYRxMxKjIw6ivTGNN9DAVd4yca+R2GenEYwM3VAdTqVk0L+I4fbfhtY2HUjRoQ3PLG2BVL1HQC/Q9ALxhpJOfdHcFi2EcglSWVz7azc9rg2qf10MwL0vfQQ/wT8oKWHLXUUFfkL1CGUzi4jZ6hlWW9u8I/hhaKDnB8c33UMfRptKjovfRnPYp2WI30J941HLQ3H+C0eQDxxSk5MZRZxV6qh6S5+A1etDfvqDdw7sOJqxWp4XtQA05CrRMmR3EQPL932Yln7M/IjvTxij1XgJPkfI+nXoFmcCpxS+d8CKbqA1erRpE/eEaIzTpXdTq3eE+08N7jRz30QGjiCZKOMvqfiA9zGdIHiH7LBoYpBnxRzMczPciRs5LZfEU9d0gSZ30zVITX8eSPaH+EkFsk/8DEM4TlnnDmfMAAAAASUVORK5CYII=) no-repeat
}

#sellAbroadList .con-title .icon-item i.icon-3 {
    width: 19px;
    height: 23px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAXCAYAAAGexkRMAAAAAXNSR0IArs4c6QAAAmtJREFUOBGtVb9rU1EU/u5L0v+gjXkKLWoHEUSwIAgODrqkYAdxUBwERWwTB1GnIiKdVBDMS1txEQcnB10VcXASKkhBBH8UhfpuU3Ht0CTv+t37fucmzeKF3HPOd75z7nnn/gighyfXtHCoKECthoaegQkzx5OAtzENBJeAhryoUYGm/xVKzFO/Z2hKnSkSmISjfqArnhqw7q7odZh+0IiK0G6Bhj8FIV5E3FsQasGByaE+sUL+xJZeo2gYShDgKAQSgeB36CHUDBNVMet+NLY1sRqRgI9a++B0n7EJ1xEoxdofwilcwGzZtGZI7VEaZgzXTtIOVv4/UfeiunOPTTnV9Ku1vegfYdNW+MVT2V6l9XnyLwl11CrCSG1Hg8dBLmK7M4+R4m9irdhBWSa+m/gCsCQnMg5bpT/cSO3y/JcWo+bOaCwlRYBFzJEa8o5FqFcMlmaKAItIICV5fnjANCsIpnFtz3ockJJq7uEY7JUOOiLf9V4G/bqZP4mP9/oy9q/+WR7/qWC7fZpX5jLJH1BSt9EWd6kfhVJPMFJ6hSujMpPIqCLa/Pu09vKy3ECAQ5THudcnesmJ7cl3UHjPa7ZK+YD4Gg/PTV2+gihMYm7se0Ju+gd4aMqJ3as4qoU590sCNzf3Q3W/hV11up3EoZWQmJJzzj6Gju9m9zHmePIgX5GTsTlYijdsxeesP93vGA0JOVLsGibtZE3/FN+1c8MC+bo9ZzteZ3l2spCQI2UDdtLtZEsbY+gEx6wgB1sYrbzFWcFW9x92squ7Nkm1L3r/+BzK/xZIdNR5eOvLaLcHrpqLyhqlUsHEQ8h/w73JolA+/RkAAAAASUVORK5CYII=) no-repeat
}

#sellAbroadList .con-title .icon-item i.icon-4 {
    width: 19px;
    height: 25px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAZCAYAAAGkzCU8AAAAAXNSR0IArs4c6QAAA7BJREFUOBGNVFlsTFEY/s7M7VCxVJXODBKNFyKxxIMXEo8SImKp2IuHii6JiMQDySSWF4mlc8dExBYvFFFrghcPXkgtESQSUpR774iiKlLtzFzfObf33LmoOMk5//6f///P/x9ALtO+JoGBtH2XcKYkIhAYgcZEhSS8lbZTPgpkPg4XNHTJ6Y7wkMjXQDzgCjjmlvlcqQYl6Hd+ImMd9gVAS9dITWScnR7OK/zQtBAtuRmaYLgCLe8nIBJ9RuYoBr0IBeyIoHnCewj3NPcRFLwIqMlLivlyGMUP1C5w00rfRrI0CpKyMDsU5CFUJvncSWb6Bo3x3b5AQdPZQ41JMKo3Gehz7qApMR+p5zF6eEqFRxQOo2EnDbcrA4bulUNSYypvs9LTeUknGhK1xLcjbS1RijwCRek1Yx+AG81qBRHpUYrCrWCMVhXyRi8axn33rUNQltTIDw142c7xjPGkZpj2CT5tXNMhJO2sVglJWLIE33IBXLEXRaxHc+KFlpn2NOJn+Ay7NE8hpnU8zPAooZlp5xat7AF6A0uiZR5i2g8pnMrdxy17THZgPtyx5LBedRIQZhU0rScK8tAuYVq3IcRXJpBDxC0wmTX0NNZX9KDryo7PUVl7IP1KCgVSroExuRsM+hstV1BpH9lruaNw3W3oil+W/SSDHnxpedq+9FetgUkNZKZ9BVlnnGLIx884vMZbQXaSPthZjpjxDJ8+T0VqmqyZWmGlUx1D8X3IQpailtIaBt+GojiP5urXHLzJLM1K1lk2ZgeTasXwnzewsabXcyWrYNodPC+yCuewNfnvZH2rUnjUms0LV5G1VKifQnZ86ZIjGul7QFYPL8qUihjZKzQk74V5pDhrRoh5zBqGfnEObl8NyobMQX1lt5J7/OsKL+NXMsgKnHkGe6g3nlOaxY9ugUMdFXRax1ZciP7epcpHP2KM4j4j3I2mZFup38BZffIHBZx8+y6LO5dOYp6i2MjefqucBpaVqt8DWmHBT+ELItFF6PpSh8bkYTb1PNbsJbfB/ULxJL/cmAJDPOEU1/tmlIs/nSE/EVWVN/nKHEyRUn9VEaPpOKENN4/tYerLGd0yzYM7iq1h7afiY/6MF/h3baGwnbVoD5QGMPmfR1GlqKJRQCz2Tj9Q2l7B1prlNa1praPDJaiO16JWyO/8/1arG0XOaaWjNpbgbNhI3mDa7XyE+WHBb5SUm85jZlKSppyAwVbaWczxSbEuJ1DmnmKN6hn9Ku69aIpf/ZvZL735ZF9MUiZBAAAAAElFTkSuQmCC) no-repeat
}

#sellAbroadList .con-title .icon-item .icon-ti {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/JDECard.9a81ecb8.svg) no-repeat;
    background-size: 250px 30px
}

#sellAbroadList .con-title .icon-item:first-child {
    margin-left: 30px
}

#sellAbroadList .con-title .oversea-title-pop-box {
    position: absolute;
    top: -30px;
    left: 10px;
    min-width: 90px;
    padding: 5px;
    font-style: normal;
    background: #de0000;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

#sellAbroadList .con-title .oversea-title-pop-box .icon_tip_narrow {
    position: absolute;
    left: 40px;
    top: 27px;
    width: 22px;
    height: 10px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjIiIGhlaWdodD0iOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNLjQ5Ni4zNDZMLjUgNy4xNWEuNS41IDAgMDAuNjY4LjQ3TDIxLjUuMzYyLjQ5Ni4zNDV6IiBmaWxsPSIjREUwMDAwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=) no-repeat
}

#sellAbroadList .con-title .oversea-title-pop-box .tip-text {
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    text-align: center
}

#sellAbroadList .con-title img {
    width: 80px;
    height: 40px;
    margin-right: 20px
}

#sellAbroadList .con-title .lc-book {
    font-size: 18px;
    font-weight: 500;
    color: #444;
    margin-right: 20px
}

#sellAbroadList .con-title .icon-item {
    font-size: 12px;
    font-weight: 500;
    color: #0093e6
}

#sellAbroadList .con-title .line {
    width: 1px;
    height: 16px;
    background: #0093e6;
    margin: 0 10px;
    display: block
}

#sellAbroadList .inline-item {
    width: 49%;
    display: inline-block
}

#sellAbroadList .item-name {
    font-size: 16px
}

#sellAbroadList .addtocart-btn {
    width: 86px;
    height: 33px;
    line-height: 33px;
    color: #fff;
    border: none;
    border-radius: 2px
}

#sellAbroadList .light-btn {
    background: #ff7800
}

#sellAbroadList .gray-btn {
    cursor: not-allowed;
    background-color: #5e5e5e
}

#sellAbroadList .no-add {
    opacity: .59;
    filter: alpha(opacity=0.59);
    pointer-events: none
}

#sellAbroadList .con-body {
    border-bottom: 1px solid #e9e9e9;
    padding: 18px 0 0 12px
}

#sellAbroadList .con-body:hover {
    box-shadow: 0 2px 5px 2px rgba(0,0,0,.08)
}

#sellAbroadList .con-body.content-wrap {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    padding: 16px 12px 8px;
    box-sizing: border-box
}

#sellAbroadList .con-body.content-wrap .item-block-1 {
    width: 380px;
    -webkit-flex-shrink: 0;
    flex-shrink: 0;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

#sellAbroadList .con-body.content-wrap .item-block-1 .td-ellipsis {
    max-width: 300px
}

#sellAbroadList .con-body.content-wrap .item-block-1 .light-color {
    font-size: 14px;
    line-height: 20px;
    color: #0093e6
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    font-size: 12px;
    position: relative;
    margin-top: 10px
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span {
    display: inline-block;
    width: 44px;
    height: 21px;
    box-sizing: border-box;
    text-align: center;
    background: #fff4ea;
    margin-right: 10px;
    color: #444;
    cursor: pointer
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover {
    color: #ff7800;
    border-radius: 2px;
    border: 1px solid #ff7800
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover~.tips-popup {
    display: block
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover~.tips-popup .fee-1,#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover~.tips-popup .fee-2,#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover~.tips-popup .fee-3 {
    display: none
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover:first-of-type~.tips-popup>.fee-1 {
    display: block
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover:first-of-type~.tips-popup .icon_tip_narrow {
    display: block;
    left: 15px
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover:nth-of-type(2)~.tips-popup>.fee-2 {
    display: block
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover:nth-of-type(2)~.tips-popup .icon_tip_narrow {
    display: block;
    left: 70px
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover:nth-of-type(3)~.tips-popup>.fee-3 {
    display: block
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee>span:hover:nth-of-type(3)~.tips-popup .icon_tip_narrow {
    display: block;
    left: 125px
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee .tips-popup {
    display: none;
    position: absolute;
    top: 30px;
    left: 0;
    min-width: 275px;
    line-height: 30px;
    text-align: center;
    height: 30px;
    background: #fff;
    box-shadow: 0 2px 6px 2px hsla(0,0%,91.8%,.81)
}

#sellAbroadList .con-body.content-wrap .item-block-1 .three-fee .tips-popup .icon_tip_narrow {
    display: none;
    position: absolute;
    top: -6px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

#sellAbroadList .con-body.content-wrap .item-block-2 {
    margin-left: 24px;
    -webkit-flex-shrink: 0;
    flex-shrink: 0;
    width: 230px
}

#sellAbroadList .con-body.content-wrap .item-block-2 .td-ellipsis {
    max-width: 230px
}

#sellAbroadList .con-body.content-wrap .item-block-2 .light-color {
    font-size: 12px;
    color: #ff7800
}

#sellAbroadList .con-body.content-wrap .item-block-3 {
    -webkit-flex-shrink: 0;
    flex-shrink: 0;
    width: 195px
}

#sellAbroadList .con-body.content-wrap .item-block-3 .light-color {
    font-size: 12px;
    color: #ff7800
}

#sellAbroadList .con-body.content-wrap .item-block-3 .prices-warp {
    line-height: 18px
}

#sellAbroadList .con-body.content-wrap .item-block-3 .prices-warp .num-label {
    width: 50%;
    display: inline-block;
    text-align: right
}

#sellAbroadList .con-body.content-wrap .item-block-3 .toggle-prices-list {
    margin-top: 10px
}

#sellAbroadList .con-body.content-wrap .item-block-3 .toggle-prices-list i {
    margin: 0 auto;
    display: block;
    width: 20px;
    height: 14px;
    cursor: pointer
}

#sellAbroadList .con-body.content-wrap .item-block-3 .toggle-prices-list i.xl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

#sellAbroadList .con-body.content-wrap .item-block-3 .toggle-prices-list i.sl {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

#sellAbroadList .con-body.content-wrap .item-block-4 {
    -webkit-flex-shrink: 0;
    flex-shrink: 0;
    width: 150px;
    margin-right: 25px;
    margin-left: 15px
}

#sellAbroadList .con-body.content-wrap .item-block-4 .light-color {
    font-size: 12px;
    color: #ff7800
}

#sellAbroadList .con-body.content-wrap .item-block-4 .min-tit {
    width: 75px;
    display: inline-block;
    text-align: right
}

#sellAbroadList .con-body.content-wrap .item-block-5 {
    margin-left: 2px
}

#sellAbroadList .con-body.content-wrap .item-block-5 .price-area .price-input {
    position: relative;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    width: 150px;
    margin-bottom: 7px
}

#sellAbroadList .con-body.content-wrap .item-block-5 .price-area .price-input .cartnumbers {
    width: 100px;
    height: 24px
}

#sellAbroadList .con-body.content-wrap .item-block-5 .price-area .price-input .unit {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    width: 50px;
    height: 24px;
    background: #fff;
    border: 1px solid #d3d3d3;
    border-left: none
}

#sellAbroadList .con-body.content-wrap .item-block-5 .price-area .totalPrice-li {
    margin-bottom: 7px
}

#sellAbroadList .con-body.content-wrap .item-block-5 .price-icon {
    margin-right: 15px;
    width: 12px;
    height: 9px;
    cursor: pointer;
    position: relative
}

#sellAbroadList .con-body.content-wrap .item-block-5 .price-icon img {
    width: 100%;
    height: 100%
}

#sellAbroadList .con-body.content-wrap .item-block-5 .price-icon .totalPrice-li {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    width: 160px
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag {
    margin-top: 8px;
    cursor: default
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag i {
    display: inline-block;
    vertical-align: bottom;
    margin-right: 6px
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag i.add-cart {
    width: 20px;
    height: 20px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjOTk5IiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSI5Ii8+PHBhdGggZD0iTTQgOC42MzlMNy41OSAxMiAxNCA2Ii8+PC9nPjwvc3ZnPg==) 50% no-repeat
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag i.jgsb {
    display: inline-block;
    vertical-align: bottom;
    margin-right: 6px;
    width: 20px;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/xx.1c38afb4.svg) 50% no-repeat
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag .c999 {
    color: #999
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag .cff7800 {
    color: #ff7800
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag .cursor-pointer {
    cursor: pointer
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag .cursor-default {
    cursor: default
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag .lh {
    line-height: 19px
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag span.mar-right {
    float: right
}

#sellAbroadList .con-body.content-wrap .item-block-5 .li-flag span.underline {
    text-decoration: underline
}

#sellAbroadList .con-body.content-wrap .item-block-5 .addtocart-btn {
    margin-bottom: 35px
}

#sellAbroadList .con-body.content-wrap .text-center {
    text-align: center
}

#sellAbroadList .con-body.content-wrap .item-text {
    font-size: 12px;
    line-height: 18px;
    color: #444
}

#sellAbroadList .con-body.content-wrap .item-text.text-bold {
    font-weight: 700
}

#sellAbroadList .con-body.content-wrap .td-ellipsis {
    max-width: 180px;
    height: 20px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap
}

#sellAbroadList .con-body.content-wrap li.add-cart-tip {
    display: none
}

#sellAbroadList .con-body .con-img-item {
    width: 90px;
    height: 90px;
    -webkit-flex-shrink: 0;
    flex-shrink: 0;
    margin-right: 12px;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    background: #f9f9f9;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center
}

#sellAbroadList .con-body .con-img-item img {
    width: 100%;
    height: 100%;
    object-fit: contain
}

#sellAbroadList .con-body li.li-flag {
    margin-top: 8px;
    cursor: default
}

#sellAbroadList .con-body li.li-flag i {
    display: inline-block;
    vertical-align: bottom;
    margin-right: 6px
}

#sellAbroadList .con-body li.li-flag i.add-cart {
    width: 20px;
    height: 20px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlPSIjOTk5IiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSI5Ii8+PHBhdGggZD0iTTQgOC42MzlMNy41OSAxMiAxNCA2Ii8+PC9nPjwvc3ZnPg==) 50% no-repeat
}

#sellAbroadList .con-body li.li-flag i.jgsb {
    display: inline-block;
    vertical-align: bottom;
    margin-right: 6px;
    width: 20px;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/xx.1c38afb4.svg) 50% no-repeat
}

#sellAbroadList .con-body li.li-flag .c999 {
    color: #999
}

#sellAbroadList .con-body li.li-flag .cff7800 {
    color: #ff7800
}

#sellAbroadList .con-body li.li-flag .cursor-pointer {
    cursor: pointer
}

#sellAbroadList .con-body li.li-flag .cursor-default {
    cursor: default
}

#sellAbroadList .con-body li.li-flag .lh {
    line-height: 19px
}

#sellAbroadList .con-body li.li-flag span.mar-right {
    float: right
}

#sellAbroadList .con-body li.li-flag span.underline {
    text-decoration: underline
}

#sellAbroadList .con-body li.fail-tip,#sellAbroadList .con-body li.loading-tip {
    display: none
}

#sellAbroadList .con-body li.pad24 {
    padding-right: 24px
}

#sellAbroadList .con-body li.pad20 {
    padding-right: 21px;
    line-height: 24px
}

#sellAbroadList .con-body li.add-cart-tip {
    display: none
}

#sellAbroadList .add-more-warp {
    padding: 10px 0;
    text-align: center;
    font-size: 14px
}

#sellAbroadList .add-more-warp i {
    margin-left: 5px;
    display: inline-block;
    vertical-align: bottom;
    width: 20px;
    height: 20px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAAAXNSR0IArs4c6QAAAstJREFUOBGFVF1IFFEU/u4d1zQ111zd1YqCxLAQ+oUkIqKiMAortR+hx0QTesnqocceLCEITOkljLDCyCyD6rmnICISKiWjINzdUDRLLHVnOufO3JnZxc2B4dzzne+cOfeeby7AT0d0iI3gxcpco/z77wQ5/HRELWVtJ9ajkC8/5y3mqtACPECig7lAz74guvfkezXQGa3Dzdgv3LICjLp1XIohj0p2Dq1Z4mJImH0KfPb1r9OZHZOQsp37cNtsKRF2S5Yl6UMJr4ZvRUloDl8QqhsTvRyqLMzA4Pi8yxo8GULl/THlS1jito7c2LkMjRuW4v2JEDINgb6RPzpEvfG+5mKzGglQ2wMHC3BgYEJDZMWI3SNDXfEjvD1fVBHQEiljzCOqyvFuQg7DskbpkC+jueShTrSJnfFrMM1WDSbZsxEDQphi4U8mUQE6R6n74qPwPxtDanY2RANVo2GPz+vDKZu8KtdAYZbXPkxccYkXN+dgS+84XtcWYveKTJzflON9QIhSl3j17TSu78hD1aNx7CJitf8cLTwl/cQ+0/jX6vQn1QWoezmJ2YQrCSAQybQbSdKzTnGsKwqNp1RWMKkTTeHHvPZtzclQo7Ta/e04kRQjRmCIVl1IB72C/5uiZqezzjY47Kgx/nHxjtJV0zh1HAhXSMyRAH2nzWGe33BDEcryDc12bXkwA99OF2F72KcYFaWJUS2p1OzS7UVtWRaJYwzbigN4dzyEomyJYnqHGkJYvzwDFffG0LAuOyWLXPoz1B1Gy/LUaFtVnko+9nwCZ+jvnZm3cOfTDB7sD2J02sS5V1OpKewPJ90RqQxJI7u7N4ipWRMzJLjVeQbqX0zCr72kHIl6e8oL/vVJ1MUdR4uebPjK6/rRlvYCSFeSJdNUfIkvB6Z4Bf0JfP0kYjUwRQ0pYCuRS1WYryKIN5BWP4xIPxrFnD+N1/8A9pX3jr6NY1sAAAAASUVORK5CYII=) no-repeat
}

#sellAbroadList .con-img-item {
    position: relative
}

#sellAbroadList .con-img-item:hover .preview-wrapper {
    display: block
}

#sellAbroadList .preview-wrapper {
    position: absolute;
    right: -193px;
    top: -45px;
    width: 200px;
    display: none;
    padding-left: 20px;
    box-sizing: border-box
}

#sellAbroadList .preview-wrapper .preview-box {
    display: block;
    padding-top: 4px;
    width: 190px;
    height: 190px;
    background: #fff;
    border: 1px solid #cecbce;
    box-shadow: 0 0 1px 2px #eee;
    text-align: center;
    box-sizing: border-box
}

#sellAbroadList .preview-wrapper .preview-box b {
    position: absolute;
    left: 15px;
    top: 50%;
    -webkit-transform: translateY(-50%);
    transform: translateY(-50%);
    width: 6px;
    height: 9px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAJCAYAAAARml2dAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjAyOENFOUIwOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjAyOENFOUIxOTI2MTExRTlCNTE2Rjg4OEFGOUY5NDg1Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDI4Q0U5QUU5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDI4Q0U5QUY5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6wJC0SAAAARUlEQVR42mI4d/ocw////+EYyP8PAkwMSOD8mfP/DU0MwWwmbIJwCXRBmASGIEyCEagDqwQDUAeGJNxydEkU5yJLAgQYACcBK9GRst39AAAAAElFTkSuQmCC) no-repeat
}

#sellAbroadList .preview-wrapper:hover {
    display: block
}

#sellAbroadList .item-block-1 .item-name .product-img {
    position: relative;
    width: 220px
}

#sellAbroadList .item-block-1 .item-name .product-img img {
    width: 15px;
    vertical-align: text-top
}

#sellAbroadList .item-block-1 .item-name .product-img:hover .preview-wrapper {
    display: block
}

#sellAbroadList .item-block-1 .item-name .product-img .preview-wrapper {
    top: -100px;
    right: -60px
}

#sellAbroadList .item-block-1 .item-name .product-img .preview-wrapper b {
    top: 57%
}

.main-container {
    overflow: initial
}

.page-so .share {
    width: 28px;
    height: 28px;
    background: #666;
    border-radius: 50%;
    color: #666;
    text-align: center;
    line-height: 22px;
    cursor: pointer;
    position: absolute;
    left: calc(50% + 615px);
    top: 326px
}

.page-so .share i {
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-top: 6px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0iI0ZGRiI+PHBhdGggZD0iTTExLjc0IDEwLjM1M2EuNjEyLjYxMiAwIDAxLS40MzMtMS4wNDVsMi41MTMtMi41MTNhMy4yNDIgMy4yNDIgMCAwMC45NTYtMi4zMDhjMC0uODcxLS4zNC0xLjY5LS45NTYtMi4zMDdhMy4yNDEgMy4yNDEgMCAwMC0yLjMwNy0uOTU2Yy0uODcyIDAtMS42OTEuMzQtMi4zMDguOTU2TDYuNjkyIDQuNjkzYS42MTIuNjEyIDAgMTEtLjg2Ni0uODY1TDguMzQgMS4zMTRBNC40NTcgNC40NTcgMCAwMTExLjUxMiAwYzEuMiAwIDIuMzI2LjQ2NyAzLjE3MyAxLjMxNEE0LjQ1NyA0LjQ1NyAwIDAxMTYgNC40ODdhNC40NTggNC40NTggMCAwMS0xLjMxNSAzLjE3M2wtMi41MTMgMi41MTRhLjYxLjYxIDAgMDEtLjQzMy4xNzl6TTQuNDg2IDE2YTQuNDYgNC40NiAwIDAxLTMuMTc0LTEuMzE1IDQuNDkyIDQuNDkyIDAgMDEwLTYuMzQ1bDIuNTE1LTIuNTE0YS42MTIuNjEyIDAgMDEuODY1Ljg2NkwyLjE3OCA5LjIwNWEzLjI2NyAzLjI2NyAwIDAwMCA0LjYxNSAzLjI0MyAzLjI0MyAwIDAwMi4zMDguOTU2Yy44NzIgMCAxLjY5MS0uMzQgMi4zMDgtLjk1NmwyLjUxNC0yLjUxM2EuNjEyLjYxMiAwIDAxLjg2Ni44NjVsLTIuNTE1IDIuNTE0QTQuNDU4IDQuNDU4IDAgMDE0LjQ4NiAxNnoiLz48cGF0aCBkPSJNNC4zNTYgMTIuMjM1YS41OTEuNTkxIDAgMDEtLjQxOC0xLjAxbDYuMzQ3LTYuMzQ2YS41OTEuNTkxIDAgMTEuODM2LjgzN2wtNi4zNDcgNi4zNDZhLjU5LjU5IDAgMDEtLjQxOC4xNzN6Ii8+PC9nPjwvc3ZnPg==) no-repeat 50%
}

.page-so .share .tooltip {
    display: none;
    position: absolute;
    top: -6px;
    left: 40px;
    width: 180px;
    max-width: 300px;
    min-height: 22px!important;
    padding: 9px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    background: #fff;
    z-index: 10
}

.page-so .share .tooltip .narrow {
    position: absolute;
    left: -9px;
    top: 20px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px;
    -webkit-transform: rotate(270deg);
    transform: rotate(270deg)
}

.page-so .share .tooltip .content {
    min-height: 22px;
    line-height: 16px;
    font-size: 12px;
    font-weight: 400;
    color: #444;
    text-align: left;
    word-break: break-all
}

.page-so .share:hover {
    background: #999;
    color: #999
}

.page-so .share:hover .tooltip {
    display: block
}

.page-so .tag-wrapper {
    height: auto;
    margin-bottom: 6px
}

.page-so .tag-wrapper .money-off-flag {
    position: relative;
    width: 70px;
    height: 22px;
    line-height: 22px;
    border-radius: 2px;
    border: 1px solid #ff7800;
    text-align: center;
    color: #ff7800;
    cursor: pointer;
    font-size: 12px
}

.page-so .tag-wrapper .money-off-flag .pop-box {
    position: absolute;
    top: 30px;
    left: -10px;
    width: 200px;
    padding: 5px 10px 10px;
    font-style: normal;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9
}

.page-so .tag-wrapper .money-off-flag .pop-box .icon_tip_narrow {
    position: absolute;
    left: 20px;
    top: -7px;
    width: 11px;
    height: 7px;
    background: #fff url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -250px -471px
}

.page-so .tag-wrapper .money-off-flag .pop-box .tip-text {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    text-align: left
}

.page-so .tag-wrapper .money-off-flag .pop-box .tip-text .text {
    margin-top: 7px;
    line-height: 18px
}

.page-so .tag-wrapper .money-off-flag .pop-box .tip-text .link {
    color: #0093e6;
    text-decoration: underline
}

.page-so .tag-wrapper .money-off-flag:hover .pop-box {
    display: block
}

.page-so .tag-wrapper .original-sample {
    background-color: #83cdff;
    color: #fff;
    padding: 3px 11px;
    border: none;
    margin-right: 2px
}

.page-so .tag-wrapper .stop-product {
    background-color: #c9c9c9;
    color: #fff;
    padding: 3px 13px;
    border: none;
    margin-right: 2px
}

.page-so .tag-wrapper .sold-out {
    background-color: #ff9b9b;
    color: #fff;
    padding: 3px 11px;
    border: none;
    margin-right: 2px
}

.page-so .tag-wrapper .on-sale {
    background-color: #ffbb7f;
    color: #fff;
    padding: 3px 13px;
    border: none;
    margin-right: 2px
}

.page-so .tag-wrapper>span {
    box-sizing: border-box;
    padding: 2px 8px;
    border: 1px solid;
    border-radius: 2px
}

.page-so .tag-wrapper .orgin {
    border-radius: 2px;
    border: 1px solid #ff7800;
    font-size: 12px;
    text-align: center;
    line-height: 22px;
    color: #ff7800;
    cursor: pointer;
    position: relative
}

.page-so .tag-wrapper .list-float-flag {
    position: absolute;
    left: 0;
    top: 30px;
    width: 129px;
    height: auto;
    padding: 10px 0;
    background: #fff;
    box-shadow: 0 2px 4px 1px rgba(0,0,0,.1);
    border: 1px solid #e9e9e9;
    display: none;
    z-index: 5
}

.page-so .tag-wrapper .list-float-flag s {
    position: absolute;
    top: -17px;
    left: 20px;
    display: block;
    height: 0;
    width: 0;
    border: 8px dashed transparent;
    border-bottom: 8px solid #cdcbce
}

.page-so .tag-wrapper .list-float-flag i {
    position: absolute;
    top: -9px;
    *top: -9px;
    left: -10px;
    display: block;
    height: 0;
    width: 0;
    border: 10px dashed transparent;
    border-bottom: 10px solid #fff
}

.page-so .tag-wrapper .list-float-flag .content {
    text-align: left;
    padding-left: 10px
}

.page-so .tag-wrapper .list-float-flag .content li {
    color: #666
}

.page-so .tag-wrapper .list-float-flag .content li span {
    font-weight: 700
}

.page-so .tag-wrapper .couponbgs {
    display: inline-block;
    font-size: 12px;
    cursor: pointer;
    color: #ff7800;
    text-align: center;
    border-radius: 2px;
    border: 1px solid #ff7800;
    box-sizing: border-box;
    padding: 0 4px;
    line-height: 22px;
    position: relative
}

.page-so .tag-wrapper .couponbgs .lq {
    display: inline-block;
    width: 32px;
    height: 22px;
    background: #fff5eb;
    margin-left: -4px
}

.page-so .tag-wrapper .couponbgs .line {
    position: absolute;
    left: 31px;
    top: 0;
    background: transparent;
    height: 22px;
    border-right: 1px dashed #ff7800
}

.page-so .tag-wrapper .couponbgs .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #ff7800;
    text-align: center;
    line-height: 22px;
    color: #fff
}

.page-so .tag-wrapper .couponbgs:hover .ljsy {
    display: block
}

.page-so .plus-wrapper {
    height: 24px;
    margin-bottom: 6px
}

.page-so .plus-wrapper .plus-div {
    display: inline-block;
    width: 102px;
    height: 22px;
    border-radius: 2px;
    border: 1px solid #30304a;
    line-height: 22px;
    color: #30304a;
    margin-right: 4px;
    background: #fff;
    cursor: pointer;
    position: relative
}

.page-so .plus-wrapper .plus-div .plus-lq {
    display: inline-block;
    width: 32px;
    background: #30304a;
    color: #fffb90;
    text-align: center
}

.page-so .plus-wrapper .plus-div .line {
    position: absolute;
    left: 32px;
    top: 0;
    background: transparent;
    height: 22px;
    border-right: 1px dashed #30304a
}

.page-so .plus-wrapper .plus-div .plus-zx {
    display: inline-block;
    width: 66px;
    text-align: center;
    margin-left: -2px
}

.page-so .plus-wrapper .plus-div .ljsy {
    display: none;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #30304a;
    text-align: center;
    line-height: 22px;
    color: #fffb90
}

.page-so .plus-wrapper .plus-div:hover .ljsy {
    display: block
}

.page-so .yellow-btn {
    background: #ff7800
}

.page-so .blue-btn,.page-so .yellow-btn {
    width: 92px;
    height: 33px;
    border: none;
    border-radius: 2px;
    color: #fff
}

.page-so .blue-btn {
    background: #0093e6
}

.page-so .gray-btn {
    cursor: not-allowed;
    background-color: #5e5e5e
}

.page-so .list-right .list-right-brand {
    background-color: #f9f9f9;
    height: 45px;
    width: 100%;
    margin-bottom: 12px
}

.page-so .list-right .list-right-brand .list-right-brand-img {
    float: left
}

.page-so .list-right .list-right-brand .list-right-brand-img span {
    font-size: 12px;
    line-height: 45px;
    margin-left: 6px;
    color: #e3e3e3;
    width: 95px;
    letter-spacing: 1.5px
}

.page-so .list-right .list-right-brand .list-right-brand-name {
    font-weight: 700
}

.page-so .list-right .list-right-brand .list-right-brand-count,.page-so .list-right .list-right-brand .list-right-brand-name {
    font-size: 14px;
    color: #333;
    line-height: 45px;
    margin-left: 25px;
    float: left
}

.page-so .list-right .list-right-brand .list-right-brand-count span {
    color: #0094e7;
    margin: 0 5px;
    font-weight: 700
}

.page-so .list-right .list-right-brand a .list-right-brand-button {
    height: 33px;
    width: 90px;
    border: 1px solid #0094e7;
    border-radius: 3px;
    color: #0094e7;
    line-height: 33px;
    text-align: center;
    margin: 5px 20px;
    background-color: #fff;
    float: left
}

.page-so .list-right .lcxh-wrap {
    display: block
}

.page-so .starAskPrice {
    background-color: #fdf3e9;
    width: 100%;
    height: 45px;
    margin-bottom: 15px
}

.page-so .starAskPrice .starAskPrice-text {
    float: left;
    line-height: 45px;
    color: #666;
    font-size: 12px;
    margin-left: 20px
}

.page-so .starAskPrice .starAskPrice-text span {
    color: #ff7800;
    font-weight: 700
}

.page-so .starAskPrice .starAskPrice-text .icon-tip-narrow {
    position: relative;
    float: left;
    margin: 2px 5px 0 0;
    display: block;
    top: 12px;
    left: 275px;
    height: 16px;
    width: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/cart_icon.b1026903.png) no-repeat -353px -282px
}

.page-so .starAskPrice .starAskPrice-text .icon-tip-narrow:hover .icon-tip-narrow-narrow,.page-so .starAskPrice .starAskPrice-text .icon-tip-narrow:hover .icon-tip-text {
    display: block
}

.page-so .starAskPrice .starAskPrice-text .icon-tip-narrow .icon-tip-narrow-narrow {
    display: none;
    position: absolute;
    right: 2px;
    top: 18px;
    z-index: 2;
    width: 11px;
    height: 6px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAGCAYAAAARx7TFAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RjVDNTU5MEZCMjhFMTFFOUI2MjFFQkY0NThCQjI0MEUiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RjVDNTU5MEVCMjhFMTFFOUI2MjFFQkY0NThCQjI0MEUiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDI4Q0U5QjA5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDI4Q0U5QjE5MjYxMTFFOUI1MTZGODg4QUY5Rjk0ODUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4jwPvjAAAANklEQVR42mI8d/ocAxr4D8SMqCL//8MxUMN/EIDScHEMBTCArBCrAnSFOBUgK2SEKMUPAAIMAAKqhjKC9pozAAAAAElFTkSuQmCC) no-repeat
}

.page-so .starAskPrice .starAskPrice-text .icon-tip-narrow .icon-tip-narrow-narrow:hover {
    display: block
}

.page-so .starAskPrice .starAskPrice-text .icon-tip-narrow .icon-tip-text {
    display: none;
    position: relative;
    left: -228px;
    top: 22px;
    line-height: 24px;
    background-color: #fff;
    width: 700px;
    height: 100px;
    padding: 15px;
    border: 1px solid #cecbce;
    box-shadow: 0 0 10px #cecbce
}

.page-so .starAskPrice .starAskPrice-text .icon-tip-narrow .icon-tip-text:hover {
    display: block
}

.page-so .starAskPrice .starAskPrice-input {
    float: left;
    margin-left: 30px;
    margin-top: 9px
}

.page-so .starAskPrice .starAskPrice-input .input1 {
    float: left;
    background-color: #fff;
    margin-right: 10px;
    border: 1px solid #dedede;
    width: 130px;
    height: 26px;
    position: relative
}

.page-so .starAskPrice .starAskPrice-input .input1 input {
    outline: none;
    border: none;
    width: 77px
}

.page-so .starAskPrice .starAskPrice-input .input1 span {
    color: #9a9a9a;
    padding: 0 5px
}

.page-so .starAskPrice .starAskPrice-input .input1 b {
    color: #f30
}

.page-so .starAskPrice .starAskPrice-input .input2 {
    float: left
}

.page-so .starAskPrice .starAskPrice-input .starAskPrice-button {
    background-color: #0193e6;
    width: 80px;
    height: 28px;
    line-height: 28px;
    color: #fff;
    text-align: center;
    border-radius: 3px;
    cursor: pointer
}

.page-so .starAskPrice .starAskPrice-input .star-count-tip,.page-so .starAskPrice .starAskPrice-input .star-xinghao-tip {
    display: none;
    width: 150px;
    font-size: 12px;
    height: 25px;
    border: 1px solid #cecbce;
    box-shadow: 0 0 10px #cecbce;
    position: absolute;
    background-color: #fff;
    top: 34px;
    left: -15px;
    z-index: 100;
    color: #666;
    padding: 8px 0;
    text-align: center;
    line-height: 25px
}

.page-so .starAskPrice .starAskPrice-bom {
    float: right;
    width: 200px
}

.page-so .starAskPrice .starAskPrice-bom .download-img {
    position: relative;
    top: 2px;
    left: -3px;
    display: inline-block;
    width: 14px;
    height: 14px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/download.61a5d07d.png) no-repeat
}

.page-so .starAskPrice .starAskPrice-bom .starAskPrice-bom-a {
    width: 65px;
    height: 28px;
    float: right;
    color: #0094e7;
    margin: 8px 15px;
    line-height: 28px
}

.page-so .starAskPrice .starAskPrice-button {
    float: left
}

.page-so .starAskPrice .starAskPrice-daoru {
    float: left;
    background-color: #fff;
    color: #ff7800;
    border: 1px solid #ff7800;
    border-radius: 3px;
    width: 85px;
    height: 28px;
    text-align: center;
    line-height: 28px;
    margin-top: 8px;
    cursor: pointer;
    position: relative
}

.page-so .starAskPrice #file {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    filter: alpha(opacity=0);
    cursor: pointer;
    outline: 0;
    font-size: 0
}

.page-so .lc-self-support {
    box-sizing: border-box;
    width: 100%;
    height: 45px;
    color: #666
}

.page-so .lc-self-support h3 {
    display: inline-block;
    height: 20px;
    font-size: 16px;
    color: #0094e7
}

.page-so .lc-self-support .icon-item {
    display: inline-block;
    height: 25px;
    line-height: 25px
}

.page-so .lc-self-support .icon-item i {
    margin-top: -4px;
    display: inline-block;
    vertical-align: middle
}

.page-so .lc-self-support .icon-item i.icon-1 {
    width: 19px;
    height: 23px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAXCAYAAAGexkRMAAAAAXNSR0IArs4c6QAAAypJREFUOBGNVV1IFFEU/u7MZiZSUWbuohEEZi9lL2EWIQQJVtD/SxT2A0K72ksPQi9S+hL0tzNjCQVtj1kpSD0ERVBIJIQRBmWlkc5d+5H0IQrduZ17x9mZ0RW8sPf8fefMueecexeQy+SvFIVp97sMwBRj8BpoYp+n9ClDcnQzmLZMen/x9S6nkfvr2UpXNvllxVy314QBBn8eVgQlkw9rSk6OlMKwvYQmXKWmt2bBQgwwSukSBB4rJROTSMTeuICOH1HFmOmLkjIIwWCNnQATG4ivJuQ2BZDZaOiDYB+QKLlFIak0iVglLPsAhT6uQP6WIluXxFBCLF/p47GHxP8mA2XLdPrWMJgz5PqwJRHo7JAfYIYT4jY5dGf1Ojvo8u18N1oG8rIGj0kOLqaUdknR7ZhnsL4XQmRkXzNYJLaiIfbHM4WBshE6ewGIHfTprz7IsGsBrYIM+yl2HInoAJJj62geUlSBTjD2HrgndM8jJyW7/znT9k/moVV5PEHSDrtAiTnmwe22tE6zIwokN8u+pn5ZRZJvUbzF6xWdHak9XaVBF21Zh1yMI9pkL7uUzaHeyasAtCjq8lQZ0en6mrzXZWbtJg9cAzlrJn8agpicKp9rGfZ5An+jz53LZZ6rM9M7yeET/eqU0UrvdeX0nrlgV0Ojz2/AQRk09hLC+UsXegwZ8RZNUertPMuwKwhXCTglRPPhiO2EpMEJvB7zuC5MTXEic5DmSDndouqQXqCZ5Cc0nTPXmySR6UWi9GMQR8FYYVChABavojGuobE+qWyGnBbxLHT9Qk4kMBTIzCaQ/LUUTSsnA3Y5m/LnL8aoAfbarCITeYSzxYNKvjq0nJ6WyQhtd6H9O03KK1lgLkaIHjQGHoYgJi//FByWcu+Zwd8BkVo0rrKp/Xco5Y10zCI62kyNmOzWZ5K5H4ONqzJYo2WUUA+VoFIeE5ia3oI89NO1r0Nidb3SLWRrH10PR+vGz/FNEu6/AFIy+AWqVDkiJcfQwKakKueSz13Rivvk3Yd4VL3XEhcO5nla9lFKvZWOmoKm30S8OA35X6FpZ8jlMN3UZqrfAw/u0f8pjxyF+QTS/AAAAABJRU5ErkJggg==) no-repeat
}

.page-so .lc-self-support .icon-item i.icon-2 {
    width: 19px;
    height: 19px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAEFVwZaAAAAAXNSR0IArs4c6QAAAeNJREFUOBGtU7FKA0EQnT0TEiNqUJuIqLUgCNZBwdbCQrS10kYL8Qf8AoVkT4gQCAasLG0FxVoRBKuAqOE2EIUoiIaLWWf2sudeEoMBF+5m5r03s7uzuwxocFEBSy4wdF7B/ZxQoEI9D4ipkB9CehJ6ItMNwjRpca7ClJP0SlLERQ5SLwPkMjhwZqHOzihQYzMRt6AGMUAHJNwoiwyD/fu4muWrequU4eiDl5It96uaFDXW5BH674NcPGusxXJR9jAusj65Ky3gxWHYexoC8vVQGr8sonZxRnMBX2lMoa9qclATwk1m2u/AEKOGqZALF+27QWm3D5sWZkB9qbkR2Bht3TVtaDCKBbi40mnorwCdWLq06mO2uMZty7wPYApsJeaBSdvHpDzyzkcj4d5TcD8WQVuNB6y+HNo2yFBAZMkCriuH0xUC+L8FdI/fsFq9Q8Wfg8feHIItdjqIWynb2VZ5AYY765B2jgPYXwO7lAfKx6FfUB7PfKoln4sTkOwSrNoF1ENz2MUk6pbb6O6wAWvUC7pQ1I9qk4h6MIbfo4GPo1/Er7l3EcTwff927+mxNB26is1HZMxCdYKXwiTJZzCCvVzyYYo7jt9W1jGpDYl1jLvRRtAlRMUsyDixLvOCci/f+gZe48AUTOLbKwAAAABJRU5ErkJggg==) no-repeat
}

.page-so .lc-self-support .icon-item i.icon-3 {
    width: 19px;
    height: 20px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAUCAYAAAEYUjbiAAAAAXNSR0IArs4c6QAAAtRJREFUOBF1VE1oE0EU/mYTUxRR0QjZULEKUkQUigi9SBEvKaJgz4IIimjTINKiUKGp0EPFP5JNIKci9FQVQQW91IMgouDNivbQKtadNLUietAkzY5vZjKbXa0DO+/ve2/evHlvAbkc/kGSKDFCMuHl8LtakRXRgMVxx7RUcFMBtYw2ITcdKe+eCBkxJSLmPG1QcGILlYRS5HmvNmRnYigu7lQChbMUk91TgyeeawR+00HlyaYA5HnW5xXj8GkUeNpXSt7hz3zZT9NoSt82ku6JERX1zzZaebd69TuJqfBVJMDh8wanqMPnQnJTYCGlw99CYFTpGK4ibe8O2X3BKZ9WOUsaWDpa0d0Pjz3F14SNLFuBfK94mcMSKZxPvpG5/URuoT3gSDUr71Cy1Eu7rzAoh782rKLkYCEqWo2iC3ogBCK7fi+pdfhJ2g8pgKxdjm9VPG0tUNq+Q9fWF2GRXcjYSwpUtX5RbwTeUDZQvrzXRDCUwXG3A+wdvJiNzJYfxkCNtR6iwcEiXTq8tBT5EQhxC9VGN2LRlxBsCAOJh9LUAknJLOngYRxMxKjIw6ivTGNN9DAVd4yca+R2GenEYwM3VAdTqVk0L+I4fbfhtY2HUjRoQ3PLG2BVL1HQC/Q9ALxhpJOfdHcFi2EcglSWVz7azc9rg2qf10MwL0vfQQ/wT8oKWHLXUUFfkL1CGUzi4jZ6hlWW9u8I/hhaKDnB8c33UMfRptKjovfRnPYp2WI30J941HLQ3H+C0eQDxxSk5MZRZxV6qh6S5+A1etDfvqDdw7sOJqxWp4XtQA05CrRMmR3EQPL932Yln7M/IjvTxij1XgJPkfI+nXoFmcCpxS+d8CKbqA1erRpE/eEaIzTpXdTq3eE+08N7jRz30QGjiCZKOMvqfiA9zGdIHiH7LBoYpBnxRzMczPciRs5LZfEU9d0gSZ30zVITX8eSPaH+EkFsk/8DEM4TlnnDmfMAAAAASUVORK5CYII=) no-repeat
}

.page-so .lc-self-support .screen-action {
    float: right
}

.page-so .lc-self-support .screen-action i {
    display: inline-block;
    width: 20px;
    height: 14px;
    cursor: pointer;
    vertical-align: bottom;
    margin-bottom: 1px
}

.page-so .lc-self-support .screen-action i.sq {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNkw2LjUgMCAxIDYiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.page-so .lc-self-support .screen-action i.zk {
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMiIGhlaWdodD0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAwbDUuNSA2TDEyIDAiIHN0cm9rZT0iIzk3OTc5NyIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+) 50% no-repeat
}

.page-so .sellAbroad-wrapper .sellAbroad-title {
    display: none;
    margin-bottom: 10px;
    box-sizing: border-box;
    padding-top: 11px;
    width: 100%;
    background: #7458e3;
    color: #fff
}

.page-so .sellAbroad-wrapper .sellAbroad-title h3 {
    margin-left: 15px;
    display: inline-block;
    height: 20px;
    font-size: 16px
}

.page-so .sellAbroad-wrapper .sellAbroad-title .disclaimer {
    margin-top: 10px;
    padding: 11px 11px 18px;
    background: #e6f1fd;
    color: #666
}

.page-so .sellAbroad-wrapper .sellAbroad-title .disclaimer .item {
    margin-top: 10px;
    position: relative
}

.page-so .sellAbroad-wrapper .sellAbroad-title .disclaimer .item .text {
    display: block;
    padding-left: 27px;
    color: #000
}

.page-so .sellAbroad-wrapper .sellAbroad-title .disclaimer .tit {
    font-weight: 700;
    color: #0094e7
}

.page-so .sellAbroad-wrapper .sellAbroad-title .disclaimer .tit i {
    top: 0;
    width: 20px;
    height: 20px;
    margin-left: -1px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAAAXNSR0IArs4c6QAAAqhJREFUOBF9VEtoE2EQ/mab0jbii6hJfBw8KBJCT1704OMmiCA9WJBelOKj25uIp0L0qNhTEmsRfFwKHoJ486IoIhTx1iKCeKmQTVJTH/ShbvZ35t/9d/MwmcPO45t/5p/5ZxYQeqViwiwUyutYdP6K4lO+rIyoObFLHQrbA9hZIS0VK7fheddBWGF01dLGftzVXNwn0/v8I/ItOF+NEuOAOYCWoNSeyEhYh6ceaENwBz+RuRBRGXZqtzkBGCC0PP6ZCGURipUroV4o3xLZDynSTO0wXPe9iE30m689KLpfj0iNxjNhbTRg9MjRTu0F9WcMwLnecLQoYwgYoVCZ6izCgM087/xoVo3sp56pHDEGTpkL5SfOJhS/62fTbw3Xe8cgQaIptYVTT4OsMfxSp4A/NxkLnlZC5GUm/CERNaAsF7QoMkfhOZHqOl5Bo0v8/cJubqx3C7AGO32CnZsaDnwTQwsNxI8aPWr4ZHoHiOYNAOo7gPGtdaNHjr7lkAFg7/ocyiy0OtqpbRokK5qewLvHWwYeD9UgVp117s8GFzYUWLuyKGC+/IHbNcz1jMJOlvSJQjXFbzDC65UBKV5LWsBQvISLm2s+7rzkhzzJj/iIz1wQWxRQtHz1GOydb1F0chxkSkxdiXADE6k7mMUQLtOa8SM9Q+TGkUg4OEcNXuXnnPWMcejJieZ4Z8/zJg5D0UHEvE8WvI3X8Nx5LNfGOBDxzU73DNIK+omlbDRG4arjrSWLc965z3271HquqzbNE3qtGe0MKGixchbKm+Pb6v9D8wEtE4+yZY3gavJFO/b/gMbrqepDvZpFQ2V4EuXnu4BE8qPutfFp4/4+txlDtVYd574meBbi8NhK2I/lquzPbOjTJvS+oTjfc7LwiH8UTIQSJpK83t3pHyj21eZvHmBpAAAAAElFTkSuQmCC) no-repeat 50%
}

.page-so .sellAbroad-wrapper .sellAbroad-title .disclaimer i {
    position: absolute;
    top: 1px;
    left: 0;
    margin-right: 9px;
    width: 17px;
    height: 17px;
    line-height: 17px;
    text-align: center;
    font-style: normal;
    color: #fff;
    background: #0094e7;
    border-radius: 50%
}

.page-so .sellAbroad-wrapper .sellAbroad-title .icon-item {
    margin-left: 24px;
    display: inline-block;
    height: 25px;
    line-height: 25px
}

.page-so .sellAbroad-wrapper .sellAbroad-title .icon-item i {
    margin-top: -4px;
    display: inline-block;
    vertical-align: middle;
    background-image: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/new_so02.35f312cb.png);
    background-repeat: no-repeat;
    background-position-y: 0
}

.page-so .sellAbroad-wrapper .sellAbroad-title .icon-item i.icon-1 {
    width: 19px;
    height: 22px;
    background-position-x: 0
}

.page-so .sellAbroad-wrapper .sellAbroad-title .icon-item i.icon-2 {
    width: 19px;
    height: 20px;
    background-position-x: -78px
}

.page-so .sellAbroad-wrapper .sellAbroad-title .icon-item i.icon-3 {
    width: 19px;
    height: 23px;
    background-position-x: -117px
}

.page-so .sellAbroad-wrapper .sellAbroad-title .icon-item i.icon-4 {
    width: 19px;
    height: 25px;
    background-position-x: -156px
}

.page-so .sellAbroad-wrapper .oversea-title {
    border-bottom: 1px solid #0092e5
}

.page-so .sellAbroad-wrapper .title-tab {
    width: 60px;
    padding: 10px;
    text-align: center;
    background: #0092e5;
    color: #fff
}

.page-so .sellAbroad-wrapper .btn-wrapper {
    margin-top: 10px;
    margin-bottom: 20px;
    text-align: center
}

.page-so .jiazai-bj {
    margin-top: 20px;
    margin-bottom: 20px
}

.page-so .side-nav {
    width: 200px;
    position: fixed;
    top: 400px;
    left: 50%;
    margin-left: -823px;
    font-size: 14px
}

.page-so .side-nav .side-nav-tip {
    position: absolute;
    top: -35px;
    right: -5px;
    width: 89px;
    height: 27px;
    line-height: 20px;
    text-align: center;
    font-size: 12px;
    color: #fff;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/side-nav-tip.805eaf45.svg) no-repeat 50%
}

.page-so .side-nav .side-nav-item {
    display: block;
    position: relative;
    padding-right: 20px;
    height: 35px;
    line-height: 46px;
    text-align: right;
    border-right: 2px solid #f1f1f1;
    cursor: pointer
}

.page-so .side-nav .side-nav-item .unread-cyc {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: red
}

.page-so .side-nav .side-nav-item .providerAliasName {
    display: inline-block;
    max-width: 170px
}

.page-so .side-nav .side-nav-item.active {
    color: #0094e5;
    border-right-color: #0094e5
}

.page-so .margin-l-3 {
    margin-left: 3px
}

.page-so .icon-loading {
    display: inline-block;
    width: 23px;
    height: 23px;
    margin: 0 3px;
    vertical-align: bottom;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/jiazai.dff2c6b6.gif) no-repeat;
    background-size: 90%
}

.page-so .icon-success {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAAAXNSR0IArs4c6QAAAspJREFUOBGNVE1IVVEQnnPVaqEuitQiqBbvPkOCIjdB8nwSuDH6c9HC1rlzUYQQz3z3CrVJaBHYtoSEIFLIaPPO1aJFFGg/hApCkJJWq3a+vKf5js7h+FDoLO7MmfnmOzNz5lwiXkNJeBWSIp3tsYr/KZYyxu7v6OYjAbR1tX6aolJm3Ic5vVgKlwhYWHgz7DxQjDEq0pkbzhjpcNJtNgHKNwzpbGtKpo9DB4OH70/VDL9t2QsA06wSDIIGt+hWgjsqNefECAbOaPaBbqm1NpuNBxAgpARyoZ8p1uF1cTLDIwvQYX88lT0q9igJ71k9KoUzYqyUOLGYhBddojaFJPzIwFkyalUp06MC6i3kFp4h2AGxQVvLtN4dKLVyKzc3qhgNu1toBypEpWJEIVu6bI/UmQkBVEoHtqVXer09mEFGRZ0Z9exOZYIfssGUBagQBj5iWuv26k19caBjoUmAqTGNG5e7aSnqcIwD3gkAEgXaIYunMpdsDr7X09ENt8Usbwdm0JIMhWu4ZU5phAscJWUauNUnCvn549J0BxR6MEdT2QucXMTORr68V3x/tmAy1MBZd7JcNYEqDOTmnguRxDtCpPLLrP1hguWB/NyhSqAEiMTBcRKOG0Pnmurrd11r/VAWH6EMTOR2dTvQDgpi0EBMrIWg5Xh3/nztEOvMsW7u4iv8KQbEggNcwV9KL6PBSg2mAsBwbJct/556uZLvVVVVi7fz8/sFb2OVeoyXUW1IrZBKT4oTsnb3vs44yb5g4rU2Otg9TctDypiuPVR99mbHlxEf63S+MH5mM/aPxfP9Sf4HDsDKRinhE5kd3+friAWHqwoKZ/MS5fjA/9G5dxMcOylkbmwQjEx+U/kpz9kBoqCvkL/y2u8tMMg61mNtROl9ns/lxrq68/7IbCFEgCyceDc5drhM5owifqW80O8aUm/6279+22lO/wFBJ2QwT8hwNQAAAABJRU5ErkJggg==) no-repeat
}

.page-so .icon-fail,.page-so .icon-success {
    display: inline-block;
    width: 20px;
    height: 20px;
    margin: 0 3px;
    vertical-align: -6px
}

.page-so .icon-fail {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAAAXNSR0IArs4c6QAAAkxJREFUOBGNVLGKFEEQrZ7pFQVT3fD8AUG4mVNBODNTlQs1FSOTu1Q4zM/Y3I1FN1gxF0TPwPXuBxQN7jAXdGfL96qne3r2ZsGBoau7X72uqlfdIvi0Gj3kWGh97oE4/c5J+pZVqTbRG+evFGY1iw3R2r9JmNzQqvwpxHIRqG3+CaCqDgt73ULtZ2lCDwDSXDeLJ5xoXb4U3d9HhIHLeKvyVPTR5ijCe67Bzc+ih83JUPm53r500ZzaaCw8o8zpO/uYeezGY1rmbQbXY6/8QWCt/ZccnNt24lZ5L+VoQW+NviLJuag7xQgN5LE7bF7RMQE5sbI2ix0AT+Twz8Q5F7ThJj+WwzJEpmEFa0gEf1flNutpBKyOCQzjOG5Cgl+rtjFTL2xO4iZHgnMHW0OXFSHDHDpgOx2jJyFu++VM0bZmYJNh4b7VMKJXRlYjLbGXh8Ds2dgUqeBkFpUX0GCCW3EZ4zX59PdqLHoCRnpjvu7vIsln6OMxtHuXEiaByh1xkNjpU/m4eB2Jon8aGYqFyrDy+5AQfYMYaDE1n+xCGMoKhI78H6I+LXQkMS8MOjaQoeSUhuU/A7Y+o/DZHbVGyO4/nEw6cgT5/C5OeL5Kls/tolVlE1+DfC/a4DjAwXuIqjgJasWtbrR+ZR8Xxdx9bkqObKgYcYeEZYLhmrXFPRoE9TzWT8LB/ihp0JK+xek/1rsN74Bsin+WyHIYWwebIIbiFGRIKD6D4VEgZpa/oeQ609jxADvx5oUNaZa3RJbjsI56l8V7+fD727qG/geXLEVckLNjbAAAAABJRU5ErkJggg==) no-repeat
}

.page-so .load-failed-btn {
    margin-left: 2px;
    color: #ff7800;
    border-bottom: 1px solid #ff7800;
    cursor: pointer
}

.page-so .disable-orange-btn {
    background: #ffc890
}

.page-so .add-cart-modal-toast {
    left: 0
}

.guide-page {
    display: none;
    width: 100%;
    height: 100%;
    position: fixed;
    z-index: 99999;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: #000;
    filter: alpha(opacity=35);
    background: rgba(0,0,0,.35)
}

.guide-page .guide-box {
    width: 354px;
    height: 300px;
    position: absolute;
    top: 62.5%;
    left: 0;
    -webkit-transform: translateY(-60%);
    transform: translateY(-60%)
}

.guide-page .guide-box .guide {
    width: 354px;
    height: 244px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/guide.e6af70c7.png) 50% no-repeat
}

.guide-page .guide-box .ok {
    width: 128px;
    height: 36px;
    font-size: 16px;
    color: #fff;
    background: transparent;
    border-radius: 6px;
    border: 1px solid #fff;
    margin: 15px 0 0 92px
}

.guide-page .guide-box .ok:hover {
    background: #d8d8d8
}

.overseas-dialog {
    display: none;
    width: 100%;
    height: 100px;
    background: #494949;
    filter: alpha(opacity=80);
    background: rgba(73,73,73,.8);
    text-align: center;
    line-height: 100px;
    color: #efefef;
    font-size: 16px
}

.overseas-dialog .overseas-box {
    width: 100%;
    height: 100%;
    position: relative
}

.overseas-dialog .overseas-box button {
    width: 144px;
    height: 32px;
    line-height: 32px;
    background: #0094e5;
    border: none;
    outline: none;
    color: #fff;
    font-size: 16px;
    margin-left: 8px;
    border-radius: 4px
}

.overseas-dialog .overseas-box .close {
    width: 18px;
    height: 18px;
    background: #494949;
    filter: alpha(opacity=35);
    background: rgba(73,73,73,.35);
    border-radius: 50%;
    color: #efefef;
    text-align: center;
    line-height: 16px;
    cursor: pointer;
    font-size: 14px;
    position: absolute;
    right: 10px;
    top: 10px
}

.overseas-fixed {
    position: fixed;
    left: 0;
    bottom: 0;
    z-index: 9999
}

.overseas-w1200 {
    width: 1200px;
    margin: 0 auto
}

#turntable-dialog-wrapper {
    position: fixed;
    z-index: 100001;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: #000;
    background-color: rgba(0,0,0,.8)
}

.turntable-main[data-v-2d7c42f4] {
    position: absolute;
    top: 35%;
    left: 50%;
    -webkit-transform: translate(-50%,-36.5%);
    transform: translate(-50%,-36.5%);
    width: 297px;
    height: 297px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/turntable-sprite.ff3ed2b8.png) -10px -1246px no-repeat
}

.turntable-indicator[data-v-2d7c42f4] {
    width: 118px;
    height: 136px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/turntable-sprite.ff3ed2b8.png) -1729px -1058px no-repeat;
    position: absolute;
    left: 50%;
    top: 33%;
    -webkit-transform: translate(-50%,-35%);
    transform: translate(-50%,-35%);
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none
}

.turntable-wrapper[data-v-45912ce7] {
    position: absolute;
    top: 54%;
    left: 50%;
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);
    margin: 0 auto;
    width: 375px;
    height: 524px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/bg1.10bbcfc0.png) no-repeat
}

.turntable-wrapper.blink[data-v-45912ce7] {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/bg2.7d406de3.png) no-repeat
}

.prize-wrapper[data-v-45912ce7] {
    position: absolute;
    top: 54%;
    left: 50%;
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);
    -webkit-transition: -webkit-transform .5s;
    transition: -webkit-transform .5s;
    transition: transform .5s;
    transition: transform .5s,-webkit-transform .5s;
    -webkit-animation: zoomIn-45912ce7 .8s ease-in-out 0s;
    animation: zoomIn-45912ce7 .8s ease-in-out 0s;
    width: 553px;
    height: 598px
}

.prize-wrapper.prizeIdStr1[data-v-45912ce7] {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/turntable-sprite.ff3ed2b8.png) -10px -10px
}

.prize-wrapper.prizeIdStr2[data-v-45912ce7] {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/turntable-sprite.ff3ed2b8.png) -583px -628px
}

.prize-wrapper.prizeIdStr3[data-v-45912ce7] {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/turntable-sprite.ff3ed2b8.png) -583px -10px
}

.prize-wrapper.prizeIdStr4[data-v-45912ce7] {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/turntable-sprite.ff3ed2b8.png) -1156px -628px
}

.prize-wrapper.prizeIdStr5[data-v-45912ce7] {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/turntable-sprite.ff3ed2b8.png) -10px -628px
}

.prize-wrapper.prizeIdStr6[data-v-45912ce7] {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/turntable-sprite.ff3ed2b8.png) -1156px -10px
}

@-webkit-keyframes zoomIn-45912ce7 {
    0% {
        -webkit-transform: translate(-50%,-50%) scale(.2);
        transform: translate(-50%,-50%) scale(.2)
    }

    50% {
        -webkit-transform: translate(-50%,-50%) scale(1.2);
        transform: translate(-50%,-50%) scale(1.2)
    }

    to {
        -webkit-transform: translate(-50%,-50%) scale(1);
        transform: translate(-50%,-50%) scale(1)
    }
}

@keyframes zoomIn-45912ce7 {
    0% {
        -webkit-transform: translate(-50%,-50%) scale(.2);
        transform: translate(-50%,-50%) scale(.2)
    }

    50% {
        -webkit-transform: translate(-50%,-50%) scale(1.2);
        transform: translate(-50%,-50%) scale(1.2)
    }

    to {
        -webkit-transform: translate(-50%,-50%) scale(1);
        transform: translate(-50%,-50%) scale(1)
    }
}

.close-btn[data-v-45912ce7] {
    position: absolute;
    right: -30px;
    top: -30px;
    width: 37px;
    height: 37px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/turntable-sprite.ff3ed2b8.png) -1867px -1058px no-repeat;
    cursor: pointer
}

.view-prizeList[data-v-45912ce7] {
    position: absolute;
    bottom: 23px;
    left: 35%;
    width: 164px;
    height: 73px;
    cursor: pointer
}

body {
    width: 100%;
    margin: 0 auto;
    background-color: #fafafa;
    font-family: 微软雅黑,宋体,Arial,Helvetica,sans-serif
}

a {
    text-decoration: none
}

#belong-dialog * {
    box-sizing: border-box
}

.red {
    color: #fe2a2a
}

.belong-dialog {
    position: fixed;
    z-index: 99999;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: #000;
    filter: alpha(opacity=35);
    background: rgba(0,0,0,.35)
}

.belong-dialog .clearfix:after {
    content: "";
    display: block;
    height: 0;
    visibility: hidden;
    clear: both
}

.belong-dialog ::-webkit-scrollbar {
    width: 5px;
    height: 1px
}

.belong-dialog ::-webkit-scrollbar-thumb {
    border-radius: 5px;
    box-shadow: inset 0 0 5px rgba(0,0,0,.2);
    background: #e9e9e9
}

.belong-dialog ::-webkit-scrollbar-thumb:hover {
    box-shadow: inset 8px 0 0 #4a4a4a;
    cursor: pointer
}

.belong-dialog ::-webkit-scrollbar-track {
    border-radius: 10px;
    background: transparent
}

.belong-dialog .user-select {
    -webkit-user-select: none;
    user-select: none
}

.belong-dialog .belong-box {
    width: 800px;
    background-color: #fff;
    border: 4px solid #d9d9d9;
    margin: 15vh auto 0
}

.belong-dialog .belong-box .box-tit {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    color: #444;
    font-size: 18px;
    height: 38px;
    background: #f2f2f2;
    padding: 9px 20px;
    font-size: 14px;
    font-weight: 600;
    border-bottom: 1px solid #dedede
}

.belong-dialog .belong-box .box-tit .close-icon {
    display: inline-block;
    width: 12px;
    height: 12px;
    cursor: pointer
}

.belong-dialog .belong-box .tips {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    width: 100%;
    background: #fdf2e8;
    border-radius: 5px;
    padding: 10px 15px
}

.belong-dialog .belong-box .tips p {
    color: #ff7800;
    font-size: 12px;
    line-height: 24px
}

.belong-dialog .belong-box .tips p:first-child {
    width: 71px
}

.belong-dialog .belong-box .tips p:last-child {
    -webkit-box-flex: 1;
    -webkit-flex: 1;
    flex: 1
}

.belong-dialog .belong-box .kb {
    margin-top: 10px;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.belong-dialog .belong-box .kb p {
    font-size: 14px;
    color: #666
}

.belong-dialog .belong-box .kb p span {
    font-weight: 500;
    color: #444
}

.belong-dialog .belong-box .sp1 {
    font-size: 14px;
    color: #666
}

.belong-dialog .belong-box .ascription-types,.belong-dialog .belong-box .ascription-types-wrap {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.belong-dialog .belong-box .ascription-types {
    -webkit-flex-wrap: wrap;
    flex-wrap: wrap
}

.belong-dialog .belong-box .ascription-types li {
    margin-right: 10px
}

.belong-dialog .belong-box .ascription-types li label {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    cursor: pointer
}

.belong-dialog .belong-box .ascription-types li label input {
    width: 0;
    height: 0;
    display: none
}

.belong-dialog .belong-box .ascription-types li label input:checked~span {
    color: #0294e7;
    border: 2px solid #0294e7
}

.belong-dialog .belong-box .ascription-types li label span {
    display: inline-block;
    width: 110px;
    height: 45px;
    background: #fff;
    border-radius: 3px;
    border: 1px solid #dedede;
    text-align: center;
    line-height: 43px
}

.belong-dialog .belong-box .step-two {
    padding-left: 120px;
    padding-bottom: 24px;
    border-bottom: 1px dashed #efefef
}

.belong-dialog .belong-box .step-two .companys {
    max-height: 200px;
    overflow: auto
}

.belong-dialog .belong-box .step-two .companys li {
    margin-bottom: 10px;
    position: relative
}

.belong-dialog .belong-box .step-two .companys li,.belong-dialog .belong-box .step-two .companys li label {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.belong-dialog .belong-box .step-two .companys li label {
    cursor: pointer
}

.belong-dialog .belong-box .step-two .companys li label input {
    width: 15px;
    height: 15px
}

.belong-dialog .belong-box .step-two .companys li label span {
    margin-left: 10px
}

.belong-dialog .belong-box .step-two .person-box-bottom {
    font-size: 12px;
    color: #666;
    margin-top: 10px
}

.belong-dialog .belong-box .step-two .box-bottom {
    position: relative;
    width: 100%;
    padding-top: 13px
}

.belong-dialog .belong-box .step-two .box-bottom p {
    font-size: 12px;
    color: #666
}

.belong-dialog .belong-box .step-two .box-bottom p span {
    color: #1c9de9;
    cursor: pointer
}

.belong-dialog .belong-box .step-two .box-bottom .order-modal {
    position: absolute;
    top: 40px;
    left: -90px
}

.belong-dialog .belong-box .step-three {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between
}

.belong-dialog .belong-box .step-three .step-three-tips {
    color: #ff7800;
    font-size: 12px
}

.belong-dialog .belong-box .step-three .buttons button {
    width: 80px;
    height: 30px;
    line-height: 28px;
    text-align: center;
    font-size: 12px;
    border-radius: 3px;
    border: 1px solid #dedede
}

.belong-dialog .belong-box .step-three .buttons .belong-cancel {
    background: #fff;
    color: #666;
    margin-right: 10px
}

.belong-dialog .belong-box .step-three .buttons .belong-confirm {
    background: #0294e7;
    color: #fff;
    border: none
}

.belong-dialog .belong-box .step-sfyz {
    font-size: 12px;
    color: #444
}

.belong-dialog .belong-box .step-sfyz .sf-phone {
    margin-bottom: 20px
}

.belong-dialog .belong-box .step-sfyz .sf-phone #sendCode {
    width: 88px;
    height: 26px;
    background: #fff;
    border: 1px solid #dedede;
    font-size: 12px;
    color: #666;
    line-height: 24px;
    text-align: center;
    margin-left: 10px
}

.belong-dialog .belong-box .step-sfyz .label-font {
    display: inline-block;
    width: 110px;
    text-align: right
}

.belong-dialog .belong-box .step-sfyz input {
    width: 240px;
    height: 26px;
    border: 1px solid #dedede
}

#belong-dialog .order-modal {
    display: none;
    position: absolute;
    width: 400px;
    height: 218px;
    background: #fff;
    box-shadow: 0 -2px 18px 3px hsla(0,0%,87.5%,.5);
    border: 1px solid #eceff4;
    z-index: 100000;
    padding: 13px 16px
}

#belong-dialog .order-modal:after {
    content: "";
    position: absolute;
    top: -16px;
    left: calc(50% - 8px);
    border: 8px solid transparent;
    border-bottom-color: #fff
}

#belong-dialog .order-modal .order-modal-title {
    font-size: 14px;
    font-weight: 600;
    color: #444
}

#belong-dialog .order-modal .order-modal-title .modal-close-icon {
    float: right;
    width: 10px;
    height: 10px;
    display: inline-block;
    cursor: pointer
}

#belong-dialog .order-modal .order-modal-content {
    margin-top: 18px;
    margin-left: 7px
}

#belong-dialog .order-modal .order-modal-content .row {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    margin-bottom: 21px
}

#belong-dialog .order-modal .order-modal-content .row input {
    width: 270px;
    height: 30px;
    background: #fff;
    border: 1px solid #dedede
}

#belong-dialog .order-modal .btns-row {
    width: 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center
}

#belong-dialog .order-modal .btns-row button {
    width: 80px;
    height: 30px;
    background: #0294e7;
    border-radius: 3px;
    border: none;
    color: #fff
}

#belong-dialog .order-modal input {
    vertical-align: middle;
    margin-right: 10px
}

.not-select-tags {
    margin-top: 27px
}

.not-select-tags .part_title {
    font-size: 16px;
    font-weight: 400;
    color: #666;
    line-height: 20px
}

.not-select-tags .not-select-tags_part_one {
    margin-top: 9px
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items {
    position: relative;
    width: 100%;
    margin-top: 13px
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items.maxHight435AndOvfHidden {
    max-height: 435px;
    overflow: hidden
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_items_show {
    position: absolute;
    bottom: 0;
    left: 0;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    width: 100%;
    height: 50px;
    background: rgba(48,53,56,.75);
    border-radius: 5px 5px 0 0;
    color: #fff;
    font-size: 14px;
    z-index: 3;
    cursor: pointer
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_items_show i {
    margin-left: 10px;
    width: 23px;
    height: 23px;
    display: inline-block;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/round-open.fe613c14.svg)
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item {
    position: relative;
    float: left;
    width: 315px;
    height: auto;
    padding: 15px;
    background: #fff;
    border-radius: 5px;
    border: 1px solid #ebebeb;
    margin-right: 15px
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item:before {
    content: "";
    position: absolute;
    border: 1px solid transparent;
    border-radius: 5px;
    width: 0;
    height: 0;
    top: -2px;
    left: -2px;
    z-index: -1
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item:after {
    content: "";
    position: absolute;
    border: 1px solid transparent;
    border-radius: 5px;
    width: 0;
    height: 0;
    bottom: -2px;
    right: -2px;
    z-index: -1
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item:hover {
    box-shadow: 0 0 8px 3px hsla(0,0%,83.1%,.5);
    border: 1px solid transparent
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item:nth-of-type(3) {
    margin-right: 0
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag {
    height: 45px;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    cursor: pointer
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag:hover:after,.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag:hover:before {
    border-color: transparent
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag .not-select-tags_part_one_item_title {
    margin-left: 10px;
    font-size: 14px;
    color: #444;
    font-weight: 500
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag .not-select-tags_part_one_item_title:before {
    content: "";
    width: 0;
    height: 0
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag i {
    display: inline-block;
    width: 21px;
    height: 20px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/plus.7947367f.svg)
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag .add-tag_input_wrap {
    position: absolute;
    top: 55px;
    left: 0;
    width: 315px;
    height: 109px;
    background: #fff;
    box-shadow: 0 3px 7px 3px hsla(0,0%,87.5%,.5);
    border: 1px solid #eceff4;
    padding: 14px 16px;
    z-index: 2
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag .add-tag_input_wrap:before {
    content: "";
    position: absolute;
    left: 50%;
    top: -9px;
    -webkit-transform: translateX(-50%);
    transform: translateX(-50%);
    width: 14px;
    height: 9px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAJCAYAAAACTR1pAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAADqADAAQAAAABAAAACQAAAAAP0OXqAAABIElEQVQoFY1Qu1LDMBCU9TjJUpwhEwoKhs4fQcV/pKNJSUMJHfTAL1HmGxj8ATwyzgTjGNliDwZXFNmZlU63u+c5Z1VVHRGR6fuehmEgpZRWlJdE7kEAfddedN3nE/Qopey+AL51Ssm2bWvhsahJO3eA0N3E22MOboW4NymeY2idZZlGawdKiUfOxBQPBjL+JrfmxJIWTK6l8bf4Yogxsscj6H6C/EDYF9P50pI59TlB+wXX3AvFbAlPYB9T8wGLI+fPDNGiCO4vM97cS0kshiE+d23zCEFKHN45X5INlxNPmDP6x4J7rLEH+5fYN0it9aE07jrkxivFc/4Ha+wxLlxZa+fi5a1ebZsdfuh+YO/rerPK3uuPNJvymvtjvWnENwZRhvoHZs96AAAAAElFTkSuQmCC) no-repeat
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag .add-tag_input_wrap .add-tag_input {
    width: 235px;
    height: 28px;
    background: #fff;
    border-radius: 3px;
    border: 1px solid #e7e7e7
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag .add-tag_input_wrap .add-tag_input_btns {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: end;
    -webkit-justify-content: flex-end;
    justify-content: flex-end;
    margin-top: 13px
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag .add-tag_input_wrap .add-tag_input_btns button {
    width: 65px;
    height: 26px;
    background: #fff;
    border-radius: 3px;
    border: none;
    color: #444
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag .add-tag_input_wrap .add-tag_input_btns button.add-tag_cancel {
    border: 1px solid #e5e5e5;
    background: #fff;
    margin-right: 10px
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag .add-tag_input_wrap .add-tag_input_btns button.save {
    color: #fff;
    border: none;
    background: #0095e8
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag:hover {
    border: 1px solid #c5c5c5
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag.checked {
    border: 1px solid #0095e8
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag.checked .not-select-tags_part_one_item_title {
    color: #0095e8
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag.checked i {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/hover-plus.b089c2fe.svg)
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_title {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    color: #0095e8;
    font-weight: 600;
    font-size: 14px
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_title i {
    margin-right: 10px;
    display: inline-block;
    width: 5px;
    height: 14px;
    background: #0095e8
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_content_wrap {
    margin-top: 13px
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_content_wrap .not-select-tags_part_one_item_content_item {
    position: relative;
    display: inline-block;
    font-size: 14px;
    font-weight: 400;
    line-height: 22px;
    background: #fff;
    border-radius: 5px;
    border: 1px solid #eaeaea;
    margin-right: 10px;
    margin-bottom: 10px;
    padding: 5px 12px;
    cursor: pointer;
    word-break: break-all;
    word-wrap: break-word
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_content_wrap .not-select-tags_part_one_item_content_item:hover {
    border-color: #c5c5c5
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_content_wrap .not-select-tags_part_one_item_content_item.selected {
    background: #e5f6ff;
    border-color: #d7f0fd;
    color: #0095e8
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_content_wrap .not-select-tags_part_one_item_content_item .not-select-tags_part_one_item_content_item_tips {
    position: absolute;
    width: 100px;
    padding: 5px 19px;
    line-height: 20px;
    background: #404040;
    border-radius: 5px;
    left: 50%;
    -webkit-transform: translateX(-50%);
    transform: translateX(-50%);
    top: 37px;
    z-index: 1;
    color: #fff;
    opacity: .95
}

.not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_content_wrap .not-select-tags_part_one_item_content_item .not-select-tags_part_one_item_content_item_tips i {
    position: absolute;
    width: 11px;
    height: 7px;
    top: -6px;
    left: 50%;
    -webkit-transform: translateX(-50%);
    transform: translateX(-50%);
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/black-arrow.033f252c.svg)
}

.not-select-tags .not-select-tags_part_two {
    margin-top: 37px
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items {
    position: relative;
    width: 100%;
    margin-top: 13px
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item {
    position: relative;
    float: left;
    width: 315px;
    height: auto;
    padding: 15px;
    background: #fff;
    border-radius: 5px;
    border: 1px solid #ebebeb;
    margin-right: 15px;
    margin-bottom: 15px
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item:before {
    content: "";
    position: absolute;
    border: 1px solid transparent;
    border-radius: 5px;
    width: 0;
    height: 0;
    top: -2px;
    left: -2px;
    z-index: -1
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item:after {
    content: "";
    position: absolute;
    border: 1px solid transparent;
    border-radius: 5px;
    width: 0;
    height: 0;
    bottom: -2px;
    right: -2px;
    z-index: -1
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item:hover {
    box-shadow: 0 0 8px 3px hsla(0,0%,83.1%,.5);
    border: 1px solid transparent
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item:nth-of-type(3) {
    margin-right: 0
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_title {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    color: #0095e8;
    font-weight: 600;
    font-size: 14px
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_title i {
    margin-right: 10px;
    display: inline-block;
    width: 5px;
    height: 14px;
    background: #0095e8
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_content_wrap {
    margin-top: 13px
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_content_wrap .not-select-tags_part_two_item_content_item {
    position: relative;
    display: inline-block;
    font-size: 14px;
    font-weight: 400;
    line-height: 22px;
    background: #fff;
    border-radius: 5px;
    border: 1px solid #eaeaea;
    margin-right: 10px;
    margin-bottom: 10px;
    padding: 5px 12px;
    cursor: pointer;
    word-break: break-all;
    word-wrap: break-word
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_content_wrap .not-select-tags_part_two_item_content_item:hover {
    border-color: #c5c5c5
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_content_wrap .not-select-tags_part_two_item_content_item.selected {
    background: #e5f6ff;
    border-color: #d7f0fd;
    color: #0095e8
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_content_wrap .not-select-tags_part_two_item_content_item .not-select-tags_part_two_item_content_item_tips {
    position: absolute;
    width: 100px;
    padding: 5px 19px;
    line-height: 20px;
    background: #404040;
    border-radius: 5px;
    left: 50%;
    -webkit-transform: translateX(-50%);
    transform: translateX(-50%);
    top: 37px;
    z-index: 1;
    color: #fff
}

.not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_content_wrap .not-select-tags_part_two_item_content_item .not-select-tags_part_two_item_content_item_tips i {
    position: absolute;
    width: 11px;
    height: 7px;
    top: -6px;
    left: 50%;
    -webkit-transform: translateX(-50%);
    transform: translateX(-50%);
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/black-arrow.033f252c.svg)
}

.not-select-tags-dialog {
    position: fixed;
    left: 50%;
    top: 50%;
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);
    width: 888px;
    background: #fff;
    border-radius: 4px;
    margin: 0 auto;
    padding: 19px 0 19px 17px;
    box-sizing: border-box;
    z-index: 100000;
    max-height: 90vh;
    overflow-y: auto
}

.not-select-tags-dialog .close-dialog {
    position: absolute;
    right: 20px;
    top: 22px;
    display: inline-block;
    width: 13px;
    height: 13px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/dialog-close.8b86360e.svg);
    background-size: contain;
    cursor: pointer
}

.not-select-tags-dialog::-webkit-scrollbar {
    width: 5px;
    height: 1px
}

.not-select-tags-dialog::-webkit-scrollbar-thumb {
    border-radius: 5px;
    box-shadow: inset 0 0 5px rgba(0,0,0,.2);
    background: #999
}

.not-select-tags-dialog::-webkit-scrollbar-thumb:hover {
    box-shadow: inset 8px 0 0 #4a4a4a;
    cursor: pointer
}

.not-select-tags-dialog::-webkit-scrollbar-track {
    border-radius: 10px;
    background: transparent
}

.not-select-tags-dialog * {
    box-sizing: border-box
}

.not-select-tags-dialog .dialog-title {
    font-size: 16px;
    font-weight: 500;
    color: #444;
    line-height: 19px
}

.not-select-tags-dialog .save-success-tip {
    position: absolute;
    right: 20px;
    padding: 3px 10px;
    height: 25px;
    background: #ecfff1;
    border-radius: 5px;
    border: 1px solid #d1f4db;
    font-size: 12px;
    color: #0eb540
}

.not-select-tags-dialog .not-select-tags {
    margin-top: 0
}

.not-select-tags-dialog .not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item,.not-select-tags-dialog .not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item {
    width: 272px
}

.not-select-tags-dialog .not-select-tags .part_title {
    font-size: 14px;
    font-weight: 400
}

.not-select-tags-dialog .not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_content_wrap .not-select-tags_part_one_item_content_item,.not-select-tags-dialog .not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_title,.not-select-tags-dialog .not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_content_wrap .not-select-tags_part_two_item_content_item,.not-select-tags-dialog .not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_title {
    font-size: 12px
}

.not-select-tags-dialog .not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_content_wrap .not-select-tags_part_one_item_content_item,.not-select-tags-dialog .not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_content_wrap .not-select-tags_part_two_item_content_item {
    line-height: 1.8
}

.not-select-tags-dialog .not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item.add-tag .add-tag_input_wrap,.not-select-tags-dialog .not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item.add-tag .add-tag_input_wrap {
    width: 272px
}

.not-select-tags-dialog .not-select-tags .not-select-tags_part_one .not-select-tags_part_one_content .item .item_title,.not-select-tags-dialog .not-select-tags .not-select-tags_part_two .not-select-tags_part_two_content .item .item_title {
    font-size: 12px
}

.not-select-tags-dialog .not-select-tags .not-select-tags_part_one .not-select-tags_part_one_content,.not-select-tags-dialog .not-select-tags .not-select-tags_part_two .not-select-tags_part_two_content {
    margin-top: 15px
}

.not-select-tags-dialog .not-select-tags .not-select-tags_part_one .not-select-tags_part_one_items .not-select-tags_part_one_item .not-select-tags_part_one_item_content_wrap .not-select-tags_part_one_item_content_item .not-select-tags_part_one_item_content_item_tips,.not-select-tags-dialog .not-select-tags .not-select-tags_part_two .not-select-tags_part_two_items .not-select-tags_part_two_item .not-select-tags_part_two_item_content_wrap .not-select-tags_part_two_item_content_item .not-select-tags_part_two_item_content_item_tips {
    width: 100px;
    max-width: none;
    padding: 5px 10px;
    text-align: center;
    line-height: 17px
}

.layout-header.ecp .message {
    display: none;
    line-height: 32px;
    background: #fff6c1;
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    width: 100%
}

.layout-header.ecp .message a {
    color: #ff3301
}

.layout-header.ecp .banner-ads {
    width: 100%;
    background: #fff;
    height: 100%
}

.layout-header.ecp .banner-ads a {
    position: relative;
    display: block
}

.layout-header.ecp .banner-ads a,.layout-header.ecp .banner-ads a .banner-div {
    margin: 0 auto;
    min-width: 1200px;
    max-width: 100%
}

.layout-header.ecp .banner-ads a .banner-div img {
    width: 100%
}

.layout-header.ecp .banner-ads a .banner-close {
    position: absolute;
    top: 10px;
    right: 50px;
    padding: 4px;
    width: 18px;
    height: 18px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/close_top.2f74c796.png) no-repeat;
    color: #dedede;
    font-size: 20px
}

.layout-header.ecp .banner-ads a:hover .banner-close {
    background-position-x: -28px
}

.layout-header.ecp .hd {
    width: 100%;
    height: 40px;
    background: #e4e4e6
}

.layout-header.ecp .hd .hd-bd {
    position: relative;
    margin: 0 auto;
    width: 1200px;
    height: 40px;
    line-height: 40px;
    z-index: 1399
}

.layout-header.ecp .hd .hd-bd .home {
    float: left;
    display: inline-block;
    cursor: pointer;
    color: #666
}

.layout-header.ecp .hd .hd-bd .home b {
    margin-right: 2px;
    display: inline-block;
    width: 15px;
    height: 15px;
    vertical-align: text-top;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/home.397aa2f0.svg) no-repeat 0 0;
    background-size: 15px 15px
}

.layout-header.ecp .hd .hd-bd .home span {
    padding: 0 12px;
    color: #ccc
}

.layout-header.ecp .hd .hd-bd .home:hover {
    color: #199fe9
}

.layout-header.ecp .hd .hd-bd .reg {
    float: left;
    margin-right: 5px;
    width: auto;
    color: #666;
    font-size: 12px
}

.layout-header.ecp .hd .hd-bd .reg a {
    margin: 0 4px;
    color: #9a9a9a
}

.layout-header.ecp .hd .hd-bd .reg a:hover {
    color: #199fe9
}

.layout-header.ecp .hd .hd-bd .reg #custom {
    display: none;
    font-weight: 400;
    color: #0094e6
}

.layout-header.ecp .hd .hd-bd .reg #login {
    font-weight: 400;
    color: #666
}

.layout-header.ecp .hd .hd-bd .reg #register {
    font-weight: 700;
    color: #199fe9
}

.layout-header.ecp .hd .hd-bd .reg #plus {
    display: inline-block
}

.layout-header.ecp .hd .hd-bd .reg #plus .plus-label {
    display: inline-block;
    width: 38px;
    height: 17px;
    line-height: 17px;
    text-align: center;
    background: #2e3244;
    border-radius: 2px;
    font-size: 12px;
    font-family: MicrosoftYaHei;
    color: #f1d997
}

.layout-header.ecp .hd .hd-bd .reg #plus .plus-label-disabled {
    background: #b1b1b2;
    color: #fff
}

.layout-header.ecp .hd .hd-bd .reg #plus #plus-icon {
    margin-left: 2px;
    display: inline-block;
    width: 8px;
    height: 3px;
    vertical-align: middle;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/index_icon.1b6a881a.png) no-repeat -25px -6px;
    -webkit-transition: all .3s;
    transition: all .3s
}

.layout-header.ecp .hd .hd-bd .reg #plus:hover,.layout-header.ecp .hd .hd-bd .reg .active {
    position: relative;
    height: 40px;
    line-height: 40px;
    margin: 0;
    z-index: 1200;
    background: #fff
}

.layout-header.ecp .hd .hd-bd .reg #plus:hover b,.layout-header.ecp .hd .hd-bd .reg .active b {
    -webkit-transform: rotate(-180deg);
    transform: rotate(-180deg)
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap {
    position: absolute;
    left: 0;
    float: right;
    width: 312px;
    margin-left: -1px;
    z-index: 1112;
    background: #fff;
    border-left: 1px solid #e5e5e5;
    border-right: 1px solid #e5e5e5;
    border-bottom: 1px solid #e5e5e5;
    font-size: 0
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .account-wrap {
    display: none;
    text-align: right;
    font-size: 12px
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .account-wrap .account {
    margin: 0;
    padding-right: 10px;
    display: inline-block;
    color: #333;
    cursor: pointer
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .account-wrap .account:hover {
    color: #0094e5;
    cursor: pointer
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .account-wrap .space {
    padding-right: 10px;
    display: inline-block;
    font-size: 12px
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .expire-info-wrap {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    width: 100%;
    border-top: 1px solid #e5e5e5
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .expire-info-wrap .expire-tip {
    display: inline-block;
    height: 27px;
    line-height: 27px;
    margin: 15px 4px 15px 8px;
    font-size: 12px
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .expire-info-wrap .renew {
    display: inline-block;
    width: 71px;
    height: 27px;
    line-height: 27px;
    text-align: center;
    margin: 15px 6px 15px 0;
    background: #2e3244;
    border-radius: 13px;
    font-size: 12px;
    color: #fff;
    float: right
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .expire-info-wrap .renew:hover {
    opacity: .8
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .plus-icon-wrap {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item {
    display: inline-block;
    width: 50%;
    height: 100px
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item .round-left {
    position: relative;
    width: 50px;
    height: 50px;
    margin: 0 auto 5px;
    background: #e5edf6;
    border-radius: 25px;
    text-align: center
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item .round-right {
    position: relative;
    width: 50px;
    height: 50px;
    margin: 0 auto 5px;
    background: #ececf4;
    border-radius: 25px;
    text-align: center
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item .img-center {
    position: absolute;
    top: 50%;
    left: 50%;
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%)
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item .img-label {
    display: block;
    width: 80%;
    margin: 0 auto;
    line-height: 16px;
    font-size: 12px;
    text-align: center;
    color: #333
}

.layout-header.ecp .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item:hover {
    color: #0094e5;
    cursor: pointer
}

.layout-header.ecp .hd .hd-bd .active {
    position: relative;
    height: 40px;
    line-height: 40px;
    margin: 0;
    z-index: 1200;
    background: #fff
}

.layout-header.ecp .hd .hd-bd .active b {
    -webkit-transform: rotate(-180deg);
    transform: rotate(-180deg)
}

.layout-header.ecp .hd .hd-bd .welcome {
    padding: 0 5px
}

.layout-header.ecp .hd .hd-bd .logout {
    display: none;
    float: right;
    padding-right: 10px;
    font-size: 0;
    cursor: pointer
}

.layout-header.ecp .hd .hd-bd .logout span {
    margin-right: 6px;
    color: #333;
    font-size: 12px
}

.layout-header.ecp .hd .hd-bd .logout span:hover {
    color: #0076b8;
    cursor: pointer
}

.layout-header.ecp .hd .hd-bd .enter {
    position: relative;
    z-index: 1;
    float: right;
    color: #0076b8
}

.layout-header.ecp .hd .hd-bd .enter .pd06 {
    padding: 0 10px
}

.layout-header.ecp .hd .hd-bd .enter .pd06 .txt {
    color: #666
}

.layout-header.ecp .hd .hd-bd .enter .pd06.has-icon {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.layout-header.ecp .hd .hd-bd .enter .pd06.has-icon b {
    margin-right: 5px
}

.layout-header.ecp .hd .hd-bd .enter span.er04 {
    float: right;
    color: #199fe9
}

.layout-header.ecp .hd .hd-bd .enter span.er04 b {
    margin-right: 2px;
    display: inline-block;
    width: 20px;
    height: 18px;
    vertical-align: text-top;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/tel.17681def.svg) no-repeat;
    background-size: cover
}

.layout-header.ecp .hd .hd-bd .enter a {
    float: right;
    color: #666
}

.layout-header.ecp .hd .hd-bd .enter a:hover {
    color: #199fe9
}

.layout-header.ecp .hd .hd-bd .enter a.er01 {
    border: 1px solid transparent;
    border-top: none;
    -webkit-transition: all .3s;
    transition: all .3s
}

.layout-header.ecp .hd .hd-bd .enter a.er01 b {
    margin-left: 2px;
    display: inline-block;
    width: 8px;
    height: 3px;
    vertical-align: middle;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/index_icon.1b6a881a.png) no-repeat -25px -6px;
    -webkit-transition: all .3s;
    transition: all .3s
}

.layout-header.ecp .hd .hd-bd .enter a.er01.er01.active,.layout-header.ecp .hd .hd-bd .enter a.er01.er01:hover {
    position: relative;
    z-index: 1200;
    border-left: 1px solid #dedede;
    border-right: 1px solid #dedede;
    color: #199fe9;
    background: #fff
}

.layout-header.ecp .hd .hd-bd .enter a.er01.er01.active b,.layout-header.ecp .hd .hd-bd .enter a.er01.er01:hover b {
    -webkit-transform: rotate(-180deg);
    transform: rotate(-180deg)
}

.layout-header.ecp .hd .hd-bd .enter a.er02 {
    background-position: 0 -296px
}

.layout-header.ecp .hd .hd-bd .enter a.er03 {
    width: auto;
    height: 40px;
    background-position: 0 -61px
}

.layout-header.ecp .hd .hd-bd .enter a.er03 b {
    display: inline-block;
    width: 15px;
    height: 18px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/phone.2ca2906f.svg) no-repeat 0 0;
    vertical-align: text-bottom;
    margin-right: 4px
}

.layout-header.ecp .hd .hd-bd .enter a.er03:hover b {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/phone.abf9800d.svg) no-repeat 0 0
}

.layout-header.ecp .hd .hd-bd .enter a.line {
    margin-right: 18px
}

.layout-header.ecp .hd .hd-bd .enter a.qq {
    float: right;
    width: auto;
    height: 40px;
    line-height: 40px;
    color: #666;
    background-position: 0 -61px
}

.layout-header.ecp .hd .hd-bd .enter a.qq b {
    display: inline-block;
    width: 16px;
    height: 18px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/qq.8e536e52.svg) no-repeat 0 0;
    vertical-align: text-bottom;
    margin-right: 4px
}

.layout-header.ecp .hd .hd-bd .enter a.qq:hover {
    color: #199fe9
}

.layout-header.ecp .hd .hd-bd .enter a.qq:hover b {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/qq.63c6a829.svg) no-repeat 0 0
}

.layout-header.ecp .hd .hd-bd .enter .member-list-wrap {
    position: relative;
    float: right
}

.layout-header.ecp .hd .hd-bd .enter .member-list-wrap .member-list {
    position: absolute;
    top: 39px;
    right: 0;
    z-index: 1112;
    display: none;
    margin: 0;
    padding-bottom: 8px;
    width: 185px;
    border: 1px solid #e5e5e5;
    background: #fff
}

.layout-header.ecp .hd .hd-bd .enter .member-list-wrap .member-list dl {
    margin: 10px 0 0 15px;
    font-size: 14px
}

.layout-header.ecp .hd .hd-bd .enter .member-list-wrap .member-list dl dt {
    float: left;
    width: 100%;
    line-height: 26px;
    color: #666
}

.layout-header.ecp .hd .hd-bd .enter .member-list-wrap .member-list dl dt a {
    float: none;
    padding: 0;
    color: #666
}

.layout-header.ecp .hd .hd-bd .enter .member-list-wrap .member-list dl dd {
    float: left;
    width: 100%;
    line-height: 26px
}

.layout-header.ecp .hd .hd-bd .enter .member-list-wrap .member-list dl dd a {
    float: left;
    padding-left: 0;
    color: #666
}

.layout-header.ecp .hd .hd-bd .enter .member-list-wrap .member-list dl dd a:hover {
    float: left;
    padding-left: 0;
    color: #199fe9
}

.layout-header.ecp .hd .hd-bd .enter .member-list-wrap .member-list dl dd span {
    margin: 0 12px;
    float: left;
    color: #bdbdbd
}

.layout-header.ecp .hd .hd-bd .enter .c-line {
    color: #ccc;
    float: right
}

.layout-header.ecp .hd .hd-bd .enter .collect {
    float: right;
    cursor: pointer;
    border: 1px solid transparent;
    border-top: none
}

.layout-header.ecp .hd .hd-bd .enter .collect .sc {
    display: inline-block;
    width: 18px;
    height: 18px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/collect.29dca6a2.svg) 50% no-repeat;
    background-size: contain;
    vertical-align: middle;
    margin-top: -2px;
    margin-right: 5px
}

.layout-header.ecp .hd .hd-bd .enter .collect .collect-tip {
    position: absolute;
    top: 41px;
    right: -1px;
    z-index: 1112;
    display: none;
    margin: 0;
    padding: 10px 0;
    width: 300px;
    border: 1px solid #e5e5e5;
    border-top: none;
    background: #fff;
    text-align: center;
    line-height: 20px;
    cursor: default
}

.layout-header.ecp .hd .hd-bd .enter .collect:hover .txt {
    color: #199fe9
}

.layout-header.ecp .hd .hd-bd .enter .collect:hover .sc {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/collect.a7e359d3.svg) 50% no-repeat;
    background-size: cover
}

.layout-header.ecp .hd .hd-bd .enter .actives,.layout-header.ecp .hd .hd-bd .enter .collect:hover {
    position: relative;
    border-left: 1px solid #dedede;
    border-right: 1px solid #dedede;
    z-index: 1200;
    background: #fff
}

.layout-header.ecp .logo-wrap {
    padding: 33px 0 6px;
    min-width: 1200px;
    height: 90px;
    border-top: 1px solid #dedede;
    background: #fff
}

.layout-header.ecp .logo-wrap.active {
    position: fixed;
    top: -120px;
    z-index: 999999;
    padding: 21px 0;
    width: 100%;
    height: 68px;
    background: #fff;
    box-shadow: 0 5px 5px rgba(0,0,0,.07)
}

.layout-header.ecp .logo-wrap.active .hot {
    display: none
}

.layout-header.ecp .logo-wrap.active .lcsc a {
    margin-top: 5px
}

.layout-header.ecp .nav {
    width: 100%;
    height: 50px;
    background: #fff;
    border-bottom: 1px solid #ddd
}

.layout-header.ecp .nav .nav-bd {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    margin: 0 auto;
    width: 1200px
}

.layout-header.ecp .nav .nav-bd .sort {
    float: left;
    width: 192px;
    height: 50px;
    line-height: 50px;
    font-size: 16px;
    cursor: pointer
}

.layout-header.ecp .nav .nav-bd .sort:hover .layout-catalogs {
    display: block
}

.layout-header.ecp .nav .nav-bd .sort .layout-catalogs,.layout-header.ecp .nav .nav-bd .sort .not-index-page ul {
    box-sizing: border-box;
    background: #fff;
    position: relative;
    box-shadow: 0 2px 16px 0 rgba(1,66,104,.2);
    border-radius: 0;
    margin-top: 0
}

.layout-header.ecp .nav .nav-bd .sort p {
    line-height: 50px;
    text-indent: 15px;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    background: #0094e7
}

.layout-header.ecp .nav .nav-bd .sort p span {
    display: inline-block;
    width: 20px;
    height: 18px;
    vertical-align: middle;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/catagory_icon.73d924a3.png) no-repeat
}

.layout-header.ecp .nav .nav-bd .sort~.snav {
    padding-left: 42px
}

.layout-header.ecp .nav .nav-bd .snav {
    font-size: 16px;
    font-weight: 700;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    width: 1008px;
    box-sizing: border-box
}

.layout-header.ecp .nav .nav-bd .snav:first-of-type {
    padding-left: 15px
}

.layout-header.ecp .nav .nav-bd .snav a {
    position: relative;
    margin-right: 28px;
    display: block;
    text-align: center;
    line-height: 50px;
    text-decoration: none;
    color: #444
}

.layout-header.ecp .nav .nav-bd .snav a.hover,.layout-header.ecp .nav .nav-bd .snav a:hover {
    display: block;
    color: #199fe9
}

.layout-header.ecp .nav .nav-bd .snav a:last-of-type {
    margin-right: 0
}

.layout-header.ecp .nav .nav-bd .snav .nav-link {
    position: relative
}

.layout-header.ecp .nav .nav-bd .snav .n-p1 {
    position: absolute;
    right: -25px;
    top: 2px;
    display: inline-block;
    width: 31px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-hot.e08e27b8.svg) no-repeat
}

.layout-header.ecp .nav .nav-bd .snav .n-p2 {
    position: absolute;
    right: -25px;
    top: 2px;
    display: inline-block;
    width: 31px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-new.8e85a951.svg) no-repeat 0 0
}

.layout-header.ecp .nav .nav-bd .snav .n-p-gys {
    position: absolute;
    right: -30px;
    top: 2px;
    width: 41px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-gys.f25c4482.svg) no-repeat 50%;
    display: inline-block
}

.layout-header.ecp .nav .nav-bd .snav .hot-enter {
    position: absolute;
    right: -24px;
    top: 2px;
    display: inline-block;
    width: 31px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-rz.08e786e2.svg) no-repeat 0 0
}

.layout-header.ecp .plus-renew-error-dialog-wrap-head .dialog-mask {
    position: fixed;
    z-index: 99999;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: #000;
    opacity: .7
}

.layout-header.ecp .plus-renew-error-dialog-wrap-head .dialog-wrap {
    width: 388px;
    height: 170px;
    position: fixed;
    left: calc(50% - 194px);
    top: calc(50% - 85px);
    z-index: 100000;
    font-family: MicrosoftYaHei;
    background: #fff;
    border-radius: 6px
}

.layout-header.ecp .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-header {
    width: 100%;
    height: 35px
}

.layout-header.ecp .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-header .close {
    position: absolute;
    top: 10px;
    right: 10px;
    float: right;
    width: 17px;
    height: 17px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/close-icon-blue.35d990c9.svg) no-repeat;
    cursor: pointer
}

.layout-header.ecp .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-body .error {
    width: 273px;
    height: 30px;
    padding: 0 57px 0 58px;
    text-align: center;
    font-size: 16px;
    color: #2e3244
}

.layout-header.ecp .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-body .tip {
    width: 273px;
    height: 30px;
    margin-top: 3px;
    padding: 0 57px 0 58px;
    text-align: center;
    font-size: 14px;
    color: #2e3244
}

.layout-header.ecp .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-body .i-see-button {
    display: block;
    width: 206px;
    height: 42px;
    line-height: 40px;
    margin: 9px auto 0;
    text-align: center;
    font-size: 14px;
    color: #f3d48e;
    background: -webkit-linear-gradient(277deg,#56567d,#3e3e5e 30%,#2e3244);
    background: linear-gradient(173deg,#56567d,#3e3e5e 30%,#2e3244);
    outline: none;
    box-shadow: none;
    border-color: transparent;
    border-radius: 4px
}

.layout-header.ecp .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-body .i-see-button:hover {
    opacity: .8
}

.layout-header.ecp .red-packet-wrap .sky {
    position: relative
}

.layout-header.ecp .red-packet-wrap .sky .raindrop {
    display: none;
    position: fixed;
    width: 30px;
    height: 30px;
    background-size: 30px!important;
    z-index: 9999999
}

.layout-header.ecp .red-packet-wrap .sky .gold {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E5%85%83%E5%AE%9D.37fd47fd.svg) no-repeat
}

.layout-header.ecp .red-packet-wrap .sky .star {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E6%98%9F%E6%98%9F.f4087197.svg) no-repeat
}

.layout-header.ecp .red-packet-wrap .sky .claw {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E8%90%9D%E5%8D%9C.9c022192.svg) no-repeat
}

.layout-header.ecp .red-packet-wrap .sky .cloud {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E7%A5%A5%E4%BA%91.316c5928.svg) no-repeat
}

.layout-header.ecp .red-packet-wrap .sky .luck {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E7%A6%8F.3011d380.svg) no-repeat
}

.layout-header.ecp .red-packet-wrap .sky .luck-come {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E7%A6%8F%E5%88%B0.e3793b14.svg) no-repeat
}

.layout-header.ecp .red-packet-wrap .sky .luck-packet {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E7%A6%8F%E8%A2%8B.056df431.svg) no-repeat
}

.layout-header.ecp .red-packet-wrap .sky .red-packet {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E7%BA%A2%E5%8C%85.7fd2eb51.svg) no-repeat
}

.layout-header.ecp .red-packet-wrap .sky .tiger {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E5%85%94%E5%AD%90.b332c898.svg) no-repeat
}

.layout-header.ecp .red-packet-wrap .sky .coin {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E9%87%91%E5%B8%81.36b14ba6.svg) no-repeat
}

.layout-header.ecp .red-packet-wrap .sky .firecracker {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E9%9E%AD%E7%82%AE.ab683492.svg) no-repeat
}

@-webkit-keyframes drop-float-left {
    0% {
        opacity: 0
    }

    20% {
        opacity: 1
    }

    90% {
        opacity: 1
    }

    to {
        opacity: 0;
        -webkit-transform: translate3d(100px,100vh,0);
        transform: translate3d(100px,100vh,0)
    }
}

@keyframes drop-float-left {
    0% {
        opacity: 0
    }

    20% {
        opacity: 1
    }

    90% {
        opacity: 1
    }

    to {
        opacity: 0;
        -webkit-transform: translate3d(100px,100vh,0);
        transform: translate3d(100px,100vh,0)
    }
}

@-webkit-keyframes drop-float-right {
    0% {
        opacity: 0
    }

    20% {
        opacity: 1
    }

    90% {
        opacity: 1
    }

    to {
        opacity: 0;
        -webkit-transform: translate3d(-100px,100vh,0);
        transform: translate3d(-100px,100vh,0)
    }
}

@keyframes drop-float-right {
    0% {
        opacity: 0
    }

    20% {
        opacity: 1
    }

    90% {
        opacity: 1
    }

    to {
        opacity: 0;
        -webkit-transform: translate3d(-100px,100vh,0);
        transform: translate3d(-100px,100vh,0)
    }
}

.layout-header.ecp .red-packet-mask {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: #000;
    z-index: 9999998;
    opacity: .25
}

.layout-header.ecp .nologin {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/red-packet-receive-bg-noLogin.5b18c379.png)
}

.layout-header.ecp .redLogin {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/red-packet-receive-bg.8ef32373.png)
}

.layout-header.ecp .red-pack-receive-dialog {
    display: none;
    position: fixed;
    width: 566px;
    height: 650px;
    margin: auto;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 10000000
}

.layout-header.ecp .red-pack-receive-dialog .close {
    position: absolute;
    width: 24px;
    height: 24px;
    right: -4px;
    top: 2px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E5%85%B3%E9%97%AD.e92050e5.svg);
    cursor: pointer;
    z-index: 1
}

.layout-header.ecp .red-pack-receive-dialog .rules {
    display: none;
    position: absolute;
    bottom: 88px;
    right: 85px;
    color: hsla(0,0%,100%,.8);
    cursor: pointer;
    letter-spacing: 1px
}

.layout-header.ecp .red-pack-receive-dialog .content {
    position: absolute;
    right: 0;
    top: 0;
    width: 566px;
    height: 650px;
    text-align: center
}

.layout-header.ecp .red-pack-receive-dialog .content .button {
    height: 30px;
    line-height: 30px;
    color: #fff;
    background: #ff7c00;
    border-radius: 22px;
    border: 1px solid #ffe2b9;
    cursor: pointer
}

.layout-header.ecp .red-pack-receive-dialog .content .success {
    display: none
}

.layout-header.ecp .red-pack-receive-dialog .content .success .tip {
    margin-top: 102px;
    height: 24px;
    line-height: 24px;
    font-size: 18px;
    color: #fff
}

.layout-header.ecp .red-pack-receive-dialog .content .success .purchase-money {
    margin-top: 12px;
    height: 42px;
    line-height: 42px;
    font-size: 18px;
    color: #ffc16a
}

.layout-header.ecp .red-pack-receive-dialog .content .success .purchase-money span {
    font-size: 32px;
    color: #fff0bc
}

.layout-header.ecp .red-pack-receive-dialog .content .success .des {
    margin: 20px auto 0;
    width: 266px;
    line-height: 19px;
    color: #fff;
    font-size: 14px
}

.layout-header.ecp .red-pack-receive-dialog .content .success .des span {
    color: #ffc16a
}

.layout-header.ecp .red-pack-receive-dialog .content .success .i-see {
    margin: 38px auto 0;
    width: 104px
}

.layout-header.ecp .red-pack-receive-dialog .content .login {
    display: none
}

.layout-header.ecp .red-pack-receive-dialog .content .login .tip {
    margin-top: 280px;
    margin-left: 55px
}

.layout-header.ecp .red-pack-receive-dialog .content .login .des,.layout-header.ecp .red-pack-receive-dialog .content .login .tip {
    width: 355px;
    font-size: 24px;
    font-family: MicrosoftYaHei-Bold,MicrosoftYaHei;
    font-weight: 700;
    color: #ff574c;
    line-height: 31px;
    letter-spacing: 1px
}

.layout-header.ecp .red-pack-receive-dialog .content .login .des {
    margin-left: 115px
}

.layout-header.ecp .red-pack-receive-dialog .content .login .go-login {
    width: 248px;
    height: 64px;
    margin: 54px auto 0;
    cursor: pointer
}

.layout-header.ecp .red-pack-receive-dialog .content .received {
    display: none
}

.layout-header.ecp .red-pack-receive-dialog .content .received .tip {
    margin-top: 255px;
    margin-left: 137px;
    width: 309px;
    font-size: 20px;
    font-family: MicrosoftYaHei-Bold,MicrosoftYaHei;
    font-weight: 700;
    color: #ff574c;
    line-height: 31px;
    letter-spacing: 1px;
    text-align: left
}

.layout-header.ecp .red-pack-receive-dialog .content .received .hb1 {
    position: absolute;
    left: 135px;
    bottom: 108px
}

.layout-header.ecp .red-pack-receive-dialog .content .received .hb2 {
    position: absolute;
    right: 123px;
    bottom: 108px
}

.layout-header.ecp .red-pack-receive-dialog .content .received .hb-ty {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/hbty.8f41b9ef.png) no-repeat;
    width: 141px;
    height: 50px;
    background-size: 100%
}

.layout-header.ecp .red-pack-receive-dialog .content .received .hb-win {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/zj.d0c6aea5.png) no-repeat;
    cursor: pointer;
    width: 144px;
    height: 170px;
    background-size: 101%;
    margin-top: -3px;
    border-radius: 8px 7px 14px 15px
}

.layout-header.ecp .red-pack-receive-dialog .content .received .hb {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/wzj.ab65496b.png) no-repeat;
    width: 120px;
    height: 136px;
    margin-left: 12px;
    margin-top: 12px;
    background-size: 101%;
    border-radius: 5px;
    margin-bottom: 18px
}

.layout-header.ecp .red-pack-receive-dialog .content .received .cash {
    display: none;
    position: absolute;
    top: 44px;
    left: 22px;
    color: #ff574c;
    width: 100px
}

.layout-header.ecp .red-pack-receive-dialog .content .received .cash .tips {
    font-size: 24px;
    font-family: MicrosoftYaHei-Bold,MicrosoftYaHei;
    font-weight: 700;
    color: #ff574c;
    line-height: 31px
}

.layout-header.ecp .red-pack-receive-dialog .content .received .cash .box {
    background: #ffd6d3;
    border-radius: 10px;
    font-size: 12px;
    font-family: MicrosoftYaHei;
    color: #ff574c;
    line-height: 16px;
    width: 60px;
    margin: 0 auto
}

.layout-header.ecp .red-pack-receive-dialog .content .received .cash-top {
    top: 48px!important
}

.layout-header.ecp .red-pack-receive-dialog .content .received .coupon {
    display: none;
    position: absolute;
    top: 52px;
    width: 100px;
    left: 22px;
    color: #ff574c
}

.layout-header.ecp .red-pack-receive-dialog .content .received .coupon .tips {
    font-size: 17px;
    font-family: MicrosoftYaHei-Bold,MicrosoftYaHei;
    font-weight: 700;
    color: #ff574c
}

.layout-header.ecp .red-pack-receive-dialog .content .received .opacity {
    color: rgba(255,16,0,.5098039215686274)!important;
    top: 50px!important
}

.layout-header.ecp .red-pack-receive-dialog .content .received .opacity .num {
    color: #9e3a38
}

.layout-header.ecp .red-pack-receive-dialog .content .received .opacity .box {
    background: rgba(158,52,50,.18823529411764706);
    color: #9e3432
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed {
    display: none
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .tip {
    margin-top: 255px;
    margin-left: 110px;
    width: 355px;
    font-size: 20px;
    font-family: MicrosoftYaHei-Bold,MicrosoftYaHei;
    font-weight: 700;
    color: #ff574c;
    line-height: 31px;
    letter-spacing: 1px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .small {
    width: 85px;
    height: 19px;
    font-size: 14px;
    font-family: MicrosoftYaHei;
    color: #ff5249;
    line-height: 19px;
    margin: 9px auto 19px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .flex {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-justify-content: space-around;
    justify-content: space-around;
    text-align: center;
    padding: 15px 120px 0
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .fudai1 {
    position: absolute;
    left: 139px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .fudai2 {
    position: absolute;
    left: 290px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .fudai {
    cursor: pointer;
    width: 129px;
    height: 140px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .fudai-bg {
    width: 129px;
    height: 130px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/fd.08bf4b58.png) no-repeat
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .fudai-click-win {
    width: 156px;
    height: 141px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E4%B8%AD%E5%A5%96.eae44314.gif) no-repeat;
    background-size: 187%;
    background-position: -82px -61px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .fudai-click-win2 {
    width: 156px;
    height: 141px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E4%B8%AD%E5%A5%962.eae44314.gif) no-repeat;
    background-size: 187%;
    background-position: -82px -61px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .fudai-click {
    width: 129px;
    height: 140px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/%E6%9C%AA%E4%B8%AD%E5%A5%96.b056bdb4.gif) no-repeat;
    background-size: 235%;
    background-position: -80px -65px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .fudai-bg:hover {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/fd-hover.02deaacf.gif) 129px no-repeat;
    width: 170px;
    height: 204px;
    background-size: 188%;
    background-position: -55px -36px;
    margin-top: -74px;
    margin-left: -41px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .fudai-text {
    margin: 0 auto;
    width: 94px;
    height: 35px;
    line-height: 85px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .fudai-ty {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/fdty.e833b6e9.png) no-repeat
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .hb-ty {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/hbty.8f41b9ef.png) no-repeat;
    width: 141px;
    height: 50px;
    background-size: 100%
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .hb-win {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/zj.d0c6aea5.png) no-repeat;
    width: 144px;
    height: 170px;
    background-size: 101%;
    cursor: pointer;
    margin-top: -3px;
    border-radius: 8px 7px 14px 15px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .hb {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/wzj.ab65496b.png) no-repeat;
    width: 120px;
    height: 136px;
    margin-left: 12px;
    margin-top: 12px;
    background-size: 101%;
    border-radius: 5px;
    margin-bottom: 18px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .cash {
    display: none;
    position: absolute;
    top: 44px;
    left: 22px;
    color: #ff574c;
    width: 100px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .cash .tips {
    font-size: 24px;
    font-family: MicrosoftYaHei-Bold,MicrosoftYaHei;
    font-weight: 700;
    color: #ff574c;
    line-height: 31px
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .cash .box {
    background: #ffd6d3;
    border-radius: 10px;
    font-size: 12px;
    font-family: MicrosoftYaHei;
    color: #ff574c;
    line-height: 16px;
    width: 60px;
    margin: 0 auto
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .coupon {
    display: none;
    position: absolute;
    top: 52px;
    width: 100px;
    left: 22px;
    color: #ff574c
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .coupon .tips {
    font-size: 17px;
    font-family: MicrosoftYaHei-Bold,MicrosoftYaHei;
    font-weight: 700;
    color: #ff574c
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .opacity {
    top: 50px!important
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .opacity .num {
    color: #9e3a38
}

.layout-header.ecp .red-pack-receive-dialog .content .unclaimed .opacity .box {
    background: rgba(158,52,50,.18823529411764706);
    color: #9e3432
}

.logo.ecp {
    width: 1200px;
    margin: 0 auto;
    position: relative
}

.logo.ecp.head-logo {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.logo.ecp .nav-ad {
    position: absolute;
    right: 0;
    top: 65px;
    width: 192px;
    height: 71px;
    background: #f5f5f5;
    border-radius: 13px 13px 8px 8px
}

.logo.ecp .lcsc {
    float: left;
    height: 90px;
    overflow: hidden;
    margin-right: 70px
}

.logo.ecp .lcsc a {
    display: block;
    width: 385px;
    height: 57px;
    margin-top: 10px;
    float: left
}

.logo.ecp .lcsc img {
    display: block;
    width: 100%
}

.logo.ecp .sch {
    position: relative;
    float: right;
    padding-top: 9px;
    width: 45%;
    height: 70px
}

.logo.ecp .hot {
    float: left;
    margin-top: 5px;
    width: 122%
}

.logo.ecp .hot a {
    margin-right: 5px;
    font-size: 12px;
    color: #bbb
}

.logo.ecp .shop {
    margin-top: 9px;
    margin-left: 11px;
    padding: 0 2px 0 16px;
    width: 149px;
    height: 42px;
    position: relative;
    background: #fbfbfb;
    border-radius: 8px;
    border: 1px solid #eee;
    box-sizing: border-box;
    cursor: pointer
}

.logo.ecp .shop .white-box {
    display: none
}

.logo.ecp .shop.loading>p .cart-icon-a .cart-icon {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/jiazai.dff2c6b6.gif) no-repeat;
    background-size: 100% 100%
}

.logo.ecp .shop.actives {
    border-radius: 0;
    background: #fff;
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    box-shadow: 0 0 16px 0 rgba(1,66,104,.2)
}

.logo.ecp .shop.actives .white-box {
    display: block;
    position: absolute;
    top: 31px;
    z-index: 1112;
    right: 0;
    background: #fff;
    width: 129px;
    height: 20px;
    padding: 0 2px 0 16px
}

.logo.ecp .shop .collect-tip {
    position: absolute;
    top: 44px;
    right: -1px;
    z-index: 1112;
    display: none;
    margin: 0;
    padding: 10px 0;
    width: 338px;
    border: 1px solid #e5e5e5;
    border-top: none;
    background: #fff;
    text-align: center;
    line-height: 20px;
    cursor: default;
    box-shadow: 0 0 16px 0 rgba(1,66,104,.2);
    box-sizing: border-box;
    border-radius: 8px 0 8px 8px
}

.logo.ecp .shop .collect-tip.noGoods {
    padding-top: 30px;
    padding-bottom: 29px
}

.logo.ecp .shop .collect-tip.noGoods>div {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    padding: 0 0 0 48px
}

.logo.ecp .shop .collect-tip.noGoods>div img {
    margin-right: 20px
}

.logo.ecp .shop .collect-tip.hasGoods {
    width: 610px;
    height: 413px;
    padding: 8px 0 0;
    text-align: left;
    box-sizing: content-box
}

.logo.ecp .shop .collect-tip.hasGoods .tab-one {
    margin: 0 18px;
    border-bottom: 1px solid #199fe9;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.logo.ecp .shop .collect-tip.hasGoods .tab-one .tab-item {
    height: 29px;
    line-height: 29px;
    font-size: 14px;
    color: #333;
    padding: 4px 15px;
    cursor: pointer
}

.logo.ecp .shop .collect-tip.hasGoods .tab-one .tab-item>.count {
    color: #199fe9;
    margin-left: 6px
}

.logo.ecp .shop .collect-tip.hasGoods .tab-one .tab-item.active {
    font-weight: 700;
    color: #199fe9;
    background: #ecf8ff;
    border-radius: 2px 2px 0 0;
    border: 1px solid #199fe9;
    border-bottom: none
}

.logo.ecp .shop .collect-tip.hasGoods .tab-two {
    margin-top: 9px;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    padding-left: 18px
}

.logo.ecp .shop .collect-tip.hasGoods .tab-two .tab-item {
    margin-right: 16px;
    cursor: pointer
}

.logo.ecp .shop .collect-tip.hasGoods .tab-two .tab-item.active {
    font-weight: 700;
    color: #199de9;
    position: relative
}

.logo.ecp .shop .collect-tip.hasGoods .tab-two .tab-item.active:after {
    content: "";
    width: 18px;
    height: 2px;
    background-color: #199de9;
    position: absolute;
    bottom: -4px;
    left: 50%;
    -webkit-transform: translate(-50%);
    transform: translate(-50%)
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content {
    width: 610px;
    margin-top: 16px;
    min-height: 286px
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content.panel {
    min-height: 315px
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-header {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    height: 29px;
    background-color: #f5f5f5;
    line-height: 29px;
    margin-left: 18px;
    box-sizing: border-box
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-header [type=checkbox] {
    display: inline-block;
    margin: 0 13px
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-header span {
    display: inline-block;
    color: #666
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-header span.goods_code {
    width: 116px
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-header span.provider {
    width: 120px
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-header span.price {
    width: 106px
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-header span.count {
    width: 82px
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-header span.price_total {
    width: 77px
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-header span.complain {
    margin-right: 0
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list {
    margin-left: 18px;
    display: none;
    box-sizing: border-box;
    overflow-x: hidden;
    height: 256px
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list.active {
    display: block
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    height: 40px;
    line-height: 40px;
    width: 100%;
    border-bottom: 1px solid #e4e4e6;
    position: relative
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item [type=checkbox] {
    display: inline-block;
    margin: 0 13px
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span {
    display: inline-block;
    color: #666;
    overflow: hidden
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_goods_code {
    width: 96px;
    max-width: 96px;
    margin-right: 20px;
    font-weight: 700
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_provider {
    width: 100px;
    max-width: 100px;
    margin-right: 20px;
    position: relative
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_provider:hover~.item_provider_tips {
    display: block
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_price {
    width: 86px;
    max-width: 86px;
    margin-right: 20px;
    font-weight: 700
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_count {
    width: 62px;
    max-width: 62px;
    margin-right: 20px;
    font-weight: 700
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_price_total {
    width: 57px;
    max-width: 57px;
    margin-right: 20px;
    font-weight: 700;
    color: #ff7800
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_delete {
    margin-right: 0;
    cursor: pointer
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item .item_provider_tips {
    display: none;
    position: absolute;
    width: 142px;
    height: auto;
    background: #fff;
    box-shadow: 0 -1px 16px 2px rgba(1,66,104,.12);
    top: 40px;
    left: 147px;
    z-index: 9999;
    border-radius: 3px;
    padding: 13px;
    box-sizing: border-box
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item .item_provider_tips:after {
    content: "";
    position: absolute;
    left: 20%;
    top: -6px;
    width: 6px;
    height: 9px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/rightUtils20180907_new.d3293935.png) no-repeat -220px 0;
    -webkit-transform: translate(-50%) rotate(270deg);
    transform: translate(-50%) rotate(270deg)
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item .item_provider_tips:hover {
    display: block
}

.logo.ecp .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item .item_provider_tips div {
    height: 15px;
    line-height: 15px;
    margin-bottom: 3px;
    width: 100%;
    color: #333
}

.logo.ecp .shop .collect-tip.hasGoods .ellipsis {
    text-overflow: ellipsis;
    word-break: break-all;
    white-space: nowrap;
    overflow: hidden
}

.logo.ecp .shop .collect-tip.hasGoods .footer {
    width: 610px;
    height: 44px;
    background: #f5f5f5;
    line-height: 44px;
    padding: 0 18px 0 31px;
    box-sizing: border-box;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    border-radius: 0 0 8px 8px
}

.logo.ecp .shop .collect-tip.hasGoods .footer>span.del-all {
    color: #666;
    cursor: pointer;
    display: -webkit-inline-box;
    display: -webkit-inline-flex;
    display: inline-flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.logo.ecp .shop .collect-tip.hasGoods .footer>span.del-all img {
    margin-right: 6px
}

.logo.ecp .shop .collect-tip.hasGoods .footer .count {
    color: #ff7800;
    margin-right: 21px
}

.logo.ecp .shop .collect-tip.hasGoods .footer .blod {
    font-weight: 700
}

.logo.ecp .shop .collect-tip.hasGoods .footer .settlement {
    display: inline-block;
    width: 77px;
    height: 28px;
    text-align: center;
    line-height: 28px;
    background: #ff7800;
    color: #fff;
    border-radius: 2px;
    cursor: pointer
}

.logo.ecp .shop p {
    height: 40px;
    line-height: 40px;
    position: relative
}

.logo.ecp .shop p .cart-icon-a {
    position: relative
}

.logo.ecp .shop p .cart-icon-a .cart-icon {
    display: inline-block;
    margin-right: 6px;
    width: 19px;
    height: 18px;
    vertical-align: middle;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/cart_new.66a60114.svg) no-repeat 0 0;
    background-size: 19px 18px
}

.logo.ecp .shop p .cart-icon-a .tips {
    font-size: 14px;
    color: #199de9;
    line-height: 22px;
    height: 22px;
    vertical-align: middle
}

.logo.ecp .shop p .cart-icon-a .cart-icon2 {
    position: absolute;
    top: -7px;
    right: -27px;
    display: inline-block;
    width: 26px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    color: #fff;
    background: #e9a719;
    border-radius: 8px 8px 8px 0
}

.sch-bd.ecp {
    width: 100%;
    float: left;
    position: relative
}

.sch-bd.ecp .sch-bd02 {
    float: left;
    width: 455px;
    height: 38px;
    line-height: 38px;
    text-indent: 8px;
    border: 2px solid #199fe9;
    border-radius: 6px 0 0 6px;
    outline: none
}

.sch-bd.ecp .sch-bd03 {
    width: 71px;
    height: 42px;
    line-height: 40px;
    text-align: center;
    color: #fff;
    font-size: 16px;
    border: 2px solid #199fe9;
    border-radius: 0 6px 6px 0;
    background: #199fe9 url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/index-header-search.46a04c90.svg) no-repeat 50%
}

.sch-bd.ecp .search-list {
    position: absolute;
    top: 42px;
    z-index: 1300;
    display: none;
    margin-left: 1px;
    width: 86%;
    border: 1px solid #e9e9e9;
    border-top: 0;
    background: #fff
}

.sch-bd.ecp .search-list .brand-tips-div {
    height: 40px;
    line-height: 40px;
    border-bottom: 1px solid #e9e9e9
}

.sch-bd.ecp .search-list .brand-tips-div .brand-img {
    float: left;
    height: 30px;
    position: relative;
    top: 5px;
    margin-left: 10px
}

.sch-bd.ecp .search-list .brand-tips-div .no-brand-img {
    float: left;
    width: 27px;
    position: relative;
    top: 8px;
    margin-left: 15px
}

.sch-bd.ecp .search-list .brand-tips-div .right-icon-img {
    float: left;
    width: 8px;
    height: 11px;
    position: relative;
    top: 15px;
    left: 10px
}

.sch-bd.ecp .search-list .search-recommend-title,.sch-bd.ecp .search-list .search-record-title {
    position: relative;
    width: 94%;
    height: 35px;
    line-height: 40px;
    margin: 0 3%;
    font-size: 13px;
    font-weight: 700;
    color: #0094e7;
    box-sizing: border-box;
    border-bottom: 1px solid #e9e9e9
}

.sch-bd.ecp .search-list .search-recommend-title .del-icon,.sch-bd.ecp .search-list .search-record-title .del-icon {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 16px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/brush.0433c3be.svg);
    cursor: pointer
}

.sch-bd.ecp .search-list .search-record-wrap {
    width: 100%;
    min-height: 30px;
    padding: 0 3%;
    font-size: 0;
    box-sizing: border-box
}

.sch-bd.ecp .search-list .search-record-wrap .search-record-item {
    display: block;
    height: 30px;
    line-height: 30px;
    font-size: 12px;
    cursor: pointer;
    border-radius: 2px
}

.sch-bd.ecp .search-list .search-record-wrap .search-record-item .right {
    display: none;
    float: right;
    width: 12px;
    height: 12px;
    margin: 8px 12px 0 0;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/close.57b886b0.svg) no-repeat;
    background-size: 12px;
    color: #dedede;
    font-size: 20px
}

.sch-bd.ecp .search-list .search-record-wrap .search-record-item:hover {
    background: #f9feff
}

.sch-bd.ecp .search-list .search-record-wrap .search-record-item:hover .right {
    display: inline-block
}

.sch-bd.ecp .search-list .search-recommend-wrap {
    width: 100%;
    min-height: 30px;
    padding: 0 3%;
    font-size: 0;
    box-sizing: border-box
}

.sch-bd.ecp .search-list .search-recommend-wrap .recommend-item {
    display: block;
    height: 30px;
    line-height: 30px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis
}

.sch-bd.ecp .search-list .search-recommend-wrap .recommend-item:hover {
    background: #f9feff
}

.sch-bd.ecp .search-list ul li {
    height: 30px;
    line-height: 30px;
    padding: 0 4px
}

.sch-bd.ecp .search-list ul li.active {
    background: #e9e9e9
}

.sch-bd.ecp .search-list ul li .search-word {
    float: left;
    color: #666
}

.sch-bd.ecp .search-list ul li .search-num {
    float: right;
    color: #999;
    font-size: 12px
}

.sch-bd.ecp .search-list ul li .search-num i {
    font-style: normal
}

.sch-bd.ecp .search-list .search-word-no-keyword b {
    font-weight: 400
}

.layout-catalogs.ecp {
    position: relative;
    z-index: 1111;
    float: left;
    width: 192px;
    height: 470px;
    line-height: 35px;
    box-sizing: border-box;
    font-size: 12px
}

.layout-catalogs.ecp.not-index-page {
    display: none
}

.layout-catalogs.ecp ul {
    box-sizing: border-box;
    margin-top: 12px;
    padding: 10px 0;
    height: 100%;
    background: hsla(0,0%,100%,.9);
    position: relative;
    border-radius: 8px
}

.layout-catalogs.ecp ul li {
    padding-left: 15px;
    box-sizing: border-box
}

.layout-catalogs.ecp ul li,.layout-catalogs.ecp ul li a {
    width: 100%;
    text-overflow: ellipsis;
    word-break: break-all;
    white-space: nowrap;
    overflow: hidden
}

.layout-catalogs.ecp ul li a {
    float: left;
    display: block;
    border: 1px solid transparent;
    color: #000
}

.layout-catalogs.ecp ul li>a {
    height: 28px;
    line-height: 28px;
    font-size: 14px
}

.layout-catalogs.ecp ul li.all {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    padding-right: 15px
}

.layout-catalogs.ecp ul li.all>a {
    color: #199de9
}

.layout-catalogs.ecp ul li.all>img {
    display: none
}

.layout-catalogs.ecp ul li p {
    float: right;
    margin-right: 2px
}

.layout-catalogs.ecp ul li .pic {
    float: left;
    display: inline-block;
    margin: 0 10px 0 16px;
    padding-top: 9px;
    width: 22px;
    height: 16px;
    vertical-align: middle;
    text-indent: 30px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/catagory_icon3.3b7bf5e2.png) no-repeat
}

.layout-catalogs.ecp ul li .ass-pic-470 {
    background-position: 2px -36px
}

.layout-catalogs.ecp ul li .ass-pic-423 {
    background-position: 2px -98px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li .ass-pic-575 {
    background-position: 2px -126px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li .ass-pic-380 {
    background-position: 7px -94px
}

.layout-catalogs.ecp ul li .ass-pic-515,.layout-catalogs.ecp ul li .ass-pic-10991 {
    background-position: 2px -177px
}

.layout-catalogs.ecp ul li .ass-pic-365 {
    background-position: 2px -210px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li .ass-pic-500 {
    background-position: 2px -230px
}

.layout-catalogs.ecp ul li .ass-pic-319 {
    margin-top: 6px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/ljq.50213c7e.svg) 50% no-repeat
}

.layout-catalogs.ecp ul li .ass-pic-320 {
    background-position: 4px -63px
}

.layout-catalogs.ecp ul li .ass-pic-308 {
    background-position: 5px -178px
}

.layout-catalogs.ecp ul li .ass-pic-312 {
    background-position: 0 -18px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li .ass-pic-348,.layout-catalogs.ecp ul li .ass-pic-450,.layout-catalogs.ecp ul li .ass-pic-582 {
    background-position: 2px -148px
}

.layout-catalogs.ecp ul li .ass-pic-316 {
    background-position: 2px -259px
}

.layout-catalogs.ecp ul li .ass-pic-513 {
    background-position: 2px -290px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li .ass-pic-601 {
    background-position: 2px -319px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li .ass-pic-570 {
    background-position: 2px -347px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li .ass-pic-385 {
    background-position: 2px -375px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li .ass-pic-938 {
    background-position: 2px -402px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li .ass-pic-320 {
    background-position: 2px -66px
}

.layout-catalogs.ecp ul li .ass-pic-953 {
    background-position: 2px -426px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li .ass-pic-11279,.layout-catalogs.ecp ul li .ass-pic-11337 {
    margin-top: 4px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAZCAYAAAA14t7uAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAFqADAAQAAAABAAAAGQAAAACecaSLAAACFUlEQVRIDe2TO0gcURSGd1WINopgxIjLNoIBEZZEogk2FrayZCGFSIxFECI2VqYI9oIhYBdBQsiKWNkI2iuSQtAqFiYGX8hqDAgiW6zj9w/3yL6G+AKb/PBxzj1z7j8z9xEK3ac8zyuBijv9BgzjcAxp+AJ38wKM/kAnVMEUrMKjW309BmVwChEzIh+BHYhZ7UYRg1E4gXYzIE/AIXRb7dqRyR/B1GcGFFphF4atduXIpDcg9cB3P/O8cTNgHIE1GLXaPyPNXSC9t2bySb/ieUtZNZlrH8qsFhhpijmDz/lN1Afdsy2iTopOzFF+X8GYpihIixDObmCsi2KaJdHZ1hmPZ/cpz59YTS0FP6EFXkEjZBzaqBpoCIfDexjqsqTJz4k5KrERTQ/I1yENz+AtfAP1lEMlTMMOvIQQhmfFTPXMF6b6xWWQ6qESMvDEeixSawad4SqrBUaakiA1q4k4DpMuHyLfdwy5mk7HmPJA0aBNkp6ridgER/AQOmATGh3KVasDbVo0yFjr9wN+sVYrrilBTDI+JLbBHPmmUK4a+QHxK/RCcfHWT6BT4EtfAX/hBQR9sf5Gf9Vk8woiDyfANybWgt24BTUzDlrjy6tdYOombjO5mFIUdZZzRO0p6MTo+AVK9/sxnEI/rMIGeDAA8xjMEHUB7JJ8IH/HOp8QA5Vz8/K7MH1NLQIyLXX8xlQb919XW4ELotkvQujuvvUAAAAASUVORK5CYII=) 50% no-repeat
}

.layout-catalogs.ecp ul li:hover {
    background: #e6f6ff;
    cursor: pointer
}

.layout-catalogs.ecp ul li:hover.all>img {
    display: inline-block
}

.layout-catalogs.ecp ul li:hover .s-submnu {
    display: block
}

.layout-catalogs.ecp ul li:hover a {
    color: #199de9
}

.layout-catalogs.ecp ul li:hover>a {
    float: none;
    z-index: 100
}

.layout-catalogs.ecp ul li:hover .ass-pic-470 {
    background-position: -26px -36px
}

.layout-catalogs.ecp ul li:hover .ass-pic-423 {
    margin-top: 6px;
    background-position: -26px -98px
}

.layout-catalogs.ecp ul li:hover .ass-pic-575 {
    margin-top: 6px;
    background-position: -26px -126px
}

.layout-catalogs.ecp ul li:hover .ass-pic-380 {
    background-position: -26px -94px
}

.layout-catalogs.ecp ul li:hover .ass-pic-515,.layout-catalogs.ecp ul li:hover .ass-pic-10991 {
    background-position: -26px -177px
}

.layout-catalogs.ecp ul li:hover .ass-pic-365 {
    margin-top: 6px;
    background-position: -26px -210px
}

.layout-catalogs.ecp ul li:hover .ass-pic-500 {
    background-position: -26px -230px
}

.layout-catalogs.ecp ul li:hover .ass-pic-319 {
    margin-top: 6px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/h_ljq.27a3718f.svg) 50% no-repeat
}

.layout-catalogs.ecp ul li:hover .ass-pic-320 {
    background-position: -26px -66px
}

.layout-catalogs.ecp ul li:hover .ass-pic-308 {
    background-position: -26px -178px
}

.layout-catalogs.ecp ul li:hover .ass-pic-312 {
    background-position: -30px -17px
}

.layout-catalogs.ecp ul li:hover .ass-pic-348,.layout-catalogs.ecp ul li:hover .ass-pic-450,.layout-catalogs.ecp ul li:hover .ass-pic-582 {
    background-position: -26px -148px
}

.layout-catalogs.ecp ul li:hover .ass-pic-316 {
    background-position: -26px -259px
}

.layout-catalogs.ecp ul li:hover .ass-pic-513 {
    margin-top: 6px;
    background-position: -26px -290px
}

.layout-catalogs.ecp ul li:hover .ass-pic-601 {
    background-position: -26px -319px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li:hover .ass-pic-570 {
    background-position: -26px -347px;
    margin-top: 6px
}

.layout-catalogs.ecp ul li:hover .ass-pic-385 {
    margin-top: 6px;
    background-position: -26px -375px
}

.layout-catalogs.ecp ul li:hover .ass-pic-938 {
    margin-top: 6px;
    background-position: -26px -402px
}

.layout-catalogs.ecp ul li:hover .ass-pic-953 {
    margin-top: 6px;
    background-position: -26px -426px
}

.layout-catalogs.ecp ul li:hover .ass-pic-11279,.layout-catalogs.ecp ul li:hover .ass-pic-11337 {
    margin-top: 4px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/hardware.2c7bd4c9.png) 50% no-repeat
}

.layout-catalogs.ecp ul li .s-submnu {
    display: none;
    position: absolute;
    z-index: 98;
    left: 188px;
    top: 0;
    padding: 0 20px 0 24px;
    box-sizing: border-box;
    width: 1013px;
    min-height: 470px;
    background: #fff;
    box-shadow: 0 2px 16px 0 rgba(1,66,104,.2);
    border-radius: 0 8px 8px 0
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content {
    height: auto
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title {
    line-height: 44px;
    border-bottom: 1px solid #e3e3e3;
    font-weight: 700;
    color: #0895e7;
    position: relative
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn {
    float: right;
    width: 102px;
    color: #ff7300;
    height: 26px;
    line-height: 26px;
    margin-top: 12px
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn img {
    width: 100%;
    height: 100%
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn:hover+.connector-pic-btn-active {
    display: block
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn-active {
    position: absolute;
    right: 0;
    top: 0;
    display: none;
    width: 102px;
    color: #ff7300;
    height: 26px;
    line-height: 26px;
    margin-top: 12px
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn-active img {
    width: 100%;
    height: 100%
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn-active:hover {
    display: block
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title .two-catalog {
    float: none;
    display: inline;
    font-size: 14px;
    font-weight: 700;
    color: #333
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title .two-catalog:hover {
    color: #0895e7
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title .two-catalog:hover~span {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/catelog-more-hover.a19dacd9.svg) no-repeat 100%
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-title span {
    display: inline-block;
    width: 6px;
    height: 10px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNLjY0Ni42NDZBLjUuNSAwIDAxMS4yODQuNTlsLjA3LjA1NyA0IDRhLjUuNSAwIDAxLjA1Ny42MzhsLS4wNTcuMDctNCA0YS41LjUgMCAwMS0uNzY1LS42MzhsLjA1Ny0uMDdMNC4yOTMgNSAuNjQ2IDEuMzU0QS41LjUgMCAwMS41OS43MTZsLjA1Ny0uMDd6IiBmaWxsPSIjOTk5IiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48L3N2Zz4=) no-repeat
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item {
    position: relative;
    display: inline-block;
    float: left;
    margin-top: 14px;
    line-height: 12px;
    color: #494949;
    width: 160px;
    text-align: left
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item.noMarginR {
    margin-right: 0
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item .icon-hot {
    position: absolute;
    top: -10px;
    right: 55px;
    width: 14px;
    height: 18px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/hot.c11b9c7b.svg) no-repeat
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item .icon-recommend {
    position: absolute;
    top: -10px;
    right: 55px;
    width: 16px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/recommend.35780c62.svg) no-repeat
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item .icon-domestic {
    position: absolute;
    top: -10px;
    right: 55px;
    width: 29px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/domestic.b132d580.svg) no-repeat
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item a {
    font-weight: 400;
    color: #666;
    display: inline-block;
    border: none;
    width: 150px;
    text-align: left
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item a:hover {
    color: #199de9
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item a.catalog-tag {
    width: 100px;
    height: 25px;
    border-radius: 3px;
    background: #e7f6ff;
    color: #199fe9;
    text-align: center;
    line-height: 25px
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item a.catalog-tag.hot {
    background: #fee;
    color: #f4220f
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item a.catalog-tag.recommend {
    background: #ffefe6;
    color: #ff5901
}

.layout-catalogs.ecp ul li .s-submnu .s-submun-content .s-submun-content-item a.catalog-tag.domestic {
    background: #e5eeff;
    color: #0556f5
}

.layout-catalogs.ecp .catalog-img {
    margin-top: 15px;
    width: 240px;
    height: 98px
}

.layout-foot.ecp .give-up-ie8-tips-div {
    display: none;
    height: 66px;
    width: 100%;
    background: #ff9c6e;
    color: #fff;
    font-size: 14px
}

.layout-foot.ecp .give-up-ie8-tips-div .give-up-ie8-tips-div-con {
    margin: 0 auto;
    padding-top: 12px;
    width: 1200px
}

.layout-foot.ecp .give-up-ie8-tips-div a,.layout-foot.ecp .give-up-ie8-tips-div a:hover {
    font-size: 14px;
    color: #fff;
    text-decoration: underline
}

.layout-foot.ecp .spot {
    margin-top: 48px;
    background: #e3e3e3;
    border-bottom: 1px solid #d5d5d5
}

.layout-foot.ecp .spot ul {
    margin: 0 auto;
    height: 126px;
    background: #e3e3e3;
    width: 1198px;
    border-bottom: 1px solid #e3e3e3;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    padding: 0 53px 0 50px;
    box-sizing: border-box
}

.layout-foot.ecp .spot ul li {
    text-align: center
}

.layout-foot.ecp .spot ul li.sp02 {
    margin-right: 10px
}

.layout-foot.ecp .spot ul li>div {
    text-align: left;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: start;
    -webkit-align-items: flex-start;
    align-items: flex-start
}

.layout-foot.ecp .spot ul li>div>img {
    width: 50px;
    height: 50px
}

.layout-foot.ecp .spot ul li>div>div {
    margin-left: 9px
}

.layout-foot.ecp .spot ul li>div h4 {
    font-size: 18px;
    margin-bottom: 6px;
    font-weight: 400;
    color: #333
}

.layout-foot.ecp .spot ul li>div p {
    font-size: 12px;
    color: #666;
    margin-bottom: 1px;
    word-break: keep-all
}

.layout-foot.ecp .footer {
    margin: 0;
    height: 253px;
    width: 100%;
    border-bottom: 1px solid #e3e3e3;
    background: #e3e3e3
}

.layout-foot.ecp .footer .foot {
    width: 1200px;
    margin: 0 auto;
    background: #e3e3e3;
    -webkit-box-align: start;
    -webkit-align-items: flex-start;
    align-items: flex-start
}

.layout-foot.ecp .footer .foot,.layout-foot.ecp .footer .foot .footer-left {
    height: 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.layout-foot.ecp .footer .foot .footer-left dl {
    box-sizing: border-box;
    margin-top: 28px;
    margin-right: 30px!important;
    width: 90px;
    text-align: left
}

.layout-foot.ecp .footer .foot .footer-left dl:nth-last-of-type(2),.layout-foot.ecp .footer .foot .footer-left dl:nth-last-of-type(3) {
    margin-right: 77px
}

.layout-foot.ecp .footer .foot .footer-left dl:last-of-type {
    margin-right: 0;
    width: 110px;
    border-right: 1px solid #d5d5d5
}

.layout-foot.ecp .footer .foot .footer-left dt {
    font-size: 14px;
    color: #333;
    font-weight: 700;
    margin-bottom: 24px
}

.layout-foot.ecp .footer .foot .footer-left dd {
    margin-left: 0;
    margin-bottom: 13px;
    color: #666
}

.layout-foot.ecp .footer .foot .footer-left dd>a {
    color: #666
}

.layout-foot.ecp .footer .foot .footer-left dd:last-of-type {
    margin-bottom: 0
}

.layout-foot.ecp .footer .foot .footer-left dd:hover a {
    color: #0193e6
}

.layout-foot.ecp .footer .foot .footer-left dd a {
    font-size: 12px
}

.layout-foot.ecp .footer .foot .footer-right {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.layout-foot.ecp .footer .foot .footer-right dl {
    box-sizing: border-box;
    margin-top: 28px;
    margin-right: 60px;
    text-align: left
}

.layout-foot.ecp .footer .foot .footer-right dl:first-of-type {
    margin-right: 42px
}

.layout-foot.ecp .footer .foot .footer-right dl:last-of-type {
    margin-right: 0
}

.layout-foot.ecp .footer .foot .footer-right dt {
    font-size: 14px;
    color: #333;
    font-weight: 700;
    margin-bottom: 24px
}

.layout-foot.ecp .footer .foot .footer-right dd {
    margin-left: 0;
    margin-bottom: 13px;
    color: #666
}

.layout-foot.ecp .footer .foot .footer-right dd:last-of-type {
    margin-bottom: 0
}

.layout-foot.ecp .footer .foot .footer-right dd.service-time {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.layout-foot.ecp .footer .foot .footer-right dd a {
    font-size: 12px
}

.layout-foot.ecp .member {
    margin: 0 auto 10px;
    padding: 24px 0 14px;
    width: 1200px
}

.layout-foot.ecp .member table {
    margin-bottom: 10px
}

.layout-foot.ecp .member table td {
    line-height: 24px
}

.layout-foot.ecp .member table td.link-member {
    width: 98px;
    font-size: 12px;
    color: #444
}

.layout-foot.ecp .member table td.link-txt a {
    float: left;
    margin-right: 23px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    color: #666
}

.layout-foot.ecp .member table td.link-txt a:hover {
    color: #0093e6
}

.layout-foot.ecp .member table td.not-index a {
    margin-right: 23px
}

.layout-foot.ecp .link-wrap {
    background: #e3e3e3;
    width: 100%;
    border-top: 1px solid #d5d5d5;
    padding: 28px 0 39px;
    box-sizing: border-box
}

.layout-foot.ecp .link-wrap .link {
    width: 1200px;
    margin: 0 auto
}

.layout-foot.ecp .link-wrap .link .link-site {
    display: none;
    padding-bottom: 18px
}

.layout-foot.ecp .link-wrap .link .member-site {
    padding-bottom: 19px
}

.layout-foot.ecp .link-wrap .link td {
    line-height: 24px
}

.layout-foot.ecp .link-wrap .link ul li {
    line-height: 28px;
    font-size: 16px;
    float: left;
    font-weight: 700;
    margin-right: 32px;
    margin-bottom: 18px;
    width: 66px;
    cursor: pointer;
    color: #444
}

.layout-foot.ecp .link-wrap .link ul li.active {
    border-bottom: 2px solid #0193e6;
    color: #0193e6
}

.layout-foot.ecp .link-wrap .link .link-bt {
    width: 6%;
    float: left;
    white-space: nowrap
}

.layout-foot.ecp .link-wrap .link .link-txt a {
    color: #666;
    margin-right: 23px;
    float: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden
}

.layout-foot.ecp .link-wrap .link .link-txt a:hover {
    color: #0093e6
}

.layout-foot.ecp .link-wrap .link .link-red a {
    color: red
}

.layout-foot.ecp .link-wrap .link .link-txt-new a {
    width: 100%
}

.layout-foot.ecp .link-wrap .letter-index {
    width: 1200px;
    margin: 0 auto
}

.layout-foot.ecp .link-wrap .letter-index ul {
    overflow: hidden
}

.layout-foot.ecp .link-wrap .letter-index ul li {
    float: left;
    text-align: center;
    cursor: pointer;
    margin-right: 15px
}

.layout-foot.ecp .link-wrap .letter-index ul li:first-of-type {
    margin-right: 0
}

.layout-foot.ecp .link-wrap .letter-index ul li a {
    color: #666
}

.layout-foot.ecp .link-wrap .letter-index ul li a:hover {
    color: #0093e6
}

.layout-foot.ecp .link-wrap .letter-index ul li:first-child {
    color: #666;
    cursor: default
}

.layout-foot.ecp .entry-type-wrapper {
    background: #c7c7c7;
    width: 100%
}

.layout-foot.ecp .entry-type-wrapper .entry-type {
    text-align: center;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    width: 1200px;
    height: 40px;
    margin: 0 auto
}

.layout-foot.ecp .entry-type-wrapper .entry-type .icp {
    margin-left: 19px
}

.layout-foot.ecp .entry-type-wrapper .entry-type .icp .icp-1 {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.layout-foot.ecp .entry-type-wrapper .entry-type .icp .icp-1 .icon1,.layout-foot.ecp .entry-type-wrapper .entry-type .icp .icp-1 .icon2 {
    margin-right: 6px
}

.layout-foot.ecp .entry-type-wrapper .entry-type .icp .icp-1 a {
    display: inline-block;
    text-decoration: none;
    color: #444
}

.layout-foot.ecp .entry-type-wrapper .entry-type .icp .icp-1 .icp-2 {
    margin-left: 9px;
    margin-right: 26px
}

.mask,.mask-alert {
    display: none;
    position: fixed;
    z-index: 99999;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: #000;
    filter: alpha(opacity=35);
    background: rgba(0,0,0,.35)
}

.common-confirm-del {
    display: none;
    padding-bottom: 30px;
    position: fixed;
    width: 475px;
    border: 4px solid #d9d9d9;
    left: 50%;
    top: 50%;
    margin-left: -217px;
    margin-top: -93px;
    background: #fff;
    z-index: 1000002
}

.common-confirm-del .common-confirm-del-title {
    height: 14px;
    padding: 10px 6px 12px 15px;
    border-bottom: 1px solid #dedede;
    background: #f2f2f2
}

.common-confirm-del .common-confirm-del-title h3 {
    font-weight: 700;
    float: left;
    color: #444
}

.common-confirm-del .common-confirm-del-title a {
    display: block;
    float: right;
    width: 14px;
    height: 14px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/order_icon.a6d725f4.png) no-repeat -286px -317px
}

.common-confirm-del .common-confirm-del-content {
    position: relative;
    width: 260px;
    padding-left: 70px;
    margin: 0 auto
}

.common-confirm-del .common-confirm-del-content p {
    min-height: 20px;
    max-height: 300px;
    overflow-y: hidden;
    font-weight: 700;
    margin-top: 30px;
    font-size: 16px;
    color: #ff7900;
    word-break: break-all
}

.common-confirm-del .common-confirm-del-content p.fail,.common-confirm-del .common-confirm-del-content p.success {
    margin-top: 30px;
    font-weight: 400;
    font-size: 14px;
    color: #666
}

.common-confirm-del .common-confirm-del-content .common-tip {
    font-size: 12px;
    color: #666;
    line-height: 16px;
    margin: 10px 0
}

.common-confirm-del .common-confirm-del-content span {
    display: block;
    margin: 10px 0 16px
}

.common-confirm-del .common-cancel-a,.common-confirm-del .common-confirm-a {
    box-sizing: border-box;
    border: 0;
    display: inline-block;
    font-size: 14px;
    padding: 0 20px;
    height: 28px;
    text-align: center;
    line-height: 26px;
    text-decoration: none;
    cursor: pointer;
    border-radius: 3px;
    margin-top: 10px
}

.common-confirm-del .common-cancel-a {
    margin-right: 10px;
    color: #333;
    background: #fff;
    border: 1px solid #e4e4e4
}

.common-confirm-del .common-confirm-a {
    color: #fff;
    background: #0193e6;
    border: 1px solid #0193e6
}

.common-confirm-del .common-confirm-del-icon {
    position: absolute;
    left: 0;
    top: 3px;
    width: 54px;
    height: 54px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/cart_icon.b1026903.png) no-repeat -266px -255px
}

.common-confirm-del .common-confirm-del-icon-success {
    position: absolute;
    left: 0;
    top: 3px;
    width: 54px;
    height: 54px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/pay_icon.4dd25ecd.png) no-repeat 0 -120px
}

.common-confirm-overall-tmpl .common-confirm-del-btn {
    margin-left: -35px;
    text-align: center
}

#window-login-around-mask {
    display: none;
    position: fixed;
    z-index: 100010;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0
}

#window-login-around-mask .login-mask {
    width: 100%;
    height: 100%;
    background-color: #777;
    opacity: .6
}

#window-login-around-mask #window-login-main-div {
    position: absolute;
    z-index: 1000;
    top: 50%;
    left: 50%;
    width: 380px;
    height: 469px;
    margin-top: -235px;
    margin-left: -190px
}

.newWebGroup {
    position: relative;
    float: right;
    cursor: pointer;
    color: #666;
    margin: 0 5px;
    z-index: 1201
}

.newWebGroup .icon {
    margin-left: 2px;
    display: inline-block;
    width: 8px;
    height: 3px;
    vertical-align: middle;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/index_icon.1b6a881a.png) no-repeat -25px -6px;
    -webkit-transition: all .3s;
    transition: all .3s
}

.newWebGroup:hover {
    background: #fff
}

.newWebGroup:hover .icon {
    -webkit-transform: rotate(-180deg);
    transform: rotate(-180deg)
}

.newWebGroup:hover .groupBox {
    visibility: visible;
    height: 400px
}

.newWebGroup .sanjiao {
    display: none;
    position: absolute;
    top: 48px;
    left: calc(50% - 5px);
    height: 10px;
    width: 10px;
    box-shadow: -3px -2px 6px 0 rgba(0,0,0,.0784313725490196);
    -webkit-transform: rotate(45deg);
    transform: rotate(45deg);
    border-top: 1px solid;
    background: #fff;
    color: #dddada;
    border-left: 1px solid;
    z-index: 1114
}

.newWebGroup .hoverBox {
    display: none;
    height: 15px;
    position: absolute;
    margin-top: 0;
    width: 250px;
    margin-left: -50px;
    z-index: 1113
}

.newWebGroup .groupBox {
    height: 0;
    visibility: hidden;
    overflow: hidden;
    -webkit-transition: all .3s;
    transition: all .3s;
    position: absolute;
    width: 480px;
    margin-left: -110px;
    background: #fff;
    border: 1px solid #e3e3e3;
    border-top: none;
    z-index: 1113;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    padding: 15px 15px 15px 10px
}

.newWebGroup .groupBox .title {
    border-bottom: 1px solid #ededed;
    padding: 5px 0 0 5px;
    font-size: 12px;
    color: #333
}

.newWebGroup .groupBox .groupBox-item {
    width: 230px;
    padding-left: 10px
}

.newWebGroup .groupBox .groupBox-item:last-child {
    width: 200px
}

.newWebGroup .groupBox ul {
    height: auto
}

.newWebGroup .groupBox ul li {
    padding: 10px 0 5px 5px
}

.newWebGroup .groupBox ul li:hover {
    background: #dbeafe!important
}

.newWebGroup .groupBox ul li:hover .headBox>span {
    color: #1870ff!important
}

.newWebGroup .groupBox ul li a {
    float: none!important;
    text-align: left;
    width: 100%;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.newWebGroup .groupBox ul li a>div {
    line-height: 25px;
    color: #777
}

.newWebGroup .groupBox ul li a i {
    display: inline-block;
    width: 40px;
    height: 40px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-jlc.9453aff4.png) no-repeat 50%/contain;
    background-size: contain;
    vertical-align: text-bottom;
    margin-right: 8px
}

.newWebGroup .groupBox ul li a .icon_zhongxinhua {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-zxh.9bf7a64d.png) no-repeat 50%/contain;
    background-size: contain
}

.newWebGroup .groupBox ul li a .icon_eda {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-eda.505c44af.png) no-repeat 50%/contain
}

.newWebGroup .groupBox ul li a .icon_3d {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-3d.19db56bb.png) no-repeat 50%/contain
}

.newWebGroup .groupBox ul li a .icon_fa {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-fa.491d4b5c.png) no-repeat 50%/contain
}

.newWebGroup .groupBox ul li a .headBox :first-child {
    font-size: 14px;
    color: #333
}

.layout-header.head-mro .message {
    display: none;
    line-height: 32px;
    background: #fff6c1;
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    width: 100%
}

.layout-header.head-mro .message a {
    color: #ff3301
}

.layout-header.head-mro .banner-ads {
    width: 100%;
    background: #fff;
    height: 100%
}

.layout-header.head-mro .banner-ads a {
    position: relative;
    display: block
}

.layout-header.head-mro .banner-ads a,.layout-header.head-mro .banner-ads a .banner-div {
    margin: 0 auto;
    min-width: 1200px;
    max-width: 100%
}

.layout-header.head-mro .banner-ads a .banner-div img {
    width: 100%
}

.layout-header.head-mro .banner-ads a .banner-close {
    position: absolute;
    top: 10px;
    right: 50px;
    padding: 4px;
    width: 18px;
    height: 18px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/close_top.2f74c796.png) no-repeat;
    color: #dedede;
    font-size: 20px
}

.layout-header.head-mro .banner-ads a:hover .banner-close {
    background-position-x: -28px
}

.layout-header.head-mro .hd {
    width: 100%;
    height: 40px;
    background: #f4f4f4
}

.layout-header.head-mro .hd .hd-bd {
    position: relative;
    margin: 0 auto;
    width: 1200px;
    height: 40px;
    line-height: 40px;
    z-index: 1399
}

.layout-header.head-mro .hd .hd-bd .home {
    float: left;
    display: inline-block;
    cursor: pointer;
    color: #0093e6;
    position: relative
}

.layout-header.head-mro .hd .hd-bd .home b {
    display: inline-block;
    width: 14px;
    height: 18px;
    vertical-align: text-top;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/shou.fed6f2eb.gif) no-repeat 0 0;
    background-size: 14px 18px;
    position: absolute;
    top: 28px;
    left: 30px
}

.layout-header.head-mro .hd .hd-bd .home span {
    padding: 0 12px;
    color: #ccc
}

.layout-header.head-mro .hd .hd-bd .home:hover {
    color: #199fe9
}

.layout-header.head-mro .hd .hd-bd .reg {
    float: right;
    margin-right: 5px;
    width: auto;
    color: #666;
    font-size: 12px
}

.layout-header.head-mro .hd .hd-bd .reg a {
    margin: 0 4px;
    color: #9a9a9a
}

.layout-header.head-mro .hd .hd-bd .reg a:hover {
    color: #199fe9
}

.layout-header.head-mro .hd .hd-bd .reg #custom {
    display: none;
    font-weight: 400;
    color: #0094e6
}

.layout-header.head-mro .hd .hd-bd .reg #login {
    font-weight: 400;
    color: #666
}

.layout-header.head-mro .hd .hd-bd .reg #register {
    font-weight: 700;
    color: #199fe9
}

.layout-header.head-mro .hd .hd-bd .reg #plus {
    display: inline-block
}

.layout-header.head-mro .hd .hd-bd .reg #plus .plus-label {
    display: inline-block;
    width: 38px;
    height: 17px;
    line-height: 17px;
    text-align: center;
    background: #2e3244;
    border-radius: 2px;
    font-size: 12px;
    font-family: MicrosoftYaHei;
    color: #f1d997
}

.layout-header.head-mro .hd .hd-bd .reg #plus .plus-label-disabled {
    background: #b1b1b2;
    color: #fff
}

.layout-header.head-mro .hd .hd-bd .reg #plus #plus-icon {
    margin-left: 2px;
    display: inline-block;
    width: 8px;
    height: 3px;
    vertical-align: middle;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/index_icon.1b6a881a.png) no-repeat -25px -6px;
    -webkit-transition: all .3s;
    transition: all .3s
}

.layout-header.head-mro .hd .hd-bd .reg #plus:hover,.layout-header.head-mro .hd .hd-bd .reg .active {
    position: relative;
    height: 40px;
    line-height: 40px;
    margin: 0;
    z-index: 1200;
    background: #fff
}

.layout-header.head-mro .hd .hd-bd .reg #plus:hover b,.layout-header.head-mro .hd .hd-bd .reg .active b {
    -webkit-transform: rotate(-180deg);
    transform: rotate(-180deg)
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap {
    position: absolute;
    left: 0;
    float: right;
    width: 312px;
    margin-left: -1px;
    z-index: 1112;
    background: #fff;
    border-left: 1px solid #e5e5e5;
    border-right: 1px solid #e5e5e5;
    border-bottom: 1px solid #e5e5e5;
    font-size: 0
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .account-wrap {
    display: none;
    text-align: right;
    font-size: 12px
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .account-wrap .account {
    margin: 0;
    padding-right: 10px;
    display: inline-block;
    color: #333;
    cursor: pointer
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .account-wrap .account:hover {
    color: #0094e5;
    cursor: pointer
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .account-wrap .space {
    padding-right: 10px;
    display: inline-block;
    font-size: 12px
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .expire-info-wrap {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    width: 100%;
    border-top: 1px solid #e5e5e5
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .expire-info-wrap .expire-tip {
    display: inline-block;
    height: 27px;
    line-height: 27px;
    margin: 15px 4px 15px 8px;
    font-size: 12px
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .expire-info-wrap .renew {
    display: inline-block;
    width: 71px;
    height: 27px;
    line-height: 27px;
    text-align: center;
    margin: 15px 6px 15px 0;
    background: #2e3244;
    border-radius: 13px;
    font-size: 12px;
    color: #fff;
    float: right
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .expire-info-wrap .renew:hover {
    opacity: .8
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .plus-icon-wrap {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item {
    display: inline-block;
    width: 50%;
    height: 100px
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item .round-left {
    position: relative;
    width: 50px;
    height: 50px;
    margin: 0 auto 5px;
    background: #e5edf6;
    border-radius: 25px;
    text-align: center
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item .round-right {
    position: relative;
    width: 50px;
    height: 50px;
    margin: 0 auto 5px;
    background: #ececf4;
    border-radius: 25px;
    text-align: center
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item .img-center {
    position: absolute;
    top: 50%;
    left: 50%;
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%)
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item .img-label {
    display: block;
    width: 80%;
    margin: 0 auto;
    line-height: 16px;
    font-size: 12px;
    text-align: center;
    color: #333
}

.layout-header.head-mro .hd .hd-bd .reg .plus-wrap .plus-icon-wrap .item:hover {
    color: #0094e5;
    cursor: pointer
}

.layout-header.head-mro .hd .hd-bd .active {
    position: relative;
    height: 40px;
    line-height: 40px;
    margin: 0;
    z-index: 1200;
    background: #fff
}

.layout-header.head-mro .hd .hd-bd .active b {
    -webkit-transform: rotate(-180deg);
    transform: rotate(-180deg)
}

.layout-header.head-mro .hd .hd-bd .welcome {
    padding: 0 5px;
    margin-right: 5px!important;
    position: relative
}

.layout-header.head-mro .hd .hd-bd .logout {
    display: none;
    float: right;
    padding-right: 10px;
    font-size: 0;
    cursor: pointer
}

.layout-header.head-mro .hd .hd-bd .logout span {
    margin-right: 6px;
    color: #333;
    font-size: 12px
}

.layout-header.head-mro .hd .hd-bd .logout span:hover {
    color: #0076b8;
    cursor: pointer
}

.layout-header.head-mro .hd .hd-bd .enter {
    position: relative;
    z-index: 1;
    float: right;
    color: #0076b8
}

.layout-header.head-mro .hd .hd-bd .enter .pd06 {
    padding: 0 10px
}

.layout-header.head-mro .hd .hd-bd .enter .pd06 .txt {
    color: #666
}

.layout-header.head-mro .hd .hd-bd .enter .pd06.has-icon {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.layout-header.head-mro .hd .hd-bd .enter .pd06.has-icon b {
    margin-right: 5px
}

.layout-header.head-mro .hd .hd-bd .enter span.er04 {
    float: right;
    color: #199fe9
}

.layout-header.head-mro .hd .hd-bd .enter span.er04 b {
    margin-right: 2px;
    display: inline-block;
    width: 20px;
    height: 18px;
    vertical-align: text-top;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/tel.17681def.svg) no-repeat;
    background-size: cover
}

.layout-header.head-mro .hd .hd-bd .enter a {
    float: right;
    color: #666
}

.layout-header.head-mro .hd .hd-bd .enter a:hover {
    color: #199fe9
}

.layout-header.head-mro .hd .hd-bd .enter a.er01 {
    border: 1px solid transparent;
    border-top: none;
    -webkit-transition: all .3s;
    transition: all .3s
}

.layout-header.head-mro .hd .hd-bd .enter a.er01 b {
    margin-left: 2px;
    display: inline-block;
    width: 8px;
    height: 3px;
    vertical-align: middle;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/index_icon.1b6a881a.png) no-repeat -25px -6px;
    -webkit-transition: all .3s;
    transition: all .3s
}

.layout-header.head-mro .hd .hd-bd .enter a.er01.er01.active,.layout-header.head-mro .hd .hd-bd .enter a.er01.er01:hover {
    position: relative;
    z-index: 1200;
    border-left: 1px solid #dedede;
    border-right: 1px solid #dedede;
    color: #199fe9;
    background: #fff
}

.layout-header.head-mro .hd .hd-bd .enter a.er01.er01.active b,.layout-header.head-mro .hd .hd-bd .enter a.er01.er01:hover b {
    -webkit-transform: rotate(-180deg);
    transform: rotate(-180deg)
}

.layout-header.head-mro .hd .hd-bd .enter a.er02 {
    background-position: 0 -296px
}

.layout-header.head-mro .hd .hd-bd .enter a.er03 {
    width: auto;
    height: 40px;
    background-position: 0 -61px
}

.layout-header.head-mro .hd .hd-bd .enter a.er03 b {
    display: inline-block;
    width: 15px;
    height: 18px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/phone.2ca2906f.svg) no-repeat 0 0;
    vertical-align: text-bottom;
    margin-right: 4px
}

.layout-header.head-mro .hd .hd-bd .enter a.er03:hover b {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/phone.abf9800d.svg) no-repeat 0 0
}

.layout-header.head-mro .hd .hd-bd .enter a.line {
    margin-right: 18px
}

.layout-header.head-mro .hd .hd-bd .enter a.qq {
    float: right;
    width: auto;
    height: 40px;
    line-height: 40px;
    color: #666;
    background-position: 0 -61px
}

.layout-header.head-mro .hd .hd-bd .enter a.qq b {
    display: inline-block;
    width: 16px;
    height: 18px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/qq.8e536e52.svg) no-repeat 0 0;
    vertical-align: text-bottom;
    margin-right: 4px
}

.layout-header.head-mro .hd .hd-bd .enter a.qq:hover {
    color: #199fe9
}

.layout-header.head-mro .hd .hd-bd .enter a.qq:hover b {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/qq.63c6a829.svg) no-repeat 0 0
}

.layout-header.head-mro .hd .hd-bd .enter .member-list-wrap {
    position: relative;
    float: right
}

.layout-header.head-mro .hd .hd-bd .enter .member-list-wrap .member-list {
    position: absolute;
    top: 39px;
    right: 0;
    z-index: 1112;
    display: none;
    margin: 0;
    padding-bottom: 8px;
    width: 185px;
    border: 1px solid #e5e5e5;
    background: #fff
}

.layout-header.head-mro .hd .hd-bd .enter .member-list-wrap .member-list dl {
    margin: 10px 0 0 15px;
    font-size: 14px
}

.layout-header.head-mro .hd .hd-bd .enter .member-list-wrap .member-list dl dt {
    float: left;
    width: 100%;
    line-height: 26px;
    color: #666
}

.layout-header.head-mro .hd .hd-bd .enter .member-list-wrap .member-list dl dt a {
    float: none;
    padding: 0;
    color: #666
}

.layout-header.head-mro .hd .hd-bd .enter .member-list-wrap .member-list dl dd {
    float: left;
    width: 100%;
    line-height: 26px
}

.layout-header.head-mro .hd .hd-bd .enter .member-list-wrap .member-list dl dd a {
    float: left;
    padding-left: 0;
    color: #666
}

.layout-header.head-mro .hd .hd-bd .enter .member-list-wrap .member-list dl dd a:hover {
    float: left;
    padding-left: 0;
    color: #199fe9
}

.layout-header.head-mro .hd .hd-bd .enter .member-list-wrap .member-list dl dd span {
    margin: 0 12px;
    float: left;
    color: #bdbdbd
}

.layout-header.head-mro .hd .hd-bd .enter .c-line {
    color: #ccc;
    float: right
}

.layout-header.head-mro .hd .hd-bd .enter .collect {
    float: right;
    cursor: pointer;
    border: 1px solid transparent;
    border-top: none
}

.layout-header.head-mro .hd .hd-bd .enter .collect .sc {
    display: inline-block;
    width: 18px;
    height: 18px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/collect.29dca6a2.svg) 50% no-repeat;
    background-size: contain;
    vertical-align: middle;
    margin-top: -2px;
    margin-right: 5px
}

.layout-header.head-mro .hd .hd-bd .enter .collect .collect-tip {
    position: absolute;
    top: 41px;
    right: -1px;
    z-index: 1112;
    display: none;
    margin: 0;
    padding: 10px 0;
    width: 300px;
    border: 1px solid #e5e5e5;
    border-top: none;
    background: #fff;
    text-align: center;
    line-height: 20px;
    cursor: default
}

.layout-header.head-mro .hd .hd-bd .enter .collect:hover .txt {
    color: #199fe9
}

.layout-header.head-mro .hd .hd-bd .enter .collect:hover .sc {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/collect.a7e359d3.svg) 50% no-repeat;
    background-size: cover
}

.layout-header.head-mro .hd .hd-bd .enter .actives,.layout-header.head-mro .hd .hd-bd .enter .collect:hover {
    position: relative;
    border-left: 1px solid #dedede;
    border-right: 1px solid #dedede;
    z-index: 1200;
    background: #fff
}

.layout-header.head-mro .logo-wrap {
    padding: 33px 0 6px;
    min-width: 1200px;
    height: 90px;
    background: #fff
}

.layout-header.head-mro .logo-wrap.active {
    position: fixed;
    top: -120px;
    z-index: 999999;
    padding: 21px 0;
    width: 100%;
    height: 68px;
    background: #fff;
    box-shadow: 0 5px 5px rgba(0,0,0,.07)
}

.layout-header.head-mro .logo-wrap.active .hot {
    display: none
}

.layout-header.head-mro .nav {
    width: 100%;
    height: 42px;
    background: #fff;
    border-bottom: 2px solid #0093e6
}

.layout-header.head-mro .nav .nav-bd {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    margin: 0 auto;
    width: 1200px
}

.layout-header.head-mro .nav .nav-bd .sort {
    float: left;
    width: 228.8px;
    height: 44px;
    line-height: 44px;
    font-size: 16px;
    cursor: pointer
}

.layout-header.head-mro .nav .nav-bd .sort:hover .layout-catalogs {
    display: block
}

.layout-header.head-mro .nav .nav-bd .sort .layout-catalogs,.layout-header.head-mro .nav .nav-bd .sort .not-index-page ul {
    box-sizing: border-box;
    background: #fff;
    position: relative;
    border-radius: 0;
    margin-top: 0
}

.layout-header.head-mro .nav .nav-bd .sort p {
    width: 228.8px;
    line-height: 44px;
    text-indent: 15px;
    color: #fff;
    font-size: 16px;
    font-weight: 400!important;
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    background: #0093e6;
    border-radius: 20px 0 0 0
}

.layout-header.head-mro .nav .nav-bd .sort p span {
    display: inline-block;
    width: 16px;
    height: 13px;
    vertical-align: middle;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/fl.7290f13f.svg) no-repeat;
    margin-top: -2px;
    margin-right: 5px
}

.layout-header.head-mro .nav .nav-bd .sort~.snav {
    padding-left: 42px
}

.layout-header.head-mro .nav .nav-bd .snav {
    font-size: 16px;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    width: 1008px;
    box-sizing: border-box
}

.layout-header.head-mro .nav .nav-bd .snav:first-of-type {
    padding-left: 15px
}

.layout-header.head-mro .nav .nav-bd .snav a {
    position: relative;
    margin-right: 48px;
    display: block;
    text-align: center;
    line-height: 44px;
    text-decoration: none;
    color: #444
}

.layout-header.head-mro .nav .nav-bd .snav a.hover,.layout-header.head-mro .nav .nav-bd .snav a:hover {
    display: block;
    color: #199fe9
}

.layout-header.head-mro .nav .nav-bd .snav a:last-of-type {
    margin-right: 0
}

.layout-header.head-mro .nav .nav-bd .snav .nav-link {
    position: relative
}

.layout-header.head-mro .nav .nav-bd .snav .n-p1 {
    position: absolute;
    right: -25px;
    top: 2px;
    display: inline-block;
    width: 31px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-hot.e08e27b8.svg) no-repeat
}

.layout-header.head-mro .nav .nav-bd .snav .n-p2 {
    position: absolute;
    right: -25px;
    top: 2px;
    display: inline-block;
    width: 31px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-new.8e85a951.svg) no-repeat 0 0
}

.layout-header.head-mro .nav .nav-bd .snav .n-p-gys {
    position: absolute;
    right: -30px;
    top: 2px;
    width: 41px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-gys.f25c4482.svg) no-repeat 50%;
    display: inline-block
}

.layout-header.head-mro .nav .nav-bd .snav .hot-enter {
    position: absolute;
    right: -24px;
    top: 2px;
    display: inline-block;
    width: 31px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/icon-rz.08e786e2.svg) no-repeat 0 0
}

.layout-header.head-mro .plus-renew-error-dialog-wrap-head .dialog-mask {
    position: fixed;
    z-index: 99999;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: #000;
    opacity: .7
}

.layout-header.head-mro .plus-renew-error-dialog-wrap-head .dialog-wrap {
    width: 388px;
    height: 170px;
    position: fixed;
    left: calc(50% - 194px);
    top: calc(50% - 85px);
    z-index: 100000;
    font-family: MicrosoftYaHei;
    background: #fff;
    border-radius: 6px
}

.layout-header.head-mro .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-header {
    width: 100%;
    height: 35px
}

.layout-header.head-mro .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-header .close {
    position: absolute;
    top: 10px;
    right: 10px;
    float: right;
    width: 17px;
    height: 17px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/close-icon-blue.35d990c9.svg) no-repeat;
    cursor: pointer
}

.layout-header.head-mro .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-body .error {
    width: 273px;
    height: 30px;
    padding: 0 57px 0 58px;
    text-align: center;
    font-size: 16px;
    color: #2e3244
}

.layout-header.head-mro .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-body .tip {
    width: 273px;
    height: 30px;
    margin-top: 3px;
    padding: 0 57px 0 58px;
    text-align: center;
    font-size: 14px;
    color: #2e3244
}

.layout-header.head-mro .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-body .i-see-button {
    display: block;
    width: 206px;
    height: 42px;
    line-height: 40px;
    margin: 9px auto 0;
    text-align: center;
    font-size: 14px;
    color: #f3d48e;
    background: -webkit-linear-gradient(277deg,#56567d,#3e3e5e 30%,#2e3244);
    background: linear-gradient(173deg,#56567d,#3e3e5e 30%,#2e3244);
    outline: none;
    box-shadow: none;
    border-color: transparent;
    border-radius: 4px
}

.layout-header.head-mro .plus-renew-error-dialog-wrap-head .dialog-wrap .dialog-body .i-see-button:hover {
    opacity: .8
}

.layout-header.head-mro .logo {
    width: 1200px;
    margin: 0 auto;
    position: relative
}

.layout-header.head-mro .logo.head-logo {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.layout-header.head-mro .logo .nav-ad {
    position: absolute;
    right: 0;
    top: 65px;
    width: 192px;
    height: 71px;
    background: #f5f5f5;
    border-radius: 13px 13px 8px 8px
}

.layout-header.head-mro .logo .lcsc {
    float: left
}

.layout-header.head-mro .logo .lcsc a {
    display: block;
    width: 220px;
    height: 58px;
    float: left
}

.layout-header.head-mro .logo .lcsc img {
    display: block;
    width: 100%
}

.layout-header.head-mro .logo .lgTexts {
    margin: 0 40px 0 10px;
    padding-top: 5px
}

.layout-header.head-mro .logo .lgTexts p {
    font-size: 14px;
    color: #2d2d38;
    line-height: 20px;
    white-space: nowrap
}

.layout-header.head-mro .logo .sch {
    position: relative;
    float: right;
    padding-top: 9px;
    width: 587px;
    height: 70px
}

.layout-header.head-mro .logo .hot {
    float: left;
    margin-top: 5px;
    width: 122%
}

.layout-header.head-mro .logo .hot a {
    margin-right: 5px;
    font-size: 12px;
    color: #bbb
}

.layout-header.head-mro .logo .fast-xj {
    width: 130px;
    height: 40px;
    background: #fff4f3;
    border: 1px solid #f8d6d3;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    margin: 9px 0 0 11px
}

.layout-header.head-mro .logo .fast-xj:hover {
    background: #fdefee
}

.layout-header.head-mro .logo .fast-xj span {
    color: #f74747;
    font-size: 14px;
    line-height: 1em
}

.layout-header.head-mro .logo .fast-xj .xj-icon {
    width: 12.38px;
    height: 15px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/xj.4059a8e5.svg) no-repeat 0 0;
    background-size: 100%;
    margin-right: 4px
}

.layout-header.head-mro .logo .shop {
    margin-top: 9px;
    margin-left: 11px;
    padding: 0 2px 0 16px;
    width: 157px;
    height: 42px;
    background: #fbfbfb;
    border: 1px solid #eee;
    position: relative;
    box-sizing: border-box;
    cursor: pointer
}

.layout-header.head-mro .logo .shop .white-box {
    display: none
}

.layout-header.head-mro .logo .shop.loading>p .cart-icon-a .cart-icon {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/jiazai.dff2c6b6.gif) no-repeat;
    background-size: 100% 100%
}

.layout-header.head-mro .logo .shop.actives {
    border-radius: 0;
    background: #fff;
    border-bottom: none
}

.layout-header.head-mro .logo .shop.actives .white-box {
    display: block;
    position: absolute;
    top: 31px;
    z-index: 9999;
    right: 3px;
    background: #fff;
    width: 129px;
    height: 20px;
    padding: 0 2px 0 16px
}

.layout-header.head-mro .logo .shop .collect-tip {
    position: absolute;
    top: 44px;
    right: -1px;
    z-index: 1112;
    display: none;
    margin: 0;
    padding: 10px 0;
    width: 338px;
    border: 1px solid #e5e5e5;
    border-top: none;
    background: #fff;
    text-align: center;
    line-height: 20px;
    cursor: default;
    box-shadow: 0 0 16px 0 rgba(1,66,104,.2);
    box-sizing: border-box;
    border-radius: 8px 0 8px 8px
}

.layout-header.head-mro .logo .shop .collect-tip.noGoods {
    padding-top: 30px;
    padding-bottom: 29px
}

.layout-header.head-mro .logo .shop .collect-tip.noGoods>div {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    padding: 0 0 0 48px
}

.layout-header.head-mro .logo .shop .collect-tip.noGoods>div img {
    margin-right: 20px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods {
    width: 610px;
    height: 413px;
    padding: 8px 0 0;
    text-align: left;
    box-sizing: content-box
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .tab-one {
    margin: 0 18px;
    border-bottom: 1px solid #199fe9;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .tab-one .tab-item {
    height: 29px;
    line-height: 29px;
    font-size: 14px;
    color: #333;
    padding: 4px 15px;
    cursor: pointer
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .tab-one .tab-item>.count {
    color: #199fe9;
    margin-left: 6px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .tab-one .tab-item.active {
    font-weight: 700;
    color: #199fe9;
    background: #ecf8ff;
    border-radius: 2px 2px 0 0;
    border: 1px solid #199fe9;
    border-bottom: none
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .tab-two {
    margin-top: 9px;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    padding-left: 18px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .tab-two .tab-item {
    margin-right: 16px;
    cursor: pointer
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .tab-two .tab-item.active {
    font-weight: 700;
    color: #199de9;
    position: relative
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .tab-two .tab-item.active:after {
    content: "";
    width: 18px;
    height: 2px;
    background-color: #199de9;
    position: absolute;
    bottom: -4px;
    left: 50%;
    -webkit-transform: translate(-50%);
    transform: translate(-50%)
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content {
    width: 610px;
    margin-top: 16px;
    min-height: 286px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content.panel {
    min-height: 315px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-header {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    height: 29px;
    background-color: #f5f5f5;
    line-height: 29px;
    margin-left: 18px;
    box-sizing: border-box
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-header [type=checkbox] {
    display: inline-block;
    margin: 0 13px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-header span {
    display: inline-block;
    color: #666
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-header span.goods_code {
    width: 116px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-header span.provider {
    width: 120px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-header span.price {
    width: 106px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-header span.count {
    width: 82px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-header span.price_total {
    width: 77px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-header span.complain {
    margin-right: 0
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list {
    margin-left: 18px;
    display: none;
    box-sizing: border-box;
    overflow-x: hidden;
    height: 256px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list.active {
    display: block
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    height: 40px;
    line-height: 40px;
    width: 100%;
    border-bottom: 1px solid #e4e4e6;
    position: relative
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item [type=checkbox] {
    display: inline-block;
    margin: 0 13px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span {
    display: inline-block;
    color: #666;
    overflow: hidden
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_goods_code {
    width: 96px;
    max-width: 96px;
    margin-right: 20px;
    font-weight: 700
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_provider {
    width: 100px;
    max-width: 100px;
    margin-right: 20px;
    position: relative
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_provider:hover~.item_provider_tips {
    display: block
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_price {
    width: 86px;
    max-width: 86px;
    margin-right: 20px;
    font-weight: 700
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_count {
    width: 62px;
    max-width: 62px;
    margin-right: 20px;
    font-weight: 700
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_price_total {
    width: 57px;
    max-width: 57px;
    margin-right: 20px;
    font-weight: 700;
    color: #ff7800
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item span.item_delete {
    margin-right: 0;
    cursor: pointer
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item .item_provider_tips {
    display: none;
    position: absolute;
    width: 142px;
    height: auto;
    background: #fff;
    box-shadow: 0 -1px 16px 2px rgba(1,66,104,.12);
    top: 40px;
    left: 147px;
    z-index: 9999;
    border-radius: 3px;
    padding: 13px;
    box-sizing: border-box
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item .item_provider_tips:after {
    content: "";
    position: absolute;
    left: 20%;
    top: -6px;
    width: 6px;
    height: 9px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/rightUtils20180907_new.d3293935.png) no-repeat -220px 0;
    -webkit-transform: translate(-50%) rotate(270deg);
    transform: translate(-50%) rotate(270deg)
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item .item_provider_tips:hover {
    display: block
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .goods-content .goods-list .goods-list-item .item_provider_tips div {
    height: 15px;
    line-height: 15px;
    margin-bottom: 3px;
    width: 100%;
    color: #333
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .ellipsis {
    text-overflow: ellipsis;
    word-break: break-all;
    white-space: nowrap;
    overflow: hidden
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .footer {
    width: 610px;
    height: 44px;
    background: #f5f5f5;
    line-height: 44px;
    padding: 0 18px 0 31px;
    box-sizing: border-box;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    border-radius: 0 0 8px 8px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .footer>span.del-all {
    color: #666;
    cursor: pointer;
    display: -webkit-inline-box;
    display: -webkit-inline-flex;
    display: inline-flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .footer>span.del-all img {
    margin-right: 6px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .footer .count {
    color: #ff7800;
    margin-right: 21px
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .footer .blod {
    font-weight: 700
}

.layout-header.head-mro .logo .shop .collect-tip.hasGoods .footer .settlement {
    display: inline-block;
    width: 77px;
    height: 28px;
    text-align: center;
    line-height: 28px;
    background: #ff7800;
    color: #fff;
    border-radius: 2px;
    cursor: pointer
}

.layout-header.head-mro .logo .shop p {
    height: 40px;
    line-height: 39px;
    position: relative
}

.layout-header.head-mro .logo .shop p .cart-icon-a {
    position: relative
}

.layout-header.head-mro .logo .shop p .cart-icon-a .cart-icon {
    display: inline-block;
    margin-right: 2px;
    width: 19px;
    height: 18px;
    vertical-align: middle;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/cart_new2.c0288cc2.svg) no-repeat 0 0;
    background-size: 19px 18px
}

.layout-header.head-mro .logo .shop p .cart-icon-a .tips {
    font-size: 14px;
    color: #333;
    line-height: 22px;
    height: 22px;
    vertical-align: middle
}

.layout-header.head-mro .logo .shop p .cart-icon-a .cart-icon2 {
    position: absolute;
    top: -1px;
    right: -32px;
    display: inline-block;
    width: 26px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    color: #fff;
    background: #373f5e;
    border-radius: 8px 8px 8px 0
}

.layout-header.head-mro .sch-bd {
    width: 100%;
    float: left;
    position: relative
}

.layout-header.head-mro .sch-bd .sch-bd02 {
    float: left;
    width: 491px;
    height: 38px;
    line-height: 38px;
    text-indent: 8px;
    border: 2px solid #0093e6;
    outline: none
}

.layout-header.head-mro .sch-bd .sch-bd03 {
    width: 55px;
    height: 42px;
    line-height: 40px;
    text-align: center;
    color: #fff;
    font-size: 16px;
    border: 2px solid #0093e6;
    background: #0093e6 url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/index-header-search.46a04c90.svg) no-repeat;
    background-position: 13px;
    background-size: 23.23px 24px
}

.layout-header.head-mro .sch-bd .search-list {
    position: absolute;
    top: 42px;
    z-index: 1300;
    display: none;
    margin-left: 1px;
    width: 87%;
    border: 1px solid #e9e9e9;
    border-top: 0;
    background: #fff
}

.layout-header.head-mro .sch-bd .search-list .brand-tips-div {
    height: 40px;
    line-height: 40px;
    border-bottom: 1px solid #e9e9e9
}

.layout-header.head-mro .sch-bd .search-list .brand-tips-div .brand-img {
    float: left;
    height: 30px;
    position: relative;
    top: 5px;
    margin-left: 10px
}

.layout-header.head-mro .sch-bd .search-list .brand-tips-div .no-brand-img {
    float: left;
    width: 27px;
    position: relative;
    top: 8px;
    margin-left: 15px
}

.layout-header.head-mro .sch-bd .search-list .brand-tips-div .right-icon-img {
    float: left;
    width: 8px;
    height: 11px;
    position: relative;
    top: 15px;
    left: 10px
}

.layout-header.head-mro .sch-bd .search-list .search-recommend-title,.layout-header.head-mro .sch-bd .search-list .search-record-title {
    position: relative;
    width: 94%;
    height: 35px;
    line-height: 40px;
    margin: 0 3%;
    font-size: 13px;
    font-weight: 700;
    color: #0094e7;
    box-sizing: border-box;
    border-bottom: 1px solid #e9e9e9
}

.layout-header.head-mro .sch-bd .search-list .search-recommend-title .del-icon,.layout-header.head-mro .sch-bd .search-list .search-record-title .del-icon {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 16px;
    height: 16px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/brush.0433c3be.svg);
    cursor: pointer
}

.layout-header.head-mro .sch-bd .search-list .search-record-wrap {
    width: 100%;
    min-height: 30px;
    padding: 0 3%;
    font-size: 0;
    box-sizing: border-box
}

.layout-header.head-mro .sch-bd .search-list .search-record-wrap .search-record-item {
    display: block;
    height: 30px;
    line-height: 30px;
    font-size: 12px;
    cursor: pointer;
    border-radius: 2px
}

.layout-header.head-mro .sch-bd .search-list .search-record-wrap .search-record-item .right {
    display: none;
    float: right;
    width: 12px;
    height: 12px;
    margin: 8px 12px 0 0;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/close.57b886b0.svg) no-repeat;
    background-size: 12px;
    color: #dedede;
    font-size: 20px
}

.layout-header.head-mro .sch-bd .search-list .search-record-wrap .search-record-item:hover {
    background: #f9feff
}

.layout-header.head-mro .sch-bd .search-list .search-record-wrap .search-record-item:hover .right {
    display: inline-block
}

.layout-header.head-mro .sch-bd .search-list .search-recommend-wrap {
    width: 100%;
    min-height: 30px;
    padding: 0 3%;
    font-size: 0;
    box-sizing: border-box
}

.layout-header.head-mro .sch-bd .search-list .search-recommend-wrap .recommend-item {
    display: block;
    height: 30px;
    line-height: 30px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis
}

.layout-header.head-mro .sch-bd .search-list .search-recommend-wrap .recommend-item:hover {
    background: #f9feff
}

.layout-header.head-mro .sch-bd .search-list ul li {
    height: 30px;
    line-height: 30px;
    padding: 0 4px
}

.layout-header.head-mro .sch-bd .search-list ul li.active {
    background: #e9e9e9
}

.layout-header.head-mro .sch-bd .search-list ul li .search-word {
    float: left;
    color: #666
}

.layout-header.head-mro .sch-bd .search-list ul li .search-num {
    float: right;
    color: #999;
    font-size: 12px
}

.layout-header.head-mro .sch-bd .search-list ul li .search-num i {
    font-style: normal
}

.layout-header.head-mro .sch-bd .search-list .search-word-no-keyword b {
    font-weight: 400
}

.layout-catalogs.mro {
    position: relative;
    z-index: 1111;
    float: left;
    width: 228.8px;
    max-height: 555px;
    line-height: 35px;
    box-sizing: border-box;
    font-size: 12px
}

.layout-catalogs.mro.not-index-page {
    display: none
}

.layout-catalogs.mro.not-index-page ul {
    box-shadow: 0 2px 16px 0 rgba(1,66,104,.2)
}

.layout-catalogs.mro ul {
    box-sizing: border-box;
    padding: 15px 0 0;
    height: 100%;
    max-height: 555px;
    background: hsla(0,0%,100%,.9);
    position: relative;
    border-radius: 8px
}

.layout-catalogs.mro ul .search-all {
    width: 228.8px
}

.layout-catalogs.mro ul .search-all a {
    font-size: 14px;
    color: #199fe9;
    width: 100%;
    height: 38px;
    text-align: center;
    line-height: 38px;
    display: block
}

.layout-catalogs.mro ul .search-all a:hover {
    background-color: #179be7;
    color: #fff
}

.layout-catalogs.mro ul li {
    width: 100%;
    box-sizing: border-box;
    padding-bottom: 7px
}

.layout-catalogs.mro ul li a {
    display: block;
    width: 100%;
    border: 1px solid transparent
}

.layout-catalogs.mro ul li a .indtop {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    width: 100%;
    text-overflow: ellipsis;
    word-break: break-all;
    white-space: nowrap;
    overflow: hidden;
    color: #000;
    font-size: 14px;
    letter-spacing: 2px;
    line-height: 32.8px
}

.layout-catalogs.mro ul li a .indtop img {
    width: 15px;
    height: 15px;
    margin: 0 9px 0 12px
}

.layout-catalogs.mro ul li a .indspans {
    width: 100%;
    padding-left: 35px;
    padding-right: 20px;
    color: #999;
    font-size: 12px;
    line-height: 16.5px;
    box-sizing: border-box
}

.layout-catalogs.mro ul li a .indspans span {
    margin-right: 3px
}

.layout-catalogs.mro ul li a .indspans span:hover {
    color: #199de8
}

.layout-catalogs.mro ul li.all {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    padding-right: 15px
}

.layout-catalogs.mro ul li.all>a {
    color: #199de9
}

.layout-catalogs.mro ul li.all>img {
    display: none
}

.layout-catalogs.mro ul li p {
    float: right;
    margin-right: 2px
}

.layout-catalogs.mro ul li .pic {
    float: left;
    display: inline-block;
    margin: 0 10px 0 16px;
    padding-top: 9px;
    width: 22px;
    height: 16px;
    vertical-align: middle;
    text-indent: 30px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/catagory_icon3.3b7bf5e2.png) no-repeat
}

.layout-catalogs.mro ul li .ass-pic-470 {
    background-position: 2px -36px
}

.layout-catalogs.mro ul li .ass-pic-423 {
    background-position: 2px -98px;
    margin-top: 6px
}

.layout-catalogs.mro ul li .ass-pic-575 {
    background-position: 2px -126px;
    margin-top: 6px
}

.layout-catalogs.mro ul li .ass-pic-380 {
    background-position: 7px -94px
}

.layout-catalogs.mro ul li .ass-pic-515,.layout-catalogs.mro ul li .ass-pic-10991 {
    background-position: 2px -177px
}

.layout-catalogs.mro ul li .ass-pic-365 {
    background-position: 2px -210px;
    margin-top: 6px
}

.layout-catalogs.mro ul li .ass-pic-500 {
    background-position: 2px -230px
}

.layout-catalogs.mro ul li .ass-pic-319 {
    margin-top: 6px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/ljq.50213c7e.svg) 50% no-repeat
}

.layout-catalogs.mro ul li .ass-pic-320 {
    background-position: 4px -63px
}

.layout-catalogs.mro ul li .ass-pic-308 {
    background-position: 5px -178px
}

.layout-catalogs.mro ul li .ass-pic-312 {
    background-position: 0 -18px;
    margin-top: 6px
}

.layout-catalogs.mro ul li .ass-pic-348,.layout-catalogs.mro ul li .ass-pic-450,.layout-catalogs.mro ul li .ass-pic-582 {
    background-position: 2px -148px
}

.layout-catalogs.mro ul li .ass-pic-316 {
    background-position: 2px -259px
}

.layout-catalogs.mro ul li .ass-pic-513 {
    background-position: 2px -290px;
    margin-top: 6px
}

.layout-catalogs.mro ul li .ass-pic-601 {
    background-position: 2px -319px;
    margin-top: 6px
}

.layout-catalogs.mro ul li .ass-pic-570 {
    background-position: 2px -347px;
    margin-top: 6px
}

.layout-catalogs.mro ul li .ass-pic-385 {
    background-position: 2px -375px;
    margin-top: 6px
}

.layout-catalogs.mro ul li .ass-pic-938 {
    background-position: 2px -402px;
    margin-top: 6px
}

.layout-catalogs.mro ul li .ass-pic-320 {
    background-position: 2px -66px
}

.layout-catalogs.mro ul li .ass-pic-953 {
    background-position: 2px -426px;
    margin-top: 6px
}

.layout-catalogs.mro ul li .ass-pic-11279,.layout-catalogs.mro ul li .ass-pic-11337 {
    margin-top: 4px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAZCAYAAAA14t7uAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAFqADAAQAAAABAAAAGQAAAACecaSLAAACFUlEQVRIDe2TO0gcURSGd1WINopgxIjLNoIBEZZEogk2FrayZCGFSIxFECI2VqYI9oIhYBdBQsiKWNkI2iuSQtAqFiYGX8hqDAgiW6zj9w/3yL6G+AKb/PBxzj1z7j8z9xEK3ac8zyuBijv9BgzjcAxp+AJ38wKM/kAnVMEUrMKjW309BmVwChEzIh+BHYhZ7UYRg1E4gXYzIE/AIXRb7dqRyR/B1GcGFFphF4atduXIpDcg9cB3P/O8cTNgHIE1GLXaPyPNXSC9t2bySb/ieUtZNZlrH8qsFhhpijmDz/lN1Afdsy2iTopOzFF+X8GYpihIixDObmCsi2KaJdHZ1hmPZ/cpz59YTS0FP6EFXkEjZBzaqBpoCIfDexjqsqTJz4k5KrERTQ/I1yENz+AtfAP1lEMlTMMOvIQQhmfFTPXMF6b6xWWQ6qESMvDEeixSawad4SqrBUaakiA1q4k4DpMuHyLfdwy5mk7HmPJA0aBNkp6ridgER/AQOmATGh3KVasDbVo0yFjr9wN+sVYrrilBTDI+JLbBHPmmUK4a+QHxK/RCcfHWT6BT4EtfAX/hBQR9sf5Gf9Vk8woiDyfANybWgt24BTUzDlrjy6tdYOombjO5mFIUdZZzRO0p6MTo+AVK9/sxnEI/rMIGeDAA8xjMEHUB7JJ8IH/HOp8QA5Vz8/K7MH1NLQIyLXX8xlQb919XW4ELotkvQujuvvUAAAAASUVORK5CYII=) 50% no-repeat
}

.layout-catalogs.mro ul li:hover {
    background: #e6f6ff;
    cursor: pointer
}

.layout-catalogs.mro ul li:hover.all>img {
    display: inline-block
}

.layout-catalogs.mro ul li:hover .s-submnu {
    display: block
}

.layout-catalogs.mro ul li:hover a {
    color: #199de9
}

.layout-catalogs.mro ul li:hover>a {
    float: none;
    z-index: 100
}

.layout-catalogs.mro ul li:hover .ass-pic-470 {
    background-position: -26px -36px
}

.layout-catalogs.mro ul li:hover .ass-pic-423 {
    margin-top: 6px;
    background-position: -26px -98px
}

.layout-catalogs.mro ul li:hover .ass-pic-575 {
    margin-top: 6px;
    background-position: -26px -126px
}

.layout-catalogs.mro ul li:hover .ass-pic-380 {
    background-position: -26px -94px
}

.layout-catalogs.mro ul li:hover .ass-pic-515,.layout-catalogs.mro ul li:hover .ass-pic-10991 {
    background-position: -26px -177px
}

.layout-catalogs.mro ul li:hover .ass-pic-365 {
    margin-top: 6px;
    background-position: -26px -210px
}

.layout-catalogs.mro ul li:hover .ass-pic-500 {
    background-position: -26px -230px
}

.layout-catalogs.mro ul li:hover .ass-pic-319 {
    margin-top: 6px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/h_ljq.27a3718f.svg) 50% no-repeat
}

.layout-catalogs.mro ul li:hover .ass-pic-320 {
    background-position: -26px -66px
}

.layout-catalogs.mro ul li:hover .ass-pic-308 {
    background-position: -26px -178px
}

.layout-catalogs.mro ul li:hover .ass-pic-312 {
    background-position: -30px -17px
}

.layout-catalogs.mro ul li:hover .ass-pic-348,.layout-catalogs.mro ul li:hover .ass-pic-450,.layout-catalogs.mro ul li:hover .ass-pic-582 {
    background-position: -26px -148px
}

.layout-catalogs.mro ul li:hover .ass-pic-316 {
    background-position: -26px -259px
}

.layout-catalogs.mro ul li:hover .ass-pic-513 {
    margin-top: 6px;
    background-position: -26px -290px
}

.layout-catalogs.mro ul li:hover .ass-pic-601 {
    background-position: -26px -319px;
    margin-top: 6px
}

.layout-catalogs.mro ul li:hover .ass-pic-570 {
    background-position: -26px -347px;
    margin-top: 6px
}

.layout-catalogs.mro ul li:hover .ass-pic-385 {
    margin-top: 6px;
    background-position: -26px -375px
}

.layout-catalogs.mro ul li:hover .ass-pic-938 {
    margin-top: 6px;
    background-position: -26px -402px
}

.layout-catalogs.mro ul li:hover .ass-pic-953 {
    margin-top: 6px;
    background-position: -26px -426px
}

.layout-catalogs.mro ul li:hover .ass-pic-11279,.layout-catalogs.mro ul li:hover .ass-pic-11337 {
    margin-top: 4px;
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/hardware.2c7bd4c9.png) 50% no-repeat
}

.layout-catalogs.mro ul li .s-submnu {
    display: none;
    position: absolute;
    z-index: 98;
    left: 228.8px;
    top: 0;
    padding: 0 20px 0 24px;
    box-sizing: border-box;
    width: 810px;
    min-height: 555px;
    background: #fff;
    box-shadow: 0 2px 16px 0 rgba(1,66,104,.2)
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content {
    height: auto
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title {
    line-height: 44px;
    border-bottom: 1px solid #e3e3e3;
    font-weight: 700;
    color: #0895e7;
    position: relative
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn {
    float: right;
    width: 102px;
    color: #ff7300;
    height: 26px;
    line-height: 26px;
    margin-top: 12px
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn img {
    width: 100%;
    height: 100%
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn:hover+.connector-pic-btn-active {
    display: block
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn-active {
    position: absolute;
    right: 0;
    top: 0;
    display: none;
    width: 102px;
    color: #ff7300;
    height: 26px;
    line-height: 26px;
    margin-top: 12px
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn-active img {
    width: 100%;
    height: 100%
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title .connector-pic-btn-active:hover {
    display: block
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title .two-catalog {
    float: none;
    display: inline;
    font-size: 14px;
    font-weight: 700;
    color: #333
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title .two-catalog:hover {
    color: #0895e7
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title .two-catalog:hover~span {
    background: url(https://web.archive.org/web/20230404103800im_/https://static.szlcsc.com/ecp/public/img/catelog-more-hover.a19dacd9.svg) no-repeat 100%
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-title span {
    display: inline-block;
    width: 6px;
    height: 10px;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNLjY0Ni42NDZBLjUuNSAwIDAxMS4yODQuNTlsLjA3LjA1NyA0IDRhLjUuNSAwIDAxLjA1Ny42MzhsLS4wNTcuMDctNCA0YS41LjUgMCAwMS0uNzY1LS42MzhsLjA1Ny0uMDdMNC4yOTMgNSAuNjQ2IDEuMzU0QS41LjUgMCAwMS41OS43MTZsLjA1Ny0uMDd6IiBmaWxsPSIjOTk5IiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48L3N2Zz4=) no-repeat
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-item {
    display: inline-block;
    float: left;
    margin-top: 14px;
    line-height: 12px;
    color: #494949;
    width: 160px;
    text-align: left
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-item.noMarginR {
    margin-right: 0
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-item a {
    font-weight: 400;
    color: #333;
    display: inline-block;
    border: none;
    width: 150px;
    text-align: left
}

.layout-catalogs.mro ul li .s-submnu .s-submun-content .s-submun-content-item a:hover {
    color: #199de9
}

.layout-catalogs.mro .catalog-img {
    margin-top: 15px;
    width: 240px;
    height: 98px
}

.layout-foot.mro .give-up-ie8-tips-div {
    display: none;
    height: 66px;
    width: 100%;
    background: #ff9c6e;
    color: #fff;
    font-size: 14px
}

.layout-foot.mro .give-up-ie8-tips-div .give-up-ie8-tips-div-con {
    margin: 0 auto;
    padding-top: 12px;
    width: 1200px
}

.layout-foot.mro .give-up-ie8-tips-div a,.layout-foot.mro .give-up-ie8-tips-div a:hover {
    font-size: 14px;
    color: #fff;
    text-decoration: underline
}

.layout-foot.mro .spot {
    margin-top: 48px;
    background: #e3e3e3;
    border-bottom: 1px solid #d5d5d5
}

.layout-foot.mro .spot ul {
    margin: 0 auto;
    height: 126px;
    background: #e3e3e3;
    width: 1198px;
    border-bottom: 1px solid #e3e3e3;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: justify;
    -webkit-justify-content: space-between;
    justify-content: space-between;
    padding: 0 53px 0 50px;
    box-sizing: border-box
}

.layout-foot.mro .spot ul li {
    text-align: center
}

.layout-foot.mro .spot ul li.sp02 {
    margin-right: 10px
}

.layout-foot.mro .spot ul li>div {
    text-align: left;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: start;
    -webkit-align-items: flex-start;
    align-items: flex-start
}

.layout-foot.mro .spot ul li>div>img {
    width: 50px;
    height: 50px
}

.layout-foot.mro .spot ul li>div>div {
    margin-left: 9px
}

.layout-foot.mro .spot ul li>div h4 {
    font-size: 18px;
    margin-bottom: 6px;
    font-weight: 400;
    color: #333
}

.layout-foot.mro .spot ul li>div p {
    font-size: 12px;
    color: #666;
    margin-bottom: 1px;
    word-break: keep-all
}

.layout-foot.mro .footer {
    margin: 0;
    height: 233px;
    width: 100%;
    border-bottom: 1px solid #e3e3e3;
    background: #e3e3e3
}

.layout-foot.mro .footer .foot {
    width: 1200px;
    margin: 0 auto;
    height: 100%;
    background: #e3e3e3;
    -webkit-box-align: start;
    -webkit-align-items: flex-start;
    align-items: flex-start
}

.layout-foot.mro .footer .foot,.layout-foot.mro .footer .foot .footer-left {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.layout-foot.mro .footer .foot .footer-left dl {
    box-sizing: border-box;
    margin-top: 28px;
    margin-right: 60px;
    margin-bottom: 28px;
    text-align: left
}

.layout-foot.mro .footer .foot .footer-left dl:nth-last-of-type(2),.layout-foot.mro .footer .foot .footer-left dl:nth-last-of-type(3) {
    margin-right: 77px
}

.layout-foot.mro .footer .foot .footer-left dl:last-of-type {
    padding-right: 65px;
    margin-right: 61px;
    border-right: 1px solid #d5d5d5
}

.layout-foot.mro .footer .foot .footer-left dt {
    font-size: 14px;
    color: #333;
    font-weight: 700;
    margin-bottom: 24px
}

.layout-foot.mro .footer .foot .footer-left dd {
    margin-left: 0;
    margin-bottom: 13px;
    color: #666
}

.layout-foot.mro .footer .foot .footer-left dd>a {
    color: #666
}

.layout-foot.mro .footer .foot .footer-left dd:last-of-type {
    margin-bottom: 0
}

.layout-foot.mro .footer .foot .footer-left dd:hover a {
    color: #0193e6
}

.layout-foot.mro .footer .foot .footer-left dd a {
    font-size: 12px
}

.layout-foot.mro .footer .foot .footer-right {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.layout-foot.mro .footer .foot .footer-right dl {
    box-sizing: border-box;
    margin-top: 28px;
    margin-right: 60px;
    text-align: left
}

.layout-foot.mro .footer .foot .footer-right dl:first-of-type {
    margin-right: 42px
}

.layout-foot.mro .footer .foot .footer-right dl:last-of-type {
    margin-right: 0
}

.layout-foot.mro .footer .foot .footer-right dt {
    font-size: 14px;
    color: #333;
    font-weight: 700;
    margin-bottom: 24px
}

.layout-foot.mro .footer .foot .footer-right dd {
    margin-left: 0;
    margin-bottom: 13px;
    color: #666
}

.layout-foot.mro .footer .foot .footer-right dd:last-of-type {
    margin-bottom: 0
}

.layout-foot.mro .footer .foot .footer-right dd.service-time {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}

.layout-foot.mro .footer .foot .footer-right dd a {
    font-size: 12px
}

.layout-foot.mro .member {
    margin: 0 auto 10px;
    padding: 24px 0 14px;
    width: 1200px
}

.layout-foot.mro .member table {
    margin-bottom: 10px
}

.layout-foot.mro .member table td {
    line-height: 24px
}

.layout-foot.mro .member table td.link-member {
    width: 98px;
    font-size: 12px;
    color: #444
}

.layout-foot.mro .member table td.link-txt a {
    float: left;
    margin-right: 23px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    color: #666
}

.layout-foot.mro .member table td.link-txt a:hover {
    color: #0093e6
}

.layout-foot.mro .member table td.not-index a {
    margin-right: 23px
}

.layout-foot.mro .link-wrap {
    background: #e3e3e3;
    width: 100%;
    border-top: 1px solid #d5d5d5;
    padding: 28px 0 39px;
    box-sizing: border-box
}

.layout-foot.mro .link-wrap .link {
    width: 1200px;
    margin: 0 auto
}

.layout-foot.mro .link-wrap .link .link-site {
    display: none;
    padding-bottom: 18px
}

.layout-foot.mro .link-wrap .link .member-site {
    padding-bottom: 19px
}

.layout-foot.mro .link-wrap .link td {
    line-height: 24px
}

.layout-foot.mro .link-wrap .link ul li {
    line-height: 28px;
    font-size: 16px;
    float: left;
    font-weight: 700;
    margin-right: 32px;
    margin-bottom: 18px;
    width: 66px;
    cursor: pointer;
    color: #444
}

.layout-foot.mro .link-wrap .link ul li.active {
    border-bottom: 2px solid #0193e6;
    color: #0193e6
}

.layout-foot.mro .link-wrap .link .link-bt {
    width: 6%;
    float: left;
    white-space: nowrap
}

.layout-foot.mro .link-wrap .link .link-txt a {
    color: #666;
    margin-right: 23px;
    float: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden
}

.layout-foot.mro .link-wrap .link .link-txt a:hover {
    color: #0093e6
}

.layout-foot.mro .link-wrap .link .link-red a {
    color: red
}

.layout-foot.mro .link-wrap .link .link-txt-new a {
    width: 100%
}

.layout-foot.mro .link-wrap .letter-index {
    width: 1200px;
    margin: 0 auto
}

.layout-foot.mro .link-wrap .letter-index ul {
    overflow: hidden
}

.layout-foot.mro .link-wrap .letter-index ul li {
    float: left;
    text-align: center;
    cursor: pointer;
    margin-right: 15px
}

.layout-foot.mro .link-wrap .letter-index ul li:first-of-type {
    margin-right: 0
}

.layout-foot.mro .link-wrap .letter-index ul li a {
    color: #666
}

.layout-foot.mro .link-wrap .letter-index ul li a:hover {
    color: #0093e6
}

.layout-foot.mro .link-wrap .letter-index ul li:first-child {
    color: #666;
    cursor: default
}

.layout-foot.mro .entry-type-wrapper {
    background: #c7c7c7;
    width: 100%
}

.layout-foot.mro .entry-type-wrapper .entry-type {
    text-align: center;
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    width: 1200px;
    height: 40px;
    margin: 0 auto
}

.layout-foot.mro .entry-type-wrapper .entry-type .icp {
    margin-left: 19px
}

.layout-foot.mro .entry-type-wrapper .entry-type .icp .icp-1 {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center
}

.layout-foot.mro .entry-type-wrapper .entry-type .icp .icp-1 .icon1,.layout-foot.mro .entry-type-wrapper .entry-type .icp .icp-1 .icon2 {
    margin-right: 6px
}

.layout-foot.mro .entry-type-wrapper .entry-type .icp .icp-1 a {
    display: inline-block;
    text-decoration: none;
    color: #444
}

.layout-foot.mro .entry-type-wrapper .entry-type .icp .icp-1 .icp-2 {
    margin-left: 9px;
    margin-right: 26px
}

.layout-foot.theme-black.mro .spot {
    background: #373f5e!important;
    border-color: #4c5473!important
}

.layout-foot.theme-black.mro .spot ul {
    background: #373f5e!important;
    border-bottom: none!important
}

.layout-foot.theme-black.mro .spot ul h4 {
    color: #fff!important
}

.layout-foot.theme-black.mro .spot ul p {
    color: #abb2ca!important
}

.layout-foot.theme-black.mro .footer {
    background: #373f5e!important;
    border-color: #4c5473!important
}

.layout-foot.theme-black.mro .footer .foot {
    background: #373f5e!important;
    border-bottom: none!important
}

.layout-foot.theme-black.mro .footer .foot .footer-left dl:last-of-type {
    border-color: #4c5473!important
}

.layout-foot.theme-black.mro .footer .foot dd,.layout-foot.theme-black.mro .footer .foot dd a,.layout-foot.theme-black.mro .footer .foot dd span,.layout-foot.theme-black.mro .footer .foot dt,.layout-foot.theme-black.mro .footer .foot dt a,.layout-foot.theme-black.mro .footer .foot dt span {
    color: #abb2ca!important
}

.layout-foot.theme-black.mro .footer .foot dd a:hover,.layout-foot.theme-black.mro .footer .foot dt a:hover {
    color: #fff!important
}

.layout-foot.theme-black.mro .link-wrap {
    background: #373f5e!important;
    border-top: none!important
}

.layout-foot.theme-black.mro .link-wrap .link li {
    color: #abb2ca!important
}

.layout-foot.theme-black.mro .link-wrap .link li.active {
    color: #fff!important
}

.layout-foot.theme-black.mro .link-wrap .link .link-txt a {
    color: #abb2ca!important
}

.layout-foot.theme-black.mro .link-wrap .link .link-txt a:hover {
    color: #fff!important
}

.layout-foot.theme-black.mro .entry-type-wrapper {
    background: #747c97!important
}

.layout-foot.theme-black.mro .entry-type-wrapper a {
    color: #373f5e!important
}
   
   
   .line-box-right-bottom {
        justify-content: space-between;
   }
   .two {
   width: 500px !important;
   }
   
   .two-01 {
    display: flex;
    justify-content: space-between;
}

                .floating-button {
                  position: fixed;
                  right: 30px;
                  bottom: 30px;
                  z-index: 9999;
            
                  width: 80px;
                  height: 40px;
                  background-color: #409EFF; /* Element UI 主色 */
                  color: white;
                  font-size: 16px;
                  font-weight: bold;
                  text-align: center;
                  line-height: 40px;
                  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
                  transition: all 0.3s ease;
                  cursor: pointer;
                  border: none;
                  outline: none;
                  user-select: none;
                }
            
                .floating-button:hover {
                  background-color: #337ecc; /* 深蓝 */
                  box-shadow: 0 12px 16px rgba(0, 0, 0, 0.15);
                }
            
                .floating-button:active {
                  transform: scale(0.95); /* 点击反馈 */
                }

               
                .floating-card {
                    display: none; 
                   position: fixed;
                    right: 30px;
                    bottom: 80px;
                    width: min-content; 
                    min-height: 30vh; 
                    max-height: 75vh; 
                    overflow: auto; 
                    border: 2px solid #199fe9; 
                    z-index: 10000000;
                    padding: 5px; 
                    background: white;
                }
                /* Tab 容器，占满卡片顶部宽度 */
                .tab-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0;
                    border-bottom: 1px solid #ebeef5;
                    background-color: #f0f2f5;
                }

                /* Tab 按钮 */
                .tab-button {
                    width: 45%;
                flex: 1; /* 平均分配宽度 */
                margin: 0; /* 移除额外间距 */
                padding: 8px 12px;
                border: 2px solid #409EFF;
                background-color: white;
                color: #333;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: center;
                box-sizing: border-box;
                }

                /* 圆角处理：第一项左圆角，最后一项右圆角 */
                .tab-button:first-child {
                border-top-left-radius: 10px;
                border-bottom-left-radius: 10px;
                }
                .tab-group:nth-child(2) .tab-button:nth-child(2) {
                border-left: unset;
                border-right: unset;
                }
                .tab-button:last-child {
                border-top-right-radius: 10px;
                border-bottom-right-radius: 10px;
                }

                /* 按钮悬停 */
                .tab-button:hover {
                background-color: #ecf5ff;
                }

                .tab-group {
                    width: 45%;
                    display: flex;
                    height: 50px;
                    justify-content: space-between;
                }

                /* 按钮选中样式 */
                .tab-button.active {
                background-color: #409EFF;
                color: white;
                font-weight: bold;
                }
                .card-body {
                    overflow-y: scroll;
                    height: 65vh;
                }
              </style>`);
                $('body').prepend(`<button id="searchListButton" class="floating-button">凑</button>
                    <!-- 卡片容器 -->
                    <div id="cardContainer" class="floating-card">
                        <!-- 卡片头部，包含 Tab 切换 -->
                        <div class="card-header">
                            <div class="tab-container">
                                <div class="tab-group">
                                <button class="tab-button" data-group="region" data-value="广东">广东</button>
                                <button class="tab-button active" data-group="region" data-value="江苏">江苏</button>
                                </div>
                                <div class="tab-group">
                                <button class="tab-button" data-group="userType" data-value="all">全部</button>
                                <button class="tab-button" data-group="userType" data-value="true">新人</button>
                                <button class="tab-button active" data-group="userType" data-value="false">非新人</button>
                                </div>
                            </div>
                        </div>
                        <div class="card-body" id="listContainer">
                        <!-- 列表项将动态插入到这里 -->
                        </div>
                    </div>
                    `);

                // 使用 jQuery 为按钮绑定点击事件
                $('#searchListButton').on('click', () => {
                    if ($('#cardContainer').toggle() && !cardContainer.classList.contains('hidden') && listContainer.children.length === 0) {
                          this.renderListItems();
                    }
                });

                // 点击 Tab 按钮
                $('.tab-button').on('click', function () {
                    const $button = $(this);
                    const group = $button.data('group'); // 获取 data-group 属性
                    const value = $button.data('value'); // 获取 data-value 属性

                    // 移除同组所有按钮的 active 类
                    $('.tab-button').filter(function () {
                        return $(this).data('group') === group;
                    }).removeClass('active');

                    // 为当前按钮添加 active 类
                    $button.addClass('active');

                    // 更新选中状态
                    SearchListHelper.defaultTabs[group] = value;
                    console.log('当前选中:', SearchListHelper.defaultTabs);

                    SearchListHelper.renderMinPriceSearch();
                });

                this.btnStatus = true;
            }
        }

        /**
         * 搜索主页的凑单逻辑
         */
        async renderMainPageMinPriceSearch() {
            // 避免重复执行
            if (this.globalSearchEnd) return;

            const searchInput = $('#search-input');
            const searchValue = searchInput.val();

            // 输入为空时清空缓存并返回
            if (!searchValue?.trim()) {
                searchTempList = [];
                return;
            }

            this.globalSearchEnd = true;

            try {
                // 获取总页数
                const totalPage = searchTotalPage();

                // 收集表单数据
                const formData = Array.from($('form#allProjectFrom > input[type="hidden"]'))
                    .filter(item => !$(item).attr('id')?.includes('SloganVal') &&
                        !$(item).attr('id')?.includes('LinkUrlVal'))
                    .reduce((acc, item) => {
                        const name = $(item).attr('name');
                        acc[name] = $(item).val();
                        return acc;
                    }, {});

                // 创建并发请求队列（限制并发数为3）
                const requestQueue = [];
                for (let pn = 1; pn <= totalPage && pn <= 30; pn++) {
                    const data = {
                        ...formData,
                        pageNumber: pn,
                        k: searchValue,
                        sk: searchValue,
                        localQueryKeyword: ''
                    };

                    requestQueue.push(
                        $.ajax({
                            url: "https://so.szlcsc.com/search",
                            method: "POST",
                            data: data,
                            timeout: 10000 // 添加超时限制
                        })
                    );
                }

                // 显示加载进度
                const progressContainer = $('.wait-h2');
                progressContainer.html(`数据加载中...</br>(共${Math.min(totalPage, 30)}页，正在加载第1页...`);

                // 并发执行请求并跟踪进度
                const results = await allWithProgress(requestQueue, ({total, cur}) => {
                    progressContainer.html(`数据加载中...</br>(共${total}页，正在加载第${cur}页... ${Math.round((cur / total) * 100)}%)`);
                });

                // 处理响应数据（过滤无效响应）
                const validResults = results.filter(
                    res => res?.code === 200 && res.result?.productRecordList?.length > 0
                );

                // 合并搜索结果（使用Set去重）
                searchTempList = [...new Set([
                    ...searchTempList,
                    ...validResults.flatMap(res => res.result.productRecordList)
                ])];

                // 渲染结果
                renderMinPriceSearch();

                // 延迟触发筛选事件（使用MutationObserver替代setTimeout）
                const observer = new MutationObserver(() => {
                    $('#js-filter-btn').trigger('click');
                    observer.disconnect();
                });

                observer.observe(document.body, {childList: true, subtree: true});

                console.timeEnd('搜索首页凑单渲染速度');

            } catch (error) {
                console.error('搜索请求失败:', error);
                $('.wait-h2').html('搜索加载失败，请重试');
                this.globalSearchEnd = false;
            }
        }

        /**
         * 搜索页-查找最低价 列表渲染方法
         */
        static renderMinPriceSearch() {
            // 如果广东仓和江苏仓同时没有货的话，那么就属于订货商品，不需要显示
            // 如果没有价格区间，证明是停售商品
            var newList = SearchListHelper.listData.filter(item => !(parseInt(item.jsWarehouseStockNumber || 0) <= 0 && parseInt(item.gdWarehouseStockNumber || 0) <= 0) && item.productPriceList.length > 0);
            // 去重
            const map = new Map();
            newList.forEach(item => {
                map.set(item.productId, item);
            });
            newList = [...map.values()];
            // 列表自动正序，方便凑单
            newList.sort((o1, o2) => {
                return (o1.theRatio * o1.productPriceList[0].productPrice * (o1.listProductDiscount || 10) / 10).toFixed(6) - (o2.theRatio * o2.productPriceList[0].productPrice * (o2.listProductDiscount || 10) / 10).toFixed(6);
            });

            // 指定仓库
            const { region, userType } = SearchListHelper.defaultTabs;
            newList.forEach(e => {
                if (userType === 'all' && region === '江苏') {
                    e.show = (e.jsWarehouseStockNumber > 0);
                    return
                }
                else if (userType === 'all' && region === '广东') {
                    e.show = (e.gdWarehouseStockNumber > 0);
                    return
                }

                if (region === '江苏') {
                    e.show = (e.jsWarehouseStockNumber > 0) && e.isNew == userType;
                    return
                }
                else if (region == '广东') {
                    e.show = (e.gdWarehouseStockNumber > 0) && e.isNew == userType;
                    return
                }
            })

            // 取指定条数的数据。默认50个
            const html = newList.slice(0, (SearchListHelper.searchPageRealSize || 50)).map(item => {
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
                    batchStockLimit,
                    isNew,
                    show,
                } = item;

                return `<table class="inside inside-page tab-data no-one-hk list-items" style="${show ? 'display: block;': 'display: none;'}"
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
                                     <button type="button" style="
                                                margin-top: 10px;
                                                width: 130px;
                                                height: 33px;
                                                border: none;
                                                border-radius: 2px;
                                                background: #ff7800;
                                                color: #fff;
                                                " class="pan-list-btn addCartBtn "
                                                    kind="cart" local-show="yes"
                                                    hk-usd-show="no" id="addcart-so" productcode="${lightProductCode}"
                                                    data-curpage="1"
                                                    data-mainproductindex="0" param-product-id="${productId}"
                                                    data-agl-cvt="15"
                                                    data-trackzone="s_s__&quot;123&quot;">加入购物车</button>
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
                                                <div class="stocks">
                                                    <span>近期成交${recentlySalesCount}单</span>
                                                </div>
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

            $('#listContainer').html(html);
        }

        /**
         * 获取品牌商品列表
         * @param brandsNameOrSearchText 品牌名称或者搜索框内容
         * @param brandsId 品牌id，可为空，不为空时提高搜索准确率
         * @param maxCount 最大商品数量，为空时返回所有商品
         * @param stock 仓库，js/gd
         * @returns {Promise<unknown>}
         */
        static getBrandsProducts(brandsNameOrSearchText, brandsId = null, maxCount = null, stock = 'js') {
            return new Promise((resolve, reject) => {
                const url = 'https://so.szlcsc.com/search';
                let products = [];
                let counts = 0;
                const getData = (page) => {
                    let data = {
                        os: '',
                        dp: '',
                        sb: 1, // 价格从低排序
                        queryPlaceProduction: '',
                        pn: page,
                        c: '',
                        k: brandsNameOrSearchText,
                        tc: 0,
                        pds: 0,
                        pa: 0,
                        pt: 0,
                        gp: 0,
                        queryProductDiscount: '',
                        st: '',
                        sk: brandsNameOrSearchText,
                        searchSource: '',
                        bp: '',
                        ep: '',
                        bpTemp: '',
                        epTemp: '',
                        stock: stock,
                        needChooseCusType: '',
                        'link-phone': '',
                        companyName: '',
                        taxpayerIdNum: '',
                        realityName: '',
                    }

                    if (brandsId) data.queryProductGradePlateId = brandsId
                    Util.postFormAjax(url, data).then(res => {
                        if (!res) return reject('获取品牌商品列表失败')
                        res = typeof res === 'object' ? res : JSON.parse(res)
                        if (!res.code || res.code !== 200) return reject(res.msg || '获取品牌商品列表失败')
                        if (!res.result || !res.result.productRecordList || res.result.productRecordList.length === 0) return resolve(products)
                        products = products.concat(res.result.productRecordList)
                        counts += res.result.productRecordList.length
                        if (maxCount && counts >= maxCount) return resolve(products)
                        getData(page + 1)
                    }).catch(err => {
                        reject(err)
                    })
                }
                getData(1);
            })
        }
    }

    // 分类品牌颜色定时器开启状态，默认false
    let catalogBrandColorTaskIsStartStatus = false;

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
        if (!catalogBrandColorTaskIsStartStatus) {
            setInterval(SearchPageHelper.catalogBrandColor, 1000);
            catalogBrandColorTaskIsStartStatus = true;
        }

        const searchListHelper = new SearchListHelper();
        searchListHelper.render();
    }

    // 搜索页判断
    let isSearchPage = () => location.href.includes('so.szlcsc.com/global.html') ||
        location.href.includes('list.szlcsc.com/brand') ||
        location.href.includes('list.szlcsc.com/catalog');

    setInterval(function () {
        if (isSearchPage()) {
            searchStart();
        }
    }, 1500)

})()
