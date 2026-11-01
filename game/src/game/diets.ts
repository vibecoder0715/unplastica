import type { GameLanguage } from './i18n';

export interface AnimalDietInfo {
  English: string;
  'Bahasa Melayu': string;
  '中文': string;
  'தமிழ்': string;
}

/**
 * Biologically accurate real-life diets for all 41 Sanctuary animals (A01 - A41).
 * Key food items are strictly bolded with <b> tags per user specification.
 */
export const ANIMAL_REAL_LIFE_DIETS: Record<string, AnimalDietInfo> = {
  animal_01_malayan_tiger: {
    English: 'Apex carnivore. Hunts <b>wild boar</b>, <b>sambar deer</b>, <b>barking deer</b>, and occasionally <b>river fish</b>.',
    'Bahasa Melayu': 'Karnivor puncak. Memburu <b>babi hutan</b>, <b>rusa sambar</b>, <b>kijang</b>, dan sesekali <b>ikan sungai</b>.',
    '中文': '顶级肉食动物。主要捕食<b>野猪</b>、<b>水鹿</b>、<b>赤麂</b>，偶尔也会捕食<b>淡水鱼类</b>。',
    'தமிழ்': 'உயர்மட்ட ஊனுண்ணி. காட்டில் <b>காட்டுப்பன்றி</b>, <b>கடமான்</b>, <b>மான்</b>, மற்றும் <b>மீன்களை</b> வேட்டையாடுகிறது.',
  },
  animal_02_asian_elephant: {
    English: 'Megaherbivore. Consumes up to 150 kg of <b>wild grasses</b>, <b>bamboo shoots</b>, <b>banana palms</b>, <b>rainforest bark</b>, and <b>wild roots</b> daily.',
    'Bahasa Melayu': 'Mega-herbivor. Memakan sehingga 150 kg <b>rumput liar</b>, <b>pucuk buluh</b>, <b>pokok pisang liar</b>, <b>kulit pokok</b>, dan <b>akar hutan</b> setiap hari.',
    '中文': '草食性巨兽。每天采食多达150公斤的<b>野生嫩草</b>、<b>竹笋</b>、<b>野生香蕉树</b>、<b>树皮</b>和<b>多汁根茎</b>。',
    'தமிழ்': 'தாவரவுண்ணி. தினமும் 150 கிலோ <b>காட்டுப்புல்</b>, <b>மூங்கில் தளிர்கள்</b>, <b>காட்டு வாழை</b>, மற்றும் <b>மரப்பட்டைகளை</b> உண்கிறது.',
  },
  animal_03_malayan_tapir: {
    English: 'Selective browser. Forages on <b>tender rainforest leaves</b>, <b>succulent buds</b>, <b>fallen figs</b>, and <b>aquatic wetland plants</b>.',
    'Bahasa Melayu': 'Herbivor pemilih. Meragut <b>daun muda hutan</b>, <b>tunas berair</b>, <b>buah ara hutan</b>, dan <b>tumbuhan paya akuatik</b>.',
    '中文': '精细植食动物。在雨林中采食<b>鲜嫩树叶</b>、<b>多汁嫩芽</b>、<b>落地的无花果</b>及<b>湿地水草</b>。',
    'தமிழ்': 'தாவரவுண்ணி. <b>மென்மையான காட்டு இலைகள்</b>, <b>தளிர்கள்</b>, <b>அத்திப்பழங்கள்</b>, மற்றும் <b>நீர்த் தாவரங்களை</b> மேய்கிறது.',
  },
  animal_04_orangutan: {
    English: 'Arboreal frugivore. Feeds primarily on <b>wild durians</b>, <b>forest figs</b>, <b>mangosteens</b>, <b>tender shoots</b>, and <b>tree bark</b>.',
    'Bahasa Melayu': 'Frugivor kanopi. Memakan <b>durian hutan</b>, <b>buah ara liar</b>, <b>manggis</b>, <b>pucuk pokok</b>, dan <b>kulit pokok</b>.',
    '中文': '树栖食果动物。极度喜爱<b>野生榴莲</b>、<b>雨林无花果</b>、<b>山竹果</b>、<b>嫩叶幼芽</b>以及富含有机质的<b>树皮</b>。',
    'தமிழ்': 'பழவுண்ணி. <b>காட்டு துரியன் பழங்கள்</b>, <b>அத்திப்பழம்</b>, <b>மங்கோஸ்டீன்</b>, மற்றும் <b>மரப்பட்டைகளை</b> உண்கிறது.',
  },
  animal_05_sun_bear: {
    English: 'Omnivorous tree-climber. Forages for <b>wild honeycombs & bee larvae</b>, <b>termites</b>, <b>beetle grubs</b>, and <b>fallen rainforest fruits</b>.',
    'Bahasa Melayu': 'Omnivor pemanjat. Mencari <b>sarang lebah hutan & larva</b>, <b>anai-anai</b>, <b>kumbang</b>, dan <b>buah hutan yang gugur</b>.',
    '中文': '爬树善手杂食类。偏爱<b>野生蜂巢与蜂蛹</b>、<b>白蚁</b>、<b>肥美甲虫幼虫</b>以及<b>热带甜熟野果</b>。',
    'தமிழ்': 'அனைத்துண்ணி. <b>காட்டுத் தேன்கூடு மற்றும் புழுக்கள்</b>, <b>கறையான்கள்</b>, மற்றும் <b>பழங்களை</b> உண்கிறது.',
  },
  animal_06_sunda_pangolin: {
    English: 'Specialist myrmecophage. Exclusively feeds on <b>termites</b> and <b>ants</b>, digging into subterranean mounds with strong foreclaws.',
    'Bahasa Melayu': 'Insektivor khusus. Memakan <b>anai-anai</b> dan <b>semut</b> sahaja dengan menggali sarang tanah menggunakan kuku depan yang tajam.',
    '中文': '特化食蚁动物。专一捕食<b>白蚁</b>与<b>蚂蚁</b>，以前爪掘开蚁巢并伸出细长黏舌舔食。',
    'தமிழ்': 'பூச்சியுண்ணி. வலிமையான நகங்களால் புற்றுகளைத் தோண்டி <b>கறையான்கள்</b> மற்றும் <b>எறும்புகளை</b> மட்டுமே உண்கிறது.',
  },
  animal_07_sambar_deer: {
    English: 'Large herbivore. Feeds on <b>rainforest grasses</b>, <b>fallen fruits</b>, <b>soft shrub foliage</b>, and <b>submerged aquatic weeds</b>.',
    'Bahasa Melayu': 'Herbivor besar. Memakan <b>rumput hutan hujan</b>, <b>buah gugur</b>, <b>pucuk renek</b>, dan <b>rumpai akuatik</b>.',
    '中文': '大型草食鹿科。以<b>雨林青草</b>、<b>落地的浆果</b>、<b>灌木嫩叶</b>及<b>河流水草</b>为主要能量来源。',
    'தமிழ்': 'தாவரவுண்ணி. <b>காட்டுப்புற்கள்</b>, <b>விழுந்த பழங்கள்</b>, <b>புதர் இலைகள்</b>, மற்றும் <b>நீர்க்களைகளை</b> மேய்கிறது.',
  },
  animal_08_greater_mousedeer: {
    English: 'Small forest herbivore. Nibbles on <b>fallen wild berries</b>, <b>tender flower buds</b>, <b>young shoots</b>, and <b>forest floor fungi</b>.',
    'Bahasa Melayu': 'Herbivor lantai hutan. Memakan <b>buah beri hutan yang gugur</b>, <b>kuntum bunga muda</b>, <b>pucuk hijau</b>, dan <b>cendawan hutan</b>.',
    '中文': '林床小兽。专挑<b>落下的野莓野果</b>、<b>柔嫩花蕾</b>、<b>初生幼芽</b>以及<b>菌类真菌</b>细细咀嚼。',
    'தமிழ்': 'சிறிய தாவரவுண்ணி. <b>காட்டுப் பழங்கள்</b>, <b>மலர்மொட்டுகள்</b>, <b>தளிர்கள்</b>, மற்றும் <b>காளான்களை</b> உண்கிறது.',
  },
  animal_09_malayan_porcupine: {
    English: 'Nocturnal herbivore. Gnaws on <b>starchy forest roots</b>, <b>wild tubers</b>, <b>thick fallen bark</b>, and <b>dropped wild seeds</b>.',
    'Bahasa Melayu': 'Herbivor nokturnal. Mengikis <b>akar pokok berkanji</b>, <b>ubi hutan</b>, <b>kulit kayu tebal</b>, dan <b>biji benih gugur</b>.',
    '中文': '夜行啮齿类。啃食富含淀粉的<b>林木根系</b>、<b>野生块茎</b>、<b>厚实树皮</b>和<b>饱满坚果</b>。',
    'தமிழ்': 'இரவாடி தாவரவுண்ணி. <b>மர வேர்கள்</b>, <b>கிழங்குகள்</b>, <b>மரப்பட்டைகள்</b>, மற்றும் <b>விதைகளை</b> உண்கிறது.',
  },
  animal_10_dusky_leaf_monkey: {
    English: 'Specialist folivore. Feeds on <b>young tree leaves</b>, <b>unripe canopy fruits</b>, <b>forest blossoms</b>, and <b>nectar</b>.',
    'Bahasa Melayu': 'Folivor kanopi. Memakan <b>daun-daun muda</b>, <b>buah hutan yang mengkal</b>, <b>bunga kanopi</b>, dan <b>madu bunga</b>.',
    '中文': '专业食叶灵长类。主食<b>鲜嫩树冠叶片</b>、<b>未熟透的野果</b>、<b>树冠花序</b>与<b>清甜花蜜</b>。',
    'தமிழ்': 'இலை உண்ணி. <b>இளந்தளிர்கள்</b>, <b>பழுக்காத காட்டுப் பழங்கள்</b>, மற்றும் <b>பூந்தேனை</b> உண்கிறது.',
  },
  animal_11_siamang: {
    English: 'Arboreal gibbon. Sustained by <b>wild canopy figs</b>, <b>tender leaves</b>, <b>flowers</b>, and occasional <b>insects</b>.',
    'Bahasa Melayu': 'Ungka kanopi. Memakan <b>buah ara hutan</b>, <b>daun muda</b>, <b>bunga-bungaan</b>, dan sesekali <b>serangga kecil</b>.',
    '中文': '大长臂猿。主要采食高悬树冠的<b>野生无花果</b>、<b>幼嫩树叶</b>、<b>花瓣</b>和少量<b>小昆虫</b>。',
    'தமிழ்': 'மரவாழ் குரங்கு. <b>காட்டு அத்திப்பழங்கள்</b>, <b>மென்மையான இலைகள்</b>, <b>மலர்கள்</b>, மற்றும் <b>பூச்சிகளை</b> உண்கிறது.',
  },
  animal_12_malayan_peacock_pheasant: {
    English: 'Forest floor omnivore. Scratches through leaf litter for <b>termites</b>, <b>beetles</b>, <b>small caterpillars</b>, and <b>fallen seeds</b>.',
    'Bahasa Melayu': 'Omnivor lantai hutan. Mengais daun reput mencari <b>anai-anai</b>, <b>kumbang</b>, <b>ulat beluncas</b>, dan <b>biji benih gugur</b>.',
    '中文': '地栖雉类。扒开林间落叶层捕食<b>白蚁</b>、<b>鞘翅目甲虫</b>、<b>毛毛虫</b>并捡食<b>落下的种子</b>。',
    'தமிழ்': 'தரைவாழ் பறவை. <b>கறையான்கள்</b>, <b>வண்டுகள்</b>, <b>புழுக்கள்</b>, மற்றும் <b>விதைகளைத்</b> தேடி உண்கிறது.',
  },
  animal_13_great_argus: {
    English: 'Rainforest floor forager. Feeds on <b>fallen canopy fruits</b>, <b>forest ants</b>, <b>snails</b>, and <b>hard seeds</b>.',
    'Bahasa Melayu': 'Burung lantai hutan. Memakan <b>buah hutan yang jatuh</b>, <b>semut hutan</b>, <b>siput darat</b>, dan <b>biji benih keras</b>.',
    '中文': '大型雨林雉。采食高处落下的<b>成熟浆果</b>、<b>林地蚂蚁</b>、<b>蜗牛软体</b>和<b>坚韧种子</b>。',
    'தமிழ்': 'காட்டுப்பறவை. <b>விழுந்த காட்டுப் பழங்கள்</b>, <b>எறும்புகள்</b>, <b>நத்தைகள்</b>, மற்றும் <b>விதைகளை</b> உண்கிறது.',
  },
  animal_14_malayan_flying_fox: {
    English: 'Giant megabat. Feeds strictly on <b>rainforest nectar</b>, <b>wild durian pollen</b>, <b>ripe figs</b>, and <b>mangrove blossoms</b>.',
    'Bahasa Melayu': 'Keluang gergasi. Memakan <b>nektar bunga hutan</b>, <b>debunga durian liar</b>, <b>buah ara masak</b>, dan <b>bunga bakau</b>.',
    '中文': '大型食果蝠。专以<b>热带花蜜</b>、<b>野生榴莲花粉</b>、<b>熟软无花果</b>及<b>红树林花朵</b>为食，是重要的授粉者。',
    'தமிழ்': 'பழ வௌவால். <b>பூந்தேன்</b>, <b>துரியன் மகரந்தம்</b>, <b>பழுத்த அத்திப்பழம்</b>, மற்றும் <b>மலர்களை</b> உண்கிறது.',
  },
  animal_15_rhinoceros_hornbill: {
    English: 'Canopy bird. Consumes copious <b>lipid-rich wild figs</b>, supplemented with <b>tree lizards</b>, <b>bird eggs</b>, and <b>insects</b>.',
    'Bahasa Melayu': 'Burung kanopi. Menggemari <b>buah ara kaya lemak</b>, diiringi <b>cicak pokok</b>, <b>telur burung</b>, dan <b>serangga</b>.',
    '中文': '树冠巨鸟。以高油脂的<b>野生无花果</b>为主食，并捕食<b>树栖蜥蜴</b>、<b>鸟蛋</b>和<b>大型昆虫</b>。',
    'தமிழ்': 'இருவாச்சி பறவை. <b>கொழுப்பு நிறைந்த அத்திப்பழங்கள்</b>, <b>மரப்பல்லிகள்</b>, <b>முட்டைகள்</b>, மற்றும் <b>பூச்சிகளை</b> உண்கிறது.',
  },
  animal_16_reticulated_python: {
    English: 'Constrictor predator. Ambush-hunts <b>rats</b>, <b>bats</b>, <b>waterbirds</b>, and <b>small mammals</b>, swallowing them whole.',
    'Bahasa Melayu': 'Pemangsa belit. Memburu hendap <b>tikus</b>, <b>kelawar</b>, <b>burung air</b>, dan <b>mamalia kecil</b>.',
    '中文': '伏击型蟒蛇。潜伏捕食<b>啮齿类老鼠</b>、<b>蝙蝠</b>、<b>水鸟</b>以及沿岸<b>小型哺乳动物</b>，整只吞咽。',
    'தமிழ்': 'மலைப்பாம்பு. <b>எலிகள்</b>, <b>வௌவால்கள்</b>, <b>நீர்ப்பறவைகள்</b>, மற்றும் <b>சிறிய விலங்குகளை</b> விழுங்குகிறது.',
  },
  animal_17_clouded_monitor: {
    English: 'Arboreal carnivore. Hunts <b>tree frogs</b>, <b>bird fledglings</b>, <b>large grasshoppers</b>, and <b>small rodents</b>.',
    'Bahasa Melayu': 'Karnivor pokok. Memburu <b>katak pokok</b>, <b>anak burung</b>, <b>belalang besar</b>, dan <b>rodensia kecil</b>.',
    '中文': '树栖巨蜥。攀树追捕<b>树蛙</b>、<b>雏鸟</b>、<b>大型蚱蜢与甲虫</b>及<b>小老鼠</b>。',
    'தமிழ்': 'மரவாழ் உடும்பு. <b>மரத் தவளைகள்</b>, <b>பறவைக் குஞ்சுகள்</b>, <b>வெட்டுக்கிளிகள்</b>, மற்றும் <b>எலிகளை</b> வேட்டையாடுகிறது.',
  },
  animal_18_black_giant_squirrel: {
    English: 'Canopy rodent. Feeds high in the treetops on <b>rainforest nuts</b>, <b>hard seeds</b>, <b>tree bark</b>, and <b>tender buds</b>.',
    'Bahasa Melayu': 'Rodensia pokok. Memakan <b>kacang hutan keras</b>, <b>biji benih</b>, <b>kulit pokok</b>, dan <b>pucuk muda</b>.',
    '中文': '巨型树松鼠。在数十米树冠上啃开<b>坚硬坚果</b>、<b>油性树籽</b>、<b>嫩树皮</b>及<b>新萌嫩芽</b>。',
    'தமிழ்': 'பெரிய அணில். மரங்களின் உச்சியில் <b>கொட்டைகள்</b>, <b>விதைகள்</b>, <b>மரப்பட்டைகள்</b>, மற்றும் <b>தளிர்களை</b> உண்கிறது.',
  },
  animal_19_smooth_coated_otter: {
    English: 'Aquatic hunter. Dives for <b>freshwater river fish</b>, <b>freshwater crabs</b>, <b>crayfish</b>, and <b>frogs</b>.',
    'Bahasa Melayu': 'Pemburu akuatik. Menyelam memburu <b>ikan air tawar</b>, <b>ketam sungai</b>, <b>udang galah</b>, dan <b>katak</b>.',
    '中文': '水栖捕食者。潜水捕捉<b>淡水河鱼</b>、<b>溪流螃蟹</b>、<b>淡水大虾</b>以及<b>两栖青蛙</b>。',
    'தமிழ்': 'நீர்வாய் வேட்டையாடி. ஆற்றில் மூழ்கி <b>நன்னீர் மீன்கள்</b>, <b>நண்டுகள்</b>, <b>இறால்கள்</b>, மற்றும் <b>தவளைகளை</b> உண்கிறது.',
  },
  animal_20_mud_crab: {
    English: 'Mangrove detritivore / scavenger. Feeds on <b>decaying organic matter</b>, <b>mangrove molluscs</b>, <b>small worms</b>, and <b>fallen fish</b>.',
    'Bahasa Melayu': 'Pemakan bangkai bakau. Memakan <b>bahan organik reput</b>, <b>moluska bakau</b>, <b>cacing lumpur</b>, dan <b>bangkai ikan</b>.',
    '中文': '红树林底栖类。用强有力双螯碎食<b>泥地腐植质</b>、<b>贝类软体</b>、<b>泥沙多毛类小虫</b>和<b>沉底鱼虾</b>。',
    'தமிழ்': 'சேற்று நண்டு. <b>அழுகிய தாவரங்கள்</b>, <b>சிப்பிகள்</b>, <b>புழுக்கள்</b>, மற்றும் <b>மீன் எச்சங்களை</b> உண்கிறது.',
  },
  animal_21_freshwater_giant_prawn: {
    English: 'River benthic omnivore. Forages along the riverbed for <b>algae</b>, <b>aquatic insects</b>, <b>microscopic detritus</b>, and <b>decaying vegetation</b>.',
    'Bahasa Melayu': 'Omnivor dasar sungai. Merayap di dasar sungai mencari <b>alga</b>, <b>serangga air</b>, <b>sisa detritus</b>, dan <b>tumbuhan reput</b>.',
    '中文': '淡水长臂大虾。在河底寻食<b>岩石藻类</b>、<b>水栖昆虫幼体</b>、<b>有机碎屑</b>和<b>沉水植物残渣</b>。',
    'தமிழ்': 'நன்னீர் இறால். ஆற்றுப்படுகையில் <b>பாசி</b>, <b>நீர் பூச்சிகள்</b>, மற்றும் <b>தாவர எச்சங்களை</b> உண்கிறது.',
  },
  animal_22_horseshoe_crab: {
    English: 'Ancient coastal forager. Plows through intertidal sand for <b>marine worms</b>, <b>small clams</b>, and <b>organic benthic sediments</b>.',
    'Bahasa Melayu': 'Haiwan pantai purba. Menggali pasir pantai mencari <b>cacing laut</b>, <b>kerang kecil</b>, dan <b>sedimen organik</b>.',
    '中文': '古老鲎类。在潮间带泥沙中翻找<b>多毛类海蚕</b>、<b>小型双壳贝类</b>及<b>富含有机物底泥</b>。',
    'தமிழ்': 'கடல் நண்டு. மணலைத் தோண்டி <b>கடல் புழுக்கள்</b>, <b>சிறிய சிப்பிகள்</b>, மற்றும் <b>படிவுகளை</b> உண்கிறது.',
  },
  animal_23_southern_river_terrapin: {
    English: 'Critically endangered terrapin. Grazes on <b>mangrove leaves</b>, <b>fallen river fruits (Berembang)</b>, and <b>freshwater seagrass</b>.',
    'Bahasa Melayu': 'Tuntung sungai terancam. Meragut <b>daun pokok bakau</b>, <b>buah berembang yang gugur</b>, dan <b>rumput air tawar</b>.',
    '中文': '珍稀南方潮龟。主要啃食<b>红树林嫩叶</b>、<b>落入水中的水翁与海桑果实</b>及<b>淡水水生植物</b>。',
    'தமிழ்': 'நன்னீர் ஆமை. <b>கண்டல் இலைகள்</b>, <b>விழுந்த ஆற்றுப் பழங்கள்</b>, மற்றும் <b>நீர் தாவரங்களை</b> மேய்கிறது.',
  },
  animal_24_southeast_asian_box_turtle: {
    English: 'Semi-aquatic omnivore. Feeds on <b>water snails</b>, <b>aquatic plants</b>, <b>earthworms</b>, and <b>fallen swamp fruits</b>.',
    'Bahasa Melayu': 'Kura-kura separuh akuatik. Memakan <b>siput air</b>, <b>tumbuhan akuatik</b>, <b>cacing tanah</b>, dan <b>buah paya gugur</b>.',
    '中文': '半水栖食性。在泥泞浅水捕食<b>水生螺类</b>、<b>沼泽水草</b>、<b>蚯蚓幼虫</b>及<b>落入水潭的野果</b>。',
    'தமிழ்': 'நீர்நில வாழ் ஆமை. <b>நத்தை</b>, <b>நீர் தாவரங்கள்</b>, <b>மண்புழுக்கள்</b>, மற்றும் <b>காட்டுப் பழங்களை</b> உண்கிறது.',
  },
  animal_25_asian_water_monitor: {
    English: 'Aquatic apex scavenger. Devours <b>carrion</b>, <b>freshwater fish</b>, <b>frogs</b>, <b>crabs</b>, <b>snake eggs</b>, and <b>river snails</b>.',
    'Bahasa Melayu': 'Biawak pemakan bangkai. Memakan <b>bangkai haiwan</b>, <b>ikan sungai</b>, <b>katak</b>, <b>ketam</b>, <b>telur ular</b>, dan <b>siput</b>.',
    '中文': '水边清道夫与捕食者。嗜食<b>动物尸体腐肉</b>、<b>鲜活淡水鱼</b>、<b>两栖青蛙</b>、<b>泥蟹</b>及<b>爬虫卵</b>。',
    'தமிழ்': 'நீர் உடும்பு. <b>அழுகிய இறைச்சி</b>, <b>மீன்கள்</b>, <b>தவளைகள்</b>, <b>நண்டுகள்</b>, மற்றும் <b>முட்டைகளை</b> உண்கிறது.',
  },
  animal_26_giant_snakehead: {
    English: 'Voracious apex fish. Ambush-strikes <b>smaller river fish</b>, <b>frogs</b>, <b>water beetles</b>, and <b>aquatic snakes</b> with razor teeth.',
    'Bahasa Melayu': 'Ikan toman pemangsa. Menyambar <b>ikan-ikan kecil</b>, <b>katak</b>, <b>kumbang air</b>, dan <b>anak ular air</b>.',
    '中文': '凶猛多曼鱼。以利齿瞬间截击捕食<b>中小型活鱼</b>、<b>青蛙</b>、<b>水生甲虫</b>甚至<b>幼小水蛇</b>。',
    'தமிழ்': 'வேட்டை மீன். கூரிய பற்களால் <b>சிறிய மீன்கள்</b>, <b>தவளைகள்</b>, மற்றும் <b>நீர் பூச்சிகளை</b> வேட்டையாடுகிறது.',
  },
  animal_27_dugong: {
    English: 'Strict marine herbivore. Grazes exclusively on subterranean rhizomes and leaves of <b>tropical seagrass (Halophila & Thalassia)</b>.',
    'Bahasa Melayu': 'Herbivor laut tulen. Meragut rizom dan daun <b>rumput laut tropika (Halophila & Thalassia)</b> di dasar laut cetek.',
    '中文': '专性海洋食草哺乳动物。贴近海床铲食<b>热带海草（喜盐草与海龟草）的柔嫩叶片与根茎</b>。',
    'தமிழ்': 'கடற்பசு. பிரத்தியேகமாக <b>கடல் புற்களை (ஹாலோபிலா, தலாசியா)</b> மட்டுமே மேய்கிறது.',
  },
  animal_28_green_sea_turtle: {
    English: 'Mature marine herbivore. Feeds peacefully on expansive <b>seagrass meadows</b>, <b>marine macroalgae</b>, and <b>sponges</b>.',
    'Bahasa Melayu': 'Penyu herbivor. Meragut <b>padang rumput laut</b>, <b>alga laut marin</b>, dan <b>span laut</b> di kawasan cetek.',
    '中文': '成体纯海草食性。游弋于浅海大片<b>海草床</b>中，啃食<b>富含营养的海草</b>、<b>绿色海藻</b>和极少量海绵。',
    'தமிழ்': 'பச்சை கடல் ஆமை. கடலில் உள்ள <b>கடல் புற்கள்</b> மற்றும் <b>பாசிகளை</b> உண்கிறது.',
  },
  animal_29_hawksbill_sea_turtle: {
    English: 'Reef sponge specialist. Uses its sharp curved beak to pry out <b>toxic encrusting marine sponges</b> from coral crevasses.',
    'Bahasa Melayu': 'Pakar span terumbu. Menggunakan paruh tajam untuk mencungkil <b>span laut beracun</b> di celah batu karang.',
    '中文': '珊瑚礁特化食海绵海龟。以坚硬鹰嘴喙深入珊瑚缝隙啄食<b>附着性海绵</b>，保持珊瑚呼吸。',
    'தமிழ்': 'ஹாக்ஸ்பில் ஆமை. பவளப்பாறைகளில் உள்ள <b>கடல் பாசிகளை (ஸ்பாஞ்சுகள்)</b> அலகால் கொத்தி உண்கிறது.',
  },
  animal_30_whale_shark: {
    English: 'Gentle filter-feeder. Glides mouth-open through surface currents straining <b>microscopic zooplankton</b>, <b>krill</b>, and <b>tiny fish larvae</b>.',
    'Bahasa Melayu': 'Gergasi penapis laut. Menapis <b>zooplankton mikroskopik</b>, <b>krill</b>, dan <b>anak ikan kecil</b> dari arus laut.',
    '中文': '滤食性海洋巨人。张开阔口漫游大洋，用鳃耙过滤数以万计的<b>微型浮游动物</b>、<b>南极磷虾</b>和<b>小鱼苗</b>。',
    'தமிழ்': 'திமிங்கலச் சுறா. கடலில் உள்ள <b>நுண்ணிய மிதவை உயிரினங்கள் (பிளாங்க்டன்)</b> மற்றும் <b>சிறிய இறால்களை</b> வடிகட்டி உண்கிறது.',
  },
  animal_31_indo_pacific_humpback_dolphin: {
    English: 'Coastal cetacean. Hunts school-forming coastal fish including <b>mullet</b>, <b>croakers</b>, <b>anchovies</b>, and <b>cuttlefish</b>.',
    'Bahasa Melayu': 'Lumba-lumba muara. Memburu kawanan ikan pantai seperti <b>ikan belanak</b>, <b>ikan gelama</b>, <b>ikan bilis</b>, dan <b>sotong</b>.',
    '中文': '沿岸海豚（中华白海豚）。成群围捕浅海近岸的<b>鲻鱼（乌鱼）</b>、<b>石首鱼</b>、<b>凤尾鱼群</b>及<b>枪乌贼鱿鱼</b>。',
    'தமிழ்': 'டால்பின். கடலோரப் பகுதிகளில் கூட்டமாக உள்ள <b>மடவை மீன்கள்</b>, <b>நெத்திலி</b>, மற்றும் <b>கணவாய் மீன்களை</b> வேட்டையாடுகிறது.',
  },
  animal_32_false_killer_whale: {
    English: 'Oceanic apex predator. Hunts pelagic game fish in coordinated pods, taking <b>mahi-mahi (dorado)</b>, <b>yellowfin tuna</b>, and <b>oceanic squid</b>.',
    'Bahasa Melayu': 'Pemangsa lautan luas. Memburu dalam kawanan menangkap <b>ikan lumba/dorado</b>, <b>ikan tongkol/tuna</b>, dan <b>sotong lautan</b>.',
    '中文': '远洋大群掠食性齿鲸。群体紧密协作追捕大洋高速游泳的<b>鲯鳅（鬼头刀）</b>、<b>黄鳍金枪鱼</b>及<b>大型大洋鱿鱼</b>。',
    'தமிழ்': 'பொய் கொலையாளி திமிங்கலம். ஆழ்கடலில் <b>சூரை மீன்கள் (சூனா)</b>, <b>டொராடோ</b>, மற்றும் <b>பெரிய கணவாய்களை</b> வேட்டையாடுகிறது.',
  },
  animal_33_blacktip_reef_shark: {
    English: 'Reef predator. Patrols sunlit coral flats hunting <b>damselfish</b>, <b>wrasses</b>, <b>mullet</b>, <b>squid</b>, and <b>marine crabs</b>.',
    'Bahasa Melayu': 'Jerung terumbu. Meronda terumbu karang memburu <b>ikan damsel</b>, <b>ikan bayan</b>, <b>ikan belanak</b>, <b>sotong</b>, dan <b>ketam laut</b>.',
    '中文': '浅礁巡游鲨鱼。在阳光珊瑚平台巡游捕捉<b>雀鲷</b>、<b>隆头鱼</b>、<b>小鲻鱼</b>、<b>枪乌贼</b>及<b>礁石海蟹</b>。',
    'தமிழ்': 'பவளப்பாறை சுறா. பவளப்பாறைகளில் வாழும் <b>சிறிய பாறை மீன்கள்</b>, <b>கணவாய்</b>, மற்றும் <b>கடல் நண்டுகளை</b> வேட்டையாடுகிறது.',
  },
  animal_34_clownfish: {
    English: 'Symbiotic reef fish. Eats <b>copepods</b>, <b>free-floating algae</b>, <b>zooplankton</b>, and <b>food scraps from host sea anemones</b>.',
    'Bahasa Melayu': 'Ikan badut simbiotik. Memakan <b>kopepod</b>, <b>alga terapung</b>, <b>zooplankton</b>, dan <b>sisa makanan buruan buran laut</b>.',
    '中文': '共生小丑鱼。在海葵触手间进食微细<b>桡足类</b>、<b>漂浮微藻</b>、<b>浮游动物</b>以及<b>共生海葵消化后的食物碎屑</b>。',
    'தமிழ்': 'கோமாளி மீன். <b>பாசி</b>, <b>நுண்ணிய மிதவை உயிரினங்கள்</b>, மற்றும் <b>கடல் அனிமோன்களின் எச்சங்களை</b> உண்கிறது.',
  },
  animal_35_white_handed_gibbon: {
    English: 'Canopy acrobat. Feeds selectively on <b>sugar-rich ripe figs</b>, <b>sweet forest drupes</b>, <b>young leaves</b>, and <b>flowering nectar</b>.',
    'Bahasa Melayu': 'Ungka tangan putih. Memakan <b>buah ara hutan yang manis</b>, <b>buah-buahan berair</b>, <b>daun muda</b>, dan <b>madu bunga</b>.',
    '中文': '白掌长臂猿。在高空摆荡采食高含糖量的<b>成熟野生无花果</b>、<b>甜美野果</b>、<b>初展嫩叶</b>和<b>芳香花蜜</b>。',
    'தமிழ்': 'வெள்ளைக்கை கிப்பbons. <b>பழுத்த காட்டு அத்திப்பழங்கள்</b>, <b>இனிப்பு பழங்கள்</b>, <b>தளிர்கள்</b>, மற்றும் <b>பூந்தேனை</b> உண்கிறது.',
  },
  animal_36_proboscis_monkey: {
    English: 'Mangrove specialist folivore. Feeds exclusively on <b>young mangrove leaves (Sonneratia & Avicennia)</b>, <b>unripe mangrove fruits</b>, and <b>seeds</b>.',
    'Bahasa Melayu': 'Monyet belanda bakau. Memakan <b>daun muda pokok bakau (Sonneratia & Avicennia)</b>, <b>buah bakau mengkal</b>, dan <b>biji benih</b>.',
    '中文': '长鼻猴（红树林特有种）。拥有复杂发酵胃，严格以<b>红树林嫩叶（海桑与白骨壤）</b>、<b>未熟酸涩红树果实</b>及<b>幼种子</b>为食。',
    'தமிழ்': 'நீண்ட மூக்குக் குரங்கு. பிரத்தியேகமாக <b>கண்டல் இலைகள்</b>, <b>பழுக்காத பழங்கள்</b>, மற்றும் <b>விதைகளை</b> மட்டுமே உண்கிறது.',
  },
  animal_37_barking_deer: {
    English: 'Solitary forest herbivore. Browses on <b>fallen canopy fruit</b>, <b>young herbs</b>, <b>tender grass shoots</b>, and <b>succulent leaves</b>.',
    'Bahasa Melayu': 'Kijang hutan. Memakan <b>buah hutan yang gugur</b>, <b>herba muda</b>, <b>pucuk rumput lembut</b>, dan <b>daun berair</b>.',
    '中文': '独行赤麂（黄猄）。警惕觅食<b>林下落果</b>、<b>嫩绿野草</b>、<b>初生青草尖</b>以及<b>多汁草本幼叶</b>。',
    'தமிழ்': 'குரைக்கும் மான். <b>காட்டுப் பழங்கள்</b>, <b>மென்மையான புற்கள்</b>, மற்றும் <b>இலைகளை</b> உண்கிறது.',
  },
  animal_38_helmeted_hornbill: {
    English: 'Ancient canopy bird. Specializes in seeking out <b>dense wild fig crops</b>, supplementing with <b>nestling birds</b> and <b>tree squirrels</b>.',
    'Bahasa Melayu': 'Burung tebang mentua. Mencari <b>pokok buah ara hutan berbuah lebat</b>, diiringi <b>anak burung</b> dan <b>tupai pokok</b>.',
    '中文': '盔犀鸟（极度濒危）。在高耸树冠专挑<b>丰产野生无花果大树</b>，偶尔掠食<b>小雏鸟</b>和<b>小型树松鼠</b>。',
    'தமிழ்': 'தலைக்கவச இருவாச்சி. <b>அத்திப்பழங்கள்</b>, மற்றும் எப்போதாவது <b>சிறிய அணில்கள்</b>, <b>பறவைக் குஞ்சுகளை</b> வேட்டையாடுகிறது.',
  },
  animal_39_asian_arowana: {
    English: 'Dragon fish predator. Leaps above water to capture <b>insects</b>, <b>spiders</b>, <b>small river frogs</b>, and <b>swimming fish fry</b>.',
    'Bahasa Melayu': 'Ikan kelisa/naga. Melompat keluar dari air menangkap <b>serangga</b>, <b>labah-labah</b>, <b>anak katak</b>, dan <b>anak ikan</b>.',
    '中文': '亚洲龙鱼。常跃出水面弹射捕食水草低垂处的<b>飞虫甲虫</b>、<b>蜘蛛</b>、<b>小青蛙</b>以及<b>浅水鱼苗</b>。',
    'தமிழ்': 'அரோவானா மீன். நீரிலிருந்து துள்ளிக்குதித்து <b>பூச்சிகள்</b>, <b>சிலந்திகள்</b>, மற்றும் <b>சிறிய மீன்களைப்</b> பிடிக்கிறது.',
  },
  animal_40_blue_ringed_octopus: {
    English: 'Venomous reef hunter. Paralyzes and devours <b>small reef crabs</b>, <b>hermit crabs</b>, <b>shrimp</b>, and <b>injured small fish</b>.',
    'Bahasa Melayu': 'Gurita cincin biru beracun. Melumpuhkan dan memakan <b>ketam terumbu kecil</b>, <b>umang-umang</b>, <b>udang</b>, dan <b>ikan kecil</b>.',
    '中文': '剧毒蓝环章鱼。在珊瑚碎石间喷注毒素麻痹捕食<b>小礁蟹</b>、<b>寄居蟹</b>、<b>礁虾</b>及<b>近底微型小鱼</b>。',
    'தமிழ்': 'நீல வளைய ஆக்டோபஸ். விஷத்தால் தாக்கி <b>சிறிய நண்டுகள்</b>, <b>இறால்கள்</b>, மற்றும் <b>சிறு மீன்களை</b> உண்கிறது.',
  },
  animal_41_giant_panda: {
    English: 'Specialist bamboo feeder. Spends 12 hours a day chewing <b>bamboo culms</b>, <b>bamboo shoots</b>, and <b>fibrous bamboo leaves</b>.',
    'Bahasa Melayu': 'Pakar pemakan buluh. Menghabiskan 12 jam sehari mengunyah <b>batang buluh</b>, <b>rebung segar</b>, dan <b>daun buluh berserat</b>.',
    '中文': '高特化竹食者。每天花费长达12小时大嚼坚硬而高纤维的<b>竹秆</b>、<b>鲜甜竹笋</b>及<b>翠绿竹叶</b>。',
    'தமிழ்': 'பாண்டா கரடி. தினமும் 12 மணி நேரம் <b>மூங்கில் தண்டுகள்</b>, <b>மூங்கில் தளிர்கள்</b>, மற்றும் <b>இலைகளை</b> மென்று உண்கிறது.',
  },
};

export function getAnimalRealLifeDiet(assetId: string, lang: GameLanguage): string {
  const info = ANIMAL_REAL_LIFE_DIETS[assetId];
  if (!info) return '';
  return info[lang] || info.English;
}
