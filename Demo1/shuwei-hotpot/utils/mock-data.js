const menuData = {
        categories: [
                { id: 'cat1', name: '🔥 招牌锅底', icon: '🍲' },
                { id: 'cat2', name: '🥩 精品荤菜', icon: '🥩' },
                { id: 'cat3', name: '🦐 海鲜河鲜', icon: '🦐' },
                { id: 'cat4', name: '🥬 时蔬菌菇', icon: '🥬' },
                { id: 'cat5', name: '🍡 丸滑豆制品', icon: '🍡' },
                { id: 'cat6', name: '🍜 小吃主食', icon: '🍜' },
                { id: 'cat7', name: '🥤 酒水饮品', icon: '🥤' },
        ],

        items: [
                // 招牌锅底
                { id: '001', catId: 'cat1', name: '牛油麻辣锅底', desc: '四川汉源花椒+二荆条辣椒，麻辣鲜香', price: 68, unit: '份', image: '🍲', spicy: 5, tags: ['招牌', '麻辣'], sales: 9999 },
                { id: '002', catId: 'cat1', name: '番茄牛腩锅底', desc: '新鲜番茄慢熬6小时，酸甜浓郁', price: 58, unit: '份', image: '🍅', spicy: 0, tags: ['人气'], sales: 8500 },
                { id: '003', catId: 'cat1', name: '菌汤锅底', desc: '云南野生菌菇熬制，鲜美滋补', price: 48, unit: '份', image: '🍄', spicy: 0, tags: ['养生'], sales: 6200 },
                { id: '004', catId: 'cat1', name: '鸳鸯锅底', desc: '麻辣+清汤双拼，一锅两吃', price: 78, unit: '份', image: '☯️', spicy: 3, tags: ['经典'], sales: 7800 },

                // 精品荤菜
                { id: '101', catId: 'cat2', name: '雪花肥牛', desc: '澳洲谷饲肥牛，大理石花纹', price: 88, unit: '盘', image: '🥩', spicy: 0, tags: ['必点'], sales: 9500 },
                { id: '102', catId: 'cat2', name: '手切鲜羊肉', desc: '内蒙古草原羔羊，鲜嫩无膻', price: 78, unit: '盘', image: '🐑', spicy: 0, tags: [], sales: 7200 },
                { id: '103', catId: 'cat2', name: '极品毛肚', desc: '新鲜牛百叶，七上八下15秒', price: 68, unit: '盘', image: '🫘', spicy: 0, tags: ['爆款'], sales: 8800 },
                { id: '104', catId: 'cat2', name: '鸭肠', desc: '脆嫩弹牙，涮8秒最佳', price: 38, unit: '盘', image: '🦆', spicy: 0, tags: [], sales: 6500 },
                { id: '105', catId: 'cat2', name: '猪脑花', desc: '细腻嫩滑，蘸干碟绝配', price: 28, unit: '份', image: '🧠', spicy: 0, tags: ['特色'], sales: 4100 },
                { id: '106', catId: 'cat2', name: '嫩牛肉', desc: '蛋液包裹，滑嫩多汁', price: 48, unit: '盘', image: '🥓', spicy: 0, tags: [], sales: 7600 },

                // 海鲜河鲜
                { id: '201', catId: 'cat3', name: '鲜活基围虾', desc: '当日到货，鲜甜弹嫩', price: 68, unit: '份', image: '🦐', spicy: 0, tags: ['鲜活'], sales: 5800 },
                { id: '202', catId: 'cat3', name: '鲜切鱼片', desc: '黑鱼薄切，晶莹剔透', price: 48, unit: '盘', image: '🐟', spicy: 0, tags: [], sales: 4900 },
                { id: '203', catId: 'cat3', name: '蟹棒', desc: '进口蟹味棒，丝丝分明', price: 28, unit: '份', image: '🦀', spicy: 0, tags: [], sales: 5500 },

                // 时蔬菌菇
                { id: '301', catId: 'cat4', name: '蔬菜拼盘', desc: '当日时令蔬菜组合', price: 28, unit: '份', image: '🥬', spicy: 0, tags: ['清爽'], sales: 7000 },
                { id: '302', catId: 'cat4', name: '菌菇拼盘', desc: '香菇、金针菇、杏鲍菇', price: 38, unit: '份', image: '🍄', spicy: 0, tags: [], sales: 6200 },
                { id: '303', catId: 'cat4', name: '土豆片', desc: '新鲜土豆，软糯香甜', price: 12, unit: '份', image: '🥔', spicy: 0, tags: [], sales: 8000 },
                { id: '304', catId: 'cat4', name: '藕片', desc: '脆嫩清甜，久煮不烂', price: 16, unit: '份', image: '🪷', spicy: 0, tags: [], sales: 6800 },

                // 丸滑豆制品
                { id: '401', catId: 'cat5', name: '手工虾滑', desc: '大颗虾肉手工打制', price: 48, unit: '份', image: '🍤', spicy: 0, tags: ['手工'], sales: 7500 },
                { id: '402', catId: 'cat5', name: '牛肉丸', desc: '潮汕手打，弹牙爆汁', price: 38, unit: '份', image: '🧆', spicy: 0, tags: [], sales: 6800 },
                { id: '403', catId: 'cat5', name: '老豆腐', desc: '卤水豆腐，越煮越香', price: 12, unit: '份', image: '🫘', spicy: 0, tags: [], sales: 5200 },

                // 小吃主食
                { id: '501', catId: 'cat6', name: '红糖糍粑', desc: '外酥里糯，红糖浇汁', price: 22, unit: '份', image: '🍡', spicy: 0, tags: ['甜品'], sales: 9000 },
                { id: '502', catId: 'cat6', name: '蛋炒饭', desc: '粒粒分明，锅气十足', price: 18, unit: '碗', image: '🍚', spicy: 0, tags: [], sales: 5500 },
                { id: '503', catId: 'cat6', name: '小酥肉', desc: '现炸酥肉，外酥里嫩', price: 32, unit: '份', image: '🍖', spicy: 1, tags: ['人气'], sales: 8200 },

                // 酒水饮品
                { id: '601', catId: 'cat7', name: '酸梅汤', desc: '冰镇酸梅汤，解辣神器', price: 12, unit: '杯', image: '🥤', spicy: 0, tags: ['解辣'], sales: 9500 },
                { id: '602', catId: 'cat7', name: '唯怡豆奶', desc: '火锅标配，冰镇更佳', price: 10, unit: '瓶', image: '🥛', spicy: 0, tags: [], sales: 8800 },
                { id: '603', catId: 'cat7', name: '雪花啤酒', desc: '冰爽啤酒，大口畅饮', price: 15, unit: '瓶', image: '🍺', spicy: 0, tags: [], sales: 7000 },
        ]
};

module.exports = { menuData };