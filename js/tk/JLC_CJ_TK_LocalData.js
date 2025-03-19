// ==UserScript==
// @name         JLC_CJ_TK_LocalData
// @namespace    http://tampermonkey.net/
// @version      1.1.6
// @description  TK 离线
// @author       123
// @require      https://update.greasyfork.org/scripts/470305/1216506/md5-func.js
// @require      https://update.greasyfork.org/scripts/497006/1388537/JLCMD5TK.js
// @match        https://exam.kaoshixing.com/exam/exam_start/**
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/496919/JLC_CJ_TK_LocalData.user.js
// @updateURL https://update.greasyfork.org/scripts/496919/JLC_CJ_TK_LocalData.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const repalceText = (text) => {
        //text = text.replace(/[\n\r  ]+/g, '')
        text = text.replace(/[\n\r ]+/g, '')
        return text.replace(/^([A-Z]\.)*/g, '')
    }

    /**
     * 在答题页面，勾选上查询到的答案
     * @returns
     */
    const renderResultInExamStartPage = async () => {
        // 当前页判断
        if (!location.href.includes('exam.kaoshixing.com/exam/exam_start')) {
            return;
        }
        // 库
        const md5DataList = getMD5DataList();

        $('.question-content').find('.question-name .pre-wrap').each(function () {
            debugger
            // 题干
            let questionName = repalceText($(this).text());
            let questionObject = md5DataList.filter(questionMd5 => questionMd5.split(':::')[0] === md5(questionName));

            // 没查到题目的话，跳过当前题目
            if (questionObject.length === 0) {
                return;
            }

            questionObject = questionObject[0];
            // 拿到选项的MD5列表
            let answerMD5List = questionObject.split(":::")[1].split(',');

            // 选项MD5
            $(this).parents('.question-content').find('.answers .select').each(function () {
                let text = $(this).text().replace(/[\n\r ]+/g, '');
                let answerMD5 = md5(repalceText(text));

                // 判断题
                if (['正确', '错误'].includes(text) && answerMD5List.includes(answerMD5)) {
                    $(this).find('span.words').click();
                }
                // 单选、多选
                else {
                    // 如果选项没有内容，就认为是图片，这时候需要获取图片的地址作为md5加密的值
                    if (text.split('.')[1] === '') {
                        text += $(this).find('img').attr('src');
                        let answerMD5 = md5(repalceText(text));
                        if (answerMD5List.includes(answerMD5)) {
                            $(this).find('span.words-option').click();
                        }
                    }
                    // 是否包含在正确答案中
                    if (answerMD5List.includes(answerMD5)) {
                        $(this).find('span.words-option').click();
                    }
                }
            });
        });
    }

    //生成从minNum到maxNum的随机数
    function randomNum(minNum, maxNum) {
        switch (arguments.length) {
            case 1:
                return parseInt(Math.random() * minNum + 1, 10);
            case 2:
                return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10);
            default:
                return 0;
        }
    }

    /**
     * 未查询到的答案 随机选择
     */
    const rednerNotFindQuestion = () => {
        setInterval(() => {
            $('div.question-content[data-commit="false"]').each(function () {
                $(this).find(`span.words-option:eq(${randomNum(0, 3)})`).click()
                $(this).find(`span.words:eq(${randomNum(0, 1)})`).click();
            })
        }, 1000);
    }

    /**
     * 交卷按钮控制， 自动提交试卷
     */
    const buttonControl = () => {
        if ($('#endExamBtn').length === 0) {
            return;
        }
        // 取随机交卷时间
        // 30、60 是随机交卷时间：30秒到60秒之间，可以根据自己的需求修改。
        const second = randomNum(30, 60) * 1000;
        let sencond2 = second;

        let timeoutTask = setInterval(() => {
            // .attr('disabled', true)
            sencond2 = sencond2 - 1000;
            $('#endExamBtn').css({
                padding: '10px 0px'
            }).text(`自动交卷倒计时${sencond2 / 1000}秒`);
            // 去除定时
            if ((sencond2 / 1000) <= 0) {
                timeoutTask = null;
                clearInterval(timeoutTask);
                $('#endExamBtn').css({
                    padding: '10px 28px'
                }).attr('disabled', false).text('提交试卷');
            }
        }, 1000);

        // 交卷
        setTimeout(() => {
            $('#endExamBtn').click();
            $('#confirmEndExamBtn').click();
        }, second + 1000);
    }

    renderResultInExamStartPage();
    rednerNotFindQuestion();
    // 不要自动交卷，把下面这行删掉
    buttonControl();
})();
