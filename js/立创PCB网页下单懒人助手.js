// ==UserScript==
// @name         立创PCB网页下单懒人助手
// @namespace    http://tampermonkey.net/
// @version      1.1.2
// @description  PCB网页下单懒人助手
// @author       Lx
// @match        https://www.jlc.com/newOrder/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jlc.com
// @require      https://update.greasyfork.org/scripts/446666/1389793/jQuery%20Core%20minified.js
// @grant none
// @license      MIT
// ==/UserScript==


/**
* 延迟方法
* @param time
*/
const awaitTime = (time) => {
    return new Promise((resolve, reject) => {
        let tid = setTimeout(() => {
            clearTimeout(tid)
            resolve('ok')
        }, time)
    });
}

/**
 * 捕获异常，不影响后续执行
 * 点击类的脚本其实是不允许报错的，否则影响后续的逻辑执行
 * @param func
 */
const runIgnoreError = (func) => {
    try {
        // 检测并运行function
        func && func()
    } catch (error) {
        console.error(error);
    }
}

const start = async () => {

    await awaitTime(1000 * 5)
    // runIgnoreError(() => {
    //     // 长宽为空的话,重新加载页面
    //     if (!$('#pcbLengthInput').val().length) {
    //         window.location.reload()
    //     }
    // })
   
    if (!location.href.includes('edaUUID')) {
        window.location.replace(`${location.href}&edaUUID=55611fd7b14e48a18c37865f6b372d1d&from=eda-pro`);
    }

    runIgnoreError(() => {
        // 确认生产稿
        if (!$('#confirmProductionFile_no').hasClass('checked')) {
            $('#confirmProductionFile_no').click()
        }
    })

    runIgnoreError(async () => {
        await awaitTime(1000 * 2)
        // 数量选择
        if ($('#pcbNumberModal').length === 0) {
            $('#pcbNumber input[placeholder="数量"]').click();
            await awaitTime(1000 * 0.5)
            $('#pcbNumberModal li.numItem button:not([class*=checked]').each(function(){
                if ($(this).text().replace(/[ \n]/g, '') === "5") {
                    $(this).click()
                }
            })
        }
    })


    runIgnoreError(async () => {
        // 包装
        await awaitTime(1000 * 1)
        $('#packType_white').click()
    })


    runIgnoreError(async () => {
        // 单片资料单片出货
        await awaitTime(1000 * 4)
        if (!$('#stencilType_one').hasClass('checked')) {
            $('#stencilType_one').click()
        }
    })


    runIgnoreError(() => {
        // 默认 哑黑色
        if (!$('#adornColor_black').hasClass('checked')) {
            $('#adornColor_black').click()
        }
    })


    runIgnoreError(() => {
        // 是否SMT贴片 不需要
        if (!$('#isNeedOrderSMT_no').hasClass('checked')) {
            $('#isNeedOrderSMT_no').click()
        }
    })


    runIgnoreError(() => {
        // 是否开钢网 不需要
        if (!$('#isNeedOrderSteel_no').hasClass('checked')) {
            $('#isNeedOrderSteel_no').click()
        }
    })


    runIgnoreError(() => {
        // 个人/普通电子发票
        if (!$('#isinvoiceFlag_no_8').hasClass('checked')) {
            $('#isinvoiceFlag_no_8').click()
        }
        // 这里是发票选择人
        if (!$('span:contains(选择开票资料)').hasClass('checked')) {
            $('span:contains(选择开票资料)').click()
        }
    })


    runIgnoreError(() => {
        // 手动确认订单
        if (!$('#isConfirmStatus_no').hasClass('checked')) {
            $('#isConfirmStatus_no').click()
        }
    })


    runIgnoreError(() => {
        // 不同交期订单一起发货(省运费)
        if (!$('#bingdDelivery_2').hasClass('checked')) {
            $('#bingdDelivery_2').click()
        }
    })


    runIgnoreError(() => {
        // 京东特惠快递
        if (!$('#express_yufu_0').hasClass('checked')) {
            $('#express_yufu_0').click()
        }
    })


    runIgnoreError(async () => {
        await awaitTime(1000 * 3)
        // 不同交期订单一起发货(省运费)
        if (!$('#isNeedOrderSMT_confirm_no').hasClass('checked')) {
            $('#isNeedOrderSMT_confirm_no').click()
        }
    })


    runIgnoreError(async () => {
        await awaitTime(1000 * 0.5)
        $('div#banshangjiabiaozhi_1:contains("加嘉立创客编") button').click();
        await awaitTime(1000 * 0.5)
        $("div#biaozhiweizhi_1 button").click();
        await awaitTime(1000 * 0.5)
        $('div.el-dialog.jlc-modal[role="dialog"][aria-label="加客编"] button.jlc-button:contains("确定")').click();
        await awaitTime(1000 * 0.5)
        $('div.el-dialog[role="dialog"][aria-label="温馨提示"] button[type="button"]:contains("不确认生产稿")').click();
    })


    runIgnoreError(async () => {
        // 发票选择第一个 确认
        if (!$(window.frames[2].document).find(".cancelPadding .hideLable").hasClass('is-checked')) {

            // 发票选择
            $(window.frames[2].document).find(".cancelPadding:eq(0)").click();
            $(window.frames[2].document).find("span:contains(确认选择)").click();

            // 发票再次确认
            await awaitTime(1000 * 1)
            $("div:contains(亲，因财务合规要求，您当前选择的开票主体为)").find('button:contains(确认选择)').click();
        }
    })

    runIgnoreError(async () => {
        // 选择优惠券按钮
        await awaitTime(1000 * 5)
        $('.selectCoupon').click()
        // 默认选择第一张优惠券
        await awaitTime(1000 * 0.5)
        $('#collarCouponId_0').click()
        // 提交优惠券
        await awaitTime(1000 * 0.5)
        $("button:contains(使用优惠券):eq(1)").click();
    })

    runIgnoreError(() => {
        // 我的文件中已有层压顺序
        if (!$('button#pcbFileType_5').hasClass('checked')) {
            $('button#pcbFileType_5').click()
        }
    })
}
$(window).on("load", start);