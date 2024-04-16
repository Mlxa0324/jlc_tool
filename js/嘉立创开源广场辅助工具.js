// ==UserScript==
// @name         嘉立创开源广场辅助工具
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  嘉立创开源广场辅助工具
// @author       Lx
// @match        https://oshwhub.com/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=szlcsc.com
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.min.js
// @grant        GM_openInTab
// @license      MIT
// ==/UserScript==


(async function () {
    'use strict';

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

    // 指定表头中哪个字段可以跳转淘宝
    let columnNameList = [
        'Device',
        'Name',
    ]

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
        const searchTbIndex = getColumnIndex(columnNameList)

        // 没找到的话，等待查找索引成功
        if (searchTbIndex === -1) {
            return;
        }

        $(`div.table-box .table > tr`).find(`th:eq(${searchTbIndex})`).append(`
            <p class="oneKey-search-tb" style='padding: 0px 8px; background-color: deepskyblue;cursor: pointer;border-radius: 4px; margin-left: 20px;'> 
            淘宝一键搜索BOM</br>（一次性会打开很多页面，慎用）
            </p>
        `)

        const $tdEles = $(`div.table-box .table > tr`).find(`td:eq(${searchTbIndex})`).css({
            "display": "flex",
            "justify-content": "space-between"
        })

        $tdEles.each(function () {
            $(this).append(`
            <p class="search-tb" data-query="https://s.taobao.com/search?q=${$(this).text().trim()}" 
            style='padding: 0px 8px; background-color: deepskyblue;cursor: pointer;border-radius: 4px; margin-left: 20px;'> 
            搜索淘宝
            </p>
            `)
        })

        $(`.search-tb`).click(function () {
            const t = $(this).parent().text().replace(/(搜索淘宝)+/g, '').trim()
            GM_openInTab(`https://s.taobao.com/search?q=${t}`, {})
        })

        $(`.oneKey-search-tb`).click(function () {
            $(`.search-tb`).each(function() {
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