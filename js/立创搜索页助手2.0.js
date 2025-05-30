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
