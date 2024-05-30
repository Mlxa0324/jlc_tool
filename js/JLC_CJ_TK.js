// ==UserScript==
// @name         JLC_CJ_TK
// @namespace    http://tampermonkey.net/
// @version      1.1.2
// @description  题库
// @author       You
// @match        https://s.taobao.com/search?**
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://cdn.bootcss.com/blueimp-md5/2.12.0/js/md5.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=taobao.com
// @match        https://exam.kaoshixing.com/exam/exam_check?**
// @match        https://exam.kaoshixing.com/exam/exam_start/**
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const repalceText = (text) => {
        text = text.replace(/[\n\r\ ]+/g, '')
        return text.replace(/^([A-Z]\.)*/g, '')
    }


    /**
     * 在答题检查页，构建结果集
     * @returns 
     */
    const buildResultByExamCheckPage = () => {
        // 当前页判断
        if (!location.href.includes('exam.kaoshixing.com/exam/exam_check')) {
            return;
        }
        //结果集
        let questions = {};

        $('.question-content').find('.question-name .pre-wrap').each(function () {
            // 题干
            let questionName = repalceText($(this).text());
            // 题干MD5
            let questionMD5s = `${md5(questionName)}:::`;

            // 选项MD5
            $(this).parents('.question-content').find('.answers .select').each(function () {
                let text = $(this).text().replace(/[\r\n\ ]+/g, '');

                // 正确答案
                var analysis = $(this).parents('.question-content').find('.analysis-row:contains("正确答案：") .question-ans-right:eq(0)').text();

                // 判断题
                if (['正确', '错误'].includes(text)) {
                    // 是否包含在正确答案中
                    if (analysis.includes(text)) {
                        let answerMD5 = md5(repalceText(text));
                        questionMD5s += `${answerMD5},`;
                    }
                }
                // 单选、多选
                else {
                    // 如果选项没有内容，就认为是图片，这时候需要获取图片的地址作为md5加密的值
                    if (text.split('.')[1].trim() === '') {
                        text += $(this).find('img').attr('src');
                    }
                    // 是否包含在正确答案中
                    if (analysis.includes(text.split('.')[0])) {
                        let answerMD5 = md5(repalceText(text));
                        questionMD5s += `${answerMD5},`;
                    }
                }
            });

            questionMD5s = questionMD5s.replace(/,$/g, '');

            if (questionName !== '') {
                questions[questionName] = questionMD5s;
            }
        });
        console.log(questions);

        let examQuestionList = localStorage.getItem('examQuestionList');
        let examQuestionListObject = JSON.parse(examQuestionList);
        // 目前看题库不多，直接暂存本地。 题库合并到本地缓存
        localStorage.setItem('examQuestionList', JSON.stringify({...examQuestionListObject, ...questions}));
        return questions;
    }



    /**
     * 在答题检查页，构建结果集
     * @returns 
     */
    const renderResultInExamStartPage = () => {
        // 当前页判断
        if (!location.href.includes('exam.kaoshixing.com/exam/exam_start')) {
            return;
        }

        // 目前看题库不多，直接暂存本地
        let examQuestionList = localStorage.getItem('examQuestionList');
        let examQuestionListObject = JSON.parse(examQuestionList);


        $('.question-content').find('.question-name .pre-wrap').each(function () {
            // 题干
            let questionName = repalceText($(this).text());
            let questionObject = examQuestionListObject[questionName];

            // 没查到题目的话，跳过当前题目
            if (!questionObject) {
                return;
            }
            // 拿到选项的MD5列表
            let answerMD5List = questionObject.split(":::")[1].split(',');
            debugger

            // 选项MD5
            $(this).parents('.question-content').find('.answers .select').each(function () {
                let text = $(this).text().replace(/[\r\n\ ]+/g, '');
                let answerMD5 = md5(repalceText(text));

                // 判断题
                if (['正确', '错误'].includes(text) && answerMD5List.includes(answerMD5)) {
                    $(this).find('input[type="radio"]').click();
                }
                // 单选、多选
                else {
                    // 如果选项没有内容，就认为是图片，这时候需要获取图片的地址作为md5加密的值
                    if (text.split('.')[1].trim() === '') {
                        text += $(this).find('img').attr('src');
                        let answerMD5 = md5(repalceText(text));
                        if (answerMD5List.includes(answerMD5)) {
                            $(this).find('input[type="checkbox"]').click();
                        }
                    }
                    // 是否包含在正确答案中
                    if (answerMD5List.includes(answerMD5)) {
                        $(this).find('input[type="checkbox"]').click();
                    }
                }
            });
        });
    }

    buildResultByExamCheckPage();
    renderResultInExamStartPage();
})();