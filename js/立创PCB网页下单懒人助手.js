// ==UserScript==
// @name         立创PCB网页下单懒人助手
// @namespace    http://tampermonkey.net/
// @version      1.3.4
// @description  PCB网页下单懒人助手
// @author       Lx
// @match        https://www.jlc.com/newOrder**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jlc.com
// @require      https://update.greasyfork.org/scripts/446666/1389793/jQuery%20Core%20minified.js
// @grant none
// @connect      jlc.com
// @license      MIT
// ==/UserScript==



/**
 * 获取get query里面的参数
 */
function getQueryParamByName(name) {
    const search = location.search.substring(1); // 去掉开头的 "?"
    const params = {};
    if (search) {
        const pairs = search.split('&');
        for (const pair of pairs) {
            const [keyEncoded, valueEncoded] = pair.split('=');
            const key = decodeURIComponent(keyEncoded || '');
            const value = decodeURIComponent(valueEncoded || '');
            params[key] = value;
        }
    }
    if (name && Object.keys(params).length > 0) {
        return params[name];
    }
    return null;
}

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

/**
 * 定时任务封装
 * @param {*} taskFunc 任务函数
 * @param {*} successBoolFunc  成功条件（返回true/false 成功则移除定时任务）
 * @param {*} timeout  任务间隔时长（毫秒）
 */
const timerFunc = (taskFunc, successBoolFunc, timeout = 1000) => {
    var _timer_ = setInterval(() => {
        if (successBoolFunc()) {
            clearInterval(_timer_);
            _timer_ = null;
        } else {
            runIgnoreError(() => taskFunc && taskFunc());
        }
    }, timeout);
}

const start = async() => {

    runIgnoreError(() => {
        // 长宽为空的话,重新加载页面
        timerFunc(() => {
            // pcbLength=2.43&pcbWidth=4.05
            const length = getQueryParamByName('pcbLength');
            const width = getQueryParamByName('pcbWidth');
            if (length && width) {
                $('#pcbLengthInput').val(length);
                $('#pcbWidthInput').val(width);
            }
        }, () => $('#pcbLengthInput').val() != '9.7', 2000);
    })

    if (location.href.includes('https://www.jlc.com/newOrder/#/pcb/pcbPlaceOrder') && !location.href.includes('edaUUID')) {
        window.location.replace(`${location.href}&edaUUID=55611fd7b14e48a18c37865f6b372d1d&from=eda-pro`);
    } else if (location.href.includes('https://www.jlc.com/newOrder/?') && !location.href.includes('edaUUID')) {
        const newUrl = location.href.replace('newOrder/?', 'newOrder/?edaUUID=55611fd7b14e48a18c37865f6b372d1d&from=eda-pro&')
        window.location.replace(newUrl);
    }

    runIgnoreError(() => {
        // 确认生产稿
        timerFunc(() => $('#confirmProductionFile_no').click(), () => $('#confirmProductionFile_no').hasClass('checked'), 1000);
    })

    // runIgnoreError(async() => {
    //     timerFunc(async() => {
    //         // 数量选择
    //         if ($('#pcbNumberModal').length === 0) {
    //             $('#pcbNumber input[placeholder="数量"]').click();
    //             await awaitTime(1000 * 0.5)
    //             $('#pcbNumberModal li.numItem button:not([class*=checked]').each(function() {
    //                 if ($(this).text().replace(/[ \n]/g, '') === "5") {
    //                     $(this).click()
    //                 }
    //             })
    //         }
    //     }, () => $('#pcbNumber input[placeholder="数量"]').val() > 0, 2000);
    // })

    runIgnoreError(async() => {
        // 包装 空白盒子
        timerFunc(() => $('#packType_white').click(), () => $('#packType_white').hasClass('checked'), 1000);
    })


    runIgnoreError(async() => {
        // 出货方式 单片资料单片出货
        timerFunc(() => $('#stencilType_one').click(), () => $('#stencilType_one').hasClass('checked'), 1000);
    })

    runIgnoreError(() => {
        // 默认 哑黑色 颜色
        timerFunc(() => $('#adornColor_black').click(), () => $('#adornColor_black').hasClass('checked'), 1000);
    })

    runIgnoreError(() => {
        // 是否SMT贴片 不需要
        timerFunc(() => $('#isNeedOrderSMT_no').click(), () => $('#isNeedOrderSMT_no').hasClass('checked'), 2000);
    })

    runIgnoreError(() => {
        // 是否开钢网 不需要
        if (!$('#isNeedOrderSteel_no').hasClass('checked')) {
            $('#isNeedOrderSteel_no').click()
        }
    })

    runIgnoreError(async() => {
        // 个人/普通电子发票
        if (!$('#isinvoiceFlag_no_8').hasClass('checked')) {
            $('#isinvoiceFlag_no_8').click()
        }
        await awaitTime(1000 * 0.5)
            // 这里是发票选择人
        if (!$('span:contains(选择开票资料)').hasClass('checked')) {
            $('span:contains(选择开票资料)').click()
        }
    })

    runIgnoreError(() => {
        // 手动确认订单
        timerFunc(() => $('#isConfirmStatus_no').click(), () => $('#isConfirmStatus_no').hasClass('checked'), 1000);
    })

    runIgnoreError(() => {
        // 不同交期订单一起发货(省运费)
        timerFunc(() => $('#bingdDelivery_2').click(), () => $('#bingdDelivery_2').hasClass('checked'), 1000);
    })

    runIgnoreError(() => {
        // 快递
        if (!$('#express_yufu_0').hasClass('checked')) {
            $('#express_yufu_0').click()
        }
    })

    runIgnoreError(async() => {
        await awaitTime(1000 * 3)
            // 不同交期订单一起发货(省运费)
        if (!$('#isNeedOrderSMT_confirm_no').hasClass('checked')) {
            $('#isNeedOrderSMT_confirm_no').click()
        }
    })

    runIgnoreError(async() => {
        timerFunc(async() => {
            $('div#banshangjiabiaozhi_1:contains("加嘉立创客编") button').click();
            await awaitTime(1000 * 1)
            $("div[id*=biaozhiweizhi_]:last button").click();
            await awaitTime(1000 * 1)
            $('div.el-dialog.jlc-modal[role="dialog"][aria-label="加客编"] button.confirm-btn:contains("确认")').click();
            await awaitTime(1000 * 1)
            $('div.el-dialog[role="dialog"][aria-label="温馨提示"] button[type="button"]:contains("不确认生产稿")').click();
        }, () => $('div#banshangjiabiaozhi_1:contains("加嘉立创客编") button').hasClass('checked') && $('div.selectItemMaxWidth span:contains("指定位置添加")').length > 0, 1000);
    })

    runIgnoreError(async() => {
        setInterval(async() => {
            var returnBool = $('iframe#editInvoiceListIfr').contents().find('div.el-dialog.jlc-modal[role="dialog"]:contains("开票资料")').is(':visible');
            if (returnBool) {
                await awaitTime(1000 * 0.5);
                $('iframe#editInvoiceListIfr').contents().find('div.el-dialog.jlc-modal[role="dialog"]:contains("开票资料") button.jlc-button:contains("确定")').click();
                await awaitTime(1000 * 0.5);
                $('div.el-dialog[role="dialog"][aria-label="温馨提示"] button[type="button"]:contains("确认选择")').click();
            }
        }, 1500);

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

    runIgnoreError(async() => {
        var tryCount = 0;
        const retryMaxCount = 3;
        // 获取优惠券数量
        var getCouponCount = () => {
            try {
                return parseInt(/\d+/g.exec($('#useCollarCoupon span.selectCoupon span:contains("张可用优惠券)")').text())[0]);
            } catch (error) {
                return -1;
            }
        };

        // 是否优惠券都不可用
        const isAllNotUse = () => $('div.el-dialog div.couponBox div[id*=collarCouponId_]').length === $('div.el-dialog div.couponBox div[id*=collarCouponId_]:contains("不可用")').length;
        timerFunc(async() => {
            // 选择优惠券按钮
            $('.selectCoupon').click();
            // 兜底判断
            if ($('div.el-dialog div.couponBox:contains("不可用")').length > 0) {
                await awaitTime(1000 * 0.5)
                    // 提交优惠券
                $("div.el-dialog button:contains(不使用优惠券)").click();
            } else {
                await awaitTime(1000 * 0.5)
                    // 默认选择第一张优惠券
                $('#collarCouponId_0').click()
                await awaitTime(1000 * 0.5)
                    // 提交优惠券
                $("div.el-dialog button:contains(使用优惠券):eq(1)").click();
            }
            ++tryCount;
        }, () => {
            return $('div#useCollarCoupon:contains("已选择")').length > 0 || getCouponCount() === 0 || tryCount === retryMaxCount || !isAllNotUse();
        }, 2500);
    })

    runIgnoreError(() => {
        // 我的文件中已有层压顺序
        if (!$('button#pcbFileType_5').hasClass('checked')) {
            $('button#pcbFileType_5').click()
        }
    })
}
$(window).on("load", start);