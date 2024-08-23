// ==UserScript==
// @name         JLC-TB搜索栏的增强按钮组
// @namespace    http://tampermonkey.net/
// @version      1.1.4
// @description  TB搜索栏的增强按钮组，为了不误解评论大佬的意思，故改个插件名字，留给有需要的人
// @author       You
// @match        https://s.taobao.com/search?**
// @require      https://update.greasyfork.org/scripts/446666/1389793/jQuery%20Core%20minified.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/layui/2.9.9/layui.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=taobao.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // 配置信息
    const config = () => {
        return {
            // func中，替换替换对象Key  '优信电子'中的func $OBJECT_KEY$会被替换成 "优信电子"
            // 这里不做配置
            '$OBJECT_KEY$': '_',
            storeConf: {
                // 优信电子-模糊 这块，名字不能重复
                // 只取第一个横线前面的字符
                '优信电子-模糊': {
                    // 支持精确店铺查询，为空则在淘宝首页搜索
                    url: ``,
                },
                '集芯电子-模糊': {
                    // 支持精确店铺查询，为空则在淘宝首页搜索
                    url: ``,
                },
                '优信电子-主': {
                    // 支持精确店铺查询，为空则在淘宝首页搜索
                    url: `https://youxin-electronic.taobao.com/`,
                },
                '优信电子-备': {
                    // 支持精确店铺查询，为空则在淘宝首页搜索
                    url: `https://shop35338630.taobao.com/`,
                },
                '集芯电子': {
                    // 支持精确店铺查询，为空则在淘宝首页搜索
                    url: `https://shop107953716.taobao.com/`,
                },
            }
        }
    }

    /**
     * config加工处理
     * @returns
     */
    const getConfig = () => {
        const config_ = config();

        for (let storeName of Object.keys(config_.storeConf)) {
            let storeConfig = config_.storeConf[storeName];
            // 混入店铺的基础配置
            config_.storeConf[storeName] = { ...storeConfig, ...baseConf() }
        }

        return config_;
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

    const baseConf = () => ({
        attr: {
            'style': `background: ${srdmRgbColor()};
                        width: fit-content;
                        padding: 5px 7px;
                        position: unset;
                        margin-right: 10px;
                        font-size: larger;
                        height: fit-content;`,
            'lay-on': `func_${(Math.random() + '').replace('0.', '')}`,
        },
        'func': function () {
            // 跳转店铺逻辑
            if ($(this).data('url').length) {
                window.open($(this).data('url'), $(this).data('target'))
            }
            // 模糊匹配模块
            else {
                if (!$('#q').val().includes(('$OBJECT_KEY$').split('-')[0])) {
                    const arr = $('#q').val().split(' ')
                    $('#q').val($('#q').val().replace(` ${arr[arr.length - 1]}`, '') + ' ' + ('$OBJECT_KEY$').split('-')[0])
                }
            }
            $('#button').click()
        }
    })

    let html_start = `<div style="display: flex; margin-top: 8px;" id="my-tool-box">`;
    let html_content = ``;
    let html_end = `</div>`;

    let funcs_res = {}, funcs = [];
    const storeConf = getConfig().storeConf;
    for (let storeName of Object.keys(storeConf)) {
        const entity = storeConf[storeName];
        // 取值
        const { attr, url } = entity;
        // 标签属性
        const attr_res = Object.keys(attr).map(a => `${a}="${attr[a]}"`).join(' ');
        // 生成淘宝店铺搜索的链接
        const storeSearchPath = url.length ? `${url}/search.htm?keyword=${$('#q').val().replace(/[\ \u4e00-\u9fa5]+/g, '')}` : '';

        console.log(storeSearchPath)
        html_content += `<button class="btn-search" data-url="${storeSearchPath}" data-target="_blank" ${attr_res} type="button">${storeName}</button>`;
        // 只取function的正文
        const funcContent = entity['func'].toString().replace(/\$OBJECT_KEY\$/g, storeName).replace(/}$/g, '').replace(/(function|\(\) {|\(\){)/g, '')
        funcs.push({ [entity.attr['lay-on']]: new Function(funcContent) })
    }

    funcs.forEach(item => {
        funcs_res = {
            ...funcs_res,
            ...item,
        }
    })
    $('#J_Search form').append(html_start + html_content + html_end)

    layui.use(function () {
        layui.util.on('lay-on', funcs_res);
    });


    // 控制显示隐藏，不遮盖官方
    setInterval(() => {
        let isHide = [...$('div[class*="PageHeader--headerWrap--"]')].filter(item => item.outerHTML.indexOf('fixed') >= 0).length > 0
            || $('.search-suggest-popup').is(':visible');

        if (isHide) {
            $('#my-tool-box').hide()
        } else {
            $('#my-tool-box').show()
        }
    }, 100);
})();