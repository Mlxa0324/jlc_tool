// ==UserScript==
// @name         嘉立创开源广场辅助工具
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  嘉立创开源广场BOM列表一键搜索淘宝，一键搜索优信，支持配置自定义店铺
// @author       Lx
// @match        https://oshwhub.com/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=szlcsc.com
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.min.js
// @grant        GM_openInTab
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/492654/%E5%98%89%E7%AB%8B%E5%88%9B%E5%BC%80%E6%BA%90%E5%B9%BF%E5%9C%BA%E8%BE%85%E5%8A%A9%E5%B7%A5%E5%85%B7.user.js
// @updateURL https://update.greasyfork.org/scripts/492654/%E5%98%89%E7%AB%8B%E5%88%9B%E5%BC%80%E6%BA%90%E5%B9%BF%E5%9C%BA%E8%BE%85%E5%8A%A9%E5%B7%A5%E5%85%B7.meta.js
// ==/UserScript==

(async function () {
    'use strict';

    /**
     * 用户自定义配置项
     * @returns
     */
    const getConfig = () => {
        return {
            // 指定表头中哪个字段可以跳转淘宝
            columnNameList: [
                'Device',
                'Name',
            ],
            // 封装列
            columnNameList2: [
                'Footprint',
            ],
            // 具体的值
            columnNameList3: [
                'Value',
            ],
            // 指定店铺简称（支持配置其他店铺）
            //  例如：
            //  storeNameList: [
            //     '优信',
            //     'xxxx', 新增加一行这个，把店铺名简称填在这里。末尾的逗号不能省略
            // ]
            storeNameList: [
                '优信',
            ]
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
     * 获取索引
     */
    const getColumnIndex = (columnNames, i = 0, columnIndex = -1) => {
        const $eles = $(`div.table-box .table tr:contains("${columnNames[i]}") th`);
        if ($eles.length === 0) {
            return getColumnIndex(columnNames, ++i);
        }
        [...$eles].some(a => {
            columnIndex++
            return $(a).text() === `${columnNames[i]}`
        });
        if (columnIndex > -1) {
            return columnIndex
        }
    }

    const start = () => {
        // 查询用于跳转淘宝的列索引
        const searchTbIndex = getColumnIndex(getConfig().columnNameList)
        const footprintIndex = getColumnIndex(getConfig().columnNameList2)
        const valueIndex = getColumnIndex(getConfig().columnNameList3)

        // 没找到的话，等待查找索引成功
        if (searchTbIndex === -1) {
            return;
        }

        $(`div.table-box .table tr`).find(`th:eq(${searchTbIndex})`).append(`
            <p class="oneKey-search-tb" style='padding: 0px 8px; background-color: deepskyblue;cursor: pointer;border-radius: 4px; margin-left: 20px;'>
            淘宝一键搜索BOM
            </br>一次性会打开很多页面，慎用！
            </br>同时会被淘宝限流
            </p>
        `)

        const $tdEles = $(`div.table-box .table tr`).find(`td:eq(${searchTbIndex})`).css({
            "display": "flex",
            "justify-content": "space-between"
        })

        // 页面渲染按钮组
        $tdEles.each(function () {
            const t = $(this).text().trim()
            const footprintText = $(this).parents('tr').find(`td:eq(${footprintIndex})`).text().trim()
            const valueText = $(this).parents('tr').find(`td:eq(${valueIndex})`).text().trim()

            const forHtml = getConfig().storeNameList.map(storeName => {
                return `<p class="search-tb-${storeName}" data-query="https://s.taobao.com/search?q=${storeName}/${t}/${footprintText}/${valueText}"
                style='padding: 0px 8px; background-color: sandybrown;cursor: pointer;border-radius: 4px; margin-left: 10px;'>
                搜${storeName}
                </p>`
            }).join('')

            $(this).append(`
            <div style="display: inline-flex;">
                <p class="search-tb" data-query="https://s.taobao.com/search?q=${t}/${footprintText}/${valueText}"
                style='padding: 0px 8px; background-color: deepskyblue;cursor: pointer;border-radius: 4px; margin-left: 10px;'>
                搜淘宝
                </p>
                ${forHtml}
            <div>
            `)
        })

        // 搜索按钮的击事件
        getConfig().storeNameList.forEach(storeName => {
            $(`.search-tb-${storeName},.search-tb`).click(function () {
                GM_openInTab($(this).data('query'), {})
            })
        })

        $(`.oneKey-search-tb`).click(function () {
            $(`.search-tb`).each(function () {
                GM_openInTab($(this).data('query'), {})
            })
        })
    }

    const timerFunc = () => {
        let timer = setInterval(() => {
            const tableNotEmpty = $('div.table-box .table tr th').length > 0
            const notEmpty = $('.search-tb').length > 0

            console.log(`等待BOM列表加载...`);

            if (!notEmpty && tableNotEmpty) {
                start()
            }
        }, 4000);
    }

    timerFunc()
})()
