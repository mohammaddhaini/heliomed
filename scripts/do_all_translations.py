import json
import os
import re
import sys
import time
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

FILE_PATH = r'C:\Users\dr laptop\Vs code programs\client-websites\tabib-clinc\scripts\translations-to-fill.json'

headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
}

def translate_text(text):
    if not text or not text.strip():
        return ""
    clean = text.strip()
    url = 'https://translate.google.com/m'
    for attempt in range(3):
        try:
            res = requests.get(url, params={'sl': 'en', 'tl': 'ar', 'q': clean}, headers=headers, timeout=12)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                container = soup.find('div', class_='result-container')
                if container:
                    return container.text.strip()
            time.sleep(0.3)
        except Exception:
            time.sleep(0.5)
    return clean

MEDICAL_FIXES = [
    (r'\bعنق الرحم\b', 'الرقبة والفقرات العنقية'),
    (r'\bعنقي\b', 'عنقي (لأعلى الرقبة)'),
    (r'\bجهاز دعم البطن\b', 'مشد ودعامة البطن الطبي'),
    (r'\bدعم حالة البطن\b', 'مشد ودعامة البطن من Case'),
    (r'\bدعم حالة\b', 'دعامة ومشد Case'),
    (r'\bحالة دعم\b', 'دعامة ومشد Case'),
    (r'\bخط الصيد\b', 'نسيج مسامي شبكي فائق المتانة'),
    (r'\bخط صيد\b', 'نسيج مسامي شبكي فائق المتانة'),
    (r'\bجبيرة ملاكم\b', 'جبيرة كسور الملاكم (Boxer Splint)'),
    (r'\bطوق فيلادلفيا\b', 'طوق رقبة طبي فيلادلفيا (Philadelphia Collar)'),
    (r'\bفغر القولون\b', 'مشد فغر القولون (كولوستومي)'),
    (r'\bشريط ديسك تراك\b', 'حزام ديسك تراك لتخفيف ضغط الفقرات'),
    (r'\bجدول القياس\b', 'جدول المقاسات'),
    (r'\bمحيط الخصر\b', 'محيط الخصر'),
]

def clean_arabic(text):
    if not text:
        return ""
    for pattern, repl in MEDICAL_FIXES:
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

CATEGORY_TRANSLATIONS = {
    'Makeup': 'مستحضرات التجميل والمكياج',
    'Face': 'الوجه',
    'Eye': 'العيون',
    'Eyes': 'العيون',
    'Lips': 'الشفاه',
    'Nail': 'الأظافر',
    'Nails': 'الأظافر',
    'Tools and Accessories': 'أدوات وإكسسوارات التجميل',
    'Makeup Remover': 'مزيل المكياج',
    'Medical Makeup': 'مكياج طبي علاجي',
    'Palettes': 'باليت ومجموعات ألوان',
    'Korean Products': 'منتجات كورية للعناية',
    'Medical Supplies': 'المستلزمات والأجهزة الطبية',
    'Home Care': 'الرعاية الصحية المنزلية',
    'Foot Care': 'العناية بالقدمين وتقويمها',
    'Liposuction': 'مشدات ما بعد شفط الدهون والجراحة',
    'Orthopedic': 'العظام ودعامات المفاصل',
    'Ankle Support': 'دعامات وجبائر الكاحل',
    'Back Support': 'دعامات ومشدات الظهر والفقرات',
    'Cervical Support': 'أطواق ودعامات الرقبة والفقرات العنقية',
    'Disk Trac': 'ديسك تراك لسحب الفقرات وتخفيف الضغط',
    'Knee Support': 'دعامات ومشدات الركبة والرباط الصليبي',
    'Shoulder and Elbow': 'دعامات الكتف والكوع والذراع',
    'Wrist and Hand Braces': 'جبائر ودعامات المعصم واليد والأصابع',
    'Pediatric': 'مستلزمات ودعامات الأطفال',
    'Vascular': 'جوارب ومستلزمات الأوعية الدموية والدوالي',
    'Pillows': 'وسائد طبية ومريحة لتقويم العظام',
    'Disposable Materials': 'مستلزمات طبية للاستخدام مرة واحدة',
    'Gloves': 'قفازات طبية معقمة',
    'Guaze': 'شاش وضمادات طبية معقمة',
    'Needles': 'إبر وحقن طبية معقمة',
    'Suture': 'خيوط جراحية طبية',
    'Blades': 'شفرات ومشارط جراحية معقمة',
    'Medical Protective Apparel': 'ملابس وأردية واقية طبية',
    'Wound Care': 'العناية بالجروح والحروق',
    'Drapes': 'ملاءات وستائر جراحية معقمة',
    'Organic': 'منتجات عضوية وطبيعية 100%',
    'Parapharmacy': 'منتجات العناية والصيدلية (بارافارماسي)',
    'Skin Care': 'العناية بالبشرة والوجه',
    'Hair Care': 'العناية بالشعر وفروة الرأس',
    'Face Care': 'العناية المركزة بالوجه',
    'Dental Care': 'العناية بالفم والأسنان',
    'Body Care': 'العناية بالجسم والترطيب',
    'Nail Care': 'العناية بصحة الأظافر',
    'Baby Care': 'العناية بالطفل وحديثي الولادة',
    'Mother Care': 'العناية بالأم والحوامل',
    'Kids Care': 'العناية بالأطفال',
    'Men Care': 'العناية الخاصة بالرجال',
    'Geriatric Care': 'رعاية كبار السن والمقعدين',
    'Nutrition': 'التغذية العلاجية والصحية',
    'Supplements': 'المكملات الغذائية والفيتامينات',
    'Perfume': 'العطور الفاخرة',
    'Women': 'عطور نسائية',
    'Men': 'عطور رجالية',
    'Kids': 'عطور الأطفال',
    'Bundles': 'مجموعات وباقات هدايا متكاملة'
}

HOMEPAGE_TRANSLATIONS = {
    "Hero Carousel": "شريط العرض الترويجي الرئيسي",
    "Trust Badges": "شارات الثقة والضمان",
    "Shop by Category": "تسوق حسب الأقسام الطبية",
    "Jump straight into the main Heliomed departments.": "تصفح مباشرة الأقسام الطبية والصيدلانية في هيليومد.",
    "Featured Product Picks": "منتجات مختارة مميزة",
    "Curated pharmacy selections from the live catalog": "تشكيلة مختارة بعناية من أفضل المنتجات الطبية والرعاية الصحية",
    "Shop Featured Picks": "تسوق المنتجات المميزة",
    "Pillows": "وسائد طبية لتقويم العظام",
    "Shop Collection": "تسوق المجموعة كاملة",
    "Shop by Concern": "تسوق حسب الاحتياج والمشكلة الصحية",
    "Start with what you need help with.": "ابدأ باختيار ما تبحث عن علاج له بسهولة وسرعة.",
    "Featured Product Picks (Copy)": "أبرز المنتجات الطبية الأكثر طلباً",
    "Popular Brands": "أشهر الماركات الطبية المعتمدة",
    "Trusted beauty, wellness, and home-care names": "أبرز الماركات العالمية الموثوقة في مجالات الصحة والجمال",
    "Heliomed Essentials": "أساسيات هيليومد الطبية",
    "Care You Can Trust at Home": "رعاية صحية موثوقة في منزلك",
    "Daily Paraparapharmacy, beauty, wellness, and recovery essentials organized for fast decisions.": "مستلزمات الصيدلية اليومية، الجمال، العافية والتعافي لقرارات صحية سريعة.",
    "Shop Daily Care": "تسوق منتجات الرعاية اليومية"
}

PRODUCT_TITLE_OVERRIDES = {
    'Abdominal Corset HB5240': 'مشد بطن طبي داعم HB5240',
    'Abduction Shoulder': 'دعامة إبعاد وتثبيت الكتف',
    'ACL Brace': 'دعامة الركبة للرباط الصليبي الأمامي (ACL)',
    'ACTIZIM WITH MELATONIN': 'أكتيزيم مع الميلاتونين قطرات للمغص والنوم',
    'Adjustable Cervical Brace': 'طوق ودعامة رقبة طبية قابلة للتعديل',
    'Adjustable Underarm Aluminium Crutches (Pair)': 'عكازات ألومنيوم طبية تحت الإبط قابلة للتعديل (زوج)',
    'AFO Ankle shoes Orthosis AB13': 'جبيرة كاحل وقدم AFO لتقويم وتثبيت القدم AB13',
    'Air Cast Ankle Stabilizing Orthosis AB01': 'دعامة هوائية إيركاست لتثبيت الكاحل AB01',
    'Albro Memory Foam Seat Ring Cushion': 'وسادة جلوس ميموري فوم دائرية لتخفيف الضغط Albro',
    'Alcamed Aneroid Sphygmomanometer Blood Pressure Monitor': 'جهاز قياس ضغط الدم اليدوي مع سماعة Alcamed',
    'Alcamed Compressor Nebulizer Therapy System': 'جهاز تبخير واستنشاق رذاذ Alcamed للكبار والأطفال',
    'Ankle Support Brace DNB406': 'دعامة ومشد كاحل مرن DNB406',
    'Ankle Support with Plastic Backed HB5006': 'دعامة كاحل مدعمة بشرائح بلاستيكية HB5006',
    'Anti Snoring Pillow': 'وسادة طبية مضادة للشخير وتحسين التنفس',
    'Arm sling': 'حمالة ذراع وكتف طبية مريحة',
    'ARTOGENE 30CAPS': 'أرتوجين 30 كبسولة لصحة المفاصل والغضاريف',
    'ARTOGENE 60CAPS': 'أرتوجين 60 كبسولة لصحة المفاصل والغضاريف',
    'Aspen Vista': 'طوق رقبة طبي متعدد المقاسات Aspen Vista',
    'Baby Contoured Pillow': 'وسادة طبية منحوتة للرضع والأطفال',
    'Baby Sleeping Pillow': 'وسادة نوم طبية ومريحة للأطفال',
    'Bond of Slipped Disc HB7270': 'حزام طبي لعلاج الانزلاق الغضروفي (الديسك) HB7270',
    'Boxer Fracture Splint JB2304': 'جبيرة كسور الملاكم لإصبع اليد JB2304',
    'Cane (Different shapes)': 'عصا مشي طبية (أشكال متعددة)',
    'Case Abdominal Corset Support': 'مشد ودعامة بطن طبية من Case',
    'Case Adjustable Rigid Cervical Neck Collar': 'طوق رقبة طبي صلب قابل للتعديل من Case',
    'Case Ankle Support with Plastic Stays': 'دعامة كاحل مزودة بدعامات بلاستيكية من Case',
    'Case Clavicle Posture Support Bandage': 'حزام ومشد ترقوة لتصحيح وضعية الظهر من Case',
    'Case Dorso-Lumbar Corset': 'مشد ظهري قطني داعم للعمود الفقري من Case',
    'Case Jewett Hyperextension Back Brace (Size M)': 'دعامة ظهر طبية جويت (Jewett) لتثبيت الفقرات مقاس M',
    'Case Knee Immobilizer Leg Brace': 'جبيرة تثبيت الركبة والساق من Case',
    'Case Lumbosacral Corset 26cm': 'مشد قطني عجزي بارتفاع 26 سم من Case',
    'Case Lumbosacral Corset 32cm': 'مشد قطني عجزي بارتفاع 32 سم من Case',
    'Case Medical Arm Sling': 'حمالة ذراع طبية داعمة من Case',
    'Case Shoulder Immobilizer - Velpeau Bandage': 'حزام تثبيت الكتف ضماد فيلبو من Case',
    'Case Sponge Soft Neck Support': 'طوق رقبة إسفنجي ناعم ومريح من Case',
    'Case Standard Tennis Elbow Brace': 'دعامة مرفق التنس الطبية القياسية من Case',
    'Case Thumb Spica Splint Support': 'جبيرة تثبيت الإبهام الطبية من Case',
    'Case Thumb Supported Wrist Splint - Left': 'جبيرة معصم مدعمة للإبهام - يد يسرى Case',
    'Case Thumb Supported Wrist Splint - Right': 'جبيرة معصم مدعمة للإبهام - يد يمنى Case',
    'Case Wrist Splint Shuttle': 'جبيرة تثبيت المعصم الطبية Shuttle من Case',
    'Chest Corset HB5250': 'مشد صدر وأضلاع طبي HB5250',
    'Clavical Bandage HB5407': 'حزام وضماد ترقوة طبي HB5407',
    'Clavicle Brace': 'دعامة لتثبيت الترقوة واستقامة الكتفين',
    'Clavicula Bandage JB2407': 'حزام ترقوة طبي لتصحيح القوام JB2407',
    'Colostomy Corset HB5249': 'مشد فغر القولون (كولوستومي) مع فتحة HB5249',
    'Conwell Barouk Post-Op Shoe': 'حذاء باروك الطبي لما بعد العمليات الجراحية Conwell',
    'Conwell Short Foam Walker Boot': 'حذاء ووكر طبي قصير مبطن بالفوم Conwell',
    'Disk-Trac Cervical Traction Collar': 'طوق سحب فقرات الرقبة الهوائي Disk-Trac',
    'Disk-Trac Lumbar Belt': 'حزام ديسك تراك لشد وتخفيف ضغط فقرات الظهر القطنية',
    'Disk Trac - Lumbar Decompression Belt': 'حزام ديسك تراك لتخفيف الضغط القطني والفقرات',
    'Elbow Bandage with Pad JB2307': 'ضماد ودعامة كوع مبطنة بباد JB2307',
    'Elbow Brace (Gonio-Adjustable) HB5313': 'دعامة كوع بمفصل وزاوية قابلة للتعديل HB5313',
    'Elbow Crutches': 'عكازات كوع طبية ألومنيوم مريحة',
    'Elbow Immobilizer': 'جبيرة ودعامة لتثبيت الكوع والذراع',
    'Elbows Immobilizer HB5312': 'جبيرة تثبيت مفصل الكوع HB5312',
    'ENER B 30CAPS': 'إينر بي 30 كبسولة - فيتامينات B المركبة للطاقة',
    'FERTIBEST 30TAB': 'فيرتي بيست 30 قرص لتعزيز الخصوبة والصحة الإنجابية',
    'Finger Splint A08': 'جبيرة إصبع اليد الطبية A08',
    'Fingertip Pulse Oximeter': 'جهاز قياس نبضات القلب ونسبة الأكسجين في الدم عبر الإصبع',
    'FLAXAVIT-K2 PLUS 30 CAPSULES': 'فلاكستافيت K2 بلس 30 كبسولة لصحة القلب والعظام',
    'Foldable Aluminium Walking Frame': 'مشاية طبية لكبار السن ألومنيوم قابلة للطي',
    'Full Silicone Insoles SS004': 'فرش طبي سيليكون كامل للحذاء SS004',
    'Gel Seat Cushion': 'وسادة مقعد جل طبية مريحة لتخفيف الضغط',
    'GINKO OMEGA 30CAPS': 'جينكو أوميغا 30 كبسولة لتقوية الذاكرة وتنشيط الدورة الدموية',
    'Hand Brace HB5311': 'دعامة يد ومعصم طبية HB5311',
    'Hand Splint HB5330': 'جبيرة يد ومعصم لتثبيت الأصابع HB5330',
    'HEMOBEST PLUS 30TAB': 'هيموبيست بلس 30 قرص مكمل حديد لعلاج فقر الدم',
    'Hinged Knee Brace': 'دعامة ركبة بمفصلات حديدية لدعم الأربطة',
    'Hip Abduction': 'دعامة تثبيت وإبعاد مفصل الفخذ والورك',
    'Hyperextension Spine Brace': 'دعامة عمود فقري لتثبيت الصدر والفقرات (هايبرإكستنشن)',
    'I-M U-Ankle Rigid Stabilizer Brace (OH-914)': 'دعامة كاحل صلبة U-Ankle من I-M موديل OH-914',
    'Knee Bandage with Patella JB2104': 'مشد ركبة مع فتحة ودعامة صابونة الركبة JB2104',
    'Knee Immobilizer HB5117': 'جبيرة ودعامة لتثبيت مفصل الركبة HB5117',
    'Knee Immobilizer JB2117': 'جبيرة تثبيت الركبة والساق JB2117',
    'Knitted Lumbar Brace KB724': 'مشد ظهر قطني نسيجي مرن ومدعم KB724',
    'Leg Raise Pillow': 'وسادة طبية لرفع الساقين وتحسين الدورة الدموية',
    'Lloveras A-D Short Calf Compression Stockings Class 2 - Beige (Open Toe)': 'جوارب ضغط طبية تحت الركبة كلاس 2 بيج مفتوحة الأصابع Lloveras',
    'Long Wrist Splint HB5325': 'جبيرة معصم طويلة لدعم اليد والساعد HB5325',
    'Lower Calf Support HB5101': 'دعامة ومشد لعضلات الساق السفلية HB5101',
    'Lumbosacral Corset 26cm HB5244': 'مشد قطني عجزي بارتفاع 26 سم HB5244',
    'Lumbosacral Corset 32cm HB5245': 'مشد قطني عجزي بارتفاع 32 سم HB5245',
    'Lumbosacral Corset HB8244': 'مشد ظهر قطني عجزي طبي HB8244',
    'Mallet Finger Splint': 'جبيرة إصبع اليد المطرقي (Mallet Finger)',
    'Manu Cast Organic': 'جبيرة يد ومعصم طبية مريحة Manu Cast Organic',
    'Manu Cast Organic P': 'جبيرة يد ومعصم Manu Cast Organic P للأطفال',
    'Medical Insole (Customized)': 'فرش طبي مخصص للقدمين وتقويم المشي',
    'Standard Short Ankle Brace': 'دعامة كاحل قياسية قصيرة لتثبيت المفصل',
    'Silicone Insoles - High Arch': 'فرش سيليكون طبي لدعم القوس العالي والفلات فوت',
    'Silicone Metatarsal Pad': 'وسادة سيليكون طبية لمشط وأصابع القدم',
    'Waist Pillow': 'وسادة قطنية لدعم أسفل الظهر ومقعد السيارة',
    'Viscoelastic Neck Pillow': 'وسادة رقبة طبية فيسكولاستيك ميموري فوم',
    'SC 1001 Cushion': 'وسادة مقعد طبية دائرية SC 1001',
    'SC 1001 V Cushion': 'وسادة مقعد طبية فيسكو SC 1001 V',
    'SC 1002 Cushion': 'وسادة مقعد طبية مربعة مريحة SC 1002',
    'SC 1002 V Cushion': 'وسادة مقعد طبية فيسكو SC 1002 V',
    'Adjustable-Angle Elbow Brace': 'دعامة كوع بزاوية ومفصل قابل للتعديل',
    'Pad-Supported Elbow Bandage': 'مشد كوع طبي مبطن بوسادة مريحة',
    'Memory Foam Back Cushion': 'وسادة ظهر ميموري فوم لدعم الفقرات القطنية',
    'Memory Foam Pillow Cooling Gel': 'وسادة نوم ميموري فوم مع طبقة جل تبريد',
    'Myolito Tens Machine': 'جهاز ميوليتو Myolito TENS/EMS لتسكين الألم وتحفيز العضلات',
    'Neck Support Pillow VP1004': 'وسادة طبية لدعم الرقبة أثناء النوم VP1004',
    'Neck Support Pillow VP4005': 'وسادة رقبة طبية مريحة VP4005',
    'NERVA-Q10 30CAPS': 'نيرفا Q10 كبسولات 30 كبسولة لتقوية الأعصاب ومضاد أكسدة',
    'NEUROQ10 64Cmg n': 'نيورو كيو 10 لدعم صحة الأعصاب والدماغ',
    'OA Knee Brace': 'دعامة ركبة طبية مخصصة لخشونة واحتكاك المفاصل (OA)',
    'OMRON Blood Pressure Monitor-M2': 'جهاز قياس ضغط الدم الرقمي أومرون OMRON M2',
    'Open End Sitting Cushion SC1004': 'وسادة مقعد طبية مفتوحة من الأمام SC1004',
    'OVABESTFORWOMEN 60TAB': 'أوفابيست للنساء 60 قرص لدعم التبويض والخصوبة',
    'Over Bed Table': 'طاولة طعام متحركة فوق السرير للمرضى',
    'Over Door Traction': 'جهاز شد وسحب فقرات الرقبة المنزلي فوق الباب',
    'Pad Supported Ankle Brace HB5002': 'دعامة كاحل طبية مدعمة بوسادة HB5002',
    'Patellar Tendon Bandage HB5106': 'حزام وتر الركبة والصابونة الطبي HB5106',
    'Patient Turning Pillow': 'وسادة طبية مريحة لتقليب المرضى وكبار السن',
    'Pedal Exerciser': 'دراجة تمارين بدالات لتأهيل الأطراف وكبار السن',
    'Pediatric Arm Sling WP911': 'حمالة ذراع طبية للأطفال WP911',
    'Pediatric Velpeau Bandage WP916': 'حزام تثبيت كتف للأطفال فيلبو WP916',
    'Philadelphia Collar': 'طوق رقبة فيلادلفيا طبي صلب مع فتحة حنجرة',
    'Pierre U-Shape Ergonomic Seat Cushion with Gel': 'وسادة مقعد طبية شكل U مع جل مريح من Pierre',
    'Plantar Fasciitis Night Splint AB20': 'جبيرة ليلية لعلاج التهاب اللفافة الأخمصية ومسمار القدم AB20',
    'Plaster Shoes AB05': 'حذاء طبي لما بعد تجبير القدم والجبس AB05',
    'Polycarbonate Resting Wrist Splint AB14': 'جبيرة معصم ويد صلبة بولي كربونات لوضع الراحة AB14',
    'Posturex Brace HB5247': 'مشد طبي لتصحيح وتقويم استقامة الظهر بوستريكس HB5247',
    'Posturex HB8247': 'مشد الظهر والكتفين بوستريكس HB8247',
    'Pregnant Corset HB5203': 'مشد وحزام طبي لدعم البطن والظهر أثناء الحمل HB5203',
    'Professional Fingertip Pulse Oximeter (Deluxe Display)': 'جهاز احترافي لقياس نبضات القلب ونسبة الأكسجين بالإصبع',
    'Reflex AFO AB18': 'جبيرة تقويم وتثبيت القدم ريفليكس AFO موديل AB18',
    'Rehabilitation cushion with a relief hole': 'وسادة تأهيل وجلوس طبية مع فتحة لتخفيف الضغط',
    'REVAGINAL OVULI-OVULES': 'تحاميل مهبلية ريفاجينال لترطيب واستعادة توازن المنطقة الحميمة',
    'Rigid Cervical Collar NS10': 'طوق رقبة طبي صلب لتثبيت الفقرات العنقية NS10',
    'RINOPANTENA NASAL OINTMENT 10 G': 'مرهم رينوبانتينا للأنف 10 غرام لترطيب وترميم الغشاء الأنفي',
    'ROM Elbow Brace': 'دعامة كوع بمفصلات وزاوية حركة قابلة للتعديل (ROM)',
    'ROM Knee Brace': 'دعامة ركبة بمفصلات تحكم بزاوية الحركة (ROM)',
    'Rom Walker HB5051': 'حذاء ووكر طويل لتثبيت الساق والكاحل HB5051',
    'Rossmax Blood Glucose Monitoring System': 'جهاز قياس السكر في الدم المتطور من Rossmax',
    'Rossmax Blood Glucose Monitoring System HS200': 'جهاز فحص السكر في الدم Rossmax HS200 مع شرائط',
    'Rossmax Blood Pressure Monitor': 'جهاز قياس ضغط الدم الإلكتروني من Rossmax',
    'Shape&Rest Pillow': 'وسادة طبية مريحة للنوم وتخفيف الإجهاد Shape&Rest',
    'Shoulder Immobilizer': 'حزام ومشد لتثبيت مفصل الكتف بعد الإصابة',
    'Silicone Hallux Valgus Pad SS032': 'وسادة سيليكون لتصحيح وتخفيف آلام إبهام القدم الأفحج SS032',
    'Silicone Heel Cushions SS002': 'كعب سيليكون طبي لامتصاص الصدمات وعلاج مسمار العظم SS002',
    'Silicone Knee Brace': 'دعامة ركبة سيليكون طبية مع ضغط مريح',
    'Silicone Metatarsal Pad SS006': 'وسادة سيليكون طبية لراحة مشط وأصابع القدم SS006',
    'Silicone Metatarsal Ring Pad SS034': 'وسادة سيليكون بحلقة لتثبيت وحماية مشط القدم SS034',
    'Silicone Toe Separator SS005': 'مباعد أصابع سيليكون طبي لعلاج تشابك الأصابع SS005',
    'SILVER PLUS 30 CAPSULES': 'سيلفر بلس 30 كبسولة - فيتامينات ومعادن لكبار السن',
    'Sitting Cushion SC1002': 'وسادة جلوس طبية مريحة لتخفيف آلام العصعص SC1002',
    'Sitting Cushion SC1002B': 'وسادة جلوس طبية عالية المرونة SC1002B',
    'Sitting Ring Cushion SC1001/B': 'وسادة جلوس دائرية مفرغة لتخفيف آلام البواسير والعصعص',
    'Soft Collar Neck Support NS03': 'طوق رقبة طبي ناعم ومريح NS03',
    'Soft Step Silicone Full Insole': 'فرش سيليكون طبي متكامل سوفت ستيب لراحة القدمين',
    'Soft Step Silicone Heel Cushion': 'كعب سيليكون طبي سوفت ستيب لآلام الكعب ومسمار القدم',
    'Sponge Neck Support JS03': 'طوق رقبة إسفنجي طبي JS03',
    'Standard Epicondilite Bandage HB5314': 'حزام ودعامة لالتهاب لقيمة المرفق (تنس إلبو) HB5314',
    'Standard Knee Brace DNB419': 'دعامة ركبة قياسية لدعم الأربطة DNB419',
    'Standard Offset Handle Walking Cane': 'عصا مشي طبية قياسية بمقبض مريح مانع للانزلاق',
    'Standard Patella Supported Knee Brace HB5104': 'دعامة ركبة قياسية مدعمة لصابونة الركبة HB5104',
    'Standard Steel Articulated Knee Brace HB5111': 'دعامة ركبة بمفصلات حديدية فولاذية لدعم المفصل HB5111',
    'Steel-Jointed Knee Bandage JB2111': 'مشد ركبة مدعم بمفصلات فولاذية للثبات والحركة JB2111',
    'Support Stocking Calypso (Closed Toe)': 'جوارب دعم طبي دوالي كاليبسو (أصابع مغلقة)',
    'Support Stocking Cotton (Closed Toe)': 'جوارب دعم طبي قطنية للدوالي (أصابع مغلقة)',
    'Support Stocking Nova (Open Toe)': 'جوارب دعم طبي للدوالي نوفا (أصابع مفتوحة)',
    'Support Stocking Sensitiv (Open Toe)': 'جوارب دعم طبي حساسة للدوالي (أصابع مفتوحة)',
    'Support Stocking Twin (Closed Toe)': 'جوارب دعم طبي للدوالي توين (أصابع مغلقة)',
    'Tennis Elbow Brace': 'دعامة مرفق التنس وتسكين آلام أوتار الذراع',
    'Thoracic Lumbar Corset HB5248': 'مشد ظهري صدري قطني متكامل لتصحيح العمود الفقري HB5248',
    'Three-Legged Walking Cane Tripod': 'عصا مشي طبية ثلاثية القوائم لثبات وأمان أكبر',
    'Thumb Splint HB5303': 'جبيرة ودعامة لتثبيت مفصل الإبهام HB5303',
    'Thumb Supported Wrist Splint HB5304': 'جبيرة معصم طبية مدعمة لتثبيت الإبهام HB5304',
    'TLSO Corset HB6248': 'مشد ظهر كامل لتثبيت الفقرات الصدرية والقطنية والعجزية TLSO HB6248',
    'Toilet Seat': 'مقعد رافع لكرسي الحمام لكبار السن والمرضى',
    'U Gel Seat Cushion': 'وسادة جلوس طبية بشكل حرف U مع جل مريح',
    'U Travel Neck Pillow': 'وسادة سفر طبية ميموري فوم لدعم الرقبة شكل U',
    'Underarm Crutches': 'عكازات طبية مريحة تحت الإبط قابلة لتعديل الارتفاع',
    'Upper Calf Support HB5105': 'دعامة ومشد لعضلات الساق العلوية HB5105',
    'Vertebradyn FORCE Rigid LSO': 'مشد ظهر صلب لتثبيت ودعم الفقرات القطنية Vertebradyn FORCE LSO',
    'Vertebradyn Osteo Dynamic Brace': 'دعامة ديناميكية لتقويم العمود الفقري وهشاشة العظام Vertebradyn Osteo',
    'Vertebradyn SENSO Back Brace': 'مشد ودعامة ظهر حسية لتخفيف آلام الفقرات Vertebradyn SENSO',
    'Visco D-Roll Pillow VD1001': 'وسادة أسطوانية طبية فيسكو فوم متعددة الاستخدام VD1001',
    'Visco-Elastic Orthopedic Neck Pillow (60x40x14/12 cm)': 'وسادة رقبة طبية فيسكو لتقويم العظام (60×40×14/12 سم)',
    'Visco Leg Position Pillow VD1002': 'وسادة فيسكو طبية مريحة لضبط وضعية الساقين VD1002',
    'Visco Reflux Pillow': 'وسادة مائلة طبية فيسكو لعلاج ارتجاع المريء والحموضة',
    'Visco Sitting Ring SC1001V': 'وسادة جلوس طبية دائرية فيسكو فوم SC1001V',
    'Vista CTO 4 Post': 'دعامة رقبة وصدر طبية متطورة Vista CTO رباعية الأعمدة',
    'Walker': 'مشاية طبية للمسنين وتأهيل الحركة',
    'Walker with Wheels': 'مشاية طبية مزودة بعجلات لسهولة الحركة والمشي',
    'Welpo Bandage JB2409': 'حزام وضماد تثبيت الكتف ويلبو JB2409',
    'Wingmed Tennis Elbow Support with Silicone Pad': 'دعامة مرفق التنس الطبية من Wingmed مزودة بباد سيليكون',
    'Wrist Band DNB437': 'رباط ومشد معصم مطاطي داعم DNB437',
    'Wrist Splint HB5302': 'جبيرة معصم طبية لتثبيت المفصل HB5302',
    'Wrist Splint HB5321': 'جبيرة ودعامة معصم مرنة قابلة للتعديل HB5321',
    'Wrist Splint JB2302': 'جبيرة معصم ويد طبية لتسكين الألم والتثبيت JB2302',
    'Wrist Splint with Thumb HB5324': 'جبيرة معصم وإبهام طبية متكاملة HB5324'
}

def translate_field(text):
    if not text or not text.strip():
        return ""
    clean = text.strip()
    if clean in PRODUCT_TITLE_OVERRIDES:
        return PRODUCT_TITLE_OVERRIDES[clean]
    if clean in CATEGORY_TRANSLATIONS:
        return CATEGORY_TRANSLATIONS[clean]
    if clean in HOMEPAGE_TRANSLATIONS:
        return HOMEPAGE_TRANSLATIONS[clean]
    raw = translate_text(clean)
    return clean_arabic(raw)

def main():
    print("Loading translations JSON...")
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Categories
    print("Processing Categories...")
    for root in data['collections']['categories']:
        root_title = root['fields']['title_ar']['source']
        root['fields']['title_ar']['target'] = CATEGORY_TRANSLATIONS.get(root_title, translate_field(root_title))
        for child in root.get('children', []):
            child_title = child['fields']['title_ar']['source']
            child['fields']['title_ar']['target'] = CATEGORY_TRANSLATIONS.get(child_title, translate_field(child_title))
            for sub_sub in child.get('children', []):
                sub_title = sub_sub['fields']['title_ar']['source']
                sub_sub['fields']['title_ar']['target'] = CATEGORY_TRANSLATIONS.get(sub_title, translate_field(sub_title))

    # 2. Homepage Layout
    print("Processing Homepage Layout...")
    hp = data['collections']['homepage_layout']
    for sec in hp.get('sections', []):
        for field_name, fld in sec.get('fields', {}).items():
            src = fld.get('source', '').strip()
            if src:
                fld['target'] = HOMEPAGE_TRANSLATIONS.get(src, translate_field(src))

    # 3. Medicines
    meds = data['collections']['medicines']
    print(f"Processing {len(meds)} Medicines...")

    def process_med(item):
        t_src = item['fields']['title_ar']['source']
        d_src = item['fields']['description_ar']['source']
        u_src = item['fields']['usage_ar']['source']
        w_src = item['fields']['warnings_ar']['source']

        t_tgt = translate_field(t_src)
        d_tgt = translate_field(d_src) if d_src else ""
        u_tgt = translate_field(u_src) if u_src else ""
        w_tgt = translate_field(w_src) if w_src else ""

        return item['id'], t_tgt, d_tgt, u_tgt, w_tgt

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process_med, m): m for m in meds}
        count = 0
        for future in as_completed(futures):
            med_id, t_tgt, d_tgt, u_tgt, w_tgt = future.result()
            # Find and update item
            for m in meds:
                if m['id'] == med_id:
                    m['fields']['title_ar']['target'] = t_tgt
                    m['fields']['description_ar']['target'] = d_tgt
                    m['fields']['usage_ar']['target'] = u_tgt
                    m['fields']['warnings_ar']['target'] = w_tgt
                    break
            count += 1
            if count % 20 == 0 or count == len(meds):
                print(f"[{count}/{len(meds)}] Translated {med_id}")
                with open(FILE_PATH, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("ALL TRANSLATIONS SUCCESSFULLY COMPLETED AND SAVED!")

if __name__ == '__main__':
    main()
