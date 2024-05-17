// ==UserScript==
// @name         淘宝店铺名追加工具
// @namespace    http://tampermonkey.net/
// @version      2024-05-17
// @description  try to take over the world!
// @author       You
// @match        https://s.taobao.com/search?**
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/layui/2.9.9/layui.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=taobao.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 配置信息
    const config = () => {
        return {
            storeNames: {
                '优信电子': {
                    attr: {
                        'style': `right: 76px; background: #aaaaaa;`,
                        'lay-on': 'yxdz',
                    },
                    'func': function () {
                        const k = '优信电子'
                        if (!$('#q').val().includes(k)) {
                            $('#q').val($('#q').val().replace(/(\ .+电子)/g, '') + ' ' + k)
                        }
                        $('#button').click()
                    },

                },
                '集芯电子': {
                    attr: {
                        'style': `right: 150px; background: #aaaaaa;`,
                        'lay-on': 'jxdz',
                    },
                    'func': function () {
                        const k = '集芯电子'
                        if (!$('#q').val().includes(k)) {
                            $('#q').val($('#q').val().replace(/(\ .+电子)/g, '') + ' ' + k)
                        }
                        $('#button').click()
                    },
                },
            }
        }
    }

    let html = ``
    let funcs_res = {}, funcs = []
    const storeNames = config().storeNames
    for (let k of Object.keys(storeNames)) {
        const v = storeNames[k];
        const attr = v.attr
        const attr_res = Object.keys(attr).map(a => `${a}="${attr[a]}"`).join(' ')
        html += `
            <button class="btn-search" ${attr_res} type="button">${k}</button>
            `
        funcs.push({ [v.attr['lay-on']]: v['func'] })
    }

    funcs.forEach(item => {
        funcs_res = {
            ...funcs_res,
            ...item
        }
    })
    $('#J_Search form').append(html)

    layui.use(function () {
        layui.util.on('lay-on', funcs_res);
    });
})();