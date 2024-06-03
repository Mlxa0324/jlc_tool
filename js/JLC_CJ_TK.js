// ==UserScript==
// @name         JLC_CJ_TK
// @namespace    http://tampermonkey.net/
// @version      1.1.2
// @description  TK
// @author       123
// @require      https://cdn.bootcss.com/blueimp-md5/2.12.0/js/md5.min.js
// @match        https://exam.kaoshixing.com/exam/exam_check?**
// @match        https://exam.kaoshixing.com/exam/exam_start/**
//// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const repalceText = (text) => {
        text = text.replace(/[\n\r\ ]+/g, '')
        return text.replace(/^([A-Z]\.)*/g, '')
    }

    /**
     * http请求
     * @param {*} param0 
     * @returns 
     */
    const Request = ({ url, method = 'GET', data, headers }) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method,
                url, // 替换为你要请求的URL  
                data,
                headers,
                onload: function (response) {
                    // 当请求成功加载时，这里的代码会被执行  
                    console.log(response.responseText); // 打印响应文本  
                    resolve(JSON.parse(response.responseText));
                },
                onerror: function (response) {
                    // 当请求发生错误时，这里的代码会被执行  
                    console.log("Error: " + response.status);
                    reject(response.status);
                }
            });
        });
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

        console.log('questions: ', questions);

        Request({
            url: 'http://127.0.0.1:8081/insertAnswer',
            method: 'POST',
            data: JSON.stringify(questions),
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        }).then(res => {
            debugger
            console.log('res: ', res);
        });
        return questions;
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

        /**
         * 构建题干名称列表
         */
        const questionNameList = [];
        $('.question-content').find('.question-name .pre-wrap').each(function () {
            // 题干
            questionNameList.push(repalceText($(this).text()));
        });

        console.log('questionNameList: ', questionNameList);

        const res = await Request({
            url: 'http://127.0.0.1:8081/getAnswer',
            method: 'POST',
            data: JSON.stringify(questionNameList),
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        console.log('res: ', res);
        localStorage.setItem('questionAnswerList', res);
        const examQuestionListObject = res.data;
        localStorage.setItem('examQuestionListObject', JSON.stringify(examQuestionListObject));

        $('.question-content').find('.question-name .pre-wrap').each(function () {
            // 题干
            let questionName = repalceText($(this).text());
            let questionObject = examQuestionListObject.filter(question => question.question_name === questionName);

            // 没查到题目的话，跳过当前题目
            if (questionObject.length === 0) {
                return;
            }

            questionObject = questionObject[0]['quesiton_option_md5'];
            // 拿到选项的MD5列表
            let answerMD5List = questionObject.split(":::")[1].split(',');

            // 选项MD5
            $(this).parents('.question-content').find('.answers .select').each(function () {
                let text = $(this).text().replace(/[\r\n\ ]+/g, '');
                let answerMD5 = md5(repalceText(text));

                // 判断题
                if (['正确', '错误'].includes(text) && answerMD5List.includes(answerMD5)) {
                    $(this).find('span.words').click();
                }
                // 单选、多选
                else {
                    // 如果选项没有内容，就认为是图片，这时候需要获取图片的地址作为md5加密的值
                    if (text.split('.')[1].trim() === '') {
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
                break;
            case 2:
                return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10);
                break;
            default:
                return 0;
                break;
        }
    }

    /**
     * 未查询到的答案 随机选择
     */
    const rednerNotFindQuestion = () => {
        setInterval(() => {
            $('div.question-content').each(function () {
                if ($(this).data('commit') === false) {
                    $(this).find(`span.words-option:eq(${randomNum(0, 3)})`).click()
                    $(this).find(`span.words:eq(${randomNum(0, 1)})`).click();
                }
            })
        }, 1000);
    }

    buildResultByExamCheckPage();
    renderResultInExamStartPage();
    rednerNotFindQuestion();
})();