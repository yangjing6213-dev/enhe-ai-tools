import type { Locale } from "@/lib/i18n";

export type LegalPage = {
  slug: string;
  title: string;
  summary: string;
  sections: { title: string; paragraphs: string[] }[];
};

export const legalSlugs = [
  "user-agreement",
  "privacy-policy",
  "disclaimer",
  "membership-refund",
  "copyright-complaint",
  "minor-protection"
] as const;

export type LegalSlug = (typeof legalSlugs)[number];

const zhIntro =
  "欢迎访问恩禾 ENHE AI工具站。为保障用户权益并规范网站服务，请您在注册、浏览、下载、使用AI账号服务或购买会员服务前，仔细阅读本声明及相关用户协议、隐私政策、会员服务规则。您访问、注册或使用本网站服务，即视为您已阅读、理解并同意遵守相关规则。";

const enIntro =
  "Welcome to ENHE AI Tools. To protect user rights and regulate the use of our services, please read this statement, the User Agreement, Privacy Policy, and membership rules carefully before registering, browsing, downloading, using AI account services, or purchasing membership services. By accessing, registering for, or using this website, you are deemed to have read, understood, and agreed to follow the applicable rules.";

const legalPageMap: Record<Locale, Record<LegalSlug, LegalPage>> = {
  zh: {
    "user-agreement": {
      slug: "user-agreement",
      title: "用户协议",
      summary: "说明用户注册、浏览、下载、使用AI账号服务、评论和购买会员服务时需要遵守的基本规则。",
      sections: [
        {
          title: "一、网站服务说明",
          paragraphs: [
            zhIntro,
            "本网站主要提供自研AI软件应用展示、软件下载、AI账号服务、使用教程、会员服务及相关信息展示服务。",
            "本网站提供的工具、教程、说明文档及相关内容，仅用于合法、合规的学习、办公、效率提升、技术测试或个人使用场景。用户不得将任何工具、内容或服务用于违反法律法规、侵犯他人合法权益、破坏网络安全、传播违法信息或其他不当用途。"
          ]
        },
        {
          title: "二、用户使用责任",
          paragraphs: [
            "用户使用本网站服务时，应遵守中华人民共和国现行法律法规、部门规章、社会公德及互联网使用规范。",
            "用户不得上传、发布、传播或处理违法违规、色情低俗、赌博诈骗、暴力恐怖、违法交易、侵权、恶意代码、爬虫滥用、攻击脚本或其他危害网络安全与公共利益的内容。",
            "用户因违反法律法规、本声明、用户协议或不当使用服务而产生的责任，应由用户自行承担；本网站有权依法采取删除内容、限制功能、暂停账号、终止服务、保存记录并向有关部门报告等措施。"
          ]
        },
        {
          title: "三、账号、评论与内容管理",
          paragraphs: [
            "用户上传、发布或提交的文字、图片、截图、评论、反馈、文件等内容，应保证来源合法，并不侵犯任何第三方合法权益。",
            "用户上传或发布的内容不代表本网站立场。本网站有权对用户上传内容、评论内容及相关信息进行审核、删除、隐藏、限制展示或采取其他必要管理措施。"
          ]
        }
      ]
    },
    "privacy-policy": {
      slug: "privacy-policy",
      title: "隐私政策",
      summary: "说明本站在注册、订单、支付凭证、评论与工具使用过程中对用户信息的收集、使用和保护方式。",
      sections: [
        {
          title: "一、信息收集范围",
          paragraphs: [
            "为完成注册登录、订单创建、付款凭证审核、会员开通、软件下载、AI账号服务使用、评论审核和安全风控，本网站可能收集账号信息、订单信息、付款截图、评论内容、下载记录、使用记录、IP、User-Agent 及用户主动提交的其他信息。",
            "用户应确保提交的信息真实、准确、合法，不得冒用他人身份或提交侵犯他人权益的材料。"
          ]
        },
        {
          title: "二、信息使用目的",
          paragraphs: [
            "本网站仅在提供服务、核验订单、保障账号安全、处理售后、履行法定义务、改进产品体验和维护网站正常运营所必要的范围内使用相关信息。",
            "未经用户同意，本网站不会将用户个人信息出售给无关第三方。涉及第三方云服务、对象存储、开源组件或外部链接时，用户应同时阅读并遵守对应第三方的隐私政策与服务规则。"
          ]
        },
        {
          title: "三、信息安全与联系",
          paragraphs: [
            "本网站将尽力采用合理的技术与管理措施保护用户信息安全，但互联网环境并非绝对安全。",
            "如您对隐私保护、信息更正或删除有疑问，可通过联系邮箱 292055066@qq.com 与我们联系。"
          ]
        }
      ]
    },
    disclaimer: {
      slug: "disclaimer",
      title: "免责声明",
      summary: "说明网站服务边界、工具使用风险、第三方服务、知识产权与责任限制。",
      sections: [
        { title: "免责声明与合规使用声明", paragraphs: [zhIntro] },
        {
          title: "一、网站服务说明",
          paragraphs: [
            "本网站主要提供自研AI软件应用展示、软件下载、AI账号服务、使用教程、会员服务及相关信息展示服务。",
            "本网站所提供的工具、教程、说明文档及相关内容，仅用于合法、合规的学习、办公、效率提升、技术测试或个人使用场景。用户不得将本网站提供的任何工具、内容或服务用于违反法律法规、侵犯他人合法权益、破坏网络安全、传播违法信息或其他不当用途。"
          ]
        },
        {
          title: "二、用户使用责任",
          paragraphs: [
            "用户在使用本网站服务时，应遵守中华人民共和国现行法律法规、部门规章、社会公德及互联网使用规范。",
            "用户不得利用本网站上传、发布、传播或处理违反法律法规或国家政策的内容，涉及色情低俗、赌博诈骗、暴力恐怖、违法交易等内容，侵犯他人著作权、商标权、肖像权、名誉权、隐私权或其他合法权益的内容，含有病毒、木马、恶意代码、爬虫滥用、攻击脚本或危害网络安全的内容，或其他可能损害国家利益、公共利益、第三方合法权益或本网站正常运营的内容。",
            "用户因违反法律法规、本声明、用户协议或不当使用本网站服务而产生的责任，应由用户自行承担；本网站有权依法采取删除内容、限制功能、暂停账号、终止服务、保存记录并向有关部门报告等措施。"
          ]
        },
        {
          title: "三、工具使用风险提示",
          paragraphs: [
            "本网站将尽力保障AI软件应用、AI账号服务及相关内容的可用性、安全性和稳定性，但不承诺所有工具在任何设备、系统环境、网络环境下均能完全兼容或持续无故障运行。",
            "用户在下载、安装或使用软件工具前，应自行确认工具来源、系统兼容性、使用场景及数据备份情况。因用户设备环境、操作不当、第三方软件冲突、网络异常或违反使用说明造成的损失，本网站在法律允许范围内不承担责任。",
            "对于AI账号服务相关工具生成或处理的结果，用户应自行判断、核验并承担使用责任。相关结果不构成法律、医疗、金融、投资、税务、专业技术等领域的最终意见或保证。"
          ]
        },
        {
          title: "四、会员服务与付费说明",
          paragraphs: [
            "本网站可能提供 VIP 会员服务。会员权益、有效期、价格、开通方式、适用范围、退款规则等，以网站页面公示的会员服务规则为准。",
            "本网站当前可能采用个人收款码、订单号备注、付款截图上传、后台人工审核等方式完成会员开通。用户付款时应仔细核对订单号、金额、套餐内容及收款信息。",
            "用户付款后，应按照页面提示上传付款凭证。经后台审核确认后，本网站将为对应账号开通相应会员权益。将在2个小时完成审核。因用户未备注订单号、付款账号不一致、截图不清晰、重复付款、错误付款或其他原因导致无法核验的，用户应及时联系本站处理。",
            "会员服务属于数字化服务或虚拟权益服务，具体退款条件、退款时限、不可退款情形及售后处理方式，应以本网站单独公示的《会员服务与退款规则》为准。"
          ]
        },
        {
          title: "五、未成年人保护",
          paragraphs: [
            "未满十八周岁的用户应在监护人同意和指导下使用本网站。未成年人不得在未经监护人同意的情况下购买会员、下载付费软件或使用其他付费服务。",
            "如监护人发现未成年人未经同意发生付费行为，可通过本网站公示的联系方式与我们联系，并提供必要的身份关系、支付凭证、订单信息等材料，本网站将在核实后依法依规处理。",
            "本网站有权根据未成年人保护要求，对未成年人账号的注册、登录、付费、内容发布和服务使用进行必要限制。"
          ]
        },
        {
          title: "六、用户上传内容与评论",
          paragraphs: [
            "用户在本网站上传、发布或提交的文字、图片、截图、评论、反馈、文件等内容，应保证来源合法，并不侵犯任何第三方合法权益。",
            "用户上传或发布的内容不代表本网站立场。本网站有权对用户上传内容、评论内容及相关信息进行审核、删除、隐藏、限制展示或采取其他必要管理措施。",
            "用户因上传、发布或传播违法违规、侵权或不当内容而产生的法律责任，应由用户依法承担；本网站将根据法律法规要求配合有关部门处理。"
          ]
        },
        {
          title: "七、知识产权声明",
          paragraphs: [
            "本网站自研软件、页面设计、文字说明、教程内容、图标、Logo、程序代码、产品名称及相关内容，除另有说明外，其知识产权归本网站开发者或合法权利人所有。",
            "未经授权，任何用户不得复制、传播、改编、反向工程、破解、转售、出租、分发或以其他方式商业化使用本网站的软件、AI账号服务、教程、页面内容及相关资源。",
            "如本网站部分素材、图片、字体、图标或示例内容来源于公开网络、第三方授权资源或用户上传内容，相关权利归原权利人所有。若权利人认为相关内容侵犯其合法权益，可通过本网站公示联系方式提交权利证明、侵权内容链接、身份信息及初步证明材料。本网站核实后将依法及时处理。"
          ]
        },
        {
          title: "八、第三方服务说明",
          paragraphs: [
            "本网站可能接入第三方云服务、对象存储、支付辅助工具、数据分析工具、开源组件或外部链接。",
            "第三方服务的可用性、安全性、准确性及其隐私政策、服务规则由对应第三方负责。用户在使用第三方服务前，应自行阅读并遵守其相关规则。",
            "因第三方服务故障、网络异常、接口变更、政策调整或不可抗力导致服务中断、数据异常或功能不可用的，本网站将在合理范围内协助处理，但不对第三方原因造成的损失承担超出法律规定范围的责任。"
          ]
        },
        {
          title: "九、服务变更、中断与维护",
          paragraphs: [
            "本网站有权根据运营、技术、安全、合规或业务调整需要，对部分功能、工具、AI账号服务、会员权益、页面内容或服务规则进行更新、调整、暂停或终止。",
            "对涉及用户重大权益的调整，本网站将尽量通过页面公告、站内通知或其他合理方式进行提示。",
            "因系统维护、服务器故障、网络攻击、第三方服务异常、不可抗力或其他非本网站可完全控制的原因导致服务中断或异常的，本网站将尽力及时修复。"
          ]
        },
        {
          title: "十、责任限制",
          paragraphs: [
            "在法律允许的范围内，本网站不对因用户违法违规使用、违反本声明或用户协议、操作不当、设备故障、网络异常、第三方服务原因等导致的损失承担责任。",
            "本声明不排除、不限制用户依法享有的消费者权益，也不免除本网站依法应承担的责任。如本声明部分条款被认定为无效，不影响其他条款的效力。"
          ]
        },
        { title: "十一、规则更新", paragraphs: ["本网站有权根据法律法规变化、业务调整及运营需要更新本声明。更新后的声明将在网站相关页面公示，并自公示之日起生效。用户继续使用本网站服务的，视为接受更新后的声明。"] },
        { title: "十二、联系方式", paragraphs: ["如您对本声明、用户权益、版权投诉、未成年人付费、隐私保护或服务使用有任何问题，可通过以下方式联系我们：联系邮箱：292055066@qq.com。", "网站名称：恩禾 ENHE AI工具站。网站域名：www.enhe-tech.com.cn。"] }
      ]
    },
    "membership-refund": {
      slug: "membership-refund",
      title: "会员服务与退款规则",
      summary: "说明 VIP 会员、软件下载付费、人工审核开通、退款条件和售后处理方式。",
      sections: [
        { title: "一、会员服务说明", paragraphs: ["本网站可能提供 VIP 会员服务。会员权益、有效期、价格、开通方式、适用范围、退款规则等，以网站页面公示的会员服务规则为准。", "本网站当前可能采用个人收款码、订单号备注、付款截图上传、后台人工审核等方式完成会员开通。用户付款时应仔细核对订单号、金额、套餐内容及收款信息。"] },
        { title: "二、付款凭证与审核", paragraphs: ["用户付款后，应按照页面提示上传付款凭证。经后台审核确认后，本网站将为对应账号开通相应会员权益。将在2个小时完成审核。", "因用户未备注订单号、付款账号不一致、截图不清晰、重复付款、错误付款或其他原因导致无法核验的，用户应及时联系本站处理。"] },
        { title: "三、退款处理", paragraphs: ["会员服务属于数字化服务或虚拟权益服务。已经完成开通、下载或实际使用的服务，除法律法规另有规定或本站明确承诺外，原则上不支持无理由退款。", "如因重复付款、错误付款、未开通且可核验、未成年人未经监护人同意付费等情况需要处理，可通过联系邮箱 292055066@qq.com 提交订单号、支付凭证、账号信息和必要说明，本站将在核实后依法依规处理。"] }
      ]
    },
    "copyright-complaint": {
      slug: "copyright-complaint",
      title: "版权投诉指引",
      summary: "说明权利人如何提交侵权投诉、需要提供的材料以及本站处理方式。",
      sections: [
        { title: "一、知识产权声明", paragraphs: ["本网站自研软件、页面设计、文字说明、教程内容、图标、Logo、程序代码、产品名称及相关内容，除另有说明外，其知识产权归本网站开发者或合法权利人所有。", "未经授权，任何用户不得复制、传播、改编、反向工程、破解、转售、出租、分发或以其他方式商业化使用本网站的软件、AI账号服务、教程、页面内容及相关资源。"] },
        { title: "二、投诉材料", paragraphs: ["若权利人认为相关内容侵犯其合法权益，可通过联系邮箱 292055066@qq.com 提交权利证明、侵权内容链接、身份信息、联系方式及初步证明材料。", "本站收到完整材料后，将根据法律法规和平台规则进行核实，并依法及时采取删除、隐藏、断开链接或其他必要处理措施。"] }
      ]
    },
    "minor-protection": {
      slug: "minor-protection",
      title: "未成年人保护规则",
      summary: "说明未成年人使用、付费、下载和监护人申诉处理规则。",
      sections: [
        { title: "一、使用要求", paragraphs: ["未满十八周岁的用户应在监护人同意和指导下使用本网站。", "未成年人不得在未经监护人同意的情况下购买会员、下载付费软件或使用其他付费服务。"] },
        { title: "二、监护人处理", paragraphs: ["如监护人发现未成年人未经同意发生付费行为，可通过本网站公示的联系方式与我们联系，并提供必要的身份关系、支付凭证、订单信息等材料，本网站将在核实后依法依规处理。", "本网站有权根据未成年人保护要求，对未成年人账号的注册、登录、付费、内容发布和服务使用进行必要限制。"] }
      ]
    }
  },
  en: {
    "user-agreement": {
      slug: "user-agreement",
      title: "User Agreement",
      summary: "Basic rules for registration, browsing, downloads, AI account service usage, comments, and membership purchases.",
      sections: [
        {
          title: "1. Website Services",
          paragraphs: [
            enIntro,
            "This website mainly provides self-developed AI software app displays, software downloads, AI account services, tutorials, membership services, and related information.",
            "The tools, tutorials, documentation, and content provided on this website are intended only for lawful and compliant learning, office work, productivity improvement, technical testing, or personal use. Users may not use any tool, content, or service for illegal purposes, infringement, network security damage, distribution of unlawful information, or other improper uses."
          ]
        },
        {
          title: "2. User Responsibilities",
          paragraphs: [
            "Users must comply with applicable laws and regulations, departmental rules, public morality, and internet usage norms when using this website.",
            "Users may not upload, publish, transmit, or process content that is illegal, pornographic, gambling-related, fraudulent, violent, terrorist-related, infringing, malicious, abusive to crawlers, attack-oriented, harmful to network security, or otherwise harmful to public interests, third-party rights, or normal website operations.",
            "Users are solely responsible for liabilities arising from violations of laws, this statement, the User Agreement, or improper use of the services. The website may delete content, restrict features, suspend accounts, terminate services, retain records, and report to competent authorities as required by law."
          ]
        },
        {
          title: "3. Accounts, Comments, and Content Management",
          paragraphs: [
            "Text, images, screenshots, comments, feedback, files, and other content submitted by users must come from lawful sources and must not infringe any third-party rights.",
            "User-submitted content does not represent the position of this website. The website may review, delete, hide, restrict display of, or otherwise manage user-submitted content and comments when necessary."
          ]
        }
      ]
    },
    "privacy-policy": {
      slug: "privacy-policy",
      title: "Privacy Policy",
      summary: "How we collect, use, and protect user information during registration, orders, payment proof review, comments, and tool usage.",
      sections: [
        {
          title: "1. Information We Collect",
          paragraphs: [
            "To provide registration and login, order creation, payment proof review, membership activation, software downloads, AI account service usage, comment moderation, and security risk control, we may collect account information, order information, payment screenshots, comments, download records, usage records, IP addresses, User-Agent data, and other information submitted by users.",
            "Users should ensure that submitted information is true, accurate, lawful, and does not impersonate others or infringe the rights of others."
          ]
        },
        {
          title: "2. How We Use Information",
          paragraphs: [
            "We use relevant information only where necessary to provide services, verify orders, protect account security, handle after-sales support, fulfill legal obligations, improve product experience, and maintain normal website operation.",
            "We do not sell users' personal information to unrelated third parties without user consent. Where third-party cloud services, object storage, open-source components, or external links are involved, users should also read and comply with the applicable third-party privacy policies and service rules."
          ]
        },
        {
          title: "3. Security and Contact",
          paragraphs: [
            "We will use reasonable technical and administrative measures to protect user information, but the internet environment is not absolutely secure.",
            "For privacy protection, correction, or deletion requests, please contact us at 292055066@qq.com."
          ]
        }
      ]
    },
    disclaimer: {
      slug: "disclaimer",
      title: "Disclaimer",
      summary: "Service boundaries, tool usage risks, third-party services, intellectual property, and limitations of liability.",
      sections: [
        { title: "Disclaimer and Compliance Statement", paragraphs: [enIntro] },
        {
          title: "1. Website Services",
          paragraphs: [
            "This website mainly provides self-developed AI software app displays, software downloads, AI account services, tutorials, membership services, and related information.",
            "All tools, tutorials, documentation, and content are intended only for lawful and compliant learning, office work, productivity improvement, technical testing, or personal use. Users must not use the website for illegal activities, infringement, network security damage, unlawful information distribution, or other improper purposes."
          ]
        },
        {
          title: "2. User Responsibilities",
          paragraphs: [
            "Users must comply with applicable laws, regulations, public morality, and internet usage norms.",
            "Users may not upload, publish, transmit, or process illegal or policy-violating content, pornography, gambling, fraud, violence, terrorism-related content, unlawful transactions, infringing materials, malware, trojans, malicious code, abusive crawlers, attack scripts, or any content that may harm national interests, public interests, third-party rights, or normal website operations.",
            "Users are solely responsible for liabilities caused by violations of laws, this statement, the User Agreement, or improper use of the services. The website may delete content, restrict features, suspend accounts, terminate services, preserve records, and report to relevant authorities."
          ]
        },
        {
          title: "3. Tool Usage Risk Notice",
          paragraphs: [
            "We will try to ensure the availability, security, and stability of AI software apps, AI account services, and related content, but we do not guarantee full compatibility or uninterrupted operation under all devices, systems, or network environments.",
            "Before downloading, installing, or using software tools, users should verify the source, system compatibility, intended scenario, and data backup status. To the extent permitted by law, we are not liable for losses caused by user device environments, improper operation, third-party software conflicts, network issues, or violation of usage instructions.",
            "Users are responsible for reviewing and verifying results generated or processed through AI account services. Such results do not constitute final legal, medical, financial, investment, tax, professional technical, or other expert advice or guarantees."
          ]
        },
        {
          title: "4. Membership and Payment",
          paragraphs: [
            "The website may provide VIP membership services. Benefits, validity periods, prices, activation methods, scope, and refund rules are subject to the membership rules displayed on the website.",
            "The current version may use personal payment QR codes, order number remarks, payment screenshot uploads, and manual backend review to activate membership. Users should carefully verify the order number, amount, plan details, and payment recipient information before paying.",
            "After payment, users should upload payment proof as instructed. After backend approval, the corresponding membership benefits will be activated for the account. Review will be completed within 2 hours. If the order cannot be verified due to missing order remarks, inconsistent payer accounts, unclear screenshots, duplicate payments, incorrect payments, or other reasons, users should contact us promptly.",
            "Membership services are digital or virtual benefit services. Refund conditions, refund periods, non-refundable circumstances, and after-sales handling are governed by the separately published Membership and Refund Rules."
          ]
        },
        {
          title: "5. Protection of Minors",
          paragraphs: [
            "Users under the age of 18 should use this website with the consent and guidance of a guardian. Minors may not purchase memberships, paid software downloads, or other paid services without guardian consent.",
            "If a guardian discovers an unauthorized payment by a minor, the guardian may contact us through the published contact information and provide necessary relationship proof, payment proof, order information, and other materials. We will handle the matter in accordance with applicable laws and rules after verification.",
            "The website may impose necessary restrictions on registration, login, payment, content publishing, and service usage for minor accounts according to minor protection requirements."
          ]
        },
        {
          title: "6. User Uploads and Comments",
          paragraphs: [
            "Users must ensure that uploaded or submitted text, images, screenshots, comments, feedback, files, and other content are lawful and do not infringe any third-party rights.",
            "User content does not represent the position of this website. The website may review, delete, hide, restrict display of, or otherwise manage user content and comments.",
            "Users are legally responsible for unlawful, infringing, or improper content they upload, publish, or distribute. The website will cooperate with competent authorities as required by law."
          ]
        },
        {
          title: "7. Intellectual Property",
          paragraphs: [
            "Unless otherwise stated, the website's self-developed software, page design, written descriptions, tutorials, icons, Logo, program code, product names, and related content are owned by the website developer or lawful rights holders.",
            "Without authorization, users may not copy, distribute, adapt, reverse engineer, crack, resell, rent, redistribute, or commercialize the website's software, AI account services, tutorials, page content, or related resources.",
            "If any materials, images, fonts, icons, or sample content originate from public networks, third-party licensed resources, or user uploads, the rights belong to their original rights holders. Rights holders may submit proof of rights, infringing links, identity information, and preliminary evidence through the published contact information. We will handle verified complaints in a timely manner according to law."
          ]
        },
        {
          title: "8. Third-Party Services",
          paragraphs: [
            "The website may use third-party cloud services, object storage, payment assistance tools, analytics tools, open-source components, or external links.",
            "Availability, security, accuracy, privacy policies, and service rules of third-party services are the responsibility of the relevant third parties. Users should read and comply with those rules before using third-party services.",
            "If service interruption, data abnormality, or feature unavailability is caused by third-party failures, network issues, API changes, policy changes, or force majeure, we will provide reasonable assistance but will not assume liability beyond what is required by law for third-party causes."
          ]
        },
        {
          title: "9. Service Changes, Interruptions, and Maintenance",
          paragraphs: [
            "The website may update, adjust, suspend, or terminate certain features, tools, AI account services, membership benefits, page content, or service rules due to operational, technical, security, compliance, or business needs.",
            "For changes involving major user rights, we will try to provide notice through page announcements, in-site notifications, or other reasonable methods.",
            "If service interruptions or abnormalities occur due to system maintenance, server failures, network attacks, third-party service issues, force majeure, or other reasons not fully controllable by the website, we will try to restore service promptly."
          ]
        },
        {
          title: "10. Limitation of Liability",
          paragraphs: [
            "To the extent permitted by law, we are not liable for losses caused by users' illegal or improper use, violation of this statement or the User Agreement, improper operation, device failures, network issues, or third-party service causes.",
            "This statement does not exclude or limit consumer rights users are entitled to by law, nor does it exempt the website from responsibilities it must legally bear. If any provision is deemed invalid, the remaining provisions remain effective."
          ]
        },
        { title: "11. Updates", paragraphs: ["We may update this statement due to changes in laws and regulations, business adjustments, or operational needs. Updated terms will be displayed on the relevant website pages and take effect from the date of publication. Continued use of the website indicates acceptance of the updated statement."] },
        { title: "12. Contact", paragraphs: ["For questions about this statement, user rights, copyright complaints, minor payments, privacy protection, or service usage, contact us at 292055066@qq.com.", "Website name: ENHE AI Tools. Domain: www.enhe-tech.com.cn."] }
      ]
    },
    "membership-refund": {
      slug: "membership-refund",
      title: "Membership and Refund Rules",
      summary: "Rules for VIP membership, paid software downloads, manual review, refund conditions, and after-sales handling.",
      sections: [
        { title: "1. Membership Services", paragraphs: ["The website may provide VIP membership services. Benefits, validity periods, prices, activation methods, scope, and refund rules are subject to the membership rules displayed on the website.", "The current version may use personal payment QR codes, order number remarks, payment screenshot uploads, and manual backend review to activate membership. Users should carefully verify the order number, amount, plan details, and recipient information before paying."] },
        { title: "2. Payment Proof and Review", paragraphs: ["After payment, users should upload payment proof as instructed. After backend approval, the corresponding membership benefits will be activated for the account. Review will be completed within 2 hours.", "If verification fails due to missing order remarks, inconsistent payer accounts, unclear screenshots, duplicate payments, incorrect payments, or other reasons, users should contact us promptly."] },
        { title: "3. Refund Handling", paragraphs: ["Membership services are digital services or virtual benefits. Once activated, downloaded, or actually used, they generally do not support no-reason refunds unless otherwise required by law or expressly promised by the website.", "For duplicate payments, incorrect payments, unactivated and verifiable orders, or payments made by minors without guardian consent, please email 292055066@qq.com with the order number, payment proof, account information, and necessary explanation. We will handle the matter after verification according to applicable laws and rules."] }
      ]
    },
    "copyright-complaint": {
      slug: "copyright-complaint",
      title: "Copyright Complaint Guide",
      summary: "How rights holders can submit infringement complaints, what materials are required, and how we process them.",
      sections: [
        { title: "1. Intellectual Property Statement", paragraphs: ["Unless otherwise stated, the website's self-developed software, page design, written descriptions, tutorials, icons, Logo, program code, product names, and related content are owned by the website developer or lawful rights holders.", "Without authorization, users may not copy, distribute, adapt, reverse engineer, crack, resell, rent, redistribute, or commercialize the website's software, AI account services, tutorials, page content, or related resources."] },
        { title: "2. Complaint Materials", paragraphs: ["If a rights holder believes that content infringes their lawful rights, they may email 292055066@qq.com with proof of rights, the infringing content link, identity information, contact information, and preliminary evidence.", "After receiving complete materials, we will verify the complaint according to laws and platform rules and take necessary measures such as deletion, hiding, or link removal in a timely manner."] }
      ]
    },
    "minor-protection": {
      slug: "minor-protection",
      title: "Minor Protection Rules",
      summary: "Rules for minors' use, payments, downloads, and guardian complaint handling.",
      sections: [
        { title: "1. Usage Requirements", paragraphs: ["Users under the age of 18 should use this website with the consent and guidance of a guardian.", "Minors may not purchase memberships, paid software downloads, or other paid services without guardian consent."] },
        { title: "2. Guardian Handling", paragraphs: ["If a guardian discovers an unauthorized payment by a minor, the guardian may contact us through the published contact information and provide necessary relationship proof, payment proof, order information, and other materials. We will handle the matter according to law after verification.", "The website may impose necessary restrictions on registration, login, payment, content publishing, and service usage for minor accounts according to minor protection requirements."] }
      ]
    }
  }
};

export const legalPages = legalSlugs.map((slug) => legalPageMap.zh[slug]);

export function getLegalPage(slug: string, locale: Locale = "zh") {
  return legalSlugs.includes(slug as LegalSlug) ? legalPageMap[locale][slug as LegalSlug] : undefined;
}
