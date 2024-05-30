// ==UserScript==
// @name         嘉立创开源广场辅助工具
// @namespace    http://tampermonkey.net/
// @version      1.0.10
// @description  嘉立创开源广场BOM列表一键搜索淘宝，一键搜索优信，支持配置自定义店铺
// @author       Lx
// @match        https://oshwhub.com/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=szlcsc.com
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/layui/2.9.9/layui.min.js
// @resource layuiCSS https://cdnjs.cloudflare.com/ajax/libs/layui/2.9.9/css/layui.css
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/492654/%E5%98%89%E7%AB%8B%E5%88%9B%E5%BC%80%E6%BA%90%E5%B9%BF%E5%9C%BA%E8%BE%85%E5%8A%A9%E5%B7%A5%E5%85%B7.user.js
// @updateURL https://update.greasyfork.org/scripts/492654/%E5%98%89%E7%AB%8B%E5%88%9B%E5%BC%80%E6%BA%90%E5%B9%BF%E5%9C%BA%E8%BE%85%E5%8A%A9%E5%B7%A5%E5%85%B7.meta.js
// ==/UserScript==

(async function () {
    'use strict';

    GM_addStyle(GM_getResourceText("layuiCSS"))

    /**
     * 用户自定义配置项
     * @returns
     */
    const getConfig = () => {
        return {
            // table的选择器，方便后期修改
            tableElement: 'div[class*=detail_bom_] table',
            tableTrElement : `div[class*=detail_bom_] table tr`,
            tableThElement : `div[class*=detail_bom_] table tr th`,
            buttonAppendElement : `div[class*=detail_bom-buttons_] button:eq(0)`,
            // ================ 搜索按钮优先级：  =================================================
            // ================  大的优先级 valueList > columnNameList  ============================
            // ================  小的优先级 每个集合中从上到下有优先级  ==============================

            // 支持立创搜索的列
            searchList: [
                'Supplier Part',
                'Manufacturer Part',
                'Manufacturer',
            ],
            // 按钮组要追加所在的列名，从上到下有优先级
            targetAppend: [
                'Device',
                'Name',
            ],
            // 如果valueList--Value没值，会从这几个值里拿，从上到下有优先级
            columnNameList: [
                'Manufacturer Part',
                'Device',
                'Name',
            ],
            // 封装列，从上到下有优先级
            footprintList: [
                'Footprint',
            ],
            // 具体的值，从上到下有优先级
            valueList: [
                'Value',
            ],
            // 淘宝全局搜索，指定店铺简称（支持配置其他店铺）
            //  例如：
            //  storeNameList: [
            //     '优信',
            //     'xxxx', 新增加一行这个，把店铺名简称填在这里。末尾的逗号不能省略
            // ]
            storeNameList: [
                '优信',
            ],
            // 该功能是进入到店铺内进行搜索，需要手动设置店铺url
            // https://shopsearch.taobao.com/search?q=【这里写店铺名称来获取店铺url】

            // 在里面增加一行，格式如下
            // 'xxxx': 'https://xxxxxxx/',   // 这里添加备注
            storeNameDetailList: {
                '优信（主）': 'https://youxin-electronic.taobao.com/',  // 信用值最高
                '优信（备）': 'https://shop35338630.taobao.com/',       // 信用值还行
                '优信-集芯电子': 'https://shop107953716.taobao.com/',   // 深圳市集芯电子 优信分店
            }
        }
    }

    /**
     * 等待
     * @param {*} timeout
     * @returns
     */
    const setAwait = (timeout) => {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, timeout);
        })
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
     * 获取索引
     * 从多个指定的列名中，查找最先出现的索引位置
     */
    const getColumnIndex = (columnNames, i = 0, columnIndex = -1) => {
        if (!columnNames[i]) {
            return undefined
        }
        const $eles = $(`${getConfig().tableTrElement}:contains("${columnNames[i]}") th`);
        if ($eles.length === 0) {
            return getColumnIndex(columnNames, ++i, columnIndex);
        }
        [...$eles].some(a => {
            columnIndex++
            return $(a).text().indexOf(`${columnNames[i]}`) === 0
        });
        if (columnIndex > -1) {
            return columnIndex
        }
    }

    /**
   * 获取索引
   * 从多个指定的列名中，查找最先出现的索引位置
   */
    const getColumnsAllIndex = (columnNames, resArray = [], i = 0, columnIndex = -1,) => {
        if (!columnNames[i]) {
            return [undefined]
        }
        // 找到首行所有的列th标签
        const $eles = $(`${getConfig().tableTrElement}:contains("${columnNames[i]}") th`);
        if ($eles.length === 0) {
            const res = getColumnsAllIndex(columnNames, resArray, ++i, columnIndex);
            if (res) {
                resArray.push(res);
            }
            return res;
        }
        // 查找索引位置
        [...$eles].some(a => {
            columnIndex++
            return $(a).text() === `${columnNames[i]}`
        });

        if (columnIndex > -1) {
            resArray.push(columnIndex);
            return getColumnsAllIndex(columnNames, resArray, ++i, -1);
        }
    }

    const start = () => {
        // 查询用于跳转淘宝的列索引
        const { targetAppend, columnNameList, footprintList, valueList, searchList } = getConfig();

        const targetAppendIndex = getColumnIndex(targetAppend)
        const searchTbIndex = getColumnIndex(columnNameList)
        const footprintIndex = getColumnIndex(footprintList)
        const valueIndex = getColumnIndex(valueList)
        let searchIndexs = []; getColumnsAllIndex(searchList, searchIndexs)

        // 没找到的话，等待查找索引成功
        if (searchTbIndex === -1) {
            return;
        }

        if ($('.oneKey-search-tb').length == 0) {
            // 添加一键搜索BOM的按钮
            $(getConfig().tableTrElement).find(`th:eq(${targetAppendIndex})`).append(`
            <p class="oneKey-search-tb" style='padding: 0px 8px; background-color: #00bfffd1;cursor: pointer;border-radius: 4px; margin-left: 20px;width:min-content;'>
            淘宝一键搜索BOM
            </br>一次性会打开很多页面，慎用！
            </br>同时会被淘宝限流
            </p>
        `);

        $(`.oneKey-search-tb`).click(function () {
            $(`.search-tb`).each(function () {
                GM_openInTab($(this).data('query'), {})

            })
        })
        }
        

        // const $tdEles = $(`div.table-box .table tr`).find(`td:eq(${targetAppendIndex})`).css({
        //     "display": "flex",
        //     "justify-content": "space-between"
        // })

        const $tdEles = $(getConfig().tableTrElement).find(`td:eq(${targetAppendIndex}):not(:has(p[class*=search-tb]))`);

        console.log($tdEles);
        if ($tdEles.length > 0) {
        // 页面渲染按钮组
        // 遍历每一行
        $tdEles.each(function () {
            const $parents = $(this).parents('tr')
            const $targetAppendTarget = $parents.find(`td:eq(${targetAppendIndex})`)
            const searchTargets = searchIndexs.map(searchIndex => $parents.find(`td:eq(${searchIndex})`))

            const keyword = $(this).text().trim()
            const searchTbText = $parents.find(`td:eq(${searchTbIndex})`).text().trim()
            const footprintText = $parents.find(`td:eq(${footprintIndex})`).text().trim()
            const valueText = $parents.find(`td:eq(${valueIndex})`).text().trim()

            // 最后得到的关键字
            let kwd = valueText ? valueText : (searchTbText ? searchTbText : keyword)
            // URL会把这个符号错误转换
            kwd = kwd.replace('Ω', '')

            const forHtml = getConfig().storeNameList.map(storeName => {
                return `<p class="search-tb-" data-query="https://s.taobao.com/search?q=${storeName}/${kwd}/${footprintText}"
                            style='width: fit-content; padding: 0px 8px; background-color: #f4a4608f;cursor: pointer;border-radius: 4px; margin-left: 7px; margin-top: 7px;'>
                                搜${storeName}
                        </p>`
            }).join('')

            // 店铺中精确搜索
            let forDetailHtml = '';
            for (let [prefixName, storeIndexUrl] of new Map(Object.entries(getConfig().storeNameDetailList))) {
                forDetailHtml += `<p class="search-tb-" data-query="${storeIndexUrl}/search.htm?keyword=${kwd}/${footprintText}"
                style='width: fit-content; padding: 0px 8px; background-color: #c0c4cc;cursor: pointer;border-radius: 4px; margin-left: 7px; margin-top: 7px;'  lay-on="searchTb">
                搜${prefixName}
                </p>`
            }

            $targetAppendTarget.css({
                "font-size": "18px",
                "font-weight": "600"
            }).append(`
            <div style="width: 350px;
            display: flex;
            flex-wrap: wrap; ">
                <p class="search-tb" data-query="https://s.taobao.com/search?q=${kwd}/${footprintText}"
                    style='width: fit-content; padding: 0px 8px; background-color: #00bfff7a;cursor: pointer;border-radius: 4px; margin-left: 7px; margin-top: 7px;'>
                    搜淘宝
                </p>
                ${forHtml}
                ${forDetailHtml}
            <div>
            `)

            $targetAppendTarget.find('p').css({
                "font-size": "14px",
                "font-weight": "400"
            });

            searchTargets.map(item => {
                const $this = $(item)
                if ($this.html().trim()) {
                    $this.html(`<a style="display: inline-block; width: fit-content; border: 1px solid #58f;
                                    border-radius: 3px;
                                    padding: 6px 15px;" target="_blank" href='https://so.szlcsc.com/global.html?k=${$this.html()}'>${$this.html()}</a>`)
                }
            })
        });

        // 搜索按钮的击事件
        $(`.search-tb-,.search-tb`).unbind('click').click(function () {
            GM_openInTab($(this).data('query'), { active: true, insert: true, setParent: true })
        })
    }


        if ($('#cjms').length === 0) {
            layui.use(function () {
                var layer = layui.layer;
                var util = layui.util;
                // 批量事件
                util.on('lay-on', {
                    page: function () {
                        $('#P3').css('z-index', 9999)
                        const $html = $(getConfig().tableElement)
                        // 纯净模式
                        layer.open({
                            type: 1,
                            maxmin: true,
                            shade: false,
                            shadeClose: true,
                            closeBtn: 1,
                            title: 'BOM',
                            area: ['98%', '88%'], // 宽高
                            content: $html,
                            end: function () {
                                $('#P3').css('z-index', 11)
                            }
                        });
                    },
                    // 搜索淘宝
                    // searchTb: async function () {
                    //     let html_ = await getAjax(`https://www.baidu.com`)
    
                    //     const $html_ = $(html_).find('.water-container')
                    //     console.log($html_);
                    //     layer.open({
                    //         type: 1,
                    //         maxmin: true,
                    //         shade: [0.1, '#000'],
                    //         shadeClose: true,
                    //         closeBtn: 1,
                    //         title: '淘宝',
                    //         area: ['900px', '600px'],
                    //         content: $html_
                    //     });
                    // }
                });
            });

            // 增加纯净模式
            $(getConfig().buttonAppendElement).before(`
                <button href="javascript:void(0)" class="btn-light ant-btn ant-btn-default" style="
                width: 101px;
                height: 36px;
                background: #fff;
                border: 1px solid #cdf;
                border-radius: 4px;
                color: #3673fe;
                margin-right: 16px;
                " id="cjms" lay-on="page">
                    纯净模式
                </a>
            `)
        }

        if ($('#myCss').length === 0) {
            // $('body').append(`
            // <style id='myCss'>
            //     .table td {
            //         max-width: 500px !important;
            //         overflow: auto;
            //     }

            //     .search-tb-, .search-tb {
            //         margin-top: 5px;
            //     }
            // </style>
            // `)
        }
    }

    const openButtonHandler = () => {
        $('button:contains("展开")').click(function() {
            $('[class*=search-tb-]').remove()
        })
    }

    openButtonHandler()

    const timerFunc = () => {
        let timer = setInterval(() => {
            const tableNotEmpty = $(getConfig().tableThElement).length > 0

            console.log(`等待BOM列表加载...`);

            if (tableNotEmpty) {
                start()
            }
        }, 4000);
    }
    timerFunc()
})()
