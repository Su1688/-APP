const CATEGORIES = [
  { id: "all", name: "全部", emoji: "🍽" },
  { id: "hot", name: "热菜", emoji: "🔥" },
  { id: "soup", name: "汤羹", emoji: "🍲" },
  { id: "staple", name: "主食", emoji: "🍚" },
  { id: "snack", name: "小吃", emoji: "🍟" },
  { id: "dessert", name: "甜品", emoji: "🍰" },
  { id: "drink", name: "饮品", emoji: "🧋" }
];

const SPICY_TEXT = {
  0: "",
  1: "微辣",
  2: "中辣",
  3: "特辣"
};

const DISHES = [
  {
    id: "suanmiao-chaorou",
    name: "蒜苗炒肉",
    image: "/assets/dishes/dish-01.jpg",
    emoji: "🥘",
    category: "hot",
    desc: "我做的：蒜苗香、辣椒够，拌饭能吃两碗",
    tags: ["招牌", "下饭", "硬菜"],
    spicy: 2,
    minutes: 20,
    level: 2,
    ingredients: [
      "猪前腿肉 300g（肥瘦分开切薄片）",
      "蒜苗 1 把（斜刀切段）",
      "青辣椒 2 个、红辣椒 2 个",
      "土豆 1 个（切片，可选）",
      "生抽 2 勺、老抽 半勺、蚝油 1 勺",
      "蒜 3 瓣、姜 3 片",
      "盐、白糖 少许"
    ],
    steps: [
      "肉切薄片，肥瘦分开放；蒜苗斜切段，辣椒切段，土豆切片",
      "热锅不放油，先下肥肉煸出油",
      "下瘦肉滑散炒到变色，盛出备用",
      "底油下姜蒜和辣椒炒香，放土豆片翻炒到边缘透明",
      "倒回肉片，加生抽、老抽、蚝油，大火翻炒上色",
      "下蒜苗段，加盐和一点糖，大火 30 秒断生就出锅"
    ]
  },
  {
    id: "fanqie-chaodan",
    name: "番茄炒蛋",
    emoji: "🍅",
    category: "hot",
    desc: "酸甜多汁，汤汁拌米饭能吃两碗",
    tags: ["招牌", "下饭", "零失败"],
    spicy: 0,
    minutes: 10,
    level: 1,
    ingredients: ["番茄 2 个", "鸡蛋 3 个", "白糖 1 小勺", "盐 适量", "葱花 少许"],
    steps: [
      "番茄顶部划十字，开水烫 30 秒后去皮切块；鸡蛋加少许盐打散。",
      "热锅多油，倒入蛋液，边缘凝固后炒成大块盛出。",
      "用底油下番茄块，加糖和盐中火炒到出沙、汤汁变浓。",
      "倒回鸡蛋翻匀，撒葱花出锅。"
    ]
  },
  {
    id: "kele-jichi",
    name: "可乐鸡翅",
    emoji: "🍗",
    category: "hot",
    desc: "甜咸挂汁，翅面亮晶晶，新手也翻不了车",
    tags: ["招牌", "甜口", "零失败"],
    spicy: 0,
    minutes: 25,
    level: 1,
    ingredients: ["鸡中翅 10 个", "可乐 1 罐", "生抽 2 勺", "姜片 3 片", "料酒 1 勺"],
    steps: [
      "鸡翅两面各划两刀，冷水下锅加料酒焯 3 分钟，捞出擦干。",
      "锅内少油，鸡翅中小火煎到两面金黄。",
      "倒入可乐没过鸡翅，加生抽和姜片，大火烧开转中小火煮 12 分钟。",
      "开大火收汁到酱汁浓稠裹住鸡翅即可。"
    ]
  },
  {
    id: "hongshaorou",
    name: "红烧肉",
    emoji: "🥩",
    category: "hot",
    desc: "肥而不腻、入口即化，硬菜担当",
    tags: ["硬菜", "下饭"],
    spicy: 0,
    minutes: 60,
    level: 3,
    ingredients: ["五花肉 500g", "冰糖 20g", "生抽 2 勺", "老抽 1 勺", "姜片 3 片", "八角 2 颗"],
    steps: [
      "五花肉切 3cm 见方的块，冷水下锅焯 3 分钟，捞出冲净浮沫。",
      "锅内少油下冰糖，小火炒到琥珀色，倒入肉块翻炒上色。",
      "加姜片、八角、生抽、老抽，倒入没过肉的热水，烧开转小火炖 40 分钟。",
      "大火收汁到浓稠挂勺，撒葱花出锅。"
    ]
  },
  {
    id: "qingjiao-rousi",
    name: "青椒肉丝",
    emoji: "🫑",
    category: "hot",
    desc: "肉丝滑嫩，青椒脆爽，米饭杀手",
    tags: ["家常", "快炒"],
    spicy: 1,
    minutes: 15,
    level: 2,
    ingredients: ["猪里脊 200g", "青椒 3 个", "蒜末 2 瓣", "生抽 1 勺", "淀粉 1 勺"],
    steps: [
      "里脊顺纹切丝，加生抽、淀粉和一点油抓匀腌 10 分钟。",
      "青椒去籽切丝，热锅冷油下肉丝快速滑散至变色盛出。",
      "底油爆香蒜末，下青椒丝大火炒 1 分钟。",
      "倒回肉丝，加盐翻匀出锅。"
    ]
  },
  {
    id: "mapo-doufu",
    name: "麻婆豆腐",
    emoji: "🌶️",
    category: "hot",
    desc: "麻辣鲜香，一勺豆腐一勺饭",
    tags: ["麻辣", "下饭"],
    spicy: 3,
    minutes: 20,
    level: 2,
    ingredients: ["嫩豆腐 1 盒", "牛肉末 80g", "豆瓣酱 1 勺", "花椒粉 少许", "蒜末 2 瓣", "水淀粉 适量"],
    steps: [
      "豆腐切小块，放淡盐水里泡 5 分钟去豆腥。",
      "热油下牛肉末炒散，加豆瓣酱和蒜末炒出红油。",
      "加一碗热水烧开，轻轻推入豆腐块，中小火煮 5 分钟。",
      "分两次淋入水淀粉勾芡，出锅撒花椒粉和葱花。"
    ]
  },
  {
    id: "suanrong-xilanhua",
    name: "蒜蓉西兰花",
    emoji: "🥦",
    category: "hot",
    desc: "清爽解腻，颜色翠绿好看",
    tags: ["清淡", "低卡"],
    spicy: 0,
    minutes: 10,
    level: 1,
    ingredients: ["西兰花 1 颗", "大蒜 4 瓣", "蚝油 1 勺", "盐 适量"],
    steps: [
      "西兰花掰小朵，淡盐水泡 10 分钟后洗净。",
      "水烧开加一点盐和油，焯 90 秒后捞出过凉水。",
      "热锅冷油爆香蒜末，倒入西兰花大火翻炒。",
      "加蚝油和盐炒匀，出锅。"
    ]
  },
  {
    id: "fanqie-danhua-tang",
    name: "番茄蛋花汤",
    emoji: "🍲",
    category: "soup",
    desc: "10 分钟出锅，暖胃又开胃",
    tags: ["快手", "暖胃"],
    spicy: 0,
    minutes: 10,
    level: 1,
    ingredients: ["番茄 2 个", "鸡蛋 2 个", "香油 几滴", "盐 适量", "葱花 少许"],
    steps: [
      "番茄切小块，鸡蛋打散备用。",
      "锅中热油炒番茄到出汁，加两碗水烧开煮 3 分钟。",
      "转小火，把蛋液沿锅边缓缓淋入，形成蛋花。",
      "加盐调味，滴香油，撒葱花。"
    ]
  },
  {
    id: "yumi-paigu-tang",
    name: "玉米排骨汤",
    emoji: "🌽",
    category: "soup",
    desc: "清甜不油，喝完浑身都暖",
    tags: ["炖汤", "清甜"],
    spicy: 0,
    minutes: 70,
    level: 2,
    ingredients: ["排骨 400g", "甜玉米 2 根", "胡萝卜 1 根", "姜片 3 片", "盐 适量"],
    steps: [
      "排骨冷水下锅焯 3 分钟，捞出洗净浮沫。",
      "玉米切段，胡萝卜切滚刀块。",
      "所有食材加姜片和足量清水，大火烧开转小火炖 60 分钟。",
      "出锅前加盐调味即可。"
    ]
  },
  {
    id: "zicai-danhua-tang",
    name: "紫菜蛋花汤",
    emoji: "🥣",
    category: "soup",
    desc: "8 分钟搞定，低卡又鲜",
    tags: ["快手", "低卡"],
    spicy: 0,
    minutes: 8,
    level: 1,
    ingredients: ["紫菜 1 小把", "鸡蛋 2 个", "虾皮 1 勺", "香油 几滴", "盐 适量"],
    steps: [
      "紫菜撕小块，鸡蛋打散。",
      "水烧开后放入紫菜和虾皮煮 2 分钟。",
      "转小火淋入蛋液，蛋花成型后关火。",
      "加盐、滴香油，撒葱花。"
    ]
  },
  {
    id: "dan-chaofan",
    name: "黄金蛋炒饭",
    emoji: "🍚",
    category: "staple",
    desc: "粒粒分明，每颗饭都裹上蛋液",
    tags: ["快手", "管饱"],
    spicy: 0,
    minutes: 12,
    level: 1,
    ingredients: ["隔夜米饭 2 碗", "鸡蛋 2 个", "胡萝卜丁 半根", "火腿丁 适量", "葱花 少许"],
    steps: [
      "鸡蛋打散倒入冷米饭中拌匀，让米粒都裹上蛋液。",
      "热锅多油，下米饭中大火翻炒到粒粒松散。",
      "加胡萝卜丁和火腿丁炒 2 分钟。",
      "加盐调味，撒葱花翻匀出锅。"
    ]
  },
  {
    id: "fanqie-jidan-mian",
    name: "番茄鸡蛋面",
    emoji: "🍜",
    category: "staple",
    desc: "一锅出，汤浓面滑，宵夜首选",
    tags: ["一锅出", "暖胃"],
    spicy: 0,
    minutes: 15,
    level: 1,
    ingredients: ["挂面 1 把", "番茄 2 个", "鸡蛋 2 个", "生抽 1 勺", "葱花 少许"],
    steps: [
      "番茄切块，鸡蛋打散后炒成蛋块盛出。",
      "底油炒番茄出沙，加生抽和两碗水烧开。",
      "下挂面煮到喜欢的软硬。",
      "倒回鸡蛋，加盐调味，撒葱花。"
    ]
  },
  {
    id: "zhurou-baicai-jiaozi",
    name: "猪肉白菜水饺",
    emoji: "🥟",
    category: "staple",
    desc: "现包现煮，配醋和蒜超满足",
    tags: ["手作", "管饱"],
    spicy: 0,
    minutes: 50,
    level: 3,
    ingredients: ["饺子皮 1 斤", "猪肉末 300g", "白菜 半颗", "姜末 1 勺", "生抽 2 勺", "香油 1 勺"],
    steps: [
      "白菜剁碎加盐杀水 10 分钟，挤干水分。",
      "肉末加姜末、生抽、香油和 3 勺清水，顺一个方向搅上劲。",
      "拌入白菜碎成馅，包成饺子。",
      "水开下锅，三次点水煮到饺子浮起即可。"
    ]
  },
  {
    id: "congyou-banmian",
    name: "葱油拌面",
    emoji: "🍝",
    category: "staple",
    desc: "葱香浓到上头，拌开就是香",
    tags: ["香", "快手"],
    spicy: 0,
    minutes: 15,
    level: 1,
    ingredients: ["细面条 1 把", "小葱 1 大把", "生抽 2 勺", "老抽 半勺", "白糖 1 小勺"],
    steps: [
      "小葱切段，冷油下锅小火慢炸到葱段焦黄。",
      "关火后加生抽、老抽和白糖，利用余温拌匀成葱油汁。",
      "面条煮熟捞出过一下凉水，沥干。",
      "淋上葱油汁充分拌匀即可。"
    ]
  },
  {
    id: "jimi-hua",
    name: "香酥鸡米花",
    emoji: "🍗",
    category: "snack",
    desc: "外脆里嫩，配番茄酱追剧神器",
    tags: ["追剧", "酥脆"],
    spicy: 1,
    minutes: 25,
    level: 2,
    ingredients: ["鸡胸肉 300g", "鸡蛋 1 个", "淀粉 3 勺", "面包糠 适量", "黑胡椒 少许"],
    steps: [
      "鸡胸肉切小块，加盐、黑胡椒和鸡蛋抓匀腌 15 分钟。",
      "依次裹淀粉、蛋液、面包糠。",
      "油温六成热下锅，中小火炸 3 分钟到金黄。",
      "捞出沥油，复炸 30 秒更酥。"
    ]
  },
  {
    id: "zhishi-hongshu",
    name: "芝士焗红薯",
    emoji: "🍠",
    category: "snack",
    desc: "拉丝芝士配绵密红薯，甜到心里",
    tags: ["拉丝", "甜口"],
    spicy: 0,
    minutes: 35,
    level: 1,
    ingredients: ["红薯 2 个", "马苏里拉芝士 100g", "黄油 15g", "牛奶 2 勺", "白糖 1 小勺"],
    steps: [
      "红薯洗净对半切开，上锅蒸 20 分钟至软。",
      "挖出红薯肉，与黄油、牛奶、白糖拌成泥。",
      "把薯泥填回红薯壳，铺满芝士碎。",
      "烤箱 200 度烤 10 分钟到芝士融化上色。"
    ]
  },
  {
    id: "zhangyu-xiaowanzi",
    name: "章鱼小丸子",
    emoji: "🐙",
    category: "snack",
    desc: "外酥里嫩，撒满木鱼花会跳舞",
    tags: ["夜市", "有趣"],
    spicy: 0,
    minutes: 30,
    level: 3,
    ingredients: ["低筋面粉 100g", "鸡蛋 1 个", "熟章鱼丁 80g", "木鱼花 适量", "沙拉酱 适量", "照烧汁 适量"],
    steps: [
      "面粉、鸡蛋加 180ml 高汤调成稀糊，静置 15 分钟。",
      "丸子锅刷油烧热，倒入粉糊至八分满，撒章鱼丁和葱花。",
      "边缘凝固后用签子转 90 度，补一点粉糊再翻转成球。",
      "煎到表面金黄，挤照烧汁和沙拉酱，撒木鱼花。"
    ]
  },
  {
    id: "mangguo-banji",
    name: "芒果班戟",
    emoji: "🥭",
    category: "dessert",
    desc: "软皮裹着奶油和芒果，一口爆汁",
    tags: ["港式", "奶油"],
    spicy: 0,
    minutes: 40,
    level: 3,
    ingredients: ["低筋面粉 60g", "鸡蛋 1 个", "牛奶 180ml", "淡奶油 200ml", "芒果 2 个", "白糖 25g"],
    steps: [
      "面粉、鸡蛋、牛奶和 10g 糖拌成面糊，过筛后静置 20 分钟。",
      "平底锅小火摊成薄饼皮，单面凝固即可取出晾凉。",
      "淡奶油加 15g 糖打发到硬挺，芒果切条。",
      "饼皮上放奶油和芒果，四边折起包成方块，冷藏 30 分钟。"
    ]
  },
  {
    id: "yangzhi-ganlu",
    name: "杨枝甘露",
    emoji: "🍧",
    category: "dessert",
    desc: "芒果西柚椰奶，夏天一口入魂",
    tags: ["清爽", "夏日"],
    spicy: 0,
    minutes: 20,
    level: 2,
    ingredients: ["芒果 3 个", "西柚 半个", "西米 50g", "椰浆 150ml", "牛奶 100ml", "炼乳 1 勺"],
    steps: [
      "水开下西米煮 12 分钟，关火焖到中间无白点，过凉水。",
      "芒果一半打成果泥，一半切丁；西柚剥出果粒。",
      "椰浆、牛奶、炼乳和芒果泥拌匀成底。",
      "加入西米、芒果丁和西柚粒，冷藏后更好喝。"
    ]
  },
  {
    id: "tilamisu",
    name: "提拉米苏",
    emoji: "🍰",
    category: "dessert",
    desc: "咖啡微苦配奶香，浪漫值拉满",
    tags: ["咖啡", "浪漫"],
    spicy: 0,
    minutes: 240,
    level: 3,
    ingredients: ["马斯卡彭 250g", "手指饼干 12 根", "蛋黄 2 个", "淡奶油 150ml", "浓缩咖啡 100ml", "可可粉 适量"],
    steps: [
      "蛋黄加糖隔热水打到浓稠发白，拌入马斯卡彭。",
      "淡奶油打至七分发，翻拌进芝士糊。",
      "手指饼干快速蘸咖啡液，铺一层在容器底部。",
      "一层芝士糊一层饼干交替铺满，冷藏 4 小时，食用前筛可可粉。"
    ]
  },
  {
    id: "ningmeng-qipaoshui",
    name: "柠檬气泡水",
    emoji: "🍋",
    category: "drink",
    desc: "3 分钟搞定，解腻第一名",
    tags: ["零难度", "清爽"],
    spicy: 0,
    minutes: 3,
    level: 1,
    ingredients: ["柠檬 1 个", "苏打水 1 瓶", "蜂蜜 1 勺", "冰块 适量", "薄荷叶 几片"],
    steps: [
      "柠檬切两片装饰，其余挤汁。",
      "杯中加柠檬汁、蜂蜜和冰块。",
      "倒入冰镇苏打水，放柠檬片和薄荷叶。"
    ]
  },
  {
    id: "zhenzhu-naicha",
    name: "珍珠奶茶",
    emoji: "🧋",
    category: "drink",
    desc: "在家实现奶茶自由，珍珠 QQ 弹",
    tags: ["奶茶自由"],
    spicy: 0,
    minutes: 30,
    level: 2,
    ingredients: ["木薯珍珠 80g", "红茶包 2 个", "牛奶 250ml", "红糖 2 勺"],
    steps: [
      "水开下珍珠煮 20 分钟，关火焖 10 分钟，捞出过凉水。",
      "红糖加水煮成浓糖浆，拌入珍珠。",
      "红茶包用 100ml 热水泡 5 分钟，加牛奶和糖调味。",
      "杯中先放珍珠和糖浆，再倒入奶茶。"
    ]
  },
  {
    id: "xianzha-chengzhi",
    name: "鲜榨橙汁",
    emoji: "🍊",
    category: "drink",
    desc: "无添加，补充今日份维 C",
    tags: ["维C", "早餐"],
    spicy: 0,
    minutes: 5,
    level: 1,
    ingredients: ["橙子 4 个", "蜂蜜 1 小勺", "冰块 适量"],
    steps: [
      "橙子对半切开，用榨汁器榨出果汁。",
      "过滤掉粗渣，按口味加蜂蜜。",
      "加冰块摇匀，立刻喝掉最鲜。"
    ]
  },
  {
    id: "egg-baobao",
    name: "抱抱糯米糍",
    emoji: "🍡",
    category: "dessert",
    hidden: true,
    desc: "菜单上翻不到的那种甜，打中某两个字才会冒出来",
    tags: ["隐藏", "甜"],
    spicy: 0,
    minutes: 20,
    level: 1,
    ingredients: [
      "糯米粉 150g、玉米淀粉 30g",
      "牛奶 180ml、糖 30g",
      "黄油 10g",
      "椰蓉 适量"
    ],
    steps: [
      "糯米粉、玉米淀粉、糖、牛奶搅成没有颗粒的糊。",
      "盖上保鲜膜扎几个孔，上锅蒸 20 分钟，中途搅一次。",
      "趁热把黄油揉进去，放到不烫手。",
      "揪成小团，裹一圈椰蓉，凉了更好吃。"
    ]
  }
];

const DISH_MAP = {};
DISHES.forEach(function (dish) {
  DISH_MAP[dish.id] = dish;
});

const CATEGORY_MAP = {};
CATEGORIES.forEach(function (item) {
  CATEGORY_MAP[item.id] = item;
});

function getDish(id) {
  return DISH_MAP[id] || null;
}

function getCategoryName(id) {
  const item = CATEGORY_MAP[id];
  return item ? item.name : "其他";
}

function getSpicyText(level) {
  return SPICY_TEXT[level] || "";
}

module.exports = {
  CATEGORIES: CATEGORIES,
  DISHES: DISHES,
  DISH_MAP: DISH_MAP,
  CATEGORY_MAP: CATEGORY_MAP,
  getDish: getDish,
  getCategoryName: getCategoryName,
  getSpicyText: getSpicyText
};
