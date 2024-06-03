// ==UserScript==
// @name         JLC_CJ_TK
// @namespace    http://tampermonkey.net/
// @version      1.1.2
// @description  TK
// @author       123
// @require      https://cdn.bootcss.com/blueimp-md5/2.12.0/js/md5.min.js
// @match        https://exam.kaoshixing.com/exam/exam_check?**
// @match        https://exam.kaoshixing.com/exam/exam_start/**
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

        console.log('questions: ', questions);
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

        const res = {
            "code": 200,
            "data": [
                {
                    "question_name": "嘉立创题库的作用是什么，以下描述正确的是？（ ）",
                    "quesiton_option_md5": "ca150e2d665e49eebceeab0577e13c05:::ba7332585cbc8244828d08b3dfb4a9d3,0d46292793d72a1f4e3be1b70d452bde,223ecc4e012de13840ed5a5bd991799c"
                },
                {
                    "question_name": "PCBLayout工程师为什么要了解PCB生产工艺、生产设备及其他相关知识，以下描述正确的是？（ ）",
                    "quesiton_option_md5": "4447d8223f5b8fc5c4c08597008a37dc:::790ba8e635fc3da17d47875ee3f56c2d,4e1e71dac5d233417a9a7b849ce979d3,53a899f5d9a626a7bb60b5b87d308fb0,ab5048116579f91d4af61540057a2074,6e6bc6300f4826bfbb1ded4ddd7efb95"
                },
                {
                    "question_name": "嘉立创支持加工硬板（FR-4PCB）、软板（FPC）、铝基板、铜基板、高频板，以下哪些选项是嘉立创可加工的不同类型的电路板层数范围？（ ）",
                    "quesiton_option_md5": "ba9855937f7517c04ae5d314bfb1582e:::576ab5cdd1e010253d0e9d54970ee8fa,5dd2c4d05069f38fcddf434d7ab80e96,f715a69dc4ee196fb68b89a1ed997e6b,593b04988467b351a22c0adba6ffcd32"
                },
                {
                    "question_name": "嘉立创建议工程师设计需要SMT的拼板PCB时，在拼板工艺边内添加Mark点，有利于生产设备通过识别Mark点实现定位和防呆功能。以下关于Mark点的描述，哪些是正确的？（ ）",
                    "quesiton_option_md5": "d1244c09704e3d74e4d2ec1334e00932:::8bc8bece9983b96b1fa136a4436e595b,d23811d36b06a34eba4133a05a268019,ee8c94de35fc574391948096eddbd8ba"
                },
                {
                    "question_name": "PCB有一定的厚度。当采用V割（V-cut）方式进行拼板时，如果板厚小于0.6mm，成品板经过V割加工时，可能会因板材过薄而容易发生变形，从而导致割偏、断板或者余厚不足等品质隐患。请回答下面哪个板厚的PCB不适合V割拼板？(   )",
                    "quesiton_option_md5": "dd521cf9fddfe75e1616aef7fb6d6b98:::63e2911eef8755e64e0b74cad7d8f88a"
                },
                {
                    "question_name": "盘中孔工艺被广泛应用于解决PCB设计中小空间布线的挑战。嘉立创能够加工的最小盘中孔直径为0.15mm，但是直径小于0.3mm的孔加工难度较高，不仅效率低下，而且品质控制成本增加；而直径大于0.5mm的孔可能导致塞孔不饱满的问题。考虑到效率提升和成本降低的需求，盘中孔的直径应该设计在哪个范围内更为合适呢？（ ）",
                    "quesiton_option_md5": "202b98450e4e4aeed61262617bd23ccf:::55b20f9814bc2d604796bdbb5ec5d579"
                },
                {
                    "question_name": "无论是内径、外径还是孔环，PCB导电孔(Via）的参数对板子的良率和成本有显著影响。嘉立创工艺参数表中的极限值，是工艺能力下可生产的最小值，仅供工程师参考，在Layout空间充足的情况下，应尽量使用大于极限值的参数。导电孔为以下哪组参数，对PCB的良率和成本最有利？（ ）",
                    "quesiton_option_md5": "255d005a3ee930710bd09b3dba97edc2:::c7b82769a25a1b378b1d8fcd9f823566"
                },
                {
                    "question_name": "  设计PCB时，为避免锣刀在锣槽时损伤导线，关键一步是确保锣槽与导线之间有足够的安全间距。一般而言，安全间距越大越好，最小不能低于以下哪个参数？（ ）",
                    "quesiton_option_md5": "d2a5a1684f4b49c02a62ea532dc258e3:::ab9a5b0283e1f620f1f5d9e8481b891d"
                },
                {
                    "question_name": "阻焊开窗边缘与导线的距离太近容易导致线路露铜，给产品带来隐患。为提高产品品质，嘉立创建议工程师在设计PCB时，阻焊开窗边缘与导线的间距越大越好，最小间距d(如图所示）应尽量不小于以下哪个参数？（  ）",
                    "quesiton_option_md5": "03db82743e6c33884d82463a8d872d54:::f9e0da24ce0fa1750c3cd86419cf1381"
                },
                {
                    "question_name": "为确保在PCB加工过程中避免锣刀接触并损坏字符，李工了解到合作的PCB制造商外形常规锣板的公差为+/-0.2mm。因此，在设计单片出货的PCB时，字符与板边的最小间距应考虑这一公差，以确保字符完整性。那么，字符与板边的最小间距应该满足什么条件？（ ）",
                    "quesiton_option_md5": "1fad73c757cc64d6d47f1295ea4f6570:::15b8447ecb091afbd9b9a9a11f2e369d"
                },
                {
                    "question_name": "不同制造商可加工的PCB尺寸有所差异，嘉立创可加工的常规工艺FR-4基材PCB，单片板最小长宽为以下哪个参数？（  ）",
                    "quesiton_option_md5": "add276a25ce138999a46d414fadfb29e:::bf9cf772f921f36b07a555f83a01da37"
                },
                {
                    "question_name": "在PCB设计中，压接孔由于其特殊性，对孔径的精度要求极高。考虑到 PCB 表面喷镀对孔径的影响，为更好地控制孔径公差，嘉立创建议对压接孔有需求的用户，下单时选择哪种表面处理工艺更为妥当？（ ）",
                    "quesiton_option_md5": "21e0fae732119d5360799766c41d7feb:::6f5052852d7e2c1abda03f9a3d0e9fc9"
                },
                {
                    "question_name": "PCB锣槽存在一定数值的公差，嘉立创常规锣槽公差参数为±0.2mm，非金属化槽孔与相邻焊盘间距太小，加工槽孔时容易锣伤焊盘，导致焊盘有缺损。为保证焊盘不被锣刀锣伤，非金属化槽孔与焊盘边缘的间距，应不小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "dc21b11cb9a5d470095238be3c1300ae:::ab9a5b0283e1f620f1f5d9e8481b891d"
                },
                {
                    "question_name": "PCB设计软件通常用Pad和Via区分焊盘和过孔，关于Pad和Via，以下哪个选项描述是错误的？（ ）",
                    "quesiton_option_md5": "e9e380a475a55279bff254c8d5d5f386:::f417f366cb0b365bf3a81245c85337c7"
                },
                {
                    "question_name": "半孔板需要采用半孔工艺制作，成本比常规工艺高，如果工程师为了节约成本，要求嘉立创采用常规工艺而非半孔工艺制作PCB，实物板半孔可能会呈现以下哪种效果？（ ）",
                    "quesiton_option_md5": "cab88a25cc07f5b3e97c1fe73d299354:::ee6df7033a974fd2d6b73e2297a56fc1"
                },
                {
                    "question_name": "李工在设计单面板时，在PCB设计软件的多层设计了插件孔（Pad），没有设计线路和铜箔。嘉立创按“顶层线路”生产单面板，将以哪一层资料制作线路菲林？（ ）",
                    "quesiton_option_md5": "2c9870e07cfd3aa30c936604f4fe9adc:::5e3402d5d796dc28699cf848c727a43d"
                },
                {
                    "question_name": "“过孔(Via)盖油工艺”的要求是通过一次性印刷阻焊油墨进行覆盖，其检验标准是什么？（ ）",
                    "quesiton_option_md5": "4e07322a81351e686430cf66f1f1a353:::7ed4b025b7044d94541e35c1ef20b392"
                },
                {
                    "question_name": "在PCB设计的Layout阶段，为了确保焊盘和露铜区域能够正常上锡，并防止在喷锡过程中丝印文字的掉落或残缺，设计工程师应当避免将丝印文字放置在哪些区域？（  ）",
                    "quesiton_option_md5": "5869000f2145fdb2976ad1f163c8cb04:::2d4288ae8ced40d87975450674399750"
                },
                {
                    "question_name": "张工设计的一款PCB产品特点是焊盘较大，且对焊盘平整度的要求不高。在寻求既经济又符合环保标准的表面处理工艺时，应选择哪一种？（ ）",
                    "quesiton_option_md5": "cdd1dc3aa7809b77df7da6d12febbf06:::2bc44bba491bb6a8fe3b30187e4a52f8"
                },
                {
                    "question_name": "为避免因间距太小，生产PCB时干膜脱落，影响产品品质，同一网络上的焊盘与铜皮，间距应不小于0.25mm。设计如图所示的“十字花焊盘”，图中所指的间距d应不小于以下哪个参数？（  ）",
                    "quesiton_option_md5": "a317dd603db4614f425b5984a2575f35:::ea6d40b0d8ab07605cac8617c4e780ed"
                },
                {
                    "question_name": "在PCB设计软件中，不同层次承担着不同的作用和功能。请问，下列选项中哪一层的元素是专门用于辅助钢网厂制作钢网，以便在表面贴装过程中刷上锡膏？（ ）",
                    "quesiton_option_md5": "d83bac8f898168c739d5fa1094cb3b71:::ee4c3df59fa88f978acd943566917fac"
                },
                {
                    "question_name": "如下图所示，根据产品需求，部分PCB需设计成窄长且突出的特殊形状。为避免在锣板过程中出现断裂风险，设计下图所示的外形时，嘉立创建议锣板出货的PCB，突出外形的长度（L）和宽度（W）需要满足以下哪组参数？（ ）",
                    "quesiton_option_md5": "6d1c810d7b7f1606c65701883b502cdb:::f095a7ba492071aaa873300601913346"
                },
                {
                    "question_name": "以下哪种拼板方式，能确保斜边金手指方向朝外，嘉立创可实现手指斜边正常加工？（ ）",
                    "quesiton_option_md5": "4eb3597ccae74c5785fff098ae5a2126:::59b3c8c61f560149d2bcadd192f53ae8"
                },
                {
                    "question_name": "压接孔是一种特殊通孔，元器件插入孔内可固定，元器件引脚和压接孔孔壁接触，无需焊接即可实现导通功能，因此压接孔精度要求比常规钻孔更高，嘉立创压接孔公差参数为±0.05mm，李工设计的6层沉金PCB压接孔直径为1mm，以下哪个选项的成品压接孔直径在公差范围内？（ ）",
                    "quesiton_option_md5": "e8d2a7dd96a900bbb53bf4d511435c72:::3cba9ee6b9f34d8af79d7f8315a8ff6a"
                },
                {
                    "question_name": "阻焊油墨厚度、阻焊对位偏移度，都会影响插拔金手指PCB的接触性能。为提高产品接触灵敏度，金手指阻焊开窗区域，设计成以下哪个选项更合适？（ ）",
                    "quesiton_option_md5": "8aa10ccd0961a84703eaba63e997f97f:::625c5a8018d1f56ecfdd8c788482ca54"
                },
                {
                    "question_name": "截至目前，嘉立创可加工的单面铝基板板材厚度范围是多少？（ ）",
                    "quesiton_option_md5": "4a854066761ae538e933a21a797a4932:::b9177f64012e0db7cc413d299210d6d5"
                },
                {
                    "question_name": "嘉立创部分工艺参数标有最小参数，如“最小过孔”、“最小线宽”，关于最小参数以下描述正确的是？（ ）",
                    "quesiton_option_md5": "fe2c8ac74e09c172fe8ee63911c331a6:::5dd454e9c09e730e6dd589046aa2d856"
                },
                {
                    "question_name": "当客户将设计好的拼板文件提交给嘉立创进行PCB加工时，如果客户还需要制作对应的钢网，可以在下PCB订单时选择“激光钢网”服务，或者点击已下好的PCB订单，再选择“下激光钢网”。若客户希望在其他厂商处制造钢网，确保钢网与PCB焊盘位置的精确对齐，应下载并使用哪份拼板文件？（  ）",
                    "quesiton_option_md5": "4ec60fe44cd59936581c7643ffd3421e:::8d7f5c59c30c98456e9e10c7e570b904"
                },
                {
                    "question_name": "在PCB设计阶段，螺丝孔的位置、尺寸选择以及与相邻元件和导线的间距非常重要。为了增强PCB的安全性和可靠性，必须确保布线与螺丝孔边缘之间的距离超出螺母的覆盖范围，以避免螺丝孔安装过程中可能发生的机械干扰。这样的措施有助于保护阻焊油墨和线路，防止短路和开路的风险。(  )",
                    "quesiton_option_md5": "c212ddd74df27b49accd05e8c99a05e5:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "李工设计的PCB含矩形槽，嘉立创采用锣板方式加工槽孔，由于锣刀刀头为圆形，存在一定数值的直径，因此实物板槽孔四个角会有残留基材（R角），无法做成90°直角。（ ）",
                    "quesiton_option_md5": "c3758dd271b9e82be71e3761f38c89ff:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "影响PCB平整度的因素有很多，工程师在设计PCB拼板尺寸与拼板方式，选择PCB板材厚度时，需要考虑板子承重能力以及诱发板翘的因素有哪些，避免影响平整度，以下哪些描述是正确的？（  ）",
                    "quesiton_option_md5": "a9ef6eb65e33703f1237421ac6062417:::e6ba06a5b98721c438d16cea6f093686,7f3f9e14341227b95e328d066e100ad8,5b6b477b90006d59635761fff959abc1,ffed6c3c6eb4a51e9c0107291bcc8e52,15e968cf1b0384791a44e6f42c1a03ea"
                },
                {
                    "question_name": "嘉立创可生产最高层数达32层的高精密多层板，PCB层数为以下哪个选项，嘉立创全面采用盘中孔工艺，且不收取盘中孔工艺费用？（ ）",
                    "quesiton_option_md5": "bb9644697dbdbe006ae21cb19a905495:::a833b742ce345389492e1e4bd147fbe4"
                },
                {
                    "question_name": "从下图可以看出，IC阻焊桥宽度和阻焊单边开窗宽度，两个参数是相互制约的关系，阻焊单边开窗宽度大，对应的阻焊桥宽度就会变小。嘉立创生产的高多层板，能实现阻焊开窗与焊盘面积的比为1:1，即阻焊单边开窗宽度为0mm，把更多的空间留给阻焊桥，使IC元器件在SMT环节不易出现引脚锡粘连现象。为什么嘉立创能做到焊盘开窗1:1？（ ）",
                    "quesiton_option_md5": "ee1a020cffd575454a5a0f4d30841d17:::bf474e43e01f22a48139dc4862b08924"
                },
                {
                    "question_name": "合理的成本控制有利于产品研发和市场推广，工程师将成本控制理念融入PCB设计，能实现研发效率和经济效益双提升。PCB过孔（Via）直径小，制造商会对小孔加收费用，产品成本高，良率受影响，生产效率慢，在设计空间允许的情况下，尽可能不设计小过孔。以下哪个过孔直径，嘉立创不收费？（ ）",
                    "quesiton_option_md5": "9a7fd8206041399683f289b960ee0235:::c90cd85b227a991ef671cbc22190d19e"
                },
                {
                    "question_name": "PCB铜厚越厚，线宽线距需设计得越大，产品加工才不会受影响，也有利于提高产品良率。根据嘉立创工艺参数，PCB成品铜厚为3.5oz，最小线宽线距应不小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "71a39769d14668f59a373e0b69f75189:::ea6d40b0d8ab07605cac8617c4e780ed"
                },
                {
                    "question_name": "IC元器件封装相邻焊盘之间的间距，如果小于嘉立创最小阻焊桥工艺参数，PCB成品可能会出现阻焊桥脱落等隐患。为保证阻焊桥的稳固性和完整性，嘉立创建议工程师在设计铜厚为1oz，阻焊油墨为白色的双面板时，焊盘间距最小不得小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "d6547bbe7cc9149df3b3690122ebbcaa:::04d2001deecc3915040ae23f4ac1a0f3"
                },
                {
                    "question_name": "下图所示是V割拼板的字符。为避免V割时损坏字符，那么，在设计时，字符边缘距离V割中心的最小间距d应满足哪个条件？（ ）",
                    "quesiton_option_md5": "89df860d19ed70d80b55d310cd2edb11:::7fadf5e1a7c0cc2b67478ac5bc97d596"
                },
                {
                    "question_name": "在对PCB板进行金手指斜边加工时，考虑到设备的限制，除了板子斜边方向的边长需要大于50mm之外，板材的厚度也是一个关键参数。请问嘉立创能够加工的金手指斜边产品，其板材的最小厚度应不低于多少？（ ）",
                    "quesiton_option_md5": "12e0874010eee4b9b6fadca07dd56ce6:::94a5aa1a54e98366a66f21688c4bdb26"
                },
                {
                    "question_name": "嘉立创为高多层阻抗板提供两种阻抗公差管控选项：常规管控和精密人工核算管控。其中，精密人工核算管控公差为±10%(小于50Ω±5Ω)。若选择常规管控，其阻抗公差是多少？（ ）",
                    "quesiton_option_md5": "1cd10fa354fb0a1633b03c7f08998a95:::70f49c377ce8a37ae3228bc127d38578"
                },
                {
                    "question_name": "PCB成品板厚公差是由原材料厚度公差和生产工艺综合决定的。当板厚≥1.0mm时，嘉立创生产的PCB成品板厚公差为？（ ）",
                    "quesiton_option_md5": "c49903642bbc65cd5a118bed7267a9cb:::f779a50a1a10abbbf19db4b9dcd36919"
                },
                {
                    "question_name": "PCB上的钻孔设置成以下哪个属性，嘉立创在制作PCB时，将会对孔径公差进行控制？（ ）",
                    "quesiton_option_md5": "eb9794482c4279d9a6a1dafea6fb0ac8:::06c5fe6b9e0b562232491849643495a8"
                },
                {
                    "question_name": "嘉立创可加工的双面、多层板最小过孔（Via）直径为0.15mm，然而，过孔直径小于0.3mm，出现似断非断的坏孔概率会比较高，为了管控小孔品质，嘉立创使用以下哪种设备对PCB进行检测？（ ）",
                    "quesiton_option_md5": "464f8226f85b10b42dfd3076b7769d56:::dabbc9e9e3c4c1e420b706c7fb07422e"
                },
                {
                    "question_name": "PCB金手指露铜，可能会诱发一系列品质隐患，电子工程师在设计PCB时，应注意相关生产工艺参数，保障产品品质。李工设计的PCB含斜边金手指，成品板厚为1.6mm，根据嘉立创提供工艺参数，金手指边缘（铜皮）与板边的间距为以下哪个参数，可能会导致金手指露铜？( )",
                    "quesiton_option_md5": "50583f74451de255ba382dde776ef632:::9cd403aeb5cbdfb4703263bedf9257b5"
                },
                {
                    "question_name": "根据产品需求，PCB的过孔(Via)可以设计成三种效果：两面盖油、一面盖油另一面开窗、以及两面开窗。考虑到嘉立创的工艺能力，以下哪种四层板的设计不适合进行过孔塞油工艺？（ ）",
                    "quesiton_option_md5": "79f0e9386cd19a87026e3e829a35d102:::e9998ea0b4ab0f05f72d264be11b23db"
                },
                {
                    "question_name": "在设计PCB时，工程师会设计出大小相同的钻孔，部分钻孔需要树脂塞孔，部分无需树脂塞孔。当PCB制造时，如果需求传达不清晰，易出现错塞孔或漏塞孔的风险。针对此类问题，下列描述中哪种方法最不容易出错？（ ）",
                    "quesiton_option_md5": "2c6f92bcb66eb70b30f9a6362e19c5bf:::0fa553834f6a5f4454193214cd62bc95"
                },
                {
                    "question_name": "在多层PCB布局设计过程中，为防止内层在压合时，由于内层较大空旷区域未铺铜或铺铜不足导致的PP（预浸料）树脂流向无铜区过多，进而引发板材偏薄、板弯板翘、铜皮起皱、缺胶或白斑、分层等质量问题，应如何选择内层的铺铜方式？假定设计条件允许，下列哪一图示的铺铜方式最优？（ ）",
                    "quesiton_option_md5": "833672029c4025f35df47d86f8b462e9:::cbb95ca7e5e2e428955dcc230ff269c3"
                },
                {
                    "question_name": "如图所示，在PCB设计中，为了在银白色导线区域实现露铜并进行喷锡处理，李工在完成顶层线路层导线设计后，还需在哪一层添加阻焊开窗设计？（ ）",
                    "quesiton_option_md5": "5b35080d7c6d40c9d485c4e282a572ea:::f656b848d279e0db24886e5c2965845f"
                },
                {
                    "question_name": "嘉立创加工PCB外形支持两种工艺：普锣和精锣。其中，精锣工艺要求PCB单片或拼板内设计有不同方位的定位孔（无铜孔）进行定位，以确保在加工过程中板子不会发生偏移。请问，定位孔的最小直径应该不小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "9421ed18a7f31350253b3ac7d5705c1d:::6ffc306012872410f3669a8aaee3cb97"
                },
                {
                    "question_name": "通过以下哪种方式优化设计，可改善图中所示的PCB断板隐患？（ ）",
                    "quesiton_option_md5": "71b6cce9333dd94775c3e61e89d8e233:::e1cef01d87e0c847562044f40781bdf8"
                },
                {
                    "question_name": "插件孔（Pad）成品孔径存在公差，张工设计的PCB含开关元器件，封装中间3个插件孔直径为1.0mm，嘉立创插件孔孔径公差范围为+0.13/-0.08mm，以下哪个成品孔直径不在允收范围内？（ ）",
                    "quesiton_option_md5": "4e79d6c1a9d3e831b69b5facc8b29e19:::e0e126686262c67f95ee0c6f57d000a0"
                },
                {
                    "question_name": "李工设计的6层PCB含IC元器件，封装焊盘间距0.16mm，成品铜厚为1oz，阻焊油墨为白色， 嘉立创是否能将该板IC元器件的阻焊桥做出来？（ ）",
                    "quesiton_option_md5": "e28b2e55797bd039412945b0045dc5b8:::98517a16b43db8d331e41cab0f8325a6"
                },
                {
                    "question_name": "线圈PCB制造难度比普通PCB更高，嘉立创可生产的常规工艺PCB最小线宽线距参数为0.09mm（3.5mil），而铜厚为1oz，线圈线路全部开窗沉金的线圈板，嘉立创可生产的最小线宽线距参数是多少？（ ）",
                    "quesiton_option_md5": "1ef07e57ca67a6d6c50c7d7137eb4cfa:::48e126a5cb5b035d517bf1075734396b"
                },
                {
                    "question_name": "PCB铜厚单位为盎司（oz），盎司是重量单位，1盎司约为28.35g。1oz铜厚是指将1盎司的铜，均匀平铺在1平方英尺面积上的厚度，1oz铜厚约等于以下哪个参数？(  )",
                    "quesiton_option_md5": "426343a12962cd8b2ed93f409a227bd9:::3b61503b194b98217752f59c9537a8a0"
                },
                {
                    "question_name": "为避免设计资料有歧义，导致PCB外形加工出错，工程师需提供唯一正确且规范的板框层（外形层）资料给PCB制造商，板框层资料包括以下哪些元素？（ ）",
                    "quesiton_option_md5": "108f38a00e649766de0727763f412c37:::a2835b8c2a751ccdbc6e89c4a6cb7cc3"
                },
                {
                    "question_name": "为避免PCB在生产过程中，经蚀刻或阻焊前处理工序打磨后，出现如下图所示的铜丝移位，并搭在其他网络的铜箔上带来短路隐患。在PCB铺铜布线过程中，尽量避免形成小于最小线宽的断头铜线（天线铜）。",
                    "quesiton_option_md5": "adb690ed461d6e47d5cde0efeb76e37c:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "李工设计的PCB铜厚为2oz，线宽线距满足嘉立创生产要求。在不修改资料和线宽线距参数的情况下，李工要求嘉立创按原资料生产铜厚为1oz的PCB，嘉立创也能正常生产。（ ）",
                    "quesiton_option_md5": "4d518776b20ee45a02260575a9c37b26:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "PCB行业应用最广泛的阻焊油墨颜色为绿色，LED灯板常使用白色与黑色油墨，除了以上三种颜色，嘉立创还提供哪些阻焊油墨颜色供用户选择？（ ）",
                    "quesiton_option_md5": "c891c30db94eaa772aa16e687cefe926:::55cc7cdd209806b30ebd406bc01e45be,9c9aabab3f7627ff4bb224b2738b26ea,52636511861a0e08cbe6a0eb1c27d816,ddb86dd31ce7580fe0c51651b28ba77d"
                },
                {
                    "question_name": "厚度小于0.6mm的PCB，由于自身特性，采用喷锡工艺易变形，从而导致出现焊盘表面喷锡不平整、锣板无法正常加工等问题。因此，厚度小于0.6mm的PCB采用下列哪种表面处理工艺更好？（ ）",
                    "quesiton_option_md5": "c257eaf0ceaed7d50bdc0802c857d4bf:::0185d8c71b434c1f76ff92063689be9c"
                },
                {
                    "question_name": "如图所示，李工在设计PCB时，将过孔放置在焊盘上，如果不选择盘中孔工艺，该PCB实物板容易出现什么问题？（ ）",
                    "quesiton_option_md5": "2c5b5802cfc1b4b5e91247452ea6fae2:::6f1c2eb3e2bbcc031af1e4785a21579d"
                },
                {
                    "question_name": "喷锡工艺PCB，嘉立创通常会在原金属化槽孔设计参数基础上，扩大0.15mm后再加工，确保孔在经过沉铜、表面处理等工序后，成品孔径变小，但依然能被控制在公差范围内。嘉立创加工金属化槽孔使用的最小锣刀直径为0.65mm，为保证产品能正常生产，嘉立创建议电子工程师在设计喷锡工艺双面板时，金属化槽孔最小槽宽，应不小于以下哪个参数？( )",
                    "quesiton_option_md5": "a905e70b4dada7afbf29008dfc20774b:::76d1fbc0e8dc84deb0cd73c0f611895e"
                },
                {
                    "question_name": "在嘉立创生产常规铜厚1oz的双面电路板，设计时为确保PCB板上的插件孔（Pad）有足够的焊环以便焊接元器件。金属化插件孔的焊环应满足以下哪项参数？（ ）",
                    "quesiton_option_md5": "7afcd76865177ae63f495778015d7afc:::e2493faac3b606d824ced9b7c9dcf066"
                },
                {
                    "question_name": "为了使实物板上的字符清晰可辨，工程师在设计PCB字符时，需参考制造商提供的工艺参数。嘉立创常规工艺可生产的正片字符参数范围是多少？（ ）",
                    "quesiton_option_md5": "06d7f2e3fe8a076887da7d13405b3339:::77aad22db8915f3eace5e93e47812054"
                },
                {
                    "question_name": "PCB制造商在加工非金属化槽孔时通常采用锣刀加工。为确保加工质量和效率，PCB制造商需要综合考虑锣刀的强度、稳定性和切割精度，以及断刀风险。基于这些因素，嘉立创建议在设计如图所示的非金属化槽孔时，槽宽最小不低于哪个参数？( )",
                    "quesiton_option_md5": "4a22cce870f0a05cf29ce0079aaf4282:::cf927077c1a4265b76897eeca49cf0c6"
                },
                {
                    "question_name": "嘉立创采用锣板方式加工PCB外形和槽孔，成品存在一定数值的公差，为满足用户对精度的要求，嘉立创支持“普锣”和“精锣”两种服务选择。李工选择“精锣”工艺，实物板槽孔长宽公差范围是多少？（ ）",
                    "quesiton_option_md5": "55ca00b9a9682365ac8ebf64f74d1739:::df91b2ddf3cd8dbfbefc9f8d6e2b7df1"
                },
                {
                    "question_name": "张工将定位孔属性设置成过孔（Via），PCB采用过孔盖油和喷锡工艺，以下描述错误的是？（ ）",
                    "quesiton_option_md5": "16c907b9b4b5d9f316b012e50311d9ab:::dd50bdd218702af80ca3c6b0bde41a23"
                },
                {
                    "question_name": "嘉立创使用“干膜封孔”工艺生产带焊环的非金属化孔，孔周边0.2mm范围内的铜皮会被掏空，确保干膜能封住孔。关于非金属化孔成品，以下哪些描述是正确的？（ ）",
                    "quesiton_option_md5": "4049b0321d94b6b40a1dcfec84e92673:::0cf9a398cd47f08d7dac423d3d60a8f7"
                },
                {
                    "question_name": "在PCB设计中使用覆铜技术时，可以选择大面积实心覆铜或网格线状覆铜两种基本方法。在经历高温过程，如波峰焊或回流焊时，如果基板内部的粘合剂挥发出的气体不能及时排出，大面积实心覆铜可能会出现起泡（鼓包）。以下哪种方法可以在PCB设计中避免上述问题的发生？（ ）",
                    "quesiton_option_md5": "6cd387ad9b8f07443997f3979d1020ea:::15f78fd965d5a040770265ef441ddd9a"
                },
                {
                    "question_name": "张工设计的PCB如图所示，焊盘中间有过孔。为避免实物板在焊接元器件时，焊盘漏锡影响焊接质量，PCB可采用以下哪种工艺制作效果更好？（ ）",
                    "quesiton_option_md5": "2cd086f26e740348c70b4749b87989d2:::af73e821ae4571f635052558468d1f02"
                },
                {
                    "question_name": "为保证成品PCB上的字符清晰可见，设计字符时需考虑最小工艺参数要求，字符高度与宽度的比应大于6:1。以下哪组字符参数，可能会导致成品板上的字符不清晰？（ ）",
                    "quesiton_option_md5": "4babd7a5814b372cbcad4b290fe2a372:::4218b6b46d2f5807ef689f6c9ef39e41"
                },
                {
                    "question_name": "沉金工艺在高多层板制造中扮演着重要角色。沉金工艺能提供更好的焊接性能和可靠性，使焊盘表面更平整。沉金厚度的控制对于焊接效果至关重要。目前，嘉立创免费将沉金厚度增加到2u\"的是哪一类PCB订单？（ ）",
                    "quesiton_option_md5": "5c5b663cb5638cf48dece67569ab1309:::655608fbedc20574a71def0aa381620c"
                },
                {
                    "question_name": "设计有阻抗要求的高多层板（4-32层），需要设置层压结构。嘉立创自研的PCB下单软件为工程师提供超500种层压结构参考，且最常见使用的层压结构不收费。以下哪种层压结构在嘉立创是免费的？（ ）",
                    "quesiton_option_md5": "f00d47186221a186194090d527a8d350:::4aa71ec3708a053c836972a977829cc3"
                },
                {
                    "question_name": "在PCB设计软件中，各层具有特定的作用和功能。以下哪一层的设计元素用于确保在PCB加工过程中，需要焊接的焊盘或需要开窗的区域不被油墨覆盖？（ ）",
                    "quesiton_option_md5": "b28ebd5ca1e5fa2be72d89c9a22223b0:::e846d57a1f72de100eca64dbee5a45bf"
                },
                {
                    "question_name": "李工设计了一款产品，外形如图所示，板边突出外形为2mmx6mm。考虑到需要使用V割拼板进行分板，哪种拼板设计可能在V割分板时引发板边崩裂品质问题？（  ）",
                    "quesiton_option_md5": "ee7f64da70a40ecb5fbde73f38e3320f:::bc0f1731c5d2349ccf9f146004961ce3"
                },
                {
                    "question_name": "孔的外径等于孔径加上单边孔环乘以2。如果需要设计一个孔径为0.3mm、单边孔环为0.15mm的Via（过孔），那么这个Via（过孔）的外径应该是多少？（ ）",
                    "quesiton_option_md5": "dc8882de10653553b3cf27ccc0524835:::9309cf1514c4b8950bc115d4bb8959fc"
                },
                {
                    "question_name": "PCB设计软件中的阻焊扩展参数，用于表示阻焊开窗单边需要扩大或缩小的数值。以下哪个图表示阻焊开窗单边比焊盘大0.05mm？（ ）",
                    "quesiton_option_md5": "cede9119f0ce153eb3f9e889053dcdfb:::ee6df7033a974fd2d6b73e2297a56fc1"
                },
                {
                    "question_name": "为确保半孔工艺的PCB品质，要先采用锣槽方式制作好半孔。在半孔边上，需预留2mm宽度以上的锣槽空间。下列选项中，哪种拼板方式不适合半孔工艺？（ ）",
                    "quesiton_option_md5": "137df0c80f8108b62b8320d00da0fdcc:::6d733a417adc86260abe423205eee768"
                },
                {
                    "question_name": "为保证产品的可制造性，提高产品良率，选择制作不同铜厚的PCB，需要注意线宽线距参数。从嘉立创提供的“最小线宽/线距工艺参数表“可以看出，线宽/线距与铜厚是什么关系？（ ）",
                    "quesiton_option_md5": "bb053f3e56fddb95304029b49b8ebd74:::44123548a0947fc567e3d324ca52a241"
                },
                {
                    "question_name": "嘉立创支持多种阻焊覆盖工艺，包括过孔盖油、过孔塞油，过孔开窗、盘中孔（过孔塞树脂/铜浆+过孔电镀盖帽）等，下图是哪一种阻焊覆盖工艺的展示效果？（ ） ",
                    "quesiton_option_md5": "599ba4f213ff7c3f6300548597cf9dcf:::45a10bfaa4d5b7f6520b292ae31ef264"
                },
                {
                    "question_name": "嘉立创压接孔孔径公差为±0.05mm。（ ）",
                    "quesiton_option_md5": "0ad686e48f5530e2fd4c20cc62680731:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "PCB设计时，在无布线区域采取均匀铺铜策略，不仅能降低地线阻抗，提高抗干扰能力，而且还能改善电气性能。此外，它还显著提升了PCB制造哪些方面的可靠性？",
                    "quesiton_option_md5": "9a202a3afb542ee15c2b036ae9dedbba:::17e3b586d47addbcb435d7379be5536d,84fed12c8ba5eb0cc4dcc104c3dc8532,e6f170d4d76ae325d81690591f8f522c"
                },
                {
                    "question_name": "嘉立创加工钻孔使用的最小钻头直径为0.15mm，常规直径为0.3mm。李工设计的单面板和双面板准备选择常规工艺制作，为达到提高产品良率，节约成本的目的，过孔（Via）直径设计成以下哪个参数更合适？( )",
                    "quesiton_option_md5": "7c2f6458695cf1ddd59b9cd7ec9e6111:::f04eafcce19cfb995a1a6d82b7521704"
                },
                {
                    "question_name": "PCB导电孔（Via）由孔和环绕孔的金属环（孔环/焊环）组成。单边孔环宽度的计算方式为，外径减内径，得到的数值再除以2。嘉立创可生产的导电孔（Via）最小单边孔环宽度是多少？（ ）",
                    "quesiton_option_md5": "f01c057e5d01fd24a60246d313e4b4dc:::f9e0da24ce0fa1750c3cd86419cf1381"
                },
                {
                    "question_name": "IC元器件封装相邻焊盘之间的间距，小于嘉立创最小阻焊桥工艺参数极限值，PCB成品可能会出现阻焊桥脱落等不良隐患。嘉立创建议工程师在设计铜厚为1oz的双面板时，如果阻焊油墨采用绿、红、黄、蓝、紫等颜色，需要保留完整的阻焊桥，焊盘间距最小不得小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "ee93536a84af5339b4df852c39fa3f70:::9e47fda622f116802ee4cbca8e314a40"
                },
                {
                    "question_name": "不同制造商可加工的PCB尺寸有所差异，常规情况下，嘉立创可加工的 FR-4材料的PCB最大尺寸是多少？（ ）",
                    "quesiton_option_md5": "ba4c0ec244c8c6b2c89210265c690a2c:::4b7c8a31a3dd3d9c99cc898e6ccf616a"
                },
                {
                    "question_name": "PCB实物板阻抗与理论值存在一定数值的公差，工程师设计的PCB阻抗值小于50Ω，该PCB嘉立创生产的实物板最小阻抗公差是多少？（ ）",
                    "quesiton_option_md5": "4b3ebda4c401566c456905c594867078:::65ede7a85aae994673a164206d684641"
                },
                {
                    "question_name": "在PCB制造过程中，使用V割分板很高效，但分板后常会在边缘留下由基材形成的毛刺，影响产品的外形尺寸精度。根据嘉立创的工艺参数，生产采用V割拼版的PCB，V割外形分板后的尺寸公差范围是多少？（ ）",
                    "quesiton_option_md5": "67e9d1b937698ddcfeaca1e1f582f835:::fd7437ffff6dfe214d55f493e69e9520"
                },
                {
                    "question_name": "PCB上的钻孔设置成以下哪个属性，嘉立创将在制作PCB时，对孔径公差不做控制？（ ）",
                    "quesiton_option_md5": "3a9adb3d84fbac1386a4b97cfdeff084:::90847f67af3e9cef72cace54dacf46c4"
                },
                {
                    "question_name": "在PCBLayout软件中设计焊盘孔时，按下图所示的设计，如果勾选“plated(电镀）”选项，或者“金属化选项”选“是”。那么生产出的PCB成品孔径与下列哪个选项的展示效果相同？（ ）",
                    "quesiton_option_md5": "dca96d98c83ae5202fc3a11b09ce96e6:::06576b1756142b1d3703e3332e2006e7"
                },
                {
                    "question_name": "在多层PCB设计中，含金手指封装且板厚要求严格的PCB，若金手指对应的内层区域比较空旷，将导致成品PCB金手指区域的板厚偏薄。这可能会引发哪种问题？（ ）",
                    "quesiton_option_md5": "d7da8bf9dadc301401b0409567ce33dc:::e5dd185c2f960844fa6c44837b9ef153"
                },
                {
                    "question_name": "林工在PCB设计软件的顶层字符层（丝印层）设计了整面字符块，底层没有字符，成品板在“白油黑字”工艺下，将呈现以下哪种效果？（ ）",
                    "quesiton_option_md5": "4a225835dfa816ac25dc756796c5a876:::061a9108aed79d035f47cbf93b895ac6"
                },
                {
                    "question_name": "在设计PCB外形槽孔时，为防止在铣削过程中，铣刀的外力作用到基材上，进而造成相邻的两个非金属槽孔之间发生断裂，建议非金属槽孔之间的最小间距应不低于多少？（ ）",
                    "quesiton_option_md5": "538da193ea386674a5cd9642a58d8664:::2699a441a6cf2657509b563dd16a5a7c"
                },
                {
                    "question_name": "PCB采用V割（V-cut）方式拼板，槽孔与板边的间距小于1.5mm，分板时槽孔容易出现崩裂隐患。张工设计的PCB槽孔与板边的间距小于1.5mm，以下哪种拼板方式，容易导致实物板分板出现崩裂隐患？（ ）",
                    "quesiton_option_md5": "74a9d59c8fb7a3511c0a85afe17e49e5:::3ec2cf7ff016f07cbb5025f9cbbdd7ee"
                },
                {
                    "question_name": "过孔(Via)参数为内径0.3mm，外径0.6mm，该过孔的孔环宽度是多少？（ ）",
                    "quesiton_option_md5": "2eac0e6c14955aeea3f2c1783af6e2bb:::dc3b8fa787e74b925f4a815bca037291"
                },
                {
                    "question_name": "李工在软件顶层阻焊层设计了如图所示的天线，采用沉金工艺的成品PCB天线位置只有阻焊开窗露出基材。请问，该如何优化PCB设计文件才能实现成品PCB天线部分有铜箔并沉金？（ ）",
                    "quesiton_option_md5": "88cf7ca858259104ce7a89874f2e90fa:::2cbcd3270e460c7d85ba0223dfecda03"
                },
                {
                    "question_name": "由于铜基板基材硬度较高，加工槽孔所使用的锣刀直径越小越容易折断，导致生产时需要频繁换刀，影响产品正常生产和品质，因此在设计铜基板时，槽孔不宜设计得太小。嘉立创可加工的热电分离铜基板最小槽孔宽度w是多少？（ ）",
                    "quesiton_option_md5": "bcdd33158549f7dde13dc01bc5d10951:::33f2ee3b92aad19310e2b3e2ee1ae91c"
                },
                {
                    "question_name": "在PCB行业中，如无特殊说明，PCB厂商用来描述基本工艺参数时所说的常规铜厚是？（ ）",
                    "quesiton_option_md5": "868bfd6d8c312189574dafdfba3675f9:::8fd38c4ee458cc862e76eb61a306fbde"
                },
                {
                    "question_name": "设计灯板通常选择什么颜色的阻焊油墨？（ ）",
                    "quesiton_option_md5": "7e7b19b2ad9864832ccc81a242d8d7f2:::2350558e36f3fc9c65815b4dde1464a6"
                },
                {
                    "question_name": "从可焊性角度出发，在PCB设计过程中，为了避免焊盘在焊接时由于大铜皮的散热过快而导致焊接温度降低，影响焊接质量，大铜皮上的焊盘设计成图B更有利于焊接。（   ）",
                    "quesiton_option_md5": "b9e80d297b08241c41d684d20c584c3e:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "实物板焊盘周围被喷锡，这是因为PCB阻焊开窗设计得太大，导致焊盘周围露出的铜皮被喷锡。（ ）",
                    "quesiton_option_md5": "55daf5e9e8622b66cbdbc41510dea689:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "以下哪些选项是嘉立创可加工电路板的板材类别？（ ）",
                    "quesiton_option_md5": "de0f200b8263dcb7dd5f060053e00087:::b3de81be53c6edf8d3829269ad0b0092,4d9de52b111051f3c4dce16a54473e27,26faea1f3d6f600daef84de0d66e2e93,08d838e1945c51cbd15c66424967df53,cfb0c05401778716b4e7b218e146e6b4"
                },
                {
                    "question_name": "PCB加工中，导线间距太近且空旷区域铺铜分布不均，可能导致电镀过程中电流密度失衡，从而引起镀层厚度不均和渗出。这被称为“镀层夹馍”。它会引发蚀刻前的退膜不净，导致残铜和短路问题（如图所示）。为防止在电镀阶段出现电流密度失衡导致的‘镀层夹馍’问题，应该如何优化PCB设计？",
                    "quesiton_option_md5": "fe88e2670c7777e1136a39140be1ac8d:::60dd2cb338fe39146747b681c104fbc3,e2fe70265fce1a398b20a3c96847cc01"
                },
                {
                    "question_name": "嘉立创支持多种阻焊覆盖工艺，包括过孔盖油、过孔塞油，过孔开窗、盘中孔（过孔塞树脂/铜浆+过孔电镀盖帽）等，下图是哪一种阻焊覆盖工艺的展示效果？（ ）",
                    "quesiton_option_md5": "f9e078c0524554d0c8bcd8ac3ff44a88:::7f18594c72751eebe9ef9092a99b53d6"
                },
                {
                    "question_name": "嘉立创双面板钻孔能力全面升级，可加工最小钻孔直径为0.15MM，然而，直径小于0.3mm的钻孔存在加工难度大，效率低，需要增加四线低阻测试管控品质，成本较高等问题，在设计条件允许的情况下，嘉立创建议工程师尽量将过孔（Via）直径设计成不小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "38284da65d208b1f38dbcc0c76ea1173:::cdf5dc66792f42f643e8ab7e2dffeb46"
                },
                {
                    "question_name": "铜厚为1oz的多层板，嘉立创可制作的金属化插件孔焊环参数是多少？（ ）",
                    "quesiton_option_md5": "ac705a0b8077d7e29cbbe311d0b2aa3f:::ba9b47c8e5987d368f4526ba889144c9"
                },
                {
                    "question_name": "IC元器件封装相邻焊盘之间的间距，如果小于嘉立创最小阻焊桥工艺参数，实物板成品可能会出现阻焊桥脱落现象。为保留完整的阻焊桥，嘉立创建议工程师在设计铜厚为1oz，阻焊油墨为黑色的双面板时，焊盘间距最小不得小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "16d3da2527ca7464c221f032ab4f90b5:::04d2001deecc3915040ae23f4ac1a0f3"
                },
                {
                    "question_name": "PCB字符可设计成正片字体和负片镂空字体（如图中的“Hub”），为了使实物板上的字符更清晰，设计时需要注意字体相关参数不宜太小，以下哪个选项为嘉立创可加工的最小镂空字参数？（ ）",
                    "quesiton_option_md5": "ede0b5e3ce95d8bf3c470cd612980b40:::4c5d6c3a6edd517e6b996ff73b291940"
                },
                {
                    "question_name": "受加工设备限制，FR-4 PCB板厚不同，嘉立创可加工的PCB尺寸有所差异，PCB厚度大于或等于0.8mm，最大可加工尺寸为长670mm，宽600mm，当PCB厚度小于0.8mm，嘉立创最大可加工尺寸是多少？（ ）",
                    "quesiton_option_md5": "6743c1e5285e15f0a73702131638d11c:::5ac500a3d3239fa8d8a262f65ccdb793"
                },
                {
                    "question_name": "嘉立创制作的压接孔公差参数为±0.05mm，李工设计的6层沉金PCB压接孔直径为1mm，以下哪个选项的成品压接孔直径在公差范围内？（ ）",
                    "quesiton_option_md5": "1226e55385299f84c6c112d51454de01:::8499b0f76bd5c14ccabd3de4d6c3ff33"
                },
                {
                    "question_name": "PCB成品板厚公差是由原材料厚度公差和生产工艺综合决定的。当板厚<1.0mm时，嘉立创生产的PCB成品板厚公差为？（ ）",
                    "quesiton_option_md5": "2162fbd8675589592d0f030fad96153f:::df91b2ddf3cd8dbfbefc9f8d6e2b7df1"
                },
                {
                    "question_name": "张工设计的PCB如图所示，蓝色过孔(Via)与红色贴片焊盘(Pad)距离近，部分过孔位于焊盘边缘。张工在下单时选择过孔盖油工艺，嘉立创直接按资料生产，可能会发生哪些状况？（ ）",
                    "quesiton_option_md5": "e626596388f78c87284bec2f2e788925:::b1118d9b82f6512e9d8b1195f119a0e5"
                },
                {
                    "question_name": "在PCB设计中，残铜率是指蚀刻过程后在PCB表面保留下来的铜面积与整个板面积的比例。残铜率的设定对PCB制造的质量和最终产品的可靠性有着重要影响。若残铜率设置过低，它可能会给PCB的制造过程带来哪些不良影响？（ ）",
                    "quesiton_option_md5": "56341f784493e370d51a331270b64843:::e22fad6d96d0a9b64b122aa3fb614a6b"
                },
                {
                    "question_name": "嘉立创的盘中孔工艺解决了BGA扇出难的问题。在未选择盘中孔工艺的双面PCB中，采用过孔散出设计时，为规避过孔塞油过程中出现油墨上焊盘等风险，BGA封装内的过孔边缘与BGA焊盘边缘之间的最小距离需要保持多少？（  ）",
                    "quesiton_option_md5": "54120d169d711599e2f34ceba5881a25:::a8aca3b4aefdaf83c708b1f38ead3bf7"
                },
                {
                    "question_name": "为确保字符的可制造性，字符与焊盘间的最小距离通常不小于0.15mm，以避免字符上焊盘或字符残缺。如下图所示的两种设计，直接按资料生产，哪种设计的字符可以被完整保留？（ ）",
                    "quesiton_option_md5": "dcc8019a9504c359eaa76d6435f91b77:::ee6df7033a974fd2d6b73e2297a56fc1"
                },
                {
                    "question_name": "PCB的阻焊开窗，可以通过修改阻焊扩展数值实现调整，张工将双面板插件孔顶层和底层阻焊扩展数值，设置成“+0.05mm\"，关于该PCB实物板的阻焊开窗，以下哪个描述是正确的？（ ）",
                    "quesiton_option_md5": "787ceca896ab61b7f76d10845052336d:::9372d183a8a38dcd7ab7ac4697837391"
                },
                {
                    "question_name": "PCB采用邮票孔方式拼板，为避免加工或运输过程中出现如图所示的断裂隐患，嘉立创建议工程师在设计邮票孔PCB时，需要根据板子的实际情况添加邮票孔，尺寸越大，板厚越薄，邮票孔个数、连接位和连接位宽度应随之增加，确保连接位有足够的强度，邮票孔通常5-8个为一组，相邻邮票孔边缘间距应满足以下哪个参数范围？（ ）",
                    "quesiton_option_md5": "27944e5a0206a841c661eb9f51dd124b:::df35607f0ae324465ee40fa1b753e188"
                },
                {
                    "question_name": "小李设计双面喷锡板，产品下载调试接口使用了一款如图所示的排针，引脚横切面长宽均为0.64±0.02mm，对角线理论值为0.905mm，在设计焊盘封装钻孔内径时，应不小于以下哪个尺寸？（     ）",
                    "quesiton_option_md5": "a44447e4273c987b23bb52bd5a58589f:::facc475ab86a7d66ee1746f4ae7e2f03"
                },
                {
                    "question_name": "不同PCB制造商可加工的半孔板尺寸有所差异，嘉立创可加工的单片（PCS）半孔板最小长宽为以下哪组参数？（ ）",
                    "quesiton_option_md5": "adb87e8e81bc47a6585ede9d2bc0d326:::1f8e1788600fd97d9989544483687bd9"
                },
                {
                    "question_name": "设计PCB时，如果用过孔（Via）代替插件孔（Pad），采用\"过孔盖油\"工艺制作的PCB，成品焊盘会被阻焊油墨覆盖，无法焊接元器件。（ ）",
                    "quesiton_option_md5": "fa893333ea660e37017bd445103bb5a0:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "李工设计的喷锡工艺PCB如图所示，嘉立创在处理工程资料时，会对过孔（Via）和金属化插件孔（Pad）进行以下哪些操作？（ ）",
                    "quesiton_option_md5": "59be392c65dee74fdb5b843ed62bf730:::b0084e55a9827d57e6d9f30d192aa0e6,23c800815e7c34c668b10509c4f3c363"
                },
                {
                    "question_name": "Solder层即阻焊层，俗称开窗层，表示实物板对应的区域开窗，没有阻焊油墨，如果阻焊层叠加在线路层上，则实物板对应区域为焊盘。PCB设计软件库内的元器件已经画好了封装，封装阻焊开窗面积通常比焊盘大，这是为了防止实物板在生产时，因对位存在公差，导致油墨印在焊盘上，影响后续元器件焊接。随着工艺设备技术的发展，PCB生产精度也在不断提高，嘉立创采用LDI设备生产高多层板，能达到以下哪个精度？（ ）",
                    "quesiton_option_md5": "87056405223e662aa96b600278b3ded9:::afba1d4fe6f50f99e11236a57811df81"
                },
                {
                    "question_name": "在PCB设计与制造行业，\"常规参数\"是指根据这些参数设计和选用1oz成品铜厚的材料，PCB制造商生产难度小，且无需增加额外加工成本。根据嘉立创的生产工艺，以下常规的过孔内外径参数是哪一组？（ ）",
                    "quesiton_option_md5": "8b667ef166fce6fa8eabb8b0d92dc59a:::44cbbea448beda731b0f2713b8659c7b"
                },
                {
                    "question_name": "在PCB设计与制造行业，\"常规参数\"是指根据这些参数设计,选用1oz成品铜厚的材料，绝大多数PCB制造商生产难度小。请问，根据嘉立创的生产工艺，双面板线宽线距的常规参数是？( )",
                    "quesiton_option_md5": "5e1bb2efa778747a8b07ba35bfff96d3:::8817100f8510dcb1c1bc60f03439f3ab"
                },
                {
                    "question_name": "嘉立创采用锣板方式加工PCB外形和槽孔，成品存在一定数值的公差。为满足用户对精度的不同要求，嘉立创提供“普锣”和“精锣”两种工艺选择。PCB选择“普锣”工艺，成品槽孔长宽公差范围是多少？（ ）",
                    "quesiton_option_md5": "eb5e73e40b052918ab85f7d3484ab71c:::70522a4f6dc86a8377a846e1f8d0ba48"
                },
                {
                    "question_name": "槽长小于两倍槽宽的槽孔，行业称之为短槽，加工短槽容易出现因槽刀受力不均，导致实物板槽孔出现有倾斜角度的偏孔，可能会影响后续元器件正常插接，为降低此类隐患出现的概率，嘉立创建议工程师在设计PCB时，槽孔的长宽应尽量设计成以下哪个比例？（ ）",
                    "quesiton_option_md5": "97525a776e2b976fba9a81110ef22ad4:::0f852306c54cbbca71c2241662d1e3ed"
                },
                {
                    "question_name": "嘉立创无法通过Gerber文件区分过孔（Via）和插件孔（Pad），为避免这两类孔被搞混，李工在输出Gerber文件之前，需要在设计软件中设置好孔属性并检查资料，以下哪个操作是正确的？（ ）",
                    "quesiton_option_md5": "677315504b98b0d7ca0b17da3487956a:::d324ee2524f42a7ef7fe4180adaa84bb"
                },
                {
                    "question_name": "IPC-A-600J标准如图所示，对PCB字符的要求为“清晰可辨”，没有严格区分1、2、3级标准。嘉立创生产的PCB参考IPC标准验收后出货，以下哪些描述符合IPC-A-600J的字符可接受条件？（ ）",
                    "quesiton_option_md5": "bd945fc58305de7675989515abba0ea7:::11599502c3be5110b5467ea25ef86113"
                },
                {
                    "question_name": "PCB制造工艺中，在布线较少的内外层区域内增加铺铜，可预防因铺铜不均致使PCB在受热过程中发生板材翘曲。请问，下图中两种布线方式，哪一种能更好地预防板材翘曲？（ ）",
                    "quesiton_option_md5": "5cf9b03e86f48c82ba8a9d41bb57c636:::8a68c7643065119a2ccf860543dbbda8"
                },
                {
                    "question_name": "在使用嘉立创的包边工艺制作金属化方槽时，由于工艺限制，直角位置不能形成完美的90度直角，如图所示，方槽的四角将会形成圆弧。请问这些圆弧处的最小半径是多少？（ ）",
                    "quesiton_option_md5": "4375d0177da7cd405b33c5f3ee6e4132:::cdf5dc66792f42f643e8ab7e2dffeb46"
                },
                {
                    "question_name": "嘉立创支持加工金属化矩形槽孔，受工艺和加工设备限制，槽孔的四角不能做出90°直角，而是带有一定弧度的R角。李工设计的PCB含金属化矩形槽孔，为了使实物板上的矩形槽能更趋近于直角，他需要以图片的形式将金属化槽孔的位置标注清楚，并将图片和PCB制板文件打包成压缩包，上传至嘉立创下单系统，且下单时需要选择以下哪种工艺？（ ）",
                    "quesiton_option_md5": "c652cdb2886b8a4b8966a01b8f5a4f6e:::340ae48ecfaeb1b33defc6ed7e08bc0a"
                },
                {
                    "question_name": "生产PCB使用的机械钻头，其单位可分为公制和英制两大类，公制钻头按以下哪个固定数值递增或递减？（   ）",
                    "quesiton_option_md5": "6119f5c91b6f2ebece4d489bfb3cf3dd:::f9e0da24ce0fa1750c3cd86419cf1381"
                },
                {
                    "question_name": "嘉立创针对Layout过程中的\"小空间布线难\"问题推出了盘中孔工艺，包括“树脂塞孔+电镀盖帽”和“铜浆塞孔+电镀盖帽”。哪种工艺在导电性和导热性能方面更优秀但价格相对较高？（ ）",
                    "quesiton_option_md5": "a992971aacaa3c131fdfa00d9ae39786:::a18d03f6426fa70ba5b2af152b75e973"
                },
                {
                    "question_name": "过孔（Via）是PCB不可或缺的要素之一，如果不是出于功能需求，将PCB铺满过孔，会影响板子的机械性能，导致PCB容易发生变形。（ ）",
                    "quesiton_option_md5": "db592e42e02cb78e4ace33858d74c2b0:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "关于“沉金”，“有铅喷锡”和“无铅喷锡”三种表面处理方式，以下哪些描述是正确的？( )",
                    "quesiton_option_md5": "cd88f66a4edbe1909ce1395bc723689c:::9ec3de0cbbb939eb4c9fa0ac5fa24cad,a1cf4fcb335c916ca26847bd3c4322a7,61c350a92006f76ed6a1b936828b05d9"
                },
                {
                    "question_name": "设计PCB，尤其是精密的高多层板，Layout工程师经常会受空间限制，难以布线。嘉立创对6层及以上高多层板，推出免费盘中孔工艺，工程师在设计时，可将过孔放在BGA及焊盘上，布线更顺畅，PCB外形美观且性能更强。以下哪个选项是PCB采用盘中孔工艺所呈现的效果？（ ）",
                    "quesiton_option_md5": "4b5d8ed1b2611d964932fb9fdfad5453:::57729f23b7a480408a3d5dc5bb27551e"
                },
                {
                    "question_name": "在PCB加工过程中，导电孔的孔环宽度由（有孔焊盘外径-内径）÷2计算得出。由于钻孔和对位存在公差，孔环越小，越容易出现偏孔和破孔现象。嘉立创对过孔的孔环要求是，过孔(Via)外径至少要比内径大多少？( )",
                    "quesiton_option_md5": "31e42e01ed131bad07146af9cc612adc:::8036f408a0bcea997cea1ef1d970dff0"
                },
                {
                    "question_name": "加工PCB外形通常采用锣板方式，锣板存在一定数值的公差，靠近板边的位置如果有导体（铜皮、焊盘和导线等），锣刀可能会割伤这些元素，出现板边露铜、开路等隐患。嘉立创常规锣板公差为±0.2mm，为避免板边露铜，建议工程师在设计单板出货的PCB时，导体与板边的最小间距，应不小于以下哪个参数?（   ）",
                    "quesiton_option_md5": "d4468ee9d0e9b27e83b09cadb93cccdb:::ab9a5b0283e1f620f1f5d9e8481b891d"
                },
                {
                    "question_name": "阻焊对位存在一定的公差。为避免焊盘被阻焊油墨覆盖，在设计阻焊层时，阻焊开窗区域需要比焊盘大一些。在嘉立创加工的PCB ，除了高多层板可以实现阻焊与焊盘1:1（也称为零开窗）外 ，双面板阻焊开窗区域单边至少需要保留多宽？（ ）",
                    "quesiton_option_md5": "4d35c53545f928de44de20532f7edf53:::ca228da456b741b7e800ec1971041477"
                },
                {
                    "question_name": "嘉立创为满足客户需求，推出了高精字符工艺。虽然这项工艺允许使用比常规工艺更小的字体尺寸，但仍有最小参数限制以确保成品字符的清晰度。以下哪种参数是必须满足的最小要求？（ ）",
                    "quesiton_option_md5": "b079e97bd699649c3211996c8c406f1a:::63878b8b7b30a702a4344bf34dc597f9"
                },
                {
                    "question_name": "以下哪个选项表示“过孔盖油工艺”所指的“过孔”？（ ）",
                    "quesiton_option_md5": "55315696f2a80bcedd08c7dc97d7445f:::d794d3f7b3a0a8fdbd7582f6cacb5de0"
                },
                {
                    "question_name": "在处理PCB的CAM资料时，为避免因同网络铜箔间的细小间隙产生干膜碎片而影响线路品质，会使用软件自动填充这些小间隙。若蛇形信号线间距过小，可能导致中间的间距被填充，进而出现如下图所示的品质问题。基于此，嘉立创建议，如图所示的蛇形信号线间距不小于哪个参数为最佳？",
                    "quesiton_option_md5": "228a107b838a7ac978899e1bb19f5d66:::f9f1387bbfb6344f85df73220b94ec06"
                },
                {
                    "question_name": "在Layout设计过程中，进行内层布线时，需特别注意内层导线和铜皮与过孔(Via)的钻孔边缘间距，其最小不低于以下哪个参数？（ ）",
                    "quesiton_option_md5": "843d90598df71ad0b4610e28a3fd50f6:::ab9a5b0283e1f620f1f5d9e8481b891d"
                },
                {
                    "question_name": "PCB采用邮票孔方式拼板，为避免加工或运输过程中出现如图所示的断裂隐患，嘉立创建议工程师在设计邮票孔PCB时，需要根据板子的实际情况添加邮票孔，尺寸越大，板厚越薄，邮票孔个数、连接位和连接位宽度应随之增加，确保连接位有足够的强度。多个邮票孔为一组，单组邮票孔最少需要设计几个孔？（ ）",
                    "quesiton_option_md5": "294dd3cb08529e06126beac848113609:::e391a1e2c2ef91ef1fe35ed393baf82e"
                },
                {
                    "question_name": "李工在PCB天线模块的顶层阻焊层设计了开窗，顶层线路层对应位置没有设计铜皮，实物板如右图所示，天线位置开窗露基材，没有被喷锡，出现这一现象的原因是？（ ）",
                    "quesiton_option_md5": "0d5f6af2f5fe89c489ee9eb29edfc43e:::cba537cbc3a1ac3ed71e53dec8da862f"
                },
                {
                    "question_name": "单面铝基板焊接完所有元器件，通电后不易出现短路隐患的是以下哪款设计？（ ）",
                    "quesiton_option_md5": "29a9703ceae06e9cb3eaf73db4a696a7:::ae40c14cab095b8495308234a2ccf95b"
                },
                {
                    "question_name": "PCB内含有Logo、特殊字体的汉字等元素，可能会因软件字体不兼容而发生变形，为减少出现这类隐患，可将文件导成Gerber资料再发送给PCB制造商加工。（ ）",
                    "quesiton_option_md5": "a3ebd514b8e81447f730d8757573517d:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "李工将过孔（Via）设计成两面开窗，成品板过孔需要实现堵孔效果，过孔塞油工艺无法达成李工的需求，而盘中孔工艺（树脂塞孔+电镀盖帽）可以实现堵孔效果。（ ）",
                    "quesiton_option_md5": "69a35dc969663e2b79083a90cf99a5f8:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "FR-4基材的PCB，嘉立创支持哪几种表面处理工艺？（ ）",
                    "quesiton_option_md5": "6e4d30d1f1e9662c92d434e7bcc1058b:::cb9180268882d6911b581fad0397ca4c,2bc44bba491bb6a8fe3b30187e4a52f8,6f5052852d7e2c1abda03f9a3d0e9fc9"
                },
                {
                    "question_name": "根据嘉立创的最小线宽线距工艺参数，下列哪一组参数能在嘉立创生产铜厚2oz的双面板？（ ）",
                    "quesiton_option_md5": "68551ec3b1e3d700ff4b6a74fb584d0c:::9749cacefa57fedf29b6669a9f297add"
                },
                {
                    "question_name": "为满足用户对外形精度的要求，嘉立创提供“普锣”和“精锣”两种工艺给用户选择。单片（PCS）PCB采用“精锣”工艺生产，嘉立创可加工的最小长宽是多少？（ )",
                    "quesiton_option_md5": "9424113b4f844f82a110500b728f5b9a:::d4d62722ba64191b4ec8ef13c3c95573"
                },
                {
                    "question_name": "受生产工艺影响，成品PCB导线宽度（线宽）可能比设计参数大，也可能偏小。IPC-A-600J标准显示，导体（导线）宽度公差为±20%，李工设计的PCB线宽为0.2mm，实物线宽为以下哪个参数，不符合IPC允收标准？（ ）",
                    "quesiton_option_md5": "09b02af48fe61227f2739d358e3ed654:::dc3b8fa787e74b925f4a815bca037291"
                },
                {
                    "question_name": "板厚存在一定数值的公差，嘉立创板厚公差参数为：板厚不大于1.0mm，板厚公差为±0.1mm。刘工在下单时选择制作板厚为0.8mm的PCB，以下哪个成品板板厚在公差范围内？（ ）",
                    "quesiton_option_md5": "52cefb8295394d073b38003b247bd523:::99c89671f19fdb049d89af193fd3acb1"
                },
                {
                    "question_name": "直径小于0.3mm的钻孔，在PCB行业被称为微小孔。随着钻孔孔径的减小，加工过程中可能会出现材料分层、孔壁损坏、毛刺等缺陷，这些问题会导致电镀沉铜环节中的坏孔隐患。以下哪种形态的坏孔难以用常规方式检测，可能给产品带来潜在的巨大隐患？( )",
                    "quesiton_option_md5": "bfe73f063e7b1d01ba760e1525062494:::c8cceddd97ecce677e869f209bed47c7"
                },
                {
                    "question_name": "小王在实地考察PCB制造商时了解到，在设计PCB过孔(Via)时，为控制加工成本，过孔直径不小于0.3mm。然而，在过孔盖油工艺中，孔径越大，出现孔口发黄的现象越明显，尤其是当孔径超过0.5mm时，这一不良现象将更加显著。基于控制成本和减少孔口发黄现象的考虑，以下哪个选项更适合作为过孔(Via)的直径？（ ）",
                    "quesiton_option_md5": "2c92c5febfd16f470908e4e5a65935ff:::c90cd85b227a991ef671cbc22190d19e"
                },
                {
                    "question_name": "在软件哪一层设计插件孔(Pad)，孔属性和参数会在打孔图(分孔图)中显示？（ ）",
                    "quesiton_option_md5": "f60e0fb35106110f951bca8c1a7b09ef:::9053f6770419193779b640e1f53d60fb"
                },
                {
                    "question_name": "PCB铺铜设计得不均匀，实物板容易出现变形，背后的原理是什么？（ )",
                    "quesiton_option_md5": "37c54a0b2e106d7a4a9b2cfe83c8306f:::e22fad6d96d0a9b64b122aa3fb614a6b"
                },
                {
                    "question_name": "元器件如图所示，引脚直径为0.6mm，工程师应将对应的插件孔（Pad）直径设计成以下哪个选项？（ ）",
                    "quesiton_option_md5": "86aca1c157986c0310e91a8e039763f7:::d79ec5610ef568fa3f32c7ef1d813d49"
                },
                {
                    "question_name": "受设备限制，嘉立创可加工的最大热电分离铜基板尺寸是多少？（ ）",
                    "quesiton_option_md5": "4b2a069befa474b9652844a3d5348071:::f71f6bd40b64e37e0164a5279e151daf"
                },
                {
                    "question_name": "嘉立创部分工艺参数标有“推荐值”和“极限值”，比如“金属化插件孔焊环宽度，双面板不小于0.25mm（推荐值），极限值为0.18mm”，以下描述正确的是？（ ）",
                    "quesiton_option_md5": "98bba07c58702b47776130121d83ef1c:::d5a8db78c0d4eda506b8ecff91f839f4"
                },
                {
                    "question_name": "以下哪个选项是PCB行业中常提到孔环（焊环）环宽？（  ）",
                    "quesiton_option_md5": "d0d4526f9a7c9532e0f98293a16b2526:::06f178bc4d2a2d85ee2604aafe880dca"
                },
                {
                    "question_name": "PCBV割加工路径为直线，中途无法拐弯，李工如果将PCB拼板设计成图1，会导致成品板在V割加工环节报废。图2所示的邮票孔拼板方式可节省材料，加工PCB不会报废，但成品板分板后，板边会有残留毛刺。图3所示的拼板方式有利于产品加工，外形品质更好，但需要添加工艺边，拼板面积比图2大。（ ）",
                    "quesiton_option_md5": "71d7e383e241da6595c3a80cb20b4662:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "罗工在设计PCB时，在外形槽的四个角设计了直径为0.6mm的非金属化孔（绿色箭头所指区域），有利于清除实物板直角位置的残留基材（R角），减少残留基材对产品装配造成影响。（ ）",
                    "quesiton_option_md5": "d45de374091bc850c3757437a684847b:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "在嘉立创，4~32层的多层PCB板材的可生产厚度随着层数的增加而变化，目前下单系统中，四层板的最小厚度可达0.6mm，32层板的最大可选生产厚度是多少？（ ）",
                    "quesiton_option_md5": "4f74c381320b2fa6f2a14114e4d0627c:::066f84a2bb570bd1a850352d9c389f36"
                },
                {
                    "question_name": "相信大家对BGA这种封装形式都非常熟悉，BGA的焊盘小且密度高，对PCB制造提出了更高的要求，嘉立创可生产的BGA焊盘最小直径是多少？（ ）",
                    "quesiton_option_md5": "bf08f304de4abe18a688753193c1a78a:::11fe152937b8e53179f77d151219fd32"
                },
                {
                    "question_name": "嘉立创使用LDI曝光机生产精密高多层PCB，可以实现阻焊开窗与焊盘1:1。为保证产品能正常生产出阻焊桥，设计铜厚为1oz，阻焊油墨为白色的多层板，焊盘间距不得小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "46df9793a345a42c6513bb214b84a569:::58eb9c18a64902f439fe1a1a8c70361a"
                },
                {
                    "question_name": "张工设计的金属化插件孔直径为0.8mm，嘉立创金属化插件孔公差为+0.13/-0.08mm，以下哪个实物孔直径符合公差要求？（ ）",
                    "quesiton_option_md5": "2ed1a57b2069d24f24ebfda65a87231d:::0cdb044aba95f978ff4955e08173bfda"
                },
                {
                    "question_name": "设计PCB插件孔，如果用过孔（Via）代替元器件孔（Pad)，选择过孔盖油工艺，按孔属性生产PCB会发生什么事？（ ）",
                    "quesiton_option_md5": "0f22d9994e83061fe373fb8a73e1147d:::b9cc203809d831afec674d16959f66e8"
                },
                {
                    "question_name": "元器件引脚直径为0.7mm，李工按该尺寸将插件孔（Pad）直径设计成0.7mm，在嘉立创制作出来的第一批PCB，可正常插接元器件，第二批PCB却不能。经测量，成品孔直径在0.625mm到0.675mm之间不等，此类责任归属于哪一方？（ ）",
                    "quesiton_option_md5": "e2f4f2ca0b9f4d615490efe5ce06b719:::f5eff2d698df701207466ca37160637a"
                },
                {
                    "question_name": "过孔塞油工艺比过孔盖油工艺更为复杂，涉及将沉铜后的孔通过铝片和专用塞油丝印机填充油墨，并在此后进行整板印刷阻焊油墨，以确保过孔填充的一致性。此工艺虽然成本较高，但其成熟与稳定性使其在特定场合下更受青睐。嘉立创对哪类PCB订单免费提供过孔塞油工艺升级？（  ）",
                    "quesiton_option_md5": "cb3fa2df4761cff9cbd57ec95a922828:::39f405b0f022130a53a219a44730f91b"
                },
                {
                    "question_name": "对于有阻抗要求的高多层板，嘉立创提供多种层压结构参考，且支持自定义层压结构设计。为实现研发效率和经济效益双提升，工程师选择以下哪种层压结构，成本更实惠，交期更快？（ ）",
                    "quesiton_option_md5": "bcf3bb909c655792f3ea1eda5fe2eaf7:::d8538005010b2b4627afc7a2a1d40297"
                },
                {
                    "question_name": "李工设计了一款产品（如图所示），拼板后，锐角夹角位置锣刀锣不进，添加“清角孔”，加工后存在少许“R角”毛刺残留，有影响产品外壳装配的隐患。请问，下列哪种拼板方式可改善此类毛刺残留问题？（ ）",
                    "quesiton_option_md5": "3cac4eb5952d7078d69a0e6250487cb0:::aeff2ae1df218965512ec94c01e5b88f"
                },
                {
                    "question_name": "PCB采用过孔(Via)开窗工艺，成品过孔孔环露铜，呈喷锡或沉金状态，实物板如图所示，关于过孔开窗工艺的优点和缺点，以下描述正确的是？（ ）",
                    "quesiton_option_md5": "18830b5f85079167dcf0a1fd3f70856a:::4b6cc992193ff84dde3206ec02705ee0"
                },
                {
                    "question_name": "覆铜板是PCB的核心原材料之一。为了便于产品追溯和防伪，一些覆铜板厂商会在板材上添加不影响PCB性能的水印标记。如下图所示，如果电子工程师不希望水印Logo完整地显露在PCB上，可以通过在PCB的空旷区域适当增加铺铜面积，来降低水印显露的概率。（ ）",
                    "quesiton_option_md5": "a386f02d1457631fbdb58377ab683206:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "嘉立创工艺升级后，可生产的FR-4材料的双面板最小钻孔直径为0.15mm。（ ）",
                    "quesiton_option_md5": "b51a3faabdde539b7c41d91f15406493:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "关于PCB设计软件中的Solder层和Paste层，以下哪些描述是正确？（ ）",
                    "quesiton_option_md5": "e36cd9e9447b6e30c510d426f2290a78:::c2685ea900495212d3d096071606d108,4e168ec0aab5af1f2d3ac3b7a547f071,7aa36ce490d9d19ef9b9daf17aca9cef"
                },
                {
                    "question_name": "为满足客户对PCB成品板厚度的多样化需求，嘉立创下单系统根据PCB的层数和结构提供一系列成品板厚度选项。请问，嘉立创目前加工的1-32层FR-4PCB成品板厚度可选范围是？（ ）",
                    "quesiton_option_md5": "77877485e85bc5b5bdbe168667f8fc52:::5cf8bb58057ee069b1b6922b2b7c9e8b"
                },
                {
                    "question_name": "嘉立创生产的高多层板采用绿色阻焊油墨，相邻IC引脚焊盘间距为0.1mm的情况下，PCB能够实现阻焊桥的制作。这一成果主要归功于以下哪个原因？（ ）",
                    "quesiton_option_md5": "60eab5994529e8acea9065967f0db128:::e8cda56ec709f0b06e9b68eefad154bb"
                },
                {
                    "question_name": "PCB字符有网版印刷、字符打印和曝光制作三种常见的制作工艺，不论使用哪一种制作工艺，设计时都考虑字符的高度、线宽，以及字符到焊盘的距离。为避免实物板字符印在焊盘上，对元器件焊接造成影响，嘉立创建议字符与焊盘的间距越大越好，最小间距应尽量不小于以下哪个参数？（     ）",
                    "quesiton_option_md5": "4a9b15ccce7058835baa3c9ca4f1def4:::dc3b8fa787e74b925f4a815bca037291"
                },
                {
                    "question_name": "加工PCB金属化孔（PTH）需要经历电镀、表面处理等工序，成品孔存在孔径公差，根据嘉立创官网公布的参数，金属化孔公差范围是多少？（ ）",
                    "quesiton_option_md5": "3cbe87dbb2f702984960c47d9c064249:::bddbde16a471483830f43ebbc5ccdd39"
                },
                {
                    "question_name": "板厚存在一定数值的公差，嘉立创板厚公差参数为：当板厚大于1.0mm时，公差为±10%，李工在下单时选择制作板厚为1.6mm的电路板，以下哪个成品板板厚在公差范围内？（  ）",
                    "quesiton_option_md5": "8822ebd7cb4f2c122b932d49d9ef6e09:::2ee5f14c02af6fa4611d6eb106ba136a"
                },
                {
                    "question_name": "根据产品需求，PCB过孔(Via)可设计成两面盖油、一面盖油一面开窗、两面开窗等效果。根据嘉立创的工艺能力，当双面板过孔设计成以下哪种效果时，PCB选择过孔塞油墨工艺，阻焊油墨没有因吸附和渗透导致上焊盘的隐患 （ ）",
                    "quesiton_option_md5": "86dc5b3820b44fc026e7a5e4cd294b6c:::1d759637af9da6920ba36ec0132842ae"
                },
                {
                    "question_name": "李工设计了一款PCB，在其中一个大面积露铜区域内标记了特定字符（如图所示）。若无特殊说明，PCB制造商会依照露铜优先原则去掉露铜区域内的字符。那么，生产出的PCB成品中，字符丝印情况是？（ ）",
                    "quesiton_option_md5": "805251c44998f9971e78653e94d98754:::d35594f6249618023c9eaa43a9f65d84"
                },
                {
                    "question_name": "为满足用户对PCB外形精度更高的要求，嘉立创推出了PCB精锣个性化服务，生产设备通过识别板内定位孔，实现更高精度的锣板加工，但对PCB定位孔的位置有一定的要求，且定位孔最小直径应不小于1.5mm。下图几款PCB定位孔位置和个数不同，哪款定位效果最好？（ ）",
                    "quesiton_option_md5": "5986984dce766775bbf6ae31dc96fd13:::8104bd8b2ed8b823b0269f030b647f6d"
                },
                {
                    "question_name": "由于铝基板基材硬度较高，加工槽孔所使用的锣刀直径越小越容易折断，导致生产时需要频繁更换锣刀，影响产品正常生产和品质，因此在设计铝基板时，槽孔不宜设计得太小。嘉立创可加工的单面铝基板最小槽孔宽度w是多少？（ ）",
                    "quesiton_option_md5": "08e64b3fc3a4b045d8263f4af562848e:::33f2ee3b92aad19310e2b3e2ee1ae91c"
                },
                {
                    "question_name": "在嘉立创下单时，如果PCB层数选“1”，意味着生产的成品是单面板。下列选项中，对嘉立创单面板描述正确的是？（ ）",
                    "quesiton_option_md5": "686c1c1c52f0a104355fb335454545c9:::a3143232802c1503db831466491edee4"
                },
                {
                    "question_name": "嘉立创加工PCB槽孔通常采用锣板方式，锣板公差为±0.2mm。林工设计的PCB如图所示，槽孔与圆孔的间距为0.1mm，实物板出现断裂，断裂的主要原因是因为槽孔与圆孔间距小于锣板公差，加工槽孔时容易将相邻圆孔锣断。（ ）",
                    "quesiton_option_md5": "594766649c0688b6f83c2ab4c50afe33:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "PCB同一网络上的导体（导线、铜皮）间距太小，生产过程中容易出现干膜脱落现象，脱落的干膜碎将影响产品品质。为保证产品品质不受影响，嘉立创建议工程师在设计PCB时，同网络导体间距d应不小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "e76613e218e31c377fed9bb747b87f4b:::ea6d40b0d8ab07605cac8617c4e780ed"
                },
                {
                    "question_name": "PCB阻焊开窗通常需要比焊盘单边大0.05mm，以减少阻焊对位公差对产品良率造成影响。嘉立创使用LDI曝光机生产精密高多层PCB，可实现阻焊开窗面积与焊盘面积的比为1:1，即阻焊开窗单边缩小到以下哪个极限参数，PCB也能正常生产？（ ）",
                    "quesiton_option_md5": "6397c990dac105b97d665aac949f73d5:::85ff0ae5e6c970b63863781cc78cc750"
                },
                {
                    "question_name": "为了满足客户对超大尺寸PCB的特定需求，嘉立创在其特定的数字化生产基地（金悦通、先进三厂）， 能支持生产超大的PCB双面板的最大接单尺寸是多少？（ ） ",
                    "quesiton_option_md5": "c242345d61cf474068a437fc95074078:::c929a395f05a0a5c4f06ca76935fb303"
                },
                {
                    "question_name": "李工根据嘉立创提供的工艺参数，设计含斜边金手指的PCB，为避免实物板板边露铜（内层铜皮），设计时除了需要关注外层手指（铜皮）与板边的间距L，还需要关注以下哪个参数？（ ）",
                    "quesiton_option_md5": "72d08477af395227ee8a0403db331468:::1e06f60ba8612a1abf8225f538b1fa3b"
                },
                {
                    "question_name": "嘉立创生产过孔塞油工艺PCB，需要开铝片后塞油，再印阻焊油墨，烘烤固化。过孔直径太大，实物板容易出现塞孔不饱满、过孔冒油等不良现象。为提高产品品质，嘉立创建议工程师在设计PCB时，如果需要采用过孔塞油工艺，过孔直径应尽量不大于以下哪个参数？（ ）",
                    "quesiton_option_md5": "c22a8c187d07987e1594a30835690d8e:::bec7b895e76e397a75a2abfe0779b232"
                },
                {
                    "question_name": "李工使用的PCB设计软件如图所示，为保证实物板底层为正向字体，底层字符应设计成以下哪个选项？（  ）",
                    "quesiton_option_md5": "0f124f4d6ff2db464efd84ae46dc190f:::2ad345511942ffe5cd560fe30494ac51"
                },
                {
                    "question_name": "嘉立创为外形加工提供普锣和精锣两种选项。使用精锣以获得更高的加工精度时，建议在PCB设计中加入至少三个直径不小于1.5mm的非金属化定位孔，采用L形分布在PCB不同方位,以提高定位准确性。如果设计条件有限，仅允许设置两个定位孔。请在以下选项中选择最合适的定位孔位置?（ ）",
                    "quesiton_option_md5": "1bb81e94dafc53c0f865ca5e61124806:::31071495c7eba92de138ef1d31f92afa"
                },
                {
                    "question_name": "李工设计的双面板如图所示，IC封装相邻焊盘间距为0.16mm，在嘉立创制作铜厚为1oz，绿色阻焊油墨的PCB，成品能否完整保留IC焊盘中间的阻焊桥？（ ）",
                    "quesiton_option_md5": "9fe6736bee7ac2ff78c7987814312570:::580867966ac9a2d9300ce366b2bd3bb5"
                },
                {
                    "question_name": "由于材料硬度比FR-4强，单面热电分离铜基板在加工中，若钻孔直径小于一定数值，易出现频繁断刀现象，降低生产效率，影响品质。请问，嘉立创能加工的单面热电分离铜基板的最小圆形钻孔直径为？（ ）",
                    "quesiton_option_md5": "f0206a47f6aff48f69175da2730a5b8c:::cf927077c1a4265b76897eeca49cf0c6"
                },
                {
                    "question_name": "对于使用非常用板厚（例如0.4mm或0.6mm）的FR-4材料制造的单面PCB，嘉立创采用更高质量的材料和双面工艺进行生产。这样生产的单面板，在孔径属性外的其他方面与传统单面工艺制造的板材相同。那么，双面工艺生产的单面板具有何种孔径属性呢？（ ）",
                    "quesiton_option_md5": "6955d3f1838689864543665d35f91cf0:::b5fe4220286520345deadaf0bceef098"
                },
                {
                    "question_name": "在选择嘉立创提供的PCB板上添加图文或序列号二维码的个性化服务时，如果发现PCB设计中没有预留足够空间添加二维码，嘉立创可自行决定不添加二维码。（ ）",
                    "quesiton_option_md5": "2d5e11cf8b281790235c46288f0ed548:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "单面热电分离铜基板的散热效果比单面铝基板好。下图两种产品的LED封装设计最大区别是热电分离铜基板需设计独立散热凸台，而铝基板则无需此设计。（ ）",
                    "quesiton_option_md5": "eaf045dbb48afd88fa2021f27e31308b:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "含BGA的PCB，嘉立创为什么强烈建议工程师选择沉金工艺？（ ）",
                    "quesiton_option_md5": "9a6e03bfd4e0eab2d68e16a0b47f9a19:::8b7a237eda4d59f84bb9d0036a5a7117,e416371644d200ff5452a9a0cdde2726,b95656693a118bb50c01339e01f23f9c,7b7a050d15466a5069efe789f031cd56"
                },
                {
                    "question_name": "在PCB设计中，选择大于最小工艺参数的尺寸是提高产品良率并有效控制成本的重要考量。这是因为最小参数通常代表制造商工艺的极限，而超出这些极限可能导致生产中的复杂性增加和失败率提高。针对嘉立创的制造能力，以下哪些选项正确描述了其可加工的最小过孔内径和外径参数？（  ）",
                    "quesiton_option_md5": "9acb215f384af20c7389ff314b2b455d:::8750694b7f09ac860840abd7dec657b3"
                },
                {
                    "question_name": " 在PCBlayout设计中，为提升多层板内层铜皮上设计的热焊盘与过孔的连接可靠性，如图所示：热焊盘的单边焊环最小宽度应不少于多少效果最佳？（ ）",
                    "quesiton_option_md5": "e167d8871f90fcf944694472c13b7f7c:::ea6d40b0d8ab07605cac8617c4e780ed"
                },
                {
                    "question_name": "当涉及到产品安装，PCB外形加工的公差成为一个重要考量。选择嘉立创的“精锣”工艺时，如果PCB板内没有直径大于或等于1.5mm的非金属定位孔，嘉立创是否可以实现精锣操作？（ ）",
                    "quesiton_option_md5": "a1d84e8fc3fc9d5e79784da6edca591a:::e30dd9eafb44f6d30f924e7cafaed72b"
                },
                {
                    "question_name": "嘉立创常规锣板公差为±0.2mm，张工用宽度为0.4mm的外形线，设计了一个如图所示的非金属化槽，常规锣板生产的成品板槽孔宽度为以下哪个参数？（ ）",
                    "quesiton_option_md5": "485204bb9570acfe5da09a001ae322ca:::ad2ba27bb30f0605150fe47554b86dea"
                },
                {
                    "question_name": "下列选项图片中，带绿色箭头的黑色区域是锣刀进刀轨迹。请问，下列选项中，哪种拼板方式可避免箭头所指区域内外形分板后出现毛刺现象？（）",
                    "quesiton_option_md5": "0c9c9d0c0514396555cb2d48f38ba536:::86736a374771a383c6597c2668865a97"
                },
                {
                    "question_name": "李工设计的两款PCB如图所示，Logo字符设计在阻焊开窗区域，李工将资料发给嘉立创制作，订单没有添加备注，实物板上有Logo字符的是以下哪种设计的PCB？（ ）",
                    "quesiton_option_md5": "08b46749bd7c2ba4238f5cc1a638d029:::e6183b8357b2953009905e2548ed9230"
                },
                {
                    "question_name": "李工在软件顶层设计了天线，实物板天线被阻焊油墨覆盖（如图1），为实现“天线被喷锡”的效果（如图2），李工需要在哪一层设计天线开窗区域？（ ）",
                    "quesiton_option_md5": "21255181b28d7c0e98ed89d84015a150:::0dfeeb2cc9b0773856ea8ba81282da7f"
                },
                {
                    "question_name": "普通单面铝基板和热电分离的铜基板都有较好的散热性能，以下描述错误的是？( )",
                    "quesiton_option_md5": "19cd9c43a9774d519a87f944ebdd2a4d:::45f60099edddb7c2860da95e5d40734e"
                },
                {
                    "question_name": "关于PCB生产中采用的飞针测试和测试架测试用于检测PCB板上的开短路，下列哪项描述是正确的？（  ）",
                    "quesiton_option_md5": "674a87d90f7607fb00f27f38c6dd8d4b:::3b9762d11686686222f2a307006444fb"
                },
                {
                    "question_name": "在设计文件中，如果相邻焊盘间的距离小于制作阻焊桥所需的最小值，尝试强行添加阻焊桥，可能会出现如下图所示的阻焊桥脱落带来的品质问题。( )",
                    "quesiton_option_md5": "64e26aa7b06c8af701ada4174710d882:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "王工设计的PCB采用2×3零间距方式拼板，3D效果如图所示，不分板，直接焊接元器件，相邻板之间的元器件会相互干涉。（ ）",
                    "quesiton_option_md5": "a4295aa27cddc038c4debeabd8e9bea6:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "PCB采用盘中孔工艺（树脂塞孔+电镀盖帽）制作，过孔内塞入环氧树脂，烘烤固化后，将塞好树脂的过孔表面打磨平整，再进行镀铜。树脂粘性较强，过孔直径太小，树脂将难以塞入过孔内，因此，在设计条件允许的情况下，过孔直径设置成0.3mm最合适，且该直径的过孔嘉立创不收费。如果因空间有限，盘中孔无法设计成0.3mm，则最小设计成以下参数，嘉立创可生产？（ ）",
                    "quesiton_option_md5": "c36392089e3221193fd9d67cf17ff0a5:::dc3b8fa787e74b925f4a815bca037291"
                },
                {
                    "question_name": "嘉立创多层板工艺使用LDI曝光设备，可实现阻焊与焊盘1:1开窗。在嘉立创生产采用1oz铜厚、黑色阻焊油墨的“多层板”资料中，为保留阻焊桥,相邻焊盘最小距离不能低于哪个参数？（ ）",
                    "quesiton_option_md5": "fc8c2dcbe1dfe9ba5ac383aeac1cc756:::58eb9c18a64902f439fe1a1a8c70361a"
                },
                {
                    "question_name": "为满足用户对PCB外形精度的要求，嘉立创提供普锣（公差±0.2mm）和精锣（公差±0.1mm）两种方式给用户选择。李工设计的PCB长100mm，宽60mm，下单时选择普锣加工方式，以下哪个选项中的成品板长宽不在公差范围内？（ ）",
                    "quesiton_option_md5": "c04f0c18eaa9f45757753e688b98583a:::577f670eb0eebedb3e6dd61805be169e"
                },
                {
                    "question_name": "PCB过孔（Via）直径小于0.3mm，需要通过增加四线低组测试等工序，实现品质管控，费用也比常规参数高。PCB采用过孔盖油工艺，直径大于0.5mm的过孔难以被油墨完全覆盖，孔口容易出现发黄现象。从节约成本和提高产品良率角度出发，过孔盖油工艺PCB的过孔直径，设计成哪个参数范围内更合适？（ ）",
                    "quesiton_option_md5": "0329ae536ac0ba159a7f74cd7b4c39fd:::0487a4b8c22fc19b4501e441d9530962"
                },
                {
                    "question_name": "在多层板制造过程中，通过使用PP（预浸料）片状物质来进行芯板之间以及芯板与铜箔间的粘接是关键步骤之一。这个过程涉及将PP放置在内层芯板间和铜箔之间，然后通过压机进行高温高压处理，使PP上的树脂熔化并填充到芯板上的无铜区域，随后在冷却过程中树脂固化，实现芯板与铜箔的牢固粘接。然而，当内层设计中布线空旷区域过大时，PP上的树脂会过多且集中流向无铜区，这种情况可能导致哪些品质隐患？（ ）",
                    "quesiton_option_md5": "fef70760b63ce64bcee430f49a375652:::f29d674da39fd2a0721f2ce8482a32e2"
                },
                {
                    "question_name": "李工设计的PCB过孔直径为0.3mm，下单时选择“过孔盖油”工艺，实物板上0.3mm的孔被开窗，而非盖油效果，李工检查设计稿时，发现孔属性如下图所示，孔未被盖油的主要原因是？（ ）",
                    "quesiton_option_md5": "8efbcb79c93247f7aac1acb9aed853d0:::3ca631145748cf6feb2ec279fcd8f32d"
                },
                {
                    "question_name": "半孔板需要采用特殊工艺制作，半孔直径太小，加工环节容易出现孔壁铜皮脱落等隐患。为提高产品品质，嘉立创建议工程师在设计半孔板时，应避免将半孔直径设置得太小。嘉立创可加工的最小钻孔直径为0.15mm，可加工的最小半孔直径为以下哪个参数？（ ）",
                    "quesiton_option_md5": "b15f10493f81e5112eefb41f87d4e7be:::9309cf1514c4b8950bc115d4bb8959fc"
                },
                {
                    "question_name": "嘉立创双面板钻孔最小可以做到0.15mm，但小于0.3mm的钻孔需要收取一定的难度费用。（ ）",
                    "quesiton_option_md5": "d85d45c9c30504ee6814a75f2e80e472:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "嘉立创支持加工基材为FR-4的1-32层PCB，我们的下单系统根据PCB的层次和结构，提供不同的内外层铜箔厚度供客户选择，以下对嘉立创可加工的铜厚范围描述正确的是（ ）",
                    "quesiton_option_md5": "f25623b4d1ae1bf916ff09ae1ede537b:::15ea3e43395ef8690967a1804765b804,960d70c181e9862e6c59c6d5cd9cd3a2,dc932bd8919ef73df5694201ceefcff4"
                },
                {
                    "question_name": "元器件管脚封装为长方形，在设计封装时需要画椭圆形的金属孔，这类孔也被PCB行业称为“槽孔”，嘉立创可加工的金属化槽孔最小宽度是多少？（ ）",
                    "quesiton_option_md5": "6b8b7b0f85a9dffcdfd6fadfa0e6089a:::bec7b895e76e397a75a2abfe0779b232"
                },
                {
                    "question_name": "在嘉立创生产的高多层板中，当所需的阻抗值大于等于50Ω时，嘉立创能提供的最小阻抗控制公差是？（ ）",
                    "quesiton_option_md5": "abe8e57ac26f4dd96a2f912602584b83:::f779a50a1a10abbbf19db4b9dcd36919"
                },
                {
                    "question_name": "马工在检测PCB时发现两个插件孔（Pad）不导通。基于马工提供的Gerber文件中的分孔图，可以确定导致两个插件孔不导通的主要原因是什么？（  ）",
                    "quesiton_option_md5": "beddb139fb9c3b03fb7abf9b4de8f93c:::e4b209b9076affb66d310560f86b9796"
                },
                {
                    "question_name": "PCB有实心覆铜和网格覆铜两种常见覆铜方式，如果采用网格覆铜方式，网格线宽线距参数越大越好，如果参数太小，生产环节容易出现干膜脱落现象，脱落的干膜碎将影响产品品质。嘉立创建议工程师在设计条件允许的情况下，优先使用实心覆铜，如果采用网格覆铜方式，网格线宽线距应不小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "23cd1564d0b58921fe3e722582b412b9:::ea6d40b0d8ab07605cac8617c4e780ed"
                },
                {
                    "question_name": "工程师将PCB定位孔设计成以下哪个选项，能确保嘉立创快速准确识别定位孔直径参数？（ ）",
                    "quesiton_option_md5": "720ad87a25f920404f041a52c03d1e19:::5056e3184ee101986b865f49ebb10fd1"
                },
                {
                    "question_name": "因工艺特殊，包边工艺电路板板厚极限值与常规工艺电路板的有所不同，嘉立创目前可制作的包边工艺电路板，板厚最薄不得低于以下哪个参数？（  ）",
                    "quesiton_option_md5": "4efcb91833c36fb2476d714df810284b:::9309cf1514c4b8950bc115d4bb8959fc"
                },
                {
                    "question_name": "在PCB加工过程中，“过孔塞油工艺”与“过孔盖油工艺”有哪些不同？（ ）",
                    "quesiton_option_md5": "b9af8d2edf4cccdad8f7daa40972d07b:::e22fad6d96d0a9b64b122aa3fb614a6b"
                },
                {
                    "question_name": "嘉立创采用包边工艺生产金属化矩形槽，实物板槽孔四个角有一定的弧度，即存在R角，无法呈现90°直角效果。（ ）",
                    "quesiton_option_md5": "5b05237a38a0842352de8bb934e47504:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "嘉立创盘中孔工艺可帮助Layout工程师解决小空间难布线问题，受生产工艺限制，嘉立创可加工的最小钻孔直径为0.15mm，对于直径小于0.3mm盘中孔，由于加工难度非常大，成本高，需要收取一定难度费用。直径大于0.5mm的盘中孔，容易出现塞孔不饱满导致孔凹陷等隐患。在设计空间有限，不考虑成本的情况下，盘中孔直径可以设计成以下哪个参数范围？（ ）",
                    "quesiton_option_md5": "84864cd5d0fdcb3ca9e3dd8f7bef540f:::87bdec74d2f4bfa55f952203aa4b3972"
                },
                {
                    "question_name": "在PCBLayout设计中，选定合适的字体大小至关重要，因为它直接影响加工后字体的清晰度。由于不同的PCB制造商拥有不同的工艺水平，因此它们能实现的最小字体尺寸也会有所不同。针对正片字体，嘉立创常规工艺能够实现清晰字符的最小参数是？（ ）",
                    "quesiton_option_md5": "e2dc2291743bda3a7c7a154361b9f820:::14f4cc93821724e200e1472da7692294"
                },
                {
                    "question_name": "根据嘉立创官网公布的工艺参数，以下哪个选项属于嘉立创板厚公差范围？（ ）",
                    "quesiton_option_md5": "3068b103eaa0e10e914bec50da6eb220:::26bcacd9779fe6c547215ed705a77a48"
                },
                {
                    "question_name": "如果PCB过孔直径小于0.3mm，易出现似断非断的坏孔，很难通过测试架和飞针测试检查出来。当通电使用一段时间后，产品会出现问题。嘉立创采用四线低阻测试管控品质，成本较高。从提高产品良率和控制成本的角度出发，设计PCB过孔直径，条件允许情况下，应尽量不小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "93be44672e67b7654c0ab9c8d8bc49a9:::c90cd85b227a991ef671cbc22190d19e"
                },
                {
                    "question_name": "嘉立创按外形线资料进行锣板加工，以下哪个选项中的Mark点会锣掉？（ ）",
                    "quesiton_option_md5": "3734fa01a41db5421f3774da698fb39c:::244c22a6ce0ec5049ccd64c3f0251d37"
                },
                {
                    "question_name": "如图所示，在PCB设计软件中的顶层阻焊层，有两处开窗区域，分别标记为①和②。关于箭头所指的区域在成品PCB中的呈现效果，以下描述中错误的是？（ ）",
                    "quesiton_option_md5": "c5aed422a231e51edb43896d1ab9509f:::b150942ef1f4163dd28e3eaa24c4e5c1"
                },
                {
                    "question_name": "“热电分离铜基板”指的是线路不与散热用的凸台直接连接的铜基板。为防止电路短路，散热的凸台不能与任何相邻的导电铜层相连。下列选项中，哪个凸台（白色部分）的设计错误？（ ）",
                    "quesiton_option_md5": "1c81cceb3b68dd4e5a57eb6f56e5f620:::ab8eed3a49282b1aaa47e9f6ba757788"
                },
                {
                    "question_name": "盘中孔工艺具有许多优点，能帮助PCBLayout工程师解决“在小空间上难布线”等问题。不同PCB制造商可加工的盘中孔直径有所差异，嘉立创可加工的盘中孔直径范围是多少？（  ）",
                    "quesiton_option_md5": "bd7fee44a3ac470a29b9ea60c36c5cd6:::87bdec74d2f4bfa55f952203aa4b3972"
                },
                {
                    "question_name": "铜箔的蚀刻速度与蚀刻液浓度及离子置换紧密相关。在PCB设计时，不均匀的铺铜或孤立线的存在会导致低残铜区域蚀刻液浓度偏高。浓度越高，离子置换速度越快，进而蚀刻速度增加。为防止某些线路（如图中箭头所指位置）在蚀刻过程中出现过度蚀刻，导致线路过细，应选择哪种布线方法？（ ）",
                    "quesiton_option_md5": "5cd452f6b2fcfe8651be13e9b1b66e20:::8a68c7643065119a2ccf860543dbbda8"
                },
                {
                    "question_name": "PCB外形如图所示，以下哪个选项中的拼板设计，既能省板材，又能避免PCB在加工时存在报废隐患？（ ）",
                    "quesiton_option_md5": "6f6b67d0d326e0b63681cc4e59f8af8d:::a42a0dd2b83b6b79f26fd7eded3252af"
                },
                {
                    "question_name": "由于铝基板基材硬度较高，加工钻孔所使用的钻头直径越小越容易折断，导致生产时需要频繁更换钻头，影响产品正常生产和品质，因此嘉立创建议工程师在设计铝基板时，钻孔直径不宜设计得太小。单面铝基板，嘉立创可加工的最小钻孔直径d是多少？（ ）",
                    "quesiton_option_md5": "c237db214dd81d300c8e8afd72e94c78:::9605dd4172b408f742d46a972ba2e4e0"
                },
                {
                    "question_name": "在选择嘉立创提供的板上添加图文或者序列号二维码的个性化服务时，为确保产品美观及二维码的清晰可识别，设计时应预留一定空间用于添加二维码。嘉立创默认添加的二维码大小为？（ ）",
                    "quesiton_option_md5": "73bba2df34659b475b7a3063d13a9011:::e87b827b05cbd0c755a751c1254507ce"
                },
                {
                    "question_name": "李工设计的PCB计划采用盘中孔工艺（树脂塞孔+电镀盖帽），过孔（Via）直径为0.3mm，其中有一部分过孔不需要塞树脂，他可以将不需要塞树脂的过孔，直径统一增加或减少0.01mm，需要塞树脂的过孔直径仍设计成0.3mm，下单时告知嘉立创，两种不同直径过孔分别使用哪一种加工方式，以实现目标需求。（ ）",
                    "quesiton_option_md5": "bdaaa248b7fd83dd6a989246ffc51764:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "PCB成品铜厚影响产品载流能力，嘉立创下单系统根据PCB的层次和结构，提供不同的内外层铜箔厚度供客户选择。嘉立创可加工的高多层PCB内层铜厚参数范围是多少？（ ）",
                    "quesiton_option_md5": "8aa1431a8b1f92bfe39fa11232c8933e:::6173ced2d997b51559969f77ab656d5e"
                },
                {
                    "question_name": "嘉立创可加工的最小过孔（Via）直径是多少？（ ）",
                    "quesiton_option_md5": "412e30485056971f4e89f485fb2d77b1:::dc3b8fa787e74b925f4a815bca037291"
                },
                {
                    "question_name": "在PCB生产过程中，由于工艺限制，成品线路板上的导线间距可能与设计资料中的参数有所偏差。嘉立创参照国际IPC-A-600J标准，将线宽和线距的公差控制在\"±20%\"内。若设计间距为0.2mm的导线，下列哪组实际测量数据超出了公差范围？（ ）",
                    "quesiton_option_md5": "48acb99f08ce269508605f4dda366aaf:::ea6d40b0d8ab07605cac8617c4e780ed"
                },
                {
                    "question_name": "金属化插件孔(Pad)焊盘直径=孔径+焊环x2，嘉立创金属化插件孔（Pad）焊环宽度工艺参数如图所示，李工设计的双面板金属化插件孔孔径为1.0mm，最小焊盘宽度（极限值）不得低于以下哪个参数？（ ）",
                    "quesiton_option_md5": "8ce9280088883b8d4ea8096721ec90e5:::6da78ab228a3c1f064a5073311956ca5"
                },
                {
                    "question_name": "李工使用的PCB设计软件不能直接设计金属化槽，他用以下哪种方式表达金属化槽，最不容易产生歧义，资料交给嘉立创加工最不容易出错？（ ）",
                    "quesiton_option_md5": "349bc6ebaa54db90cfdc7e894d928c4c:::94339a303dbe3798782d5306787130c2"
                },
                {
                    "question_name": "阻焊油墨有一定的厚度，可能会影响按键灵敏度，下图哪个按键灵敏度受影响较小？（ ）",
                    "quesiton_option_md5": "dcb41dc955208b225a86be62e11e9eec:::8a68c7643065119a2ccf860543dbbda8"
                },
                {
                    "question_name": "铜基板的铜经过蚀刻加工等环节，凸起部分被称为凸台。嘉立创生产热电分离铜基板，需要用锣刀将FR-4 绝缘材料锣出对应形状，并将锣好的材料套在铜基板凸台上进行压合。加工PCB所使用的最小锣刀直径为1mm，凸台最小长宽，应不小于以下哪个参数？（  ）",
                    "quesiton_option_md5": "07fbebcc2c96c784e873638900179266:::2699a441a6cf2657509b563dd16a5a7c"
                },
                {
                    "question_name": "化学药水将覆铜板上不需要保留的区域蚀刻掉，被保留的铜箔即为PCB线路，行业生产PCB有正片和负片两种工艺，正片工艺通过电镀锡的方式保护线路和过孔，成本较高，负片工艺采用干膜封孔方式保护线路和过孔，成本较低。PCB采用负片工艺生产，可能会出现哪种隐患？（ ）",
                    "quesiton_option_md5": "b533132646fd8d3b2360df3b356dc121:::d574915912dacdbf0c9e1f004da0497e"
                },
                {
                    "question_name": "小王在拼板过程中，在图示位置（1、2、3、4）各添加一块通过邮票孔连接的辅助板。这样做可以有效防止在加工和运输过程中，悬空的工艺边发生断裂。( )",
                    "quesiton_option_md5": "a7fb56a35a3ea96556978e0ff3bcb4a5:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "IC阻焊桥是指两个IC焊盘之间的阻焊油墨，阻止焊料流动。不同的PCB制造商对可实现阻焊桥生产的焊盘间距要求各不相同。在嘉立创制造1oz铜厚的PCB时，以下选项中哪些相邻IC焊盘间距参数能够保留阻焊桥？（ ）",
                    "quesiton_option_md5": "acf80961eb8f1c861de24ec34a40baba:::051615c5e5f5aaaa1c213053de496f61,69020ac63556dfbed3eea4b6b0236650,b6bf694f86db0bcc129c4155c33200d1,ee680f6f2f8b15694d04f3b038029dd6"
                },
                {
                    "question_name": "设计V割（V-cut）拼板PCB，如果板边导体（铜皮、焊盘和导线等）与板边的间距太小，实物板加工环节，V割加工设备可能会割伤导体，出现板边露铜、开路等隐患。嘉立创V割公差为±0.4mm，建议工程师在设计PCB时，导体与V割板边的最小间距，应尽量不小于以下哪个参数?（   ）",
                    "quesiton_option_md5": "1debc77e112847e5f23155e54792b375:::63e2911eef8755e64e0b74cad7d8f88a"
                },
                {
                    "question_name": "嘉立创使用LDI曝光机生产精密高多层PCB，可以实现阻焊开窗与焊盘1:1。为保证产品能正常生产出阻焊桥，设计铜厚为1oz，阻焊油墨为绿、红、黄、蓝、紫等颜色的多层板，焊盘间距最小不得小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "2d1d1df438fe91b5226a4a9e60c0e391:::12d97434b0fc8df3034264f9c1bc521a"
                },
                {
                    "question_name": "为提高PCB制造和元器件组装的生产效率以及保证PCB品质，嘉立创建议小尺寸PCB采取拼板出货策略。针对长或宽小于30mm的单片PCB，拼板出货能降低定位难度，规避因定位误差引起的外形变形和边缘毛刺问题。并且，它还能有效解决小尺寸PCB无法通过机械方法进行表面清洁的挑战。请问，针对小尺寸PCB，建议采取以下哪种出货方式？（  ）",
                    "quesiton_option_md5": "93d40e978ba07f73ac4977f057fbfc38:::45f25e79e20515d7787281469a073368"
                },
                {
                    "question_name": "压接孔是一种特殊通孔，元器件插入孔内可固定，元器件引脚和压接孔孔壁接触，无需焊接即可实现导通功能。在嘉立创制作含压接孔的沉金工艺PCB，压接孔直径公差范围是多少？（ ）",
                    "quesiton_option_md5": "4c8eec7c2f4d2b3db8ed673ca121caa8:::137ad3d2ef5b7ede3332ed7a97d92b46"
                },
                {
                    "question_name": "嘉立创四层板已免费升级至过孔塞油工艺。关于该工艺，以下描述哪项是正确的？( ) ",
                    "quesiton_option_md5": "276114501d9716cde49c9204f26c93ef:::7c4d034cfc2703c876508fe49a784353"
                },
                {
                    "question_name": "在PCBLayout软件多层设计双面板的焊盘，金属化选项选择“是”，图1钻孔直径为0mm，图2钻孔直径为0.8mm，哪个选项的金属化焊盘可实现连通顶层和底层的导电功能？（ ）",
                    "quesiton_option_md5": "0fedd7dfaf1806295ebe5683ae633c35:::8a68c7643065119a2ccf860543dbbda8"
                },
                {
                    "question_name": "在Layout设计中，通常推荐将铜箔上的元器件管脚从“图A”连接方式改为“图B”所示的“十字连接”方式来连接焊盘与铜皮。这样做的主要目的是？（ ）",
                    "quesiton_option_md5": "ebd9497b931516b9f33b1385f4469583:::f28f60b71555be92e578e087f8468075"
                },
                {
                    "question_name": "林工使用的PCB设计软件有禁止布线层（Keepout）和机械一层（Mechanical1），根据软件规则，在哪一层设计PCB外形和外形槽更规范？（ ）",
                    "quesiton_option_md5": "3c65f785334119654c25ac684b5fb7f8:::6eee362259c385158e65ab051c2f7efb"
                },
                {
                    "question_name": "嘉立创可加工的常规工艺PCB线宽线距为0.1mm（极限:0.09mm），线圈板需要采用特殊工艺加工，制造难度高，线宽线距比常规参数略大。林工将PCB设计成整面开窗效果，线圈线宽线距为0.25mm，3D预览图如下图所示，选择哪种表面处理工艺，可避免实物板出现连锡隐患？（ ）",
                    "quesiton_option_md5": "7f432e75f268107e5c24bd3122f8b2da:::6f5052852d7e2c1abda03f9a3d0e9fc9"
                },
                {
                    "question_name": "嘉立创提供多种阻焊油墨颜色供用户选择，包括绿色、红色、黄色、蓝色、白色、哑黑色、嘉立创紫色，PCB行业使用最广泛的是什么色？（ ）",
                    "quesiton_option_md5": "34f37d329866f70648d11ae8182c2300:::b2c712c788d3a143206eee22fe24d9f1"
                },
                {
                    "question_name": "设计PCB时，如果过孔（Via）被设计成插件孔（Pad）。PCB采用\"过孔盖油\"工艺制作，那么成品板的过孔将不会被阻焊油墨覆盖，而是变成带焊盘的插件孔形态。（ ）",
                    "quesiton_option_md5": "32066975e50f946e9d5b89bf936c299c:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "嘉立创生产的FR-4高多层板，最高可达多少层？（ ）",
                    "quesiton_option_md5": "257c33044c898c37c97a832ac3e2f2c5:::c866dba9330d73ebcd59422fe531d0c1"
                },
                {
                    "question_name": "喷锡工艺PCB，金属化插件孔直径小于0.5mm，容易产生锡堵孔隐患。为提高产品良率，在设计条件允许的情况下，插件孔直径应不小于0.5mm，如果直径无法设计成0.5mm以上，PCB可选择以下哪种表面处理工艺制作更合适？（ ）",
                    "quesiton_option_md5": "5e21665a7d125f8b4e63fc64c79b555f:::6f5052852d7e2c1abda03f9a3d0e9fc9"
                },
                {
                    "question_name": "PCB设计资料中的元素，可能会因软件版本不兼容而变形。电子工程师将设计资料输出为以下哪种文件交给PCB制造商，兼容性和准确性更高？( )",
                    "quesiton_option_md5": "2e735c4fc674491bb958a63c7845127e:::4acabbfcb1d721b20a87c9b6c265011a"
                },
                {
                    "question_name": "嘉立创可生产的单面铝基板和热电分离铜基板的最小尺寸是多少？( )",
                    "quesiton_option_md5": "656f225287e1344e43f85000cbdb3710:::0d8e549faa7a79fa00f61629a08d3feb"
                },
                {
                    "question_name": "在PCB设计中，当使用大面积实心覆铜，为了防止在高温下（如波峰焊或回流焊过程中）内部粘合剂挥发的气体无法及时释放，导致铜箔起泡或翘起鼓包，可以通过在大铜面上增加透气孔、导通孔或者开槽等方式来优化设计。",
                    "quesiton_option_md5": "8e86b263730b4e8b9367db6c6e0c7e57:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "设计了盘中孔，但未选择盘中孔工艺，实物板将呈现以下哪种效果？（ ）",
                    "quesiton_option_md5": "06b85994939f4d5dde0c6e2c52361523:::706afe8608ca1c339bfa1cfa879cc2ea"
                },
                {
                    "question_name": " 阻焊桥，又称绿油桥或阻焊坝，指的是表面贴装器件（SMD）焊盘之间的阻焊油墨，用于防止SMD焊盘（特别是IC封装）间距过小而导致焊接桥连短路。针对铜厚为1oz的绿油双面板，当焊盘间距小于0.20mm时，嘉立创能否保留完整的阻焊桥？（ ）",
                    "quesiton_option_md5": "aa6f2563e2e15176352d9fbba7890ef9:::118671eb44a26f7ec455641847b98bfc"
                },
                {
                    "question_name": "张工设计的PCB过孔（Via）直径为0.35mm，PCB采用过孔盖油工艺制作，成品板过孔直径可能为以下哪个参数范围？( )",
                    "quesiton_option_md5": "1a267922d719c78d4b6c13540ea10156:::09389b0ad5cea78dc99eb82657545d9e"
                },
                {
                    "question_name": "在PCB布局设计中，钻孔直径的选择对于生产效率和成本有着重要影响。钻孔直径较小意味着所需的钻咀有效长度短，这不仅使得小孔的镀铜过程更为困难，品质控制的成本更高，同时也会降低加工相同厚度板材的数量，直接影响加工效率和增加时间成本。基于此，以下哪项关于孔径直径与制造成本关系的描述是正确的？（ ）",
                    "quesiton_option_md5": "428668871214d415505813d351b8d71f:::21dd534bccd2adb45225f27a05ab03e3"
                },
                {
                    "question_name": "嘉立创对过孔（Via）不进行补偿，设计PCB时，如果用过孔（Via）代替插件孔（Pad），可能会导致PCB成品插件孔偏小，无法正常安装元器件。（ ）",
                    "quesiton_option_md5": "cb4ec702ed63c74ed5d9b66ca271119b:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "嘉立创采用公制机械钻头加工钻孔，钻头直径按0.05mm单位数值递增或递减，以下哪些参数符合钻头直径规格？（ ）",
                    "quesiton_option_md5": "8b9f49f19569a4114f9da99ecb1627f5:::c90cd85b227a991ef671cbc22190d19e,85596731d28413bbc9b10fa01f080e82"
                },
                {
                    "question_name": "对于嘉立创加工的FR-4板材厚度随着层数的增加而变化，目前下单系统1~10层板的可选加工板厚范围是多少？（ ）",
                    "quesiton_option_md5": "5b68c89c7fe215b7fdfc140d32959e2c:::e228da506ee4a8547769b61cf1bbaf85"
                },
                {
                    "question_name": "张工设计的一款单面板，其线路设计在“底层（Bottomlayer）”。收到实物板后，他发现线路面向上时，走线方向与软件原稿不一致。如下图所示，判断PCB制造商将线路做反了。（ ）",
                    "quesiton_option_md5": "97f8b15876ffa40c76393833d470c07c:::2fb0e0980a2d7a1b909c672865be055b"
                },
                {
                    "question_name": "李工设计的双面板最小线宽和最小线距均为0.25mm，根据嘉立创最小线宽线距工艺参数，双面板最厚铜厚能选择以下哪个参数？（ ）",
                    "quesiton_option_md5": "0a2c7c3ecf20535569d2926b02b335ad:::507d4d88ac8802c788a378a41941f70e"
                },
                {
                    "question_name": "在PCB Layout 软件中设计焊盘孔时，按下图所示的设计，如果未勾选“plated（电镀）”选项，或者“金属化”选项选“否”。那么，生产出的PCB成品孔径与下列哪个选项的展示效果相同？（ ）",
                    "quesiton_option_md5": "794358d034302a824aaae197032a551c:::821ebd5af9072d67a13c9fa15c25786f"
                },
                {
                    "question_name": "在处理双面喷锡板的CAM工程资料时，为使成品孔径更接近设计孔径，PCB厂商工程师会将金属化插件孔（Pad）的孔径补偿加大0.15mm。请问，这样做的原因是？（ ）",
                    "quesiton_option_md5": "7ed22995996be849eda8d00218f606e6:::dae9f7f2059e503437fa9a6f6f4e20cf"
                },
                {
                    "question_name": "以下选项中，哪些方法能降低嘉立创协助拼板生产的PCB与之前制作好的钢网出现偏移的风险？（ ）",
                    "quesiton_option_md5": "a575b60f7f8049c7407f6b0f102daeff:::4fc197e190d3e8e82a198591083de6b8,fd7171913c86efd396194fffc4447d49,4f062e313b6f34a09abebeb9739f88d6,9fea2a96aebca36dab94c809838cc62b"
                },
                {
                    "question_name": "PCB金属包边工艺是通过特殊工艺流程实现的，并且对PCB板厚有一定要求。对于嘉立创可制作的金属包边工艺产品，板厚最薄不低于哪个厚度？（ ）",
                    "quesiton_option_md5": "224942a0e268281cbb5974f5fbdc5a20:::94a5aa1a54e98366a66f21688c4bdb26"
                },
                {
                    "question_name": "为保证标识的清晰度和辨识度，推荐将PCB上的Logo或二维码等标识设计为字符形式，并避免将其设计在线路或阻焊层上。如果需要设计露铜的铜箔类标识，除满足PCB制造商生产工艺的最小间距外，还必须考虑PCB表面处理过程中可能出现的喷锡连锡问题。以下哪种PCB表面处理工艺更能有效防止连锡问题？（ ）",
                    "quesiton_option_md5": "744ad78b377355b5d0b307158b2bb8d4:::6f5052852d7e2c1abda03f9a3d0e9fc9"
                },
                {
                    "question_name": "锣槽存在一定数值的公差，嘉立创采用“精锣”工艺加工PCB，公差参数为±0.1mm。李工设计的PCB如图所示，槽孔槽宽2mm，槽长5mm，以下哪个选项的成品槽孔长宽尺寸不在精锣公差范围内？（ ）",
                    "quesiton_option_md5": "f3b49f82af16987a213fdf529384d997:::c8c9518e0d746df573b9c8db9e24f9c9"
                },
                {
                    "question_name": "金属化插件孔(Pad)焊盘直径=孔径+焊环x2，嘉立创金属化插件孔（Pad）焊环宽度工艺参数如图所示，李工用推荐值参数设计6层沉金PCB，金属化插件孔孔径为0.8mm，焊盘直径按推荐值参数设计，应不小于以下哪个参数？（ ）",
                    "quesiton_option_md5": "1139862985ea91238728604aa0c512e3:::1d9476ee37bf4e5cdb6fb1eab1abb173"
                }
            ]
        }

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