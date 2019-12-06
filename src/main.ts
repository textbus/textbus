import { Observable } from 'rxjs';

import { createEditor } from './lib/create';

import './lib/assets/index.scss';

const editor = createEditor('#editor', {
  uploader(type: string): string | Promise<string> | Observable<string> {
    console.log(type);
    return '/test';
  },
  content: `<div class="article" style="padding-top: 0px;"><p style="text-align: justify; text-indent: 2em;">在阐释“全面依法治国”等新理念新思想时，习近平常常会讲述一些动人的故事，引用一些典故并分析一些案例。</p><p style="text-align: justify; text-indent: 2em;">这些故事，是对社会主义法治精神的最好昭示。一起来聆听。</p><p style="text-align: justify; text-indent: 2em;"><img src="https://rmrbcmsonline.peopleapp.com/upload/ueditor/image/20191204/a_386802167383584768.png?x-oss-process=image/format,jpg" title="1575456703561299.png?x-oss-process=style/w10" alt="1.png?x-oss-process=style/w10"></p><p style="text-align: justify; text-indent: 2em;"><strong>法治兴则国兴，法治强则国强</strong></p><p style="text-align: justify; text-indent: 2em;">历史和现实都告诉我们，法治兴则国兴，法治强则国强。从我国古代看，凡属盛世都是法制相对健全的时期。春秋战国时期，法家主张“以法而治”，偏在雍州的秦国践而行之，商鞅“立木建信”，强调“法必明、令必行”，使秦国迅速跻身强国之列，最终促成了秦始皇统一六国。汉高祖刘邦同关中百姓“约法三章”，为其一统天下发挥了重要作用。汉武帝时形成的汉律60篇，两汉沿用近400年。唐太宗以奉法为治国之重，一部《贞观律》成就了“贞观之治”；在《贞观律》基础上修订而成的《唐律疏议》，为大唐盛世奠定了法律基石。</p><p style="text-align: justify; text-indent: 2em;">——2018年8月24日在中央全面依法治国委员会第一次会议上的讲话</p><p style="text-align: justify; text-indent: 2em;"><strong>一些地方还存在“发展要上、法治要让”的误区</strong></p><p style="text-align: justify; text-indent: 2em;">在发展和法治关系上，一些地方还存在“发展要上、法治要让”的误区。去年，党中央处理了甘肃祁连山国家级自然保护区生态环境问题，一批党政干部受到处分。《甘肃祁连山国家级自然保护区管理条例》历经3次修正，部分规定始终同《中华人民共和国自然保护区条例》不一致，立法上“放水”，执法上“放弃”，才导致了祁连山生态系统遭到严重破坏的结果。这样的教训必须深刻汲取。</p><p style="text-align: justify; text-indent: 2em;">——2018年8月24日在中央全面依法治国委员会第一次会议上的讲话</p><p style="text-align: justify; text-indent: 2em;"><strong>必须促进严格规范公正文明执法</strong></p><p style="text-align: justify; text-indent: 2em;">近年来，司法机关依法纠正了呼格吉勒图案、聂树斌案、念斌案等一批冤假错案，受到广大群众好评。造成冤案的原因很多，其中有司法人员缺乏基本的司法良知和责任担当的问题，更深层次的则是司法职权配置和权力运行机制不科学，侦查权、检察权、审判权、执行权相互制约的体制机制没有真正形成。最近发生的长春长生疫苗造假案，背后的原因也是有法不依、执法不严，把法律法规当儿戏。这就要求我们必须促进严格规范公正文明执法，让人民群众真正感受到公平正义就在身边。</p><p style="text-align: justify; text-indent: 2em;">——2018年8月24日在中央全面依法治国委员会第一次会议上的讲话</p><p style="text-align: justify; text-indent: 2em;"><strong>“徙木立信”</strong></p><p style="text-align: justify; text-indent: 2em;">全面推进依法治国，必须坚持严格执法。法律的生命力在于实施。如果有了法律而不实施，或者实施不力，搞得有法不依、执法不严、违法不究，那制定再多法律也无济于事。我国古代有徙木立信的典故，说的是战国时期商鞅在秦国变法，为了取信于民，派人在城中竖立一木，说谁能将此木搬到城门，赏赐十金。搬一根木头就可以拿到十金，民众无人相信，后来把赏赐加到五十金，有人试着把木头搬到城门，果然获赏五十金。这就是说要言而有信。</p><p style="text-align: justify; text-indent: 2em;">——2013年2月23日在十八届中央政治局第四次集体学习时的讲话</p><p style="text-align: justify; text-indent: 2em;"><strong>“这就是好样的！”</strong></p><p style="text-align: justify; text-indent: 2em;">任何国家任何制度都不可能把执法司法人员与社会完全隔离开来，对执法司法的干扰在一定程度上讲是客观存在的，关键是遇到这种情况时要坚守法治不动摇，要能排除各种干扰。这方面也有好的典型。海南省东方市天安乡派出所原所长吴春忠同志不徇私情，亲手将涉嫌违法犯罪的多年好友抓捕归案，并告诉他：“你是我最好的朋友，但人情大不过法律。公安机关如果不能秉公执法，还怎么取信于民？”他对前来为亲戚说情的领导干部说：“我要是放过他，就是说假话、办假案。你身为领导，怎么能提出这样的要求？”这就是好样的！</p><p style="text-align: justify; text-indent: 2em;">——2014年1月7日在中央政法工作会议上的讲话</p><p style="text-align: justify; text-indent: 2em;"><strong>“铁面无私，秉公执法”</strong></p><p style="text-align: justify; text-indent: 2em;">中国古代像包公、海瑞这样的清官，老百姓都推崇他们为“青天”。包公曾经写过一首明志诗：“清心为治本，直道是身谋。秀干终成栋，精钢不作钩。仓充鼠雀喜，草尽兔狐愁。史册有遗训，毋贻来者羞。”我们的干警要把法治精神当作主心骨，做知法、懂法、守法、护法的执法者，站稳脚跟，挺直脊梁，只服从事实，只服从法律，一是一、二是二，不偏不倚，不枉不纵，铁面无私，秉公执法。</p><p style="text-align: justify; text-indent: 2em;">——2014年1月7日在中央政法工作会议上的讲话</p><p style="text-align: justify; text-indent: 2em;"><span style="color: rgb(127, 127, 127);">（整理：曹磊 詹云）</span></p></div>
`
});

// editor.updateContentHTML('<p>p1<span>p-span</span></p><span>span3</span><span>span4</span><p>p2</p><span>span1</span><span>span2</span>')
//
// editor.onChange.subscribe(result => {
//   console.log(result);
// });

// setTimeout(() => {
//   editor.updateContentHTML(`<html><body><div>测试</div></body></html>`)
// }, 3000);
