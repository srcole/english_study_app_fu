"""Build the UTF-8 BOM game vocabulary CSV from curated bilingual source data."""
import csv
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
ROWS = []


def load_examples():
    """Read individually written bilingual examples for grouped vocabulary."""
    examples = {}
    path = ROOT / 'data_tools' / 'examples.txt'
    for line in path.read_text(encoding='utf-8').splitlines():
        en, example, translation = line.split('|')
        assert en not in examples, f'Duplicate example: {en}'
        assert all(part.strip() for part in (en, example, translation)), en
        examples[en] = (example, translation)
    return examples


EXAMPLES = load_examples()
GROUP_WORDS = set()


def group(layer1, layer2, pos, priority, data):
    for line in data.strip().splitlines():
        en, zh, ipa = line.strip().split('|')
        example, translation = EXAMPLES[en]
        GROUP_WORDS.add(en)
        # Normalize the original adjective data into dictionary glosses.
        glosses = {
            'better': '好些的；更好的', 'worse': '更差的；更难受的',
            'new': '新的', 'old': '旧的', 'wet': '湿的', 'dry': '干的',
            'free': '免费的', 'useless': '无用的', 'empty': '空的',
            'full': '满的', 'open': '开着的', 'closed': '关闭的',
            'different': '不同的', 'temporary': '暂时的', 'uncertain': '不确定的',
        }
        if pos == 'adjective':
            zh = glosses.get(en, zh.removeprefix('很').removeprefix('是'))
        add(en, zh, ipa, layer1, layer2, pos, priority,
            example, translation)


def add(en, zh, ipa, l1, l2, pos, priority, example, translation, idiom=False, slang=False):
    ROWS.append({
        'id': len(ROWS) + 1, 'simplified chinese': zh, 'english': en,
        'category layer 1': l1, 'category layer 2': l2, 'priority': priority,
        'example sentence in english': example,
        'example sentence chinese translation': translation,
        'part of speech': pos, 'is idiom': int(idiom), 'is slang': int(slang),
        'pronunciation': '/' + ipa + '/',
    })


# Grouped headwords use individual bilingual examples from examples.txt.
group('日常生活', '食物与食材', 'noun', 1,
      '''
rice|米饭|raɪs
bread|面包|brɛd
noodles|面条|ˈnudəlz
pasta|意大利面|ˈpɑstə
chicken|鸡肉|ˈtʃɪkən
beef|牛肉|bif
pork|猪肉|pɔrk
fish|鱼肉|fɪʃ
tofu|豆腐|ˈtoʊfu
cheese|奶酪|tʃiz
butter|黄油|ˈbʌtər
oil|食用油|ɔɪl
salt|盐|sɔlt
pepper|胡椒粉|ˈpɛpər
sugar|糖|ˈʃʊɡər
flour|面粉|ˈflaʊər
corn|玉米|kɔrn
broccoli|西兰花|ˈbrɑkəli
cabbage|卷心菜|ˈkæbɪdʒ
spinach|菠菜|ˈspɪnɪtʃ
lettuce|生菜|ˈlɛtɪs
garlic|大蒜|ˈɡɑrlɪk
ginger|姜|ˈdʒɪndʒər
seafood|海鲜|ˈsiˌfud
shrimp|虾|ʃrɪmp
salmon|三文鱼|ˈsæmən
tuna|金枪鱼|ˈtunə
lamb|羊肉|læm
cream|奶油|krim
yogurt|酸奶|ˈjoʊɡərt
soup|汤|sup
salad|沙拉|ˈsæləd
sauce|酱汁|sɔs
vinegar|醋|ˈvɪnəɡər
honey|蜂蜜|ˈhʌni
oatmeal|燕麦粥|ˈoʊtˌmil
seaweed|海藻|ˈsiˌwid
cauliflower|菜花|ˈkɔləˌflaʊər
celery|芹菜|ˈsɛləri
mustard|芥末酱|ˈmʌstərd
''')

group('日常生活', '水果与蔬菜', 'noun', 1,
      '''
apple|苹果|ˈæpəl
banana|香蕉|bəˈnænə
orange|橙子|ˈɔrɪndʒ
pear|梨|pɛr
peach|桃子|pitʃ
lemon|柠檬|ˈlɛmən
lime|青柠|laɪm
mango|芒果|ˈmæŋɡoʊ
pineapple|菠萝|ˈpaɪnˌæpəl
watermelon|西瓜|ˈwɔtərˌmɛlən
strawberry|草莓|ˈstrɔˌbɛri
grape|葡萄|ɡreɪp
cherry|樱桃|ˈtʃɛri
plum|李子|plʌm
avocado|牛油果|ˌævəˈkɑdoʊ
tomato|西红柿|təˈmeɪtoʊ
potato|土豆|pəˈteɪtoʊ
carrot|胡萝卜|ˈkærət
cucumber|黄瓜|ˈkjuˌkʌmbər
onion|洋葱|ˈʌnjən
pumpkin|南瓜|ˈpʌmpkɪn
eggplant|茄子|ˈɛɡˌplænt
mushroom|蘑菇|ˈmʌʃrum
sweet potato|红薯|ˌswit pəˈteɪtoʊ
bell pepper|甜椒|ˈbɛl ˌpɛpər
''')

group('日常生活', '饮料', 'noun', 1,
      '''
water|水|ˈwɔtər
milk|牛奶|mɪlk
tea|茶|ti
coffee|咖啡|ˈkɔfi
juice|果汁|dʒus
beer|啤酒|bɪr
wine|葡萄酒|waɪn
lemonade|柠檬水|ˌlɛməˈneɪd
soda|汽水|ˈsoʊdə
soy milk|豆浆|ˈsɔɪ mɪlk
hot chocolate|热巧克力|ˌhɑt ˈtʃɑklət
green tea|绿茶|ˌɡrin ˈti
black tea|红茶|ˌblæk ˈti
mineral water|矿泉水|ˈmɪnərəl ˌwɔtər
sparkling water|气泡水|ˈspɑrklɪŋ ˌwɔtər
''')

group('日常生活', '餐饮与零食', 'noun', 1,
      '''
breakfast|早餐|ˈbrɛkfəst
lunch|午餐|lʌntʃ
dinner|晚餐|ˈdɪnər
dessert|甜点|dɪˈzɜrt
pizza|比萨饼|ˈpitsə
ice cream|冰淇淋|ˈaɪs ˌkrim
cake|蛋糕|keɪk
chocolate|巧克力|ˈtʃɑklət
fries|薯条|fraɪz
dumplings|饺子|ˈdʌmplɪŋz
cookies|曲奇饼干|ˈkʊkiz
sandwiches|三明治|ˈsænwɪtʃɪz
hamburgers|汉堡包|ˈhæmˌbɜrɡərz
pancakes|薄煎饼|ˈpænˌkeɪks
eggs|鸡蛋|ɛɡz
snacks|零食|snæks
peanuts|花生|ˈpiˌnʌts
popcorn|爆米花|ˈpɑpˌkɔrn
toast|烤面包片|toʊst
cereal|早餐麦片|ˈsɪriəl
''')

group('日常生活', '厨房与餐具', 'noun', 1,
      '''
plate|盘子|pleɪt
bowl|碗|boʊl
cup|杯子|kʌp
glass|玻璃杯|ɡlæs
mug|马克杯|mʌɡ
fork|叉子|fɔrk
knife|刀|naɪf
spoon|勺子|spun
chopsticks|筷子|ˈtʃɑpˌstɪks
pan|平底锅|pæn
pot|锅|pɑt
kettle|水壶|ˈkɛtəl
tray|托盘|treɪ
cutting board|砧板|ˈkʌtɪŋ ˌbɔrd
lid|盖子|lɪd
container|容器|kənˈteɪnər
bottle|瓶子|ˈbɑtəl
jar|罐子|dʒɑr
sink|水槽|sɪŋk
teapot|茶壶|ˈtiˌpɑt
''')

group('居家', '房间与家具', 'noun', 1,
      '''
kitchen|厨房|ˈkɪtʃən
bathroom|浴室|ˈbæθˌrum
bedroom|卧室|ˈbɛdˌrum
living room|客厅|ˈlɪvɪŋ ˌrum
dining room|餐厅|ˈdaɪnɪŋ ˌrum
balcony|阳台|ˈbælkəni
garage|车库|ɡəˈrɑʒ
basement|地下室|ˈbeɪsmənt
hallway|走廊|ˈhɔlˌweɪ
floor|地板|flɔr
window|窗户|ˈwɪndoʊ
door|门|dɔr
wall|墙壁|wɔl
ceiling|天花板|ˈsilɪŋ
table|桌子|ˈteɪbəl
desk|书桌|dɛsk
chair|椅子|tʃɛr
sofa|沙发|ˈsoʊfə
bed|床|bɛd
shelf|架子|ʃɛlf
cabinet|柜子|ˈkæbənət
drawer|抽屉|drɔr
closet|壁橱|ˈklɑzət
mirror|镜子|ˈmɪrər
carpet|地毯|ˈkɑrpət
bathtub|浴缸|ˈbæθˌtʌb
toilet|马桶|ˈtɔɪlət
shower|淋浴间|ˈʃaʊər
staircase|楼梯|ˈstɛrˌkeɪs
entrance|入口|ˈɛntrəns
''')

group('居家', '家电与用品', 'noun', 1,
      '''
refrigerator|冰箱|rɪˈfrɪdʒəˌreɪtər
freezer|冷冻柜|ˈfrizər
oven|烤箱|ˈʌvən
microwave|微波炉|ˈmaɪkrəˌweɪv
stove|炉灶|stoʊv
dishwasher|洗碗机|ˈdɪʃˌwɑʃər
washing machine|洗衣机|ˈwɑʃɪŋ məˌʃin
dryer|烘干机|ˈdraɪər
vacuum cleaner|吸尘器|ˈvækjum ˌklinər
fan|电风扇|fæn
heater|取暖器|ˈhitər
air conditioner|空调|ˈɛr kənˌdɪʃənər
lamp|灯|læmp
light bulb|灯泡|ˈlaɪt ˌbʌlb
clock|时钟|klɑk
alarm clock|闹钟|əˈlɑrm ˌklɑk
pillow|枕头|ˈpɪloʊ
blanket|毯子|ˈblæŋkət
towel|毛巾|ˈtaʊəl
curtain|窗帘|ˈkɜrtən
sheet|床单|ʃit
mattress|床垫|ˈmætrəs
broom|扫帚|brum
mop|拖把|mɑp
bucket|水桶|ˈbʌkət
trash can|垃圾桶|ˈtræʃ ˌkæn
brush|刷子|brʌʃ
sponge|海绵|spʌndʒ
lock|锁|lɑk
key|钥匙|ki
''')

group('日常生活', '随身物品', 'noun', 1,
      '''
wallet|钱包|ˈwɑlət
purse|女式手提包|pɜrs
bag|包|bæɡ
backpack|双肩背包|ˈbækˌpæk
umbrella|雨伞|ʌmˈbrɛlə
watch|手表|wɑtʃ
glasses|眼镜|ˈɡlæsɪz
sunglasses|太阳镜|ˈsʌnˌɡlæsɪz
mask|口罩|mæsk
toothbrush|牙刷|ˈtuθˌbrʌʃ
toothpaste|牙膏|ˈtuθˌpeɪst
soap|肥皂|soʊp
shampoo|洗发水|ʃæmˈpu
comb|梳子|koʊm
razor|剃须刀|ˈreɪzər
sunscreen|防晒霜|ˈsʌnˌskrin
lipstick|口红|ˈlɪpˌstɪk
perfume|香水|pərˈfjum
tissues|纸巾|ˈtɪʃuz
notebook|笔记本|ˈnoʊtˌbʊk
pen|钢笔|pɛn
pencil|铅笔|ˈpɛnsəl
eraser|橡皮擦|ɪˈreɪsər
scissors|剪刀|ˈsɪzərz
passport|护照|ˈpæsˌpɔrt
''')

group('日常生活', '服装', 'noun', 1,
      '''
shirt|衬衫|ʃɜrt
T-shirt|T恤衫|ˈtiˌʃɜrt
coat|外套|koʊt
jacket|夹克|ˈdʒækət
sweater|毛衣|ˈswɛtər
hoodie|连帽衫|ˈhʊdi
dress|连衣裙|drɛs
skirt|裙子|skɜrt
pants|裤子|pænts
jeans|牛仔裤|dʒinz
shorts|短裤|ʃɔrts
socks|袜子|sɑks
shoes|鞋子|ʃuz
boots|靴子|buts
sneakers|运动鞋|ˈsnikərz
slippers|拖鞋|ˈslɪpərz
hat|帽子|hæt
cap|鸭舌帽|kæp
scarf|围巾|skɑrf
gloves|手套|ɡlʌvz
belt|腰带|bɛlt
tie|领带|taɪ
suit|西装|sut
uniform|制服|ˈjunəˌfɔrm
pajamas|睡衣|pəˈdʒɑməz
''')

group('人际关系', '家人与熟人', 'noun', 1,
      '''
mother|母亲|ˈmʌðər
father|父亲|ˈfɑðər
parent|家长|ˈpɛrənt
sister|姐妹|ˈsɪstər
brother|兄弟|ˈbrʌðər
daughter|女儿|ˈdɔtər
son|儿子|sʌn
wife|妻子|waɪf
husband|丈夫|ˈhʌzbənd
grandmother|祖母|ˈɡrænˌmʌðər
grandfather|祖父|ˈɡrænˌfɑðər
aunt|姑妈或姨妈|ænt
uncle|叔叔或舅舅|ˈʌŋkəl
cousin|堂亲或表亲|ˈkʌzən
niece|侄女或外甥女|nis
nephew|侄子或外甥|ˈnɛfju
friend|朋友|frɛnd
neighbor|邻居|ˈneɪbər
roommate|室友|ˈrumˌmeɪt
classmate|同学|ˈklæsˌmeɪt
colleague|同事|ˈkɑliɡ
partner|伴侣|ˈpɑrtnər
boyfriend|男朋友|ˈbɔɪˌfrɛnd
girlfriend|女朋友|ˈɡɜrlˌfrɛnd
relative|亲戚|ˈrɛlətɪv
''')

group('工作与社会', '职业与角色', 'noun', 1,
      '''
teacher|教师|ˈtitʃər
student|学生|ˈstudənt
doctor|医生|ˈdɑktər
nurse|护士|nɜrs
dentist|牙医|ˈdɛntɪst
pharmacist|药剂师|ˈfɑrməsɪst
driver|司机|ˈdraɪvər
pilot|飞行员|ˈpaɪlət
chef|厨师|ʃɛf
waiter|男服务员|ˈweɪtər
waitress|女服务员|ˈweɪtrəs
cashier|收银员|kæˈʃɪr
manager|经理|ˈmænɪdʒər
boss|老板|bɔs
employee|员工|ɪmˈplɔɪi
customer|顾客|ˈkʌstəmər
client|客户|ˈklaɪənt
engineer|工程师|ˌɛndʒəˈnɪr
programmer|程序员|ˈproʊˌɡræmər
designer|设计师|dɪˈzaɪnər
artist|艺术家|ˈɑrtɪst
writer|作家|ˈraɪtər
reporter|记者|rɪˈpɔrtər
lawyer|律师|ˈlɔjər
accountant|会计师|əˈkaʊntənt
farmer|农民|ˈfɑrmər
worker|工人|ˈwɜrkər
cleaner|清洁工|ˈklinər
police officer|警察|pəˈlis ˌɔfəsər
firefighter|消防员|ˈfaɪərˌfaɪtər
receptionist|接待员|rɪˈsɛpʃənɪst
assistant|助理|əˈsɪstənt
secretary|秘书|ˈsɛkrəˌtɛri
scientist|科学家|ˈsaɪəntɪst
professor|教授|prəˈfɛsər
coach|教练|koʊtʃ
volunteer|志愿者|ˌvɑlənˈtɪr
tourist|游客|ˈtʊrɪst
passenger|乘客|ˈpæsəndʒər
guest|客人|ɡɛst
''')

group('出行', '城市地点', 'noun', 1,
      '''
hospital|医院|ˈhɑspɪtəl
clinic|诊所|ˈklɪnɪk
pharmacy|药店|ˈfɑrməsi
school|学校|skul
university|大学|ˌjunəˈvɜrsəti
library|图书馆|ˈlaɪˌbrɛri
bank|银行|bæŋk
ATM|自动取款机|ˌeɪ ti ˈɛm
post office|邮局|ˈpoʊst ˌɔfɪs
police station|警察局|pəˈlis ˌsteɪʃən
supermarket|超市|ˈsupərˌmɑrkət
store|商店|stɔr
mall|购物中心|mɔl
market|市场|ˈmɑrkət
bakery|面包店|ˈbeɪkəri
restaurant|餐馆|ˈrɛstərɑnt
cafe|咖啡馆|kæˈfeɪ
hotel|酒店|hoʊˈtɛl
hostel|青年旅舍|ˈhɑstəl
park|公园|pɑrk
museum|博物馆|mjuˈziəm
theater|剧院|ˈθiətər
cinema|电影院|ˈsɪnəmə
gym|健身房|dʒɪm
stadium|体育场|ˈsteɪdiəm
airport|机场|ˈɛrˌpɔrt
station|车站|ˈsteɪʃən
bus stop|公交车站|ˈbʌs ˌstɑp
parking lot|停车场|ˈpɑrkɪŋ ˌlɑt
gas station|加油站|ˈɡæs ˌsteɪʃən
restroom|洗手间|ˈrɛstˌrum
exit|出口|ˈɛɡzɪt
bridge|桥|brɪdʒ
intersection|十字路口|ˌɪntərˈsɛkʃən
crosswalk|人行横道|ˈkrɔsˌwɔk
''')

group('出行', '交通工具', 'noun', 1,
      '''
car|汽车|kɑr
bus|公共汽车|bʌs
train|火车|treɪn
subway|地铁|ˈsʌbˌweɪ
taxi|出租车|ˈtæksi
bicycle|自行车|ˈbaɪsɪkəl
motorcycle|摩托车|ˈmoʊtərˌsaɪkəl
scooter|小型摩托车|ˈskutər
boat|小船|boʊt
ship|轮船|ʃɪp
ferry|渡船|ˈfɛri
airplane|飞机|ˈɛrˌpleɪn
helicopter|直升机|ˈhɛləˌkɑptər
tram|有轨电车|træm
high-speed rail|高铁|ˌhaɪ spid ˈreɪl
''')

group('出行', '旅行信息', 'noun', 1,
      '''
ticket|票|ˈtɪkət
boarding pass|登机牌|ˈbɔrdɪŋ ˌpæs
visa|签证|ˈvizə
luggage|行李|ˈlʌɡɪdʒ
suitcase|行李箱|ˈsutˌkeɪs
reservation|预订信息|ˌrɛzərˈveɪʃən
address|地址|ˈæˌdrɛs
map|地图|mæp
route|路线|rut
schedule|时间表|ˈskɛdʒul
weather|天气|ˈwɛðər
forecast|天气预报|ˈfɔrˌkæst
traffic|路况|ˈtræfɪk
fuel|燃料|ˈfjuəl
engine|发动机|ˈɛndʒən
tire|轮胎|ˈtaɪər
brakes|刹车|breɪks
seat belt|安全带|ˈsit ˌbɛlt
gate|登机口|ɡeɪt
platform|站台|ˈplætˌfɔrm
destination|目的地|ˌdɛstəˈneɪʃən
departure time|出发时间|dɪˈpɑrtʃər ˌtaɪm
arrival time|到达时间|əˈraɪvəl ˌtaɪm
flight number|航班号|ˈflaɪt ˌnʌmbər
itinerary|行程安排|aɪˈtɪnəˌrɛri
''')

group('科技', '设备与配件', 'noun', 1,
      '''
phone|手机|foʊn
computer|电脑|kəmˈpjutər
laptop|笔记本电脑|ˈlæpˌtɑp
tablet|平板电脑|ˈtæblət
keyboard|键盘|ˈkiˌbɔrd
mouse|鼠标|maʊs
screen|屏幕|skrin
monitor|显示器|ˈmɑnətər
printer|打印机|ˈprɪntər
camera|相机|ˈkæmərə
microphone|麦克风|ˈmaɪkrəˌfoʊn
speaker|扬声器|ˈspikər
charger|充电器|ˈtʃɑrdʒər
battery|电池|ˈbætəri
cable|连接线|ˈkeɪbəl
router|路由器|ˈraʊtər
remote control|遥控器|rɪˌmoʊt kənˈtroʊl
television|电视机|ˈtɛləˌvɪʒən
headset|耳麦|ˈhɛdˌsɛt
power bank|充电宝|ˈpaʊər ˌbæŋk
''')

group('科技', '网络与软件', 'noun', 1,
      '''
app|应用程序|æp
website|网站|ˈwɛbˌsaɪt
browser|浏览器|ˈbraʊzər
email|电子邮件|ˈiˌmeɪl
message|消息|ˈmɛsɪdʒ
account|账户|əˈkaʊnt
password|密码|ˈpæsˌwɜrd
username|用户名|ˈjuzərˌneɪm
file|文件|faɪl
folder|文件夹|ˈfoʊldər
document|文档|ˈdɑkjəmənt
photo|照片|ˈfoʊtoʊ
video|视频|ˈvɪdioʊ
link|链接|lɪŋk
network|网络|ˈnɛtˌwɜrk
connection|连接|kəˈnɛkʃən
update|更新|ˈʌpˌdeɪt
backup|备份|ˈbækˌʌp
attachment|附件|əˈtætʃmənt
notification|通知|ˌnoʊtəfəˈkeɪʃən
setting|设置项|ˈsɛtɪŋ
subscription|订阅|səbˈskrɪpʃən
software|软件|ˈsɔftˌwɛr
program|程序|ˈproʊˌɡræm
spreadsheet|电子表格|ˈsprɛdˌʃit
''')

group('健康', '身体部位', 'noun', 1,
      '''
head|头|hɛd
face|脸|feɪs
eye|眼睛|aɪ
ear|耳朵|ɪr
nose|鼻子|noʊz
mouth|嘴|maʊθ
tooth|牙齿|tuθ
tongue|舌头|tʌŋ
throat|喉咙|θroʊt
neck|脖子|nɛk
shoulder|肩膀|ˈʃoʊldər
arm|手臂|ɑrm
elbow|肘部|ˈɛlboʊ
wrist|手腕|rɪst
hand|手|hænd
finger|手指|ˈfɪŋɡər
thumb|拇指|θʌm
back|背部|bæk
chest|胸部|tʃɛst
stomach|胃|ˈstʌmək
waist|腰|weɪst
hip|髋部|hɪp
leg|腿|lɛɡ
knee|膝盖|ni
ankle|脚踝|ˈæŋkəl
foot|脚|fʊt
toe|脚趾|toʊ
heel|脚后跟|hil
skin|皮肤|skɪn
muscle|肌肉|ˈmʌsəl
''')

group('健康', '医疗与照护', 'noun', 2,
      '''
pain|疼痛|peɪn
fever|发烧|ˈfivər
cough|咳嗽|kɔf
cold|感冒|koʊld
flu|流感|flu
headache|头痛|ˈhɛdˌeɪk
allergy|过敏|ˈælərdʒi
infection|感染|ɪnˈfɛkʃən
injury|伤势|ˈɪndʒəri
wound|伤口|wund
symptom|症状|ˈsɪmptəm
medicine|药物|ˈmɛdəsən
pill|药片|pɪl
prescription|处方|prɪˈskrɪpʃən
treatment|治疗|ˈtritmənt
surgery|手术|ˈsɜrdʒəri
vaccine|疫苗|vækˈsin
appointment|预约|əˈpɔɪntmənt
checkup|体检|ˈtʃɛkˌʌp
blood pressure|血压|ˈblʌd ˌprɛʃər
temperature|体温|ˈtɛmprətʃər
test result|检查结果|ˈtɛst rɪˌzʌlt
side effect|副作用|ˈsaɪd ɪˌfɛkt
dose|剂量|doʊs
recovery|康复|rɪˈkʌvəri
''')

group('购物与金钱', '付款与财务', 'noun', 1,
      '''
price|价格|praɪs
cost|费用|kɔst
bill|账单|bɪl
receipt|收据|rɪˈsit
discount|折扣|ˈdɪsˌkaʊnt
refund|退款|ˈriˌfʌnd
payment|付款|ˈpeɪmənt
deposit|押金|dɪˈpɑzɪt
fee|收费|fi
tax|税款|tæks
tip|小费|tɪp
budget|预算|ˈbʌdʒɪt
salary|工资|ˈsæləri
income|收入|ˈɪnˌkʌm
expense|支出|ɪkˈspɛns
loan|贷款|loʊn
mortgage|房贷|ˈmɔrɡɪdʒ
debt|债务|dɛt
interest rate|利率|ˈɪntrəst ˌreɪt
exchange rate|汇率|ɪksˈtʃeɪndʒ ˌreɪt
insurance|保险|ɪnˈʃʊrəns
rent|租金|rɛnt
profit|利润|ˈprɑfɪt
loss|亏损|lɔs
balance|余额|ˈbæləns
''')

group('工作与学习', '任务与沟通', 'noun', 1,
      '''
job|工作|dʒɑb
project|项目|ˈprɑdʒɛkt
task|任务|tæsk
plan|计划|plæn
goal|目标|ɡoʊl
meeting|会议|ˈmitɪŋ
interview|面试|ˈɪntərˌvju
report|报告|rɪˈpɔrt
presentation|演示报告|ˌprɛzənˈteɪʃən
deadline|截止日期|ˈdɛdˌlaɪn
contract|合同|ˈkɑnˌtrækt
agreement|协议|əˈɡrimənt
offer|报价|ˈɔfər
request|请求|rɪˈkwɛst
decision|决定|dɪˈsɪʒən
problem|问题|ˈprɑbləm
solution|解决方案|səˈluʃən
idea|想法|aɪˈdiə
suggestion|建议|səˈdʒɛstʃən
feedback|反馈|ˈfidˌbæk
result|结果|rɪˈzʌlt
progress|进展|ˈprɑɡrɛs
change|变化|tʃeɪndʒ
opportunity|机会|ˌɑpərˈtunəti
experience|经验|ɪkˈspɪriəns
training|培训|ˈtreɪnɪŋ
policy|政策|ˈpɑləsi
rule|规则|rul
requirement|要求|rɪˈkwaɪrmənt
detail|细节|ˈdiˌteɪl
''')

group('工作与学习', '学习内容', 'noun', 1,
      '''
word|单词|wɜrd
sentence|句子|ˈsɛntəns
phrase|短语|freɪz
expression|表达|ɪkˈsprɛʃən
meaning|含义|ˈminɪŋ
translation|翻译|trænsˈleɪʃən
pronunciation|发音|prəˌnʌnsiˈeɪʃən
spelling|拼写|ˈspɛlɪŋ
example|例子|ɪɡˈzæmpəl
lesson|课程|ˈlɛsən
chapter|章节|ˈtʃæptər
paragraph|段落|ˈpærəˌɡræf
page|页面|peɪdʒ
book|书本|bʊk
textbook|课本|ˈtɛkstˌbʊk
dictionary|词典|ˈdɪkʃəˌnɛri
exercise|练习|ˈɛksərˌsaɪz
exam|考试|ɪɡˈzæm
quiz|小测验|kwɪz
answer|答案|ˈænsər
question|问题|ˈkwɛstʃən
subject|科目|ˈsʌbdʒɛkt
course|课程|kɔrs
grade|成绩|ɡreɪd
assignment|作业|əˈsaɪnmənt
''')

group('自然与环境', '户外景物', 'noun', 2,
      '''
sun|太阳|sʌn
moon|月亮|mun
star|星星|stɑr
sky|天空|skaɪ
cloud|云|klaʊd
rainbow|彩虹|ˈreɪnˌboʊ
mountain|山|ˈmaʊntən
hill|小山|hɪl
river|河流|ˈrɪvər
lake|湖|leɪk
ocean|海洋|ˈoʊʃən
sea|海|si
beach|海滩|bitʃ
island|岛屿|ˈaɪlənd
forest|森林|ˈfɔrəst
tree|树|tri
flower|花|ˈflaʊər
leaf|叶子|lif
branch|树枝|bræntʃ
garden|花园|ˈɡɑrdən
field|田野|fild
farm|农场|fɑrm
village|村庄|ˈvɪlɪdʒ
sunrise|日出|ˈsʌnˌraɪz
sunset|日落|ˈsʌnˌsɛt
''')

group('自然与环境', '动物', 'noun', 2,
      '''
dog|狗|dɔɡ
cat|猫|kæt
bird|鸟|bɜrd
duck|鸭子|dʌk
goose|鹅|ɡus
horse|马|hɔrs
cow|奶牛|kaʊ
pig|猪|pɪɡ
sheep|绵羊|ʃip
goat|山羊|ɡoʊt
rabbit|兔子|ˈræbɪt
rat|老鼠|ræt
squirrel|松鼠|ˈskwɜrəl
monkey|猴子|ˈmʌŋki
panda|熊猫|ˈpændə
bear|熊|bɛr
tiger|老虎|ˈtaɪɡər
lion|狮子|ˈlaɪən
elephant|大象|ˈɛləfənt
giraffe|长颈鹿|dʒəˈræf
zebra|斑马|ˈzibrə
deer|鹿|dɪr
wolf|狼|wʊlf
fox|狐狸|fɑks
turtle|乌龟|ˈtɜrtəl
frog|青蛙|frɔɡ
butterfly|蝴蝶|ˈbʌtərˌflaɪ
bee|蜜蜂|bi
ant|蚂蚁|ænt
spider|蜘蛛|ˈspaɪdər
''')

group('休闲与文化', '活动', 'noun', 2,
      '''
music|音乐|ˈmjuzɪk
art|艺术|ɑrt
photography|摄影|fəˈtɑɡrəfi
reading|阅读|ˈridɪŋ
writing|写作|ˈraɪtɪŋ
painting|绘画|ˈpeɪntɪŋ
dancing|跳舞|ˈdænsɪŋ
singing|唱歌|ˈsɪŋɪŋ
cooking|做饭|ˈkʊkɪŋ
baking|烘焙|ˈbeɪkɪŋ
gardening|园艺|ˈɡɑrdənɪŋ
shopping|购物|ˈʃɑpɪŋ
travel|旅行|ˈtrævəl
swimming|游泳|ˈswɪmɪŋ
running|跑步|ˈrʌnɪŋ
walking|散步|ˈwɔkɪŋ
hiking|徒步旅行|ˈhaɪkɪŋ
camping|露营|ˈkæmpɪŋ
fishing|钓鱼|ˈfɪʃɪŋ
cycling|骑自行车|ˈsaɪklɪŋ
skiing|滑雪|ˈskiɪŋ
yoga|瑜伽|ˈjoʊɡə
basketball|篮球|ˈbæskətˌbɔl
soccer|足球|ˈsɑkər
tennis|网球|ˈtɛnɪs
badminton|羽毛球|ˈbædmɪntən
volleyball|排球|ˈvɑliˌbɔl
baseball|棒球|ˈbeɪsˌbɔl
golf|高尔夫球|ɡɑlf
chess|国际象棋|tʃɛs
''')

group('描述', '人的感受', 'adjective', 1,
      '''
happy|开心|ˈhæpi
sad|难过|sæd
angry|生气|ˈæŋɡri
tired|疲惫|ˈtaɪərd
sleepy|困倦|ˈslipi
hungry|饥饿|ˈhʌŋɡri
thirsty|口渴|ˈθɜrsti
sick|身体不适|sɪk
dizzy|头晕|ˈdɪzi
weak|虚弱|wik
strong|强壮|strɔŋ
healthy|健康|ˈhɛlθi
better|好些了|ˈbɛtər
worse|更难受了|wɜrs
excited|兴奋|ɪkˈsaɪtɪd
nervous|紧张|ˈnɜrvəs
worried|担心|ˈwɜrid
anxious|焦虑|ˈæŋkʃəs
calm|平静|kɑm
relaxed|放松|rɪˈlækst
comfortable|舒服|ˈkʌmftərbəl
uncomfortable|不舒服|ʌnˈkʌmftərbəl
lonely|孤独|ˈloʊnli
bored|无聊|bɔrd
confused|困惑|kənˈfjuzd
confident|自信|ˈkɑnfɪdənt
proud|自豪|praʊd
grateful|感激|ˈɡreɪtfəl
hopeful|充满希望|ˈhoʊpfəl
disappointed|失望|ˌdɪsəˈpɔɪntɪd
''')

group('描述', '人的特点', 'adjective', 1,
      '''
kind|善良|kaɪnd
friendly|友好|ˈfrɛndli
polite|有礼貌|pəˈlaɪt
rude|粗鲁|rud
honest|诚实|ˈɑnɪst
patient|有耐心|ˈpeɪʃənt
careful|细心|ˈkɛrfəl
careless|粗心|ˈkɛrləs
helpful|乐于助人|ˈhɛlpfəl
smart|聪明|smɑrt
clever|机灵|ˈklɛvər
wise|明智|waɪz
funny|风趣|ˈfʌni
serious|严肃|ˈsɪriəs
quiet|安静|ˈkwaɪət
shy|害羞|ʃaɪ
brave|勇敢|breɪv
creative|有创造力|kriˈeɪtɪv
curious|好奇|ˈkjʊriəs
generous|慷慨|ˈdʒɛnərəs
selfish|自私|ˈsɛlfɪʃ
lazy|懒惰|ˈleɪzi
busy|忙碌|ˈbɪzi
popular|受欢迎|ˈpɑpjələr
famous|有名|ˈfeɪməs
''')

group('描述', '物品与评价', 'adjective', 1,
      '''
big|很大|bɪɡ
small|很小|smɔl
large|很大|lɑrdʒ
tiny|很小巧|ˈtaɪni
heavy|很重|ˈhɛvi
light|很轻|laɪt
new|是新的|nu
old|是旧的|oʊld
clean|很干净|klin
dirty|很脏|ˈdɜrti
wet|是湿的|wɛt
dry|是干的|draɪ
soft|很柔软|sɔft
hard|很硬|hɑrd
cheap|很便宜|tʃip
expensive|很贵|ɪkˈspɛnsɪv
free|是免费的|fri
beautiful|很漂亮|ˈbjutəfəl
ugly|很难看|ˈʌɡli
useful|很实用|ˈjusfəl
useless|没有用|ˈjusləs
empty|是空的|ˈɛmpti
full|装满了|fʊl
open|敞开着|ˈoʊpən
closed|是合上的|kloʊzd
''')

group('描述', '颜色', 'adjective', 1,
      '''
red|红色|rɛd
blue|蓝色|blu
green|绿色|ɡrin
yellow|黄色|ˈjɛloʊ
black|黑色|blæk
white|白色|waɪt
gray|灰色|ɡreɪ
brown|棕色|braʊn
pink|粉色|pɪŋk
purple|紫色|ˈpɜrpəl
''')

group('描述', '情况与判断', 'adjective', 1,
      '''
good|很好|ɡʊd
bad|很糟糕|bæd
great|非常好|ɡreɪt
terrible|很糟糕|ˈtɛrəbəl
normal|很正常|ˈnɔrməl
unusual|不寻常|ʌnˈjuʒuəl
strange|很奇怪|streɪndʒ
different|有所不同|ˈdɪfrənt
similar|很相似|ˈsɪmələr
simple|很简单|ˈsɪmpəl
complicated|很复杂|ˈkɑmpləˌkeɪtɪd
difficult|很困难|ˈdɪfɪkəlt
dangerous|很危险|ˈdeɪndʒərəs
safe|很安全|seɪf
urgent|很紧急|ˈɜrdʒənt
stable|很稳定|ˈsteɪbəl
uncertain|尚不确定|ʌnˈsɜrtən
clear|很清楚|klɪr
temporary|是暂时的|ˈtɛmpəˌrɛri
unfair|不公平|ʌnˈfɛr
''')

group('时间', '星期', 'noun', 1,
      '''
Monday|星期一|ˈmʌndeɪ
Tuesday|星期二|ˈtuzdeɪ
Wednesday|星期三|ˈwɛnzdeɪ
Thursday|星期四|ˈθɜrzdeɪ
Friday|星期五|ˈfraɪdeɪ
Saturday|星期六|ˈsætərdeɪ
Sunday|星期日|ˈsʌndeɪ
''')

group('时间', '月份', 'noun', 1,
      '''
January|一月|ˈdʒænjuˌɛri
February|二月|ˈfɛbjuˌɛri
March|三月|mɑrtʃ
April|四月|ˈeɪprəl
May|五月|meɪ
June|六月|dʒun
July|七月|dʒuˈlaɪ
August|八月|ˈɔɡəst
September|九月|sɛpˈtɛmbər
October|十月|ɑkˈtoʊbər
November|十一月|noʊˈvɛmbər
December|十二月|dɪˈsɛmbər
''')

group('数量', '基数词', 'numeral', 1,
      '''
one|一|wʌn
two|两|tu
three|三|θri
four|四|fɔr
five|五|faɪv
six|六|sɪks
seven|七|ˈsɛvən
eight|八|eɪt
nine|九|naɪn
ten|十|tɛn
eleven|十一|ɪˈlɛvən
twelve|十二|twɛlv
thirteen|十三|ˌθɜrˈtin
fourteen|十四|ˌfɔrˈtin
fifteen|十五|ˌfɪfˈtin
sixteen|十六|ˌsɪksˈtin
seventeen|十七|ˌsɛvənˈtin
eighteen|十八|ˌeɪˈtin
nineteen|十九|ˌnaɪnˈtin
twenty|二十|ˈtwɛnti
thirty|三十|ˈθɜrti
forty|四十|ˈfɔrti
fifty|五十|ˈfɪfti
sixty|六十|ˈsɪksti
seventy|七十|ˈsɛvənti
eighty|八十|ˈeɪti
ninety|九十|ˈnaɪnti
one hundred|一百|wʌn ˈhʌndrəd
''')

# Individually written examples for verbs, function words, and other senses.
def individual(l1, l2, pos, priority, data):
    for line in data.strip().splitlines():
        en, zh, ipa, ex, tr = line.split('|')
        add(en, zh, ipa, l1, l2, pos, priority, ex, tr)

individual('常用动作', '基本动词', 'verb', 1, '''
be|是；处于|bi|Please be quiet.|请保持安静。
have|有|hæv|I have a question.|我有一个问题。
do|做|du|What do you do on weekends?|你周末做什么？
go|去|ɡoʊ|I go to work by bus.|我坐公交车去上班。
come|来|kʌm|Please come here.|请到这里来。
get|得到；收到|ɡɛt|Did you get my email?|你收到我的邮件了吗？
make|制作|meɪk|Let us make dinner together.|我们一起做晚饭吧。
take|拿；带走|teɪk|Please take an umbrella.|请带一把伞。
give|给|ɡɪv|Please give me a minute.|请给我一分钟。
put|放|pʊt|Put your bag on the chair.|把你的包放在椅子上。
keep|保留|kip|You can keep the receipt.|你可以保留收据。
let|让；允许|lɛt|Let me help you.|让我帮你。
help|帮助|hɛlp|Can you help me?|你能帮我吗？
need|需要|nid|I need some water.|我需要一些水。
want|想要|wɑnt|I want a cup of tea.|我想要一杯茶。
like|喜欢|laɪk|I like this song.|我喜欢这首歌。
love|爱；非常喜欢|lʌv|I love my family.|我爱我的家人。
hate|讨厌|heɪt|I hate waiting in line.|我讨厌排队。
know|知道|noʊ|Do you know her name?|你知道她的名字吗？
think|认为；思考|θɪŋk|I think this is a good idea.|我认为这是个好主意。
believe|相信|bɪˈliv|I believe you.|我相信你。
understand|理解|ˌʌndərˈstænd|I understand the question.|我理解这个问题。
remember|记得|rɪˈmɛmbər|Do you remember this place?|你记得这个地方吗？
forget|忘记|fərˈɡɛt|Do not forget your keys.|别忘了你的钥匙。
learn|学习|lɜrn|I want to learn English.|我想学英语。
study|学习；研究|ˈstʌdi|I study at the library.|我在图书馆学习。
teach|教|titʃ|Can you teach me this word?|你能教我这个单词吗？
read|阅读|rid|I read before bed.|我睡前看书。
write|写|raɪt|Please write your name here.|请在这里写下你的名字。
listen|听|ˈlɪsən|Listen to this song.|听听这首歌。
hear|听见|hɪr|Can you hear me?|你能听见我吗？
see|看见|si|I can see the station.|我能看见车站。
look|看|lʊk|Look at the screen.|看屏幕。
speak|说话；讲某种语言|spik|Do you speak English?|你会说英语吗？
talk|交谈|tɔk|Can we talk later?|我们能晚点聊吗？
say|说|seɪ|What did she say?|她说了什么？
tell|告诉|tɛl|Tell me your name.|告诉我你的名字。
ask|问|æsk|Can I ask a question?|我能问一个问题吗？
reply|回复|rɪˈplaɪ|Please reply by Friday.|请在星期五之前回复。
call|打电话|kɔl|I will call you tonight.|我今晚会给你打电话。
meet|见面|mit|Let us meet at noon.|我们中午见吧。
leave|离开|liv|We leave at eight.|我们八点出发。
arrive|到达|əˈraɪv|When will you arrive?|你什么时候到？
stay|停留；住|steɪ|We will stay for two nights.|我们会住两晚。
live|居住|lɪv|I live near the park.|我住在公园附近。
move|移动；搬家|muv|We plan to move next month.|我们计划下个月搬家。
walk|步行|wɔk|I walk to school.|我步行去学校。
run|跑|rʌn|I run every morning.|我每天早晨跑步。
drive|开车|draɪv|Can you drive me home?|你能开车送我回家吗？
ride|骑；乘坐|raɪd|I ride my bike to work.|我骑自行车上班。
fly|飞；乘飞机|flaɪ|We fly to Beijing tomorrow.|我们明天乘飞机去北京。
sit|坐|sɪt|Please sit here.|请坐这里。
stand|站立|stænd|Please stand behind the line.|请站在线后面。
lie|躺|laɪ|I need to lie down.|我需要躺一会儿。
sleep|睡觉|slip|I sleep for eight hours.|我睡八个小时。
wake|醒来；叫醒|weɪk|Please wake me at seven.|请七点叫醒我。
eat|吃|it|What would you like to eat?|你想吃什么？
drink|喝|drɪŋk|I drink tea every day.|我每天喝茶。
cook|烹饪|kʊk|I cook at home.|我在家做饭。
wash|洗|wɑʃ|Please wash your hands.|请洗手。
wear|穿；戴|wɛr|Wear a coat today.|今天穿件外套。
buy|买|baɪ|I need to buy some milk.|我需要买些牛奶。
sell|卖|sɛl|They sell fresh bread.|他们卖新鲜面包。
pay|付款|peɪ|Can I pay by card?|我能刷卡付款吗？
spend|花费|spɛnd|I spend an hour reading daily.|我每天花一个小时阅读。
save|节省；储蓄|seɪv|I want to save money.|我想存钱。
borrow|借入|ˈbɑroʊ|Can I borrow your pen?|我能借一下你的笔吗？
lend|借出|lɛnd|Can you lend me a pen?|你能借给我一支笔吗？
find|找到|faɪnd|I cannot find my keys.|我找不到钥匙了。
lose|丢失|luz|Do not lose your ticket.|别把票弄丢了。
bring|带来|brɪŋ|Please bring your passport.|请带上你的护照。
carry|搬；携带|ˈkæri|Can you carry this box?|你能搬这个箱子吗？
send|发送；寄|sɛnd|Please send me the address.|请把地址发给我。
receive|收到|rɪˈsiv|Did you receive the package?|你收到包裹了吗？
use|使用|juz|May I use your phone?|我可以用一下你的手机吗？
try|尝试|traɪ|Let me try again.|让我再试一次。
start|开始|stɑrt|We start work at nine.|我们九点开始工作。
begin|开始|bɪˈɡɪn|The class will begin soon.|马上就要上课了。
finish|完成|ˈfɪnɪʃ|Please finish this today.|请今天完成这个。
stop|停止|stɑp|Please stop here.|请在这里停下。
wait|等待|weɪt|Please wait a moment.|请稍等。
work|工作|wɜrk|I work from home.|我在家工作。
play|玩；演奏|pleɪ|Do you play the piano?|你会弹钢琴吗？
rest|休息|rɛst|You should rest today.|你今天应该休息。
relax|放松|rɪˈlæks|I relax after work.|我下班后放松一下。
enjoy|享受；喜欢|ɪnˈdʒɔɪ|Enjoy your meal.|祝你用餐愉快。
choose|选择|tʃuz|Choose the correct answer.|选择正确答案。
decide|决定|dɪˈsaɪd|We need to decide today.|我们需要今天作出决定。
agree|同意|əˈɡri|I agree with you.|我同意你的看法。
disagree|不同意|ˌdɪsəˈɡri|I disagree with that idea.|我不同意那个想法。
explain|解释|ɪkˈspleɪn|Can you explain this word?|你能解释一下这个单词吗？
show|展示|ʃoʊ|Please show me your ticket.|请出示你的票。
check|检查|tʃɛk|Please check the address.|请核对地址。
fix|修理|fɪks|Can you fix my phone?|你能修我的手机吗？
repair|修理|rɪˈpɛr|They can repair this bike.|他们能修这辆自行车。
break|打破；弄坏|breɪk|Be careful not to break it.|小心别把它弄坏。
build|建造|bɪld|They will build a new school.|他们将建一所新学校。
create|创造|kriˈeɪt|Let us create a new game.|我们来做一个新游戏吧。
cut|切；剪|kʌt|Cut the bread into slices.|把面包切成片。
add|添加|æd|Add a little salt.|加一点盐。
remove|移除|rɪˈmuv|Please remove your shoes.|请脱鞋。
turn|转弯|tɜrn|Turn left at the corner.|在拐角处左转。
follow|跟随|ˈfɑloʊ|Please follow me.|请跟我来。
lead|带领|lid|She will lead the team.|她将带领这个团队。
hold|握住；拿住|hoʊld|Please hold my bag.|请帮我拿一下包。
push|推|pʊʃ|Push the door to open it.|推门就能打开。
pull|拉|pʊl|Pull the handle gently.|轻轻拉把手。
pick|挑选|pɪk|Pick a color you like.|选一个你喜欢的颜色。
drop|使落下|drɑp|Do not drop your phone.|别把手机摔了。
throw|扔|θroʊ|Throw the ball to me.|把球扔给我。
catch|接住；赶上|kætʃ|We need to catch the train.|我们得赶上火车。
reach|到达|ritʃ|We will reach the hotel soon.|我们很快就到酒店了。
pass|递；通过|pæs|Please pass me the salt.|请把盐递给我。
return|归还；返回|rɪˈtɜrn|Please return the book tomorrow.|请明天还书。
accept|接受|əkˈsɛpt|We accept credit cards.|我们接受信用卡付款。
refuse|拒绝|rɪˈfjuz|You can refuse the offer.|你可以拒绝这个提议。
allow|允许|əˈlaʊ|They allow pets here.|这里允许带宠物。
invite|邀请|ɪnˈvaɪt|Let us invite our neighbors.|我们邀请邻居们吧。
join|加入|dʒɔɪn|Would you like to join us?|你想加入我们吗？
visit|拜访；参观|ˈvɪzɪt|I visit my parents every week.|我每周去看望父母。
miss|想念；错过|mɪs|I miss my family.|我想念我的家人。
hope|希望|hoʊp|I hope you feel better soon.|我希望你早日好起来。
wish|希望；祝愿|wɪʃ|I wish you good luck.|祝你好运。
expect|预计；期待|ɪkˈspɛkt|We expect rain tomorrow.|我们预计明天会下雨。
prefer|更喜欢|prɪˈfɜr|I prefer tea to coffee.|比起咖啡，我更喜欢茶。
seem|似乎|sim|You seem tired.|你看起来很累。
feel|感觉|fil|I feel much better.|我感觉好多了。
become|变成|bɪˈkʌm|I want to become a teacher.|我想成为一名教师。
grow|生长；种植|ɡroʊ|We grow tomatoes here.|我们在这里种西红柿。
improve|改善；提高|ɪmˈpruv|I want to improve my English.|我想提高英语水平。
reduce|减少|rɪˈdus|We need to reduce costs.|我们需要降低成本。
increase|增加|ɪnˈkris|We need to increase sales.|我们需要提高销量。
continue|继续|kənˈtɪnju|Please continue reading.|请继续阅读。
prepare|准备|prɪˈpɛr|I need to prepare dinner.|我需要准备晚饭。
practice|练习|ˈpræktɪs|I practice English every day.|我每天练习英语。
repeat|重复|rɪˈpit|Could you repeat that?|你能再说一遍吗？
review|复习；审查|rɪˈvju|Let us review these words.|我们复习一下这些单词吧。
describe|描述|dɪˈskraɪb|Can you describe your bag?|你能描述一下你的包吗？
compare|比较|kəmˈpɛr|Compare the two prices.|比较一下这两个价格。
consider|考虑|kənˈsɪdər|Please consider my suggestion.|请考虑我的建议。
include|包括|ɪnˈklud|Does the price include breakfast?|这个价格包括早餐吗？
provide|提供|prəˈvaɪd|We provide free Wi-Fi.|我们提供免费无线网络。
support|支持|səˈpɔrt|My family supports me.|我的家人支持我。
protect|保护|prəˈtɛkt|Protect your eyes from the sun.|保护眼睛，避免阳光直射。
avoid|避免|əˈvɔɪd|Try to avoid rush hour.|尽量避开交通高峰期。
notice|注意到|ˈnoʊtɪs|Did you notice the sign?|你注意到那个标志了吗？
realize|意识到|ˈriəˌlaɪz|I realize I was wrong.|我意识到我错了。
imagine|想象|ɪˈmædʒɪn|Imagine living near the sea.|想象一下住在海边。
remind|提醒|rɪˈmaɪnd|Please remind me tomorrow.|请明天提醒我。
promise|承诺|ˈprɑmɪs|I promise to call you.|我保证给你打电话。
apologize|道歉|əˈpɑləˌdʒaɪz|I apologize for being late.|我为迟到道歉。
thank|感谢|θæŋk|I want to thank you for your help.|我想感谢你的帮助。
celebrate|庆祝|ˈsɛləˌbreɪt|Let us celebrate your birthday.|我们庆祝一下你的生日吧。
cancel|取消|ˈkænsəl|I need to cancel my reservation.|我需要取消预订。
book|预订|bʊk|I would like to book a room.|我想预订一个房间。
order|点餐；订购|ˈɔrdər|Are you ready to order?|你准备好点餐了吗？
deliver|递送|dɪˈlɪvər|Do you deliver to this address?|你们送货到这个地址吗？
pack|打包；收拾行李|pæk|I need to pack my suitcase.|我需要收拾行李箱。
print|打印|prɪnt|Please print this document.|请打印这份文件。
download|下载|ˈdaʊnˌloʊd|You can download the app here.|你可以在这里下载应用。
upload|上传|ˌʌpˈloʊd|Please upload your photo.|请上传你的照片。
click|点击|klɪk|Click the blue button.|点击蓝色按钮。
search|搜索|sɜrtʃ|Search for the address online.|在网上搜索这个地址。
share|分享|ʃɛr|Can you share the link?|你能分享一下链接吗？
connect|连接|kəˈnɛkt|Connect your phone to Wi-Fi.|把手机连接到无线网络。
charge|充电|tʃɑrdʒ|I need to charge my phone.|我需要给手机充电。
delete|删除|dɪˈlit|Please delete this file.|请删除这个文件。
copy|复制|ˈkɑpi|Copy the address here.|把地址复制到这里。
paste|粘贴|peɪst|Paste the link in your browser.|把链接粘贴到浏览器中。
''')

individual('语言基础', '代词与限定词', 'pronoun', 1, '''
I|我|aɪ|I am a student.|我是一名学生。
you|你；你们|ju|You are welcome here.|这里欢迎你。
he|他|hi|He is my brother.|他是我的兄弟。
she|她|ʃi|She is a doctor.|她是一名医生。
it|它|ɪt|It is on the table.|它在桌子上。
we|我们|wi|We live here.|我们住在这里。
they|他们；她们；它们|ðeɪ|They are my friends.|他们是我的朋友。
me|我（宾格）|mi|Please help me.|请帮帮我。
him|他（宾格）|hɪm|I know him.|我认识他。
her|她（宾格）|hɜr|Please call her.|请给她打电话。
us|我们（宾格）|ʌs|Come with us.|跟我们来。
them|他们（宾格）|ðɛm|I will ask them.|我会问他们。
mine|我的（东西）|maɪn|This bag is mine.|这个包是我的。
yours|你的（东西）|jʊrz|Is this yours?|这是你的吗？
someone|某人|ˈsʌmˌwʌn|Someone is at the door.|有人在门口。
anyone|任何人|ˈɛniˌwʌn|Can anyone help?|有人能帮忙吗？
everyone|每个人|ˈɛvriˌwʌn|Everyone is ready.|大家都准备好了。
nobody|没有人|ˈnoʊˌbɑdi|Nobody is home.|没有人在家。
something|某事；某物|ˈsʌmθɪŋ|I need something to eat.|我需要吃点东西。
anything|任何事物|ˈɛniˌθɪŋ|Do you need anything?|你需要什么吗？
everything|一切|ˈɛvriˌθɪŋ|Everything is fine.|一切都好。
nothing|没有什么|ˈnʌθɪŋ|There is nothing in the box.|盒子里什么也没有。
myself|我自己|maɪˈsɛlf|I made it myself.|这是我自己做的。
yourself|你自己|jʊrˈsɛlf|Please introduce yourself.|请介绍一下你自己。
''')

individual('语言基础', '限定词与冠词', 'determiner', 1, '''
my|我的|maɪ|This is my phone.|这是我的手机。
your|你的|jʊr|What is your name?|你叫什么名字？
his|他的|hɪz|His car is blue.|他的车是蓝色的。
our|我们的|aʊər|This is our home.|这是我们的家。
their|他们的|ðɛr|Their house is nearby.|他们的房子在附近。
this|这个|ðɪs|This book is useful.|这本书很有用。
that|那个|ðæt|That bus goes downtown.|那辆公交车去市中心。
these|这些|ðiz|These shoes are new.|这些鞋是新的。
those|那些|ðoʊz|Those seats are empty.|那些座位是空的。
a|一（用于辅音音素前）|ə|I need a pen.|我需要一支笔。
an|一（用于元音音素前）|ən|I ate an apple.|我吃了一个苹果。
the|这；那（特指）|ðə|Please close the door.|请把门关上。
some|一些|sʌm|I need some help.|我需要一些帮助。
any|任何；一些|ˈɛni|Do you have any questions?|你有什么问题吗？
every|每个|ˈɛvri|I study every day.|我每天学习。
each|每个（分别指）|itʃ|Each student has a book.|每个学生都有一本书。
all|所有|ɔl|All tickets are sold.|所有票都卖完了。
both|两者都|boʊθ|Both answers are correct.|两个答案都对。
many|许多（可数）|ˈmɛni|There are many people here.|这里有很多人。
much|许多（不可数）|mʌtʃ|We do not have much time.|我们没有多少时间了。
few|很少（可数）|fju|Few shops are open.|很少有商店开门。
several|几个|ˈsɛvərəl|I have several ideas.|我有几个想法。
another|另一个|əˈnʌðər|May I have another cup?|能再给我一杯吗？
enough|足够的|ɪˈnʌf|We have enough food.|我们有足够的食物。
''')

individual('语言基础', '介词', 'preposition', 1, '''
in|在……里面|ɪn|The keys are in my bag.|钥匙在我的包里。
on|在……上面|ɑn|The book is on the desk.|书在书桌上。
at|在（地点或时间）|æt|Meet me at the station.|在车站和我见面。
to|到；向|tu|I am going to school.|我要去学校。
from|从；来自|frʌm|I am from China.|我来自中国。
with|和；带有|wɪð|I live with my parents.|我和父母一起住。
without|没有|wɪˈðaʊt|I drink coffee without sugar.|我喝咖啡不加糖。
for|为了；给|fɔr|This gift is for you.|这份礼物是给你的。
about|关于|əˈbaʊt|Tell me about your trip.|跟我说说你的旅行。
of|……的|ʌv|I need a glass of water.|我需要一杯水。
by|通过；在旁边|baɪ|I travel by train.|我坐火车出行。
under|在……下面|ˈʌndər|The cat is under the chair.|猫在椅子下面。
over|在……上方|ˈoʊvər|A plane flew over the city.|一架飞机飞过城市上空。
above|在……上面|əˈbʌv|The clock is above the door.|时钟在门的上方。
below|在……下面|bɪˈloʊ|Write your name below the line.|在线下面写上你的名字。
between|在两者之间|bɪˈtwin|The bank is between two shops.|银行在两家商店之间。
among|在……之中|əˈmʌŋ|I found my bag among the boxes.|我在那些箱子中找到了我的包。
near|在……附近|nɪr|I live near the station.|我住在车站附近。
behind|在……后面|bɪˈhaɪnd|The garden is behind the house.|花园在房子后面。
beside|在……旁边|bɪˈsaɪd|Sit beside me.|坐在我旁边。
across|横过；在对面|əˈkrɔs|The bank is across the street.|银行在街对面。
through|穿过|θru|We walked through the park.|我们走过了公园。
into|进入|ˈɪntu|She walked into the room.|她走进了房间。
during|在……期间|ˈdʊrɪŋ|Please be quiet during the movie.|看电影期间请保持安静。
before|在……之前|bɪˈfɔr|Wash your hands before dinner.|晚饭前洗手。
after|在……之后|ˈæftər|We went home after lunch.|午饭后我们回家了。
until|直到|ənˈtɪl|The shop is open until nine.|商店营业到九点。
since|自从|sɪns|I have lived here since May.|我从五月起就住在这里。
''')

individual('语言基础', '连接词', 'conjunction', 1, '''
and|和；而且|ænd|I like tea and coffee.|我喜欢茶和咖啡。
or|或者|ɔr|Would you like tea or coffee?|你想喝茶还是咖啡？
but|但是|bʌt|It is cheap but useful.|它便宜又实用。
because|因为|bɪˈkɔz|I stayed home because it rained.|因为下雨，我待在家里。
so|所以|soʊ|I was tired, so I went to bed.|我累了，所以就去睡觉了。
if|如果|ɪf|Call me if you need help.|如果你需要帮助，就给我打电话。
although|虽然|ɔlˈðoʊ|Although it was cold, we went out.|虽然很冷，我们还是出门了。
while|当……时|waɪl|I listened to music while I cooked.|我一边做饭一边听音乐。
unless|除非|ənˈlɛs|We will go unless it rains.|除非下雨，否则我们会去。
whether|是否|ˈwɛðər|I do not know whether she will come.|我不知道她是否会来。
''')

individual('语言基础', '常用副词', 'adverb', 1, '''
not|不|nɑt|I am not tired.|我不累。
very|非常|ˈvɛri|This is very useful.|这非常有用。
really|真的；很|ˈriəli|I really like it.|我真的很喜欢它。
quite|相当|kwaɪt|The room is quite large.|这个房间相当大。
too|也；太|tu|This bag is too heavy.|这个包太重了。
also|也|ˈɔlsoʊ|She also speaks Chinese.|她也会说中文。
only|只；仅仅|ˈoʊnli|I only need one.|我只需要一个。
just|刚刚；只是|dʒʌst|I just got home.|我刚到家。
even|甚至|ˈivən|Even a child can do it.|连孩子都能做到。
still|仍然|stɪl|I am still waiting.|我还在等。
already|已经|ɔlˈrɛdi|I have already eaten.|我已经吃过了。
yet|还；尚|jɛt|She has not arrived yet.|她还没到。
again|再次|əˈɡɛn|Please try again.|请再试一次。
always|总是|ˈɔlweɪz|He always arrives early.|他总是早到。
usually|通常|ˈjuʒuəli|I usually walk to work.|我通常步行上班。
often|经常|ˈɔfən|We often eat here.|我们经常在这里吃饭。
sometimes|有时|ˈsʌmˌtaɪmz|I sometimes work on Sundays.|我有时星期天上班。
rarely|很少|ˈrɛrli|I rarely watch TV.|我很少看电视。
never|从不|ˈnɛvər|I never smoke.|我从不抽烟。
here|这里|hɪr|Please wait here.|请在这里等。
there|那里|ðɛr|Put the box there.|把箱子放在那里。
everywhere|到处|ˈɛvriˌwɛr|I looked everywhere.|我到处都找过了。
now|现在|naʊ|I need to go now.|我现在得走了。
soon|很快|sun|See you soon.|一会儿见。
later|稍后|ˈleɪtər|I will call you later.|我稍后给你打电话。
today|今天|təˈdeɪ|I am busy today.|我今天很忙。
tomorrow|明天|təˈmɑroʊ|We leave tomorrow.|我们明天出发。
yesterday|昨天|ˈjɛstərdeɪ|I saw him yesterday.|我昨天见到他了。
tonight|今晚|təˈnaɪt|Are you free tonight?|你今晚有空吗？
together|一起|təˈɡɛðər|Let us study together.|我们一起学习吧。
apart|分开；相隔|əˈpɑrt|The two houses are far apart.|这两栋房子相距很远。
quickly|迅速地|ˈkwɪkli|Please come quickly.|请快点来。
slowly|慢慢地|ˈsloʊli|Please speak slowly.|请说慢一点。
carefully|仔细地|ˈkɛrfəli|Read the instructions carefully.|仔细阅读说明。
easily|轻松地|ˈizəli|You can find it easily.|你可以轻松找到它。
probably|很可能|ˈprɑbəbli|It will probably rain.|很可能会下雨。
maybe|也许|ˈmeɪbi|Maybe she is busy.|也许她很忙。
perhaps|也许|pərˈhæps|Perhaps we should wait.|也许我们应该等等。
actually|其实；实际上|ˈæktʃuəli|I actually live nearby.|其实我就住在附近。
especially|尤其|ɪˈspɛʃəli|I like fruit, especially apples.|我喜欢水果，尤其是苹果。
almost|几乎|ˈɔlmoʊst|We are almost there.|我们快到了。
nearly|几乎；差不多|ˈnɪrli|It is nearly midnight.|快到午夜了。
exactly|准确地；恰好|ɪɡˈzæktli|That is exactly what I need.|那正是我需要的。
finally|终于；最后|ˈfaɪnəli|We finally arrived.|我们终于到了。
immediately|立即|ɪˈmidiətli|Please call me immediately.|请马上给我打电话。
''')

individual('语言基础', '疑问词', 'adverb / pronoun', 1, '''
who|谁|hu|Who is at the door?|谁在门口？
what|什么|wʌt|What is your name?|你叫什么名字？
which|哪一个|wɪtʃ|Which one do you prefer?|你更喜欢哪一个？
whose|谁的|huz|Whose bag is this?|这是谁的包？
where|哪里|wɛr|Where is the station?|车站在哪里？
when|什么时候|wɛn|When does the train leave?|火车什么时候开？
why|为什么|waɪ|Why are you late?|你为什么迟到了？
how|如何；怎样|haʊ|How do I get there?|我怎么去那里？
''')

individual('语言基础', '情态动词', 'modal verb', 1, '''
can|能；会|kæn|Can you help me?|你能帮我吗？
could|能；可以（较委婉）|kʊd|Could you speak slowly?|你能说慢一点吗？
may|可以；可能|meɪ|May I sit here?|我可以坐这里吗？
might|可能|maɪt|It might rain later.|晚些时候可能会下雨。
must|必须|mʌst|You must wear a seat belt.|你必须系安全带。
should|应该|ʃʊd|You should get some rest.|你应该休息一下。
will|将；会|wɪl|I will call you tomorrow.|我明天会给你打电话。
would|会；愿意（委婉表达）|wʊd|Would you like some tea?|你想喝点茶吗？
''')

individual('时间', '时间与日期', 'noun', 1, '''
time|时间|taɪm|What time is it?|现在几点了？
second|秒|ˈsɛkənd|Wait one second.|等一秒钟。
minute|分钟|ˈmɪnət|I will be there in a minute.|我一分钟后就到。
hour|小时|aʊər|The trip takes an hour.|这段路程要一个小时。
day|天|deɪ|Have a nice day.|祝你今天愉快。
week|星期；周|wik|I will see you next week.|我们下周见。
month|月|mʌnθ|I pay rent every month.|我每个月付房租。
year|年|jɪr|I moved here last year.|我去年搬到了这里。
morning|早晨；上午|ˈmɔrnɪŋ|I exercise in the morning.|我早上锻炼。
afternoon|下午|ˌæftərˈnun|See you this afternoon.|今天下午见。
evening|傍晚；晚上|ˈivnɪŋ|I read in the evening.|我晚上看书。
night|夜晚|naɪt|It is quiet at night.|夜里很安静。
noon|中午|nun|We have lunch at noon.|我们中午吃午饭。
midnight|午夜|ˈmɪdˌnaɪt|The train arrives at midnight.|火车午夜到达。
weekend|周末|ˈwikˌɛnd|What are your plans for the weekend?|你周末有什么安排？
holiday|节日；假日|ˈhɑləˌdeɪ|Tomorrow is a public holiday.|明天是法定假日。
vacation|假期|veɪˈkeɪʃən|I am on vacation this week.|我这周在休假。
birthday|生日|ˈbɜrθˌdeɪ|Happy birthday!|生日快乐！
anniversary|周年纪念日|ˌænəˈvɜrsəri|Today is our wedding anniversary.|今天是我们的结婚纪念日。
date|日期|deɪt|What is the date today?|今天是几月几号？
calendar|日历|ˈkæləndər|Mark the date on your calendar.|在日历上标出这个日期。
season|季节|ˈsizən|Which season do you like best?|你最喜欢哪个季节？
spring|春天|sprɪŋ|Flowers bloom in spring.|春天鲜花盛开。
summer|夏天|ˈsʌmər|It is hot in summer.|夏天很热。
autumn|秋天|ˈɔtəm|The leaves turn yellow in autumn.|秋天树叶变黄。
winter|冬天|ˈwɪntər|It snows here in winter.|这里冬天下雪。
past|过去|pæst|Things were different in the past.|过去的情况不一样。
future|未来|ˈfjutʃər|We are planning for the future.|我们正在规划未来。
''')

individual('日常生活', '实用补充', 'noun', 1, '''
money|钱|ˈmʌni|I need to save money.|我需要存钱。
cash|现金|kæʃ|Do you accept cash?|你们收现金吗？
credit card|信用卡|ˈkrɛdɪt ˌkɑrd|Can I pay by credit card?|我可以用信用卡付款吗？
debit card|借记卡|ˈdɛbɪt ˌkɑrd|I paid with my debit card.|我用借记卡付了款。
coin|硬币|kɔɪn|I found a coin on the floor.|我在地板上找到一枚硬币。
cent|分（货币单位）|sɛnt|It costs one cent.|它的价格是一分钱。
dollar|美元|ˈdɑlər|This pen costs one dollar.|这支笔一美元。
name|名字|neɪm|Please write your name.|请写下你的名字。
age|年龄|eɪdʒ|What is the minimum age?|最低年龄是多少？
number|号码；数字|ˈnʌmbər|What is your phone number?|你的电话号码是多少？
person|人|ˈpɜrsən|One person is waiting outside.|有一个人在外面等着。
people|人们|ˈpipəl|There are many people here.|这里有很多人。
child|孩子|tʃaɪld|The child is asleep.|孩子睡着了。
adult|成年人|əˈdʌlt|Children must come with an adult.|儿童必须有成年人陪同。
baby|婴儿|ˈbeɪbi|The baby is sleeping.|宝宝正在睡觉。
family|家庭；家人|ˈfæməli|My family lives in Shanghai.|我的家人住在上海。
home|家|hoʊm|Welcome to my home.|欢迎来到我家。
house|房子|haʊs|They bought a small house.|他们买了一栋小房子。
apartment|公寓|əˈpɑrtmənt|I rent an apartment nearby.|我在附近租了一套公寓。
building|建筑物|ˈbɪldɪŋ|This building has an elevator.|这栋楼有电梯。
elevator|电梯|ˈɛləˌveɪtər|Take the elevator to the fifth floor.|坐电梯到五楼。
street|街道|strit|The street is busy.|这条街很繁忙。
road|道路|roʊd|This road leads to the airport.|这条路通往机场。
city|城市|ˈsɪti|Which city do you live in?|你住在哪个城市？
country|国家|ˈkʌntri|Which country are you from?|你来自哪个国家？
world|世界|wɜrld|I want to travel around the world.|我想环游世界。
language|语言|ˈlæŋɡwɪdʒ|What language do you speak?|你说什么语言？
English|英语|ˈɪŋɡlɪʃ|I am learning English.|我正在学英语。
Chinese|中文|ˌtʃaɪˈniz|Do you speak Chinese?|你会说中文吗？
Mandarin|普通话|ˈmændərɪn|She speaks Mandarin fluently.|她普通话说得很流利。
news|新闻|nuz|Did you hear the news?|你听说那个消息了吗？
information|信息|ˌɪnfərˈmeɪʃən|I need more information.|我需要更多信息。
advice|建议|ədˈvaɪs|Thank you for your advice.|谢谢你的建议。
reason|原因|ˈrizən|What is the reason?|原因是什么？
way|方法；路|weɪ|Is there another way?|还有别的办法吗？
thing|东西；事情|θɪŋ|What is that thing?|那个东西是什么？
place|地方|pleɪs|This is a nice place.|这是个好地方。
part|部分|pɑrt|This part is easy.|这部分很简单。
side|一边；侧面|saɪd|Please stand on this side.|请站在这一边。
end|末尾；结束|ɛnd|The shop is at the end of the street.|商店在街道尽头。
''')


def expressions(kind, data):
    for line in data.strip().splitlines():
        en, zh, ipa, pos, priority, category, ex, tr = line.split('|')
        add(en, zh, ipa, '习语' if kind == 'idiom' else '俚语与非正式表达',
            category, pos, int(priority), ex, tr,
            idiom=kind == 'idiom', slang=kind == 'slang')

# Expression data is kept separate for easier content review.
for kind in ('idiom', 'slang'):
    expressions(kind, (ROOT / 'data_tools' / (kind + 's.txt')).read_text(encoding='utf-8'))


def refine_priorities():
    """Editorial encounter-frequency tiers, not measured corpus frequency ranks."""
    essential = set('''rice bread chicken fish water milk tea coffee salt sugar oil
    apple banana orange potato tomato egg eggs breakfast lunch dinner food
    kitchen bathroom bedroom door window table desk chair bed key bag wallet
    shirt pants shoes mother father sister brother daughter son wife husband
    friend family parent teacher student doctor nurse driver manager boss
    customer school hospital bank store supermarket restaurant hotel park
    airport station restroom bus train car taxi bicycle ticket passport address
    map weather phone computer screen email message account password file photo
    video app website head eye ear nose mouth hand leg foot stomach medicine
    pain price cost bill payment money cash home house apartment street road
    city country world name age number person people child adult baby language
    English Chinese news information advice reason way thing place part side
    end job project task plan goal meeting problem solution idea question answer
    word sentence meaning translation pronunciation book lesson exam time
    second minute hour day week month year morning afternoon evening night
    weekend holiday vacation birthday date summer winter happy sad angry tired
    hungry thirsty sick busy good bad big small new old clean dirty cheap
    expensive free full empty open closed hot cold easy difficult important
    useful beautiful safe dangerous ready right wrong different same red blue
    green black white money credit card'''.lower().split())
    # Keep multiword terms intact in the less-frequent set.
    specialist = set('mustard|celery|cauliflower|lamb|oatmeal|lime|plum|avocado|tray|lid|teapot|basement|ceiling|cabinet|mattress|sponge|razor|lipstick|perfume|pajamas|pharmacist|accountant|secretary|professor|hostel|tram|helicopter|itinerary|ferry|router|headset|spreadsheet|attachment|subscription|backup|thumb|heel|waist|hip|tongue|muscle|dose|vaccine|surgery|prescription|infection|recovery|mortgage|debt|interest rate|exchange rate|profit|loss|contract|policy|requirement|paragraph|assignment|branch|sunrise|sunset|goose|squirrel|giraffe|zebra|wolf|fox|turtle|ant|spider|golf|chess|volleyball|baseball|generous|selfish|wise|temporary|stable|urgent|uncertain|unfair'.split('|'))
    # The supplied priority-1 vocabulary anchors practical coverage and priority.
    with (ROOT / 'mmd_to_english_20261112.csv').open(encoding='utf-8-sig', newline='') as f:
        reference_top = {
            term.strip().removeprefix('to ').casefold()
            for row in csv.DictReader(f) if row['priority'] == '1'
            for term in row['english'].split(';')
        }
    for row in ROWS:
        if row['is idiom'] or row['is slang']:
            continue
        en = row['english'].casefold()
        if row['category layer 1'] in {'语言基础', '常用动作', '时间', '数量'} or en in essential:
            row['priority'] = 1
        elif en in reference_top:
            row['priority'] = 1
        elif en in specialist:
            row['priority'] = 3
        else:
            row['priority'] = 2


def append_cefr():
    existing = {r['english'].casefold() for r in ROWS}
    for row in ROWS:
        row['cefr level'] = ''
    for level in ('B2', 'C1', 'C2'):
        lines = (ROOT / 'data_tools' / f'cefr_{level.lower()}.txt').read_text(encoding='utf-8').splitlines()
        assert len(lines) == 100, (level, len(lines))
        for line in lines:
            en, zh, ipa, pos, topic, priority, example, translation = line.split('|')
            assert en.casefold() not in existing, f'Duplicate CEFR headword: {en}'
            assert ' ' not in en, f'Expected single-word entry: {en}'
            existing.add(en.casefold())
            add(en, zh, ipa, '进阶词汇', topic, pos, int(priority), example, translation)
            ROWS[-1]['cefr level'] = level


def main():
    assert GROUP_WORDS == EXAMPLES.keys(), "Missing or unused grouped examples"
    refine_priorities()
    append_cefr()
    # A word can legitimately have multiple senses/POS (e.g. book).
    keys = [(r['english'].casefold(), r['part of speech'], r['is idiom'], r['is slang']) for r in ROWS]
    assert len(keys) == len(set(keys)), 'Duplicate entry'
    ordinary = [r for r in ROWS if not r['is idiom'] and not r['is slang']]
    assert len({r['english'].casefold() for r in ordinary}) >= 1000
    # Also require at least 1,000 distinct single-token headwords, excluding phrases.
    assert len({r['english'].casefold() for r in ordinary if ' ' not in r['english']}) >= 1000
    assert sum(r['is idiom'] for r in ROWS) == 100
    assert sum(r['is slang'] for r in ROWS) == 100
    for r in ROWS:
        assert all(str(v).strip() for k, v in r.items() if k != 'cefr level'), r
        assert r['cefr level'] in ('', 'B2', 'C1', 'C2'), r
        assert 1 <= r['priority'] <= 5
        assert not (r['is idiom'] and r['is slang'])
        assert r['english'].casefold() in r['example sentence in english'].casefold(), r
    target = ROOT / 'chinese_to_english_game.csv'
    with target.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(ROWS[0]))
        writer.writeheader()
        writer.writerows(ROWS)
    with target.open(encoding='utf-8-sig', newline='') as f:
        readback = list(csv.DictReader(f))
    assert len(readback) == len(ROWS)
    assert all(len(r) == 13 for r in readback)
    with (ROOT / 'cefr_b2_c1_c2_additions.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(ROWS[0]))
        writer.writeheader()
        writer.writerows(r for r in ROWS if r['cefr level'])
    print(f'Wrote {target.name}: {len(ROWS)} rows')
    print(f'Ordinary entries: {len(ordinary)}; distinct headwords: {len({r["english"].casefold() for r in ordinary})}')
    print(f'Single-token headwords: {len({r["english"].casefold() for r in ordinary if " " not in r["english"]})}')
    print('Idioms: 100; slang: 100')
    print('Priority counts:', dict(sorted(Counter(r['priority'] for r in ROWS).items())))


if __name__ == '__main__':
    main()
